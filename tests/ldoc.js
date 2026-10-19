// 語音：read_document、think_with_astra 自動附全文、附文件通知
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
let deepQ=null;
ctx.teddyDeepAsk=async(sys,q)=>{deepQ=q;return{text:"深度報告稿",label:"Claude Sonnet 5.5"};};ctx.window.teddyDeepAsk=ctx.teddyDeepAsk;
ctx.loadKeys=()=>({google:"G",anthropic:"C"});
vm.runInContext(fs.readFileSync(require('fs').existsSync('js/docs.js')?'js/docs.js':'../js/docs.js','utf8'),ctx);
vm.runInContext(fs.readFileSync('c2t.js','utf8'),ctx);
const T=ctx.__T;
(async()=>{
 ctx.window.teddyDocSave({kind:"text",name:"deck.pptx",format:"PowerPoint",text:"【投影片 1】\n藍帶無花果\n\n【投影片 2】\n要解決的問題\n紙本紀錄容易遺失"});
 await T.startLive();await new Promise(r=>setTimeout(r,80));
 const ws=sockets[sockets.length-1];const setup=ws.sent.find(m=>m.setup);
 const names=(setup.setup.tools||[]).flatMap(t=>(t.functionDeclarations||[]).map(f=>f.name));
 console.log("一般模式語音工具含 read_document:",names.includes("read_document"));
 const sys=JSON.stringify(setup.setup.systemInstruction||"");console.log("語音說明含文件規則:",sys.includes("read_document"));
 console.log("附文件時通知語音:",ctx.window.teddyLiveNotifyDoc(ctx.window.teddyDocCurrent()), JSON.stringify(ws.sent[ws.sent.length-1]).includes("deck.pptx"));
 const before=ws.sent.length;
 await T.parseGeminiMessage(JSON.stringify({toolCall:{functionCalls:[{id:"1",name:"read_document",args:{pages:"2"}}]}}));
 await new Promise(r=>setTimeout(r,50));
 const resp=ws.sent.slice(before).find(m=>m.toolResponse);console.log("read_document 回傳:",JSON.stringify(resp&&resp.toolResponse.functionResponses[0].response).slice(0,160));
 await T.parseGeminiMessage(JSON.stringify({toolCall:{functionCalls:[{id:"2",name:"think_with_astra",args:{question:"幫我把剛才的簡報整理成報告稿"}}]}}));
 await new Promise(r=>setTimeout(r,80));
 console.log("深度引擎拿到全文:",!!deepQ&&deepQ.includes("紙本紀錄容易遺失"));
 process.exit(0);
})();
