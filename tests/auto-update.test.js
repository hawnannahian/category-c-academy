// A new service worker taking over reloads the page once, except during a running exam (banner instead).
const {devices}=require('playwright');const fs=require('fs'),path=require('path');const {BASE,ok,overrides}=require('./helpers');
const SW=fs.readFileSync(path.join(__dirname,'..','sw.js'),'utf8');
let n=0;
const publishNewVersion=async(ctx,p)=>{n++;const body=SW.replace(/const CACHE='([^']+)'/,`const CACHE='$1-next${n}'`);
 overrides.set('/sw.js',body);
 await p.evaluate(async()=>{const reg=await navigator.serviceWorker.getRegistration();await reg.update()})};
module.exports=async b=>{
 const ctx=await b.newContext({...devices['iPhone 13']});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.goto(BASE,{waitUntil:'networkidle'});await p.evaluate(()=>navigator.serviceWorker.ready);
 await p.reload({waitUntil:'networkidle'});ok(await p.evaluate(()=>!!navigator.serviceWorker.controller),'page is controlled by the service worker');
 // 1) idle: new version -> one automatic reload
 await p.evaluate(()=>{window.__before=1});
 const nav=p.waitForEvent('load',{timeout:15000}).then(()=>true,()=>false);
 await publishNewVersion(ctx,p);
 ok(await nav&&await p.evaluate(()=>!window.__before),'new version reloads the page automatically');
 await p.waitForLoadState('networkidle');
 // 2) during an exam: no reload, banner offered instead
 await p.click('.tab[data-tab=quiz]');await p.click('#start-exam');await p.waitForTimeout(300);
 await p.evaluate(()=>{window.__before=1});
 await publishNewVersion(ctx,p);await p.waitForTimeout(4000);
 ok(await p.evaluate(()=>window.__before===1&&examRunning),'no reload while an exam is running');
 ok(await p.isVisible('#update-btn'),'update banner offered during the exam instead');
 overrides.delete('/sw.js');
 ok(errs.length===0,'auto-update: no page errors '+JSON.stringify(errs));await ctx.close()};
