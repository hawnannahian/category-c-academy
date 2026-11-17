const {devices}=require('playwright');const {BASE,CACHE,VERSION,bn,ok}=require('./helpers');
module.exports=async b=>{
for(const d of ['iPhone 13','iPad Pro 11']){const ctx=await b.newContext({...devices[d]});const p=await ctx.newPage();const errs=[],fontReq=[];
p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>m.type()==='error'&&errs.push(m.text()));ctx.on('request',r=>{if(/fonts\.(googleapis|gstatic)/.test(r.url()))fontReq.push(r.url())});
await p.goto(BASE,{waitUntil:'networkidle'});
const ids=async()=>p.evaluate(()=>JSON.parse(localStorage.getItem('cca-wrong')||'[]').sort((a,b)=>a-b));
const card=async id=>p.locator('#question-card-'+id);
const answer=async(id,right)=>{const c=await card(id);const L=await p.evaluate(id=>{const q=questions.find(x=>x.id===id);const P=parseQuestion(q);return {c:P.correct,o:P.options.map(o=>o.letter)}},id);
 const pick=right?L.c:L.o.find(x=>x!==L.c);await c.locator('.question-option',{has:p.locator('.option-letter',{hasText:new RegExp('^'+pick+'$')})}).click();await c.locator('.question-reveal').click()};
ok(await p.isHidden('#wrong-shortcut'),d+' card hidden with no mistakes');ok(await p.isHidden('#home-wrong'),d+' home line hidden with no mistakes');
await p.evaluate(()=>openTab('study'));await p.locator('.chapter').first().click();
await answer(1,false);await answer(2,false);await answer(3,true);
ok(JSON.stringify(await ids())==='[1,2]',d+' wrong picks recorded, right pick not: '+JSON.stringify(await ids()));
ok(await p.isVisible('#wrong-shortcut')&&(await p.textContent('#wrong-count'))==='২',d+' card shows ২');
await (await card(4)).locator('.question-reveal').click();ok(JSON.stringify(await ids())==='[1,2]',d+' reveal without pick changes nothing');
// close+reopen reveal on card 1 then answer correctly -> removed
await (await card(1)).locator('.question-reveal').click();await answer(1,true);ok(JSON.stringify(await ids())==='[2]',d+' later correct answer removes it');
await p.click('#wrong-btn');await p.waitForTimeout(400);
const listed=await p.$$eval('#questionlist .qitem',a=>a.map(e=>e.id));ok(JSON.stringify(listed)==='["question-card-2"]',d+' review list = '+listed);
ok(!(await p.$$eval('.chapter.selected',a=>a.length)),d+' no chapter highlighted in review mode');
await p.evaluate(()=>openTab('home'));ok(await p.isVisible('#home-wrong')&&(await p.textContent('#home-wrong-count'))==='১',d+' home line shows ১');
const hh=await p.$eval('#home-wrong',e=>Math.round(e.getBoundingClientRect().height));ok(hh>=44,d+' home line '+hh+'px');
await p.evaluate(()=>{selectedChapter=0;renderList()});await p.click('#home-wrong');await p.waitForTimeout(400);
ok(await p.isVisible('#study')&&JSON.stringify(await p.$$eval('#questionlist .qitem',a=>a.map(e=>e.id)))==='["question-card-2"]',d+' home line opens review list');
// reload persists
await p.reload({waitUntil:'networkidle'});ok(JSON.stringify(await ids())==='[2]'&&(await p.textContent('#wrong-count'))==='১',d+' persists across reload');
// practice tab records too
await p.evaluate(()=>openTab('quiz'));const qid=await p.evaluate(()=>questions[quizIndex].id);
const P=await p.evaluate(id=>{const P=parseQuestion(questions.find(x=>x.id===id));return {c:P.correct,o:P.options.map(o=>o.letter)}},qid);
const wrongL=P.o.find(x=>x!==P.c);await p.locator('#quiztext .question-option',{has:p.locator('.option-letter',{hasText:new RegExp('^'+wrongL+'$')})}).click();await p.click('#quiz-reveal-slot .question-reveal');
ok((await ids()).includes(qid),d+' practice wrong answer recorded (q'+qid+')');
// exam: answer all with wrong option where possible, finish
await p.click('#start-exam');await p.waitForTimeout(300);
const exam=await p.evaluate(()=>examQuestions.map(q=>{const P=parseQuestion(q);return {id:q.id,c:P.correct,w:P.options.map(o=>o.letter).find(x=>x!==P.correct)}}));
for(let i=0;i<exam.length;i++){if(i<10){await p.locator('.exam-option',{has:p.locator('.exam-option-letter',{hasText:new RegExp('^'+(i<5?exam[i].w:exam[i].c)+'$')})}).click()}if(i<19)await p.click('#exam-next')}
p.once('dialog',x=>x.accept());await p.click('#exam-finish');await p.waitForTimeout(300);
const after=await ids();
ok(exam.slice(0,5).every(q=>after.includes(q.id))&&exam.slice(5,10).every(q=>!after.includes(q.id))&&exam.slice(10).every(q=>after.includes(q.id)===[2,qid].includes(q.id)),d+' exam: 5 wrong added, 5 right removed/absent, 10 skipped untouched');
await p.click('#exam-close-result');
// reset clears
await p.evaluate(()=>openTab('progress'));p.once('dialog',x=>x.accept());await p.click('#reset');
ok((await ids()).length===0&&await p.isHidden('#wrong-shortcut'),d+' reset clears list and hides card');
const btn=await p.evaluate(()=>{openTab('study');document.querySelector('#wrong-shortcut').hidden=false;const h=Math.round(document.querySelector('#wrong-btn').getBoundingClientRect().height);document.querySelector('#wrong-shortcut').hidden=true;return h});ok(btn>=44,d+' review button '+btn+'px');
ok(fontReq.length===0,d+' no Google Fonts requests');
ok(await p.evaluate(()=>getComputedStyle(document.body).fontFamily.startsWith('-apple-system')),d+' system font stack');
// chapter titles not truncated at 40px
await p.addStyleTag({content:'html{font-size:40px!important}'});await p.waitForTimeout(200);
ok(await p.$$eval('.ch-bn',a=>a.every(e=>e.scrollHeight<=e.clientHeight+1&&getComputedStyle(e).overflow==='visible')),d+' chapter titles not clipped at 40px');
ok(errs.length===0,d+' console errors '+JSON.stringify(errs));await ctx.close()}
};
