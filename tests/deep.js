const {chromium}=require('playwright');const http=require('http'),fs=require('fs');
const srv=http.createServer(require('./srvh')).listen(8790);
(async()=>{const b=await chromium.launch();const p=await b.newPage();p.on('pageerror',e=>console.log('PAGEERR',e.message));
const calls=[];
await p.route('https://api.openai.com/**',async r=>{const bd=JSON.parse(r.request().postData()||'{}');calls.push('openai:'+bd.model);await r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({output_text:'重點：測試。',usage:{input_tokens:1000,output_tokens:500}})});});
await p.route('https://api.anthropic.com/**',async r=>{const bd=JSON.parse(r.request().postData()||'{}');calls.push('claude:'+bd.model+':'+bd.max_tokens);await r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({content:[{type:'text',text:'重點：測試。'}],usage:{input_tokens:1000,output_tokens:500}})});});
await p.route('**/api/stock**',r=>r.fulfill({status:200,contentType:'application/json',body:'{"ok":true,"data":[],"quotes":[]}'}));
await p.goto('http://localhost:8790/');await p.waitForTimeout(1200);
for(const [keys,eng] of [[{openai:'x'},'auto'],[{openai:'x',anthropic:'y'},'auto'],[{openai:'x',anthropic:'y'},'claude-opus'],[{openai:'x',anthropic:'y'},'astra'],[{openai:'x'},'claude-sonnet']]){
 await p.evaluate(([k,e])=>{localStorage.setItem('ai_obs_keys',JSON.stringify(k));localStorage.setItem('teddy_deep_engine_v1',e);},[keys,eng]);
 const c=await p.evaluate(()=>window.teddyDeepChoice());
 calls.length=0; await p.evaluate(()=>window.teddyDeepAsk('sys','q'));
 console.log(JSON.stringify(keys),eng,'→',c.label,calls.join());
}
// full chat path with claude
await p.evaluate(()=>{localStorage.setItem('ai_obs_keys',JSON.stringify({openai:'x',anthropic:'y'}));localStorage.setItem('teddy_deep_engine_v1','auto');const el=document.getElementById('teddyPanel');el.classList.add('open');});
calls.length=0;await p.fill('#teddyChatInput','幫我分析一下台灣半導體產業的策略');await p.click('#teddyChatSend');await p.waitForTimeout(3000);
console.log('chat deep:',calls.join());
console.log('summary:',await p.evaluate(()=>document.getElementById('teddyAstraUsageSummary')?.textContent));
await b.close();srv.close();})();
