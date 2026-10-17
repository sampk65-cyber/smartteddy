const {chromium}=require('playwright');const http=require('http'),fs=require('fs');
const srv=http.createServer(require('./srvh')).listen(8766);
const info=[["2330","台積電","twse"],["3105","穩懋","tpex"],["0050","元大台灣50","twse"],["2884","玉山金","twse"],["2880","華南金","twse"]].map(([a,b,c])=>({stock_id:a,stock_name:b,type:c,industry_category:"半導體業"}));
// deterministic random walk
function series(seed,base){let x=seed,p=base;const out=[];const d0=new Date(2025,8,1);for(let i=0;i<300;i++){x=(x*16807)%2147483647;const r=(x/2147483647-0.5)*0.04;p=+(p*(1+r)).toFixed(2);const d=new Date(d0.getTime()+i*86400000*1.2);const h=+(p*1.01).toFixed(2),l=+(p*0.99).toFixed(2);out.push({date:d.toISOString().slice(0,10),open:p,max:h,min:l,close:p,Trading_Volume:3000000+(x%1000)*1000,Trading_money:(3000000)*p});}return out;}
const S={"3105":series(7,500),"2330":series(11,2000),"0050":series(3,100),"2884":series(5,45),"2880":series(9,48)};
fs.writeFileSync('mock3105.json',JSON.stringify(S["3105"]));
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:412,height:880},deviceScaleFactor:2});
p.on('pageerror',e=>console.log('PAGEERR',e.message));
await p.route('**/api/stock**',async route=>{const u=new URL(route.request().url());const t=u.searchParams.get('type');const ds=u.searchParams.get('dataset');const id=u.searchParams.get('data_id');let body;
 if(t==='rt'){body={ok:true,at:new Date().toISOString(),quotes:[]};}
 else if(ds==='TaiwanStockInfo')body={ok:true,data:info};
 else if(ds==='TaiwanStockPrice')body={ok:true,data:S[id]||[]};
 else if(ds==='TaiwanStockInstitutionalInvestorsBuySell'){body={ok:true,data:Array.from({length:22},(_,i)=>`2026-09-${String(i+1).padStart(2,'0')}`).flatMap((d,i)=>[{date:d,name:"Foreign_Investor",buy:1000000+i*100000,sell:2000000},{date:d,name:"Investment_Trust",buy:300000,sell:100000}])};}
 else if(ds==='TaiwanStockFinancialStatements'){const qs=["2024-09-30","2024-12-31","2025-03-31","2025-06-30","2025-09-30","2025-12-31","2026-03-31","2026-06-30"];body={ok:true,data:qs.flatMap((d,i)=>[{date:d,type:"EPS",value:2+i*0.3},{date:d,type:"Revenue",value:1000+i*50},{date:d,type:"GrossProfit",value:(1000+i*50)*(0.4+i*0.01)},{date:d,type:"OperatingIncome",value:(1000+i*50)*0.2}])};}
 else if(ds==='TaiwanStockPER'){body={ok:true,data:Array.from({length:240},(_,i)=>({date:`d${i}`,PER:15+i*0.05,PBR:2.1,dividend_yield:3.2}))};}
 else if(ds==='TaiwanStockMonthRevenue'){const rows=[];for(let y=2024;y<=2026;y++)for(let m=1;m<=12;m++){if(y===2026&&m>9)break;rows.push({revenue_year:y,revenue_month:m,revenue:(y===2026?120:y===2025?100:90)*1e6+m*1e6});}body={ok:true,data:rows};}
 else if(ds==='TaiwanStockMarginPurchaseShortSale'){body={ok:true,data:Array.from({length:10},(_,i)=>({date:`2026-10-0${i}`,MarginPurchaseTodayBalance:10000+i*200,ShortSaleTodayBalance:800}))};}
 else body={ok:true,data:[]};
 await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});});
await p.goto('http://localhost:8766/index.html');await p.waitForTimeout(1200);
await p.evaluate(()=>{localStorage.setItem('teddy_invest_cfg_v1',JSON.stringify({groups:[{name:"測試群",items:[{name:"台積電"},{name:"穩懋"},{name:"元大台灣50"},{name:"玉山金"},{name:"華南金"}]}],active:0,token:""}));});
await p.reload();await p.waitForTimeout(1200);
await p.evaluate(()=>{const el=document.getElementById('teddyPanel');el.style.display='flex';window.teddyInvestOpen();});
await p.waitForTimeout(2500);
await p.evaluate(()=>document.querySelector('#piBody tr:nth-child(2)').click());
await p.waitForTimeout(2500);
await p.screenshot({path:'pi3a.png'});
await p.evaluate(()=>document.getElementById('piSheet').scrollTop=900);await p.waitForTimeout(200);
await p.screenshot({path:'pi3b.png'});
const m=await p.evaluate(()=>{const x=window.__pi.metrics("3105");return {rsi:x.rsi14,K:x.K,D:x.D,macd:x.macd,ma20:x.ma20,revYoY:x.revYoY,rev3:x.rev3YoY,cum:x.revCumYoY,gm:x.gm,gmYA:x.gmYA,eps4YoY:x.eps4YoY,perPct:x.perPct,mg:x.mgChg5,sr:x.shortRatio,f20:x.f20,trend:x.trend,hi:x.hi52}});
console.log(JSON.stringify(m));
const ctx=await p.evaluate(()=>window.teddyInvestQuery("請用分析師的角度分析穩懋"));console.log(ctx.slice(0,1800));
const g=await p.evaluate(()=>window.teddyInvestQuery("分析我的自選群組「測試群」"));console.log("GROUP\n"+g.slice(0,900));
await b.close();srv.close();})();
