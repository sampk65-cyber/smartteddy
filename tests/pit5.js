const {chromium}=require('playwright');const http=require('http'),fs=require('fs');
const srv=http.createServer(require('./srvh')).listen(8768);
const names=[["2330","台積電","twse","半導體業"],["2317","鴻海","twse","其他電子業"],["2884","玉山金","twse","金融保險業"],["3105","穩懋","tpex","半導體業"],["0050","元大台灣50","twse",""],["2303","聯電","twse","半導體業"],["2880","華南金","twse","金融保險業"]];
const info=names.map(([a,b,c,d])=>({stock_id:a,stock_name:b,type:c,industry_category:d}));
const rows=names.map(([c,n,m],i)=>({code:c,name:n,market:m,foreign:[5e6,-3e6,8e6,1.2e6,-9e6,4e5,-2e5][i],trust:[1e5,2e5,-3e5,0,0,5e4,1e4][i],dealer:0,total:0,close:[1000,200,30,500,100,50,25][i]}));
(async()=>{const b=await chromium.launch();const p=await b.newPage();p.on('pageerror',e=>console.log('PAGEERR',e.message));
await p.route('**/api/stock**',async route=>{const u=new URL(route.request().url());const t=u.searchParams.get('type'),ds=u.searchParams.get('dataset');let body={ok:true,data:[]};
 if(t==='rank')body={ok:true,date:"2026-10-15",rows,tpex:true};else if(t==='rt')body={ok:true,quotes:[]};else if(ds==='TaiwanStockInfo')body={ok:true,data:info};
 await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});});
await p.goto('http://localhost:8768/');await p.waitForTimeout(1200);
for(const q of ["外資買超前30","外資買超賣超前三十","投信賣超前5名","外資買超金額排行","上櫃外資買超前10","今天外資買超個股前5，不含ETF","外資買超前30幫我分析"]){
  const r=await p.evaluate(q=>window.teddyInvestRankLocal(q),q);console.log("Q:",q,"\n",r?r.slice(0,420):"(交給分析)",'\n');}
console.log("parse 前三十:",JSON.stringify(await p.evaluate(()=>window.teddyInvestRankParse("外資買超前三十名"))));
console.log("非排行:",await p.evaluate(()=>window.teddyInvestRankParse("台積電外資買超多少")));
const ctx=await p.evaluate(()=>window.teddyInvestQuery("外資買超前5幫我分析"));console.log(ctx.slice(0,300));
await b.close();srv.close();})();
