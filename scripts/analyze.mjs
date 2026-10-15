import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {analyze,parseCSV} from '../src/core.js';
await mkdir('reports',{recursive:true});
for(const [name,file,target,features] of [['startups','50_Startups.csv','Profit',['R&D Spend','Administration','Marketing Spend','State']],['mtcars','mtcars.csv','mpg',['wt','hp','disp','qsec','am']]]){
 const csv=await readFile(`data/${file}`,'utf8'),start=Date.now();
 const result=analyze(parseCSV(csv),target,features);
 const artifact={workflow:'scripts/analyze.mjs',dataFile:`data/${file}`,sha256:createHash('sha256').update(csv).digest('hex'),...result};
 await writeFile(`reports/${name}.json`,JSON.stringify(artifact,null,2)+'\n');
 const best=result.results.find(r=>r.id===result.recommended);
 console.log(JSON.stringify({problem:name,seconds:(Date.now()-start)/1000,train:result.trainRows,test:result.testRows,recommended:best.method,k:best.k,cvRMSE:best.cvRMSE,testMetrics:best.test}));
}
