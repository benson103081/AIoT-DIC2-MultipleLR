// Browser integration suite using Chrome's DevTools Protocol; Node 24, no npm packages.
// Must run in an account allowed to launch Chrome. Does not disable Chrome's sandbox.
import {spawn} from 'node:child_process';
import {readFile,writeFile,mkdtemp,mkdir,access} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const cases=[],errors=[];let browser,server,csvServer,socket,browserLog='';
const profile=await mkdtemp(path.join(tmpdir(),'aiot-browser-'));
await mkdir('reports',{recursive:true});
async function until(fn,message,timeout=45000){const start=Date.now();while(Date.now()-start<timeout){try{const v=await fn();if(v)return v;}catch{}await delay(100);}throw Error('Timeout: '+message);}
try{
 const candidates=[process.env.CHROME_PATH,...(process.platform==='win32'?['C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe']:['/usr/bin/google-chrome','/usr/bin/chromium','/usr/bin/chromium-browser'])].filter(Boolean);
 let executable;for(const c of candidates){try{await access(c);executable=c;break;}catch{}}
 if(!executable)throw Error('Chrome/Edge not found; set CHROME_PATH to its executable.');
 server=spawn(process.execPath,['scripts/serve.mjs'],{env:{...process.env,PORT:'4174'},windowsHide:true,stdio:'pipe'});
 await until(async()=>{const r=await fetch('http://127.0.0.1:4174/AIoT-DIC2-MultipleLR/');return r.ok;},'local server');
 const fixture='x,z,y,y2\n'+Array.from({length:40},(_,i)=>`${i},${i%5===0?'':i%7},${5+2*i-3*(i%7)},${3*i+Math.sin(i)}`).join('\n');
 const file=path.join(profile,'custom.csv');await writeFile(file,fixture);
 csvServer=createServer((req,res)=>{res.writeHead(200,{'Content-Type':'text/csv','Access-Control-Allow-Origin':'*'});res.end(fixture);});await new Promise(r=>csvServer.listen(4175,'127.0.0.1',r));
 browser=spawn(executable,['--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check','--remote-debugging-port=0',`--user-data-dir=${profile}`,'about:blank'],{windowsHide:true,stdio:'pipe'});
 browser.stderr.on('data',d=>browserLog+=d.toString());
 const port=await until(async()=>Number((await readFile(path.join(profile,'DevToolsActivePort'),'utf8')).split('\n')[0]),'Chrome start',15000);
 const pages=await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
 socket=new WebSocket(pages.find(p=>p.type==='page').webSocketDebuggerUrl);await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject;});
 let next=0;const pending=new Map();
 socket.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);if(!p)return;pending.delete(m.id);clearTimeout(p.timer);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result);}else if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.text+': '+m.params.exceptionDetails.exception?.description);};
 socket.onclose=()=>{for(const p of pending.values()){clearTimeout(p.timer);p.reject(Error('Chrome connection closed'));}pending.clear();};
 const cdp=(method,params={})=>new Promise((resolve,reject)=>{const id=++next,timer=setTimeout(()=>{pending.delete(id);reject(Error('Chrome command timed out: '+method));},35000);pending.set(id,{resolve,reject,timer});socket.send(JSON.stringify({id,method,params}));});
 async function evaluate(expression){const r=await cdp('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;}
 const change=(id,value)=>evaluate(`(()=>{const e=document.getElementById(${JSON.stringify(id)});e.value=${JSON.stringify(value)};e.dispatchEvent(new Event('change',{bubbles:true}));})()`);
 const click=id=>evaluate(`document.getElementById(${JSON.stringify(id)}).click()`);
 const done=()=>until(()=>evaluate(`document.getElementById('status').textContent.includes('分析完成') && !document.getElementById('results').hidden`),'analysis complete');
 async function check(name,fn){await fn();cases.push({name,passed:true});console.log('PASS '+name);}
 async function screenshot(name){const r=await cdp('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});await writeFile(`reports/${name}.png`,Buffer.from(r.data,'base64'));}
 await cdp('Runtime.enable');await cdp('Page.enable');await cdp('Emulation.setDeviceMetricsOverride',{width:1440,height:1100,deviceScaleFactor:1,mobile:false});
 await cdp('Page.navigate',{url:'http://127.0.0.1:4174/AIoT-DIC2-MultipleLR/'});
 await check('default startups + GitHub Pages subpath',async()=>{await done();assert.match(await evaluate(`document.getElementById('split').textContent`),/訓練 40 \/ 測試 10/);assert.equal(await evaluate(`document.querySelectorAll('#kpis .kpi').length`),4);});
 await check('all methods and feature counts update charts, equations and residuals',async()=>{for(const method of ['OLS baseline','Lasso','Forward Selection','RFE','Elastic Net','Exhaustive Search']){await change('method',method);const counts=await evaluate(`[...document.getElementById('count').options].map(o=>o.value)`);for(const k of counts){await change('count',k);assert.equal(await evaluate(`document.querySelectorAll('#rmseChart svg, #r2Chart svg').length`),2);assert.ok((await evaluate(`document.getElementById('equation').textContent`)).startsWith('Profit ='));assert.equal(await evaluate(`document.querySelectorAll('#residuals tbody tr').length`),10);}}});
 await check('prediction form responds to input',async()=>{await change('method','OLS baseline');const before=await evaluate(`document.getElementById('prediction').textContent`);await evaluate(`(()=>{const e=document.querySelector('#predictionInputs input');e.value=Number(e.value)+1000;e.dispatchEvent(new Event('input',{bubbles:true}));})()`);assert.notEqual(await evaluate(`document.getElementById('prediction').textContent`),before);});
 await screenshot('desktop');
 await check('problem switch to mtcars',async()=>{await change('problem','mtcars');await done();assert.match(await evaluate(`document.getElementById('split').textContent`),/訓練 25 \/ 測試 7/);assert.ok((await evaluate(`document.getElementById('equation').textContent`)).startsWith('mpg ='));});
 await check('target and feature changes invalidate and retrain',async()=>{await change('target','hp');assert.equal(await evaluate(`document.getElementById('results').hidden`),true);await evaluate(`(()=>{const boxes=[...document.querySelectorAll('#features input')];boxes.forEach(e=>e.checked=['wt','disp'].includes(e.value));boxes[0].dispatchEvent(new Event('change',{bubbles:true}));})()`);await click('run');await done();assert.ok((await evaluate(`document.getElementById('equation').textContent`)).startsWith('hp ='));});
 await check('cross-origin CSV URL and missing-value summary',async()=>{await evaluate(`document.getElementById('url').value='http://127.0.0.1:4175/custom.csv';document.getElementById('urlForm').requestSubmit()`);await until(()=>evaluate(`document.getElementById('loadStatus').textContent.includes('已載入：http://127.0.0.1:4175')`),'URL load');await change('target','y');await evaluate(`document.querySelectorAll('#features input').forEach(e=>e.checked=['x','z'].includes(e.value))`);await click('run');await done();assert.match(await evaluate(`document.getElementById('preview').textContent`),/40/);});
 const publicURL='https://raw.githubusercontent.com/Avik-Jain/100-Days-Of-ML-Code/master/datasets/50_Startups.csv';
 await evaluate(`document.getElementById('url').value=${JSON.stringify(publicURL)};document.getElementById('urlForm').requestSubmit()`);
 await until(()=>evaluate(`document.getElementById('loadStatus').textContent.startsWith('已載入')||document.getElementById('loadStatus').classList.contains('error')`),'public GitHub CSV request');
 if(await evaluate(`document.getElementById('loadStatus').classList.contains('error')`))cases.push({name:'public GitHub CSV URL',passed:null,reason:await evaluate(`document.getElementById('loadStatus').textContent`)});
 else await check('public GitHub CSV URL',async()=>{await change('target','Profit');await click('run');await done();assert.match(await evaluate(`document.getElementById('split').textContent`),/訓練 40 \/ 測試 10/);});
 await check('real file input upload',async()=>{const {root}=await cdp('DOM.getDocument');const {nodeId}=await cdp('DOM.querySelector',{nodeId:root.nodeId,selector:'#file'});await cdp('DOM.setFileInputFiles',{nodeId,files:[file]});await until(()=>evaluate(`document.getElementById('loadStatus').textContent.includes('已載入：custom.csv')`),'file upload');await change('target','y');await click('run');await done();});
 await check('empty feature selection rejected; retry works',async()=>{await evaluate(`(()=>{const boxes=[...document.querySelectorAll('#features input')];boxes.forEach(e=>e.checked=false);boxes[0].dispatchEvent(new Event('change',{bubbles:true}));})()`);await click('run');await until(()=>evaluate(`document.getElementById('status').classList.contains('error')`),'feature error');assert.match(await evaluate(`document.getElementById('status').textContent`),/1–8/);await evaluate(`document.querySelector('#features input').checked=true`);await click('run');await done();});
 await check('URL HTTP/format failure hides stale results',async()=>{await evaluate(`document.getElementById('url').value='http://127.0.0.1:4174/missing.csv';document.getElementById('urlForm').requestSubmit()`);await until(()=>evaluate(`document.getElementById('loadStatus').classList.contains('error')`),'URL error');assert.equal(await evaluate(`document.getElementById('results').hidden`),true);assert.match(await evaluate(`document.getElementById('loadStatus').textContent`),/本機上傳/);});
 await check('malformed uploaded CSV rejected',async()=>{const bad=path.join(profile,'bad.csv');await writeFile(bad,'a,b\n1,2,3');const {root}=await cdp('DOM.getDocument');const {nodeId}=await cdp('DOM.querySelector',{nodeId:root.nodeId,selector:'#file'});await cdp('DOM.setFileInputFiles',{nodeId,files:[bad]});await until(()=>evaluate(`document.getElementById('loadStatus').textContent.includes('欄數不一致')`),'CSV format error');});
 await click('reset');await done();
 await check('mobile 390px / 320px layout has no document overflow',async()=>{for(const width of [390,320]){await cdp('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:true});await delay(200);assert.equal(await evaluate(`document.documentElement.scrollWidth<=window.innerWidth+1`),true);assert.equal(await evaluate(`getComputedStyle(document.querySelector('.two')).gridTemplateColumns.split(' ').length`),1);await screenshot('mobile-'+width);}});
 await check('no uncaught browser exceptions',async()=>assert.deepEqual(errors,[]));
 await writeFile('reports/browser-verification.json',JSON.stringify({passed:true,date:new Date().toISOString(),browser:executable,cases,limitations:['External GitHub URL availability is recorded separately; a network/CORS outage is a skipped external check, not a failed local UI check.']},null,2)+'\n');
 await cdp('Browser.close').catch(()=>{});
}catch(error){await writeFile('reports/browser-verification.json',JSON.stringify({passed:false,date:new Date().toISOString(),cases,error:error.message,browserLog:browserLog.slice(-4000)},null,2)+'\n');console.error(error);process.exitCode=1;
}finally{socket?.close();browser?.kill();server?.kill();csvServer?.close();}
