// Practice tab fits one screen: no page scroll, every control visible above the tab bar, and question text fits
// without inner scrolling on normal phones. Also covers the practice timer, pause and favourites.
const {devices}=require('playwright');const {BASE,ok}=require('./helpers');
const CONTROLS=['#quiz-timer','#quiz-reveal-slot .question-reveal','#prev','#quiz-pause','#quizcount','#quiz-fav','#next'];
module.exports=async b=>{
 for(const [name,minFit] of [['iPhone 13',300],['iPhone 14 Pro Max',307],['Pixel 5',300],['iPhone SE',0]]){
  const ctx=await b.newContext({...devices[name]});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.goto(BASE+'#quiz',{waitUntil:'networkidle'});
  ok(!(await p.$('#quiz h2')),name+': no practice heading');
  const r=await p.evaluate(sel=>{const res={noPageScroll:0,controls:0,fit:0,overflowIds:[]};const nav=document.querySelector('.main-nav').getBoundingClientRect().top;
   for(let i=0;i<questions.length;i++){quizIndex=i;showQuiz();
    if(document.documentElement.scrollHeight<=innerHeight+1)res.noPageScroll++;
    if(sel.every(s=>{const r=document.querySelector(s)?.getBoundingClientRect();return r&&r.height>0&&r.top>=0&&r.bottom<=nav+1}))res.controls++;
    const body=document.querySelector('#quiztext');if(body.scrollHeight<=body.clientHeight+1)res.fit++;else res.overflowIds.push(questions[i].id)}
   return res},CONTROLS);
  ok(r.noPageScroll===307,`${name}: page never scrolls (${r.noPageScroll}/307)`);
  ok(r.controls===307,`${name}: all controls visible above the tab bar (${r.controls}/307)`);
  ok(r.fit>=minFit,`${name}: questions fitting without inner scroll ${r.fit}/307 (min ${minFit}); overflow: ${r.overflowIds.slice(0,8).join(',')}`);
  ok(errs.length===0,name+': no page errors '+JSON.stringify(errs));await ctx.close()}
 // timer, pause, favourite
 const ctx=await b.newContext({...devices['iPhone 13']});const p=await ctx.newPage();
 await p.goto(BASE+'#quiz',{waitUntil:'networkidle'});
 const t0=await p.textContent('#quiz-timer');await p.waitForTimeout(2200);const t1=await p.textContent('#quiz-timer');
 ok(t0==='01:15'&&t1<t0,`timer counts down (${t0} -> ${t1})`);
 await p.click('#quiz-pause');const tp=await p.textContent('#quiz-timer');await p.waitForTimeout(1600);
 ok(await p.textContent('#quiz-timer')===tp&&await p.isHidden('#quiztext')&&await p.isVisible('#quiz-paused')&&await p.getAttribute('#quiz-pause','aria-pressed')==='true','pause stops the timer and hides the question');
 await p.click('#quiz-resume');ok(await p.isVisible('#quiztext')&&await p.getAttribute('#quiz-pause','aria-pressed')==='false','resume shows the question again');
 await p.click('#quiz-fav');ok(await p.getAttribute('#quiz-fav','aria-pressed')==='true','favourite on');
 await p.click('#next');ok(await p.getAttribute('#quiz-fav','aria-pressed')==='false'&&await p.textContent('#quiz-timer')==='01:15','next question: timer resets, not a favourite');
 await p.click('#prev');await p.reload({waitUntil:'networkidle'});
 ok(await p.evaluate(()=>JSON.parse(localStorage.getItem('cca-fav')).includes(questions[0].id))&&await p.getAttribute('#quiz-fav','aria-pressed')==='true','favourite persists after reload');
 await p.click('#quiztext .question-photo');await p.waitForTimeout(300);ok(await p.evaluate(()=>document.querySelector('.photo-viewer')?.open===true),'tapping the photo opens the large viewer');
 const nat=await p.evaluate(()=>{const i=document.querySelector('.photo-viewer-image');return i.naturalWidth});ok(nat>=450,'photo is full resolution ('+nat+'px wide)');
 await ctx.close()};
