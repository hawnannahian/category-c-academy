const $ = s => document.querySelector(s);
const BOOK = './Category_C_Study_Guide_PT-BN_2026_FINAL_v4.pdf';
const PAGE_SIZE = 20;
const TOTAL = 307;
let questions = [], chapters = [], pages = [];
let selectedChapter = 0, quizIndex = 0, shown = PAGE_SIZE;
let seen = new Set(loadSeen());

const bn = n => String(n).replace(/[0-9]/g, d => '০১২৩৪৫৬৭৮৯'[+d]);
const fromBn = s => String(s).replace(/[০-৯]/g, d => '০১২৩৪৫৬৭৮৯'.indexOf(d));

function loadSeen() {
  try { return JSON.parse(localStorage.getItem('cca-seen') || '[]'); }
  catch (e) { return []; }
}

function showError(msg) {
  const box = $('#questionlist');
  box.innerHTML = '';
  const p = document.createElement('p');
  p.className = 'notice';
  p.textContent = msg;
  box.appendChild(p);
}

async function loadJSON(url) {
  const r = await fetch(url, { cache: 'no-cache' });
  if (!r.ok) throw new Error(url + ' ' + r.status);
  try { return await r.json(); }
  catch (e) { throw new Error(url + ' invalid JSON'); }
}

Promise.all(['./questions.json', './chapters.json', './book-text.json'].map(loadJSON))
  .then(([q, c, p]) => {
    questions = q; chapters = c; pages = p;
    renderChapters(); renderList(); renderProgress(); renderVocab(); showQuiz();
  })
  .catch(err => {
    console.error(err);
    showError('ডেটা লোড হয়নি। ইন্টারনেট সংযোগ দেখে পেজটি আবার রিফ্রেশ করুন। (' + err.message + ')');
  });

function chapterRange(c) {
  const [a, b] = c.range.split('–').map(x => +fromBn(x));
  return [a, b];
}

function chapterFor(id) {
  const i = chapters.findIndex(c => { const [a, b] = chapterRange(c); return id >= a && id <= b; });
  return i < 0 ? 0 : i;
}

function renderChapters() {
  const box = $('#chapters');
  box.innerHTML = '';
  chapters.forEach((c, i) => {
    const b = document.createElement('button');
    b.className = 'chapter' + (selectedChapter === i ? ' selected' : '');
    b.setAttribute('aria-pressed', selectedChapter === i);
    b.dataset.ch = i;
    b.innerHTML = '';
    const s = document.createElement('strong');
    s.textContent = `অধ্যায় ${c.number} · প্রশ্ন ${c.range}`;
    const t = document.createElement('span');
    t.className = 'ch-bn';
    t.textContent = c.bn;
    const sm = document.createElement('small');
    sm.textContent = c.pt;
    b.append(s, t, sm);
    b.onclick = () => { selectedChapter = i; shown = PAGE_SIZE; renderChapters(); renderList(); };
    box.appendChild(b);
  });
}

function filtered() {
  const q = $('#search').value.trim().toLowerCase();
  return questions.filter(x => {
    if (q) return x.raw.toLowerCase().includes(q) || String(x.id).includes(fromBn(q));
    return chapterFor(x.id) === selectedChapter;
  });
}

function renderList() {
  const list = filtered();
  const box = $('#questionlist');
  box.innerHTML = '';
  const count = document.createElement('p');
  count.className = 'count';
  count.setAttribute('aria-live', 'polite');
  const visible = list.slice(0, shown);
  count.textContent = list.length
    ? `${bn(list.length)} টি প্রশ্নের মধ্যে ${bn(visible.length)} টি দেখানো হচ্ছে`
    : 'কোনো প্রশ্ন পাওয়া যায়নি।';
  box.appendChild(count);

  visible.forEach(x => box.appendChild(questionCard(x)));

  if (list.length > visible.length) {
    const more = document.createElement('button');
    more.className = 'loadmore';
    more.textContent = `আরও ${bn(Math.min(PAGE_SIZE, list.length - visible.length))} টি প্রশ্ন দেখুন`;
    more.onclick = () => { shown += PAGE_SIZE; renderList(); };
    box.appendChild(more);
  }
}

function questionCard(x) {
  const el = document.createElement('article');
  el.className = 'qitem';
  const h = document.createElement('h3');
  h.textContent = `প্রশ্ন ${bn(x.id)}` + (seen.has(x.id) ? ' ✓' : '');
  const raw = document.createElement('div');
  raw.className = 'qraw';
  raw.textContent = x.raw;

  const actions = document.createElement('div');
  actions.className = 'qactions';
  const ans = document.createElement('button');
  ans.className = 'showanswer';
  ans.textContent = 'উত্তর দেখুন';
  ans.setAttribute('aria-expanded', 'false');
  const img = document.createElement('button');
  img.className = 'ghost';
  img.textContent = x.page ? `📖 বইয়ের পাতা দেখুন (পৃষ্ঠা ${bn(x.page)})` : 'বইয়ের পাতা পাওয়া যায়নি';
  img.disabled = !x.page;
  img.onclick = () => openBookPage(x, img);
  actions.append(ans, img);

  const a = document.createElement('div');
  a.className = 'answer';
  a.hidden = true;
  ans.onclick = () => {
    a.hidden = !a.hidden;
    ans.setAttribute('aria-expanded', String(!a.hidden));
    a.textContent = x.answer || 'এই প্রশ্নের উত্তর পাওয়া যায়নি।';
    if (!a.hidden) { seen.add(x.id); save(); h.textContent = `প্রশ্ন ${bn(x.id)} ✓`; }
  };
  el.append(h, raw, actions, a);
  return el;
}

$('#search').oninput = () => { shown = PAGE_SIZE; renderList(); };

function showQuiz() {
  const q = questions[quizIndex];
  if (!q) return;
  $('#quizcount').textContent = `প্রশ্ন ${bn(q.id)} / ${bn(TOTAL)}`;
  $('#quiztext').textContent = q.raw;
  $('#quizanswer').hidden = true;
  $('#quizanswer').textContent = q.answer || 'উত্তর পাওয়া যায়নি';
  $('#reveal').onclick = () => {
    $('#quizanswer').hidden = false;
    seen.add(q.id); save();
  };
}
$('#next').onclick = () => { quizIndex = (quizIndex + 1) % questions.length; showQuiz(); };
$('#prev').onclick = () => { quizIndex = (quizIndex - 1 + questions.length) % questions.length; showQuiz(); };

function save() {
  try { localStorage.setItem('cca-seen', JSON.stringify([...seen])); } catch (e) { /* storage full or blocked */ }
  renderProgress();
}

function renderProgress() {
  $('#donecount').textContent = bn(seen.size);
  $('#bar').style.width = Math.min(100, seen.size / TOTAL * 100) + '%';
  $('#bar').parentElement.setAttribute('aria-valuenow', seen.size);
}

$('#reset').onclick = () => {
  if (confirm('আপনার দেখা প্রশ্নের অগ্রগতি মুছে ফেলবেন?')) {
    seen.clear(); save(); renderList();
  }
};

function renderVocab() {
  const v = pages.filter(p => p.page >= 26 && p.page <= 35);
  const box = $('#vocabtext');
  box.innerHTML = '';
  v.forEach(p => {
    const art = document.createElement('article');
    art.className = 'vpage';
    const b = document.createElement('b');
    b.textContent = `বইয়ের পৃষ্ঠা ${bn(p.page)}`;
    const d = document.createElement('div');
    d.className = 'qraw';
    d.textContent = p.text;
    art.append(b, d);
    box.appendChild(art);
  });
}
$('#vsearch').oninput = () => {
  const q = $('#vsearch').value.trim().toLowerCase();
  [...$('#vocabtext').children].forEach(el => el.hidden = !el.textContent.toLowerCase().includes(q));
};

/* ---- book page viewer (modal) ---- */
const dlg = $('#bookdlg');
let lastBookTrigger = null;
function bookViewerUrl(page) {
  const file = new URL(BOOK, location.href).href;
  return `https://mozilla.github.io/pdf.js/web/viewer.html?file=${encodeURIComponent(file)}#page=${page}`;
}
function openBookPage(x, trigger) {
  $('#bookTitle').textContent = `প্রশ্ন ${bn(x.id)} · বইয়ের পৃষ্ঠা ${bn(x.page)}`;
  const url = bookViewerUrl(x.page);
  $('#bookframe').src = url;
  $('#bookopen').href = url;
  lastBookTrigger = trigger || document.activeElement;
  dlg.hidden = false;
  document.body.classList.add('book-open');
  $('#bookclose').focus();
}
function closeBookPage() {
  if (dlg.hidden) return;
  dlg.hidden = true;
  $('#bookframe').src = 'about:blank';
  document.body.classList.remove('book-open');
  if (lastBookTrigger && typeof lastBookTrigger.focus === 'function') lastBookTrigger.focus();
}
$('#bookclose').onclick = closeBookPage;
dlg.addEventListener('click', e => { if (e.target === dlg) closeBookPage(); });
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !dlg.hidden) { e.preventDefault(); closeBookPage(); }
});

/* ---- tabs ---- */
document.querySelectorAll('.tab').forEach(b => b.onclick = () => {
  document.querySelectorAll('.tab').forEach(x => {
    const on = x === b;
    x.classList.toggle('active', on);
    x.setAttribute('aria-selected', on);
  });
  document.querySelectorAll('.panel').forEach(p => p.hidden = p.id !== b.dataset.tab);
});

/* ---- install + service worker ---- */
let promptInstall;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); promptInstall = e; $('#install').hidden = false; });
$('#install').onclick = async () => { if (promptInstall) { promptInstall.prompt(); promptInstall = null; } };
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(e => console.warn('SW', e)));
}
