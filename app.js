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
async function questionPhotoData(q){
 const y=PDF_IMAGE_Y[q.id];
 if(y===undefined) return null;
 const pdf=await ensurePdfDocument();
 const page=await pdf.getPage(q.page);
 const scale=3.5, viewport=page.getViewport({scale});
 const canvas=document.createElement('canvas');
 canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
 await page.render({canvasContext:canvas.getContext('2d',{alpha:false}),viewport}).promise;
 const x=438.903, w=96.746, h=64.5;
 const crop=document.createElement('canvas');
 crop.width=Math.round(w*scale);crop.height=Math.round(h*scale);
 crop.getContext('2d',{alpha:false}).drawImage(canvas,Math.round(x*scale),Math.round(y*scale),Math.round(w*scale),Math.round(h*scale),0,0,crop.width,crop.height);
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
