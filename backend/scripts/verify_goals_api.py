"""Check goals through the real Next proxy on the isolated Docker verification stack.

Run from backend: .venv/Scripts/python.exe -B scripts/verify_goals_api.py
Uses only port 13001; cleans up only the goals it creates.
"""
from concurrent.futures import ThreadPoolExecutor
from decimal import Decimal
from uuid import uuid4

import httpx

BASE = "http://127.0.0.1:13001/api"


def main():
    created_ids = []
    with httpx.Client(base_url=BASE, timeout=15) as client:
        client.get("/health/ready").raise_for_status()
        before = client.get("/goals").json()
        try:
            for kind in ["Savings", "Debt Payoff"]:
                response = client.post("/goals", json={
                    "name": f"Goal verification {uuid4()}", "type": kind,
                    "target_amount": "1000.00", "target_date": "2027-04-01",
                })
                response.raise_for_status()
                goal = response.json()
                created_ids.append(goal["id"])
                path = f"/goals/{goal['id']}"
                for entry_type, amount in [("income", "500.00"), ("expense", "125.25"), ("contribution", "50.10")]:
                    response = client.post(path + "/entries", json={
                        "type": entry_type, "date": "2026-10-15", "note": "Verification entry", "amount": amount,
                    })
                    response.raise_for_status()
                assert client.post(path + "/entries", json={
                    "type": "contribution", "date": "2026-10-15", "amount": "-1",
                }).status_code == 422

                def contribute(_):
                    response = client.post(path + "/entries", json={
                        "type": "contribution", "date": "2026-10-15", "amount": "0.01",
                    })
                    response.raise_for_status()

                with ThreadPoolExecutor(max_workers=4) as pool:
                    list(pool.map(contribute, range(12)))

                # A new client/session fetches the durable server state, as on a refresh.
                with httpx.Client(base_url=BASE, timeout=15) as reloaded:
                    saved = reloaded.get(path).json()
                    assert Decimal(saved["contributed"]) == Decimal("50.22"), saved
                    assert Decimal(saved["documented_income"]) == Decimal("500.00"), saved
                    assert Decimal(saved["necessary_expenses"]) == Decimal("125.25"), saved
                    assert saved["target_date"] == "2027-04-01"
                    assert saved in reloaded.get("/goals").json()
                    entries = reloaded.get(path + "/entries").json()
                    assert len(entries) == 15
                    assert sum(item["note"] == "Verification entry" for item in entries) == 3
                    assert all(item["date"] == "2026-10-15" for item in entries)
        finally:
            for goal_id in created_ids:
                response = client.delete(f"/goals/{goal_id}")
                response.raise_for_status()
                assert client.get(f"/goals/{goal_id}").status_code == 404
                assert client.get(f"/goals/{goal_id}/entries").status_code == 404
        assert client.get("/goals").json() == before
    print("Passed: Next proxy + PostgreSQL; both goal types, all entries, concurrent totals, fresh-session persistence, validation and deletion.")


if __name__ == "__main__":
    main()
