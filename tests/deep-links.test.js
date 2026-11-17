const {devices}=require('playwright');const {BASE,ok}=require('./helpers');
module.exports=async b=>{for(const d of ['iPhone 13','iPad Pro 11']){
 const ctx=await b.newContext({...devices[d]});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 const cur=()=>p.$$eval('.tab[aria-current=page]',a=>a.map(e=>e.dataset.tab).join());
 for(const [hash,panel,tab] of [['quiz','quiz','quiz'],['vocab','vocab','study'],['progress','progress','progress']]){
  await p.goto(BASE+'#'+hash,{waitUntil:'networkidle'});await p.reload({waitUntil:'networkidle'}); // same-page hash change doesn't reload
  ok(await p.isVisible('#'+panel)&&await cur()===tab,`${d} #${hash} opens ${panel} (current tab: ${await cur()})`)}
 await p.goto(BASE+'#nope',{waitUntil:'networkidle'});await p.reload({waitUntil:'networkidle'});ok(await p.isVisible('#home')&&await cur()==='home',d+' unknown hash stays on Home');
 await p.goto(BASE,{waitUntil:'networkidle'});const len=await p.evaluate(()=>history.length);
 await p.click('.tab[data-tab=quiz]');ok(new URL(p.url()).hash==='#quiz',d+' switching tab sets #quiz');
 await p.click('.tab[data-tab=study]');ok(new URL(p.url()).hash==='#study',d+' then #study');
 await p.click('.tab[data-tab=home]');ok(new URL(p.url()).hash==='',d+' Home clears the hash');
 ok(await p.evaluate(()=>history.length)===len,d+' tab switches add no history entries');
 ok(errs.length===0,d+' page errors '+JSON.stringify(errs));await ctx.close()}};
