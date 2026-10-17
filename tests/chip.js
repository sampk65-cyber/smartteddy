const {chromium}=require('playwright');const http=require('http');
const srv=http.createServer(require('./srvh')).listen(8793);
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:375,height:740}});
 await p.goto('http://localhost:8793/');await p.waitForTimeout(1500);
 await p.evaluate(()=>{const e=new Event('beforeinstallprompt');e.prompt=()=>{window.__prompted=1};e.userChoice=Promise.resolve({outcome:'accepted'});window.dispatchEvent(e);});
 await p.waitForTimeout(4500);await p.screenshot({path:'chip.png'});
 await p.click('#teddyPwaChip button');console.log("prompted:",await p.evaluate(()=>window.__prompted), "chip gone:",await p.evaluate(()=>!document.getElementById('teddyPwaChip')));
 await b.close();srv.close();})();
