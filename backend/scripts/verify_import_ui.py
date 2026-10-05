"""Local Chrome smoke check for CSV/Rules UI, with financial API requests mocked.

Run from backend/: .venv/Scripts/python.exe -B scripts/verify_import_ui.py
Requires the frontend running on port 3001. No financial data is written.
"""

import json, subprocess, tempfile, time
from pathlib import Path
import httpx
from websockets.sync.client import connect
profile = tempfile.TemporaryDirectory(prefix='finance-rules-ui-')
assert Path(profile.name).resolve().is_relative_to(Path(tempfile.gettempdir()).resolve())
process = None
try:
    process = subprocess.Popen([r'C:\Program Files\Google\Chrome\Application\chrome.exe','--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check','--remote-debugging-address=127.0.0.1','--remote-debugging-port=0','--remote-allow-origins=http://localhost','--user-data-dir='+profile.name,'about:blank'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,creationflags=subprocess.CREATE_NO_WINDOW)
    active=Path(profile.name)/'DevToolsActivePort'
    for _ in range(100):
        if active.exists(): break
        time.sleep(.1)
    assert active.exists(), 'Chrome debug endpoint unavailable'
    port=int(active.read_text(encoding='utf-8').splitlines()[0])
    target=next(t for t in httpx.get(f'http://127.0.0.1:{port}/json/list').json() if t['type']=='page')
    with connect(target['webSocketDebuggerUrl'], origin='http://localhost',open_timeout=5) as ws:
        sequence=0
        exceptions=[]
        diagnostics=[]
        def call(method,params=None):
            global sequence
            sequence+=1
            ws.send(json.dumps({'id':sequence,'method':method,'params':params or {}}))
            while True:
                message=json.loads(ws.recv(timeout=15))
                if message.get('method')=='Runtime.exceptionThrown': exceptions.append(message['params']['exceptionDetails'].get('exception', {}).get('description', message['params']['exceptionDetails'].get('text','exception')))
                if message.get('method')=='Runtime.consoleAPICalled' and message['params'].get('type') in ('error', 'warning'):
                    diagnostics.append([arg.get('value', arg.get('description', '')) for arg in message['params']['args']])
                if message.get('method')=='Network.loadingFailed': diagnostics.append(message['params'].get('errorText'))
                if message.get('id')==sequence:
                    assert 'error' not in message, message
                    return message.get('result',{})
        def evaluate(source):
            result=call('Runtime.evaluate',{'expression':source,'returnByValue':True,'awaitPromise':True})
            assert 'exceptionDetails' not in result,result
            return result.get('result',{}).get('value')
        def until(source):
            for _ in range(300):
                if evaluate(source): return
                time.sleep(.1)
            print('Browser exceptions:', exceptions)
            print('Browser diagnostics:', diagnostics[-8:])
            print('Mock installed:', evaluate("typeof window.__csvTest"))
            print('Browser status:', evaluate("JSON.stringify({ready:window.__csvTest?.ready,state:document.readyState,scripts:document.scripts.length,bank:document.querySelector('#csv-bank')?.value,file:document.querySelector('#csv-file')?.files.length,requests:performance.getEntriesByType('resource').filter(r=>r.initiatorType==='fetch').map(r=>r.name)})"))
            print('Browser debug:', evaluate("document.body.innerText.slice(-500)"))
            raise AssertionError('Timed out: '+source)
        call('Page.enable');call('Runtime.enable');call('Network.enable')
        mock=r'''
        window.__csvTest={commits:[],rules:[{id:1,match_text:'rent',type:'expense',category:'Housing',enabled:true}]};
        const realFetch=window.fetch.bind(window);
        window.fetch=async(input,init={})=>{
          const u=new URL(typeof input==='string'?input:input.url,location.href);
          if(!['/categories','/rules','/imports/csv/preview','/imports/csv/commit'].includes(u.pathname))return realFetch(input,init);
          const s=window.__csvTest;
          const reply=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json'}});
          if(u.pathname==='/categories'){s.ready=true;return reply([{name:'Housing',color:'chart-blue-2'},{name:'Income',color:'chart-green-2'}]);}
          if(u.pathname==='/rules'&&init.method==='POST'){const r={...JSON.parse(init.body),id:2};s.rules.push(r);return reply(r,201);}
          if(u.pathname==='/rules')return reply(s.rules);
          if(u.pathname==='/imports/csv/preview'){
            const types=JSON.parse(init.body.get('type_overrides')||'{}');
            return reply({bank:'Test Bank',columns:['Date','Description','Amount'],mapping:{date:'Date',merchant:'Description',amount:'Amount',debit:null,credit:null,type:null,category:null},errors:[],total_rows:2,valid_rows:2,duplicate_rows:0,needs_direction:false,rows:[
              {row_number:2,date:'2026-10-01',merchant:'Rent',amount:'1200.00',type:types[2]||'expense',category:'Housing',source_category:'',source_amount:'1200.00',source_type:'',matched_rule:'rent',duplicate:false,errors:[]},
              {row_number:3,date:'2026-10-02',merchant:'Salary',amount:'2500.00',type:'income',category:'Income',source_category:'',source_amount:'2500.00',source_type:'',matched_rule:'salary',duplicate:false,errors:[]}]});
          }
          if(u.pathname==='/imports/csv/commit'){s.commits.push(JSON.parse(init.body));return reply({imported:2,skipped_duplicates:0});}
          return reply([]);
        };
        '''
        call('Page.addScriptToEvaluateOnNewDocument',{'source':mock})
        call('Page.navigate',{'url':'http://localhost:3001/settings'})
        until("!!document.querySelector('#csv-bank') && window.__csvTest?.ready === true")
        evaluate("Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(document.querySelector('#csv-bank'),'Test Bank');document.querySelector('#csv-bank').dispatchEvent(new Event('input',{bubbles:true}));const data=new DataTransfer();data.items.add(new File(['Date,Description,Amount\\n2026-10-01,Rent,1200'],'test.csv',{type:'text/csv'}));document.querySelector('#csv-file').files=data.files;document.querySelector('#csv-file').dispatchEvent(new Event('change',{bubbles:true}));")
        until("[...document.querySelectorAll('button')].some(b=>b.textContent==='Preview CSV'&&!b.disabled)")
        evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent==='Preview CSV').click()")
        until("document.body.textContent.includes('Import 2 transactions')")
        assert evaluate("document.querySelectorAll('[data-slot=table-body] [data-slot=table-row]').length")==2
        assert evaluate("document.querySelector('#csv-options')===null")
        for label in ('Income','Expense'):
            evaluate("[...document.querySelectorAll('[data-slot=table-row]')].find(r=>r.textContent.includes('Rent')).querySelector('[data-slot=select-trigger]').click()")
            until("[...document.querySelectorAll('[role=option]')].some(o=>o.textContent.includes("+json.dumps(label)+"))")
            evaluate("[...document.querySelectorAll('[role=option]')].find(o=>o.textContent.includes("+json.dumps(label)+")).click()")
            until("[...document.querySelectorAll('button')].some(b=>b.textContent==='Import 2 transactions'&&!b.disabled)")
        evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent==='Import 2 transactions').click()")
        until("window.__csvTest.commits.length===1")
        assert evaluate("window.__csvTest.commits[0].rows.map(r=>r.type)")==['expense','income']
        evaluate("[...document.querySelectorAll('[role=tab]')].find(t=>t.textContent==='Rules').click()")
        until("!!document.querySelector('#rule-match')")
        evaluate("Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(document.querySelector('#rule-match'),'internet');document.querySelector('#rule-match').dispatchEvent(new Event('input',{bubbles:true}));")
        until("[...document.querySelectorAll('button')].some(b=>b.textContent==='Add rule'&&!b.disabled)")
        evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent==='Add rule').click()")
        until("window.__csvTest.rules.some(r=>r.match_text==='internet')")
        assert not exceptions,exceptions
        print('Browser checks passed: upload, shadcn table/selects, type corrections, import payload, and Rules creation. All API calls mocked; no real financial writes.')
        try:call('Browser.close')
        except Exception:pass
finally:
    if process is not None:
        if process.poll() is None:process.terminate()
        process.wait(timeout=10)
    try:profile.cleanup()
    except PermissionError:print('Temporary browser profile has a file still closing.')
