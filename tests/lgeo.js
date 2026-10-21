// 語音：手機定位、天氣／時間／匯率工具
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
let ran=null;
ctx.teddyLocation={lat:24.2,lon:120.72,label:"潭子區"};
ctx.TEDDY_TOOLS=[{name:"get_weather",description:"查天氣",input_schema:{type:"object",properties:{location:{type:"string"}}}},{name:"get_current_datetime",description:"時間",input_schema:{type:"object",properties:{}}},{name:"get_exchange_rate",description:"匯率",input_schema:{type:"object",properties:{}}},{name:"calculate",description:"算",input_schema:{type:"object",properties:{}}}];
ctx.teddyRunTool=async(n,a)=>{ran=[n,a];return{ok:true,place:"潭子區",temperature_c:24};};
ctx.teddyRequestLocation=async()=>ctx.teddyLocation;
vm.runInContext(fs.readFileSync("c2t.js","utf8"),ctx);
const T=ctx.__T;
(async()=>{
 await T.startLive();await new Promise(r=>setTimeout(r,80));
 const ws=sockets[sockets.length-1];const st=ws.sent.find(m=>m.setup);
 const names=(st.setup.tools||[]).flatMap(t=>(t.functionDeclarations||[]).map(f=>f.name));
 console.log("語音工具:",["get_weather","get_current_datetime","get_exchange_rate","calculate"].map(n=>n+"="+names.includes(n)).join(" "));
 const sys=JSON.stringify(st.setup.systemInstruction||"");console.log("語音知道位置:",sys.includes("潭子區"));
 const before=ws.sent.length;
 await T.parseGeminiMessage(JSON.stringify({toolCall:{functionCalls:[{id:"w",name:"get_weather",args:{}}]}}));
 await new Promise(r=>setTimeout(r,50));
 const resp=ws.sent.slice(before).find(m=>m.toolResponse);
 console.log("天氣工具執行:",JSON.stringify(ran),"回傳:",JSON.stringify(resp&&resp.toolResponse.functionResponses[0].response));
 process.exit(0);
})();
