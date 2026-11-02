"""Browser and restart checks, only on finance-engine-verify (port 13001)."""

import base64
from contextlib import contextmanager
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import time

import httpx
from websockets.sync.client import connect

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "tests"))
from test_backup_import import sample_backup

BASE = "http://127.0.0.1:13001"
ROOT = Path(__file__).resolve().parents[2]
output = Path(tempfile.mkdtemp(prefix="finance-backup-import-check-"))
profile = tempfile.TemporaryDirectory(prefix="finance-backup-import-browser-")
client = httpx.Client(base_url=BASE + "/api", timeout=20)
name = "Restore " + str(time.time_ns())
backup = sample_backup()
backup["data"]["categories"][0]["name"] = name
for table in ("transactions", "budgets", "transaction_rules", "subscriptions"):
    backup["data"][table][0]["category"] = name
backup["data"]["transactions"][0]["merchant"] = name
backup["data"]["bank_styles"][0]["name"] = name.lower()
backup["data"]["bank_styles"][0]["display_name"] = name
backup["data"]["transaction_rules"][0]["match_text"] = name.lower()
backup["data"]["goals"][0]["name"] = name
backup["data"]["subscriptions"][0]["name"] = name
item = dict(id=name, name="Imported camera", price=123.45, purpose="Travel", category="Photography", importance=5, value=5, frequency=5, quality=5, longevity=5, urgency=5, deadline="", notes="Saved in backup")
backup["browser_data"]["what-to-buy-items"] = json.dumps([item])
payload = json.dumps(backup)


def saved_data():
    response = client.get("/exports/backup.json")
    response.raise_for_status()
    return response.json()["data"]


@contextmanager
def browser():
    active = Path(profile.name) / "DevToolsActivePort"
    if active.exists():
        active.unlink()
    process = subprocess.Popen([
        r"C:\Program Files\Google\Chrome\Application\chrome.exe", "--headless=new", "--disable-gpu",
        "--no-first-run", "--no-default-browser-check", "--remote-debugging-address=127.0.0.1",
        "--remote-debugging-port=0", "--remote-allow-origins=http://localhost",
        "--user-data-dir=" + profile.name, "about:blank",
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, creationflags=subprocess.CREATE_NO_WINDOW)
    try:
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
                nonlocal sequence
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

            def click(label):
                evaluate("[...document.querySelectorAll('button,[role=tab]')].find(b=>b.textContent.trim()===" + json.dumps(label) + ").click()")

            def upload(contents):
                evaluate("(()=>{const input=document.querySelector('#backup-file');const files=new DataTransfer();files.items.add(new File([" + json.dumps(contents) + "],'backup.json',{type:'application/json'}));input.files=files.files;input.dispatchEvent(new Event('change',{bubbles:true}));})()")

            call("Page.enable")
            call("Runtime.enable")
            call("Network.enable")
            call("Browser.setDownloadBehavior", {"behavior": "allow", "downloadPath": str(output)})
            call("Emulation.setDeviceMetricsOverride", {"width": 1440, "height": 1000, "deviceScaleFactor": 1, "mobile": False})
            yield call, evaluate, until, click, upload
            assert not exceptions, exceptions
            try:
                call("Browser.close")
            except Exception:
                pass
    finally:
        try:
            process.wait(timeout=10)
        except subprocess.TimeoutExpired:
            process.terminate()
            process.wait(timeout=10)


try:
    before = saved_data()
    with browser() as (call, evaluate, until, click, upload):
        call("Page.navigate", {"url": BASE + "/settings#imports"})
        until("!!document.querySelector('#csv-file')")
        assert evaluate("[...document.querySelectorAll('[role=tab]')].some(t=>t.textContent.trim()==='Imports')")
        click("JSON backup")
        until("!!document.querySelector('#backup-file')")
        evaluate("localStorage.setItem('what-to-buy-budget','77.77')")
        upload("not json")
        click("Preview Backup")
        until("!!document.querySelector('[role=alert]')")
        assert saved_data() == before
        upload(payload)
        click("Preview Backup")
        until("!!document.querySelector('table[aria-label=\"Backup import preview\"]')")
        assert saved_data() == before
        screenshot = call("Page.captureScreenshot", {"format": "png"})
        (output / "backup-preview.png").write_bytes(base64.b64decode(screenshot["data"]))
        call("Network.setBlockedURLs", {"urls": ["*/imports/backup"]})
        click("Import & Save Backup")
        until("!!document.querySelector('[role=alert]')")
        assert saved_data() == before
        call("Network.setBlockedURLs", {"urls": []})
        click("Import & Save Backup")
        until("document.querySelector('output')?.textContent.includes('Saved 9 records')")
        after = saved_data()
        assert all(len(after[table]) == len(before[table]) + len(backup["data"].get(table, [])) for table in before)
        assert evaluate("localStorage.getItem('what-to-buy-budget')") == "77.77"
        assert len(json.loads(evaluate("localStorage.getItem('what-to-buy-items')"))) == 1
        upload(payload)
        click("Preview Backup")
        until("!!document.querySelector('table')")
        assert evaluate("[...document.querySelectorAll('tbody tr')].every(row=>row.querySelectorAll('td')[0].textContent==='0')")
        click("Import & Save Backup")
        until("document.querySelector('output')?.textContent.includes('Saved 0 records')")
        assert saved_data() == after
        assert len(json.loads(evaluate("localStorage.getItem('what-to-buy-items')"))) == 1
        call("Emulation.setDeviceMetricsOverride", {"width": 390, "height": 844, "deviceScaleFactor": 1, "mobile": True})
        time.sleep(1)
        screenshot = call("Page.captureScreenshot", {"format": "png"})
        (output / "imports-mobile.png").write_bytes(base64.b64decode(screenshot["data"]))
        assert evaluate("document.documentElement.scrollWidth <= innerWidth")
        assert evaluate("document.querySelector('header').getBoundingClientRect().width <= 70"), "Mobile sidebar did not collapse"
        # Download through the real UI, then import that file's complete payload.
        call("Page.navigate", {"url": BASE + "/settings#download"})
        until("[...document.querySelectorAll('button')].some(b=>b.textContent.trim()==='Download All Data')")
        click("Download All Data")
        until("document.querySelector('output')?.textContent.includes('Download ready')")
        for _ in range(100):
            files = list(output.glob("finance-backup-*.json"))
            if files:
                break
            time.sleep(.1)
        exported = json.loads(files[0].read_text(encoding="utf-8"))
        # Other verification scripts may deliberately save malformed browser
        # examples; this browser has only real, validated wish list fields.
        response = client.post("/imports/backup", files={"file": ("roundtrip.json", json.dumps(exported), "application/json")})
        assert response.status_code == 200, response.text
        assert sum(c["new"] for c in response.json()["counts"].values()) == 0
        assert saved_data() == after

    print("Browser import, preview, duplicate skip, retry, export/import roundtrip and mobile checks passed.", flush=True)
    # Restart the isolated database and app, keeping its named volume.
    subprocess.run(["docker", "compose", "-p", "finance-engine-verify", "-f", "compose.yaml", "-f", "backend/scripts/docker-compose.verify.yml", "restart", "db", "backend", "frontend"], cwd=ROOT, check=True, capture_output=True)
    for _ in range(60):
        try:
            if client.get("/health/ready").status_code == 200:
                break
        except httpx.HTTPError:
            pass
        time.sleep(1)
    assert saved_data() == after, "Imported data changed after database/app restart"
    # Confirm PostgreSQL sequences remain usable for ordinary new records.
    new_transaction = client.post("/transactions", json=dict(date="2026-11-02", merchant=name + " after restart", category=name, bank="Test Bank", type="expense", amount="1.00"))
    assert new_transaction.status_code == 201, new_transaction.text
    new_goal = client.post("/goals", json=dict(name=name + " after restart", type="Savings", target_amount="1.00"))
    assert new_goal.status_code == 201, new_goal.text
    with browser() as (call, evaluate, until, click, upload):
        call("Page.navigate", {"url": BASE + "/transactions"})
        until("document.querySelector('table')?.textContent.includes(" + json.dumps(name) + ")")
        assert len(json.loads(evaluate("localStorage.getItem('what-to-buy-items')"))) == 1
        assert evaluate("localStorage.getItem('what-to-buy-budget')") == "77.77"
        call("Page.navigate", {"url": BASE + "/settings#csv"})
        until("!!document.querySelector('#csv-file')")
    print("Passed: database/app restart, browser close/reopen, persistent browser data, usable new IDs, and legacy CSV link. Personal database untouched.")
    print("Artifacts:", output)
finally:
    client.close()
    try:
        profile.cleanup()
    except PermissionError:
        pass
