import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
test('static HTML references resolve within Pages subpath; IDs and controls exist',()=>{
 const html=readFileSync('index.html','utf8'),ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length);
 for(const [,href] of html.matchAll(/(?:src|href)="(\.[^"]+)"/g))assert.ok(existsSync(href),href);
 for(const [,href] of html.matchAll(/href="#([^"]+)"/g))assert.ok(ids.includes(href),href);
 const js=readFileSync('src/app.js','utf8');for(const [,id] of js.matchAll(/\$\('([^']+)'\)/g))assert.ok(ids.includes(id),id);
 assert.ok(html.includes('lang="zh-Hant"'));assert.ok(html.includes('name="viewport"'));
 assert.ok(!html.match(/(?:src|href)="\/(?!\/)/));
});
test('all shipped JavaScript and browser test runner parse',()=>{
 for(const file of ['src/core.js','src/app.js','src/worker.js','scripts/browser-test.mjs','scripts/serve.mjs','scripts/build.mjs']){const r=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});assert.equal(r.status,0,r.stderr);}
});
test('deployment uses only dist and enforces test gate',()=>{
 const yaml=readFileSync('.github/workflows/pages.yml','utf8');assert.ok(yaml.includes('path: dist'));assert.ok(yaml.includes('needs: build'));assert.ok(yaml.includes('npm test'));assert.ok(yaml.includes('browser-test.mjs'));assert.ok(!readFileSync('scripts/deploy.ps1','utf8').includes("'--force'"));
});
test('publication targets student empty repo and excludes reference archives',()=>{
 const script=readFileSync('scripts/deploy.ps1','utf8');
 assert.ok(script.includes('https://github.com/benson103081/AIoT-DIC2-MultipleLR.git'));
 assert.ok(!script.includes('huanchen1107'));
 assert.ok(script.includes('if ($remoteRefs)'));
 assert.ok(script.includes("'--no-pager'"));
 const manifest=script.split('\n').find(l=>l.startsWith('$manifest ='));
 assert.ok(!manifest.includes('legacy'));assert.ok(!manifest.includes('image.png'));
});
