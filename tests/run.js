// Run all browser tests: node tests/run.js [name ...]   (e.g. node tests/run.js photos)
const {chromium}=require('playwright');const {startServer,failures}=require('./helpers');
const ALL=['photos','exam-a11y','nav-pwa','wrong-answers','deep-links','old-page','auto-update','practice-fit','text-scaling'];
(async()=>{const pick=process.argv.slice(2);const srv=await startServer();const b=await chromium.launch();
 try{for(const n of (pick.length?pick:ALL)){console.log(`\n## ${n}`);await require(`./${n}.test.js`)(b)}}
 finally{await b.close();srv.close()}
 console.log(failures()?`\n${failures()} FAILED`:'\nALL PASSED');process.exit(failures()?1:0)})();
