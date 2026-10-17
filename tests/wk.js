const {chromium}=require('playwright');const http=require('http'),fs=require('fs');
const srv=http.createServer(require('./srvh')).listen(8781);
const STORE={};
const fbMock=`window.firebase={apps:[],initializeApp(){this.apps.push(1);return {}},analytics(){},auth(){return{}},storage(){return{}},firestore(){return{collection:c=>({doc:d=>({get:async()=>{const v=await window.__fsGet(c+'/'+d);return{exists:!!v,data:()=>v?JSON.parse(v):null}},set:async(o,opt)=>{const bad=v=>Array.isArray(v)?v.some(x=>Array.isArray(x)||bad(x)):(v&&typeof v==='object'?Object.values(v).some(bad):false);if(bad(o))throw new Error('Nested arrays are not supported');await window.__fsSet(c+'/'+d,JSON.stringify(o));}}),where(){return this},limit(){return this},get:async()=>({docs:[]})})}}};`;
const info=[["2330","台積電","twse","半導體業"],["3105","穩懋","tpex","半導體業"],["2884","玉山金","twse","金融保險業"],["0050","元大台灣50","twse","ETF"],["2317","鴻海","twse","其他電子業"]].map(([a,b,c,d])=>({stock_id:a,stock_name:b,type:c,industry_category:d}));
const days=[];{let d=new Date("2026-10-16T00:00:00Z");while(days.length<300){const w=d.getUTCDay();if(w&&w<6)days.unshift(d.toISOString().slice(0,10));d.setUTCDate(d.getUTCDate()-1);}}
const shape={"2330":i=>1000+i*4+Math.sin(i/3)*15,"3105":i=>200-i*0.3+Math.sin(i/4)*3,"2884":i=>30+Math.sin(i/9)*1.5,"0050":i=>150+i*0.2+Math.sin(i/5)*2,"2317":i=>i<270?150+i*0.3:231-(i-270)*1.2,"TAIEX":i=>40000+i*25};
let END=300; // 可截短模擬上週
function price(id){const f=shape[id];return days.slice(0,END).map((d,i)=>{const c=f(i);return{date:d,open:c,max:c*1.01,min:c*0.99,close:c,Trading_Volume:5e6,Trading_money:5e6*c};});}
function inst(id){const sign={"2330":1,"3105":-1,"2884":0.2,"0050":1,"2317":-1}[id]||0;return days.slice(Math.max(0,END-30),END).flatMap(d=>[{date:d,name:"Foreign_Investor",buy:3e5*(1+sign),sell:3e5},{date:d,name:"Investment_Trust",buy:1e5,sell:1e5}]);}
function fin(id){const e={"2330":[10,11,12,13,14,15,16,17],"3105":[1,0.5,-0.2,-0.5,0.3,-0.1,-0.3,-0.4],"2884":[0.4,0.4,0.4,0.4,0.45,0.45,0.45,0.45],"2317":[2,2,2,2,2.2,2.3,2.4,2.5]}[id]||[];const q=["2024-09-30","2024-12-31","2025-03-31","2025-06-30","2025-09-30","2025-12-31","2026-03-31","2026-06-30"];return e.flatMap((v,i)=>[{date:q[i],type:"EPS",value:v},{date:q[i],type:"Revenue",value:1e9}]);}
function rev(id){const g={"2330":1.3,"3105":0.8,"2884":1.02,"2317":1.1}[id]||1;const o=[];for(let y=2024;y<=2026;y++)for(let m=1;m<=12;m++){if(y===2026&&m>9)break;o.push({revenue_year:y,revenue_month:m,revenue:1e9*(y===2026?g:1)});}return o;}
async function page(ctx,url){const p=await ctx.newPage();p.on('pageerror',e=>console.log('PAGEERR',e.message));
 await p.exposeFunction('__fsGet',k=>STORE[k]||null);await p.exposeFunction('__fsSet',(k,v)=>{STORE[k]=v;});
 await p.addInitScript(fbMock);
 await p.route('**/api/stock**',r=>{const u=new URL(r.request().url());const ds=u.searchParams.get('dataset'),id=u.searchParams.get('data_id');let data=[];
  if(ds==='TaiwanStockInfo')data=info;else if(ds==='TaiwanStockPrice')data=price(id);else if(ds==='TaiwanStockInstitutionalInvestorsBuySell')data=inst(id);else if(ds==='TaiwanStockFinancialStatements')data=fin(id);else if(ds==='TaiwanStockMonthRevenue')data=rev(id);
  r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,data,quotes:[]})});});
 await p.goto(url);await p.waitForTimeout(1500);return p;}
(async()=>{const b=await chromium.launch();const c1=await b.newContext({viewport:{width:420,height:900}});const o=await page(c1,'http://localhost:8781/');
 await o.evaluate(()=>{localStorage.setItem('teddy_invest_cfg_v1',JSON.stringify({groups:[{name:"測試",items:[{name:"台積電"},{name:"穩懋"},{name:"玉山金"},{name:"元大台灣50"},{name:"鴻海"}]}],active:0}));});
 await o.reload();await o.waitForTimeout(1200);
 console.log("isWeekQ:",JSON.stringify(await o.evaluate(()=>["推薦下週10檔","自選週檢","這週強弱變化","今天盤後報告","推薦哪幾檔","台積電今天怎樣"].map(q=>[q,window.__pi.isWeekQ(q)]))));
 console.log("rank parse:",JSON.stringify(await o.evaluate(()=>["推薦下週10檔","自選週檢","下週觀察名單","外資買超前30"].map(q=>[q,!!window.teddyInvestRankParse(q),window.teddyInvestWants(q)]))));
 console.log("deep:",JSON.stringify(await o.evaluate(()=>["推薦下週10檔","自選週檢","這週強弱變化"].map(q=>[q,teddyDeepJudge(q,{invest:true}).deep]))));
 // 上週：資料截到 END-5，先算一次
 END=295;
 await o.evaluate(()=>window.teddyInvestOpen());await o.waitForTimeout(2000);
 await o.evaluate(()=>{const c=window.__pi.cache();c.daily={};c.inst={};c.eps={};c.rev={};c.mkt={};});
 await o.evaluate(()=>window.__pi.buildWeekly());
 console.log("snap1:",JSON.stringify(await o.evaluate(()=>window.__pi.cfg().weekly.map(s=>[s.wk,s.d,s.items.map(x=>x[1]+":"+x[2])]))));
 END=300;
 await o.evaluate(()=>{const c=window.__pi.cache();c.daily={};c.inst={};c.eps={};c.rev={};c.mkt={};});
 const txt=await o.evaluate(()=>window.teddyInvestWeekly());
 console.log(txt.split("【回答規則】")[0]);
 await o.evaluate(()=>document.getElementById('piWeek').click());await o.waitForTimeout(800);
 await o.screenshot({path:'wk1.png',fullPage:false});
 await o.evaluate(()=>{document.getElementById('piSheet').scrollTop=600;});await o.waitForTimeout(200);await o.screenshot({path:'wk2.png'});
 await o.waitForTimeout(2500);console.log("local weekly",await o.evaluate(()=>window.__pi.cfg().weekly.length));console.log("STORE weekly synced:",Object.keys(STORE).filter(k=>k.startsWith('teddy_invest/p_')).map(k=>JSON.parse(STORE[k]).weekly?.length));
 await o.evaluate(()=>document.getElementById('piSheetClose').click());await o.setViewportSize({width:375,height:700});await o.waitForTimeout(300);await o.screenshot({path:'wk3.png'});
 // 新手機：用備份碼拉回週檢快照
 const ok=await o.evaluate(()=>window.__pi.cfg().cloudKey);const c2=await b.newContext();const o2=await page(c2,'http://localhost:8781/');
 await o2.evaluate(k=>{localStorage.setItem('teddy_invest_cfg_v1',JSON.stringify({groups:[{name:"x",items:[]}],active:0,cloudKey:k}));},ok);await o2.reload();await o2.waitForTimeout(800);
 await o2.evaluate(()=>window.teddyInvestOpen());await o2.waitForTimeout(2000);
 console.log("restored weekly:",JSON.stringify(await o2.evaluate(()=>window.__pi.cfg().weekly.map(w=>[w.wk,Array.isArray(w.items[0]),w.items.length]))));
 await b.close();srv.close();})();
