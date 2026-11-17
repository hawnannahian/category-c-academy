const {devices}=require('playwright');const {BASE,CACHE,VERSION,bn,ok}=require('./helpers');
module.exports=async b=>{
for(const d of ['iPhone 13','iPad Pro 11']){const ctx=await b.newContext({...devices[d]});const p=await ctx.newPage();const errs=[];
p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>m.type()==='error'&&errs.push(m.text()));
await p.goto(BASE,{waitUntil:'networkidle'});
const sizes=await p.evaluate(()=>['.brand','.dashboard-guide','.text-link[data-open-tab]','.check-update'].map(s=>{const r=document.querySelector(s).getBoundingClientRect();return s+':'+Math.round(r.height)}));
ok(sizes.every(x=>+x.split(':')[1]>=44),d+' tap targets '+sizes.join(' '));
ok(await p.$eval('#home-question-ring',e=>e.getAttribute('aria-valuetext')==='০% সম্পন্ন'),d+' ring aria-valuetext');
// Step 1 regressions: vocab render, openTab from dashboard, quiz progress bar
await p.click('.action-vocab');ok(await p.$$eval('#vocabtext .vocab-card',a=>a.length)===133,d+' vocab renders 133 via dashboard openTab');
await p.fill('#vsearch','carta');ok(await p.$$eval('#vocabtext .vocab-card',a=>a.length)<133,d+' vocab search filters');
await p.click('.tab[data-tab=quiz]');await p.click('#next');ok(await p.$eval('#quiz-progress-bar',e=>parseFloat(e.style.width).toFixed(3))===(2/307*100).toFixed(3),d+' practice progress bar moves');
// exam dialog
ok(!(await p.$eval('#exam-mode',e=>e.open))&&!(await p.isVisible('#exam-mode')),d+' exam dialog closed+hidden initially');
await p.click('#start-exam');await p.waitForTimeout(400);
ok(await p.$eval('#exam-mode',e=>e.open&&e.matches(':modal')),d+' exam opens as modal');
ok(await p.evaluate(()=>{const m=document.querySelector('#exam-mode');return m.contains(document.querySelector('#exam-result-screen'))&&!m.contains(document.querySelector('#bookdlg'))}),d+' dialog markup nesting correct');
// tab trap: 40 tabs stay inside
let inside=true;for(let i=0;i<40;i++){await p.keyboard.press('Tab');if(!(await p.evaluate(()=>document.querySelector('#exam-mode').contains(document.activeElement)||document.activeElement===document.body)))inside=false}
ok(inside,d+' focus stays inside exam over 40 Tabs');
// radios
ok(await p.$eval('.exam-options',e=>e.getAttribute('role')==='radiogroup'),d+' radiogroup');
await p.locator('.exam-option').nth(1).click();
ok(JSON.stringify(await p.$$eval('.exam-option',a=>a.map(e=>e.getAttribute('role')+':'+e.getAttribute('aria-checked'))))===JSON.stringify(['radio:false','radio:true',...(await p.$$eval('.exam-option',a=>a.slice(2).map(()=>'radio:false')))]),d+' radio aria-checked');
await p.click('#exam-fav');ok(await p.$eval('#exam-fav',e=>e.getAttribute('aria-pressed')==='true'),d+' favourite aria-pressed');
// Escape: dismiss confirm -> stays open; pause/resume; Escape on pause resumes
p.once('dialog',dl=>dl.dismiss());await p.keyboard.press('Escape');await p.waitForTimeout(200);ok(await p.$eval('#exam-mode',e=>e.open),d+' Escape + cancel confirm keeps exam open');
await p.click('#exam-pause');ok(await p.isVisible('#exam-pause-screen'),d+' pause');await p.keyboard.press('Escape');await p.waitForTimeout(200);
ok(!(await p.isVisible('#exam-pause-screen'))&&await p.$eval('#exam-mode',e=>e.open),d+' Escape on pause resumes, exam stays open');
// timer announcement (fast-forward)
await p.evaluate(()=>{examSeconds=301});await p.waitForTimeout(1300);ok((await p.textContent('#exam-announce'))==='৫ মিনিট বাকি',d+' 5-minute announcement');
await p.evaluate(()=>{examSeconds=61});await p.waitForTimeout(1300);ok((await p.textContent('#exam-announce'))==='১ মিনিট বাকি',d+' 1-minute announcement');
// finish -> focus score
p.once('dialog',dl=>dl.accept());await p.click('#exam-finish');await p.waitForTimeout(300);
ok(await p.evaluate(()=>document.activeElement.id==='exam-score'),d+' focus moves to score');
await p.click('#exam-retry');await p.waitForTimeout(300);ok(await p.$eval('#exam-mode',e=>e.open)&&!(await p.isVisible('#exam-result-screen'))&&(await p.textContent('#exam-announce'))==='',d+' retry reopens fresh');
p.once('dialog',dl=>dl.accept());await p.keyboard.press('Escape');await p.waitForTimeout(300);
ok(!(await p.$eval('#exam-mode',e=>e.open))&&!(await p.evaluate(()=>document.body.classList.contains('exam-open'))),d+' Escape + confirm closes exam');
await p.click('#start-exam');await p.waitForTimeout(300);ok(await p.$eval('#exam-mode',e=>e.open),d+' exam reopens after close');
p.once('dialog',dl=>dl.accept());await p.click('#exam-exit');ok(!(await p.$eval('#exam-mode',e=>e.open)),d+' close button closes');
ok(errs.length===0,d+' console errors '+JSON.stringify(errs));await ctx.close()}
};
