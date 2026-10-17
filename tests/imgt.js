const src=require('fs').readFileSync('lt.js','utf8');
const head=src.slice(0,src.indexOf('(async()=>{'));
eval(head+`
(async()=>{
 ctx.Image=class{decode(){return Promise.resolve()} get naturalWidth(){return 2000} get naturalHeight(){return 1000}};
 ctx.document={createElement:()=>({getContext:()=>({drawImage(){}}),toDataURL:()=>"data:image/jpeg;base64,JPG"}),getElementById:()=>null};
 vm.runInContext("",ctx);
 ctx.teddyPendingLiveImage=()=>({kind:"image",name:"a.png",mime:"image/png",data:"PNG"});
 await T.connectGemini(); T.live.active=true; T.live.provider="gemini-live";
 await new Promise(r=>setTimeout(r,500));
 const ws=sockets[sockets.length-1];
 console.log("連線後自動補送照片:",ws.sent.filter(m=>m.realtimeInput&&m.realtimeInput.video).map(m=>m.realtimeInput.video.mimeType+":"+m.realtimeInput.video.data));
 const ok=await ctx.teddyLiveSendImage({kind:"image",name:"b.png",mime:"image/png",data:"PNG"});
 console.log("附件送語音:",ok, JSON.stringify(ws.sent.slice(-2)).slice(0,300));
 console.log("念答案:",ctx.teddyLiveReadAnswer("圖上是四北溫室"), JSON.stringify(ws.sent.slice(-1)).slice(0,200));
 process.exit(0);
})();`);
