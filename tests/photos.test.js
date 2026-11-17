const {devices}=require('playwright');const {BASE,CACHE,VERSION,bn,ok}=require('./helpers');
const photos=async p=>p.evaluate(async n=>{const c=await caches.open(n);return (await c.keys()).filter(k=>k.url.includes('/photos/q')).map(k=>k.url)},CACHE);
module.exports=async b=>{
for(const d of ['iPhone 13','iPad Pro 11']){
 const ctx=await b.newContext({...devices[d]});const p=await ctx.newPage();const errs=[];const net=[];
 p.on('pageerror',e=>errs.push(e.message));ctx.on('request',r=>{if(r.url().includes('/photos/q'))net.push(r.url())});
 await p.goto(BASE,{waitUntil:'networkidle'});await p.evaluate(()=>navigator.serviceWorker.ready);
 await p.reload({waitUntil:'networkidle'}); // page now controlled by the SW
 ok((await photos(p)).length===0,d+' no photos precached at install');
 // online: chapter 1 shows photos for q1..q20
 await p.click('.tab[data-tab=study]');await p.locator('.chapter').nth(0).click();
 const imgs=p.locator('#questionlist .question-photo');const n=await imgs.count();
 for(let i=0;i<n;i++){await imgs.nth(i).scrollIntoViewIfNeeded();await p.waitForTimeout(40)}
 await p.waitForTimeout(500);
 const loaded=await imgs.evaluateAll(a=>a.filter(e=>e.complete&&e.naturalWidth>0&&!e.classList.contains('photo-error')).length);
 ok(loaded===n&&n>0,`${d} online photos loaded ${loaded}/${n}`);
 const c1=await photos(p);ok(c1.length>=n&&c1.length===new Set(c1).size,`${d} cached on view: ${c1.length}`);
 // cache reuse: re-render same chapter + exam taps -> no new entries, no duplicates
 await p.click('.tab[data-tab=quiz]');await p.click('.tab[data-tab=study]');await p.locator('.chapter').nth(0).click();await p.waitForTimeout(500);
 const c2=await photos(p);ok(c2.length===c1.length&&new Set(c2).size===c2.length,`${d} reuse: ${c2.length} entries, unique=${new Set(c2).size}`);
 // offline: viewed photos load, unviewed photo falls back gracefully
 await ctx.setOffline(true);await p.reload({waitUntil:'load'});
 await p.click('.tab[data-tab=study]');await p.locator('.chapter').nth(0).click();
 const imgs2=p.locator('#questionlist .question-photo');const n2=await imgs2.count();
 for(let i=0;i<n2;i++){await imgs2.nth(i).scrollIntoViewIfNeeded();await p.waitForTimeout(40)}await p.waitForTimeout(500);
 const off=await imgs2.evaluateAll(a=>a.filter(e=>e.complete&&e.naturalWidth>0&&!e.classList.contains('photo-error')).length);
 ok(off===n2,`${d} offline viewed photos ${off}/${n2}`);
 await p.locator('.chapter').nth(7).click();await p.waitForTimeout(800);
 await p.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));await p.waitForTimeout(800);const first=p.locator('#questionlist .question-photo').first();
 const st=await first.evaluate(e=>({err:e.classList.contains('photo-error'),fallback:e.src.startsWith('data:image/svg'),hidden:getComputedStyle(e).display==='none',alt:e.alt}));
 ok(st.err&&st.fallback&&st.hidden,`${d} offline unviewed photo -> fallback (${st.alt})`);
 ok((await photos(p)).length===c1.length,d+' failed request not cached');
 ok(errs.length===0,d+' page errors: '+JSON.stringify(errs));
 await ctx.close();}
};
