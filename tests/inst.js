const {chromium}=require('playwright');const http=require('http');
const srv=http.createServer(require('./srvh')).listen(8792);
(async()=>{const b=await chromium.launch();const ctx=await b.newContext();const p=await ctx.newPage();
 for(const q of ["","?app=family"]){await p.goto('http://localhost:8792/'+q);await p.waitForTimeout(3000);
 const cdp=await ctx.newCDPSession(p);const r=await cdp.send('Page.getInstallabilityErrors');const m=await cdp.send('Page.getAppManifest');
 console.log(q||"/","installability errors:",JSON.stringify(r.installabilityErrors),"manifest errors:",JSON.stringify(m.errors));}
 await b.close();srv.close();})();
