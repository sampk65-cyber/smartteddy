const {chromium}=require('playwright');const http=require('http'),fs=require('fs');
const srv=http.createServer(require('./srvh')).listen(8780);
const STORE={};
const fbMock=`window.firebase={apps:[],initializeApp(){this.apps.push(1);return {}},analytics(){},auth(){return{}},storage(){return{}},firestore(){return{collection:c=>({doc:d=>({get:async()=>{const v=await window.__fsGet(c+'/'+d);return{exists:!!v,data:()=>v?JSON.parse(v):null}},set:async(o,opt)=>{await window.__fsSet(c+'/'+d,JSON.stringify(o));}}),where(){return this},limit(){return this},get:async()=>({docs:[]})})}}};`;
const info=[["2330","台積電","twse"],["3105","穩懋","tpex"],["2884","玉山金","twse"]].map(([a,b,c])=>({stock_id:a,stock_name:b,type:c,industry_category:"x"}));
async function page(ctx,url){const p=await ctx.newPage();p.on('pageerror',e=>console.log('PAGEERR',e.message));
 await p.exposeFunction('__fsGet',k=>STORE[k]||null);await p.exposeFunction('__fsSet',(k,v)=>{STORE[k]=v;});
 await p.addInitScript(fbMock);
 await p.route('**/api/stock**',r=>{const u=new URL(r.request().url());const ds=u.searchParams.get('dataset');r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(ds==='TaiwanStockInfo'?{ok:true,data:info}:{ok:true,data:[],quotes:[]})});});
 await p.goto(url);await p.waitForTimeout(1500);return p;}
(async()=>{const b=await chromium.launch();
 // owner
 const c1=await b.newContext();const o=await page(c1,'http://localhost:8780/');
 await o.evaluate(()=>{localStorage.setItem('teddy_invest_cfg_v1',JSON.stringify({groups:[{name:"孫爸AI",items:[{name:"台積電"},{name:"穩懋"}]}],active:0}));});
 await o.reload();await o.waitForTimeout(1200);
 await o.evaluate(()=>window.teddyInvestOpen());await o.waitForTimeout(2500);
 await o.evaluate(()=>{window.__pi.cfg().pos['2330']={cost:1000,shares:100};});
 // owner adds stock via edit
 await o.evaluate(()=>document.getElementById('piEdit').click());await o.waitForTimeout(200);
 await o.fill('#piAdd','玉山金');await o.evaluate(()=>document.getElementById('piAddBtn').click());await o.waitForTimeout(2500);
 console.log("STORE keys:",Object.keys(STORE));console.log("shared:",STORE['teddy_invest/shared_watchlist']);
 const ownerKey=await o.evaluate(()=>window.__pi.cfg().cloudKey);
 console.log("owner priv:",STORE['teddy_invest/p_'+ownerKey]);
 // family
 const c2=await b.newContext();const f=await page(c2,'http://localhost:8780/?app=family');
 await f.evaluate(()=>window.teddyInvestOpen());await f.waitForTimeout(2500);
 console.log("family groups:",JSON.stringify(await f.evaluate(()=>window.__pi.cfg().groups.map(g=>[g.name,!!g.shared,g.items.map(i=>i.name).join("/")]))));
 await f.evaluate(()=>document.getElementById('piEdit').click());await f.waitForTimeout(300);
 await f.screenshot({path:'fam1.png'});
 await f.evaluate(()=>document.getElementById('piGNew').click());await f.waitForTimeout(2000);
 console.log("family groups after new:",JSON.stringify(await f.evaluate(()=>window.__pi.cfg().groups.map(g=>[g.name,!!g.shared]))));
 console.log("shared unchanged by family:",STORE['teddy_invest/shared_watchlist'].includes('我的群組')?"NO!":"yes");
 // owner new phone restore with key
 const c3=await b.newContext();const o2=await page(c3,'http://localhost:8780/');
 await o2.evaluate(()=>window.teddyInvestOpen());await o2.waitForTimeout(2000);
 console.log("new phone groups:",JSON.stringify(await o2.evaluate(()=>window.__pi.cfg().groups.map(g=>g.name))), "pos before key:",JSON.stringify(await o2.evaluate(()=>window.__pi.cfg().pos)));
 await o2.evaluate(()=>document.getElementById('piEdit').click());await o2.waitForTimeout(300);
 await o2.fill('#piCloudKey',ownerKey);await o2.evaluate(()=>document.getElementById('piCloudKey').dispatchEvent(new Event('change')));await o2.waitForTimeout(1500);
 console.log("pos after key:",JSON.stringify(await o2.evaluate(()=>window.__pi.cfg().pos)));
 await o2.screenshot({path:'own2.png'});
 await b.close();srv.close();})();
