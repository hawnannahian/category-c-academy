const {devices}=require('playwright');const {BASE,CACHE,VERSION,bn,ok}=require('./helpers');
const devs=[['iPhone 13',devices['iPhone 13']],['iPhone 13 landscape',devices['iPhone 13 landscape']],['iPad Pro 11',devices['iPad Pro 11']]];
module.exports=async b=>{const issues={};
for(const [name,dev] of devs)for(const root of [17,20,23,28,40]){
 const ctx=await b.newContext({...dev,deviceScaleFactor:1});const p=await ctx.newPage();
 await p.addInitScript(()=>{Math.random=()=>0.42});await p.goto(BASE,{waitUntil:'networkidle'});
 await p.addStyleTag({content:`html{font-size:${root}px!important}`});
 const check=async s=>{await p.waitForTimeout(150);const r=await p.evaluate(()=>{const out=[];const vw=innerWidth;
  if(document.documentElement.scrollWidth>vw+1)out.push('PAGE hscroll '+document.documentElement.scrollWidth);
  for(const e of document.querySelectorAll('body *')){if(!e.getClientRects().length||e.closest('svg'))continue;const c=getComputedStyle(e);const r=e.getBoundingClientRect();
   const name=(e.id?'#'+e.id:'')+(typeof e.className==='string'&&e.className?'.'+e.className.split(' ')[0]:'')||e.tagName;
   if(r.right>vw+1&&c.position!=='fixed')out.push('OFFSCREEN '+name);
   if(c.overflow!=='visible'&&e.scrollWidth>e.clientWidth+1&&!['auto','scroll'].includes(c.overflowX)&&e.innerText&&e.innerText.trim())out.push('CLIPPED-X '+name);
   if(c.overflowY==='hidden'&&e.scrollHeight>e.clientHeight+2&&e.innerText&&e.innerText.trim()&&!e.matches('.sr-only'))out.push('CLIPPED-Y '+name);
   if(e.matches('button,a[href],[role=button],[role=tab],input,select')&&c.visibility!=='hidden'&&r.height<43.5&&!e.closest('.question-photo'))out.push('SMALL '+name+' '+Math.round(r.height));}
  return [...new Set(out)]});for(const x of r)(issues[x+' ['+s+']']??=new Set()).add(name+'@'+root)};
 await check('home');for(const t of ['study','quiz','vocab','progress']){await p.evaluate(t=>openTab(t),t);await check(t)}
 await p.evaluate(()=>openTab('study'));await p.locator('.chapter').first().click();await check('chapter');
 await p.evaluate(()=>openTab('quiz'));await p.click('#start-exam');await p.evaluate(()=>examStopClock());await check('exam');
 await p.keyboard.press('Escape').catch(()=>{});await ctx.close()}
// Intended: the exam title truncates with an ellipsis (its <b>/<em> children are clipped inside it).
const ALLOWED=/^(CLIPPED-X \.exam-brand|OFFSCREEN (B|EM) )\b/;
const bad=Object.entries(issues).filter(([k])=>!ALLOWED.test(k)).sort();
for(const [k,v] of bad)console.log('  ',k,'::',[...v].join(' '));
ok(bad.length===0,'text scaling 17–40px on 3 layouts: '+bad.length+' layout issues');};
