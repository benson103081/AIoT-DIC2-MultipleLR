import {analyze} from './core.js';
self.onmessage=({data})=>{try{const result=analyze(data.dataset,data.target,data.features,message=>self.postMessage({progress:message}));self.postMessage({result});}catch(e){self.postMessage({error:e.message});}};
