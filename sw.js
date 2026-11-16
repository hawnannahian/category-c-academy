const CACHE='category-c-academy-v25';
const CORE=['./','./index.html','./styles.css','./app.js','./manifest.webmanifest','./icon.svg','./questions.json','./chapters.json','./book-text.json','./vocab.json'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
 if(e.request.method!=='GET') return;
 const url=new URL(e.request.url);
 // PDF.js needs native Range requests; never cache/intercept the source PDF or its CDN worker.
 if(url.pathname.toLowerCase().endsWith('.pdf')||url.hostname==='cdnjs.cloudflare.com') return;
 e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).then(res=>{
  if(res.ok&&res.type==='basic'){const copy=res.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));}
  return res;
 }).catch(()=>caches.match('./index.html'))));
});