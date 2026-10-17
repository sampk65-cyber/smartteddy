const {chromium}=require('playwright');const http=require('http');
const srv=http.createServer(require('./srvh')).listen(8800);
(async()=>{const b=await chromium.launch();
 for(const q of ["","?app=family","?app=farm"]){
  const p=await b.newPage();p.on('pageerror',e=>console.log('PAGEERR',e.message));let sys="";
  await p.route('https://generativelanguage.googleapis.com/**',r=>{try{sys=JSON.parse(r.request().postData()).system_instruction.parts[0].text;}catch(_){}r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({candidates:[{content:{parts:[{text:"好"}]}}]})});});
  await p.goto('http://localhost:8800/'+q);await p.evaluate(()=>localStorage.setItem('ai_obs_keys',JSON.stringify({google:"g"})));await p.reload();await p.waitForTimeout(1800);
  const r=await p.evaluate(()=>{const pc=teddyPersonaCore();return{has:pc.includes("我的本事"),invest:pc.includes("【澎企理財】"),gh:pc.includes("【溫室模式】讀取"),len:pc.length,brief:teddyV31LocalCoreReply("你會什麼")};});
  console.log(q||"主人版","｜清單:",r.has,"理財:",r.invest,"溫室:",r.gh,"｜人格總長",r.len);
  console.log("  問「你會什麼」→\n  "+r.brief.replace(/\n/g,"\n  "));
  if(!q){await p.evaluate(()=>{document.getElementById('teddyChatInput').value="你有看到中間那排澎企理財嗎";document.getElementById('teddyChatSend').click();});await p.waitForTimeout(2500);
   console.log("  實際送給 Gemini 的設定含清單:",sys.includes("【我的本事"),"含截圖規則:",sys.includes("自己畫面的截圖"));
   const live=await p.evaluate(()=>{try{return typeof liveInstructions==="function"?liveInstructions():"(no fn)"}catch(e){return "ERR "+e.message}});
   console.log("  即時語音設定含清單:",String(live).includes("【我的本事"));}
  await p.close();}
 await b.close();srv.close();})();
