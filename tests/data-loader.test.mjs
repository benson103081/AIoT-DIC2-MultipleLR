import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {fetchCSV,readCSVFile} from '../src/data-loader.js';
import {parseCSV,analyze} from '../src/core.js';
import {readFile} from 'node:fs/promises';
test('real HTTP CSV loading, streaming/UTF-8 errors, HTTP failure, abort and analysis',async()=>{
 const csv=await readFile('data/50_Startups.csv');
 const server=createServer((req,res)=>{
  if(req.url==='/missing'){res.writeHead(404);return res.end('not found');}
  if(req.url==='/large'){res.writeHead(200,{'content-length':2000001});return res.end();}
  if(req.url==='/stream-large'){res.writeHead(200);res.write('x'.repeat(1000001));return res.end('x'.repeat(1000001));}
  if(req.url==='/invalid-utf8')return res.end(Buffer.from([255,254,0]));
  res.writeHead(200,{'Content-Type':'text/csv','Access-Control-Allow-Origin':'*'});res.end(csv);
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;
 try{
  const loaded=await fetchCSV(base+'/data.csv');const result=analyze(parseCSV(loaded),'Profit',['R&D Spend','Marketing Spend']);assert.equal(result.rows,50);
  await assert.rejects(fetchCSV(base+'/missing'),/HTTP 404/);
  await assert.rejects(fetchCSV(base+'/large'),/2 MB/);
  await assert.rejects(fetchCSV(base+'/stream-large'),/2 MB/);
  await assert.rejects(fetchCSV(base+'/invalid-utf8'),/encoded data/);
  await assert.rejects(fetchCSV('file:///data.csv'),/HTTP/);
  const ac=new AbortController();ac.abort();await assert.rejects(fetchCSV(base,ac.signal),/abort/i);
 }finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
});
test('File upload decoder uses actual File bytes and validates size/encoding',async()=>{
 const csv=await readFile('data/mtcars.csv'),file=new File([csv],'mtcars.csv',{type:'text/csv'});
 const d=parseCSV(await readCSVFile(file));assert.equal(d.rows.length,32);
 const a=analyze(d,'mpg',['wt','hp']),b=analyze(d,'hp',['wt','disp']);assert.equal(a.target,'mpg');assert.equal(b.target,'hp');assert.notEqual(a.results[0].model.intercept,b.results[0].model.intercept);
 await assert.rejects(readCSVFile(new File(['x'.repeat(2000001)],'large.csv')),/2 MB/);
 await assert.rejects(readCSVFile(new File([new Uint8Array([255])],'bad.csv')),/encoded data/);
});
