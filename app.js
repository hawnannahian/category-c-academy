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
  pdfDocumentPromise=pdfjsLib.getDocument({url:BOOK}).promise;
 }
 return pdfDocumentPromise;
}
async function questionPhotoData(q){
 const pdf=await ensurePdfDocument();
 if(!pdfPageCanvasCache.has(q.page)){
  if(pdfPageCanvasCache.size>=6) pdfPageCanvasCache.delete(pdfPageCanvasCache.keys().next().value);
  pdfPageCanvasCache.set(q.page,(async()=>{
   const page=await pdf.getPage(q.page);
   const scale=1.5, viewport=page.getViewport({scale});
   const canvas=document.createElement('canvas');canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
   const ctx=canvas.getContext('2d',{alpha:false});
   await page.render({canvasContext:ctx,viewport}).promise;
   const text=await page.getTextContent();
   return {canvas,items:text.items,scale,viewport};
  })());
 }
 const data=await pdfPageCanvasCache.get(q.page);
 const wanted='প্রশ্ন'+bn(q.id);
 let item=data.items.find(x=>x.transform&&x.transform[4]<120&&String(x.str||'').replace(/\s+/g,'').includes(wanted));
 if(!item){
  const ascii=String(q.id);
  item=data.items.find(x=>x.transform&&x.transform[4]<120&&String(x.str||'').replace(/\\s+/g,'').includes('প্রশ্ন'+ascii));
 }
 if(!item){
  for(let i=0;i<data.items.length;i++){
   const current=String(data.items[i].str||'').replace(/\\s+/g,'');
   const next=String(data.items[i+1]?.str||'').replace(/\\s+/g,'');
   if(data.items[i].transform&&data.items[i].transform[4]<120&&current==='প্রশ্ন'&&(next===bn(q.id)||next===String(q.id))){item=data.items[i];break}
  }
 }
 if(!item) throw new Error('Question heading not found on PDF page '+q.page);
 const scale=data.scale;
 const top=data.viewport.height-(item.transform[5]*scale)-(item.height*scale);
 const x=Math.round(438.9*scale), y=Math.round(top+19.5*scale);
 const w=Math.round(96.7*scale), h=Math.round(63.7*scale);
 const crop=document.createElement('canvas');crop.width=w*2;crop.height=h*2;
 crop.getContext('2d').drawImage(data.canvas,x,y,w,h,0,0,crop.width,crop.height);
 return crop.toDataURL('image/webp',0.88);
}
async function pdfPageFallback(q){
 const pdf=await ensurePdfDocument();
 const page=await pdf.getPage(q.page);
 const viewport=page.getViewport({scale:1});
 const canvas=document.createElement('canvas');
 canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
 await page.render({canvasContext:canvas.getContext('2d',{alpha:false}),viewport}).promise;
 return canvas.toDataURL('image/jpeg',0.82);
}
function attachQuestionPhoto(q,img){
 questionPhotoData(q).then(src=>{img.src=src;img.classList.add('loaded')}).catch(async err=>{
  console.warn('PDF photo crop unavailable for question',q.id,err);
  try{img.src=await pdfPageFallback(q);img.classList.add('loaded','page-fallback');img.alt='প্রশ্ন '+bn(q.id)+'-এর মূল PDF পৃষ্ঠা '+bn(q.page)+' — আসল পৃষ্ঠা থেকে';}
  catch(fallbackError){console.error('PDF page image unavailable',q.id,fallbackError);img.classList.add('photo-error');img.alt='PDF-এর ছবি লোড করা যায়নি — পৃষ্ঠা '+bn(q.page);}
 });
}

const fromBn = s => String(s).replace(/[০-৯]/g, d => '০১২৩৪৫৬৭৮৯'.indexOf(d));
function loadSeen(){try{return JSON.parse(localStorage.getItem('cca-seen')||'[]')}catch(e){return []}}
function loadVocabSeen(){try{return JSON.parse(localStorage.getItem('cca-vocab-seen')||'[]')}catch(e){return []}}
function showError(msg){const box=$('#questionlist');box.innerHTML='';const p=document.createElement('p');p.className='notice';p.textContent=msg;box.appendChild(p)}
async function loadJSON(url){const r=await fetch(url,{cache:'no-cache'});if(!r.ok)throw new Error(url+' '+r.status);return r.json()}
Promise.all(['./questions.json','./chapters.json','./vocab.json'].map(loadJSON)).then(([q,c,v])=>{questions=q;chapters=c;vocab=v;renderChapters();renderList();renderProgress();renderVocab();showQuiz();updateContinue()}).catch(err=>{console.error(err);showError('ডেটা লোড হয়নি। ইন্টারনেট সংযোগ দেখে পেজটি আবার রিফ্রেশ করুন। ('+err.message+')')});
function chapterRange(c){const[a,b]=c.range.split('–').map(x=>+fromBn(x));return[a,b]}
function chapterFor(id){const i=chapters.findIndex(c=>{const[a,b]=chapterRange(c);return id>=a&&id<=b});return i<0?0:i}
function renderChapters(){const box=$('#chapters');box.innerHTML='';chapters.forEach((c,i)=>{const b=document.createElement('button');b.className='chapter'+(selectedChapter===i?' selected':'');b.setAttribute('aria-pressed',selectedChapter===i);const s=document.createElement('strong');s.textContent='অধ্যায় '+c.number+' · প্রশ্ন '+c.range;const t=document.createElement('span');t.className='ch-bn';t.textContent=c.bn;const sm=document.createElement('small');sm.textContent=c.pt;b.append(s,t,sm);b.onclick=()=>{selectedChapter=i;shown=PAGE_SIZE;renderChapters();renderList();$('#questionlist').scrollIntoView({behavior:'smooth',block:'start'})};box.appendChild(b)})}
function filtered(){const q=$('#search').value.trim().toLowerCase();return questions.filter(x=>q?(x.raw.toLowerCase().includes(q)||String(x.id).includes(fromBn(q))):chapterFor(x.id)===selectedChapter)}
function renderList(){const box=$('#questionlist');box.innerHTML='';const query=$('#search').value.trim();if(!query&&selectedChapter<0){const prompt=document.createElement('div');prompt.className='chapter-prompt';const title=document.createElement('strong');title.textContent='শুরু করতে একটি অধ্যায় বেছে নিন';const note=document.createElement('p');note.textContent='অধ্যায়ের প্রশ্নগুলো এখানে দেখুন। যেকোনো শব্দ লিখে সব ৩০৭টি প্রশ্নেও খুঁজতে পারবেন।';prompt.append(title,note);box.appendChild(prompt);return}const list=filtered();const count=document.createElement('p');count.className='count';count.setAttribute('aria-live','polite');const visible=list.slice(0,shown);count.textContent=list.length?bn(list.length)+' টি প্রশ্নের মধ্যে '+bn(visible.length)+' টি দেখানো হচ্ছে':'কোনো প্রশ্ন পাওয়া যায়নি।';box.appendChild(count);visible.forEach(x=>box.appendChild(questionCard(x)));if(list.length>visible.length){const more=document.createElement('button');more.className='loadmore';more.textContent='আরও '+bn(Math.min(PAGE_SIZE,list.length-visible.length))+' টি প্রশ্ন দেখুন';more.onclick=()=>{shown+=PAGE_SIZE;renderList()};box.appendChild(more)}}

// Context-aware visual cards: every question gets a relevant learning illustration.
function questionCard(x){const el=document.createElement('article');el.className='qitem';const h=document.createElement('h3');h.textContent='প্রশ্ন '+bn(x.id)+(seen.has(x.id)?' ✓':'');const photo=document.createElement('img');photo.className='question-photo';photo.alt='PDF-এর আসল ছবি — প্রশ্ন '+bn(x.id);photo.loading='lazy';attachQuestionPhoto(x,photo);const content=document.createElement('div');content.className='qcontent';const sourceLines=String(x.raw||'').split('\\n');const answerStart=sourceLines.findIndex(line=>/^সঠিক উত্তর\\s*:/.test(line.trim()));const questionLines=(answerStart<0?sourceLines:sourceLines.slice(0,answerStart)).filter(line=>!/^প্রশ্ন\\s*[০-৯0-9]+$/.test(line.trim()));questionLines.forEach(line=>{if(!line.trim()){const gap=document.createElement('div');gap.className='qline-spacer';content.appendChild(gap);return}const row=document.createElement('div');row.className='qline '+(/[\\u0980-\\u09FF]/.test(line)?'qbn':'qpt');row.textContent=line;content.appendChild(row)});const actions=document.createElement('div');actions.className='qactions';const ans=document.createElement('button');ans.className='showanswer';ans.textContent='উত্তর দেখুন';ans.setAttribute('aria-expanded','false');const book=document.createElement('button');book.className='ghost';book.textContent=x.page?'📖 বইয়ের পাতা দেখুন (পৃষ্ঠা '+bn(x.page)+')':'বইয়ের পাতা পাওয়া যায়নি';book.disabled=!x.page;book.onclick=()=>openBookPage(x,book);actions.append(ans,book);const answer=document.createElement('div');answer.className='answer';answer.hidden=true;ans.onclick=()=>{answer.hidden=!answer.hidden;ans.setAttribute('aria-expanded',String(!answer.hidden));answer.textContent=x.answer||'এই প্রশ্নের উত্তর পাওয়া যায়নি।';if(!answer.hidden){seen.add(x.id);save();h.textContent='প্রশ্ন '+bn(x.id)+' ✓'}};el.append(h,photo,content,actions,answer);return el}
$('#search').oninput=()=>{shown=PAGE_SIZE;renderList()};
function showQuiz(){const q=questions[quizIndex];if(!q)return;$('#quizcount').textContent='প্রশ্ন '+bn(q.id)+' / '+bn(TOTAL);let quizPhoto=$('#quizphoto');if(!quizPhoto){quizPhoto=document.createElement('img');quizPhoto.id='quizphoto';quizPhoto.className='question-photo quiz-photo';quizPhoto.alt='PDF-এর আসল ছবি';$('#quiztext').before(quizPhoto)}quizPhoto.hidden=false;quizPhoto.alt='PDF-এর আসল ছবি — প্রশ্ন '+bn(q.id);quizPhoto.removeAttribute('src');attachQuestionPhoto(q,quizPhoto);$('#quiztext').textContent=q.raw;$('#quizanswer').hidden=true;$('#quizanswer').textContent=q.answer||'উত্তর পাওয়া যায়নি';$('#reveal').onclick=()=>{$('#quizanswer').hidden=false;seen.add(q.id);try{localStorage.setItem(LAST_KEY,String(q.id))}catch(e){}save();updateContinue()}}
$('#next').onclick=()=>{quizIndex=(quizIndex+1)%questions.length;showQuiz();rememberQuizPosition()};$('#prev').onclick=()=>{quizIndex=(quizIndex-1+questions.length)%questions.length;showQuiz();rememberQuizPosition()};
function save(){try{localStorage.setItem('cca-seen',JSON.stringify([...seen]))}catch(e){}renderProgress()}
function renderProgress(){$('#donecount').textContent=bn(seen.size);$('#bar').style.width=Math.min(100,seen.size/TOTAL*100)+'%';$('#bar').parentElement.setAttribute('aria-valuenow',seen.size)}
$('#reset').onclick=()=>{if(confirm('আপনার দেখা প্রশ্নের অগ্রগতি মুছে ফেলবেন?')){seen.clear();save();renderList()}};
function renderVocab(){const box=$('#vocabtext');if(!box)return;const s=$('#vsearch').value.trim().toLowerCase(),cat=$('#vcat').value,state=$('#vstate').value,select=$('#vcat');if(select.options.length===1){[...new Map(vocab.map(x=>[x.category,x.categoryName])).entries()].forEach(([id,name])=>{const o=document.createElement('option');o.value=id;o.textContent=name;select.appendChild(o)})}const result=vocab.filter(x=>(!s||(x.portuguese+' '+x.bengali+' '+x.explanation).toLowerCase().includes(s))&&(!cat||String(x.category)===cat)&&(state==='all'||(state==='learned')===vocabSeen.has(x.id)));box.innerHTML='';result.forEach(x=>{const a=document.createElement('article');a.className='vocab-card';const meta=document.createElement('div');meta.className='vocab-meta';const c=document.createElement('span');c.textContent=x.categoryName;const p=document.createElement('span');p.textContent='বই · পৃষ্ঠা '+bn(x.page);meta.append(c,p);const h=document.createElement('h3');h.textContent=x.portuguese;const m=document.createElement('p');m.className='vocab-meaning';m.textContent=x.bengali;const d=document.createElement('p');d.className='vocab-explanation';d.textContent=x.explanation;const b=document.createElement('button');b.className='vocab-mark';b.setAttribute('aria-pressed',String(vocabSeen.has(x.id)));b.textContent=vocabSeen.has(x.id)?'✓ শিখেছি':'শিখেছি';b.onclick=()=>{vocabSeen.has(x.id)?vocabSeen.delete(x.id):vocabSeen.add(x.id);try{localStorage.setItem('cca-vocab-seen',JSON.stringify([...vocabSeen]))}catch(e){}renderVocab()};a.append(meta,h,m,d,b);box.appendChild(a)});$('#vocabcount').textContent=result.length?bn(result.length)+'টি শব্দ · '+bn(vocab.length)+'টির মধ্যে':'কোনো শব্দ পাওয়া যায়নি।';$('#vocabdone').textContent=bn(vocabSeen.size)+' / '+bn(vocab.length);$('#vocabbar').style.width=(vocabSeen.size/vocab.length*100)+'%';$('#vocabbar').parentElement.setAttribute('aria-valuenow',vocabSeen.size)}
$('#vsearch').oninput=renderVocab;$('#vcat').onchange=renderVocab;$('#vstate').onchange=renderVocab;
const dlg=$('#bookdlg');let lastBookTrigger=null;function bookPageUrl(page){const file=new URL(BOOK,location.href);return file.href+'#page='+page}function openBookPage(x,trigger){$('#bookTitle').textContent='প্রশ্ন '+bn(x.id)+' · বইয়ের পৃষ্ঠা '+bn(x.page);const url=bookPageUrl(x.page);$('#bookframe').src=url;$('#bookopen').href=url;lastBookTrigger=trigger||document.activeElement;dlg.hidden=false;document.body.classList.add('book-open');$('#bookclose').focus()}function closeBookPage(){if(dlg.hidden)return;dlg.hidden=true;$('#bookframe').src='about:blank';document.body.classList.remove('book-open');if(lastBookTrigger&&lastBookTrigger.isConnected)lastBookTrigger.focus()}$('#bookclose').onclick=closeBookPage;dlg.hidden=true;document.body.classList.remove('book-open');$('#bookframe').src='about:blank';dlg.addEventListener('click',e=>{if(e.target===dlg)closeBookPage()});document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!dlg.hidden){e.preventDefault();closeBookPage()}});
document.querySelectorAll('.tab').forEach(b=>b.onclick=()=>{document.querySelectorAll('.tab').forEach(x=>{const on=x===b;x.classList.toggle('active',on);x.setAttribute('aria-selected',on)});document.querySelectorAll('.panel').forEach(p=>p.hidden=p.id!==b.dataset.tab)});
let promptInstall;window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();promptInstall=e;$('#install').hidden=false});$('#install').onclick=async()=>{if(promptInstall){promptInstall.prompt();promptInstall=null}};if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(e=>console.warn('SW',e)));




function rememberQuizPosition(){const q=questions[quizIndex];if(q){try{localStorage.setItem(LAST_KEY,String(q.id))}catch(e){}updateContinue()}}
function updateContinue(){const el=$('#continue-text'),btn=$('#continue-btn');if(!el||!btn||!questions.length)return;let id=0;try{id=Number(localStorage.getItem(LAST_KEY)||0)}catch(e){}const q=questions.find(x=>x.id===id);if(q){el.textContent='শেষবার প্রশ্ন '+bn(q.id)+' পর্যন্ত পড়েছিলেন। সেখান থেকেই আবার শুরু করুন।';btn.textContent='চালিয়ে যান →'}else{el.textContent='প্রথম অধ্যায় থেকে শুরু করুন অথবা যেকোনো প্রশ্ন অনুশীলন করুন।';btn.textContent='শুরু করুন →'}}
function openTab(tab){const b=document.querySelector('.tab[data-tab="'+tab+'"]');if(b)b.click()}
document.querySelectorAll('[data-open-tab]').forEach(b=>b.addEventListener('click',()=>openTab(b.dataset.openTab)));
$('#continue-btn').addEventListener('click',()=>{let id=0;try{id=Number(localStorage.getItem(LAST_KEY)||0)}catch(e){}const i=questions.findIndex(x=>x.id===id);if(i>=0){quizIndex=i;showQuiz();rememberQuizPosition()}openTab('quiz');window.scrollTo({top:0,behavior:'smooth'})});
const originalShowQuiz=showQuiz;
showQuiz=function(){originalShowQuiz();const q=questions[quizIndex];const bar=$('#quiz-progress-bar');if(q&&bar)bar.style.width=(q.id/TOTAL*100)+'%'};
