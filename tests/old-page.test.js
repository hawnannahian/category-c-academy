// An older cached index.html can meet a newer app.js (GitHub Pages ignores ?v=). The app must keep working.
const {devices}=require('playwright');const fs=require('fs'),path=require('path');const {BASE,ok}=require('./helpers');
const NEWER_IDS=['study-continue','study-summary','home-wrong','wrong-shortcut','exam-announce','app-version'];
module.exports=async b=>{
 let html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
 for(const id of NEWER_IDS)html=html.replace(new RegExp(` id="${id}"`,'g'),'');
 const ctx=await b.newContext({...devices['iPhone 13'],serviceWorkers:'block'});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.route(BASE,r=>r.fulfill({contentType:'text/html',body:html}));
 await p.goto(BASE,{waitUntil:'networkidle'});
 for(const t of ['study','quiz','progress','home']){await p.click('.tab[data-tab='+t+']');ok(await p.isVisible('#'+t),'old page: '+t+' tab opens')}
 ok(errs.length===0,'old page: no script errors '+JSON.stringify(errs));await ctx.close()};
