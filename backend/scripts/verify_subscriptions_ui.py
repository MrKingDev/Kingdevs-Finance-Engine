"""Exercise the real Docker UI/API on the isolated verification stack only.

Requires Docker verification ports 13001/18000 and local Chrome on Windows.
Creates test subscriptions in finance-engine-verify, never in the normal database.
Run from backend: .venv/Scripts/python.exe -B scripts/verify_subscriptions_ui.py
"""
import json
from pathlib import Path
import subprocess
import tempfile
import time

import httpx
from websockets.sync.client import connect

BASE = "http://127.0.0.1:13001"
name = "Browser subscription " + str(time.time_ns())
with httpx.Client(base_url=BASE + "/api", timeout=10) as client:
    client.get("/health/ready").raise_for_status()
    categories = client.get("/categories").json()
    if not any(category["name"] == "Subscriptions" for category in categories):
        client.post("/categories", json={"name": "Subscriptions", "color": "chart-fuchsia-2"}).raise_for_status()

profile = tempfile.TemporaryDirectory(prefix="finance-subscriptions-ui-")
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
    assert active.exists(), "Chrome debugging endpoint unavailable"
    port = int(active.read_text(encoding="utf-8").splitlines()[0])
    target = next(item for item in httpx.get(f"http://127.0.0.1:{port}/json/list").json() if item["type"] == "page")
    with connect(target["webSocketDebuggerUrl"], origin="http://localhost", open_timeout=5) as ws:
        sequence = 0
        exceptions = []

        def call(method, params=None):
            global sequence
            sequence += 1
            ws.send(json.dumps({"id": sequence, "method": method, "params": params or {}}))
            while True:
                message = json.loads(ws.recv(timeout=15))
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
            print(evaluate("document.body.innerText.slice(-1800)"))
            raise AssertionError("Timed out: " + source + " exceptions=" + str(exceptions))

        def click_text(text):
            evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===" + json.dumps(text) + ").click()")

        def fill(selector, value):
            evaluate("(()=>{const i=document.querySelector(" + json.dumps(selector) + ");Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(i," + json.dumps(value) + ");i.dispatchEvent(new Event('input',{bubbles:true}));})()")

        call("Page.enable")
        call("Runtime.enable")
        call("Page.navigate", {"url": BASE + "/tools"})
        until("!!document.querySelector('table') && !document.body.innerText.includes('Loading subscriptions')")
        click_text("Add Subscription")
        until("!!document.querySelector('#subscription-name')")
        fill("#subscription-name", name)
        fill("#subscription-amount", "7.50")
        fill("#subscription-due-input", "September 30, 2026")
        evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Select a category')).click()")
        until("[...document.querySelectorAll('[role=option]')].some(o=>o.textContent.includes('Subscriptions'))")
        evaluate("[...document.querySelectorAll('[role=option]')].find(o=>o.textContent.includes('Subscriptions')).click()")
        click_text("Save Subscription")
        until("!document.querySelector('[role=dialog]')")
        until("document.querySelector('table').textContent.includes(" + json.dumps(name) + ")")
        evaluate("window.__beforeSubscriptionReload=true")
        call("Page.reload")
        until("window.__beforeSubscriptionReload!==true && document.querySelector('table')?.textContent.includes(" + json.dumps(name) + ")")
        evaluate("document.querySelector('button[aria-label=" + json.dumps("Edit " + name) + "]').click()")
        until("!!document.querySelector('#subscription-amount')")
        fill("#subscription-amount", "8.50")
        click_text("Save Subscription")
        until("!document.querySelector('[role=dialog]')")
        row = "[...document.querySelectorAll('tbody tr')].find(r=>r.textContent.includes(" + json.dumps(name) + "))"
        until(row + "?.textContent.includes('$8.50')")
        evaluate("[...(" + row + ").querySelectorAll('button')].find(b=>b.textContent==='Record payment').click()")
        until("!!document.querySelector('#subscription-paid-on')")
        click_text("Confirm payment")
        until("!document.querySelector('[role=dialog]')")
        until(row + "?.textContent.includes('Last paid')")
        evaluate("document.querySelector('button[aria-label=" + json.dumps("Payment history for " + name) + "]').click()")
        until("document.querySelector('[role=dialog]')?.textContent.includes('$8.50')")
        click_text("Close")
        evaluate("document.querySelector('button[aria-label=" + json.dumps("Archive " + name) + "]').click()")
        until("!document.querySelector('table').textContent.includes(" + json.dumps(name) + ")")
        click_text("Show archived subscriptions")
        until(row + "?.textContent.includes('Archived')")
        assert not exceptions, exceptions
        print("Browser passed: real Docker proxy, add with saved category, reload persistence, edit, record payment, history, and archive.")
        try:
            call("Browser.close")
        except Exception:
            pass
finally:
    if process is not None:
        if process.poll() is None:
            process.terminate()
        process.wait(timeout=10)
    try:
        profile.cleanup()
    except PermissionError:
        print("Temporary Chrome profile still has a closing file.")
