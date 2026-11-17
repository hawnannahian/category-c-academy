// Shared helpers for the browser tests. Needs a locally installed Playwright (no package.json on purpose).
const http=require('http'),fs=require('fs'),path=require('path');
const ROOT=path.join(__dirname,'..');
const PORT=Number(process.env.PORT||8765);
const BASE=`http://localhost:${PORT}/`;
const CACHE=fs.readFileSync(path.join(ROOT,'sw.js'),'utf8').match(/const CACHE='([^']+)'/)[1];
const VERSION=CACHE.match(/v(\d+)$/)[1];
const bn=n=>String(n).replace(/[0-9]/g,d=>'০১২৩৪৫৬৭৮৯'[+d]);
const TYPES={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.pdf':'application/pdf'};
// Tests can serve a different body for a path (e.g. a newer sw.js) without touching the files on disk.
const overrides=new Map();
function startServer(){return new Promise(res=>{const srv=http.createServer((req,out)=>{let p=decodeURIComponent(new URL(req.url,BASE).pathname);if(p.endsWith('/'))p+='index.html';
 if(overrides.has(p)){out.writeHead(200,{'Content-Type':TYPES[path.extname(p)]||'text/plain'});return out.end(overrides.get(p))}
 const f=path.join(ROOT,p);if(!f.startsWith(ROOT)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){out.writeHead(404);return out.end()}
 out.writeHead(200,{'Content-Type':TYPES[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(out)});srv.listen(PORT,()=>res(srv))})}
let failures=0;
const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)failures++};
module.exports={BASE,CACHE,VERSION,bn,startServer,ok,overrides,failures:()=>failures};
