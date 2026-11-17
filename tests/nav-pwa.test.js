const {devices}=require('playwright');const {BASE,CACHE,VERSION,bn,ok}=require('./helpers');
module.exports=async b=>{
for(const d of ['iPhone 13','iPad Pro 11']){const ctx=await b.newContext({...devices[d]});const p=await ctx.newPage();const errs=[];
p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>m.type()==='error'&&errs.push(m.text()));
await p.goto(BASE,{waitUntil:'networkidle'});await p.evaluate(()=>navigator.serviceWorker.ready);await p.reload({waitUntil:'networkidle'});await p.waitForTimeout(300);
ok((await p.textContent('#app-version'))==='সংস্করণ '+bn(VERSION),d+' version label: '+await p.textContent('#app-version'));
const keys=await p.evaluate(async n=>(await (await caches.open(n)).keys()).map(k=>new URL(k.url).pathname),CACHE);
ok(!keys.some(k=>k.endsWith('book-text.json')),d+' book-text.json not precached');
const man=await p.evaluate(async()=>{const m=await (await fetch('./manifest.webmanifest')).json();return Promise.all(m.icons.map(i=>new Promise(r=>{const im=new Image();im.onload=()=>r(i.sizes+'='+im.naturalWidth+'x'+im.naturalHeight);im.onerror=()=>r('ERR '+i.src);im.src=i.src})))});
ok(JSON.stringify(man)==='["192x192=192x192","512x512=512x512"]',d+' manifest icons '+man);
ok(await p.$eval('.main-nav',e=>!e.hasAttribute('role')&&!e.querySelector('[role=tab],[aria-selected]')),d+' no tab roles left');
const cur=async()=>p.$$eval('.tab[aria-current=page]',a=>a.map(e=>e.dataset.tab).join());
ok(await cur()==='home',d+' home current');
await p.click('.tab[data-tab=quiz]');ok(await cur()==='quiz'&&await p.$eval('.tab[data-tab=quiz]',e=>e.classList.contains('active')),d+' quiz current '+await cur()+' active='+await p.$eval('.tab[data-tab=quiz]',e=>e.className));
await p.click('.learn-vocab-shortcut button').catch(()=>{});await p.evaluate(()=>openTab('vocab'));
ok(await cur()==='study'&&await p.isVisible('#vocab'),d+' vocab panel highlights Learn');
await p.click('.tab[data-tab=study]');ok(await p.isVisible('#study')&&await cur()==='study',d+' Learn tab returns from vocab');
ok(!(await p.$('#reveal'))&&!(await p.$('#quizanswer')),d+' dead quiz markup removed');
await p.click('.tab[data-tab=quiz]');await p.click('#next');ok((await p.textContent('#quizcount'))==='প্রশ্ন ২ / ৩০৭',d+' practice still navigates');
const sizes=await p.evaluate(()=>['#exam-exit','#exam-pause','#exam-bn-toggle'].map(s=>s));
await p.click('#start-exam');await p.waitForTimeout(500);
const hs=await p.evaluate(()=>['#exam-exit','#exam-pause','#exam-bn-toggle'].map(s=>Math.round(document.querySelector(s).getBoundingClientRect().height)));
ok(hs.every(h=>h>=44),d+' exam controls '+hs.join('/'));
const txt=await p.$eval('#exam-mode',e=>e.innerText);ok(!/QUESTION|ANSWERED|unavailable/i.test(txt),d+' no English exam strings');
p.once('dialog',x=>x.accept());await p.click('#exam-exit');
await p.evaluate(()=>openTab('study'));const lh=await p.$eval('.learn-vocab-shortcut button',e=>Math.round(e.getBoundingClientRect().height));ok(lh>=44,d+' vocab open button '+lh);
ok(errs.length===0,d+' console errors '+JSON.stringify(errs));await ctx.close();
// reduced motion -> instant scroll
const rc=await b.newContext({...devices[d],reducedMotion:'reduce'});const r=await rc.newPage();await r.goto(BASE,{waitUntil:'networkidle'});
ok(await r.evaluate(()=>SMOOTH)==='auto',d+' reduced motion -> auto scroll');
await r.evaluate(()=>openTab('study'));await r.locator('.chapter').first().click();const y0=await r.evaluate(()=>scrollY);await r.waitForTimeout(30);
ok(y0>0,d+' chapter tap jumps instantly (scrollY='+y0+')');await rc.close();
const nc=await b.newContext({...devices[d]});const n=await nc.newPage();await n.goto(BASE);ok(await n.evaluate(()=>SMOOTH)==='smooth',d+' default -> smooth');await nc.close()}
};
