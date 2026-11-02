"""Exercise edits, editable duplicates, budget filters and complete backups.

Uses only the isolated Docker verification stack on port 13001. Requires local
Windows Chrome. Test records stay in finance-engine-verify; screenshots and
downloads go to the OS temporary directory.
"""

import base64
import json
from pathlib import Path
import subprocess
import tempfile
import time

import httpx
from websockets.sync.client import connect

BASE = "http://127.0.0.1:13001"
name = "Workflow " + str(time.time_ns())
output = Path(tempfile.mkdtemp(prefix="finance-workflows-check-"))
profile = tempfile.TemporaryDirectory(prefix="finance-workflows-browser-")
client = httpx.Client(base_url=BASE + "/api", timeout=20)


def post(path, data):
    response = client.post(path, json=data)
    response.raise_for_status()
    return response.json()


def transactions():
    return client.get("/transactions").json()


client.get("/health/ready").raise_for_status()
post("/categories", {"name": name, "color": "chart-indigo-2"})
original = post("/transactions", dict(date="2026-11-02", merchant=name, category=name, bank="Workflow Bank", type="expense", amount="10.12"))
for month, year in [(1, 2025), (1, 2026), (2, 2026)]:
    post("/budgets", dict(month=month, year=year, amount="100.00", category=name))
baseline = len(transactions())
process = None
try:
    process = subprocess.Popen([
        r"C:\Program Files\Google\Chrome\Application\chrome.exe", "--headless=new", "--disable-gpu",
        "--no-first-run", "--no-default-browser-check", "--remote-debugging-address=127.0.0.1",
        "--remote-debugging-port=0", "--remote-allow-origins=http://localhost",
        "--user-data-dir=" + profile.name, "about:blank",
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, creationflags=subprocess.CREATE_NO_WINDOW)
    active = Path(profile.name) / "DevToolsActivePort"
    for _ in range(100):
        if active.exists():
            break
        time.sleep(.1)
    port = int(active.read_text(encoding="utf-8").splitlines()[0])
    target = next(t for t in httpx.get(f"http://127.0.0.1:{port}/json/list").json() if t["type"] == "page")
    with connect(target["webSocketDebuggerUrl"], origin="http://localhost", open_timeout=5) as ws:
        sequence = 0
        exceptions = []

        def call(method, params=None):
            global sequence
            sequence += 1
            ws.send(json.dumps({"id": sequence, "method": method, "params": params or {}}))
            while True:
                message = json.loads(ws.recv(timeout=20))
                if message.get("method") == "Runtime.exceptionThrown":
                    exceptions.append(message["params"]["exceptionDetails"])
                if message.get("id") == sequence:
                    assert "error" not in message, message
                    return message.get("result", {})

        def evaluate(source):
            result = call("Runtime.evaluate", {"expression": source, "returnByValue": True, "awaitPromise": True})
            assert "exceptionDetails" not in result, result
            return result.get("result", {}).get("value")

        def until(source):
            for _ in range(150):
                if evaluate(source):
                    return
                time.sleep(.1)
            raise AssertionError(source + "\n" + str(evaluate("document.body.innerText")) + "\n" + str(exceptions))

        def click(label, scope="document"):
            evaluate(f"[...{scope}.querySelectorAll('button')].find(b=>b.textContent.trim()===" + json.dumps(label) + ").click()")

        def fill(selector, value):
            evaluate("(()=>{const input=document.querySelector(" + json.dumps(selector) + ");Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input," + json.dumps(value) + ");input.dispatchEvent(new Event('input',{bubbles:true}));})()")

        def select(trigger, label):
            evaluate(trigger + ".click()")
            until("[...document.querySelectorAll('[role=option]')].some(o=>o.textContent.trim()===" + json.dumps(label) + ")")
            evaluate("[...document.querySelectorAll('[role=option]')].find(o=>o.textContent.trim()===" + json.dumps(label) + ").click()")

        def edit(merchant):
            selector = "button[aria-label=" + json.dumps("Edit " + merchant + " transaction") + "]"
            until("!!document.querySelector(" + json.dumps(selector) + ")")
            evaluate("document.querySelector(" + json.dumps(selector) + ").click()")
            until("document.querySelector('[role=dialog]')?.textContent.includes('Edit Transaction')")

        def screenshot(filename):
            time.sleep(.3)
            result = call("Page.captureScreenshot", {"format": "png"})
            (output / filename).write_bytes(base64.b64decode(result["data"]))

        call("Page.enable")
        call("Runtime.enable")
        call("Network.enable")
        call("Browser.setDownloadBehavior", {"behavior": "allow", "downloadPath": str(output)})
        call("Emulation.setDeviceMetricsOverride", {"width": 1440, "height": 1000, "deviceScaleFactor": 1, "mobile": False})
        call("Page.navigate", {"url": BASE + "/transactions"})
        until("!!document.querySelector('input[placeholder=\"Search...\"]')")
        fill('input[placeholder="Search..."]', name)
        edit(name)
        assert evaluate("document.querySelector('#merchant').value") == name
        assert evaluate("document.querySelector('#amount').value") == "10.12"
        click("Expense")
        assert evaluate("document.querySelectorAll('[data-slot=toggle-group-item][data-selected]').length") == 1, evaluate("document.querySelector('[data-slot=toggle-group]').outerHTML")
        click("Income")
        fill("#merchant", name + " edited")
        fill("#amount", "23.45")
        click("Save Changes")
        until("!document.querySelector('[role=dialog]')")
        saved = client.get(f"/transactions/{original['id']}").json()
        assert saved["merchant"] == name + " edited" and saved["amount"] == "23.45" and saved["type"] == "income", saved
        assert len(transactions()) == baseline

        edit(name + " edited")
        click("Duplicate")
        until("document.querySelector('[role=dialog]')?.textContent.includes('Duplicate Transaction')")
        assert len(transactions()) == baseline, "Duplicate must remain a draft until saved"
        assert evaluate("document.querySelector('#amount').value") == "23.45"
        fill("#merchant", name + " copy")
        fill("#amount", "2.34")
        fill("#transaction-date-input", "January 15, 2025")
        click("Expense")
        screenshot("duplicate-desktop.png")
        click("Create Duplicate")
        until("!document.querySelector('[role=dialog]')")
        rows = transactions()
        duplicate = next(row for row in rows if row["merchant"] == name + " copy")
        assert duplicate["id"] != original["id"] and duplicate["amount"] == "2.34" and duplicate["date"] == "2025-01-15"
        assert duplicate["type"] == "expense" and len(rows) == baseline + 1
        assert client.get(f"/transactions/{original['id']}").json() == saved

        edit(name + " edited")
        call("Network.setBlockedURLs", {"urls": [f"*/transactions/{original['id']}"]})
        fill("#amount", "24.56")
        click("Save Changes")
        until("!!document.querySelector('[role=dialog] [role=alert]')")
        assert evaluate("document.querySelector('#amount').value") == "24.56"
        call("Network.setBlockedURLs", {"urls": []})
        click("Save Changes")
        until("!document.querySelector('[role=dialog]')")
        assert client.get(f"/transactions/{original['id']}").json()["amount"] == "24.56"
        edit(name + " edited")
        click("Duplicate")
        click("Cancel")
        until("!document.querySelector('[role=dialog]')")
        assert len(transactions()) == baseline + 1

        click("Add Transaction")
        until("!!document.querySelector('#merchant')")
        assert evaluate("document.querySelector('#merchant').value") == ""
        assert evaluate("document.querySelector('[data-slot=toggle-group-item][data-selected]').textContent") == "Expense"
        fill("#merchant", name + " added")
        fill("#amount", "3.21")
        select("document.querySelector('[role=dialog] button[aria-label=Category]')", name)
        select("document.querySelector('[role=dialog] button[aria-label=Bank]')", "Workflow Bank")
        click("Add Transaction", "document.querySelector('[role=dialog]')")
        until("!document.querySelector('[role=dialog]')")
        assert len(transactions()) == baseline + 2
        call("Page.reload")
        until("!!document.querySelector('table')")
        fill('input[placeholder="Search..."]', name)
        edit(name + " added")
        call("Emulation.setDeviceMetricsOverride", {"width": 390, "height": 844, "deviceScaleFactor": 1, "mobile": True})
        screenshot("edit-mobile.png")
        assert evaluate("document.documentElement.scrollWidth <= innerWidth")
        assert evaluate("document.querySelector('[data-slot=dialog-content]').getBoundingClientRect().height <= innerHeight")
        click("Cancel")
        call("Emulation.setDeviceMetricsOverride", {"width": 1440, "height": 1000, "deviceScaleFactor": 1, "mobile": False})

        call("Page.navigate", {"url": BASE + "/budgets"})
        until("!!document.getElementById('budget-filter-month-label') && !document.body.innerText.includes('Loading budgets')")
        month_trigger = "document.getElementById('budget-filter-month-label').parentElement.querySelector('button')"
        year_trigger = "document.getElementById('budget-filter-year-label').parentElement.querySelector('button')"
        select(month_trigger, "January")
        select(year_trigger, "2026")
        expected = client.get("/budgets?month=1&year=2026").json()
        assert evaluate("document.querySelectorAll('section [data-slot=card]').length") == len(expected)
        assert evaluate("[...document.querySelectorAll('section [data-slot=card]')].every(c=>c.textContent.includes('January') && c.textContent.includes('2026'))")
        screenshot("budget-filters.png")
        select(month_trigger, "December")
        until("document.body.innerText.includes('No budgets match')")
        click("Clear Filters")
        assert evaluate("document.querySelectorAll('section [data-slot=card]').length") == len(client.get("/budgets").json())

        call("Page.navigate", {"url": BASE + "/settings#download"})
        until("[...document.querySelectorAll('button')].some(b=>b.textContent.trim()==='Download All Data')")
        evaluate("localStorage.setItem('what-to-buy-items','[{\"name\":\"Camera\"}]');localStorage.setItem('what-to-buy-budget','123.45')")
        call("Network.setBlockedURLs", {"urls": ["*/exports/backup.json*"]})
        click("Download All Data")
        until("!!document.querySelector('[role=alert]')")
        call("Network.setBlockedURLs", {"urls": []})
        click("Download All Data")
        until("document.querySelector('output,[role=status]')?.textContent.includes('finance-backup-')")
        for _ in range(100):
            files = list(output.glob("finance-backup-*.json"))
            if files:
                break
            time.sleep(.1)
        assert files, "Backup download was not saved"
        backup = json.loads(files[0].read_text(encoding="utf-8"))
        assert len(backup["data"]["transactions"]) == baseline + 2
        assert {"budgets", "categories", "goals", "goal_entries", "subscriptions", "subscription_payments", "transaction_rules", "bank_styles"} <= set(backup["data"])
        assert any(row["id"] == duplicate["id"] and row["date"] == "2025-01-15" for row in backup["data"]["transactions"])
        assert backup["browser_data"]["what-to-buy-budget"] == "123.45"
        screenshot("complete-backup.png")
        assert not exceptions, exceptions
        print("Passed: add/edit, required single type selection, editable duplication and cancel, failed-save retry, persistence, mobile modal, month/year budget filters, full JSON download and retry, and browser data. No runtime exceptions.")
        print("Artifacts:", output)
        try:
            call("Browser.close")
        except Exception:
            pass
finally:
    client.close()
    if process is not None:
        if process.poll() is None:
            process.terminate()
        process.wait(timeout=10)
    try:
        profile.cleanup()
    except PermissionError:
        pass
