const {chromium}=require('playwright');const http=require('http'),fs=require('fs');
const srv=http.createServer(require('./srvh')).listen(8774);
const info=[["2330","台積電","twse"],["3105","穩懋","tpex"],["0050","元大台灣50","twse"],["2884","玉山金","twse"],["2880","華南金","twse"]].map(([a,b,c])=>({stock_id:a,stock_name:b,type:c,industry_category:"半導體業"}));
// deterministic random walk
function series(seed,base){let x=seed,p=base;const out=[];const d0=new Date(2025,8,1);for(let i=0;i<300;i++){x=(x*16807)%2147483647;const r=(x/2147483647-0.5)*0.04;p=+(p*(1+r)).toFixed(2);const d=new Date(d0.getTime()+i*86400000*1.2);const h=+(p*1.01).toFixed(2),l=+(p*0.99).toFixed(2);out.push({date:d.toISOString().slice(0,10),open:p,max:h,min:l,close:p,Trading_Volume:3000000+(x%1000)*1000,Trading_money:(3000000)*p});}return out;}
const S={"3105":series(7,500),"2330":series(11,2000),"0050":series(3,100),"2884":series(5,45),"2880":series(9,48)};
fs.writeFileSync('mock3105.json',JSON.stringify(S["3105"]));
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:412,height:880},deviceScaleFactor:2});
p.on('pageerror',e=>console.log('PAGEERR',e.message));
await p.route('**/api/stock**',async route=>{const u=new URL(route.request().url());const t=u.searchParams.get('type');const ds=u.searchParams.get('dataset');const id=u.searchParams.get('data_id');let body;
 if(t==='rt'){const ex=u.searchParams.get('ex');body={ok:true,at:new Date().toISOString(),quotes:ex.includes('t00')?[{code:'t00',price:23100,prev:22900,date:'20261015',time:'13:30:00'},{code:'o00',price:255,prev:257,date:'20261015'}]:[]};}
 else if(t==='rank')body={ok:true,date:'2026-10-15',tpex:true,rows:[{code:'2330',name:'台積電',market:'twse',foreign:5e6,trust:0,dealer:0,total:5e6,close:1000},{code:'2880',name:'華南金',market:'twse',foreign:-4e6,trust:0,dealer:0,total:0,close:25}]};
 else if(ds==='TaiwanStockInfo')body={ok:true,data:info};
 else if(ds==='TaiwanStockPrice'&&id!=='TAIEX')body={ok:true,data:S[id]||[]};
 else if(ds==='TaiwanStockInstitutionalInvestorsBuySell'){body={ok:true,data:Array.from({length:22},(_,i)=>`2026-09-${String(i+1).padStart(2,'0')}`).flatMap((d,i)=>[{date:d,name:"Foreign_Investor",buy:1000000+i*100000,sell:2000000},{date:d,name:"Investment_Trust",buy:300000,sell:100000}])};}
 else if(ds==='TaiwanStockFinancialStatements'){const qs=["2024-09-30","2024-12-31","2025-03-31","2025-06-30","2025-09-30","2025-12-31","2026-03-31","2026-06-30"];body={ok:true,data:qs.flatMap((d,i)=>[{date:d,type:"EPS",value:2+i*0.3},{date:d,type:"Revenue",value:1000+i*50},{date:d,type:"GrossProfit",value:(1000+i*50)*(0.4+i*0.01)},{date:d,type:"OperatingIncome",value:(1000+i*50)*0.2}])};}
 else if(ds==='TaiwanStockPER'){body={ok:true,data:Array.from({length:240},(_,i)=>({date:`d${i}`,PER:15+i*0.05,PBR:2.1,dividend_yield:3.2}))};}
 else if(ds==='TaiwanStockMonthRevenue'){const rows=[];for(let y=2024;y<=2026;y++)for(let m=1;m<=12;m++){if(y===2026&&m>9)break;rows.push({revenue_year:y,revenue_month:m,revenue:(y===2026?120:y===2025?100:90)*1e6+m*1e6});}body={ok:true,data:rows};}
 else if(ds==='TaiwanStockPrice'&&id==='TAIEX')body={ok:true,data:series(13,22000)};
 else if(ds==='TaiwanStockTotalInstitutionalInvestors')body={ok:true,data:["2026-10-13","2026-10-14","2026-10-15"].flatMap((d,i)=>[{date:d,name:"Foreign_Investor",buy:3e10,sell:2.5e10+i*1e9},{date:d,name:"Investment_Trust",buy:5e9,sell:4e9},{date:d,name:"Dealer_self",buy:1e9,sell:2e9},{date:d,name:"total",buy:0,sell:0}])};
 else if(ds==='TaiwanStockTotalMarginPurchaseShortSale')body={ok:true,data:Array.from({length:8},(_,i)=>({date:`2026-10-0${i+1}`,name:"MarginPurchaseMoney",TodayBalance:3e11+i*1e9,YesBalance:3e11+(i-1)*1e9}))};
 else if(ds==='TaiwanFuturesInstitutionalInvestors')body={ok:true,data:[{date:"2026-10-14",institutional_investors:"外資",long_open_interest_balance_volume:20000,short_open_interest_balance_volume:45000},{date:"2026-10-15",institutional_investors:"外資",long_open_interest_balance_volume:21000,short_open_interest_balance_volume:44000},{date:"2026-10-15",institutional_investors:"投信",long_open_interest_balance_volume:1,short_open_interest_balance_volume:2}]};
 else if(ds==='TaiwanStockShareholding')body={ok:true,data:Array.from({length:22},(_,i)=>({date:`d${i}`,ForeignInvestmentSharesRatio:30+i*0.08}))};
 else if(ds==='TaiwanStockDividend')body={ok:true,data:[{year:"112年",CashEarningsDistribution:10,CashStatutorySurplus:0,StockEarningsDistribution:0,CashExDividendTradingDate:"2024-07-10"},{year:"113年",CashEarningsDistribution:12,CashExDividendTradingDate:"2025-07-10"},{year:"114年",CashEarningsDistribution:14,CashExDividendTradingDate:"2026-07-10"},{year:"115年",CashEarningsDistribution:5,CashExDividendTradingDate:"2026-12-10"}]};
 else if(ds==='TaiwanStockMarginPurchaseShortSale'){body={ok:true,data:Array.from({length:10},(_,i)=>({date:`2026-10-0${i}`,MarginPurchaseTodayBalance:10000+i*200,ShortSaleTodayBalance:800}))};}
 else body={ok:true,data:[]};
 await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});});
await p.goto('http://localhost:8774/index.html');await p.waitForTimeout(1200);
await p.evaluate(()=>{localStorage.setItem('teddy_invest_cfg_v1',JSON.stringify({groups:[{name:"測試群",items:[{name:"台積電"},{name:"穩懋"},{name:"元大台灣50"},{name:"玉山金"},{name:"華南金"}]}],active:0,token:""}));});
await p.reload();await p.waitForTimeout(1200);
await p.evaluate(()=>{const el=document.getElementById('teddyPanel');el.style.display='flex';window.teddyInvestOpen();});
await p.waitForTimeout(2500);
await p.evaluate(()=>{window.__pi.cfg().pos["3105"]={cost:600,shares:2000};});
await p.evaluate(()=>document.querySelector('#piBody tr:nth-child(2)').click());
await p.waitForTimeout(3000);
await p.screenshot({path:'p8a.png'});
await p.evaluate(()=>document.getElementById('piSheet').scrollTop=1300);await p.waitForTimeout(200);await p.screenshot({path:'p8b.png'});
await p.evaluate(()=>document.getElementById('piSheet').scrollTop=3000);await p.waitForTimeout(200);await p.screenshot({path:'p8c.png'});
await p.evaluate(()=>{document.getElementById('piSheet').style.display='none';});
await p.evaluate(()=>window.__pi.render());await p.waitForTimeout(300);await p.screenshot({path:'p8d.png'});
await p.evaluate(()=>document.getElementById('piMkt').click());await p.waitForTimeout(1500);await p.screenshot({path:'p8e.png'});
const msgs=[];await p.exposeFunction('logp',m=>msgs.push(m));
await p.evaluate(()=>{window.__pi.cfg().pos['3105']={cost:600,shares:2000};});const c3=0;
await p.evaluate(()=>{});
const c4=await p.evaluate(async()=>{window.__teddyInvestProgress=m=>window.logp(m);const r=await window.teddyInvestQuery("今天盤後報告");return r;});
console.log(c4.slice(c4.indexOf("【明日關鍵價位"),c4.indexOf("【資料完成度")));
console.log("route:",await p.evaluate(()=>["明天操作指南","明日操作","今天盤後報告"].map(q=>window.teddyInvestWants(q)).join()));
await b.close();srv.close();})();
