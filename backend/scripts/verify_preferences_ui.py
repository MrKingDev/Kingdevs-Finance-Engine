"""Exercise regional settings and current budget periods in the isolated test app."""
import base64
from contextlib import contextmanager
from datetime import datetime
import json
from pathlib import Path
import subprocess
import tempfile
import time
from zoneinfo import ZoneInfo

import httpx
from websockets.sync.client import connect

BASE = "http://127.0.0.1:13001"
ROOT = Path(__file__).resolve().parents[2]
output = Path(tempfile.mkdtemp(prefix="finance-preferences-check-"))
client = httpx.Client(base_url=BASE + "/api", timeout=30)
defaults = dict(locale="en-US", currency="USD", time_zone="America/New_York")
german = dict(locale="de-DE", currency="EUR", time_zone="Europe/Berlin")
original_preferences = client.get("/preferences").json()
profile = tempfile.TemporaryDirectory(prefix="finance-preferences-browser-")


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
            sequence, exceptions = 0, []

            def call(method, params=None):
                nonlocal sequence
                sequence += 1
                ws.send(json.dumps({"id": sequence, "method": method, "params": params or {}}))
                while True:
                    message = json.loads(ws.recv(timeout=30))
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

            def click(text):
                evaluate("[...document.querySelectorAll('button,[role=tab]')].find(b=>b.textContent.trim()===" + json.dumps(text) + ").click()")

            def select(index, label):
                evaluate(f"document.querySelectorAll('form[aria-label=\"Regional preferences\"] [data-slot=select-trigger]')[{index}].click()")
                until("!!document.querySelector('[role=listbox]')")
                evaluate("[...document.querySelectorAll('[role=option]')].find(o=>o.textContent.trim()===" + json.dumps(label) + ").click()")
                until("!document.querySelector('[role=listbox]')")

            def screenshot(name):
                (output / name).write_bytes(base64.b64decode(call("Page.captureScreenshot", {"format": "png"})["data"]))

            call("Page.enable")
            call("Runtime.enable")
            call("Network.enable")
            call("Emulation.setDeviceMetricsOverride", {"width": 1440, "height": 1000, "deviceScaleFactor": 1, "mobile": False})
            yield call, evaluate, until, click, select, screenshot
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
    client.put("/preferences", json=defaults).raise_for_status()
    now = datetime.now(ZoneInfo(defaults["time_zone"]))
    name = "Regional " + str(time.time_ns())
    client.post("/categories", json={"name": name, "color": "chart-blue-2"}).raise_for_status()
    client.post("/transactions", json={"date": now.date().isoformat(), "merchant": name, "category": name, "bank": "Test bank", "type": "expense", "amount": "1234.56"}).raise_for_status()
    for year, month in [(now.year, now.month), (now.year - 1, now.month)]:
        client.post("/budgets", json={"category": name, "year": year, "month": month, "amount": "2345.67"}).raise_for_status()
    records = client.get("/transactions").json()
    with browser() as (call, evaluate, until, click, select, screenshot):
        call("Page.navigate", {"url": BASE + "/settings#preferences"})
        until("document.querySelector('form[aria-label=\"Regional preferences\"]')?.textContent.includes('USD')")
        assert evaluate("document.body.innerText.includes('United States') && document.body.innerText.includes('Eastern Time (EST/EDT)')")
        screenshot("preferences-defaults.png")
        select(0, "Germany")
        select(1, "EUR — Euro")
        select(2, "Berlin")
        assert evaluate("document.querySelector('[data-testid=regional-preview]').textContent.includes('1.234,56')")
        call("Network.setBlockedURLs", {"urls": ["*/api/preferences"]})
        click("Save preferences")
        until("!!document.querySelector('form [role=alert]')")
        assert client.get("/preferences").json() == defaults
        call("Network.setBlockedURLs", {"urls": []})
        click("Save preferences")
        until("document.querySelector('form output')?.textContent.includes('Preferences saved')")
        assert client.get("/preferences").json() == german
        assert client.get("/transactions").json() == records
        screenshot("preferences-saved.png")
        call("Emulation.setDeviceMetricsOverride", {"width": 390, "height": 844, "deviceScaleFactor": 1, "mobile": True})
        time.sleep(1)
        assert evaluate("document.documentElement.scrollWidth <= innerWidth + 1")
        screenshot("preferences-mobile.png")
        call("Emulation.setDeviceMetricsOverride", {"width": 1440, "height": 1000, "deviceScaleFactor": 1, "mobile": False})
        call("Page.navigate", {"url": BASE + "/transactions"})
        until("document.body.innerText.includes('1.234,56') && document.body.innerText.includes('€')")
        click("Add Transaction")
        until("!!document.querySelector('[role=dialog]')")
        current_day = datetime.now(ZoneInfo(german["time_zone"])).strftime("%d.%m.%Y")
        assert evaluate("[...document.querySelectorAll('[role=dialog] input')].some(i=>i.value===" + json.dumps(current_day) + ")")
        click("Cancel")
        call("Page.navigate", {"url": BASE + "/budgets"})
        until("document.body.innerText.includes(" + json.dumps(name) + ") && document.body.innerText.includes('€')")
        local = datetime.now(ZoneInfo(german["time_zone"]))
        expected = client.get(f"/budgets?month={local.month}&year={local.year}").json()
        assert evaluate("document.querySelectorAll('section [data-slot=card]').length") == len(expected)
        assert evaluate("document.getElementById('budget-filter-year-label').parentElement.querySelector('button').textContent.includes(" + json.dumps(str(local.year)) + ")")
        screenshot("budgets-current-period.png")
        click("Clear Filters")
        until("document.querySelectorAll('section [data-slot=card]').length===" + str(len(client.get("/budgets").json())))
        call("Page.reload")
        until("document.querySelectorAll('section [data-slot=card]').length===" + str(len(expected)))
        backup = client.get("/exports/backup.json").json()
        assert backup["data"]["preferences"] == [{"id": 1, **german}]
        for style in ("styled", "basic"):
            response = client.get(f"/exports/report.pdf?month={now.month}&year={now.year}&style={style}")
            response.raise_for_status()
            (output / f"regional-{style}.pdf").write_bytes(response.content)

    subprocess.run(["docker", "compose", "-p", "finance-engine-verify", "-f", "compose.yaml", "-f", "backend/scripts/docker-compose.verify.yml", "restart", "backend", "frontend"], cwd=ROOT, check=True, capture_output=True)
    for _ in range(100):
        try:
            if client.get("/health/ready").is_success:
                break
        except httpx.HTTPError:
            pass
        time.sleep(.2)
    assert client.get("/preferences").json() == german
    with browser() as (call, evaluate, until, click, select, screenshot):
        call("Page.navigate", {"url": BASE + "/settings#preferences"})
        until("document.querySelector('[data-testid=regional-preview]')?.textContent.includes('1.234,56')")
        assert evaluate("document.body.innerText.includes('EUR') && document.body.innerText.includes('Berlin')")
    print("Passed: defaults, region/currency/time zone selection, failed-save retry, localized transactions, date defaults, current budget filters, all-period override, refresh, backup export, PDF generation, mobile layout, browser reopen and app restart.")
    print(output)
finally:
    client.put("/preferences", json=original_preferences).raise_for_status()
    client.close()
    profile.cleanup()
