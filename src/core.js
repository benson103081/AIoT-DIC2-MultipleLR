// Pure deterministic numerical workflow. No network, DOM, or dependencies.
export const SEED = 20261015;
export const METHODS = ['OLS baseline','Lasso','Forward Selection','RFE','Elastic Net','Exhaustive Search'];
export const mean = a => a.reduce((s,x)=>s+x,0)/a.length;
const dot = (a,b)=>a.reduce((s,x,i)=>s+x*b[i],0);
const missing = x => x == null || /^(|na|n\/a|null|nan|\?)$/i.test(String(x).trim());
export const numeric = x => !missing(x) && Number.isFinite(Number(x));
export function parseCSV(text) {
  if (text.length > 2_000_000) throw Error('CSV 超過 2 MB 限制。');
  text=text.replace(/^\uFEFF/,'');
  const records=[]; let row=[],cell='',quoted=false,closed=false;
  for(let i=0;i<text.length;i++) {
    const c=text[i];
    if(quoted) { if(c==='"') {if(text[i+1]==='"'){cell+='"';i++;}else{quoted=false;closed=true;}} else cell+=c; }
    else if(c==='"') {if(cell || closed)throw Error('CSV 引號格式錯誤。');quoted=true;}
    else if(c===',' || c==='\n' || c==='\r') {
      row.push(cell.trim());cell='';closed=false;
      if(c!==','){if(row.some(x=>x!==''))records.push(row);row=[];if(c==='\r'&&text[i+1]==='\n')i++;}
    } else {if(closed && c.trim())throw Error('CSV 引號後含有非法字元。');if(!closed)cell+=c;}
  }
  if(quoted)throw Error('CSV 引號未關閉。');
  row.push(cell.trim());if(row.some(x=>x!==''))records.push(row);
  if(records.length<2)throw Error('需要標題列與至少一筆資料，請確認是 CSV 而非網頁。');
  const headers=records.shift();
  if(headers.includes('__row'))throw Error('「__row」是內部保留欄名，請重新命名。');
  if(headers.length<2 || headers.length>50 || headers.some(h=>!h) || new Set(headers).size!==headers.length)throw Error('欄名須唯一且非空，欄數需介於 2–50。');
  if(records.length>1000)throw Error('教學版最多 1,000 筆，請先縮小資料集。');
  if(records.some(r=>r.length!==headers.length))throw Error('CSV 各列欄數不一致，請檢查分隔符號及引號。');
  const rows=records.map(r=>Object.fromEntries(headers.map((h,i)=>[h,missing(r[i])?null:r[i]])));
  return {headers,rows};
}
export function summarize(data) {
 return data.headers.map(name=>{const v=data.rows.map(r=>r[name]).filter(x=>!missing(x));return {name,type:v.length && v.every(numeric)?'number':'category',missing:data.rows.length-v.length,unique:new Set(v).size};});
}
export function shuffle(a,seed=SEED) {
 a=[...a];let state=seed>>>0;const random=()=>{state=(Math.imul(1664525,state)+1013904223)>>>0;return state/4294967296;};
 for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;
}
export function folds(rows,k=5) {const s=shuffle(rows);return Array.from({length:k},(_,f)=>({train:s.filter((_,i)=>i%k!==f),test:s.filter((_,i)=>i%k===f)}));}
// Reorthogonalized modified Gram-Schmidt QR; dependent columns get zero coefficients.
export function leastSquares(X,y) {
 const n=X.length,p=X[0].length,Q=[],R=Array.from({length:p},()=>Array(p).fill(0)),active=[];
 for(let j=0;j<p;j++){
  let v=X.map(r=>r[j]);const original=Math.sqrt(dot(v,v));
  for(let pass=0;pass<2;pass++)for(const i of active){const r=dot(Q[i],v);R[i][j]+=r;v=v.map((x,k)=>x-r*Q[i][k]);}
  const norm=Math.sqrt(dot(v,v));
  if(norm>1e-10*Math.max(1,original)){R[j][j]=norm;Q[j]=v.map(x=>x/norm);active.push(j);}
 }
 const b=Array(p).fill(0);
 for(let a=active.length-1;a>=0;a--){const i=active[a];b[i]=(dot(Q[i],y)-b.reduce((s,x,j)=>s+(j>i?R[i][j]*x:0),0))/R[i][i];}
 return {coef:b,rank:active.length};
}
export function coordinateDescent(X,y,alpha,l1=1) {
 const n=X.length,p=X[0].length,b=Array(p).fill(0),res=[...y],norm=Array.from({length:p},(_,j)=>mean(X.map(r=>r[j]**2)));
 for(let iter=0;iter<10000;iter++){
  let delta=0;
  for(let j=0;j<p;j++){
   const old=b[j],rho=mean(X.map((r,i)=>r[j]*(res[i]+r[j]*old)));
   const den=norm[j]+alpha*(1-l1);b[j]=den?Math.sign(rho)*Math.max(0,Math.abs(rho)-alpha*l1)/den:0;
   for(let i=0;i<n;i++)res[i]+=X[i][j]*(old-b[j]);delta=Math.max(delta,Math.abs(old-b[j]));
  }
  if(delta<1e-8)return {coef:b,iterations:iter+1};
 }
 throw Error('正則化模型未收斂，請移除高度相關欄位或減少特徵。');
}
export function fitPreprocessor(rows,features) {
 const fields=[],columns=[];
 for(const name of features){
  const values=rows.map(r=>r[name]).filter(x=>!missing(x));
  if(!values.length)throw Error(`訓練資料的「${name}」全為缺值。`);
  if(values.every(numeric)) {
   const v=values.map(Number).sort((a,b)=>a-b),mid=Math.floor(v.length/2),fill=v.length%2?v[mid]:(v[mid-1]+v[mid])/2;
   fields.push({name,type:'number',fill,min:v[0],max:v.at(-1)});columns.push({name,source:name,type:'number',fill});
  } else {
   const counts=new Map();values.forEach(x=>counts.set(x,(counts.get(x)||0)+1));
   const levels=[...counts.keys()].sort(),fill=[...levels].sort((a,b)=>counts.get(b)-counts.get(a)||(a<b?-1:a>b?1:0))[0];
   if(levels.length>12)throw Error(`「${name}」有 ${levels.length} 個類別（上限 12）；請排除 ID 或自由文字欄。`);
   fields.push({name,type:'category',fill,levels,reference:levels[0]});
   levels.slice(1).forEach(level=>columns.push({name:`${name} = ${level}`,source:name,type:'category',level,fill}));
  }
 }
 if(columns.length>24)throw Error('編碼後超過 24 個特徵，請減少欄位或類別。');
 const prep={fields,columns};const raw=transform(rows,prep,false);
 prep.means=columns.map((_,j)=>mean(raw.map(r=>r[j])));
 prep.scales=columns.map((_,j)=>Math.sqrt(mean(raw.map(r=>(r[j]-prep.means[j])**2)))||1);
 return prep;
}
export function transform(rows,prep,standard=true) {
 return rows.map(r=>prep.columns.map((c,j)=>{let v=missing(r[c.source])?c.fill:r[c.source];
  if(c.type==='number'&&!numeric(v))throw Error(`「${c.source}」在訓練時為數值，但遇到非數值「${v}」。`);
  const x=c.type==='number'?Number(v):Number(v===c.level);return standard?(x-prep.means[j])/prep.scales[j]:x;
 }));
}
export function fitModel(rows,target,features,method='OLS baseline',alpha=0.01,l1=1) {
 const prep=fitPreprocessor(rows,features),X=transform(rows,prep),y=rows.map(r=>Number(r[target])),ym=mean(y),ys=Math.sqrt(mean(y.map(v=>(v-ym)**2)))||1;
 const regular=method==='Lasso'||method==='Elastic Net';let coef,rank,iterations;
 if(regular && prep.columns.length){const sol=coordinateDescent(X,y.map(v=>(v-ym)/ys),alpha,l1);coef=sol.coef.map(v=>v*ys);iterations=sol.iterations;rank=leastSquares(X.map(r=>[1,...r]),y).rank;}
 else {const sol=leastSquares(X.map(r=>[1,...r]),y.map(v=>v-ym));coef=sol.coef.slice(1);rank=sol.rank;}
 const rawCoef=coef.map((v,j)=>v/prep.scales[j]);
 const intercept=ym-dot(rawCoef,prep.means);
 if(![intercept,...rawCoef].every(Number.isFinite))throw Error('數值計算溢位，請檢查資料尺度並改用較小單位。');
 return {prep,coef:rawCoef,standardCoef:coef,intercept,rank,regular,alpha,l1,iterations,features,target,method};
}
export const predict=(m,rows)=>transform(rows,m.prep,false).map(r=>{const v=m.intercept+dot(r,m.coef);if(!Number.isFinite(v))throw Error('預測超出可表示的數值範圍，請檢查輸入單位。');return v;});
export function metrics(y,p,predictors=0,regular=false,rankDeficient=false) {
 if(!y.length||y.length!==p.length||![...y,...p].every(Number.isFinite))throw Error('指標需要等長且有限的實際值與預測值。');
 const n=y.length,err=y.map((x,i)=>x-p[i]),sse=dot(err,err),sst=y.reduce((s,x)=>s+(x-mean(y))**2,0),r2=sst>0?1-sse/sst:null;
 if(!Number.isFinite(sse)||!Number.isFinite(sst)||(r2!==null&&!Number.isFinite(r2)))throw Error('誤差計算超出可表示的數值範圍，請縮小資料尺度。');
 const reason=regular?'正則化模型的有效自由度不等同非零係數數量':rankDeficient?'設計矩陣秩不足':r2===null?'實際值無變異':n<=predictors+1?'樣本數 ≤ 編碼特徵數 + 1':null;
 return {n,rmse:Math.sqrt(sse/n),mae:mean(err.map(Math.abs)),r2,adjusted:reason?null:1-(1-r2)*(n-1)/(n-predictors-1),adjustedReason:reason,r2Reason:r2===null?'實際值無變異，R² 無法定義':null};
}
function subsetScore(rows,target,features) {
 try{return mean(folds(rows,3).map(f=>{const m=fitModel(f.train,target,features);return metrics(f.test.map(r=>Number(r[target])),predict(m,f.test)).rmse;}));}catch{return Infinity;}
}
const combinations=(a,k)=>k===0?[[]]:a.flatMap((v,i)=>combinations(a.slice(i+1),k-1).map(r=>[v,...r]));
function select(rows,target,features,method,k,alpha,l1) {
 if(k===features.length)return [...features];
 if(method==='Forward Selection'){
  let chosen=[];while(chosen.length<k){let best=null,score=Infinity;for(const f of features.filter(x=>!chosen.includes(x))){const s=subsetScore(rows,target,[...chosen,f]);if(s<score){score=s;best=f;}}if(best===null)throw Error('Forward Selection 無可用子模型。');chosen.push(best);}return chosen;
 }
 if(method==='Exhaustive Search'){
  let best=null,score=Infinity;for(const fs of combinations(features,k)){const s=subsetScore(rows,target,fs);if(s<score){best=fs;score=s;}}if(!best)throw Error('Exhaustive Search 無可用子模型。');return best;
 }
 let chosen=[...features];
 while(chosen.length>k){
  const m=fitModel(rows,target,chosen,method==='RFE'?'OLS baseline':method,alpha,l1);
  const importance=Object.fromEntries(chosen.map(f=>[f,0]));m.prep.columns.forEach((c,j)=>importance[c.source]+=m.standardCoef[j]**2);
  const sorted=[...chosen].sort((a,b)=>importance[b]-importance[a]||features.indexOf(a)-features.indexOf(b));
  chosen=method==='RFE'?sorted.slice(0,-1):sorted.slice(0,k);
 }
 return chosen;
}
export function fitRecipe(rows,target,features,method,k,alpha=0.01,l1=1) {
 return fitModel(rows,target,select(rows,target,features,method,k,alpha,l1),method,alpha,l1);
}
export function analyze(data,target,features,onProgress=()=>{}) {
 if(!data.headers.includes(target) || summarize(data).find(c=>c.name===target)?.type!=='number')throw Error('目標必須是數值欄位。');
 if(!features.length||features.length>8||new Set(features).size!==features.length||features.includes(target)||features.some(f=>!data.headers.includes(f)))throw Error('請選擇 1–8 個不同且非目標的特徵欄位。');
 const valid=data.rows.map((r,i)=>({...r,__row:i+2})).filter(r=>numeric(r[target]));
 if(valid.some(r=>[target,...features].some(f=>numeric(r[f])&&Math.abs(Number(r[f]))>1e100)))throw Error('數值絕對值超過 1e100，請先換算單位以避免浮點溢位。');
 if(valid.length<25)throw Error(`有效目標只有 ${valid.length} 筆；至少需要 25 筆供切分與交叉驗證。`);
 if(new Set(valid.map(r=>Number(r[target]))).size<2)throw Error('目標欄位為常數，無法進行有意義的迴歸分析。');
 const shuffled=shuffle(valid),nTest=Math.ceil(valid.length*.2),test=shuffled.slice(0,nTest),train=shuffled.slice(nTest),cv=folds(train);
 fitPreprocessor(train,features);
 const results=[];let done=0;const disabled=features.length>6||train.length>500;
 for(const method of METHODS){
  if(method==='Exhaustive Search'&&disabled)continue;
  for(const k of method==='OLS baseline'?[features.length]:features.map((_,i)=>i+1)){
   onProgress(`${method} · k=${k}（訓練集內 5-fold CV）`);let best=null;
   const configs=method==='Lasso'?[.001,.01,.1].map(alpha=>({alpha,l1:1})):method==='Elastic Net'?[.001,.01,.1].flatMap(alpha=>[.3,.7].map(l1=>({alpha,l1}))):[{alpha:0,l1:1}];
   for(const {alpha,l1} of configs){
    try{
     const scores=cv.map(f=>{const m=fitRecipe(f.train,target,features,method,k,alpha,l1);return metrics(f.test.map(r=>Number(r[target])),predict(m,f.test));});
     const rmse=mean(scores.map(s=>s.rmse)),sd=Math.sqrt(mean(scores.map(s=>(s.rmse-rmse)**2)));
     const candidate={method,k,alpha,l1,cvRMSE:rmse,cvSD:sd,cvR2:scores.every(s=>s.r2!==null)?mean(scores.map(s=>s.r2)):null};
     if(!best||rmse<best.cvRMSE)best=candidate;
    }catch(error){if(!best)best={method,k,error:error.message,cvRMSE:Infinity};}
   }
   if(best?.error){results.push(best);continue;}
   try{const model=fitRecipe(train,target,features,method,k,best.alpha,best.l1);results.push({...best,id:done++,model});}
   catch(error){results.push({...best,error:error.message});}
  }
 }
 const available=results.filter(r=>r.model);if(!available.length)throw Error('所有模型皆無法擬合：'+results.map(r=>r.error).join('；'));
 // Lock recommendation BEFORE any held-out outcomes are evaluated.
 const recommended=[...available].sort((a,b)=>a.cvRMSE-b.cvRMSE||a.k-b.k)[0].id;
 for(const r of available){const m=r.model,yp=predict(m,test),yt=test.map(x=>Number(x[target])),p=m.prep.columns.length;
  r.test=metrics(yt,yp,p,m.regular,m.rank<p+1);r.train=metrics(train.map(x=>Number(x[target])),predict(m,train),p,m.regular,m.rank<p+1);
  r.residuals=test.map((x,i)=>({row:x.__row,actual:yt[i],predicted:yp[i],residual:yt[i]-yp[i],absolute:Math.abs(yt[i]-yp[i]),percent:yt[i]===0?null:100*Math.abs((yt[i]-yp[i])/yt[i])}));
  r.unknownCategories=m.prep.fields.filter(f=>f.type==='category').map(f=>({field:f.name,count:test.filter(x=>!missing(x[f.name])&&!f.levels.includes(x[f.name])).length})).filter(x=>x.count);
 }
 return {seed:SEED,target,features,rows:valid.length,dropped:data.rows.length-valid.length,trainRows:train.length,testRows:test.length,trainIDs:train.map(r=>r.__row),testIDs:test.map(r=>r.__row),recommended,results,exhaustiveDisabled:disabled};
}
