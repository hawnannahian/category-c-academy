const $ = s => document.querySelector(s);
const BOOK = './Category_C_Study_Guide_PT-BN_2026_FINAL_v4.pdf';
const PAGE_SIZE = 20;
const TOTAL = 307;
const LAST_KEY = 'cca-last-question';
const SMOOTH = matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
let questions = [], chapters = [], vocab = [];
let selectedChapter = -1, quizIndex = 0, shown = PAGE_SIZE;
let seen = new Set(loadSeen()), vocabSeen = new Set(loadVocabSeen()), wrongIds = new Set(loadWrong());
const bn = n => String(n).replace(/[0-9]/g, d => '০১২৩৪৫৬৭৮৯'[+d]);
// Photos are pre-cropped from the PDF by tools/extract-photos.py; sw.js caches each one on first successful load.
// Every question has one photo on its book page (copied by tools/extract-photos.py).
const hasPhoto=q=>!!(q&&q.page);
async function questionPhotoData(q){return hasPhoto(q)?'./photos/q'+q.id+'.jpg':null}
let questionPhotoViewer=null;
function openQuestionPhoto(src,alt){
 if(!questionPhotoViewer){
  const dialog=document.createElement('dialog');dialog.className='photo-viewer';
  const close=document.createElement('button');close.type='button';close.className='photo-viewer-close';close.textContent='✕';close.setAttribute('aria-label','ছবি বন্ধ করুন');
  const image=document.createElement('img');image.className='photo-viewer-image';
  const caption=document.createElement('p');caption.className='photo-viewer-caption';
  close.addEventListener('click',()=>dialog.close());
  dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close()});
  dialog.append(close,image,caption);document.body.appendChild(dialog);questionPhotoViewer={dialog,image,caption};
 }
 questionPhotoViewer.image.src=src;questionPhotoViewer.image.alt=alt||'PDF-এর আসল ছবি';
 questionPhotoViewer.caption.textContent='বড় করে দেখতে ট্যাপ করুন · বন্ধ করতে ✕ চাপুন';
 if(!questionPhotoViewer.dialog.open)questionPhotoViewer.dialog.showModal();
}
function attachQuestionPhoto(q,img){
 img.classList.add('photo-loading');
 img.alt='PDF-এর আসল ছবি লোড হচ্ছে — প্রশ্ন '+bn(q.id);
 questionPhotoData(q).then(src=>{
  if(!src){img.remove();return}
  img.onerror=()=>showPhotoError(q,img);img.onload=()=>{img.classList.remove('photo-loading');img.classList.add('loaded');img.setAttribute('role','button');img.setAttribute('tabindex','0');img.setAttribute('aria-label','ছবি বড় করে দেখুন');img.addEventListener('click',()=>openQuestionPhoto(img.src,img.alt));img.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openQuestionPhoto(img.src,img.alt)}});};
  img.src=src;
 }).catch(()=>showPhotoError(q,img));
}
function showPhotoError(q,img){
 img.onerror=null;img.classList.remove('photo-loading');img.classList.add('photo-error');
  img.alt='PDF ছবি লোড হয়নি — পৃষ্ঠা '+bn(q.page); img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="320" height="90"><rect width="100%" height="100%" rx="12" fill="#eef3f8"/><text x="50%" y="42%" text-anchor="middle" font-size="16" fill="#40566d">ছবি লোড হয়নি</text><text x="50%" y="68%" text-anchor="middle" font-size="13" fill="#40566d">পৃষ্ঠা '+bn(q.page)+'</text></svg>');
}
const fromBn = s => String(s).replace(/[০-৯]/g, d => '০১২৩৪৫৬৭৮৯'.indexOf(d));
function loadSeen(){try{return JSON.parse(localStorage.getItem('cca-seen')||'[]')}catch(e){return []}}
function loadVocabSeen(){try{return JSON.parse(localStorage.getItem('cca-vocab-seen')||'[]')}catch(e){return []}}
function loadWrong(){try{return JSON.parse(localStorage.getItem('cca-wrong')||'[]')}catch(e){return []}}
// A wrong pick adds the question to the review list; a later correct pick removes it. No pick = no change.
function recordAnswer(id,picked,correct){if(!picked||!correct)return;picked===correct?wrongIds.delete(id):wrongIds.add(id)}
function saveWrong(){try{localStorage.setItem('cca-wrong',JSON.stringify([...wrongIds]))}catch(e){}renderWrong()}
function renderWrong(){const card=$('#wrong-shortcut');if(!card)return;$('#wrong-count').textContent=bn(wrongIds.size);card.hidden=!wrongIds.size;const hw=$('#home-wrong');if(hw){$('#home-wrong-count').textContent=bn(wrongIds.size);hw.hidden=!wrongIds.size}}
function showError(msg){const box=$('#questionlist');box.innerHTML='';const p=document.createElement('p');p.className='notice';p.textContent=msg;box.appendChild(p)}
async function loadJSON(url){const r=await fetch(url,{cache:'no-cache'});if(!r.ok)throw new Error(url+' '+r.status);return r.json()}
Promise.all(['./questions.json','./chapters.json','./vocab.json'].map(loadJSON)).then(([q,c,v])=>{questions=q;chapters=c;vocab=v;renderChapters();renderList();renderProgress();renderVocab();renderWrong();showQuiz();updateContinue();renderDashboard()}).catch(err=>{console.error(err);showError('ডেটা লোড হয়নি। ইন্টারনেট সংযোগ দেখে পেজটি আবার রিফ্রেশ করুন। ('+err.message+')')});
function chapterRange(c){const[a,b]=c.range.split('–').map(x=>+fromBn(x));return[a,b]}
function chapterFor(id){const i=chapters.findIndex(c=>{const[a,b]=chapterRange(c);return id>=a&&id<=b});return i<0?0:i}
function renderChapters(){
 const box=$('#chapters');box.innerHTML='';
 chapters.forEach((c,i)=>{
  const b=document.createElement('button');b.type='button';b.className='chapter ios-row'+(selectedChapter===i?' selected':'');b.setAttribute('aria-pressed',selectedChapter===i);
  const [start,end]=chapterRange(c),total=questions.filter(q=>q.id>=start&&q.id<=end).length,done=questions.filter(q=>q.id>=start&&q.id<=end&&seen.has(q.id)).length,pct=total?Math.round(done/total*100):0;
  // iOS-style row: progress ring with the chapter number, titles, done/total, chevron (CSS)
  const ring=document.createElement('span');ring.className='ring'+(total&&done===total?' done':'');ring.style.setProperty('--p',pct);ring.setAttribute('aria-hidden','true');
  const num=document.createElement('b');num.textContent=c.number;ring.appendChild(num);
  const text=document.createElement('span');text.className='row-text';
  const title=document.createElement('span');title.className='ch-bn';title.textContent=c.bn;
  const pt=document.createElement('small');pt.textContent=c.pt;text.append(title,pt);
  const meta=document.createElement('span');meta.className='row-meta';meta.textContent=bn(done)+'/'+bn(total);
  b.setAttribute('aria-label','অধ্যায় '+c.number+': '+c.bn+', '+bn(done)+' / '+bn(total)+' শেষ');
  b.append(ring,text,meta);
  b.onclick=()=>{selectedChapter=i;shown=PAGE_SIZE;renderChapters();renderList();$('#questionlist').scrollIntoView({behavior:SMOOTH,block:'start'})};
  box.appendChild(b);
 });
}
function filtered(){const q=$('#search').value.trim().toLowerCase();return questions.filter(x=>q?(x.raw.toLowerCase().includes(q)||String(x.id).includes(fromBn(q))):selectedChapter===-2?wrongIds.has(x.id):chapterFor(x.id)===selectedChapter)}
function renderList(){const box=$('#questionlist');
  box.innerHTML='';
  const query=$('#search').value.trim();
  if(!query&&selectedChapter===-1){const prompt=document.createElement('div');
   prompt.className='chapter-prompt';
   const title=document.createElement('strong');
   title.textContent='শুরু করতে একটি অধ্যায় বেছে নিন';
   const note=document.createElement('p');
   note.textContent='অধ্যায়ের প্রশ্নগুলো এখানে দেখুন। যেকোনো শব্দ লিখে সব ৩০৭টি প্রশ্নেও খুঁজতে পারবেন।';
   prompt.append(title,note);
   box.appendChild(prompt);
   return}const list=filtered();
  const count=document.createElement('p');
  count.className='count';
  count.setAttribute('aria-live','polite');
  const visible=list.slice(0,shown);
  count.textContent=list.length?bn(list.length)+' টি প্রশ্নের মধ্যে '+bn(visible.length)+' টি দেখানো হচ্ছে':'কোনো প্রশ্ন পাওয়া যায়নি।';
  box.appendChild(count);
  visible.forEach(x=>box.appendChild(questionCard(x)));
  if(list.length>visible.length){const more=document.createElement('button');
   more.className='loadmore';
   more.textContent='আরও '+bn(Math.min(PAGE_SIZE,list.length-visible.length))+' টি প্রশ্ন দেখুন';
   more.onclick=()=>{shown+=PAGE_SIZE;
    renderList()};
   box.appendChild(more)}}

// Context-aware visual cards: every question gets a relevant learning illustration.
// The PDF breaks words like "designa-\nse": rejoin them without a space.
const HYPHEN_BREAK=/(\p{L})-\n(?=\p{L})/gu;
function parseQuestion(x){
 const lines=String(x.raw||'').split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
 const body=lines.filter((line,i)=>i!==0&&!/^প্রশ্ন\s*[০-৯0-9]+(?:\s+IMT.*)?$/.test(line)&&!/^IMT\s+/i.test(line));
 const stop=body.findIndex(line=>/^(সঠিক উত্তর|কেন|মনে রাখুন)\s*:/.test(line));
 const core=(stop<0?body:body.slice(0,stop));
 const bengaliLine=line=>/[\u0980-\u09FF]/.test(line);
 const firstBengali=core.findIndex(bengaliLine);
 const firstOption=core.findIndex((line,index)=>index>(firstBengali<0?-1:firstBengali)&&/^[ABC](?:\s+.*)?$/.test(line));
 const stem=firstOption<0?core:core.slice(0,firstOption);
 const splitAt=stem.findIndex(bengaliLine);
 const pt=(splitAt<0?stem:stem.slice(0,splitAt)).join('\n').replace(HYPHEN_BREAK,'$1-').replace(/\s+/g,' ').trim();
 const bnText=(splitAt<0?[]:stem.slice(splitAt)).join('\n').replace(HYPHEN_BREAK,'$1-').replace(/\s+/g,' ').trim();
 const options=[];
 if(firstOption>=0){
  let current=null;
  core.slice(firstOption).forEach(line=>{
   const m=line.match(/^([ABC])(?:\s+(.*))?$/);
   if(m){if(current)options.push(current);current={letter:m[1],lines:m[2]?[m[2]]:[]};}
   else if(current)current.lines.push(line);
  });
  if(current)options.push(current);
 }
 const parsedOptions=options.map(o=>{
  const split=o.lines.findIndex(bengaliLine);
  return {letter:o.letter,pt:(split<0?o.lines:o.lines.slice(0,split)).join('\n').replace(HYPHEN_BREAK,'$1-').replace(/\s+/g,' ').trim(),bn:(split<0?[]:o.lines.slice(split)).join('\n').replace(HYPHEN_BREAK,'$1-').replace(/\s+/g,' ').trim()};
 }).filter(o=>o.pt||o.bn);
 const explanation=lines.filter(line=>/^(কেন|মনে রাখুন)\s*:/.test(line)).map(line=>line.replace(/^(কেন|মনে রাখুন)\s*:\s*/,'').trim()).filter(Boolean);
 const correct=(String(x.answer||'').match(/^\s*([ABC])\s*[—–-]/)||[])[1]||((lines.join('\n').match(/সঠিক উত্তর\s*:\s*([ABC])/ )||[])[1]);
 return {pt,bn:bnText,options:parsedOptions,explanation,correct};
}
function makeQuestionBody(x,{onReveal}={}){
 const parsed=parseQuestion(x),body=document.createElement('div');body.className='question-body';
 const pt=document.createElement('div');pt.className='question-prompt';pt.textContent=parsed.pt||'প্রশ্নের লেখা পাওয়া যায়নি।';body.appendChild(pt);
 if(parsed.bn){const tr=document.createElement('div');tr.className='question-translation';const mark=document.createElement('span');mark.className='translation-mark';mark.textContent='文';const text=document.createElement('span');text.textContent=parsed.bn;tr.append(mark,text);body.appendChild(tr);}
 if(hasPhoto(x)){
  const photo=document.createElement('img');photo.className='question-photo';photo.alt='PDF-এর আসল ছবি — প্রশ্ন '+bn(x.id);photo.loading='lazy';attachQuestionPhoto(x,photo);
  const wrap=document.createElement('div');wrap.className='question-image-wrap';wrap.appendChild(photo);
  const caption=document.createElement('p');caption.className='question-image-caption';caption.textContent='▧ PDF-এর আসল ছবি · ট্যাপ করে বড় করে দেখুন';wrap.appendChild(caption);body.appendChild(wrap);
 }
 const list=document.createElement('div');list.className='question-options';let selected='';
 parsed.options.forEach(option=>{
  const b=document.createElement('button');b.type='button';b.className='question-option';b.setAttribute('aria-pressed','false');
  const radio=document.createElement('span');radio.className='option-radio';
  const letter=document.createElement('span');letter.className='option-letter';letter.textContent=option.letter;
  const copy=document.createElement('span');copy.className='option-copy';
  const main=document.createElement('span');main.className='option-portuguese';main.textContent=option.pt;
  copy.appendChild(main);
  if(option.bn){const sub=document.createElement('span');sub.className='option-bengali';sub.textContent=option.bn;copy.appendChild(sub);}
  b.append(radio,letter,copy);
  b.addEventListener('click',()=>{
   selected=option.letter;
   list.querySelectorAll('.question-option').forEach(el=>{el.classList.remove('selected','correct','incorrect');el.setAttribute('aria-pressed','false')});
   b.classList.add('selected');b.setAttribute('aria-pressed','true');
  });
  list.appendChild(b);
 });
 body.appendChild(list);
 const reveal=document.createElement('button');reveal.type='button';reveal.className='question-reveal';reveal.textContent='উত্তর';
 const result=document.createElement('div');result.className='question-result';result.hidden=true;
 reveal.addEventListener('click',()=>{
  result.hidden=!result.hidden;reveal.setAttribute('aria-expanded',String(!result.hidden));
  if(!result.hidden){
   result.replaceChildren();
   const answer=document.createElement('p');answer.className='question-answer-text';answer.textContent=x.answer||'এই প্রশ্নের উত্তর পাওয়া যায়নি।';result.appendChild(answer);
   parsed.explanation.forEach(line=>{const p=document.createElement('p');p.className='question-explanation';p.textContent=line;result.appendChild(p)});
   if(parsed.correct){list.querySelectorAll('.question-option').forEach(el=>{const letter=el.querySelector('.option-letter')?.textContent;if(letter===parsed.correct)el.classList.add('correct');else if(letter===selected)el.classList.add('incorrect')});}
   if(onReveal)onReveal(selected,parsed.correct);
  }
 });
 body.append(reveal,result);
 return body;
}
function goToStudyQuestion(id){
 const list=filtered(),index=list.findIndex(q=>q.id===id);
 if(index<0)return;
 shown=Math.max(shown,index+1);
 renderList();
 requestAnimationFrame(()=>{
  const target=document.getElementById('question-card-'+id);
  if(target)target.scrollIntoView({behavior:SMOOTH,block:'start'});
 });
}
function questionCard(x){
 const el=document.createElement('article');el.className='qitem qitem-modern';el.id='question-card-'+x.id;
 const top=document.createElement('div');top.className='question-card-top';
 const h=document.createElement('h3');h.textContent='প্রশ্ন '+bn(x.id)+(seen.has(x.id)?' ✓':'');
 const meta=document.createElement('span');meta.className='question-page-meta';meta.textContent=x.page?'PDF · পৃষ্ঠা '+bn(x.page):'Category C';
 top.append(h,meta);
 const body=makeQuestionBody(x,{onReveal:(picked,correct)=>{seen.add(x.id);recordAnswer(x.id,picked,correct);saveWrong();save();h.textContent='প্রশ্ন '+bn(x.id)+' ✓'}});
 const list=filtered(),index=list.findIndex(q=>q.id===x.id);
 const nav=document.createElement('nav');nav.className='question-card-nav';nav.setAttribute('aria-label','প্রশ্ন নেভিগেশন');
 const prev=document.createElement('button');prev.type='button';prev.className='question-card-prev';prev.disabled=index<=0;prev.innerHTML='<span>আগের</span>';
 prev.addEventListener('click',()=>{if(index>0)goToStudyQuestion(list[index-1].id)});
 const position=document.createElement('span');position.className='question-card-position';position.textContent=bn(index+1)+' / '+bn(list.length);
 const next=document.createElement('button');next.type='button';next.className='question-card-next';next.disabled=index<0||index>=list.length-1;next.innerHTML='<span>পরের</span>';
 next.addEventListener('click',()=>{if(index>=0&&index<list.length-1)goToStudyQuestion(list[index+1].id)});
 nav.append(prev,position,next);
 el.append(top,body,nav);return el;
}
$('#search').oninput=()=>{shown=PAGE_SIZE;renderList();const clear=$('#search-clear');if(clear)clear.hidden=!$('#search').value};
$('#study-continue')?.addEventListener('click',()=>$('#continue-btn').click());
$('#home-wrong')?.addEventListener('click',()=>{openTab('study');$('#wrong-btn')?.click()});
$('#wrong-btn')?.addEventListener('click',()=>{selectedChapter=-2;shown=PAGE_SIZE;renderChapters();renderList();$('#questionlist').scrollIntoView({behavior:SMOOTH,block:'start'})});
$('#search-clear')?.addEventListener('click',()=>{$('#search').value='';$('#search').dispatchEvent(new Event('input',{bubbles:true}));$('#search').focus()});
function showQuiz(){
 const q=questions[quizIndex];if(!q)return;
 const qc=$('#quizcount');qc.textContent=bn(q.id);qc.setAttribute('aria-label','প্রশ্ন '+bn(q.id)+' / '+bn(TOTAL));
 const host=$('#quiztext');host.replaceChildren();
 const card=makeQuestionBody(q,{onReveal:(picked,correct)=>{seen.add(q.id);recordAnswer(q.id,picked,correct);saveWrong();try{localStorage.setItem(LAST_KEY,String(q.id))}catch(e){}save();updateContinue()}});
 card.classList.add('quiz-question-body');host.appendChild(card);
 // One-screen layout: the timer sits on the photo (or above the question), and picking an option reveals the answer.
 const tm=quizTimerEl();if(tm)(card.querySelector('.question-image-wrap')||card).prepend(tm);
 const rv=card.querySelector('.question-reveal'),res=card.querySelector('.question-result');
 card.querySelector('.question-options')?.addEventListener('click',e=>{if(!e.target.closest('.question-option')||!res.hidden)return;rv.click();requestAnimationFrame(()=>res.scrollIntoView({block:'nearest',behavior:SMOOTH}))});
 fitQuiz();
 const bar=$('#quiz-progress-bar');if(bar)bar.style.width=(q.id/TOTAL*100)+'%';
 quizSeconds=QUIZ_SECONDS;quizClock();setQuizPaused(false);renderQuizFav();
}

/* Practice tab: per-question timer, pause and favourites. New elements are looked up null-safely (older cached pages). */
const QUIZ_SECONDS=75; // same pace as the mock exam: 25 minutes / 20 questions
let quizSeconds=QUIZ_SECONDS,quizPaused=false;
let favIds=new Set((()=>{try{return JSON.parse(localStorage.getItem('cca-fav')||'[]')}catch(e){return []}})());
let quizTimer=null;const quizTimerEl=()=>quizTimer||(quizTimer=$('#quiz-timer'));
function quizClock(){const t=quizTimerEl();if(!t)return;t.textContent=String(Math.floor(quizSeconds/60)).padStart(2,'0')+':'+String(quizSeconds%60).padStart(2,'0');t.classList.toggle('urgent',quizSeconds<=15)}
setInterval(()=>{if(quizPaused||quizSeconds<=0||document.hidden||document.body.dataset.tab!=='quiz')return;quizSeconds--;quizClock()},1000);
function setQuizPaused(on){const b=$('#quiz-pause');if(!b)return;quizPaused=on;$('#quiz-paused').hidden=!on;$('#quiztext').hidden=on;
 b.setAttribute('aria-pressed',String(on));b.setAttribute('aria-label',on?'আবার শুরু':'বিরতি');b.querySelector('span').textContent=on?'▶':'❚❚';b.querySelector('small').textContent=on?'শুরু':'বিরতি'}
function renderQuizFav(){const q=questions[quizIndex],b=$('#quiz-fav');if(!q||!b)return;const on=favIds.has(q.id);b.setAttribute('aria-pressed',String(on));b.classList.toggle('is-favourite',on);b.querySelector('span').textContent=on?'★':'☆'}
// If a long question does not fit, switch that question to a denser (still readable) style before falling back to scrolling.
function fitQuiz(){const host=$('#quiztext');if(!host||!host.clientHeight)return;host.classList.remove('pq-tight');if(host.scrollHeight>host.clientHeight+1)host.classList.add('pq-tight')}
addEventListener('resize',()=>requestAnimationFrame(fitQuiz));
document.querySelector('.tab[data-tab="quiz"]')?.addEventListener('click',()=>requestAnimationFrame(fitQuiz));
$('#quiz-pause')?.addEventListener('click',()=>setQuizPaused(!quizPaused));
$('#quiz-resume')?.addEventListener('click',()=>{setQuizPaused(false);$('#quiz-pause').focus()});
$('#quiz-fav')?.addEventListener('click',()=>{const q=questions[quizIndex];if(!q)return;favIds.has(q.id)?favIds.delete(q.id):favIds.add(q.id);try{localStorage.setItem('cca-fav',JSON.stringify([...favIds]))}catch(e){}renderQuizFav()});

/* Independent timed simulated exam */
const EXAM_SIZE=20,EXAM_SECONDS=1500;
let examQuestions=[],examIndex=0,examAnswers=new Map(),examFavourites=new Set(),examSeconds=EXAM_SECONDS,examTicker=null,examPaused=false,examShowBangla=false,examRunning=false;
const examEl=$('#exam-mode');
function examShuffle(items){const a=[...items];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function examStopClock(){if(examTicker){clearInterval(examTicker);examTicker=null}}
function examClockText(){return String(Math.floor(examSeconds/60)).padStart(2,'0')+':'+String(examSeconds%60).padStart(2,'0')}
function examUpdateClock(){$('#exam-timer').textContent=examClockText();$('#exam-timer').classList.toggle('urgent',examSeconds<=300);$('#exam-progress-fill').style.width=((examIndex+1)/EXAM_SIZE*100)+'%'}
function examStartClock(){examStopClock();examTicker=setInterval(()=>{if(examPaused||!examRunning)return;examSeconds=Math.max(0,examSeconds-1);examUpdateClock();if(examSeconds===300||examSeconds===60)($('#exam-announce')||{}).textContent=bn(examSeconds/60)+' মিনিট বাকি';if(examSeconds===0)examFinish(true)},1000)}
function examStart(){if(!questions.length)return;examQuestions=examShuffle(questions).slice(0,EXAM_SIZE);examIndex=0;examAnswers=new Map();examFavourites=new Set();examSeconds=EXAM_SECONDS;examPaused=false;examShowBangla=false;examRunning=true;$('#exam-pause-screen').hidden=true;$('#exam-result-screen').hidden=true;if(!examEl.open)examEl.showModal();($('#exam-announce')||{}).textContent='';document.body.classList.add('exam-open');examRender();examStartClock();$('#exam-exit').focus()}
function examMakeOption(o){const b=document.createElement('button');
  b.type='button';
  b.className='exam-option';
  b.setAttribute('role','radio');
  b.setAttribute('aria-checked','false');
  const letter=document.createElement('span');
  letter.className='exam-option-letter';
  letter.textContent=o.letter;
  const copy=document.createElement('span');
  copy.className='exam-option-text';
  const pt=document.createElement('span');
  pt.className='exam-option-pt';
  pt.textContent=o.pt;
  copy.append(pt);
  if(examShowBangla&&o.bn){const bnText=document.createElement('span');
   bnText.className='exam-option-bn';
   bnText.textContent=o.bn;
   copy.append(bnText)}b.append(letter,copy);
  if(examAnswers.get(examIndex)===o.letter){b.classList.add('selected');
   b.setAttribute('aria-checked','true')}b.addEventListener('click',()=>{examAnswers.set(examIndex,o.letter);examRender()});
  return b}
function examRender(){const q=examQuestions[examIndex];
  if(!q)return;
  const p=parseQuestion(q),host=$('#exam-question');
  host.replaceChildren();
  $('#exam-counter').textContent='প্রশ্ন '+bn(examIndex+1)+' / '+bn(EXAM_SIZE);
  $('#exam-answered').textContent=bn(examAnswers.size)+'টি উত্তর দেওয়া';
  $('#exam-fav').firstChild.textContent=examFavourites.has(examIndex)?'★':'☆';
  $('#exam-fav').classList.toggle('is-favourite',examFavourites.has(examIndex));
  $('#exam-fav').setAttribute('aria-pressed',String(examFavourites.has(examIndex)));
  $('#exam-fav-state').textContent=examFavourites.has(examIndex)?'★ চিহ্নিত':'';
if(hasPhoto(q)){const wrap=document.createElement('div');wrap.className='exam-image-wrap';const img=document.createElement('img');img.className='exam-image';img.alt='PDF-এর আসল ছবি — প্রশ্ন '+bn(q.id);img.loading='eager';attachQuestionPhoto(q,img);wrap.append(img);host.append(wrap)}
const prompt=document.createElement('div');prompt.className='exam-prompt';prompt.textContent=p.pt||'প্রশ্নের লেখা পাওয়া যায়নি।';host.append(prompt);if(examShowBangla&&p.bn){const tr=document.createElement('div');tr.className='exam-bangla';tr.textContent=p.bn;host.append(tr)}
const opts=document.createElement('div');opts.className='exam-options';opts.setAttribute('role','radiogroup');opts.setAttribute('aria-label','উত্তর বেছে নিন');p.options.forEach(o=>opts.append(examMakeOption(o)));host.append(opts);
$('#exam-bn-toggle').textContent=examShowBangla?'বাংলা সহায়তা লুকান':'বাংলা সহায়তা দেখুন';$('#exam-bn-toggle').setAttribute('aria-expanded',String(examShowBangla));$('#exam-prev').disabled=examIndex===0;$('#exam-next').disabled=examIndex===EXAM_SIZE-1;examUpdateClock()}
function examFinish(timeUp=false){if(!examRunning)return;
  examRunning=false;
  examPaused=false;
  examStopClock();
  let correct=0,wrong=0,skipped=0;
  examQuestions.forEach((q,i)=>{const key=parseQuestion(q).correct,ans=examAnswers.get(i);recordAnswer(q.id,ans,key);if(!ans)skipped++;else if(key&&ans===key)correct++;else wrong++});
  saveWrong();
  $('#exam-score').textContent=bn(correct)+' / '+bn(EXAM_SIZE);
  $('#exam-correct').textContent=bn(correct);
  $('#exam-wrong').textContent=bn(wrong);
  $('#exam-skipped').textContent=bn(skipped);
  const review=$('#exam-review');
  review.replaceChildren();
  const heading=document.createElement('h3');
  heading.textContent=timeUp?'সময় শেষ — ফলাফল':'উত্তর পর্যালোচনা';
  review.append(heading);
  if(wrong+skipped>0){const f=document.createElement('button');
   f.type='button';
   f.className='review-filter';
   f.setAttribute('aria-pressed','false');
   f.textContent='শুধু ভুল ও বাদ পড়া প্রশ্ন দেখুন';
   f.onclick=()=>{const on=f.getAttribute('aria-pressed')!=='true';
    f.setAttribute('aria-pressed',String(on));
    f.textContent=on?'সব প্রশ্ন দেখুন':'শুধু ভুল ও বাদ পড়া প্রশ্ন দেখুন';
    review.querySelectorAll('.exam-review-row.is-correct').forEach(r=>r.hidden=on)};
   review.append(f)}examQuestions.forEach((q,i)=>{const p=parseQuestion(q),row=document.createElement('div');row.className='exam-review-row '+(!examAnswers.get(i)?'is-skipped':(examAnswers.get(i)===p.correct?'is-correct':'is-wrong'));row.dataset.state=!examAnswers.get(i)?'skipped':(examAnswers.get(i)===p.correct?'correct':'wrong');const title=document.createElement('b');title.textContent='প্রশ্ন '+bn(i+1)+' · '+(examAnswers.get(i)||'—');const detail=document.createElement('span');detail.textContent='সঠিক উত্তর: '+(p.correct||'উত্তর অনুপলব্ধ');row.append(title,detail);review.append(row)});
  $('#exam-result-screen').hidden=false;
  $('#exam-pause-screen').hidden=true;
  $('#exam-score').focus()}
function examClose(){examRunning=false;examPaused=false;examStopClock();if(examEl.open)examEl.close();document.body.classList.remove('exam-open')}
$('#start-exam').addEventListener('click',examStart);
$('#exam-exit').addEventListener('click',()=>{if(confirm('পরীক্ষা বন্ধ করলে বর্তমান ফলাফল সংরক্ষিত হবে না। বন্ধ করবেন?'))examClose()});
$('#exam-pause').addEventListener('click',()=>{if(examRunning){examPaused=true;$('#exam-pause-screen').hidden=false;$('#exam-resume').focus()}});
$('#exam-resume').addEventListener('click',()=>{examPaused=false;$('#exam-pause-screen').hidden=true;$('#exam-pause').focus()});
$('#exam-prev').addEventListener('click',()=>{if(examIndex>0){examIndex--;examRender()}});
$('#exam-next').addEventListener('click',()=>{if(examIndex<EXAM_SIZE-1){examIndex++;examRender()}});

$('#exam-fav').addEventListener('click',()=>{examFavourites.has(examIndex)?examFavourites.delete(examIndex):examFavourites.add(examIndex);examRender()});
$('#exam-bn-toggle').addEventListener('click',()=>{examShowBangla=!examShowBangla;examRender()});
$('#exam-finish').addEventListener('click',()=>{if(confirm('পরীক্ষা শেষ করে ফলাফল দেখতে চান?'))examFinish(false)});
$('#exam-retry').addEventListener('click',examStart);$('#exam-close-result').addEventListener('click',examClose);
examEl.addEventListener('cancel',e=>e.preventDefault()); // Escape goes through the confirm handler below
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&examEl.open){if(!$('#exam-result-screen').hidden)examClose();else if(!$('#exam-pause-screen').hidden){examPaused=false;$('#exam-pause-screen').hidden=true}else if(confirm('পরীক্ষা বন্ধ করবেন?'))examClose()}});

$('#next').onclick=()=>{quizIndex=(quizIndex+1)%questions.length;showQuiz();rememberQuizPosition()};$('#prev').onclick=()=>{quizIndex=(quizIndex-1+questions.length)%questions.length;showQuiz();rememberQuizPosition()};
function save(){try{localStorage.setItem('cca-seen',JSON.stringify([...seen]))}catch(e){}renderProgress();renderDashboard()}
function renderProgress(){
 $('#donecount').textContent=bn(seen.size);
 $('#bar').style.width=Math.min(100,seen.size/TOTAL*100)+'%';
 $('#bar').parentElement.setAttribute('aria-valuenow',seen.size);
 const host=$('#progress-chapters');
 if(!host)return;
 host.replaceChildren();
 chapters.forEach(c=>{
  const [start,end]=chapterRange(c);
  const total=questions.filter(q=>q.id>=start&&q.id<=end).length;
  const done=questions.filter(q=>q.id>=start&&q.id<=end&&seen.has(q.id)).length;
  const pct=total?Math.round(done/total*100):0;
  const card=document.createElement('article');card.className='progress-chapter-card';
  const top=document.createElement('div');top.className='progress-chapter-top';
  const title=document.createElement('strong');title.textContent='অধ্যায় '+c.number+' · '+c.bn;
  const amount=document.createElement('span');amount.textContent=bn(done)+' / '+bn(total);
  top.append(title,amount);
  const track=document.createElement('div');track.className='progress-chapter-track';
  const fill=document.createElement('i');fill.style.width=pct+'%';track.appendChild(fill);
  const foot=document.createElement('div');foot.className='progress-chapter-foot';
  const status=document.createElement('span');status.textContent=done?'চলমান':'শুরু করা হয়নি';
  const percent=document.createElement('b');percent.textContent=bn(pct)+'%';foot.append(status,percent);
  card.append(top,track,foot);
  card.addEventListener('click',()=>{const index=chapters.indexOf(c);selectedChapter=index;shown=PAGE_SIZE;renderChapters();renderList();openTab('study');window.scrollTo({top:0,behavior:SMOOTH})});
  card.tabIndex=0;card.setAttribute('role','button');card.setAttribute('aria-label','অধ্যায় '+c.number+' এর প্রশ্ন প্র্যাকটিস করুন');
  host.appendChild(card);
 });
}
$('#reset').onclick=()=>{if(confirm('আপনার দেখা প্রশ্নের অগ্রগতি মুছে ফেলবেন?')){seen.clear();wrongIds.clear();saveWrong();save();renderList();renderDashboard()}};
const dlg=$('#bookdlg');
 let lastBookTrigger=null;
 function bookPageUrl(page){const file=new URL(BOOK,location.href);
  return file.href+'#page='+page}function openBookPage(x,trigger){$('#bookTitle').textContent='প্রশ্ন '+bn(x.id)+' · বইয়ের পৃষ্ঠা '+bn(x.page);
  const url=bookPageUrl(x.page);
  $('#bookframe').src=url;
  $('#bookopen').href=url;
  lastBookTrigger=trigger||document.activeElement;
  dlg.hidden=false;
  document.body.classList.add('book-open');
  $('#bookclose').focus()}function closeBookPage(){if(dlg.hidden)return;
  dlg.hidden=true;
  $('#bookframe').src='about:blank';
  document.body.classList.remove('book-open');
  if(lastBookTrigger&&lastBookTrigger.isConnected)lastBookTrigger.focus()}$('#bookclose').onclick=closeBookPage;
 dlg.hidden=true;
 document.body.classList.remove('book-open');
 $('#bookframe').src='about:blank';
 dlg.addEventListener('click',e=>{if(e.target===dlg)closeBookPage()});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!dlg.hidden){e.preventDefault();closeBookPage()}});
let tabScrollPositions={};let activeTab=document.body.dataset.tab||'home';document.querySelectorAll('.tab').forEach(b=>b.onclick=()=>{const nextTab=b.dataset.tab;if(nextTab===activeTab)return;tabScrollPositions[activeTab]=window.scrollY;const navTab=nextTab==='vocab'?'study':nextTab; // vocab lives under Learn
document.querySelectorAll('.tab').forEach(x=>{const on=x.dataset.tab===navTab;x.classList.toggle('active',on);on?x.setAttribute('aria-current','page'):x.removeAttribute('aria-current')});
 document.querySelectorAll('.panel').forEach(p=>p.hidden=p.id!==nextTab);
 document.body.dataset.tab=nextTab;
 activeTab=nextTab;
 history.replaceState(null,'',nextTab==='home'?location.pathname+location.search:'#'+nextTab);
 const y=tabScrollPositions[nextTab]||0;
 if(Math.abs(window.scrollY-y)>1)window.scrollTo({top:y,behavior:'instant'})});
let promptInstall;window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();promptInstall=e;$('#install').hidden=false});$('#install').onclick=async()=>{if(promptInstall){promptInstall.prompt();promptInstall=null}};/* ---- app updates: tell the user when a new version is ready ---- */
let swReg=null,hadController=!!(navigator.serviceWorker&&navigator.serviceWorker.controller),reloading=false;
function showUpdate(msg,withButton){const b=$('#update-banner');if(!b)return;$('#update-text').textContent=msg;$('#update-btn').hidden=!withButton;b.hidden=false;if(!withButton)setTimeout(()=>{b.hidden=true},3500)}
function checkUpdate(manual){
 if(!swReg){if(manual)showUpdate('আপডেট পরীক্ষা এখন সম্ভব নয়।',false);return}
 swReg.update().then(()=>{if(manual&&!swReg.waiting&&!swReg.installing&&$('#update-banner').hidden)showUpdate('আপনি সর্বশেষ সংস্করণে আছেন ✓',false)}).catch(()=>{if(manual)showUpdate('ইন্টারনেট নেই, পরে আবার দেখুন।',false)});
}
if('serviceWorker'in navigator){
 navigator.serviceWorker.addEventListener('controllerchange',()=>{if(reloading)return;if(hadController){
  // A new version took over: reload once so the page and its files match. Never mid-exam (answers would be lost).
  if(examRunning)showUpdate('নতুন সংস্করণ প্রস্তুত। আপডেট করতে রিলোড করুন।',true);else{reloading=true;location.reload()}}hadController=true});
 window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').then(reg=>{
  swReg=reg;if(reg.waiting&&navigator.serviceWorker.controller)showUpdate('নতুন সংস্করণ এসেছে।',true);
  reg.addEventListener('updatefound',()=>{const w=reg.installing;if(!w)return;w.addEventListener('statechange',()=>{if(w.state==='installed'&&navigator.serviceWorker.controller)showUpdate('নতুন সংস্করণ এসেছে।',true)})});
  setInterval(()=>checkUpdate(false),30*60*1000);
 }).catch(e=>console.warn('SW',e)));
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')checkUpdate(false)});
 const ub=$('#update-btn');if(ub)ub.onclick=()=>{reloading=true;ub.disabled=true;ub.textContent='আপডেট হচ্ছে…';const done=()=>location.reload();if(swReg&&swReg.waiting){navigator.serviceWorker.addEventListener('controllerchange',done,{once:true});swReg.waiting.postMessage('SKIP_WAITING');setTimeout(done,2500)}else done()};
 const cu=$('#check-update');if(cu)cu.onclick=()=>checkUpdate(true);
 if(navigator.serviceWorker.controller){const ch=new MessageChannel();ch.port1.onmessage=e=>{const m=/v(\d+)$/.exec(e.data);if(m)($('#app-version')||{}).textContent='সংস্করণ '+bn(m[1])};navigator.serviceWorker.controller.postMessage('VERSION',[ch.port2])}
}function renderVocab(){const box=$('#vocabtext');
 if(!box)return;
 const s=$('#vsearch').value.trim().toLowerCase(),cat=$('#vcat').value,state=$('#vstate').value,select=$('#vcat');
 if(select.options.length===1){[...new Map(vocab.map(x=>[x.category,x.categoryName])).entries()].forEach(([id,name])=>{const o=document.createElement('option');o.value=id;o.textContent=name;select.appendChild(o)})}const result=vocab.filter(x=>(!s||(x.portuguese+' '+x.bengali+' '+x.explanation).toLowerCase().includes(s))&&(!cat||cat==='0'||String(x.category)===cat)&&(state==='all'||(state==='learned')===vocabSeen.has(x.id)));
 box.innerHTML='';
 result.forEach(x=>{const a=document.createElement('article');a.className='vocab-card';const meta=document.createElement('div');meta.className='vocab-meta';const c=document.createElement('span');c.textContent=x.categoryName;const p=document.createElement('span');p.textContent='বই · পৃষ্ঠা '+bn(x.page);meta.append(c,p);const h=document.createElement('h3');h.textContent=x.portuguese;const m=document.createElement('p');m.className='vocab-meaning';m.textContent=x.bengali;const d=document.createElement('p');d.className='vocab-explanation';d.textContent=x.explanation;const b=document.createElement('button');b.className='vocab-mark';b.setAttribute('aria-pressed',String(vocabSeen.has(x.id)));b.textContent=vocabSeen.has(x.id)?'✓ শিখেছি':'শিখেছি';b.onclick=()=>{vocabSeen.has(x.id)?vocabSeen.delete(x.id):vocabSeen.add(x.id);try{localStorage.setItem('cca-vocab-seen',JSON.stringify([...vocabSeen]))}catch(e){}renderVocab();renderDashboard()};a.append(meta,h,m,d,b);box.appendChild(a)});
 $('#vocabcount').textContent=result.length?bn(result.length)+'টি শব্দ · '+bn(vocab.length)+'টির মধ্যে':'কোনো শব্দ পাওয়া যায়নি।';
 $('#vocabdone').textContent=bn(vocabSeen.size)+' / '+bn(vocab.length);
 $('#vocabbar').style.width=(vocabSeen.size/vocab.length*100)+'%';
 $('#vocabbar').parentElement.setAttribute('aria-valuenow',vocabSeen.size)}
$('#vsearch').oninput=renderVocab;$('#vcat').onchange=renderVocab;$('#vstate').onchange=renderVocab;




function rememberQuizPosition(){const q=questions[quizIndex];if(q){try{localStorage.setItem(LAST_KEY,String(q.id))}catch(e){}updateContinue()}}
function heroPhoto(q){
 const el=$('#continue-photo');if(!el)return;const key='cca-hero-'+q.id;let c=null;try{c=localStorage.getItem(key)}catch(e){}
 if(c){el.style.backgroundImage='url("'+c+'")';el.classList.add('has-photo');return}
 const run=()=>questionPhotoData(q).then(src=>{if(!src)return;const img=new Image();img.onload=()=>{try{const cv=document.createElement('canvas');cv.width=480;cv.height=Math.round(480*img.height/img.width);cv.getContext('2d').drawImage(img,0,0,cv.width,cv.height);const data=cv.toDataURL('image/jpeg',.8);Object.keys(localStorage).filter(k=>k.startsWith('cca-hero-')).forEach(k=>localStorage.removeItem(k));localStorage.setItem(key,data);el.style.backgroundImage='url("'+data+'")';el.classList.add('has-photo')}catch(e){}};img.src=src}).catch(()=>{});
 if(window.requestIdleCallback)requestIdleCallback(run,{timeout:1500});else setTimeout(run,1500);
}
function updateContinue(){
 const el=$('#continue-text'),btn=$('#continue-btn');if(!el||!btn||!questions.length)return;
 let id=0;try{id=Number(localStorage.getItem(LAST_KEY)||0)}catch(e){}
 const q=questions.find(x=>x.id===id),ci=chapterFor(q?q.id:1),ch=chapters[ci];
 if(ch){const[a,b]=chapterRange(ch),total=b-a+1;let done=0;for(let n=a;n<=b;n++)if(seen.has(n))done++;
  $('#continue-title').textContent=ch.bn;$('#continue-tag').textContent='অধ্যায় '+ch.number+(q?' · প্রশ্ন '+bn(q.id):'');
  $('#continue-meter-count').textContent=bn(done)+' / '+bn(total);$('#continue-bar-fill').style.width=(done/total*100)+'%'}
 el.textContent=q?'শেষ প্রশ্ন '+bn(q.id):'প্রথম অধ্যায় থেকে শুরু করুন';
 if(ch&&$('#study-continue')){const[a,b2]=chapterRange(ch);let d=0;for(let n=a;n<=b2;n++)if(seen.has(n))d++;$('#study-continue-tag').textContent=$('#continue-tag').textContent;$('#study-continue-title').textContent=ch.bn;$('#study-continue-fill').style.width=(d/(b2-a+1)*100)+'%'}
 ($('#study-continue-go')||{}).textContent=q?'চালিয়ে যান':'শুরু';
 btn.textContent=q?'চালিয়ে যান':'শুরু';
 const g=$('#home-greeting');if(g){const h=new Date().getHours();g.textContent=h<5?'শুভ রাত্রি':h<12?'শুভ সকাল':h<17?'শুভ দুপুর':h<20?'শুভ সন্ধ্যা':'শুভ রাত্রি'}
 if(q)heroPhoto(q);else{const p=$('#continue-photo');if(p){p.style.backgroundImage='';p.classList.remove('has-photo')}}
 renderDashboard()}
function renderDashboard(){
 if(!$('#home-stat-questions'))return;
 const totalQuestions=questions.length||TOTAL,totalVocab=vocab.length||133;
 const questionPct=Math.min(100,Math.round(seen.size/totalQuestions*100));
 const vocabPct=Math.min(100,Math.round(vocabSeen.size/totalVocab*100));
 $('#home-stat-questions').textContent=bn(totalQuestions);
 $('#home-stat-chapters').textContent=bn(chapters.length||8);
 $('#home-stat-vocab').textContent=bn(totalVocab);
 const sum=$('#study-summary');if(sum)sum.textContent=bn(seen.size)+' / '+bn(totalQuestions)+' প্রশ্ন শেষ · '+bn(chapters.length||8)+'টি অধ্যায়';
 const vc=$('#study-vocab-count');if(vc)vc.textContent=bn(totalVocab)+'টি';
 $('#home-seen').textContent=bn(seen.size);
 $('#home-vocab-seen').textContent=bn(vocabSeen.size)+' / '+bn(totalVocab);
 const ring=$('#home-question-ring');
 if(ring){ring.style.setProperty('--progress',questionPct+'%');ring.setAttribute('aria-valuenow',questionPct);ring.setAttribute('aria-valuetext',bn(questionPct)+'% শেষ')}
 const percent=$('#home-question-percent');if(percent)percent.textContent=bn(questionPct)+'%';
 const bar=$('#home-progress-bar');if(bar){bar.style.width=questionPct+'%';bar.parentElement.setAttribute('aria-valuenow',seen.size)}
 const vocabBar=$('#home-vocab-bar');if(vocabBar){vocabBar.style.width=vocabPct+'%';vocabBar.parentElement.setAttribute('aria-valuenow',vocabSeen.size)}
}function openTab(tab){const b=document.querySelector('.tab[data-tab="'+tab+'"]');if(b)b.click()}
document.querySelectorAll('[data-open-tab]').forEach(b=>b.addEventListener('click',()=>{openTab(b.dataset.openTab);if(b.dataset.startExam==='true')setTimeout(()=>$('#start-exam')?.click(),0)}));
$('#continue-btn').addEventListener('click',()=>{let id=0;try{id=Number(localStorage.getItem(LAST_KEY)||0)}catch(e){}const i=questions.findIndex(x=>x.id===id);if(i>=0){quizIndex=i;showQuiz();rememberQuizPosition()}openTab('quiz');window.scrollTo({top:0,behavior:SMOOTH})});
// Deep link: open the tab named in the URL hash (e.g. #quiz); unknown hashes stay on Home.
{const h=location.hash.slice(1);if(h&&h!=='home'&&document.querySelector('.tab[data-tab="'+CSS.escape(h)+'"]'))openTab(h)}
