"""Read-only browser smoke check of the separate demo on localhost:3002.

Requires Windows Chrome and local dev dependencies. Downloads and screenshots
go to the OS temporary directory, never into the personal database or repository.
"""
import base64
import calendar
import csv
import json
from pathlib import Path
import subprocess
import tempfile
import time

import httpx
from pypdf import PdfReader
from websockets.sync.client import connect

BASE = "http://127.0.0.1:3002"
transactions = httpx.get(BASE + "/api/transactions").json()
assert len(transactions) == 168, "Expected the untouched, separate demo dataset"
latest = max(t["date"] for t in transactions)
year, month = map(int, latest.split("-")[:2])
output = Path(tempfile.mkdtemp(prefix="finance-download-check-"))
profile = tempfile.TemporaryDirectory(prefix="finance-download-browser-")
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
            raise AssertionError(source + "\n" + str(evaluate("document.body.innerText")) + "\n" + str(exceptions))

        def click(label):
            evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===" + json.dumps(label) + ").click()")

        def select(index, label):
            evaluate(f"document.querySelectorAll('[data-slot=select-trigger]')[{index}].click()")
            until("[...document.querySelectorAll('[role=option]')].some(o=>o.textContent.trim()===" + json.dumps(label) + ")")
            evaluate("[...document.querySelectorAll('[role=option]')].find(o=>o.textContent.trim()===" + json.dumps(label) + ").click()")

        def screenshot(name):
            # Let Select exit animations, sidebar resizing and chart animations settle.
            time.sleep(2)
            result = call("Page.captureScreenshot", {"format": "png"})
            (output / name).write_bytes(base64.b64decode(result["data"]))

        call("Page.enable")
        call("Runtime.enable")
        call("Network.enable")
        call("Browser.setDownloadBehavior", {"behavior": "allow", "downloadPath": str(output)})
        call("Emulation.setDeviceMetricsOverride", {"width": 1440, "height": 1000, "deviceScaleFactor": 1, "mobile": False})
        call("Page.navigate", {"url": BASE + "/settings#download"})
        until("[...document.querySelectorAll('button')].some(b=>b.textContent.trim()==='Download PDF' && !b.disabled)")
        assert evaluate("document.body.innerText.includes('Demo workspace')")
        select(0, calendar.month_name[month])
        select(1, str(year))
        screenshot("settings-downloads.png")
        for label, filename in [
            ("Download CSV", f"finance-transactions-{year}-{month:02}.csv"),
            ("Download PDF", f"finance-report-{year}-{month:02}-styled.pdf"),
            ("Download Basic PDF", f"finance-report-{year}-{month:02}-basic.pdf"),
        ]:
            click(label)
            until("document.querySelector('[role=status]')?.textContent.includes(" + json.dumps(filename) + ")")
            for _ in range(100):
                if (output / filename).exists():
                    break
                time.sleep(.1)
            assert (output / filename).exists(), filename
        with (output / f"finance-transactions-{year}-{month:02}.csv").open(encoding="utf-8-sig", newline="") as file:
            rows = list(csv.DictReader(file))
        assert len(rows) == 28
        assert any(r["merchant"] == "Willow Apartments rent" and r["type"] == "expense" for r in rows)
        for style in ["styled", "basic"]:
            reader = PdfReader(output / f"finance-report-{year}-{month:02}-{style}.pdf")
            text = "\n".join(p.extract_text() for p in reader.pages)
            assert "Willow Apartments rent" in text and "$5,920.00" in text
        select(0, calendar.month_name[12 if month == 1 else month - 1])
        if month == 1:
            select(1, str(year - 1))
        call("Network.setBlockedURLs", {"urls": ["*/exports/*"]})
        click("Download PDF")
        until("!!document.querySelector('[role=alert]')")
        call("Network.setBlockedURLs", {"urls": []})
        click("Download PDF")
        until("!document.querySelector('[role=alert]') && !!document.querySelector('[role=status]')?.textContent")
        call("Emulation.setDeviceMetricsOverride", {"width": 390, "height": 844, "deviceScaleFactor": 1, "mobile": True})
        screenshot("settings-mobile.png")
        assert evaluate("document.documentElement.scrollWidth <= innerWidth"), "Horizontal page overflow"
        assert evaluate("document.querySelector('header').getBoundingClientRect().width <= 70"), "Mobile sidebar did not collapse"
        assert evaluate("[...document.querySelectorAll('button')].filter(b=>b.textContent.trim().startsWith('Download')).every(b=>b.getBoundingClientRect().right<=innerWidth)"), "Download buttons clipped"
        call("Emulation.setDeviceMetricsOverride", {"width": 1440, "height": 1100, "deviceScaleFactor": 1, "mobile": False})
        call("Page.navigate", {"url": BASE + "/goals"})
        until("document.body.innerText.includes('Emergency fund') && document.body.innerText.includes('Japan adventure')")
        screenshot("demo-goals.png")
        call("Page.navigate", {"url": BASE + "/dashboard"})
        until("document.body.innerText.includes('Northstar Studio payroll') || document.body.innerText.includes('Green Basket Market')")
        assert not evaluate("document.body.innerText.includes('NaN')")
        screenshot("demo-dashboard.png")
        call("Page.navigate", {"url": BASE + "/transactions"})
        until("document.querySelectorAll('tbody tr').length===50 && document.body.innerText.includes('Page 1 of 4')")
        first_page = evaluate("[...document.querySelectorAll('tbody tr')].map(r=>r.textContent)")
        click("Next")
        until("document.body.innerText.includes('Page 2 of 4') && document.querySelectorAll('tbody tr').length===50")
        assert evaluate("[...document.querySelectorAll('tbody tr')].map(r=>r.textContent)") != first_page
        evaluate("(()=>{let i=document.querySelector('input[placeholder=\"Search...\"]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(i,'Northstar');i.dispatchEvent(new Event('input',{bubbles:true}));})()")
        until("document.body.innerText.includes('Page 1 of 1') && document.querySelectorAll('tbody tr').length===12")
        screenshot("demo-transaction-pages.png")
        call("Page.navigate", {"url": BASE + "/reports"})
        chart = "[...document.querySelectorAll('[data-slot=card]')].find(c=>c.textContent.includes('Income vs Expenses'))"
        until(chart + "?.querySelector('.recharts-area-area') !== null && !!document.querySelector('button[aria-label=Year]')")
        time.sleep(2)
        before = evaluate(chart + ".querySelector('.recharts-area-area').getAttribute('d')")
        empty_year = min(int(t['date'][:4]) for t in transactions) - 1
        evaluate("document.querySelector('button[aria-label=Year]').click()")
        until("[...document.querySelectorAll('[role=option]')].some(o=>o.textContent.trim()===" + json.dumps(str(empty_year)) + ")")
        evaluate("[...document.querySelectorAll('[role=option]')].find(o=>o.textContent.trim()===" + json.dumps(str(empty_year)) + ").click()")
        time.sleep(2)
        after = evaluate(chart + ".querySelector('.recharts-area-area')?.getAttribute('d')")
        assert before != after, "Area chart did not react to year change"
        evaluate("document.querySelector('#chart-bar').click()")
        time.sleep(2)
        # Empty year has no positive-height bars; switching back must restore the saved-year bars.
        empty_bars = evaluate(chart + ".querySelectorAll('.recharts-bar-rectangle path').length")
        evaluate("document.querySelector('button[aria-label=Year]').click()")
        until("[...document.querySelectorAll('[role=option]')].some(o=>o.textContent.trim()===" + json.dumps(str(year)) + ")")
        evaluate("[...document.querySelectorAll('[role=option]')].find(o=>o.textContent.trim()===" + json.dumps(str(year)) + ").click()")
        time.sleep(2)
        assert evaluate(chart + ".querySelectorAll('.recharts-bar-rectangle path').length") > empty_bars, "Bar chart did not react to year change"
        screenshot("demo-reports-year.png")
        call("Page.navigate", {"url": BASE + "/settings"})
        until("!!document.querySelector('#csv-bank') && !!document.querySelector('#csv-file')")
        assert evaluate("document.body.innerText.includes('date,merchant,category,bank,type,amount')")
        assert evaluate("document.body.innerText.includes('500,000 rows / 50 MB')")
        evaluate("Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(document.querySelector('#csv-bank'),'Browser preview only');document.querySelector('#csv-bank').dispatchEvent(new Event('input',{bubbles:true}));const upload=new DataTransfer();upload.items.add(new File(['date,merchant,type,amount\\n'+Array.from({length:1101},(_,i)=>'2026-10-01,Sample expense '+i+',expense,1.00\\n').join('')],'bulk.csv',{type:'text/csv'}));document.querySelector('#csv-file').files=upload.files;document.querySelector('#csv-file').dispatchEvent(new Event('change',{bubbles:true}));")
        click("Preview CSV")
        until("document.body.innerText.includes('1,101 rows checked')")
        assert evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Import entire file')).disabled")
        evaluate("[...document.querySelectorAll('[data-slot=select-trigger]')].find(b=>b.textContent.includes('Choose a fallback category')).click()")
        until("[...document.querySelectorAll('[role=option]')].some(o=>o.textContent.trim()==='Groceries')")
        evaluate("[...document.querySelectorAll('[role=option]')].find(o=>o.textContent.trim()==='Groceries').click()")
        click("Preview CSV")
        until("[...document.querySelectorAll('button')].some(b=>b.textContent.includes('Import entire file') && !b.disabled)")
        screenshot("demo-large-import-preview.png")
        # Verify the actual frontend whole-file payload without adding test records to the user's demo.
        evaluate("window.__originalFetch=window.fetch.bind(window);window.fetch=async(input,init={})=>{if(String(input).endsWith('/imports/csv/file')){window.__bulkPayload={bank:init.body.get('bank'),category:init.body.get('default_category'),size:init.body.get('file').size,method:init.method};return new Response(JSON.stringify({imported:1101,skipped_duplicates:0}),{headers:{'Content-Type':'application/json'}})}return window.__originalFetch(input,init)}")
        click("Import entire file (1,101 new)")
        until("document.body.innerText.includes('1,101 transactions imported')")
        payload = evaluate("window.__bulkPayload")
        assert payload['bank'] == 'Browser preview only' and payload['category'] == 'Groceries'
        assert payload['size'] > 1000 and payload['method'] == 'POST'
        assert not exceptions, exceptions
        print("Passed: demo display, all three downloads, error retry, mobile layout, 50-row pagination, filter reset, both annual chart selectors, large CSV preview/fallback/payload, and no hydration errors. Import commit mocked; demo finances unchanged.")
        print("Artifacts:", output)
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
        pass
