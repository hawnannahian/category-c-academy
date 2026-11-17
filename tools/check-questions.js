// Data/parser self-check: node tools/check-questions.js (run from repo root)
const fs=require('fs'),assert=require('assert');
const src=fs.readFileSync('app.js','utf8');
const start=src.indexOf('const HYPHEN_BREAK=');
const fn=src.slice(start,src.indexOf('\nfunction makeQuestionBody('));
const parseQuestion=new Function(fn+';return parseQuestion')();
const qs=JSON.parse(fs.readFileSync('questions.json','utf8'));
assert.strictEqual(qs.length,307,'question count');
qs.forEach((q,i)=>{assert.strictEqual(q.id,i+1,'contiguous ids');const p=parseQuestion(q);const letters=p.options.map(o=>o.letter);
 assert(letters.length>=2&&letters.length<=3,`q${q.id}: ${letters.length} options`);assert(letters.includes(p.correct),`q${q.id}: correct ${p.correct} not in ${letters}`);
 // a word split across PDF lines ("designa-\nse") must not render as "designa- se"
 for(const t of [p.pt,p.bn,...p.options.flatMap(o=>[o.pt,o.bn])])assert(!/\p{L}- \p{Ll}/u.test(t),`q${q.id}: broken hyphenation in "${t}"`)});
for(const q of qs)assert(fs.existsSync(`photos/q${q.id}.jpg`),`missing photos/q${q.id}.jpg`);
console.log('OK: 307 questions parse with valid answers; 307 photos present');
