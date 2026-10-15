import {mkdir,copyFile,cp} from 'node:fs/promises';
await mkdir('dist',{recursive:true});
for(const name of ['index.html','styles.css','README.md'])await copyFile(name,`dist/${name}`);
for(const name of ['src','data','reports'])await cp(name,`dist/${name}`,{recursive:true});
await copyFile('.nojekyll','dist/.nojekyll');
console.log('Static site prepared in dist/');
