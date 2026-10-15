import test from 'node:test';
import assert from 'node:assert/strict';
import {analyze,parseCSV,fitModel,predict,metrics,shuffle} from '../src/core.js';
test('reserved names and floating-point overflow fail explicitly',()=>{
 assert.throws(()=>parseCSV('__row,y\n1,2'),/保留/);
 assert.throws(()=>metrics([],[]),/等長/);
 assert.throws(()=>metrics([1e200,0],[0,1e200]),/範圍/);
 const d=parseCSV('x,y\n'+Array.from({length:25},(_,i)=>`${i},${i+1}e200`).join('\n'));
 assert.throws(()=>analyze(d,'y',['x']),/1e100/);
});
test('constant and collinear predictors produce valid predictions but no adjusted R²',()=>{
 const rows=Array.from({length:30},(_,i)=>({x:String(i),twice:String(2*i),constant:'5',y:String(2*i+3)}));
 const m=fitModel(rows,'y',['x','twice','constant']);
 assert.equal(m.rank,2);assert.ok(Math.abs(predict(m,[{x:'50',twice:'100',constant:'5'}])[0]-103)<1e-8);
 assert.equal(metrics(rows.map(r=>Number(r.y)),predict(m,rows),3,false,m.rank<4).adjustedReason,'設計矩陣秩不足');
});
test('missing target removal and numeric imputation complete in all methods',()=>{
 const rows=Array.from({length:40},(_,i)=>`${i%8===0?'':i},${i%3===0?'A':'B'},${i%13===0?'':2*i+Math.sin(i)}`);
 const r=analyze(parseCSV('x,category,y\n'+rows.join('\n')),'y',['x','category']);
 assert.equal(r.dropped,4);assert.equal(r.rows,36);assert.ok(r.results.every(m=>m.model&&Number.isFinite(m.test.rmse)));
});
test('Exhaustive is disabled for 7 fields; all other methods remain available',()=>{
 const names=Array.from({length:7},(_,i)=>'x'+i),rows=Array.from({length:30},(_,i)=>[...names.map((_,j)=>Math.sin(i*(j+1))),i+1].join(','));
 const result=analyze(parseCSV([...names,'y'].join(',')+'\n'+rows.join('\n')),'y',names);
 assert.equal(result.exhaustiveDisabled,true);assert.ok(!result.results.some(r=>r.method==='Exhaustive Search'));assert.equal(new Set(result.results.map(r=>r.method)).size,5);
});
test('test-only categories do not enter training encoder or affect selected model',()=>{
 const d=parseCSV('x,s,y\n'+Array.from({length:40},(_,i)=>`${i},${i%2?'A':'B'},${i*2+Math.sin(i)}`).join('\n'));
 const a=analyze(d,'y',['x','s']);const changed=structuredClone(d);a.testIDs.forEach(id=>changed.rows[id-2].s='NEW');const b=analyze(changed,'y',['x','s']);
 assert.equal(a.recommended,b.recommended);a.results.forEach((r,i)=>assert.deepEqual(r.model,b.results[i].model));
 assert.ok(b.results.find(r=>r.method==='OLS baseline').unknownCategories.length===1);
});
