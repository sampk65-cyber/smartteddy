const {chromium}=require('playwright');const http=require('http'),fs=require('fs');
const srv=http.createServer(require('./srvh')).listen(8765);
const names=["合庫金","玉山金","兆豐金","華南金","第一金","彰銀","富邦金","國泰金","富邦越南","台新新光金","奇鋐","雙鴻","健策","台達電","建準","佳能","鴻海","廣達","昇達科","華通","啟碁","穩懋","世芯-KY","聯發科","創意","材料*-KY","台積電","統一","統一證","統一超","元大台灣50"];
const info=names.map((n,i)=>({stock_id:n==="台積電"?"2330":n==="穩懋"?"3105":n==="台新新光金"?"2887":n==="元大台灣50"?"0050":String(4000+i),stock_name:n,type:["穩懋","昇達科","世芯-KY"].includes(n)?"tpex":"twse",industry_category:"半導體業"}));
const codeOf=n=>info.find(x=>x.stock_name===n).stock_id;
let calls={};
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:412,height:880},deviceScaleFactor:2});
p.on('pageerror',e=>console.log('PAGEERR',e.message));
await p.route('**/api/stock**',async route=>{const u=new URL(route.request().url());const t=u.searchParams.get('type');const ds=u.searchParams.get('dataset');calls[ds||t]=(calls[ds||t]||0)+1;let body;
 if(t==='rt'){const ex=u.searchParams.get('ex').split('|');body={ok:true,at:new Date().toISOString(),quotes:ex.map(e=>{const c=e.split('_')[1].replace('.tw','');const base=c==='3105'?557:c==='2330'?2490:50;const px=c==='3105'?507:c==='2330'?2440:(c==='0050'?50:base*1.02);return{code:c,price:px,prev:base,open:base,high:Math.max(px,base),low:Math.min(px,base),vol:12345,limitUp:+(base*1.1).toFixed(2),limitDown:+(base*0.9).toFixed(2),time:"12:31:05",date:"20261015",src:"TWSE MIS"}})};}
 else if(ds==='TaiwanStockInfo')body={ok:true,data:info};
 else if(ds==='TaiwanStockPrice'){const id=u.searchParams.get('data_id');const base=id==='3105'?520:id==='2330'?2300:50;body={ok:true,data:Array.from({length:70},(_,i)=>{const d=new Date(2026,6,1+i);return{date:d.toISOString().slice(0,10),open:base,max:base+5,min:base-5,close:base+i*(id==='3105'?0.5:1),Trading_Volume:5000000,Trading_money:5000000*base}})};}
 else if(ds==='TaiwanStockInstitutionalInvestorsBuySell'){body={ok:true,data:["2026-10-08","2026-10-09","2026-10-13","2026-10-14"].flatMap(d=>[{date:d,name:"Foreign_Investor",buy:1000000,sell:3500000},{date:d,name:"Investment_Trust",buy:200000,sell:0},{date:d,name:"Dealer_self",buy:0,sell:50000}])};}
 else if(ds==='TaiwanStockFinancialStatements'){body={ok:true,data:[["2025-09-30",3.1],["2025-12-31",3.4],["2026-03-31",3.9],["2026-06-30",4.2]].flatMap(([d,v])=>[{date:d,type:"EPS",value:v},{date:d,type:"Revenue",value:1e9}])};}
 await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});});
await p.goto('http://localhost:8765/index.html');await p.waitForTimeout(1500);
await p.evaluate(()=>{const el=document.getElementById('teddyPanel');el.style.display='flex';el.classList.add('open');});
await p.waitForTimeout(300);
await p.screenshot({path:'pi0.png'});
await p.evaluate(()=>window.teddyInvestOpen());
await p.waitForTimeout(400);
await p.evaluate(()=>{const s=document.getElementById('piGroup');s.value='3';s.dispatchEvent(new Event('change'));});
await p.waitForTimeout(2500);
await p.screenshot({path:'pi1.png'});
await p.evaluate(()=>document.querySelector('#piBody tr:nth-child(8)').click());
await p.waitForTimeout(300);
await p.screenshot({path:'pi2.png'});
console.log(JSON.stringify(calls));
console.log(await p.evaluate(()=>window.teddyInvestContext("穩懋今天怎樣")));
console.log("組:",(await p.evaluate(()=>window.teddyInvestContext("幫我看金融這組")) ).split("\n").length);
console.log("無關:",JSON.stringify(await p.evaluate(()=>window.teddyInvestContext("今天天氣如何"))));
console.log("材料:",await p.evaluate(()=>JSON.stringify(window.__pi.resolve({name:"材料-KY"}))), await p.evaluate(()=>JSON.stringify(window.__pi.resolve({name:"兆聯實業"}))), await p.evaluate(()=>JSON.stringify(window.__pi.resolve({name:"統一"}))));
await b.close();srv.close();})();
