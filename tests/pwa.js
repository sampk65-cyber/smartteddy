const {chromium}=require('playwright');const http=require('http');
const srv=http.createServer(require('./srvh')).listen(8791);
(async()=>{const b=await chromium.launch();
 for(const q of ["","?app=family","?app=farm"]){
  const ctx=await b.newContext({viewport:{width:390,height:844}});const p=await ctx.newPage();const errs=[];
  p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error')errs.push("console: "+m.text().slice(0,140));});
  await p.goto('http://localhost:8791/'+q);await p.waitForTimeout(2500);
  const info=await p.evaluate(async()=>{const l=document.querySelector('link[rel=manifest]');const mf=await (await fetch(l.href)).json();
    return {entry:window.TEDDY_ENTRY_ID,manifest:l.getAttribute('href'),start:mf.start_url,name:mf.name,
      fns:["teddyDeepJudge","ghMainFirestore","teddySend","teddyInvestOpen","teddyInvestWeekly","teddyLiveReadAnswer","teddyDeepAsk"].map(n=>n+":"+(typeof window[n]==="function"||(()=>{try{return typeof eval(n)==="function"}catch(_){return false}})()))};});
  const sw=await p.evaluate(async()=>{const r=await navigator.serviceWorker.ready;return !!r.active;});
  await p.reload();await p.waitForTimeout(1500);
  const ctl=await p.evaluate(()=>!!navigator.serviceWorker.controller);
  await ctx.setOffline(true);await p.reload();await p.waitForTimeout(1500);
  const off=await p.evaluate(()=>({title:document.title,hasCore:typeof teddyDeepJudge==="function"}));
  await ctx.setOffline(false);
  console.log(JSON.stringify({q,...info,sw,controlled:ctl,offline:off}));
  console.log("  errors:",errs.filter(e=>!/Failed to load resource|net::ERR|firebase|gstatic|cdnjs|jsdelivr/i.test(e)).slice(0,5));
  if(!q){await p.goto('http://localhost:8791/');await p.waitForTimeout(5500);await p.screenshot({path:'pwa1.png'});}
  await ctx.close();}
 await b.close();srv.close();})();
