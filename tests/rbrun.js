const vm=require('vm'),fs=require('fs');
const stub=()=>new Proxy(function(){},{get:(t,k)=>k===Symbol.toPrimitive?()=>"":k==='length'?0:k==='then'?undefined:stub(),apply:()=>stub(),construct:()=>stub(),set:()=>true});
const store={};
const ctx={console:{log(){},warn(){},error(){},info(){}},setTimeout:()=>0,clearTimeout(){},setInterval:()=>0,clearInterval(){},
 localStorage:{getItem:k=>store[k]??null,setItem:(k,v)=>store[k]=String(v),removeItem:k=>delete store[k]},sessionStorage:{getItem:()=>null,setItem(){},removeItem(){}},
 document:stub(),navigator:stub(),location:{search:"",href:"",hostname:"x"},fetch:async()=>({ok:false,json:async()=>({})}),firebase:stub(),
 Intl,Date,Math,JSON,Promise,RegExp,Map,Set,Array,Object,String,Number,Boolean,Symbol,Error,URL,URLSearchParams,encodeURIComponent,decodeURIComponent,parseFloat,parseInt,isNaN,
 AudioContext:stub(),speechSynthesis:stub(),SpeechSynthesisUtterance:stub(),Audio:stub(),Image:stub(),MutationObserver:stub(),requestAnimationFrame:()=>0,alert(){},TextEncoder,TextDecoder,atob,btoa,crypto:globalThis.crypto,performance,queueMicrotask,structuredClone};
ctx.window=ctx;ctx.self=ctx;ctx.globalThis=ctx;ctx.addEventListener=()=>{};ctx.matchMedia=()=>({matches:false,addEventListener(){}});
vm.createContext(ctx);vm.runInContext(fs.readFileSync('main.js','utf8'),ctx,{timeout:20000});

const T={r:vm.runInContext("ghRouteV51Question",ctx),t:vm.runInContext("ghFunction7Table",ctx),m:vm.runInContext("ghIsRouteMapQuestion",ctx),H:vm.runInContext("teddyHandsHandle",ctx)};
const qb=JSON.parse(fs.readFileSync('teddy-qbank.json','utf8'));let ok=0,f=[];
const extra=[["今天四北做了什麼事","activity"],["你幫我讀取今天四北做了什麼事","activity"],["昨天三期有做什麼","activity"],["四北澆水施肥","materials"]];
const all=qb.query.map(x=>[x.q,x.entry,x.table]).concat(extra);
for(const [q,e,tb] of all){const r=T.m(q)?{id:"route-map"}:T.r(q,null);const id=r?r.id:null;const t=id==="function7"?T.t(q):null;if(id===e&&(!tb||t===tb))ok++;else f.push(q+" → "+id+(t?"表"+t:""));}
console.log("路由 "+ok+"/"+all.length);f.forEach(x=>console.log("✗ "+x));
(async()=>{let hij=0;vm.runInContext("teddyHandsPending=null;teddyHandsWorkMode=null;",ctx);for(const [q] of all){const r=await T.H(q);if(r.handled){hij++;console.log("  攔截："+q+" → "+String(r.reply).slice(0,50));}}console.log("被誤當指派 "+hij);})();