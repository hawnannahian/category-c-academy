const $ = s => document.querySelector(s);
const BOOK = './Category_C_Study_Guide_PT-BN_2026_FINAL_v4.pdf';
const PAGE_SIZE = 20;
const TOTAL = 307;
const LAST_KEY = 'cca-last-question';
let questions = [], chapters = [], vocab = [];
let selectedChapter = -1, quizIndex = 0, shown = PAGE_SIZE;
let seen = new Set(loadSeen()), vocabSeen = new Set(loadVocabSeen());
const bn = n => String(n).replace(/[0-9]/g, d => '০১২৩৪৫৬৭৮৯'[+d]);
let pdfDocumentPromise=null;
const pdfPageCanvasCache=new Map();
function ensurePdfDocument(){
 if(!window.pdfjsLib) return Promise.reject(new Error('PDF renderer unavailable'));
 if(!pdfDocumentPromise){
  pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  pdfDocumentPromise=pdfjsLib.getDocument({url:BOOK,disableWorker:true,disableRange:true,disableStream:true,disableAutoFetch:true}).promise;
 }
 return pdfDocumentPromise;
}
const PDF_IMAGE_Y={"1":140.998,"2":351.74,"3":549.732,"4":61.501,"5":285.742,"6":509.983,"7":61.501,"8":270.743,"9":468.735,"10":61.501,"11":272.243,"12":442.486,"13":61.501,"14":272.243,"15":496.484,"16":61.501,"17":298.492,"18":521.233,"19":61.501,"20":272.243,"21":496.484,"22":61.501,"23":259.493,"24":496.484,"25":61.501,"26":284.992,"27":482.984,"28":61.501,"29":284.242,"30":442.486,"31":61.501,"32":140.998,"33":365.239,"34":589.48,"35":61.501,"36":272.243,"37":545.232,"38":140.998,"39":375.739,"40":61.501,"41":272.243,"42":482.234,"43":61.501,"44":308.241,"45":518.983,"46":61.501,"47":310.491,"48":521.233,"150":61.501,"172":140.998,"173":363.739,"174":586.48,"175":61.501,"176":259.493,"177":496.484,"178":61.501,"179":284.242,"180":494.984,"181":61.501,"182":272.243,"183":482.984,"184":61.501,"185":284.242,"186":467.985,"187":61.501,"188":259.493,"189":458.235,"191":259.493,"192":470.235,"193":61.501,"194":272.243,"195":470.235,"196":140.998,"197":351.74,"198":61.501,"199":334.49,"200":545.232,"201":61.501,"202":323.991,"203":61.501,"204":308.241,"205":518.983,"206":61.501,"207":296.242,"208":506.983,"209":61.501,"210":308.241,"211":569.231,"212":61.501,"213":259.493,"214":482.234,"215":61.501,"216":296.242,"217":61.501,"218":372.739,"219":61.501,"220":272.243,"221":545.232,"222":61.501,"223":297.742,"224":508.483,"225":61.501,"226":123.749,"227":347.99,"228":557.981,"229":61.501,"230":259.493,"231":481.484,"232":61.501,"233":245.244,"234":455.985,"235":61.501,"236":308.241,"237":518.983,"238":61.501,"239":296.242,"240":518.983,"241":61.501,"242":272.243,"243":481.484,"244":61.501,"245":284.242,"246":507.733,"247":61.501,"248":320.991,"249":505.483,"250":61.501,"251":272.243,"252":468.735,"253":61.501,"254":259.493,"255":506.983,"256":61.501,"257":296.242,"258":506.983,"259":61.501,"260":296.242,"261":544.482,"262":61.501,"263":296.242,"264":530.982,"265":61.501,"266":297.742,"267":521.233,"268":61.501,"269":321.741,"270":532.482,"271":61.501,"272":271.493,"273":467.985,"274":61.501,"275":270.743,"276":479.984,"277":61.501,"278":334.49,"279":61.501,"280":320.991,"281":530.233,"282":61.501,"283":270.743,"284":479.984,"285":61.501,"286":270.743,"287":479.984,"288":61.501,"289":272.243,"290":518.983,"291":61.501,"292":272.243,"293":496.484,"294":61.501,"295":272.243,"296":518.233,"297":61.501,"298":284.242,"299":492.734,"300":61.501,"301":332.99,"302":61.501,"303":321.741,"304":532.482,"305":61.501,"306":272.243,"307":496.484};
const pdfImageYByPage=new Map();
function detectPdfImageY(canvas,xPt,wPt,hPt,scale){
 const x=Math.round(xPt*scale),w=Math.round(wPt*scale),h=Math.round(hPt*scale);
 const maxY=canvas.height-h,ctx=canvas.getContext('2d',{willReadFrequently:true});
 let bestY=-1,bestScore=0;
 for(let y=0;y<=maxY;y+=4){
  const data=ctx.getImageData(x,y,w,h).data,buckets=new Set();let nonWhite=0,colour=0,dark=0,samples=0;
  for(let py=2;py<h;py+=7)for(let px=2;px<w;px+=7){
   const i=(py*w+px)*4,r=data[i],g=data[i+1],b=data[i+2];samples++;
   if(Math.min(r,g,b)<238)nonWhite++;
   if(Math.max(r,g,b)-Math.min(r,g,b)>18)colour++;
   if((r+g+b)/3<190)dark++;
   buckets.add((r>>5)+','+(g>>5)+','+(b>>5));
  }
  const density=nonWhite/samples,chromatic=colour/samples,tones=buckets.size;
  const score=tones*Math.min(density/.42,1.15)+chromatic*18+(dark/samples)*4;
  if(density>.13&&tones>22&&score>bestScore){bestScore=score;bestY=y}
 }
 return bestScore>24?bestY/scale:null;
}
async function questionPhotoData(q){
 const pdf=await ensurePdfDocument(),page=await pdf.getPage(q.page);
 const scale=3.5,viewport=page.getViewport({scale}),canvas=document.createElement('canvas');
 canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
 await page.render({canvasContext:canvas.getContext('2d',{alpha:false}),viewport}).promise;
 const x=438.903,w=96.746,h=64.5;
 let cropY=PDF_IMAGE_Y[q.id];
 if(cropY===undefined){
  if(pdfImageYByPage.has(q.page))cropY=pdfImageYByPage.get(q.page);
  else{cropY=detectPdfImageY(canvas,x,w,h,scale);pdfImageYByPage.set(q.page,cropY)}
 }
 if(cropY===null||cropY===undefined)return null;
 const crop=document.createElement('canvas');crop.width=Math.round(w*scale);crop.height=Math.round(h*scale);
 crop.getContext('2d',{alpha:false}).drawImage(canvas,Math.round(x*scale),Math.round(cropY*scale),crop.width,crop.height,0,0,crop.width,crop.height);
 return crop.toDataURL('image/jpeg',0.96);
}
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
  img.src=src;img.classList.remove('photo-loading');img.classList.add('loaded');img.setAttribute('role','button');img.setAttribute('tabindex','0');img.setAttribute('aria-label','ছবি বড় করে দেখুন');img.addEventListener('click',()=>openQuestionPhoto(img.src,img.alt));img.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openQuestionPhoto(img.src,img.alt)}});
 }).catch(err=>{
  console.error('PDF image crop failed',q.id,err);
  img.classList.remove('photo-loading');img.classList.add('photo-error');
  img.alt='PDF ছবি লোড হয়নি — পৃষ্ঠা '+bn(q.page); img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="320" height="90"><rect width="100%" height="100%" rx="12" fill="#eef3f8"/><text x="50%" y="42%" text-anchor="middle" font-size="16" fill="#40566d">PDF image unavailable</text><text x="50%" y="68%" text-anchor="middle" font-size="13" fill="#40566d">Page '+q.page+'</text></svg>');
 });
}
const fromBn = s => String(s).replace(/[০-৯]/g, d => '০১২৩৪৫৬৭৮৯'.indexOf(d));
function loadSeen(){try{return JSON.parse(localStorage.getItem('cca-seen')||'[]')}catch(e){return []}}
function loadVocabSeen(){try{return JSON.parse(localStorage.getItem('cca-vocab-seen')||'[]')}catch(e){return []}}
function showError(msg){const box=$('#questionlist');box.innerHTML='';const p=document.createElement('p');p.className='notice';p.textContent=msg;box.appendChild(p)}
async function loadJSON(url){const r=await fetch(url,{cache:'no-cache'});if(!r.ok)throw new Error(url+' '+r.status);return r.json()}
Promise.all(['./questions.json','./chapters.json','./vocab.json'].map(loadJSON)).then(([q,c,v])=>{questions=q;chapters=c;vocab=v;renderChapters();renderList();renderProgress();renderVocab();showQuiz();updateContinue();renderDashboard()}).catch(err=>{console.error(err);showError('ডেটা লোড হয়নি। ইন্টারনেট সংযোগ দেখে পেজটি আবার রিফ্রেশ করুন। ('+err.message+')')});
function chapterRange(c){const[a,b]=c.range.split('–').map(x=>+fromBn(x));return[a,b]}
function chapterFor(id){const i=chapters.findIndex(c=>{const[a,b]=chapterRange(c);return id>=a&&id<=b});return i<0?0:i}
function renderChapters(){
 const box=$('#chapters');box.innerHTML='';
 chapters.forEach((c,i)=>{
  const b=document.createElement('button');b.type='button';b.className='chapter'+(selectedChapter===i?' selected':'');b.setAttribute('aria-pressed',selectedChapter===i);
  const [start,end]=chapterRange(c),total=questions.filter(q=>q.id>=start&&q.id<=end).length,done=questions.filter(q=>q.id>=start&&q.id<=end&&seen.has(q.id)).length,pct=total?Math.round(done/total*100):0;
  const meta=document.createElement('span');meta.className='chapter-meta';
  const label=document.createElement('strong');label.textContent='অধ্যায় '+c.number;
  const range=document.createElement('span');range.className='chapter-range';range.textContent='প্রশ্ন '+c.range;meta.append(label,range);
  const title=document.createElement('span');title.className='ch-bn';title.textContent=c.bn;
  const pt=document.createElement('small');pt.textContent=c.pt;
  const progress=document.createElement('span');progress.className='chapter-progress-label';
  const progressText=document.createElement('span');progressText.textContent=done?bn(done)+' / '+bn(total)+' সম্পন্ন':'শুরু করা হয়নি';
  const progressPct=document.createElement('span');progressPct.textContent=bn(pct)+'%';progress.append(progressText,progressPct);
  const track=document.createElement('span');track.className='chapter-progress-track';
  const fill=document.createElement('span');fill.className='chapter-progress-fill';fill.style.width=pct+'%';track.appendChild(fill);
  const action=document.createElement('span');action.className='chapter-action';action.textContent=done?'চালিয়ে যান →':'শুরু করুন →';
  b.append(meta,title,pt,progress,track,action);
  b.onclick=()=>{selectedChapter=i;shown=PAGE_SIZE;renderChapters();renderList();$('#questionlist').scrollIntoView({behavior:'smooth',block:'start'})};
  box.appendChild(b);
 });
}
function filtered(){const q=$('#search').value.trim().toLowerCase();return questions.filter(x=>q?(x.raw.toLowerCase().includes(q)||String(x.id).includes(fromBn(q))):chapterFor(x.id)===selectedChapter)}
function renderList(){const box=$('#questionlist');box.innerHTML='';const query=$('#search').value.trim();if(!query&&selectedChapter<0){const prompt=document.createElement('div');prompt.className='chapter-prompt';const title=document.createElement('strong');title.textContent='শুরু করতে একটি অধ্যায় বেছে নিন';const note=document.createElement('p');note.textContent='অধ্যায়ের প্রশ্নগুলো এখানে দেখুন। যেকোনো শব্দ লিখে সব ৩০৭টি প্রশ্নেও খুঁজতে পারবেন।';prompt.append(title,note);box.appendChild(prompt);return}const list=filtered();const count=document.createElement('p');count.className='count';count.setAttribute('aria-live','polite');const visible=list.slice(0,shown);count.textContent=list.length?bn(list.length)+' টি প্রশ্নের মধ্যে '+bn(visible.length)+' টি দেখানো হচ্ছে':'কোনো প্রশ্ন পাওয়া যায়নি।';box.appendChild(count);visible.forEach(x=>box.appendChild(questionCard(x)));if(list.length>visible.length){const more=document.createElement('button');more.className='loadmore';more.textContent='আরও '+bn(Math.min(PAGE_SIZE,list.length-visible.length))+' টি প্রশ্ন দেখুন';more.onclick=()=>{shown+=PAGE_SIZE;renderList()};box.appendChild(more)}}

// Context-aware visual cards: every question gets a relevant learning illustration.
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
 const pt=(splitAt<0?stem:stem.slice(0,splitAt)).join(' ').replace(/\s+/g,' ').trim();
 const bnText=(splitAt<0?[]:stem.slice(splitAt)).join(' ').replace(/\s+/g,' ').trim();
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
  return {letter:o.letter,pt:(split<0?o.lines:o.lines.slice(0,split)).join(' ').replace(/\s+/g,' ').trim(),bn:(split<0?[]:o.lines.slice(split)).join(' ').replace(/\s+/g,' ').trim()};
 }).filter(o=>o.pt||o.bn);
 const explanation=lines.filter(line=>/^(কেন|মনে রাখুন)\s*:/.test(line)).map(line=>line.replace(/^(কেন|মনে রাখুন)\s*:\s*/,'').trim()).filter(Boolean);
 const correct=(String(x.answer||'').match(/^\s*([ABC])\s*[—–-]/)||[])[1]||((lines.join('\n').match(/সঠিক উত্তর\s*:\s*([ABC])/ )||[])[1]);
 return {pt,bn:bnText,options:parsedOptions,explanation,correct};
}
function makeQuestionBody(x,{onReveal}={}){
 const parsed=parseQuestion(x),body=document.createElement('div');body.className='question-body';
 const pt=document.createElement('div');pt.className='question-prompt';pt.textContent=parsed.pt||'প্রশ্নের লেখা পাওয়া যায়নি।';body.appendChild(pt);
 if(parsed.bn){const tr=document.createElement('div');tr.className='question-translation';const mark=document.createElement('span');mark.className='translation-mark';mark.textContent='文';const text=document.createElement('span');text.textContent=parsed.bn;tr.append(mark,text);body.appendChild(tr);}
 if(PDF_IMAGE_Y[x.id]!==undefined){
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
 const reveal=document.createElement('button');reveal.type='button';reveal.className='question-reveal';reveal.textContent='◉  উত্তর দেখুন  ⌄';
 const result=document.createElement('div');result.className='question-result';result.hidden=true;
 reveal.addEventListener('click',()=>{
  result.hidden=!result.hidden;reveal.setAttribute('aria-expanded',String(!result.hidden));
  if(!result.hidden){
   result.replaceChildren();
   const answer=document.createElement('p');answer.className='question-answer-text';answer.textContent=x.answer||'এই প্রশ্নের উত্তর পাওয়া যায়নি।';result.appendChild(answer);
   parsed.explanation.forEach(line=>{const p=document.createElement('p');p.className='question-explanation';p.textContent=line;result.appendChild(p)});
   if(parsed.correct){list.querySelectorAll('.question-option').forEach(el=>{const letter=el.querySelector('.option-letter')?.textContent;if(letter===parsed.correct)el.classList.add('correct');else if(letter===selected)el.classList.add('incorrect')});}
   if(onReveal)onReveal();
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
  if(target)target.scrollIntoView({behavior:'smooth',block:'start'});
 });
}
function questionCard(x){
 const el=document.createElement('article');el.className='qitem qitem-modern';el.id='question-card-'+x.id;
 const top=document.createElement('div');top.className='question-card-top';
 const h=document.createElement('h3');h.textContent='প্রশ্ন '+bn(x.id)+(seen.has(x.id)?' ✓':'');
 const meta=document.createElement('span');meta.className='question-page-meta';meta.textContent=x.page?'PDF · পৃষ্ঠা '+bn(x.page):'Category C';
 top.append(h,meta);
 const body=makeQuestionBody(x,{onReveal:()=>{seen.add(x.id);save();h.textContent='প্রশ্ন '+bn(x.id)+' ✓'}});
 const list=filtered(),index=list.findIndex(q=>q.id===x.id);
 const nav=document.createElement('nav');nav.className='question-card-nav';nav.setAttribute('aria-label','প্রশ্ন নেভিগেশন');
 const prev=document.createElement('button');prev.type='button';prev.className='question-card-prev';prev.disabled=index<=0;prev.innerHTML='<span aria-hidden="true">←</span><span>আগের প্রশ্ন</span>';
 prev.addEventListener('click',()=>{if(index>0)goToStudyQuestion(list[index-1].id)});
 const position=document.createElement('span');position.className='question-card-position';position.textContent=bn(index+1)+' / '+bn(list.length);
 const next=document.createElement('button');next.type='button';next.className='question-card-next';next.disabled=index<0||index>=list.length-1;next.innerHTML='<span>পরের প্রশ্ন</span><span aria-hidden="true">→</span>';
 next.addEventListener('click',()=>{if(index>=0&&index<list.length-1)goToStudyQuestion(list[index+1].id)});
 nav.append(prev,position,next);
 el.append(top,body,nav);return el;
}
$('#search').oninput=()=>{shown=PAGE_SIZE;renderList();const clear=$('#search-clear');if(clear)clear.hidden=!$('#search').value};
$('#search-clear')?.addEventListener('click',()=>{$('#search').value='';$('#search').dispatchEvent(new Event('input',{bubbles:true}));$('#search').focus()});
function showQuiz(){
 const q=questions[quizIndex];if(!q)return;
 $('#quizcount').textContent='প্রশ্ন '+bn(q.id)+' / '+bn(TOTAL);
 const host=$('#quiztext');host.replaceChildren();
 const card=makeQuestionBody(q,{onReveal:()=>{seen.add(q.id);try{localStorage.setItem(LAST_KEY,String(q.id))}catch(e){}save();updateContinue()}});
 card.classList.add('quiz-question-body');host.appendChild(card);
 $('#quizanswer').hidden=true;$('#quizanswer').textContent='';
 $('#reveal').hidden=true;
 $('#quizanswer').hidden=true;
}

/* Independent timed simulated exam */
const EXAM_SIZE=20,EXAM_SECONDS=1500;
let examQuestions=[],examIndex=0,examAnswers=new Map(),examFavourites=new Set(),examSeconds=EXAM_SECONDS,examTicker=null,examPaused=false,examShowBangla=false,examRunning=false;
const examEl=$('#exam-mode');
function examShuffle(items){const a=[...items];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function examStopClock(){if(examTicker){clearInterval(examTicker);examTicker=null}}
function examClockText(){return String(Math.floor(examSeconds/60)).padStart(2,'0')+':'+String(examSeconds%60).padStart(2,'0')}
function examUpdateClock(){$('#exam-timer').textContent=examClockText();$('#exam-timer').classList.toggle('urgent',examSeconds<=300);$('#exam-progress-fill').style.width=((examIndex+1)/EXAM_SIZE*100)+'%'}
function examStartClock(){examStopClock();examTicker=setInterval(()=>{if(examPaused||!examRunning)return;examSeconds=Math.max(0,examSeconds-1);examUpdateClock();if(examSeconds===0)examFinish(true)},1000)}
function examStart(){if(!questions.length)return;examQuestions=examShuffle(questions).slice(0,EXAM_SIZE);examIndex=0;examAnswers=new Map();examFavourites=new Set();examSeconds=EXAM_SECONDS;examPaused=false;examShowBangla=false;examRunning=true;$('#exam-pause-screen').hidden=true;$('#exam-result-screen').hidden=true;examEl.hidden=false;document.body.classList.add('exam-open');examRender();examStartClock();$('#exam-exit').focus()}
function examMakeOption(o){const b=document.createElement('button');b.type='button';b.className='exam-option';b.setAttribute('aria-pressed','false');const letter=document.createElement('span');letter.className='exam-option-letter';letter.textContent=o.letter;const copy=document.createElement('span');copy.className='exam-option-text';const pt=document.createElement('span');pt.className='exam-option-pt';pt.textContent=o.pt;copy.append(pt);if(examShowBangla&&o.bn){const bnText=document.createElement('span');bnText.className='exam-option-bn';bnText.textContent=o.bn;copy.append(bnText)}b.append(letter,copy);if(examAnswers.get(examIndex)===o.letter){b.classList.add('selected');b.setAttribute('aria-pressed','true')}b.addEventListener('click',()=>{examAnswers.set(examIndex,o.letter);examRender()});return b}
function examRender(){const q=examQuestions[examIndex];if(!q)return;const p=parseQuestion(q),host=$('#exam-question');host.replaceChildren();$('#exam-counter').textContent='QUESTION '+(examIndex+1)+' / '+EXAM_SIZE;$('#exam-answered').textContent=examAnswers.size+' ANSWERED';$('#exam-fav').firstChild.textContent=examFavourites.has(examIndex)?'★':'☆';$('#exam-fav').classList.toggle('is-favourite',examFavourites.has(examIndex));$('#exam-fav-state').textContent=examFavourites.has(examIndex)?'★ MARKED':'';
if(q.page){const wrap=document.createElement('div');wrap.className='exam-image-wrap';const img=document.createElement('img');img.className='exam-image';img.alt='PDF-এর আসল ছবি — প্রশ্ন '+bn(q.id);img.loading='eager';attachQuestionPhoto(q,img);wrap.append(img);host.append(wrap)}
const prompt=document.createElement('div');prompt.className='exam-prompt';prompt.textContent=p.pt||'Question text unavailable';host.append(prompt);if(examShowBangla&&p.bn){const tr=document.createElement('div');tr.className='exam-bangla';tr.textContent=p.bn;host.append(tr)}
const opts=document.createElement('div');opts.className='exam-options';p.options.forEach(o=>opts.append(examMakeOption(o)));host.append(opts);
$('#exam-bn-toggle').textContent=examShowBangla?'বাংলা সহায়তা লুকান ⌃':'বাংলা সহায়তা দেখুন ⌄';$('#exam-bn-toggle').setAttribute('aria-expanded',String(examShowBangla));$('#exam-prev').disabled=examIndex===0;$('#exam-next').disabled=examIndex===EXAM_SIZE-1;examUpdateClock()}
function examFinish(timeUp=false){if(!examRunning)return;examRunning=false;examPaused=false;examStopClock();let correct=0,wrong=0,skipped=0;examQuestions.forEach((q,i)=>{const key=parseQuestion(q).correct,ans=examAnswers.get(i);if(!ans)skipped++;else if(key&&ans===key)correct++;else wrong++});$('#exam-score').textContent=correct+' / '+EXAM_SIZE;$('#exam-correct').textContent=correct;$('#exam-wrong').textContent=wrong;$('#exam-skipped').textContent=skipped;const review=$('#exam-review');review.replaceChildren();const heading=document.createElement('h3');heading.textContent=timeUp?'সময় শেষ — ফলাফল':'উত্তর পর্যালোচনা';review.append(heading);if(wrong+skipped>0){const f=document.createElement('button');f.type='button';f.className='review-filter';f.setAttribute('aria-pressed','false');f.textContent='শুধু ভুল ও বাদ পড়া প্রশ্ন দেখুন';f.onclick=()=>{const on=f.getAttribute('aria-pressed')!=='true';f.setAttribute('aria-pressed',String(on));f.textContent=on?'সব প্রশ্ন দেখুন':'শুধু ভুল ও বাদ পড়া প্রশ্ন দেখুন';review.querySelectorAll('.exam-review-row.is-correct').forEach(r=>r.hidden=on)};review.append(f)}examQuestions.forEach((q,i)=>{const p=parseQuestion(q),row=document.createElement('div');row.className='exam-review-row '+(!examAnswers.get(i)?'is-skipped':(examAnswers.get(i)===p.correct?'is-correct':'is-wrong'));row.dataset.state=!examAnswers.get(i)?'skipped':(examAnswers.get(i)===p.correct?'correct':'wrong');const title=document.createElement('b');title.textContent='প্রশ্ন '+(i+1)+' · '+(examAnswers.get(i)||'—');const detail=document.createElement('span');detail.textContent='সঠিক উত্তর: '+(p.correct||'উত্তর অনুপলব্ধ');row.append(title,detail);review.append(row)});$('#exam-result-screen').hidden=false;$('#exam-pause-screen').hidden=true}
function examClose(){examRunning=false;examPaused=false;examStopClock();examEl.hidden=true;document.body.classList.remove('exam-open')}
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
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!examEl.hidden){if(!$('#exam-result-screen').hidden)examClose();else if(!$('#exam-pause-screen').hidden){examPaused=false;$('#exam-pause-screen').hidden=true}else if(confirm('পরীক্ষা বন্ধ করবেন?'))examClose()}});

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
  card.addEventListener('click',()=>{const index=chapters.indexOf(c);selectedChapter=index;shown=PAGE_SIZE;renderChapters();renderList();openTab('study');window.scrollTo({top:0,behavior:'smooth'})});
  card.tabIndex=0;card.setAttribute('role','button');card.setAttribute('aria-label','অধ্যায় '+c.number+' এর প্রশ্ন অনুশীলন করুন');
  host.appendChild(card);
 });
}
$('#reset').onclick=()=>{if(confirm('আপনার দেখা প্রশ্নের অগ্রগতি মুছে ফেলবেন?')){seen.clear();save();renderList();renderDashboard()}};function renderVocab(){const box=$('#vocabtext');if(!box)return;const s=$('#vsearch').value.trim().toLowerCase(),cat=$('#vcat').value,state=$('#vstate').value,select=$('#vcat');if(select.options.length===1){[...new Map(vocab.map(x=>[x.category,x.categoryName])).entries()].forEach(([id,name])=>{const o=document.createElement('option');o.value=id;o.textContent=name;select.appendChild(o)})}const result=vocab.filter(x=>(!s||(x.portuguese+' '+x.bengali+' '+x.explanation).toLowerCase().includes(s))&&(!cat||cat==='0'||String(x.category)===cat)&&(state==='all'||(state==='learned')===vocabSeen.has(x.id)));box.innerHTML='';result.forEach(x=>{const a=document.createElement('article');a.className='vocab-card';const meta=document.createElement('div');meta.className='vocab-meta';const c=document.createElement('span');c.textContent=x.categoryName;const p=document.createElement('span');p.textContent='বই · পৃষ্ঠা '+bn(x.page);meta.append(c,p);const h=document.createElement('h3');h.textContent=x.portuguese;const m=document.createElement('p');m.className='vocab-meaning';m.textContent=x.bengali;const d=document.createElement('p');d.className='vocab-explanation';d.textContent=x.explanation;const b=document.createElement('button');b.className='vocab-mark';b.setAttribute('aria-pressed',String(vocabSeen.has(x.id)));b.textContent=vocabSeen.has(x.id)?'✓ শিখেছি':'শিখেছি';b.onclick=()=>{vocabSeen.has(x.id)?vocabSeen.delete(x.id):vocabSeen.add(x.id);try{localStorage.setItem('cca-vocab-seen',JSON.stringify([...vocabSeen]))}catch(e){}renderVocab();renderDashboard()};a.append(meta,h,m,d,b);box.appendChild(a)});$('#vocabcount').textContent=result.length?bn(result.length)+'টি শব্দ · '+bn(vocab.length)+'টির মধ্যে':'কোনো শব্দ পাওয়া যায়নি।';$('#vocabdone').textContent=bn(vocabSeen.size)+' / '+bn(vocab.length);$('#vocabbar').style.width=(vocabSeen.size/vocab.length*100)+'%';$('#vocabbar').parentElement.setAttribute('aria-valuenow',vocabSeen.size)}
$('#vsearch').oninput=renderVocab;$('#vcat').onchange=renderVocab;$('#vstate').onchange=renderVocab;
const dlg=$('#bookdlg');let lastBookTrigger=null;function bookPageUrl(page){const file=new URL(BOOK,location.href);return file.href+'#page='+page}function openBookPage(x,trigger){$('#bookTitle').textContent='প্রশ্ন '+bn(x.id)+' · বইয়ের পৃষ্ঠা '+bn(x.page);const url=bookPageUrl(x.page);$('#bookframe').src=url;$('#bookopen').href=url;lastBookTrigger=trigger||document.activeElement;dlg.hidden=false;document.body.classList.add('book-open');$('#bookclose').focus()}function closeBookPage(){if(dlg.hidden)return;dlg.hidden=true;$('#bookframe').src='about:blank';document.body.classList.remove('book-open');if(lastBookTrigger&&lastBookTrigger.isConnected)lastBookTrigger.focus()}$('#bookclose').onclick=closeBookPage;dlg.hidden=true;document.body.classList.remove('book-open');$('#bookframe').src='about:blank';dlg.addEventListener('click',e=>{if(e.target===dlg)closeBookPage()});document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!dlg.hidden){e.preventDefault();closeBookPage()}});
document.querySelectorAll('.tab').forEach(b=>b.onclick=()=>{document.querySelectorAll('.tab').forEach(x=>{const on=x===b;x.classList.toggle('active',on);x.setAttribute('aria-selected',on)});document.querySelectorAll('.panel').forEach(p=>p.hidden=p.id!==b.dataset.tab)});
let promptInstall;window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();promptInstall=e;$('#install').hidden=false});$('#install').onclick=async()=>{if(promptInstall){promptInstall.prompt();promptInstall=null}};if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(e=>console.warn('SW',e)));function renderVocab(){const box=$('#vocabtext');if(!box)return;const s=$('#vsearch').value.trim().toLowerCase(),cat=$('#vcat').value,state=$('#vstate').value,select=$('#vcat');if(select.options.length===1){[...new Map(vocab.map(x=>[x.category,x.categoryName])).entries()].forEach(([id,name])=>{const o=document.createElement('option');o.value=id;o.textContent=name;select.appendChild(o)})}const result=vocab.filter(x=>(!s||(x.portuguese+' '+x.bengali+' '+x.explanation).toLowerCase().includes(s))&&(!cat||cat==='0'||String(x.category)===cat)&&(state==='all'||(state==='learned')===vocabSeen.has(x.id)));box.innerHTML='';result.forEach(x=>{const a=document.createElement('article');a.className='vocab-card';const meta=document.createElement('div');meta.className='vocab-meta';const c=document.createElement('span');c.textContent=x.categoryName;const p=document.createElement('span');p.textContent='বই · পৃষ্ঠা '+bn(x.page);meta.append(c,p);const h=document.createElement('h3');h.textContent=x.portuguese;const m=document.createElement('p');m.className='vocab-meaning';m.textContent=x.bengali;const d=document.createElement('p');d.className='vocab-explanation';d.textContent=x.explanation;const b=document.createElement('button');b.className='vocab-mark';b.setAttribute('aria-pressed',String(vocabSeen.has(x.id)));b.textContent=vocabSeen.has(x.id)?'✓ শিখেছি':'শিখেছি';b.onclick=()=>{vocabSeen.has(x.id)?vocabSeen.delete(x.id):vocabSeen.add(x.id);try{localStorage.setItem('cca-vocab-seen',JSON.stringify([...vocabSeen]))}catch(e){}renderVocab();renderDashboard()};a.append(meta,h,m,d,b);box.appendChild(a)});$('#vocabcount').textContent=result.length?bn(result.length)+'টি শব্দ · '+bn(vocab.length)+'টির মধ্যে':'কোনো শব্দ পাওয়া যায়নি।';$('#vocabdone').textContent=bn(vocabSeen.size)+' / '+bn(vocab.length);$('#vocabbar').style.width=(vocabSeen.size/vocab.length*100)+'%';$('#vocabbar').parentElement.setAttribute('aria-valuenow',vocabSeen.size)}
$('#vsearch').oninput=renderVocab;$('#vcat').onchange=renderVocab;$('#vstate').onchange=renderVocab;




function rememberQuizPosition(){const q=questions[quizIndex];if(q){try{localStorage.setItem(LAST_KEY,String(q.id))}catch(e){}updateContinue()}}
function updateContinue(){const el=$('#continue-text'),btn=$('#continue-btn');if(!el||!btn||!questions.length)return;let id=0;try{id=Number(localStorage.getItem(LAST_KEY)||0)}catch(e){}const q=questions.find(x=>x.id===id);if(q){el.textContent='শেষবার প্রশ্ন '+bn(q.id)+' পর্যন্ত পড়েছিলেন। সেখান থেকেই আবার শুরু করুন।';btn.textContent='চালিয়ে যান →'}else{el.textContent='প্রথম অধ্যায় থেকে শুরু করুন অথবা যেকোনো প্রশ্ন অনুশীলন করুন।';btn.textContent='শুরু করুন →'}renderDashboard()}
function renderDashboard(){
 if(!$('#home-stat-questions'))return;
 const totalQuestions=questions.length||TOTAL,totalVocab=vocab.length||133;
 const questionPct=Math.min(100,Math.round(seen.size/totalQuestions*100));
 const vocabPct=Math.min(100,Math.round(vocabSeen.size/totalVocab*100));
 $('#home-stat-questions').textContent=bn(totalQuestions);
 $('#home-stat-chapters').textContent=bn(chapters.length||8);
 $('#home-stat-vocab').textContent=bn(totalVocab);
 $('#home-seen').textContent=bn(seen.size);
 $('#home-vocab-seen').textContent=bn(vocabSeen.size)+' / '+bn(totalVocab);
 const ring=$('#home-question-ring');
 if(ring){ring.style.setProperty('--progress',questionPct+'%');ring.setAttribute('aria-valuenow',questionPct)}
 const percent=$('#home-question-percent');if(percent)percent.textContent=bn(questionPct)+'%';
 const bar=$('#home-progress-bar');if(bar){bar.style.width=questionPct+'%';bar.parentElement.setAttribute('aria-valuenow',seen.size)}
 const vocabBar=$('#home-vocab-bar');if(vocabBar){vocabBar.style.width=vocabPct+'%';vocabBar.parentElement.setAttribute('aria-valuenow',vocabSeen.size)}
}function openTab(tab){const b=document.querySelector('.tab[data-tab="'+tab+'"]');if(b)b.click()}
document.querySelectorAll('[data-open-tab]').forEach(b=>b.addEventListener('click',()=>{openTab(b.dataset.openTab);if(b.dataset.startExam==='true')setTimeout(()=>$('#start-exam')?.click(),0)}));
$('#continue-btn').addEventListener('click',()=>{let id=0;try{id=Number(localStorage.getItem(LAST_KEY)||0)}catch(e){}const i=questions.findIndex(x=>x.id===id);if(i>=0){quizIndex=i;showQuiz();rememberQuizPosition()}openTab('quiz');window.scrollTo({top:0,behavior:'smooth'})});
const originalShowQuiz=showQuiz;
showQuiz=function(){originalShowQuiz();const q=questions[quizIndex];const bar=$('#quiz-progress-bar');if(q&&bar)bar.style.width=(q.id/TOTAL*100)+'%'};function openTab(tab){const b=document.querySelector('.tab[data-tab="'+tab+'"]');if(b)b.click()}
