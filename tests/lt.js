const vm=require('vm'),fs=require('fs');
const stub=()=>new Proxy(function(){},{get:(t,k)=>k===Symbol.toPrimitive?()=>"":k==='length'?0:k==='then'?undefined:k==='style'?{}:stub(),apply:()=>stub(),construct:()=>stub(),set:()=>true});
const store={"ai_obs_keys":JSON.stringify({google:"G"})};
let sockets=[];const logs=[];
class WS{constructor(u){this.url=u;this.readyState=0;this.sent=[];sockets.push(this);setTimeout(()=>{this.readyState=1;this.onopen&&this.onopen();},5);}
 send(x){this.sent.push(JSON.parse(x));const m=JSON.parse(x);if(m.setup){const model=m.setup.model;setTimeout(()=>{ if(ctx.__reject38&&model.includes("3.8")){this.readyState=3;this.onclose&&this.onclose();} else this.onmessage({data:JSON.stringify({setupComplete:{}})});},10);}}
 close(){this.readyState=3;}}
const ctx={console:{log:(...a)=>logs.push(a.join(" ")),warn:(...a)=>logs.push("WARN "+a.join(" ")),error(){},info(){}},setTimeout,clearTimeout,setInterval,clearInterval,
 localStorage:{getItem:k=>store[k]??null,setItem:(k,v)=>store[k]=String(v),removeItem:k=>delete store[k]},sessionStorage:{getItem:()=>null,setItem(){},removeItem(){}},
 document:stub(),navigator:{mediaDevices:{getUserMedia:async()=>({getTracks:()=>[]})}},location:{search:"",href:""},WebSocket:WS,
 Intl,Date,Math,JSON,Promise,RegExp,Map,Set,Array,Object,String,Number,Boolean,Symbol,Error,Blob:class{},atob,btoa,TextEncoder,TextDecoder,performance,queueMicrotask,Uint8Array,Int16Array,Float32Array,
 AudioContext:stub(),RTCPeerConnection:stub(),Audio:stub(),
 loadKeys:()=>({google:"G"}),liveInstructions:()=>"INSTR",teddyPersonaCore:()=>"",teddyHistory:[],teddySaveHistory(){},teddyAppendLog(){},ghLog:(r,x)=>logs.push("ghLog "+x),
};
ctx.window=ctx;ctx.addEventListener=()=>{};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync('c2t.js','utf8'),ctx);
const T=ctx.__T;
// stub capture
vm.runInContext("",ctx);
(async()=>{
 ctx.TEDDY_APP_MODE="greenhouse";
 // 1) 3.8 setup content
 const s38=T.gliveSetup("38et").setup, s31=T.gliveSetup("31").setup;
 console.log("3.8 model:",s38.model,"thinking:",JSON.stringify(s38.generationConfig.thinkingConfig),"behavior:",s38.tools[0].functionDeclarations.map(d=>d.behavior).join(","));
 console.log("3.1 model:",s31.model,"thinking:",JSON.stringify(s31.generationConfig.thinkingConfig),"behavior:",s31.tools[0].functionDeclarations.map(d=>d.behavior||"-").join(","));
 // 2) 3.8 interaction: model says "我查一下" then turnComplete IN_PROGRESS, no tool, then IDLE with refusal -> safety
 let asked=[];ctx.teddyGreenhouseAsk=async q=>{asked.push(q);return{ok:true,entry:"materials",answer:"四北本月：溝灌10噸"};};
 ctx.teddyGhLocalRoute=q=>/四北/.test(q)?"materials":null;
 let spoke=[];ctx.teddyLiveSpeak=a=>{spoke.push(a);return true;};
 T.live.variantActive="38et";T.live.ix={heard:"",said:"",tool:false,echo:false};T.live.inputText="";T.live.outputText="";
 const P=m=>T.parseGeminiMessage(JSON.stringify({serverContent:m}));
 await P({inputTranscription:{text:"四北這個月施肥"}});
 await P({outputTranscription:{text:"我查一下喔"}});
 await P({turnComplete:true,interactionStatus:"IN_PROGRESS"});
 await new Promise(r=>setTimeout(r,1300));
 console.log("IN_PROGRESS 後保險觸發?",asked.length);
 await P({outputTranscription:{text:"抱歉語音查不到，請打字"}});
 await P({turnComplete:true,interactionStatus:"IDLE"});
 await new Promise(r=>setTimeout(r,50));
 console.log("IDLE 後保險查詢:",asked,"念出:",spoke);
 // 3) 3.8 with tool call -> no safety
 asked=[];spoke=[];
 await P({inputTranscription:{text:"四北今天補水"}});
 await T.parseGeminiMessage(JSON.stringify({toolCall:{functionCalls:[]}}));
 await P({outputTranscription:{text:"四北今天溝灌5噸"}});
 await P({turnComplete:true,interactionStatus:"IDLE"});
 await new Promise(r=>setTimeout(r,50));
 console.log("有呼叫工具時保險觸發?",asked.length);
 // 4) fallback: 3.8 rejected -> 3.1
 ctx.__reject38=true;
 try{await T.startLive();}catch(e){console.log("start err",e.message);}
 await new Promise(r=>setTimeout(r,300));
 console.log("連線使用:",sockets.map(s=>s.sent.find(x=>x.setup)?.setup.model).filter(Boolean).join(" → "),"｜目前:",T.live.variantActive);
 process.exit(0);
})().catch(e=>{console.log("ERR",e.stack);process.exit(1);});
