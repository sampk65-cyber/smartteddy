/* Smart Teddy 8.8.0 · js/live.js：即時語音（Gemini Live、工具呼叫）
   載入順序：js/core.js → js/greenhouse.js → js/live.js → js/invest.js（一般 <script>，共用同一個全域範圍）。 */

// ===== Smart Teddy 4.4-2：工作模式 Live 聲線 + 工作記憶 =====
(() => {
  "use strict";
  const ui={
    model:document.getElementById("teddyLiveModel"),status:document.getElementById("teddyLiveStatus"),
    start:document.getElementById("teddyLiveStart"),stop:document.getElementById("teddyLiveStop"),
    volume:document.getElementById("teddyLiveVolume"),volumeValue:document.getElementById("teddyLiveVolumeValue")
  };
  const live={active:false,starting:false,manualStop:false,provider:null,ws:null,pc:null,dc:null,stream:null,
    captureCtx:null,captureNode:null,captureSink:null,playCtx:null,outputCtx:null,gainNode:null,compressor:null,remoteAudio:null,playAt:0,sources:new Set(),inputText:"",outputText:"",handledCalls:new Set(),transcriptTimer:null};
  const ENTRY_LABEL={function7:"功能表7／十四表路由",yield:"產能／功能表3",work:"工作1-5／功能表4",calendar:"計畫／功能表5",materials:"耗材6-8／功能表7內層表3",attendance:"打卡／功能表10",photos:"照片／功能表6",trees:"果樹履歷／功能表8",environment:"環境數據／功能表9",people:"人員與帳號／功能表1",guide:"完全體說明",activity:"今日工作總覽"};
  // ===== 5.4 Dual Live Engine telemetry (isolated; no greenhouse/data route changes) =====
  const TEDDY_DUAL_LIVE_USAGE_KEY="teddy_dual_live_usage_v54";
  let teddyDualSession={engine:null,startedAt:0,startBytes:0,timer:null};

  function teddyDualLoadUsage(){
    try{
      return Object.assign({
        "gemini-live":{ms:0,bytes:0,sessions:0},
        "gpt-full-live":{ms:0,bytes:0,sessions:0}
      },JSON.parse(localStorage.getItem(TEDDY_DUAL_LIVE_USAGE_KEY)||"{}"));
    }catch(_){
      return {"gemini-live":{ms:0,bytes:0,sessions:0},"gpt-full-live":{ms:0,bytes:0,sessions:0}};
    }
  }
  function teddyDualSaveUsage(u){try{localStorage.setItem(TEDDY_DUAL_LIVE_USAGE_KEY,JSON.stringify(u));}catch(_){}}
  function teddyDualFormatMs(ms){return (Math.max(0,Number(ms)||0)/60000).toFixed(1);}
  function teddyDualFormatMB(bytes){return (Math.max(0,Number(bytes)||0)/1048576).toFixed(2);}
  async function teddyDualCurrentBytes(){
    let n=0;
    try{
      if(live.pc){
        const stats=await live.pc.getStats();
        stats.forEach(r=>{
          if((r.type==="outbound-rtp"||r.type==="inbound-rtp")&&r.kind==="audio") n+=Number(r.bytesSent||r.bytesReceived||0);
          if(r.type==="data-channel") n+=Number(r.bytesSent||0)+Number(r.bytesReceived||0);
        });
      }
    }catch(_){}
    return n;
  }
  async function teddyDualRenderUsage(){
    const el=document.getElementById("teddyDualLiveUsage"); if(!el)return;
    const u=teddyDualLoadUsage();
    const now=Date.now();
    let gMs=u["gemini-live"]?.ms||0, gBytes=u["gemini-live"]?.bytes||0;
    let oMs=u["gpt-full-live"]?.ms||0, oBytes=u["gpt-full-live"]?.bytes||0;
    if(teddyDualSession.engine&&teddyDualSession.startedAt){
      const extra=now-teddyDualSession.startedAt;
      if(teddyDualSession.engine==="gemini-live")gMs+=extra; else oMs+=extra;
      const cur=await teddyDualCurrentBytes();
      const db=Math.max(0,cur-(teddyDualSession.startBytes||0));
      if(teddyDualSession.engine==="gemini-live")gBytes+=db; else oBytes+=db;
    }
    el.innerHTML=`⚡ Flash：${teddyDualFormatMs(gMs)} 分鐘　${teddyDualFormatMB(gBytes)} MB<br>✨ GPT：${teddyDualFormatMs(oMs)} 分鐘　${teddyDualFormatMB(oBytes)} MB<br><span style="color:#60766e;">流量為瀏覽器可量測值；API 費用仍以供應商帳單為準。</span>`;
  }
  async function teddyDualBegin(engine){
    await teddyDualEnd();
    teddyDualSession.engine=engine;
    teddyDualSession.startedAt=Date.now();
    teddyDualSession.startBytes=await teddyDualCurrentBytes();
    const u=teddyDualLoadUsage(); if(!u[engine])u[engine]={ms:0,bytes:0,sessions:0};
    u[engine].sessions=(u[engine].sessions||0)+1;teddyDualSaveUsage(u);
    clearInterval(teddyDualSession.timer);
    teddyDualSession.timer=setInterval(teddyDualRenderUsage,5000);
    teddyDualRenderUsage();
  }
  async function teddyDualEnd(){
    if(!teddyDualSession.engine||!teddyDualSession.startedAt)return;
    const u=teddyDualLoadUsage(),e=teddyDualSession.engine;
    if(!u[e])u[e]={ms:0,bytes:0,sessions:0};
    u[e].ms=(u[e].ms||0)+(Date.now()-teddyDualSession.startedAt);
    const cur=await teddyDualCurrentBytes();
    u[e].bytes=(u[e].bytes||0)+Math.max(0,cur-(teddyDualSession.startBytes||0));
    teddyDualSaveUsage(u);
    clearInterval(teddyDualSession.timer);
    teddyDualSession={engine:null,startedAt:0,startBytes:0,timer:null};
    teddyDualRenderUsage();
  }
  function teddyDualPaintButtons(){
    const v=ui.model?.value||"gemini-live";
    const a=document.getElementById("teddyEngineFlash"),b=document.getElementById("teddyEngineGPT");
    if(a){
      const on=v==="gemini-live";
      a.style.background=on?"#19342c":"#151c19";a.style.borderColor=on?"#5eead4":"#3b4944";a.style.color=on?"#d9fff2":"#9ba9a2";
    }
    if(b){
      const on=v==="gpt-full-live";
      b.style.background=on?"#29213b":"#151c19";b.style.borderColor=on?"#b9a7ff":"#3b4944";b.style.color=on?"#f0eaff":"#9ba9a2";
    }
  }
  async function teddySelectLiveEngine(engine){
    engine="gemini-live"; // 5.7.1：Flash Live 固定為 TEDDY 的嘴
    if(!ui.model)return;
    if(live.active||live.starting)await disconnectLive();
    ui.model.value=engine;
    localStorage.setItem("teddy_live_model_v39",engine);
    teddyDualPaintButtons();
    setStatus(engine==="gemini-live"?"Flash Live 3.1 · Leda":"GPT‑Live‑1＋Astra · Marin","#9fd8c8");
  }


  function setLiveTrace(text,color="#9fd8c8"){
    const el=document.getElementById("teddyLiveTrace");if(el){el.textContent=text;el.style.color=color;}
  }
  function setStatus(text,color="#86a399"){if(ui.status){ui.status.textContent=text;ui.status.style.color=color;ui.status.style.fontWeight="800";ui.status.style.padding="2px 7px";ui.status.style.borderRadius="999px";ui.status.style.border=`1px solid ${color}`;ui.status.style.background=color==="#5eead4"?"rgba(94,234,212,.10)":(color==="#f0a8a8"||color==="#ff6b6b"?"rgba(255,70,70,.12)":"rgba(232,166,89,.08)");}}
  function setButtons(on){
    ui.start.disabled=on;ui.stop.disabled=!on;ui.model.disabled=on;
    /* 5.9.4：沒對話時左邊亮綠色；對話中左邊變空白、右邊變紅色 */
    const S=ui.start.style,T=ui.stop.style;
    if(on){
      S.background="transparent";S.color="#8fa69d";S.borderColor="#3a4a44";ui.start.textContent="對話中…";
      T.background="#e5484d";T.color="#ffffff";T.borderColor="#e5484d";
    }else{
      S.background="#5eead4";S.color="#07110e";S.borderColor="#5eead4";ui.start.textContent="開始即時對話";
      T.background="transparent";T.color="#6f877e";T.borderColor="#3a4a44";
    }
  }
  function liveVolumeGain(){return Math.max(.6,Math.min(1.6,Number(ui.volume?.value||125)/100));}
  function applyLiveVolume(){
    const pct=Math.round(liveVolumeGain()*100);if(ui.volumeValue)ui.volumeValue.textContent=pct+"%";
    if(live.gainNode)live.gainNode.gain.value=liveVolumeGain();
    localStorage.setItem("teddy_live_volume_v41",String(pct));
  }
  function liveInstructions(){
    const memory=typeof teddyUnifiedMemoryContext==="function"?teddyUnifiedMemoryContext():"";
    const greenhouseOn=document.getElementById("greenhousePanel")?.style.display!=="none";
    const selected=typeof ghSelectedEntry!=="undefined"&&ghSelectedEntry?ghSelectedEntry:null;
    const modeLine=greenhouseOn
      ?`目前在溫室模式${selected?`，使用者已選「${ENTRY_LABEL[selected]}」`:"，尚未選入口"}。溫室問題與後續追問必須使用query_greenhouse；若使用者沒重複主題，沿用已選入口。語音和打字查的是同一套資料：你一定查得到，任何溫室問題都立刻呼叫 query_greenhouse，絕對不可以說「語音查不到」或請使用者改用打字。語音辨識可能聽錯字（例如「四旗北」＝四北、「市北」＝四北），照原句交給工具即可。`
      :"目前在一般模式；禁止自行進入溫室/工作路由。只有使用者明確切換到溫室模式，或明確說『工作／進入工作／溫室模式』後，才可使用溫室工具。";
    return `${typeof teddyPersonaCore==="function"?teddyPersonaCore():"你是 TEDDY，也叫碰氣。"}
【版本與模型（被問到時照實說，不可自己編）】我是 ${typeof TEDDY_VERSION!=="undefined"?TEDDY_VERSION:"Smart Teddy"}。${typeof teddyModelRoutingText==="function"?teddyModelRoutingText():""}\n【即時語音補充】你現在透過 Flash Live 即時語音跟使用者說話；你是 TEDDY 本人，Flash 只是你的嘴。一般聊天直接回答；工具（query_greenhouse、think_with_astra、browse_web）回傳 answer 時，用你的語氣自然念出，數字、單位、分區、期間照原文，不要自己改算。人格設定裡提到的文字工具（音樂、文章、提醒、計時、天氣、新聞等）如果不在你目前的工具清單裡，就直接說這項要改用文字輸入完成，不要假裝已經做了。使用者提到剛剛打字的內容、附件、或你不確定前面聊了什麼時，先呼叫 recall_recent_chat。使用者說到「提醒」（新增、查看、完成、取消）時，一律呼叫 teddy_reminder，把原句放進 text，照工具回覆簡短說一句就好。使用者說你剛才答對了或答錯了（答錯了、不對、應該是…），呼叫 teddy_feedback 記下來，再照他的更正重新回答。使用者附上文件（PPT、PDF、Word、Excel）後，問到內容就先呼叫 read_document 讀，不要只靠記憶或猜；要整理成報告、講稿、逐頁說明或深入分析時，呼叫 think_with_astra（系統會自動把文件全文一起交給深度引擎），拿到結果再用你的語氣說出來。
${memory}
${modeLine}
模式切換是使用者控制的 UI 狀態。一般模式下，除非使用者明確說「工作」、「進入工作」、「工作模式」、「溫室模式」、「工作指派」、「工作回報」或要求 A01 登入，否則不得啟動任何 Hands/工作流程。照片、檔案、網頁、一般聊天，即使內容出現「工作」兩字，也不得自行跳工作路由。只有使用者明確切換或下工作指令時才處理工作。
本次若使用者在文字對話附上圖片/截圖，主文字模型可直接看圖；即時語音本身不要假裝已看到未送入 Realtime 的圖片。若使用者要你查網頁/最新資料，必須呼叫 browse_web。
回答自然精簡，通常1到3句；不要朗讀表情符號。可以被使用者隨時打斷。
聊天、問候、常識、農業知識、單純查資料（行情、天氣、溫室數字、排行），你自己直接回答，不要呼叫 think_with_astra。只有這幾種才呼叫 think_with_astra：①使用者明說「深入分析／仔細想／想清楚／深度思考」；②要在兩個以上方案之間做取捨或比較利弊；③要規劃多步驟計畫或策略；④要推估、試算或預測；⑤寫程式或除錯；⑥盤後報告、大盤解讀、對個股做分析判斷。單純「為什麼」或「要不要帶傘」這類一般問題不算。溫室數字一律用 query_greenhouse 的結果，不自己算。一般模式與溫室模式都遵守。
談到股票時：股票名稱、產業、數字只能來自 query_my_stocks 的結果，不可以自己補充其他股票或產業分類（例如不要把非金融股說成金融股），使用者沒問就不要主動推薦；使用者主動問推薦、該關注哪些股票時，先呼叫 query_my_stocks（把原句放進 question），只能從回傳的「觀察名單」裡挑，說清楚篩選條件，並提醒這是依數據篩出的觀察名單、不是買進建議。使用者問自己的自選股、澎企理財、或他自選的某檔股票今天怎樣時，先呼叫 query_my_stocks 取得程式算好的行情、均價、外資、EPS，數字照念；需要新聞或背景再用 browse_web。其他投資問題若包含股票/ETF代號、價格、拆分/分割、配息、財報、趨勢或投資判斷：必須先呼叫 browse_web 取得最新資料，再把「使用者問題＋browse_web取得的資料」一起交給 think_with_astra。browse_web 失敗時仍可呼叫 think_with_astra，讓其備援核心自行 web_search；不得只回覆搜尋失敗。
凡是詢問真實溫室的產能、工作、計畫、耗材或打卡，必須呼叫query_greenhouse，禁止自己猜資料。
當使用者說「用A01登入／A01登入／登入溫室系統」時，必須呼叫 hands_login；不要自己回答做不到。密碼由網頁本地安全視窗詢問，模型永遠不要求使用者把密碼念出來。
A01登入成功後，先問使用者要「工作指派」還是「工作回報」。工作指派固定路徑：工作入口→溫室→平面圖→區域→工作1–8→復述確認→寫入。工作回報固定路徑：工作入口→功能表4→溫室→年月→回報項目。所有這些口述與「確認／取消」都必須把原句交給 hands_command；不得自己猜路徑。
主要入口：產能=yield；工作1-5=work；計畫=calendar；耗材6-8=materials；打卡=attendance（功能表10）；照片=photos（功能表6）；果樹履歷=trees（功能表8）；溫室內環境數據=environment（功能表9，與表五戶外氣候不同）；人員與帳號=people（功能表1）；問完全體怎麼用、怎麼算、是什麼＝guide（不查數字）；問某天某區做了什麼、還有什麼待做＝activity（不是計畫）。
功能表7「耗材與報表」（功能7→年份→月份→表格）共有十四張表：表一耗材匯總表（各區補水／施肥／資材已確認合計）、表二年度計畫表（產季）、表三分區耗材統計（單一分區逐日）、表四留言版內容、表五氣候資料（神岡站逐時）、表六施肥用量統計（施肥月曆的肥料品項）、表七長週期產能趨勢（2020起每15天）、表八分區資材投入與產能對比、表九氣候變遷與產能、表十登入IP與時間、表十一溫室用量側寫（單一溫室11項用量組成）、表十二細項跨溫室對比（單一細項比較各溫室）、表十三氣候與資材投入（溫度分級／雨天與補水施肥）、表十四產能×資材×雨量。問到任何一張表一律呼叫 query_greenhouse 並指定 entry=function7，把使用者原句完整放進 question，不得改走別的功能表。
溫室模式中，凡是真實數字、紀錄、統計、趨勢問題，以及「功能表7有幾張表／有哪些表」這類問題，都必須先呼叫 query_greenhouse，不可自己回答、不可說看不到畫面、不可反問使用者要哪張表而不先查。使用者的語音逐字稿可能是簡體字，照樣理解，回答一律用繁體中文。工具回傳 ok:false 時，直接用一句話說出失敗原因，並建議縮小範圍（指定年份、月份或分區）再查；不要說去找別人幫忙。
溫室模式只有一個資料入口：query_greenhouse。使用者說「答對了」「答錯了」「不對，應該看…」「我是問…」「學習紀錄」時，也必須把原句完整交給 query_greenhouse，由程式記錄對錯並重新查。溫室數字只能照工具結果轉述，連同日期範圍一起說，不可自己改數字、不可沿用上一題的數字、也不可說「幫你記住了」這種沒有發生的事，每一題都要重新呼叫工具。但語氣維持你原本的 TEDDY 人設：可以用一句自然、溫暖的話開頭或收尾（例如「孫爸，我看了一下～」「要不要我再幫你看哪一區？」），數字的部分照實說就好；不要像在念報表。稱呼照平常用「你」或「孫爸」，不要突然改成「您」，查資料前可以先輕鬆說一句「我看一下喔」。功能在哪裡、路徑怎麼走也用它問。溫室模式中不瀏覽網頁、不讀畫面、不交給 Astra、不自己推測；工具回什麼就照著說。你看不到螢幕，不要說你看到按鈕或畫面。
工具回傳的結構化資料與計算結果優先於對話記憶。查不到就直接說不知道。`;
  }
  const greenhouseTool={
    name:"query_greenhouse",description:"溫室模式唯一的資料工具：所有完全體 V5.1.C132 的資料、統計、趨勢、功能在哪裡的問題都用它，程式會自己走固定路由。功能表7十表：耗材匯總、年度計畫、分區耗材、留言版、氣候資料、施肥用量統計、長週期產能趨勢、資材投入與產能、氣候與產能、登入IP、溫室用量側寫、細項跨溫室對比、氣候與資材投入、產能×資材×雨量，一律 entry=function7；其他：產能=yield、工作1-5=work、計畫=calendar、耗材6-8=materials、打卡=attendance、照片=photos、果樹履歷=trees、溫室內環境數據=environment、人員與帳號=people。question 必須放使用者原句。",
    parameters:{type:"object",properties:{entry:{type:"string",enum:["function7","yield","work","calendar","materials","attendance","photos","trees","environment","people","guide","activity"]},question:{type:"string"}},required:["question"]}
  };
  const astraThinkTool={
    name:"think_with_astra",description:"只在真正需要深度思考時使用：使用者明說要深入分析／仔細想；方案取捨或比較利弊；多步驟規劃或策略；推估、試算、預測；寫程式或除錯；盤後報告、大盤解讀或個股分析判斷。聊天、常識、單純查資料不要用。把使用者原句和已取得的資料放進 question，拿到結論後用你的語氣自然說出來。",
    parameters:{type:"object",properties:{question:{type:"string"}},required:["question"]}
  };
  const handsLoginTool={
    name:"hands_login",description:"使用者要求用 A01 登入溫室系統時使用。此工具會在網頁本地跳出密碼輸入視窗並直接驗證 V5.1 帳號；模型不得要求使用者把密碼說出來。",
    parameters:{type:"object",properties:{account:{type:"string",enum:["A01"]}},required:[]}
  };
  const handsCommandTool={
    name:"hands_command",description:"只有使用者明確說要「指派」工作（或回答指派的補問、說確認／取消）時才使用；使用者每一句補充（例如「一公斤」）都要原句再呼叫一次本工具；有草稿等待確認時，使用者說「好、對、可以、沒錯」也要原句交給本工具；「照上次」「配方」相關的話也交給本工具。復述與缺漏一律照工具回傳的內容說（語氣可以照你的人設，但數字和品項不能改），禁止自己補數字或自己說「資訊齊了請確認」；工具說還缺什麼就只問那一項。一般提問一律用 query_greenhouse。處理 V5.1 工作入口操作：登入後的工作指派/工作回報選擇、指派路徑（溫室→平面圖→區域→工作1-8）、回報路徑（功能表4→溫室→年月→回報項目）、確認寫入或取消。必須把使用者原句完整傳入 command。",
    parameters:{type:"object",properties:{command:{type:"string"}},required:["command"]}
  };
  const browseWebTool={
    name:"browse_web",description:"需要瀏覽網頁、查最新資料、讀取使用者貼上的網站/網址或核對線上資訊時必須使用。若使用者提供 URL，query 必須保留完整 URL，並要求實際讀取該頁面內容。",
    parameters:{type:"object",properties:{query:{type:"string"}},required:["query"]}
  };
  const reminderTool={
    name:"teddy_reminder",description:"處理所有「提醒」相關的話：新增提醒、查看提醒、完成或取消提醒。把使用者原句完整放進 text。新增有時間的提醒時，畫面上會出現加到行事曆的按鈕。",
    parameters:{type:"object",properties:{text:{type:"string"}},required:["text"]}
  };
  const docTool={
    name:"read_document",description:"讀取使用者附上的文件（PowerPoint、PDF、Word、Excel 等）的內容。使用者問到剛才附的檔案、簡報、投影片、第幾頁、文件內容時先呼叫。pages 可填頁數範圍，例如 \"3\" 或 \"5-9\"；不填就讀全部（太長會只回前段）。",
    parameters:{type:"object",properties:{pages:{type:"string"}},required:[]}
  };
  const feedbackTool={
    name:"teddy_feedback",description:"使用者說你剛才答對了或答錯了（例如「答對了」「答錯了」「不對，應該是…」「你說錯了」）時呼叫，記錄回饋給孫爸檢討用。verdict 填「對」或「錯」；correction 放使用者說的正確內容（沒有就空白）。",
    parameters:{type:"object",properties:{verdict:{type:"string",enum:["對","錯"]},correction:{type:"string"}},required:["verdict"]}
  };
  const recallChatTool={
    name:"recall_recent_chat",description:"讀取文字輸入與即時語音共用的最近對話紀錄（包含使用者打字的內容、附件摘要與 TEDDY 的文字回覆）。使用者提到剛剛打的字、前面說的事、那個檔案，或你不確定上下文時先呼叫。",
    parameters:{type:"object",properties:{count:{type:"integer"}},required:[]}
  };
  const inspectV51PageTool={
    name:"inspect_v51_page",
    description:"讀取目前 Teddy 頁面內嵌的完全體 V5.1.C132 溫室介面結構、目前可見文字、按鈕、表格/入口與固定路由。當使用者問『這個網頁有什麼』『現在在哪個功能』『功能表/表格/路線怎麼走』『V5.1.C132內容』時必須先用這個工具，不准憑記憶猜。",
    parameters:{type:"object",properties:{question:{type:"string"}},required:[]}
  };
  function teddyInspectV51Page(question=""){
    const root=document.getElementById("greenhousePanel")||document.body;
    const visible=[];
    const nodes=[...root.querySelectorAll("h1,h2,h3,h4,button,[role=button],label,th,td,summary,.cap-title,.name,.vendor")];
    for(const el of nodes){
      const st=getComputedStyle(el);
      if(st.display==="none"||st.visibility==="hidden")continue;
      const t=String(el.innerText||el.textContent||"").replace(/\s+/g," ").trim();
      if(t && t.length<=140 && !visible.includes(t))visible.push(t);
      if(visible.length>=120)break;
    }
    const routeMap={
      version:"完全體 V5.1.C132 路由知識層（功能7 十四表）",
      mode:window.TEDDY_APP_MODE||"general",
      main:{
        "產能":"功能表3／產能資料",
        "工作":"工作入口→溫室→平面圖→區域→工作1–8；回報走功能表4",
        "計畫":"功能表5／年度計畫",
        "施肥":"耗材6-8已確認用量＝功能表7表一（全場合計）／表三（分區逐日）；施肥月曆的肥料品項＝表六",
        "打卡":"功能表10／出勤打卡"
      },
      function7:(typeof F7_TABLES!=="undefined")?Object.fromEntries(Object.values(F7_TABLES).map(x=>[`表${x.no}`,`${x.name}：${x.desc}（來源：${x.source}）`])):{},
      workAssign:"A01登入→工作指派→溫室→平面圖→區域→工作1–8→復述→確認→寫入",
      workReport:"A01登入→工作回報→功能表4→溫室→年月→回報項目→復述→確認→寫入"
    };
    return {ok:true,question:String(question||""),routeMap,visibleUi:visible,currentUrl:location.href};
  }
  async function liveBrowseWeb(query){
    const key=loadKeys().openai;if(!key)return{ok:false,error:"尚未設定 OpenAI API Key"};
    const r=await teddyFetch("https://api.openai.com/v1/responses",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${key}`},body:JSON.stringify({model:"gpt-5.6-sol",reasoning:{effort:"medium"},tools:[{type:"web_search"}],input:[{role:"developer",content:[{type:"input_text",text:"你是 Teddy 的網頁瀏覽核心。使用繁體中文。若 query 含 URL，必須優先嘗試讀取/搜尋該網址本身及可索引內容；若網站需要登入、遭權限/robots/付費牆阻擋，要明確說明。不可只根據網址字串猜測。根據實際取得的網頁內容回答；找不到就明說。回覆精簡，供即時語音朗讀。"}]},{role:"user",content:[{type:"input_text",text:String(query||"")}]}]})},90000);
    const d=await r.json();if(!r.ok)throw new Error(d?.error?.message||`Web HTTP ${r.status}`);
    if(d.usage)teddyRecordChatUsage("openai",{input:d.usage.input_tokens||0,cached:d.usage.input_tokens_details?.cached_tokens||0,output:d.usage.output_tokens||0,apiCalls:1,costUsd:teddyAstraUsageCost(d.usage)});
    const answer=(d.output_text||((d.output||[]).flatMap(x=>x.content||[]).filter(x=>x.type==="output_text").map(x=>x.text||"").join("\n"))).trim();
    return{ok:true,answer:answer||"網頁搜尋沒有回傳文字。"};
  }
  async function liveAstraThink(question){
    const keys0=loadKeys();if(!keys0.openai&&!keys0.anthropic)return{ok:false,error:"尚未設定深度思考用的 OpenAI 或 Claude API Key"};
    const key=keys0.openai;
    let q=String(question||"");
    // 8.8.0：有附文件、而且問題跟文件有關（或文件是 30 分鐘內才附的），把全文一起交給深度引擎
    try{const d=typeof window.teddyDocCurrent==="function"?window.teddyDocCurrent():null;if(d&&(window.teddyDocRefers(q)||Date.now()-d.at<30*60*1000)){q+="\n\n"+window.teddyDocBlock(d);setLiveTrace(`🧠 連同文件「${d.name}」交給深度思考…`,"#e8c879");}}catch(_){}
    try{
      if(typeof window.teddyDeepAsk!=="function")throw new Error("深度思考模組未載入");
      const res=await window.teddyDeepAsk("你是 Teddy 的深度推理核心。使用繁體中文，先給結論，再給必要理由；內容會交回即時語音模型朗讀。",q,"high");
      if(!res.text)throw new Error(res.label+" 沒有回傳文字");
      return{ok:true,answer:res.text,engine:res.label};
    }catch(astraErr){
      if(!key)return{ok:false,error:"深度思考失敗："+astraErr.message};
      const r=await teddyFetch("https://api.openai.com/v1/responses",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${key}`},body:JSON.stringify({model:"gpt-5.6-sol",reasoning:{effort:"high"},tools:[{type:"web_search"}],input:[{role:"developer",content:[{type:"input_text",text:"你是 Teddy 的 Astra 備援核心。使用繁體中文；若問題涉及投資或最新資訊，先用 web_search 查證再分析。回答精簡供語音朗讀。"}]},{role:"user",content:[{type:"input_text",text:q}]}]})},90000);
      const d=await r.json();if(!r.ok)throw new Error(`深度思考失敗：${astraErr.message}；備援也失敗：${d?.error?.message||r.status}`);
      const answer=(d.output_text||((d.output||[]).flatMap(x=>x.content||[]).filter(x=>x.type==="output_text").map(x=>x.text||"").join("\n"))).trim();
      return{ok:true,answer:answer||"備援模型沒有回傳文字。",fallback:true};
    }
  }

  async function runLiveTool(name,args){
    if(name==="hands_login"){
      setLiveTrace("🔐 Teddy 正在開啟 A01 本地登入驗證…","#e8c879");
      try{const r=await teddyHandsLogin("A01");setLiveTrace(r.ok?"✓ A01 已登入，可以下達設定指令。":"A01 登入未完成。",r.ok?"#5eead4":"#f0a8a8");return r;}catch(e){setLiveTrace("A01 登入失敗："+e.message,"#f0a8a8");return{ok:false,error:e.message};}
    }
    if(name==="hands_command"){
      const command=String(args?.command||"").trim();
      if(!command)return{ok:false,error:"缺少操作指令"};
      try{const r=await teddyHandsHandle(command);if(!r?.handled)return{ok:false,error:"這句話沒有形成可執行的 V5.1 設定，請補充分區、功能表、工項/資材與數值。"};if(r.reply){rememberTurn("assistant",r.reply);setLiveTrace(r.reply.slice(0,180),"#9fd8c8");}return{ok:true,answer:r.reply};}catch(e){return{ok:false,error:e.message};}
    }
    if(name==="browse_web"){setLiveTrace("🌐 Teddy 正在瀏覽網頁…","#e8c879");try{const r=await liveBrowseWeb(args?.query||"");setLiveTrace("🌐 網頁資料已取得，Teddy 正在回答。","#5eead4");return r;}catch(e){setLiveTrace("網頁瀏覽失敗："+e.message,"#f0a8a8");return{ok:false,error:e.message};}}
    if(name==="think_with_astra"){setLiveTrace("🧠 複雜問題已交給深度思考引擎…","#e8c879");try{const r=await liveAstraThink(args?.question||"");setLiveTrace("🧠 Astra 思考完成，Teddy 正在回答。","#5eead4");return r;}catch(e){setLiveTrace("Astra 思考失敗："+e.message,"#f0a8a8");return{ok:false,error:e.message};}}
    if(name==="inspect_v51_page"){
      setLiveTrace("🔎 Teddy 正在讀取 V5.1.C132 畫面與路由…","#e8c879");
      try{const r=teddyInspectV51Page(args?.question||"");setLiveTrace("✓ V5.1.C132 畫面結構已讀取。","#5eead4");return r;}catch(e){return{ok:false,error:e.message};}
    }
    if(name==="teddy_reminder"){
      try{
        const r=window.teddyReminderHandle(String(args?.text||""));
        if(!r||!r.handled)return{ok:false,error:"這句話不是提醒指令"};
        if(r.reminder&&r.reminder.due){
          const div=teddyAppendLog("teddy",`📅 ${r.reply}`);
          window.teddyRemAttachButton(div,r.reminder);
        }
        return{ok:true,answer:r.reply};
      }catch(e){return{ok:false,error:e.message};}
    }
    if(name==="query_my_stocks"){
      try{
        const q=String(args?.question||"");
        const data=typeof window.teddyInvestQuery==="function"?await window.teddyInvestQuery(q):"";
        return data?{ok:true,data}:{ok:false,error:"這句話對不到澎企理財裡的自選股；可以請使用者說股票名稱，或用 browse_web 查。"};
      }catch(e){return{ok:false,error:e.message};}
    }
    if(name==="read_document"){
      try{const r=typeof window.teddyDocRead==="function"?window.teddyDocRead(args?.pages||""):{ok:false,error:"文件記憶未載入"};setLiveTrace(r.ok?`📄 讀取文件：${r.name}（${r.range}）`:"沒有可讀的文件","#5eead4");return r;}catch(e){return{ok:false,error:e.message};}
    }
    if(name==="teddy_feedback"){
      try{const ok=typeof window.teddyFbVoice==="function"&&window.teddyFbVoice(args?.verdict,args?.correction||"");setLiveTrace(ok?"📝 已記錄回饋":"回饋紀錄無法使用","#5eead4");return ok?{ok:true,answer:args?.verdict==="對"?"記下了，這題答對。":"記下了，這題答錯"+(args?.correction?"，也記下你的更正。":"。哪裡不對可以再告訴我。")}:{ok:false,error:"回饋紀錄無法使用"};}catch(e){return{ok:false,error:e.message};}
    }
    if(name==="recall_recent_chat"){
      const n=Math.max(4,Math.min(30,Number(args?.count)||12));
      const turns=(typeof teddyHistory!=="undefined"?teddyHistory:[]).slice(-n).map(h=>({role:h.role==="user"?"使用者":"TEDDY",via:h.source==="live"?"語音":"文字",text:String(h.text||"").slice(0,700)}));
      return{ok:true,turns};
    }
    if(name==="query_greenhouse"){
      const question=String(args?.question||"");
      try{
        const status=document.getElementById("greenhouseStatus"),hint=document.getElementById("ghEntryHint");
        if(status)status.textContent="即時語音查詢中…";
        setLiveTrace(`已聽懂：${question}\n步驟：走固定路由讀取完全體資料…`,"#e8c879");
        const res=await window.teddyGreenhouseAsk(question,ENTRY_LABEL[args?.entry]?args.entry:null);
        const meta=(typeof GH_ENTRY_META!=="undefined"&&res.entry)?GH_ENTRY_META[res.entry]:null;
        if(meta){
          if(typeof ghEntrySelectToken!=="undefined")ghEntrySelectToken++;
          if(typeof ghSelectedEntry!=="undefined")ghSelectedEntry=res.entry;
          if(typeof ghSetEntryButtonState==="function")ghSetEntryButtonState(res.entry);
          if(hint)hint.textContent=`目前：${meta.label}。`;
        }
        if(status)status.textContent=meta?`${meta.label}｜${meta.table}`:(res.entry==="route-map"?"固定路由":"請指定入口");
        if(typeof ghLog==="function")ghLog("assistant",res.answer);
        setLiveTrace(`讀取完成。\nTeddy 正在回答：${String(res.answer).slice(0,180)}`,"#9fd8c8");
        return{ok:res.ok,entry:meta?.label||res.entry,answer:res.answer};
      }
      catch(e){
        console.error("query_greenhouse 失敗",e);
        setLiveTrace(`查詢失敗：${e.message}`,"#f0a8a8");
        const st=document.getElementById("greenhouseStatus");if(st)st.textContent=`查詢失敗：${e.message}`;
        return{ok:false,error:e.message,say:`這次查詢失敗，原因是：${e.message}`};
      }
    }
    return{ok:false,error:"未知工具："+name};
  }
  function rememberTurn(role,text){
    const clean=String(text||"").trim();if(!clean)return;
    try{
      const last=teddyHistory[teddyHistory.length-1];
      if(last&&last.role===role&&String(last.text).trim()===clean)return;
      const greenhouseOn=document.getElementById("greenhousePanel")?.style.display!=="none";
      // 6.8.0：一般模式與溫室模式的對話分開——各自顯示、各自記錄，互不出現在對方畫面。
      teddyHistory.push({role,text:clean,source:"live",mode:greenhouseOn?"greenhouse":"general",at:Date.now()});
      teddySaveHistory();
      if(greenhouseOn){if(typeof ghLog==="function")ghLog(role==="user"?"user":"assistant",clean);}
      else teddyAppendLog(role==="user"?"user":"teddy",clean);
    }catch(_){}
  }
  function flushGeminiTurn(){
    if(live.transcriptTimer){clearTimeout(live.transcriptTimer);live.transcriptTimer=null;}
    const heard=live.inputText.trim(),said=live.outputText.trim(),toolUsed=!!live.turnToolCalled,echo=!!live.echoPending;
    if(heard){rememberTurn("user",live.inputText);window.__teddyLiveUserSeq=(window.__teddyLiveUserSeq||0)+1;}
    if(said){if(echo){/* 念出已記錄的溫室答案，不重複寫入 */}else rememberTurn("assistant",live.outputText);}
    live.inputText="";live.outputText="";
    if(said)live.turnToolCalled=false;
    if(live.ix){live.ix.heard+=heard?(live.ix.heard?" ":"")+heard:"";live.ix.said+=said?(live.ix.said?" ":"")+said:"";live.ix.tool=live.ix.tool||toolUsed;live.ix.echo=live.ix.echo||echo;}
    // 3.1：一輪說完就判斷；3.8：等 interactionStatus=IDLE 再判斷（中間它會先說「我查一下」）。
    if(live.variantActive!=="38et")teddyVoiceSafetyFinish();
  }
  // 6.9.0 語音保險：溫室模式下，語音模型沒有呼叫查詢工具就自己回答（例如說「查不到、請打字」），
  // 程式直接用同一句話走跟打字完全相同的查詢，畫面顯示正確答案，再用語音念出來。
  function teddyVoiceSafetyFinish(){
    const ix=live.ix||{heard:"",said:"",tool:false,echo:false};
    // 還沒聽到 Teddy 回答（只聽到使用者）就先保留，等回答出來再一起判斷。
    if(!String(ix.said||"").trim()){live.ix=ix;return;}
    live.ix={heard:"",said:"",tool:false,echo:false};
    const heard=ix.heard.trim(),said=ix.said.trim(),toolUsed=ix.tool,echo=ix.echo;
    if(window.TEDDY_APP_MODE==="greenhouse"&&heard&&said&&!toolUsed&&!echo&&typeof window.teddyGreenhouseAsk==="function"){
      const refused=/查不到|打字|文字輸入|文字對話|用文字|無法(?:查|讀)|沒辦法查|不能查|看不到.{0,6}資料/.test(said);
      const feedback=/^(?:答對|答錯|對了|不對|錯了|應該|我是問|學習紀錄)/.test(heard.replace(/\s+/g,""));
      const route=typeof window.teddyGhLocalRoute==="function"?window.teddyGhLocalRoute(heard):null;
      if(refused&&!feedback&&!route){
        const fix="不用喔，語音和打字查的是同一套完全體資料，直接說就可以，例如「四北這個月施肥」「今天四北做了什麼」。";
        if(typeof ghLog==="function")ghLog("assistant",fix);
        rememberTurn("assistant",fix);
        if(typeof window.teddyLiveSpeak==="function")window.teddyLiveSpeak(fix);
      }else if(refused||feedback||route){
        (async()=>{
          try{
            setLiveTrace("語音模型沒有查資料，改由程式直接查詢完全體…","#e8c879");
            const res=await window.teddyGreenhouseAsk(heard.replace(/\s+/g,""));
            if(!res||!res.answer)return;
            if(typeof ghLog==="function")ghLog("assistant","（已改由程式查詢）"+res.answer);
            rememberTurn("assistant",res.answer);
            if(typeof window.teddyLiveSpeak==="function")window.teddyLiveSpeak(res.answer);
          }catch(e){console.warn("語音保險查詢失敗",e);}
        })();
      }
    }
  }

  function scheduleGeminiTranscriptFlush(delay=850){
    if(live.variantActive==="38et")delay=Math.max(delay,6000);
    // Gemini 的 outputTranscription 偶爾會比 turnComplete 晚到；延後少許只影響文字紀錄，不碰音訊播放。
    if(live.transcriptTimer)clearTimeout(live.transcriptTimer);
    live.transcriptTimer=setTimeout(()=>flushGeminiTurn(),delay);
  }
  function bytesToBase64(bytes){let s="";const step=0x8000;for(let i=0;i<bytes.length;i+=step)s+=String.fromCharCode(...bytes.subarray(i,i+step));return btoa(s);}
  function base64ToBytes(s){const b=atob(s),a=new Uint8Array(b.length);for(let i=0;i<b.length;i++)a[i]=b.charCodeAt(i);return a;}
  function downsamplePCM(input,inRate,outRate=16000){
    if(inRate===outRate){const out=new Int16Array(input.length);for(let i=0;i<input.length;i++)out[i]=Math.max(-32768,Math.min(32767,input[i]*32767));return new Uint8Array(out.buffer);}
    const ratio=inRate/outRate,len=Math.max(1,Math.floor(input.length/ratio)),out=new Int16Array(len);
    for(let i=0;i<len;i++){const a=Math.floor(i*ratio),b=Math.min(input.length,Math.floor((i+1)*ratio));let sum=0;for(let j=a;j<b;j++)sum+=input[j];out[i]=Math.max(-32768,Math.min(32767,(sum/Math.max(1,b-a))*32767));}
    return new Uint8Array(out.buffer);
  }
  async function startGeminiCapture(stream,ws){
    const Ctx=window.AudioContext||window.webkitAudioContext;live.captureCtx=new Ctx({latencyHint:"interactive"});
    const src=live.captureCtx.createMediaStreamSource(stream),node=live.captureCtx.createScriptProcessor(2048,1,1);live.captureNode=node;
    node.onaudioprocess=e=>{if(ws.readyState!==1)return;const pcm=downsamplePCM(e.inputBuffer.getChannelData(0),live.captureCtx.sampleRate);ws.send(JSON.stringify({realtimeInput:{audio:{mimeType:"audio/pcm;rate=16000",data:bytesToBase64(pcm)}}}));};
    // ScriptProcessor 必須接到輸出才會被瀏覽器驅動，但絕不能把麥克風送到喇叭。
    // 用 0 gain sink 可避免監聽回授、爆音或短促 bi 聲。
    const sink=live.captureCtx.createGain();sink.gain.value=0;live.captureSink=sink;src.connect(node);node.connect(sink);sink.connect(live.captureCtx.destination);
  }
  function stopGeminiAudio(){for(const s of live.sources){try{s.stop();}catch(_){}}live.sources.clear();live.playAt=0;}
  function playGeminiPCM(base64,rate=24000){
    const bytes=base64ToBytes(base64),view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),samples=new Float32Array(Math.floor(bytes.byteLength/2));
    for(let i=0;i<samples.length;i++)samples[i]=view.getInt16(i*2,true)/32768;
    const Ctx=window.AudioContext||window.webkitAudioContext;if(!live.playCtx){
      live.playCtx=new Ctx({latencyHint:"interactive"});live.gainNode=live.playCtx.createGain();
      live.gainNode.gain.value=Math.min(0.92,liveVolumeGain());
      live.compressor=live.playCtx.createDynamicsCompressor();live.compressor.threshold.value=-12;live.compressor.knee.value=12;live.compressor.ratio.value=4;live.compressor.attack.value=0.003;live.compressor.release.value=0.12;
      live.gainNode.connect(live.compressor);live.compressor.connect(live.playCtx.destination);
    }
    const buf=live.playCtx.createBuffer(1,samples.length,rate);buf.copyToChannel(samples,0);const src=live.playCtx.createBufferSource();src.buffer=buf;
    const edge=live.playCtx.createGain();src.connect(edge);edge.connect(live.gainNode);
    const now=live.playCtx.currentTime,start=Math.max(now+0.015,live.playAt||now+0.015),fade=Math.min(0.006,buf.duration/4);
    edge.gain.setValueAtTime(0,start);edge.gain.linearRampToValueAtTime(1,start+fade);edge.gain.setValueAtTime(1,Math.max(start+fade,start+buf.duration-fade));edge.gain.linearRampToValueAtTime(0,start+buf.duration);
    src.start(start);live.playAt=start+buf.duration-0.002;live.sources.add(src);src.onended=()=>{live.sources.delete(src);try{edge.disconnect();}catch(_){}};
  }
  async function parseGeminiMessage(raw){
    const text=raw instanceof Blob?await raw.text():String(raw),m=JSON.parse(text);
    if(m.setupComplete){live.setupOk=true;setStatus(`${(GLIVE_VARIANTS[live.variantActive]||GLIVE_VARIANTS["31"]).label}・正在聽`, "#5eead4");setLiveTrace("狀態：已連線，正在聽你說話。","#5eead4");try{const pi=typeof window.teddyPendingLiveImage==="function"&&window.teddyPendingLiveImage();if(pi){let n=0;const tryImg=async()=>{if(await window.teddyLiveSendImage(pi,false))return;if(++n<15)setTimeout(tryImg,300);};setTimeout(tryImg,300);}}catch(_){}return;}
    if(m.serverContent){
      const sc=m.serverContent;if(sc.interrupted)stopGeminiAudio();
      if(sc.inputTranscription?.text){live.inputText+=sc.inputTranscription.text;setLiveTrace(`你正在說：${live.inputText}`,"#d8fff1");scheduleGeminiTranscriptFlush(1200);}
      if(sc.outputTranscription?.text){live.outputText+=sc.outputTranscription.text;setLiveTrace(`Teddy 正在回答：${live.outputText}`,"#9fd8c8");scheduleGeminiTranscriptFlush(950);}
      for(const p of sc.modelTurn?.parts||[]){
        if(p?.text && !String(p.text).startsWith("{") && !live.outputText.includes(String(p.text))){live.outputText+=String(p.text);scheduleGeminiTranscriptFlush(950);}
        const d=p.inlineData||p.inline_data;if(d?.data&&String(d.mimeType||d.mime_type||"").includes("audio"))playGeminiPCM(d.data,24000);
      }
      if(live.variantActive==="38et"){
        // 3.8：turnComplete 不代表結束（可能還在想或等工具），要等 interactionStatus=IDLE。
        if(sc.turnComplete)scheduleGeminiTranscriptFlush(1100);
        if(sc.interactionStatus==="IDLE"){flushGeminiTurn();teddyVoiceSafetyFinish();if(live.echoPending)setTimeout(()=>{live.echoPending=false;},1600);}
      }else if(sc.turnComplete){scheduleGeminiTranscriptFlush(1100);if(live.echoPending)setTimeout(()=>{live.echoPending=false;},1600);}
    }
    if(m.toolCall?.functionCalls){
      live.turnToolCalled=true;if(live.ix)live.ix.tool=true;
      setLiveTrace("已理解問題。正在選擇溫室入口並讀取真實資料…","#e8c879");
      const responses=[];for(const c of m.toolCall.functionCalls){const result=await runLiveTool(c.name,c.args||{});responses.push({id:c.id,name:c.name,response:result});}
      live.ws?.send(JSON.stringify({toolResponse:{functionResponses:responses}}));
    }
  }
  const myStocksTool={
    name:"query_my_stocks",description:"使用者問到台股個股或 ETF（自選或不在自選都可以）、外資／投信／三大法人買超賣超排行（例如外資買超前30）、大盤（加權指數、法人、期貨外資、融資）、盤後報告、自選週檢（每週評分、本週變化、下週觀察名單）、使用者問推薦或該關注哪些股票、澎企理財、某一檔股票今天怎樣、漲跌、均價、外資買賣超、EPS、本益比時，先呼叫這個工具，把使用者原句放進 question。回傳的數字照原樣說，不可自己改或補；使用者要深入分析或建議時，再把這份資料連同問題交給 think_with_astra。不要叫使用者買或賣。",
    parameters:{type:"object",properties:{question:{type:"string"}},required:["question"]}
  };
  function liveToolDeclarations(){
    const greenhouse=(window.TEDDY_APP_MODE==="greenhouse");
    return greenhouse
      ? [greenhouseTool,handsLoginTool,handsCommandTool,recallChatTool,reminderTool,feedbackTool]
      : [myStocksTool,astraThinkTool,browseWebTool,recallChatTool,reminderTool,feedbackTool,docTool];
  }
  function liveOpenAITools(){return liveToolDeclarations().map(t=>({type:"function",...t}));}

  // ===== Smart Teddy 8.6.0：語音引擎可選 Gemini 3.8 Live 深度思考版（預設）或 3.1 Flash Live（原本）=====
  const TEDDY_GLIVE_KEY="teddy_gemini_live_variant_v705"; // 7.2.0：舊的「自動／3.8」選擇不沿用，一律回到 3.1
  const GLIVE_VARIANTS={
    "38et":{model:"models/gemini-3.8-live-extended-thinking",label:"Gemini 3.8 Live 深度思考"},
    "31":{model:"models/gemini-3.1-flash-live-preview",label:"Gemini 3.1 Flash Live"}
  };
  // 7.0.2：3.8 實測聲音卡頓、斷句零碎，預設改回 3.1；3.8 保留為實驗選項（舊的 v70 選擇不沿用）。
  // 7.2.0：實機 3.8 在溫室模式答非所問、聲音換人、語氣變冷，取消「自動」；一般與溫室都用 3.1，3.8 只留作手動實驗。
  function gliveChoice(){let v="31";try{v=localStorage.getItem(TEDDY_GLIVE_KEY)||"31";}catch(_){}return GLIVE_VARIANTS[v]?v:"31";}
  function gliveVariant(){return gliveChoice();}
  window.teddyGliveVariantLabel=function(){return GLIVE_VARIANTS[live.variantActive||gliveVariant()].label;};
  function gliveSetup(variant){
    const v=GLIVE_VARIANTS[variant];
    const decls=liveToolDeclarations().map(d=>variant==="38et"?{...d,behavior:"NON_BLOCKING"}:d);
    // 3.8 深度思考：溫室模式想深一點（查資料更準），一般聊天想淺一點（回得快）；3.1 維持原本的 minimal。
    const thinking=variant==="38et"?{thinkingLevel:window.TEDDY_APP_MODE==="greenhouse"?"medium":"low"}:{thinkingLevel:"minimal"};
    return {setup:{model:v.model,generationConfig:{responseModalities:["AUDIO"],thinkingConfig:thinking,speechConfig:{voiceConfig:{prebuiltVoiceConfig:{voiceName:"Leda"}}}},systemInstruction:{parts:[{text:liveInstructions()}]},tools:[{functionDeclarations:decls}],inputAudioTranscription:{},outputAudioTranscription:{}}};
  }
  async function connectGemini(variantOverride){
    const key=loadKeys().google;if(!key)throw new Error("尚未設定Gemini API Key");
    live.stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}});
    const url=`wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${encodeURIComponent(key)}`;
    const ws=new WebSocket(url);live.ws=ws;live.provider="gemini-live";
    await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error("Gemini Live連線逾時")),12000);ws.onopen=()=>{clearTimeout(timer);resolve();};ws.onerror=()=>{clearTimeout(timer);reject(new Error("Gemini Live連線失敗"));};});
    ws.onmessage=e=>{if(live.ws!==ws)return;parseGeminiMessage(e.data).catch(err=>setStatus("Gemini訊息錯誤："+err.message,"#f0a8a8"));};
    ws.onclose=()=>{if(live.active&&!live.manualStop)setStatus("Gemini Live已斷線，請重新連線","#e8a659");};
    const variant=variantOverride||gliveVariant();
    live.variantActive=variant;live.setupOk=false;live.ix={heard:"",said:"",tool:false,echo:false};
    ws.send(JSON.stringify(gliveSetup(variant)));
    // 等伺服器回 setupComplete；新模型不接受設定時會直接斷線，這裡就能抓到並改用 3.1。
    await new Promise((resolve,reject)=>{
      const t0=Date.now();
      const chk=setInterval(()=>{
        if(live.setupOk){clearInterval(chk);resolve();}
        else if(ws.readyState>1){clearInterval(chk);reject(new Error(`${GLIVE_VARIANTS[variant].label} 不接受連線設定`));}
        else if(Date.now()-t0>10000){clearInterval(chk);reject(new Error(`${GLIVE_VARIANTS[variant].label} 回應逾時`));}
      },100);
    });
    await startGeminiCapture(live.stream,ws);
  }

  function openAIModel(mode){return mode==="gpt-full-live"?"gpt-realtime-2.1":"gpt-realtime-2.1-mini";}
  async function handleOpenAIEvent(e){
    let ev;try{ev=JSON.parse(e.data);}catch(_){return;}
    if(ev.type==="session.created"||ev.type==="session.updated"){setStatus(`${openAIModel(live.provider)}・正在聽`,"#5eead4");setLiveTrace("狀態：已連線，正在聽你說話。","#5eead4");}
    if(ev.type==="input_audio_buffer.speech_started"){setStatus("聽到你了…","#5eead4");setLiveTrace("狀態：聽到你了，正在辨識文字…","#d8fff1");}
    if(ev.type==="conversation.item.input_audio_transcription.completed"&&ev.transcript){setLiveTrace(`你：${ev.transcript}\n步驟：正在理解問題…`,"#d8fff1");rememberTurn("user",ev.transcript);}
    if((ev.type==="response.output_audio_transcript.done"||ev.type==="response.audio_transcript.done")&&ev.transcript){setLiveTrace(`Teddy：${ev.transcript}`,"#9fd8c8");rememberTurn("assistant",ev.transcript);}
    const item=ev.item||(ev.type==="response.done"?null:undefined);
    if(item?.type==="function_call")await answerOpenAICall(item);
    if(ev.type==="response.done")for(const x of ev.response?.output||[])if(x.type==="function_call")await answerOpenAICall(x);
    if(ev.type==="error"){const msg=ev.error?.message||"未知錯誤";setStatus("GPT Live錯誤："+msg,"#f0a8a8");setLiveTrace("即時語音錯誤："+msg,"#f0a8a8");}
  }
  async function answerOpenAICall(call){
    const id=call.call_id||call.id;if(!id||live.handledCalls.has(id))return;live.handledCalls.add(id);
    let args={};try{args=JSON.parse(call.arguments||"{}");}catch(_){}
    const result=await runLiveTool(call.name,args);if(!live.dc||live.dc.readyState!=="open")return;
    live.dc.send(JSON.stringify({type:"conversation.item.create",item:{type:"function_call_output",call_id:id,output:JSON.stringify(result)}}));
    live.dc.send(JSON.stringify({type:"response.create"}));
  }
  async function connectOpenAI(mode){
    const key=loadKeys().openai;if(!key)throw new Error("尚未設定OpenAI API Key");
    live.stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}});
    const pc=new RTCPeerConnection();live.pc=pc;live.provider=mode;
    pc.ontrack=e=>{
      // 最乾淨的路徑：WebRTC 遠端音訊直接交給瀏覽器原生音訊管線，
      // 不再二次經 AudioContext 重建，避免 buffer 邊界 click/bi 與裝置切換雜音。
      if(!live.remoteAudio){live.remoteAudio=document.createElement("audio");live.remoteAudio.autoplay=true;live.remoteAudio.playsInline=true;live.remoteAudio.style.display="none";document.body.appendChild(live.remoteAudio);}
      live.remoteAudio.srcObject=e.streams[0];live.remoteAudio.volume=Math.min(1,Math.max(0.15,liveVolumeGain()));
      live.remoteAudio.play().catch(()=>{});
    };
    live.stream.getTracks().forEach(t=>pc.addTrack(t,live.stream));const dc=pc.createDataChannel("oai-events");live.dc=dc;dc.onmessage=e=>handleOpenAIEvent(e).catch(err=>setStatus("GPT工具錯誤："+err.message,"#f0a8a8"));
    const offer=await pc.createOffer();await pc.setLocalDescription(offer);
    const session={type:"realtime",model:openAIModel(mode),instructions:liveInstructions(),output_modalities:["audio"],audio:{input:{transcription:{model:"gpt-realtime-whisper",language:"zh"},turn_detection:{type:"semantic_vad",interrupt_response:true}},output:{voice:"marin"}},tools:liveOpenAITools(),tool_choice:"auto"};
    const form=new FormData();form.set("sdp",offer.sdp);form.set("session",JSON.stringify(session));
    const res=await fetch("https://api.openai.com/v1/realtime/calls",{method:"POST",headers:{Authorization:`Bearer ${key}`},body:form});
    if(!res.ok)throw new Error((await res.text()).slice(0,220)||`GPT HTTP ${res.status}`);await pc.setRemoteDescription({type:"answer",sdp:await res.text()});
    await new Promise((resolve,reject)=>{if(dc.readyState==="open")return resolve();const timer=setTimeout(()=>reject(new Error("GPT資料通道逾時")),12000);dc.onopen=()=>{clearTimeout(timer);resolve();};});
    setStatus(`${openAIModel(mode)}・正在聽`,"#5eead4");
  }
  async function disconnectLive(){
    await teddyDualEnd();
    live.manualStop=true;live.active=false;live.starting=false;flushGeminiTurn();stopGeminiAudio();
    try{live.captureNode?.disconnect();}catch(_){}try{live.captureSink?.disconnect();}catch(_){}try{await live.captureCtx?.close();}catch(_){}try{await live.playCtx?.close();}catch(_){}try{await live.outputCtx?.close();}catch(_){}
    try{live.ws?.close();}catch(_){}try{live.dc?.close();}catch(_){}try{live.pc?.close();}catch(_){}try{if(live.remoteAudio){live.remoteAudio.pause();live.remoteAudio.srcObject=null;live.remoteAudio.remove();}}catch(_){}live.stream?.getTracks().forEach(t=>t.stop());
    Object.assign(live,{ws:null,pc:null,dc:null,stream:null,captureCtx:null,captureNode:null,captureSink:null,playCtx:null,outputCtx:null,gainNode:null,compressor:null,remoteAudio:null,playAt:0,provider:null,inputText:"",outputText:""});setButtons(false);setStatus("● 已停止","#ff6b6b");setLiveTrace("狀態：即時語音已停止。","#ff7b7b");
  }
  async function startLive(){
    if(live.starting||live.active)return;
    if(live.ws){try{live.ws.close();}catch(_){}live.ws=null;}
    stopGeminiAudio();live.starting=true;live.manualStop=false;setButtons(true);setStatus("連線中…","#e8a659");setLiveTrace("狀態：正在連線即時語音…","#e8c879");
    const mode="gemini-live";ui.model.value=mode;localStorage.setItem("teddy_live_model_v39",mode);
    try{
      if(mode==="gemini-live"){
        try{await connectGemini();}
        catch(e){
          if(gliveVariant()!=="31"){
            console.warn("3.8 深度思考版連線失敗，改用 3.1",e);
            try{live.ws?.close();}catch(_){}try{live.stream?.getTracks().forEach(t=>t.stop());}catch(_){}
            await connectGemini("31");
            setLiveTrace(`3.8 深度思考版這次無法連線（${e.message}），已自動改用 3.1 Flash Live。`,"#e8c879");
          }else throw e;
        }
      }
      else await connectOpenAI("gpt-full-live");
      live.active=true;live.starting=false;setButtons(true);await teddyDualBegin(mode);
    }catch(e){await disconnectLive();setStatus("無法連線："+e.message,"#f0a8a8");}
  }
  function geminiLiveReady(){return !!(live.active&&live.provider==="gemini-live"&&live.ws&&live.ws.readyState===1);}
  window.teddyLiveSendText=function(text){
    if(!geminiLiveReady())return false;
    try{
      live.ws.send(JSON.stringify({realtimeInput:{text:String(text||"").slice(0,4000)}}));
      setLiveTrace(`你（打字）：${String(text||"").slice(0,120)}\n步驟：TEDDY 正在回答…`,"#d8fff1");
      return true;
    }catch(_){return false;}
  };
  window.teddyLiveSpeak=function(answer){
    if(!geminiLiveReady())return false;
    live.echoPending=true;
    try{
      live.ws.send(JSON.stringify({realtimeInput:{text:"【溫室查詢結果：請用你自己的聲音，自然地把下面這段念給使用者聽。數字、單位、分區、期間都照原文，不要改、不要再呼叫工具；語氣照你平常的 TEDDY 人設，可以加一句自然的開頭或收尾，但不要加任何數字或資料以外的推測】\n"+String(answer||"").slice(0,3000)}}));
      return true;
    }catch(_){live.echoPending=false;return false;}
  };
  window.teddyLiveIsActive=function(){return !!live.active;};
  // 7.2.0：把附件照片送進即時語音（Gemini Live 影像畫面），語音也看得到照片。
  async function liveImageToJpeg(mime,b64){
    try{
      const img=new Image();img.src=`data:${mime||"image/jpeg"};base64,${b64}`;await img.decode();
      const max=1280,r=Math.min(1,max/Math.max(img.naturalWidth||1,img.naturalHeight||1));
      const c=document.createElement("canvas");c.width=Math.max(1,Math.round(img.naturalWidth*r));c.height=Math.max(1,Math.round(img.naturalHeight*r));
      c.getContext("2d").drawImage(img,0,0,c.width,c.height);
      return c.toDataURL("image/jpeg",0.85).split(",")[1];
    }catch(_){return (mime==="image/jpeg"||mime==="image/jpg")?b64:null;}
  }
  // 8.8.0：附上文件時告訴語音（只送一句說明，全文要用 read_document 讀）
  window.teddyLiveNotifyDoc=function(d){
    if(!d||!geminiLiveReady())return false;
    try{
      live.ws.send(JSON.stringify({realtimeInput:{text:`【使用者剛附上文件「${String(d.name||"文件").slice(0,60)}」（${d.format||"文件"}${d.pages?`，共 ${d.pages} 頁`:""}）。之後問到這份文件，先呼叫 read_document 讀內容；要整理成報告或講稿就呼叫 think_with_astra。現在只要用一句很短的話說你收到了，然後等他問】`}}));
      setLiveTrace(`📄 已把文件交給即時語音：${d.name||""}`,"#5eead4");
      return true;
    }catch(_){return false;}
  };
  window.teddyLiveSendImage=async function(att,announce=true){
    if(!att||att.kind!=="image"||!att.data)return false;
    if(!geminiLiveReady())return false;
    const jpg=await liveImageToJpeg(att.mime,att.data);
    if(!jpg||!geminiLiveReady())return false;
    try{
      live.ws.send(JSON.stringify({realtimeInput:{video:{mimeType:"image/jpeg",data:jpg}}}));
      live.imageSentName=att.name;
      if(announce)live.ws.send(JSON.stringify({realtimeInput:{text:`【使用者剛附上一張照片「${String(att.name||"照片").slice(0,60)}」，照片已經放在你眼前的畫面裡。之後使用者問到照片、截圖、圖片、這張，都直接看這張圖回答，不要說看不到。現在只要用一句很短、自然的話告訴他你看到了（可以順口說一下大概是什麼），然後等他問】`}}));
      setLiveTrace(`🖼 已把照片交給即時語音：${att.name||""}`,"#5eead4");
      return true;
    }catch(_){return false;}
  };
  // 照片念給語音：文字模型看完照片的答案，由同一個 TEDDY 聲音念出來。
  window.teddyLiveReadAnswer=function(answer,topic){
    if(!geminiLiveReady())return false;
    live.echoPending=true;
    const lead=topic?`先用一句很短的話帶過「剛剛問的${String(topic).slice(0,24)}整理好了」，接著`:"直接";
    try{live.ws.send(JSON.stringify({realtimeInput:{text:`【系統：文字分析完成。${lead}用你平常的語氣把下面內容說給使用者聽。不要說「好的」「我用我的聲音念」「我來念」這類話，不要再呼叫工具，不要加新的推測或新的股票名稱；說完就停，不要另外提問】\n`+String(answer||"").slice(0,3000)}}));return true;}
    catch(_){live.echoPending=false;return false;}
  };
  (function(){
    const sel=document.getElementById("teddyGliveVariant");
    if(!sel)return;
    sel.value=gliveChoice();
    sel.addEventListener("change",async()=>{
      try{localStorage.setItem(TEDDY_GLIVE_KEY,sel.value);}catch(_){}
      if(live.active&&live.provider==="gemini-live"){await disconnectLive();await startLive();}
      else setStatus(`已選 ${GLIVE_VARIANTS[sel.value].label}，按「開始即時對話」生效`,"#5eead4");
    });
  })();
  window.teddyLiveReconnect=async function(){
    if(!live.active)return;
    setStatus("切換模式，重新連線即時語音…","#e8a659");
    await disconnectLive();
    await startLive();
  };
  window.teddyLiveSyncTurn=function(userText,replyText){
    if(!live.active)return;
    const u=String(userText||"").trim().slice(0,1200),a=String(replyText||"").trim().slice(0,1500);
    if(!u&&!a)return;
    if(live.provider&&live.provider!=="gemini-live"&&live.dc&&live.dc.readyState==="open"){
      const text=`【文字對話同步：這是使用者剛剛用打字跟你（TEDDY）的對話，只需要記住，不要回應、不要出聲】\n使用者打字：${u||"（無）"}\nTEDDY 文字回覆：${a||"（無）"}`;
      try{live.dc.send(JSON.stringify({type:"conversation.item.create",item:{type:"message",role:"user",content:[{type:"input_text",text}]}}));}catch(_){}
    }
  };
  const savedEngine=localStorage.getItem("teddy_live_model_v39");
  ui.model.value="gemini-live";if(savedEngine!=="gemini-live")localStorage.setItem("teddy_live_model_v39","gemini-live");
  if(ui.volume){ui.volume.value=localStorage.getItem("teddy_live_volume_v41")||"85";ui.volume.oninput=applyLiveVolume;applyLiveVolume();}
  document.getElementById("teddyEngineFlash")?.addEventListener("click",()=>teddySelectLiveEngine("gemini-live"));
  document.getElementById("teddyEngineGPT")?.addEventListener("click",()=>teddySelectLiveEngine("gpt-full-live"));
  teddyDualPaintButtons();teddyDualRenderUsage();
  const originalDisconnectLive=disconnectLive;
  ui.start.onclick=startLive;
  ui.stop.onclick=async()=>{await teddyDualEnd();await originalDisconnectLive();};
  window.addEventListener("beforeunload",()=>{try{live.ws?.close();live.pc?.close();}catch(_){}});
})();
