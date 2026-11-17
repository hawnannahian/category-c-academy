const CACHE='category-c-academy-v74';
const CORE=['./','./index.html','./app.css?v=66','./app.js?v=73','./manifest.webmanifest','./category-c-logo.jpg','./questions.json','./chapters.json','./vocab.json'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE.map(u=>new Request(u,{cache:'reload'})))).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
 if(e.request.method!=='GET') return;
 const url=new URL(e.request.url);
 // The 14 MB source PDF is opened on demand only; never cache/intercept it.
 if(url.pathname.toLowerCase().endsWith('.pdf')) return;
 e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).then(res=>{
  if(res.ok&&res.type==='basic'){const copy=res.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));}
  return res;
 }).catch(()=>e.request.mode==='navigate'?caches.match('./index.html'):Response.error())));
});
self.addEventListener('message',e=>{if(e.data==='SKIP_WAITING')self.skipWaiting();if(e.data==='VERSION'&&e.ports[0])e.ports[0].postMessage(CACHE)});
