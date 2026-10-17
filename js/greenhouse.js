/* Smart Teddy 8.6.0 · js/greenhouse.js：溫室模式（完全體 V5.1 資料閘門、功能表、十表引擎）
   載入順序：js/core.js → js/greenhouse.js → js/live.js → js/invest.js（一般 <script>，共用同一個全域範圍）。 */
    // ===== Greenhouse V2: ONLY this module is changed. Teddy 3.5 core remains untouched. =====
    const GH_MAIN={apiKey:"AIzaSyDJXF_9jyibl5GsbJHEuPVBIOqQ2Eovjw4",projectId:"figapi-d24dc"};
    // V5.1 正式 Firebase 連線：
    // TEDDY 自己仍使用 smart-teddy-df0fc；溫室 V5.1 使用獨立 named app，
    // 先匿名驗證，再以 Firestore SDK 讀取 figapi-d24dc/kv。
    let ghMainApp=null;
    let ghMainReadyPromise=null;

    // 保證讀完整個 collection、不會因為集合成長超過單次查詢上限而漏資料。
    // 之前 calendar 的 fallback 讀取寫死 limit(1000)，kv 集合累積夠久之後，
    // 排在1000筆之後的文件會被整批漏掉——這正是三期、四南資料選擇性消失的最可能原因。
    async function ghFetchAllDocs(collectionRef,pageSize=500){
      const all=[];
      let cursor=null;
      for(let guard=0;guard<50;guard++){ // 上限 50 頁＝25000筆，遠超過目前規模，純粹防止無窮迴圈
        let q=collectionRef.orderBy(firebase.firestore.FieldPath.documentId()).limit(pageSize);
        if(cursor)q=q.startAfter(cursor);
        const snap=await q.get();
        if(snap.empty)break;
        snap.docs.forEach(d=>all.push(d));
        if(snap.docs.length<pageSize)break; // 這頁沒讀滿，代表已經是最後一頁
        cursor=snap.docs[snap.docs.length-1];
      }
      return all;
    }

    async function ghMainFirestore(){
      if(!ghMainReadyPromise){
        ghMainReadyPromise=(async()=>{
          if(typeof firebase==="undefined")throw new Error("Firebase SDK 未載入");
          try{ghMainApp=firebase.app("greenhouse-v51-main");}
          catch(_){
            ghMainApp=firebase.initializeApp({
              apiKey:GH_MAIN.apiKey,
              authDomain:"figapi-d24dc.firebaseapp.com",
              projectId:GH_MAIN.projectId,
              storageBucket:"figapi-d24dc.firebasestorage.app",
              messagingSenderId:"334799549554",
              appId:"1:334799549554:web:d197425c2c629ee53dbeeb"
            },"greenhouse-v51-main");
          }

          const auth=ghMainApp.auth();
          if(!auth.currentUser){
            await auth.signInAnonymously();
          }
          if(!auth.currentUser)throw new Error("V5.1 Firebase Authentication 未完成");

          window.__teddyV51AuthUid=auth.currentUser.uid;
          return ghMainApp.firestore();
        })().catch(err=>{
          ghMainReadyPromise=null;
          throw err;
        });
      }
      return ghMainReadyPromise;
    }
    const GH_YIELD={apiKey:"AIzaSyBoHlZFS3fuhuS6MjYH8cPE3djbA--lJLY",projectId:"figdata-d2737"};
    const GH_YIELD_COLLECTION="fbrfA_data";

    const GH_ZONES=[
      {id:"p1",name:"一期溫室",yield:"一期",aliases:["一期","一期溫室","p1"]},
      {id:"p2",name:"二期溫室",yield:"二期",aliases:["二期","二期溫室","總公司","p2"]},
      {id:"zone3",name:"三期溫室",yield:"三期",aliases:["三期","三期溫室","zone3"]},
      {id:"north4",name:"四北溫室",yield:"四北",aliases:["四北","四北溫室","north4"]},
      {id:"south4",name:"四南溫室",yield:"四南",aliases:["四南","四南溫室","south4"]},
      {id:"zone5",name:"五期溫室",yield:"五期",aliases:["五期","五期溫室","zone5"]}
    ];

    const GH_SCHEMA={
      "zonework:":{category:"zonework",meaning:"功能表7內層表3資料來源：工作6=補水、7=施肥、8=其他資材；實際完成量與當日統計以 confirmedHistory 為準"},
      "worklog:":{category:"worklog",meaning:"功能表4圖一資料來源：分區格位工作1-5；主管指派級別、受文對象、待確認、回報進度與是否完成都以此為準"},
      "workmonth:":{category:"workmonth",meaning:"工作月表；常見結構 day -> items / note"},
      "spraylog:":{category:"spraylog",meaning:"施肥／噴藥月曆；常見欄位 code、name、dosage、qty、type"},
      "attendance:":{category:"attendance",meaning:"人員出勤／打卡；通常包含 personId 與日期"},
      "attendancePref:":{category:"attendance_pref",meaning:"個人出勤偏好"},
      "attendanceLeaveTypes":{category:"leave_types",meaning:"全場共用假別清單"},
      "calendar:":{category:"calendar",meaning:"行事曆／年度計畫／產季"},
      "zonenotice:":{category:"zonenotice",meaning:"分區通知／留言"},
      "person:":{category:"person",meaning:"人員／帳號資料"},
      "monthlyWorkItemsList":{category:"work_item_catalog",meaning:"工作月表工項代號清單"},
      "sprayDrugList":{category:"spray_catalog",meaning:"共用藥品清單"},
      "fertilizerList":{category:"fertilizer_catalog",meaning:"共用肥料／資材清單"},
      "printlog":{category:"printlog",meaning:"列印紀錄"}
    };

    const GH_RECOGNIZED_PREFIXES=[
      "zonework:","worklog:","workmonth:","spraylog:","attendance:","attendancePref:",
      "calendar:","zonenotice:","person:"
    ];
    const GH_RECOGNIZED_SINGLETONS=[
      "attendanceLeaveTypes","monthlyWorkItemsList","sprayDrugList","fertilizerList","printlog"
    ];

    function setUiMode(mode){
      const farm=mode==="greenhouse";
      const prevMode=window.TEDDY_APP_MODE;
      window.TEDDY_APP_MODE=farm?"greenhouse":"general";
      // 6.9.0：即時語音的工具與規則在連線當下決定；模式一換就重連，語音才查得到溫室資料。
      if(prevMode&&prevMode!==window.TEDDY_APP_MODE&&typeof window.teddyLiveIsActive==="function"&&window.teddyLiveIsActive()&&typeof window.teddyLiveReconnect==="function"){
        setTimeout(()=>{window.teddyLiveReconnect().catch(e=>console.warn("語音重連失敗",e));},0);
      }
      try{localStorage.setItem("teddy_app_mode",window.TEDDY_APP_MODE);}catch(_){}
      document.documentElement.dataset.teddyMode=window.TEDDY_APP_MODE;
      const p=document.getElementById("btnPongchiMode");
      const g=document.getElementById("btnGreenhouseMode");
      const s=document.getElementById("dualModeStatus");
      const panel=document.getElementById("greenhousePanel");
      if(p)p.classList.toggle("active",!farm);
      if(g)g.classList.toggle("active",farm);
      if(s)s.textContent=farm?"🌱 溫室模式 · 僅此模式可讀取/寫入工作資料":"🐿 一般模式 · 圖片/檔案/網頁/聊天，不進工作路由";
      if(panel)panel.style.display=farm?"flex":"none";
      const inv=document.getElementById("btnPongchiInvest");if(inv)inv.style.display=farm?"none":"flex";
      const liveBox=document.getElementById("teddyLiveBox");
      const liveTarget=document.getElementById(farm?"greenhouseLiveMount":"teddyLiveHome");
      if(liveBox&&liveTarget&&liveBox.parentElement!==liveTarget)liveTarget.appendChild(liveBox);
    }

    function ghStripMd(s){
      return String(s||"").replace(/\*\*|__|`/g,"").replace(/^#{1,6}\s*/gm,"").replace(/^\s*[-*]\s+/gm,"・");
    }
    function ghLog(role,text){
      const box=document.getElementById("greenhouseLog"); if(!box)return;
      const clean=ghStripMd(teddyToTradSafe(String(text||""))).trim(); if(!clean)return;
      // 7.0.2：即時語音把一句話切成好幾段時，接在上一行 TEDDY 後面，不要一段一行。
      const prev=box.lastElementChild;
      if(role!=="user"&&prev&&prev.dataset&&prev.dataset.role==="assistant"&&prev.dataset.live==="1"&&Date.now()-Number(prev.dataset.at||0)<12000&&typeof window.teddyLiveIsActive==="function"&&window.teddyLiveIsActive()){
        if(!prev.textContent.endsWith(clean)){prev.textContent+=clean;prev.dataset.at=String(Date.now());box.scrollTop=box.scrollHeight;}
        return;
      }
      // 防止工具回覆與語音逐字稿同一內容被重複寫入。
      const last=box.lastElementChild;
      const rendered=(role==="user"?"你：":"TEDDY：")+clean;
      if(last && String(last.textContent||"").trim()===rendered)return;
      const d=document.createElement("div");
      d.style.margin="0 0 9px";
      d.style.color=role==="user"?"#d8fff1":"#5eead4";
      d.textContent=rendered;
      d.dataset.role=role==="user"?"user":"assistant";d.dataset.at=String(Date.now());
      d.dataset.live=(typeof window.teddyLiveIsActive==="function"&&window.teddyLiveIsActive())?"1":"0";
      box.appendChild(d); box.scrollTop=box.scrollHeight;
      // 只顯示文字，不在這裡額外發聲，避免重複播放。
    }

    function ghDecode(v){
      if(!v||typeof v!=="object")return null;
      if("stringValue"in v)return v.stringValue;
      if("integerValue"in v)return Number(v.integerValue);
      if("doubleValue"in v)return Number(v.doubleValue);
      if("booleanValue"in v)return !!v.booleanValue;
      if("nullValue"in v)return null;
      if("timestampValue"in v)return v.timestampValue;
      if("arrayValue"in v)return(v.arrayValue.values||[]).map(ghDecode);
      if("mapValue"in v){const o={},f=v.mapValue.fields||{};Object.keys(f).forEach(k=>o[k]=ghDecode(f[k]));return o;}
      return null;
    }

    async function ghFetchJson(url,opts={}){
      const r=await teddyFetch(url,opts,30000);
      let d=null; try{d=await r.json();}catch(_){}
      if(!r.ok)throw new Error(d?.error?.message||`HTTP ${r.status}`);
      return d;
    }

    function ghDocDecode(doc){
      const f=doc?.fields||{};
      const key=ghDecode(f.key)||decodeURIComponent((doc?.name||"").split("/").pop()||"");
      let value=ghDecode(f.value);
      if(typeof value==="string"){try{value=JSON.parse(value);}catch(_){}}
      return{key,data:value,updatedAt:ghDecode(f.updatedAt)};
    }

    function ghSchemaForKey(key){
      for(const p of GH_RECOGNIZED_PREFIXES)if(key.startsWith(p))return GH_SCHEMA[p];
      for(const k of GH_RECOGNIZED_SINGLETONS)if(key===k||key.startsWith(k+":"))return GH_SCHEMA[k];
      if(/permission|permissions|role|roles|auth|account|accounts|user|users|member|members/i.test(key))
        return{category:"access",meaning:"人員／帳號／角色／權限相關資料"};
      if(/report|summary|stat|dashboard|monthly|annual/i.test(key))
        return{category:"report",meaning:"報表／統計／摘要類資料"};
      return{category:"other",meaning:"尚未建立 schema 的 V5.1 資料"};
    }

    function ghFindZone(text){
      const s=String(text||"").toLowerCase();
      return GH_ZONES.find(z=>z.aliases.some(a=>s.includes(a.toLowerCase())))||null;
    }

    // 可同時辨識多個分區；「四期」代表四北+四南。產能比較會用到。
    function ghFindZones(text){
      const s=String(text||"").toLowerCase();
      const hits=[];
      const add=z=>{ if(z && !hits.some(x=>x.id===z.id)) hits.push(z); };
      GH_ZONES.forEach(z=>{ if(z.aliases.some(a=>s.includes(a.toLowerCase()))) add(z); });
      if(/四期(?!溫室?[^北南])/.test(String(text||"")) || /第四期/.test(String(text||""))){
        add(GH_ZONES.find(z=>z.id==='north4'));
        add(GH_ZONES.find(z=>z.id==='south4'));
      }
      return hits;
    }

    function ghCnDateToDigits(s){
      // 6.3.0：「九月二十八號」「十二月三日」→「9月28號」「12月3日」，讓日期判斷看得懂中文數字。
      const v={零:0,〇:0,一:1,二:2,兩:2,三:3,四:4,五:5,六:6,七:7,八:8,九:9};
      const cn=w=>{if(!w)return null;if(w==="十")return 10;const m=w.match(/^([一二三四五六七八九兩]?)十([一二三四五六七八九]?)$/);if(m)return (m[1]?v[m[1]]:1)*10+(m[2]?v[m[2]]:0);return w.length===1&&v[w]!=null?v[w]:null;};
      return String(s||"").replace(/([一二三四五六七八九十兩]{1,3})(?=\s*(?:月|號|日))/g,w=>{const n=cn(w);return n==null?w:String(n);});
    }
    function ghWeekRange(q){
      // 6.3.0：這禮拜／本週＝本週一到今天；上禮拜／上週＝上週一到上週日。
      const t=String(q||"");const now=new Date();const dow=(now.getDay()+6)%7;
      const mon=new Date(now.getFullYear(),now.getMonth(),now.getDate()-dow);
      const f=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
      if(/上禮拜|上週|上周|上星期/.test(t)){const a=new Date(mon);a.setDate(a.getDate()-7);const b=new Date(mon);b.setDate(b.getDate()-1);return{from:f(a),to:f(b),label:`上週（${f(a).slice(5)}～${f(b).slice(5)}）`};}
      if(/這禮拜|這週|這周|本週|本周|這星期|這個禮拜/.test(t))return{from:f(mon),to:f(now),label:`本週（${f(mon).slice(5)}～${f(now).slice(5)}）`};
      return null;
    }
    function ghDateRequest(q){
      q=ghCnDateToDigits(q);
      const now=new Date(),cy=now.getFullYear(),cm=now.getMonth()+1;
      let year=null,month=null;
      let m=String(q||"").match(/(20\d{2})\s*年(?:\s*(\d{1,2})\s*月)?/);
      if(m){year=Number(m[1]);if(m[2])month=Number(m[2]);}
      else if(/明年/.test(q))year=cy+1;
      else if(/後年/.test(q))year=cy+2;
      else if(/去年/.test(q))year=cy-1;
      else if(/前年/.test(q))year=cy-2;
      else if(/今年/.test(q))year=cy;
      if(/本月|這個月/.test(q)){year=cy;month=cm;}
      if(/上個月|上月/.test(q)){const d=new Date(cy,cm-2,1);year=d.getFullYear();month=d.getMonth()+1;}
      if(/下個月|下月/.test(q)){const d=new Date(cy,cm,1);year=d.getFullYear();month=d.getMonth()+1;}
      if(!month){
        const mm=String(q||"").match(/(?:^|[^0-9])(1[0-2]|[1-9])\s*月/);
        if(mm){year=year||cy;month=Number(mm[1]);}
      }
      const ym=year&&month?`${year}-${String(month).padStart(2,"0")}`:null;
      return{year,month,ym};
    }

    function ghRequestedCategories(q){
      const cats=new Set();
      if(/出勤|打卡|請假|假別/.test(q))cats.add("attendance");
      if(/人員|員工|帳號|誰負責|人事/.test(q))cats.add("people");
      if(/權限|角色|登入|帳號權限|管理員/.test(q))cats.add("access");
      if(/通知|留言|公告|分區通知/.test(q))cats.add("notice");
      if(/行事曆|年度計畫|計畫|預計|安排|時程|階段|開始日|開始時間|產季|排程|節氣|剪枝|座果|度冬/.test(q) || ghIsCalendarQuestion(q))cats.add("calendar");
      if(/噴藥|農藥|藥劑|病蟲害紀錄/.test(q))cats.add("spray");
      if(/工作|工項|修剪|剪枝|除草|打芽|補水|澆水|施肥|肥料|資材|米糠|金旺|硝酸鉀|磷酸一鉀|硫酸鉀|鈣鎂|微量元素/.test(q))cats.add("work");
      if(/報表|統計|摘要|趨勢/.test(q))cats.add("report");
      if(!cats.size)cats.add("work");
      return cats;
    }

    function ghKeyMatchesCategory(key,cats){
      if(cats.has("attendance")&&(key.startsWith("attendance:")||key.startsWith("attendancePref:")||key.startsWith("attendanceLeaveTypes")))return true;
      if(cats.has("people")&&key.startsWith("person:"))return true;
      if(cats.has("access")&&(/permission|permissions|role|roles|auth|account|accounts|user|users|member|members|person:/i.test(key)))return true;
      if(cats.has("notice")&&key.startsWith("zonenotice:"))return true;
      if(cats.has("calendar")&&key.startsWith("calendar:"))return true;
      if(cats.has("spray")&&(key.startsWith("spraylog:")||key.startsWith("sprayDrugList")))return true;
      if(cats.has("work")&&(key.startsWith("zonework:")||key.startsWith("worklog:")||key.startsWith("workmonth:")||key.startsWith("monthlyWorkItemsList")||key.startsWith("fertilizerList")))return true;
      if(cats.has("report")&&/report|summary|stat|dashboard|monthly|annual/i.test(key))return true;
      return false;
    }

    function ghKeyMatchesZone(key,zone){
      if(!zone)return true;
      if(/^(zonework|worklog|workmonth|spraylog|zonenotice|calendar):/.test(key))return key.includes(`:${zone.id}:`)||key.startsWith(`zonenotice:${zone.id}`);
      return true;
    }

    function ghKeyMatchesDate(key,req){
      if(req.ym&&/\d{4}-\d{2}/.test(key))return key.includes(req.ym);
      if(req.year&&/\d{4}/.test(key))return key.includes(String(req.year));
      return true;
    }

    function ghSafePreview(value,max=1800){
      let s;
      try{s=JSON.stringify(value);}catch(_){s=String(value);}
      if(s.length>max)s=s.slice(0,max)+"…";
      return s;
    }

    function ghFlattenFacts(value,path="",out=[],depth=0){
      if(out.length>=36||depth>5)return out;
      if(value===null||value===undefined)return out;
      if(Array.isArray(value)){
        value.slice(0,24).forEach((v,i)=>ghFlattenFacts(v,path?`${path}[${i}]`:`[${i}]`,out,depth+1));
        return out;
      }
      if(typeof value==="object"){
        Object.entries(value).slice(0,40).forEach(([k,v])=>ghFlattenFacts(v,path?`${path}.${k}`:k,out,depth+1));
        return out;
      }
      const s=String(value).trim();
      if(s&&s!=="[object Object]")out.push(`${path||"value"}=${s.length>160?s.slice(0,160)+"…":s}`);
      return out;
    }

    const GH_WORK_ITEMS={
      1:"打芽(側)",2:"打芽(地)",3:"除草",4:"剪葉",5:"覆蓋",
      6:"補水",7:"施肥",8:"其他資材"
    };

    function ghWorkTable4View(data){
      data=data||{};
      const out=[];
      for(let id=1;id<=5;id++){
        const level=Number(data.levels?.[id]||0);
        const pending=!!data.pending?.[id] && level>0;
        const progress=Number(data.progress?.[id]||0);
        const recipients=(data.recipientIds||[]).map(pid=>({
          id:pid,
          name:data.recipientNames?.[pid]||pid
        }));
        const confirmed=(data.confirmedBy?.[id]||[]).map(pid=>({
          id:pid,
          name:data.recipientNames?.[pid]||pid
        }));
        const ts=data.timestamps?.[id]||{};
        if(level || pending || progress || confirmed.length){
          out.push({
            itemId:id,
            itemName:GH_WORK_ITEMS[id],
            assignedLevel:level||null,
            assigned:level>0,
            recipients,
            pendingConfirmation:pending,
            progress:progress||null,
            progressMeaning:progress===1?"已完成":progress>1?`處理中（進度${progress}/5）`:pending?"已指派、尚未回報":"無回報",
            confirmedBy:confirmed,
            changedAt:ts.changedAt||null,
            acknowledgedAt:ts.ackAt||null
          });
        }
      }
      return out;
    }

    function ghNormalizeStamp(s){
      // 原始 App 的 nowStamp() 寫入格式是「YYYY/MM/DD HH:mm」（斜線），
      // 但這裡所有日期比對用的都是「YYYY-MM」（減號）去 startsWith 比對——
      // 兩種分隔符號完全對不上，導致每一筆耗材確認紀錄的日期篩選永遠失敗。
      // 統一在讀取時就轉成減號格式，後面所有比對邏輯都不用改。
      return String(s||"").replace(/^(\d{4})\/(\d{2})\/(\d{2})/,"$1-$2-$3");
    }

    function ghZoneWorkFunction3View(data){
      data=data||{};
      const history=(data.confirmHistory||[])
        .filter(h=>h && h.rowKey && Number(h.qty)>0)
        .map(h=>({
          itemId:Number(h.itemId||0)||null,
          itemName:h.itemName||GH_WORK_ITEMS[Number(h.itemId||0)]||h.rowKey,
          material:h.rowKey,
          quantity:Number(h.qty),
          unit:
            h.rowKey==="溝灌"?"噸":
            h.rowKey==="噴灌"?"分鐘":
            (h.rowKey==="米糠"||h.rowKey==="金旺")?"包":"kg",
          personId:h.personId||null,
          personName:h.personName||h.personId||null,
          confirmedAt:ghNormalizeStamp(h.at),
          progress:h.progress??1
        }));
      return {
        confirmedHistory:history,
        rule:"功能表7→內層表3只統計已回報確認且有時間的紀錄；問『今天用了多少』時只加總今天 confirmedAt 的紀錄，不把目前尚未確認的 checks/extra 算進去。"
      };
    }

    function ghCanonicalEnvelope({source,category,zone,date,item=null,value=null,unit=null,status="recorded",rawKey=null}){
      return{
        schemaVersion:"teddy.canonical.v1",
        source,category,
        zone:zone?{id:zone.id,name:zone.name}:null,
        date:date||null,item,value,unit,status,rawKey
      };
    }

    function ghNormalizeMainRecord(row){
      const schema=ghSchemaForKey(row.key);
      const zone=ghFindZone(row.key);
      const compactYm=(row.key.match(/20\d{2}(?:0[1-9]|1[0-2])/ )||[])[0]||null;
      const ym=(row.key.match(/20\d{2}-\d{2}/)||[])[0]||(compactYm?`${compactYm.slice(0,4)}-${compactYm.slice(4,6)}`:null);
      const date=(row.key.match(/20\d{2}-\d{2}-\d{2}/)||[])[0]||null;
      const normalized={
        sourceKey:row.key,
        category:schema.category,
        meaning:schema.meaning,
        zone:zone?{id:zone.id,name:zone.name}:null,
        period:date||ym||null,
        updatedAt:row.updatedAt||null,
        facts:ghFlattenFacts(row.data).slice(0,30),
        preview:ghSafePreview(row.data,1100)
      };
      const sourceTable={worklog:"function4",calendar:"function5",zonework:"function7.inner3",attendance:"function10",attendance_pref:"function10",leave_types:"function10"}[schema.category]||"v5.1";
      normalized.canonical=ghCanonicalEnvelope({source:sourceTable,category:schema.category,zone, date:date||ym,rawKey:row.key});
      if(["attendance","attendance_pref","leave_types","person"].includes(schema.category)){
        normalized.rawData=row.data;
      }
      if(schema.category==="worklog"){
        normalized.function4Work1to5=ghWorkTable4View(row.data);
      }
      if(schema.category==="zonework"){
        normalized.function3Work6to8=ghZoneWorkFunction3View(row.data);
        // 功能表7→內層表3的6-8只暴露已確認歷史，避免 pending/checks/extra 被誤判為已使用。
        normalized.facts=[];
        normalized.preview="";
      }
      if(schema.category==="calendar"){
        normalized.function5Calendar=ghCalendarNormalize(row.data);
      }
      return normalized;
    }

    function ghYieldRecordMeta(key){
      let zone=null;
      for(const z of GH_ZONES)if(key.includes(`:${z.yield}:`)||key.includes(`:${z.id}:`)){zone=z;break;}
      const ym=(key.match(/20\d{2}-\d{2}/)||[])[0]||null;
      const year=(key.match(/20\d{2}/)||[])[0]||null;
      const archive=/yieldArchive/i.test(key);
      return{zone,period:ym||year,archive};
    }

    function ghNormalizeYieldRecord(row){
      const meta=ghYieldRecordMeta(row.key);
      return{
        sourceKey:row.key,
        category:meta.archive?"yield_archive":"yield",
        meaning:meta.archive?"產能年度封存資料":"產能逐日／月份資料",
        zone:meta.zone?{id:meta.zone.id,name:meta.zone.name}:null,
        period:meta.period,
        facts:ghFlattenFacts(row.data).slice(0,36),
        preview:ghSafePreview(row.data,1400),
        rawData:row.data,
        canonical:ghCanonicalEnvelope({source:"function3",category:meta.archive?"yield_archive":"yield",zone:meta.zone,date:meta.period,unit:"kg",rawKey:row.key})
      };
    }

    async function ghFetchCollection(projectId,apiKey,collectionId,limit=1000){
      // V5.1 主資料必須符合 Firestore Rules: request.auth != null
      if(projectId===GH_MAIN.projectId && collectionId==="kv"){
        const db=await ghMainFirestore();
        const docs=await ghFetchAllDocs(db.collection(collectionId));
        return docs.map(doc=>{
          const raw=doc.data()||{};
          let value=raw.value;
          if(typeof value==="string"){try{value=JSON.parse(value);}catch(_){}}
          return{
            key:raw.key||doc.id,
            data:value,
            updatedAt:raw.updatedAt||null
          };
        });
      }

      // 其他非 V5.1 主資料來源維持原 REST 讀取方式
      const db=`projects/${projectId}/databases/(default)`;
      const url=`https://firestore.googleapis.com/v1/${db}/documents:runQuery?key=${encodeURIComponent(apiKey)}`;
      const rows=await ghFetchJson(url,{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({structuredQuery:{from:[{collectionId}],limit}})
      });
      return(rows||[]).filter(x=>x.document).map(x=>ghDocDecode(x.document));
    }

    async function ghQueryV51(q){
      const docs=await ghFetchCollection(GH_MAIN.projectId,GH_MAIN.apiKey,"kv",1000);
      const zone=ghFindZone(q),req=ghDateRequest(q),cats=ghRequestedCategories(q);

      let selected=docs.filter(r=>
        ghKeyMatchesCategory(r.key,cats)&&
        ghKeyMatchesZone(r.key,zone)&&
        ghKeyMatchesDate(r.key,req)
      );

      // If a strict year/month filter returns nothing, keep category+zone and let AI say the requested period has no record.
      if(!selected.length&&(req.year||req.month)){
        selected=docs.filter(r=>ghKeyMatchesCategory(r.key,cats)&&ghKeyMatchesZone(r.key,zone));
      }

      // Do NOT hard-filter material names such as 米糠. We retain the structured records and let normalized facts answer it.
      return selected.slice(0,180).map(ghNormalizeMainRecord);
    }

    let ghYieldApp=null;
    async function ghYieldStorage(){
      if(!ghYieldApp){
        try{ghYieldApp=firebase.app("greenhouse-v51-yield");}
        catch(_){
          ghYieldApp=firebase.initializeApp({
            apiKey:GH_YIELD.apiKey,
            authDomain:"figdata-d2737.firebaseapp.com",
            projectId:GH_YIELD.projectId,
            appId:"1:46163670891:web:c496942014d47ea19c7e2e"
          },"greenhouse-v51-yield");
        }
      }
      const auth=ghYieldApp.auth();
      if(!auth.currentUser)await auth.signInAnonymously();
      const db=ghYieldApp.firestore();
      // 之前這裡寫死只查 fbrfA_priv__，完全沒查 fbrfA_shared__。
      // 「priv」在這個模組裡並不是真的依使用者帳號隔開（storageKey 沒有塞 uid 進去），
      // 只是產能模組寫入時自己選的一個旗標，實際資料到底存在哪一種前綴下無法保證，
      // 之前只查 priv 會導致：只要哪一筆資料是用 shared 身分寫入，就永遠查不到，
      // 五期就是活生生的例子。兩種前綴都查、合併起來，不要再用猜的。
      const markers=["fbrfA_priv__","fbrfA_shared__"];
      return{
        async get(key){
          for(const marker of markers){
            const doc=await db.collection(GH_YIELD_COLLECTION).doc(marker+key).get();
            if(!doc.exists)continue;
            const d=doc.data()||{};
            let value=d.value;
            if(typeof value==="string"){try{value=JSON.parse(value);}catch(_){}}
            return{key,value,updatedAt:d.updatedAt||null};
          }
          return null;
        },
        async list(prefix){
          const seen=new Set();
          for(const marker of markers){
            const fp=marker+prefix;
            const snap=await db.collection(GH_YIELD_COLLECTION)
              .where(firebase.firestore.FieldPath.documentId(),">=",fp)
              .where(firebase.firestore.FieldPath.documentId(),"<",fp+"\uf8ff").get();
            snap.docs.forEach(d=>seen.add(d.id.slice(marker.length)));
          }
          return[...seen];
        },
        async set(key,value,meta={}){
          const ref=db.collection(GH_YIELD_COLLECTION).doc("fbrfA_priv__"+key);
          await ref.set({
            key,
            value,
            updatedAt:new Date().toISOString(),
            source:meta.source||"teddy-history-import",
            importedAt:meta.importedAt||new Date().toISOString(),
            importFile:meta.importFile||null
          },{merge:true});
          return true;
        }
      };
    }

    // ===== 功能表3・產能唯一入口 =====
    // 任何產能相關問題都先進這裡，不讀 worklog / zonework / 其他工作表。
    // ===== 功能表10・上下班打卡／出勤查詢唯一入口 =====
    // TEDDY 在此只做查詢，不替任何人執行打卡或修改出勤資料。
    function ghIsAttendanceQuestion(q){
      const t=String(q||"");
      return /打卡|出勤|上班|下班|遲到|早退|加班|請假|休假|工時|上下班|簽到|簽退|有來嗎|有沒有來|來了嗎|沒來|到班|缺勤/.test(t);
    }

    function ghAttendanceIntent(q){
      const t=String(q||"");
      if(/誰.*(?:沒|未).*(?:打卡|上班|下班)|(?:沒|未).*(?:打卡|上班|下班).*(?:誰)/.test(t))
        return "missing";
      if(/請假|休假|假別/.test(t))
        return "leave";
      if(/加班/.test(t))
        return "overtime";
      if(/工時|幾小時|時數|總時數/.test(t))
        return "hours";
      if(/遲到|早退/.test(t))
        return "status";
      return "attendance";
    }

    function ghAttendanceDateFilter(q){
      const req=ghDateRequest(q);
      const now=new Date();
      const today=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
      if(/今天|今日/.test(q)) return {type:"date",value:today,label:"今天"};
      if(req.date) return {type:"date",value:req.date,label:req.date};
      if(req.ym) return {type:"month",value:req.ym,label:`${req.year}年${req.month}月`};
      if(req.year) return {type:"year",value:String(req.year),label:`${req.year}年`};
      return {type:"date",value:today,label:"今天"};
    }

    function ghAttendancePersonName(q, rows){
      const people=rows.filter(r=>r.category==="person");
      for(const p of people){
        const name=p.data?.name || p.preview?.name || p.facts?.find?.(()=>false);
        if(name && String(q).includes(String(name))) return {id:p.data?.id||null,name};
      }
      return null;
    }

    function ghAttendanceRecords(rows,q){
      const f=ghAttendanceDateFilter(q);
      const person=ghAttendancePersonName(q,rows);
      return rows.filter(r=>{
        if(r.category!=="attendance") return false;
        const key=String(r.sourceKey||"");
        if(f.type==="date" && !key.includes(f.value)) return false;
        if(f.type==="month" && !key.includes(f.value)) return false;
        if(f.type==="year" && !key.includes(f.value)) return false;
        if(person && !key.includes(person.id||"") && !String(r.preview||"").includes(person.name)) return false;
        return true;
      });
    }

    function ghAttendanceDirectAnswer(rows,q){
      const intent=ghAttendanceIntent(q);
      const f=ghAttendanceDateFilter(q);
      const recs=ghAttendanceRecords(rows,q);

      if(!recs.length) return `功能表10在${f.label}沒有查到符合條件的打卡／出勤紀錄。`;

      // 查某人的單筆狀態：優先簡短列出 regular / overtime / leave
      if(recs.length===1){
        const r=recs[0];
        const d=r.rawData || r.data || {};
        const regular=d.regular||{};
        const overtime=d.overtime||{};
        const leave=d.leave||{};
        const parts=[];
        const rp=regular.punches||{};
        const op=overtime.punches||{};
        const rt=["amIn","amOut","pmIn","pmOut"].map(k=>rp[k]).filter(Boolean);
        const ot=["amIn","amOut","pmIn","pmOut"].map(k=>op[k]).filter(Boolean);
        if(rt.length){
          parts.push(`正常班打卡 ${rt.join("、")}`);
        }
        if(ot.length){
          parts.push(`加班打卡 ${ot.join("、")}`);
        }
        if(leave && (leave.type||leave.note||leave.hours)){
          parts.push(`請假 ${leave.type||"未註明假別"}${leave.hours?` ${leave.hours}小時`:""}`);
        }
        if(parts.length) return `${f.label}：${parts.join("；")}。`;
      }

      // 多筆時給統計，不猜薪資也不代打
      if(intent==="leave"){
        const n=recs.filter(r=>{
          const d=r.rawData||r.data||{};
          return d.leave && (d.leave.type||d.leave.note||d.leave.hours);
        }).length;
        return `${f.label}共有 ${n} 筆請假紀錄。`;
      }
      if(intent==="overtime"){
        const n=recs.filter(r=>{
          const d=r.rawData||r.data||{};
          const p=d.overtime?.punches||{};
          return ["amIn","amOut","pmIn","pmOut"].some(k=>!!p[k]);
        }).length;
        return `${f.label}共有 ${n} 筆加班打卡紀錄。`;
      }

      return `${f.label}功能表10共查到 ${recs.length} 筆打卡／出勤紀錄。`;
    }

    // ===== 功能表3・歷史產能真正匯入 =====
    let ghYieldImportDraft=null;

    function ghCsvSplitLine(line,sep){
      const out=[]; let cur="",quote=false;
      for(let i=0;i<line.length;i++){
        const c=line[i];
        if(c==='"'){
          if(quote && line[i+1]==='"'){cur+='"';i++;}
          else quote=!quote;
        }else if(c===sep && !quote){out.push(cur.trim());cur="";}
        else cur+=c;
      }
      out.push(cur.trim()); return out;
    }

    function ghNormZoneName(v){
      const s=String(v||"").trim();
      for(const z of GH_ZONES){
        if(z.aliases.some(a=>s.includes(a)) || s===z.yield || s===z.name) return z;
      }
      return null;
    }

    function ghNormGrade(v){
      const s=String(v||"").toUpperCase().replace(/級/g,"").trim();
      if(s==="A"||s==="B"||s==="D"||s==="NG")return s;
      return null;
    }

    function ghNormDate(v){
      const s=String(v||"").trim().replace(/[./]/g,"-");
      let m=s.match(/^(20\d{2})-(\d{1,2})-(\d{1,2})$/);
      if(!m)m=s.match(/^(20\d{2})年(\d{1,2})月(\d{1,2})日?$/);
      if(!m)return null;
      return `${m[1]}-${String(Number(m[2])).padStart(2,"0")}-${String(Number(m[3])).padStart(2,"0")}`;
    }

    function ghYieldImportRowsFromJson(obj){
      const rows=[];
      const walk=(x,ctx={})=>{
        if(Array.isArray(x)){x.forEach(v=>walk(v,ctx));return;}
        if(!x||typeof x!=="object")return;
        const date=ghNormDate(x.date||x.日期||ctx.date);
        const zone=ghNormZoneName(x.zone||x.溫室||x.分區||ctx.zone);
        const grade=ghNormGrade(x.grade||x.等級||ctx.grade);
        const kg=Number(x.net??x.kg??x.公斤??x.重量??x.gross);
        if(date&&zone&&grade&&Number.isFinite(kg)&&kg>0){
          rows.push({date,zone,grade,kg,note:String(x.note||x.備註||"")}); return;
        }
        for(const [k,v] of Object.entries(x)){
          const nctx={...ctx};
          const d=ghNormDate(k); if(d)nctx.date=d;
          const z=ghNormZoneName(k); if(z)nctx.zone=z.yield;
          const g=ghNormGrade(k); if(g)nctx.grade=g;
          walk(v,nctx);
        }
      };
      walk(obj); return rows;
    }

    function ghYieldImportParse(name,raw){
      const t=String(raw||"").trim(); if(!t)throw new Error("檔案是空的");
      if(/\.json$/i.test(name)||t[0]==="{"||t[0]==="["){
        let obj; try{obj=JSON.parse(t);}catch(e){throw new Error("JSON 格式無法解析");}
        const rows=ghYieldImportRowsFromJson(obj);
        if(!rows.length)throw new Error("JSON 沒有辨識到日期、溫室、等級、公斤數");
        return rows;
      }
      const lines=t.split(/\r?\n/).filter(x=>x.trim());
      if(lines.length<2)throw new Error("CSV/TSV 至少需要標題列與一筆資料");
      const sep=lines[0].includes("\t")?"\t":",";
      const head=ghCsvSplitLine(lines[0],sep).map(x=>x.toLowerCase().replace(/\s/g,""));
      const find=(names)=>head.findIndex(h=>names.some(n=>h===n||h.includes(n)));
      const ix={
        date:find(["date","日期","採收日期"]), zone:find(["zone","溫室","分區","區域"]),
        grade:find(["grade","等級","級別"]), kg:find(["net","kg","公斤","重量","產量","產能"]),
        note:find(["note","備註","說明"])
      };
      if(ix.date<0||ix.zone<0||ix.grade<0||ix.kg<0)throw new Error("缺少必要欄位：日期、溫室/分區、等級、公斤數");
      const rows=[]; const bad=[];
      for(let n=1;n<lines.length;n++){
        const a=ghCsvSplitLine(lines[n],sep),date=ghNormDate(a[ix.date]),zone=ghNormZoneName(a[ix.zone]),grade=ghNormGrade(a[ix.grade]),kg=Number(String(a[ix.kg]||"").replace(/,/g,""));
        if(date&&zone&&grade&&Number.isFinite(kg)&&kg>0)rows.push({date,zone,grade,kg,note:ix.note>=0?(a[ix.note]||""):""});
        else bad.push(n+1);
      }
      if(!rows.length)throw new Error("沒有任何可匯入資料；請檢查日期、溫室、等級、公斤數");
      rows.badLines=bad; return rows;
    }

    function ghYieldImportSummary(rows){
      const years=[...new Set(rows.map(r=>r.date.slice(0,4)))].sort();
      const zones=[...new Set(rows.map(r=>r.zone.name))];
      const kg=rows.reduce((s,r)=>s+r.kg,0);
      return `預覽完成：${rows.length} 筆，${years[0]}～${years[years.length-1]}，${zones.join("、")}，合計 ${Math.round(kg*100)/100} kg${rows.badLines?.length?`；另有 ${rows.badLines.length} 列格式不符未納入`:""}。確認後才會寫入。`;
    }

    async function ghYieldImportCommit(){
      const d=ghYieldImportDraft;
      if(!d||!d.rows?.length)throw new Error("沒有待匯入資料");
      const s=await ghYieldStorage();
      const grouped={};
      for(const r of d.rows){
        const y=r.date.slice(0,4),k=`${r.zone.yield}|${y}`;
        (grouped[k]||(grouped[k]={zone:r.zone,year:y,days:{}}));
        const day=grouped[k].days[r.date]||(grouped[k].days[r.date]={A:[],B:[],D:[],NG:[]});
        day[r.grade].push({net:r.kg,gross:r.kg,note:r.note||"",imported:true});
      }
      let groups=0;
      for(const g of Object.values(grouped)){
        const key=`yieldArchive:${g.zone.yield}:${g.year}`;
        const old=await s.get(key); const archive=old?.value&&typeof old.value==="object"?old.value:{};
        // Merge by date/grade; imported records append, preserving existing production data.
        for(const [date,day] of Object.entries(g.days)){
          const target=archive[date]&&typeof archive[date]==="object"?archive[date]:{A:[],B:[],D:[],NG:[]};
          for(const grade of ["A","B","D","NG"]){
            target[grade]=Array.isArray(target[grade])?target[grade]:[];
            // 同一匯入檔重新執行時，先移除該檔先前匯入的資料，避免重複加總。
            target[grade]=target[grade].filter(x=>!(x&&x.imported===true&&x.importFile===d.name));
            target[grade].push(...day[grade].map(x=>({...x,importFile:d.name})));
          }
          archive[date]=target;
        }
        await s.set(key,archive,{source:"teddy-history-import",importFile:d.name}); groups++;
      }
      ghYieldImportDraft=null;
      return {rows:d.rows.length,groups};
    }

    function ghOpenYieldImport(){
      const el=document.getElementById("ghYieldImportFile"); if(el){el.value="";el.click();}
    }

    async function ghHandleYieldImportFile(file){
      const raw=await file.text();
      const rows=ghYieldImportParse(file.name,raw);
      ghYieldImportDraft={name:file.name,rows};
      document.getElementById("ghYieldImportConfirm").style.display="block";
      return ghYieldImportSummary(rows);
    }

    function ghIsYieldQuestion(q){
      return /產能|產量|收成|採收|收穫|公斤|秤重|A級|B級|D級|NG|良率|品質|等級|歷史資料匯入|產能資料|使用紀錄|收了|收多少|採了|採多少|摘了|摘多少/.test(String(q||""));
    }

    function ghYieldRoute(q){
      const t=String(q||"").trim();
      if(/歷史.*匯入|匯入.*歷史|導入.*歷史|上傳.*歷史|匯入產能|歷史資料匯入/.test(t))
        return {id:"import",label:"歷史資料匯入"};
      if(/使用紀錄|操作紀錄|誰.*(?:輸入|修改|新增|刪除)|(?:輸入|修改|新增|刪除).*誰|修改紀錄|異動紀錄/.test(t))
        return {id:"audit",label:"使用紀錄"};
      if(/分析|趨勢|比較|平均|最高|最低|最多|最少|最好|最差|成長|衰退|變化|比例|占比|良率|合計|總共|加總|哪一區|哪個區|哪個月|哪一月|排名|預測|瓶頸|異常|決策|建議|年度比較|月度比較/.test(t))
        return {id:"analysis",label:"資料分析"};
      if(/輸入|新增|登記|記錄|紀錄|寫入|補登/.test(t) && /產能|產量|收成|採收|公斤|A級|B級|D級|NG/.test(t))
        return {id:"input",label:"輸入產能"};
      return {id:"history",label:"歷史資料"};
    }

    function ghYieldRouteIntro(route){
      // 入口只在背景鎖定；語音只講使用者下一步真正需要的內容。
      if(route.id==="import") return "請選擇要匯入的歷史產能檔案。";
      if(route.id==="input") return "請提供日期、溫室、等級與公斤數。";
      if(route.id==="audit") return "請告訴我要查的日期、人員或異動內容。";
      if(route.id==="analysis") return "請直接告訴我要比較的期間、溫室或等級。";
      return "請直接告訴我要查的期間或溫室。";
    }

    function ghYieldMonthsForQuestion(q){
      const req=ghDateRequest(q),now=new Date(),out=[],route=ghYieldRoute(q);
      const t=String(q||"");
      // 支援「7到9月／7-9月／7月至9月」時間區間。年份沒寫就用今年。
      const rm=t.match(/(?:20\d{2}\s*年\s*)?(1[0-2]|[1-9])\s*月?\s*(?:到|至|~|～|-|—)\s*(1[0-2]|[1-9])\s*月/);
      if(rm){
        const y=(t.match(/(20\d{2})\s*年/)||[])[1];
        const yy=y?Number(y):(req.year||now.getFullYear());
        let a=Number(rm[1]),b=Number(rm[2]);
        if(a<=b){for(let m=a;m<=b;m++)out.push({year:yy,month:m});}
        else{for(let m=a;m<=12;m++)out.push({year:yy,month:m});for(let m=1;m<=b;m++)out.push({year:yy+1,month:m});}
        return out;
      }
      if(req.year&&req.month)return[{year:req.year,month:req.month}];
      if(req.year){for(let m=1;m<=12;m++)out.push({year:req.year,month:m});return out;}
      // 資料分析必須先吃到歷史匯入資料：讀 2020~今年，才能做跨年/跨月分析。
      if(route.id==="analysis"){
        for(let y=2020;y<=now.getFullYear();y++)for(let m=1;m<=12;m++)out.push({year:y,month:m});
        return out;
      }
      // 一般歷史查詢若未指定期間，先查最近三個月。
      for(let i=0;i<3;i++){
        const d=new Date(now.getFullYear(),now.getMonth()-i,1);
        out.push({year:d.getFullYear(),month:d.getMonth()+1});
      }
      return out;
    }

    async function ghQueryYield(q){
      const s=await ghYieldStorage();
      const requestedZones=ghFindZones(q);
      const zones=requestedZones.length?requestedZones:GH_ZONES;
      const periods=ghYieldMonthsForQuestion(q);
      const rows=[];

      // 之前這裡用「早於本月＝只查封存、本月以後＝只查即時」二選一，
      // 但封存是不定期手動批次做的，不代表「早於本月」就一定已經進封存。
      // 五期／一期／二期在「最近資料」查不到，就是這個假設造成的漏抓——
      // 兩邊都查、合併起來，才不會漏掉還沒被批次封存進去的即時資料。
      for(const p of periods){
        const ym=`${p.year}-${String(p.month).padStart(2,"0")}`;
        for(const z of zones){
          const archiveKey=`yieldArchive:${z.yield}:${p.year}`;
          const archiveRes=await s.get(archiveKey).catch(()=>null);
          if(archiveRes){
            const archive=archiveRes.value&&typeof archiveRes.value==="object"?archiveRes.value:{};
            const monthData={};
            Object.keys(archive).filter(d=>d.startsWith(ym)).sort().forEach(d=>monthData[d]=archive[d]);
            if(Object.keys(monthData).length){
              rows.push(ghNormalizeYieldRecord({key:archiveKey,data:monthData,updatedAt:archiveRes.updatedAt}));
            }
          }

          const livePrefix=`yield:${z.yield}:${ym}`;
          const liveKeys=await s.list(livePrefix).catch(()=>[]);
          for(const key of liveKeys){
            const r=await s.get(key);
            if(r)rows.push(ghNormalizeYieldRecord({key,data:r.value,updatedAt:r.updatedAt}));
          }
        }
      }
      return rows;
    }

    function ghYieldTotals(rows){
      let total=0,entries=0;
      const byZone={},byGrade={A:0,B:0,D:0,NG:0};
      const add=(zone,record)=>{
        if(!record||typeof record!=="object")return;
        for(const grade of["A","B","D","NG"]){
          const arr=Array.isArray(record[grade])?record[grade]:[];
          for(const x of arr){
            const kg=Number(x?.net ?? x?.gross ?? 0);
            if(!Number.isFinite(kg)||kg<=0)continue;
            total+=kg;entries++;
            byGrade[grade]+=kg;
            byZone[zone]=(byZone[zone]||0)+kg;
          }
        }
      };
      for(const row of rows){
        const zone=row.zone?.name||"未分區";
        // preview is only display text; recover the normalized source by reading facts is unreliable.
        // ghNormalizeYieldRecord is therefore extended below to retain rawData.
        const raw=row.rawData;
        if(row.category==="yield_archive"&&raw&&typeof raw==="object"){
          Object.values(raw).forEach(day=>add(zone,day));
        }else add(zone,raw);
      }
      return{total,entries,byZone,byGrade};
    }

    function ghYieldFacts(rows){
      const facts=[];
      const pushDay=(zone,date,record)=>{
        if(!record||typeof record!=="object")return;
        for(const grade of ["A","B","D","NG"]){
          const arr=Array.isArray(record[grade])?record[grade]:[];
          for(const x of arr){
            const kg=Number(x?.net ?? x?.gross ?? 0);
            if(Number.isFinite(kg)&&kg>0)facts.push({
              zone, date:date||null, month:date?date.slice(0,7):null,
              year:date?date.slice(0,4):null, grade, kg
            });
          }
        }
      };
      // 同一天可能同時存在年度封存與逐日資料。逐日資料優先，避免兩邊重複加總。
      const dayMap=new Map();
      for(const row of rows){
        const zone=row.zone?.name||"未分區",raw=row.rawData;
        if(row.category==="yield_archive"&&raw&&typeof raw==="object"){
          for(const [date,day] of Object.entries(raw)){
            const key=`${zone}|${date}`;if(!dayMap.has(key))dayMap.set(key,{zone,date,record:day,priority:1});
          }
        }else{
          const date=(String(row.sourceKey||"").match(/20\d{2}-\d{2}-\d{2}/)||[])[0]||null;
          if(date)dayMap.set(`${zone}|${date}`,{zone,date,record:raw,priority:2});
        }
      }
      dayMap.forEach(x=>pushDay(x.zone,x.date,x.record));
      return facts;
    }

    function ghFmtKg(v){return `${Math.round((Number(v)||0)*10)/10}kg`;}

    // 對齊產能模組「資料分析」資料夾3與資料夾5的固定公式：
    // 良品=A+B+D（不含NG）；分區占比=該區良品/全部選定區良品；品質占比=該級/該區含NG總量。
    function ghYieldFolderAnalysisAnswer(rows,q){
      const t=String(q||""),facts=ghYieldFacts(rows);if(!facts.length)return null;
      const req=ghDateRequest(t),askedZones=ghFindZones(t),explicitPeriod=!!(req.year||req.month||/本月|這個月|上月|去年|今年|\d+月/.test(t));
      const wantsFolder=/資料分析|品質|等級|占比|比例|良品|NG率|平均|採收天數|多區|跨區|比較|對比|排名/.test(t);
      if(!explicitPeriod&&!wantsFolder)return null;
      const zones=[...new Set(facts.map(f=>f.zone))];
      const byZone={};
      for(const z of zones)byZone[z]={A:0,B:0,D:0,NG:0,dates:new Set()};
      for(const f of facts){const z=byZone[f.zone]||(byZone[f.zone]={A:0,B:0,D:0,NG:0,dates:new Set()});z[f.grade]+=f.kg;if(f.date)z.dates.add(f.date);}
      const result=Object.entries(byZone).map(([zone,x])=>{
        const good=x.A+x.B+x.D,total=good+x.NG,qualityPct=g=>total?x[g]/total*100:0;
        return{zone,...x,good,total,days:x.dates.size,avg:x.dates.size?good/x.dates.size:0,qualityPct};
      }).filter(x=>x.total>0).sort((a,b)=>b.good-a.good);
      if(!result.length)return null;
      const grandGood=result.reduce((s,x)=>s+x.good,0),harvestDates=new Set(facts.map(f=>f.date).filter(Boolean)),avgDaily=harvestDates.size?grandGood/harvestDates.size:0;
      const period=req.ym?`${req.year}年${req.month}月`:req.year?`${req.year}年`:/本月|這個月/.test(t)?"本月":"指定期間";
      const detail=x=>`${x.zone}：良品 ${ghFmtKg(x.good)}（A ${ghFmtKg(x.A)}／B ${ghFmtKg(x.B)}／D ${ghFmtKg(x.D)}），NG ${ghFmtKg(x.NG)}（${x.qualityPct("NG").toFixed(1)}%），採收 ${x.days} 天，日均 ${ghFmtKg(x.avg)}`;
      const asksQuality=/品質|等級|A級|B級|D級|NG|占比|比例/.test(t);
      if(result.length===1){
        const x=result[0];
        if(asksQuality)return `${period}${x.zone}：A ${ghFmtKg(x.A)}（${x.qualityPct("A").toFixed(1)}%）、B ${ghFmtKg(x.B)}（${x.qualityPct("B").toFixed(1)}%）、D ${ghFmtKg(x.D)}（${x.qualityPct("D").toFixed(1)}%）、NG ${ghFmtKg(x.NG)}（${x.qualityPct("NG").toFixed(1)}%）；良品合計 ${ghFmtKg(x.good)}。`;
        return `${period}${detail(x)}。`;
      }
      if(askedZones.length>=2||/多區|跨區|比較|對比|排名|哪區|哪一區|最高|最多/.test(t)){
        const parts=result.map(x=>`${x.zone} ${ghFmtKg(x.good)}（占選定區 ${grandGood?(x.good/grandGood*100).toFixed(1):"0.0"}%${asksQuality?`；A/B/D/NG=${ghFmtKg(x.A)}/${ghFmtKg(x.B)}/${ghFmtKg(x.D)}/${ghFmtKg(x.NG)}`:""}）`);
        return `${period}良品合計 ${ghFmtKg(grandGood)}，最高是${result[0].zone} ${ghFmtKg(result[0].good)}；採收 ${harvestDates.size} 天，全區日均 ${ghFmtKg(avgDaily)}。各區：${parts.join("；")}。`;
      }
      return `${period}${detail(result[0])}。`;
    }

    function ghYieldCompositeAnswer(rows,q){
      const t=String(q||""),facts=ghYieldFacts(rows);
      if(!facts.length)return null;

      const grades=[...new Set(["A","B","D","NG"].filter(g=>new RegExp(`${g}\\s*級|(?:^|[^A-Z])${g}(?:[^A-Z]|$)`,"i").test(t)))];
      const wantsAB=/A\s*[+加與和、及]\s*B|A、B|A級.*B級|A\s*B\s*(?:合計|總共)/i.test(t);
      const selectedGrades=wantsAB?["A","B"]:(grades.length?grades:null);
      const scoped=selectedGrades?facts.filter(f=>selectedGrades.includes(f.grade)):facts;

      const sumBy=(arr,keyFn)=>{
        const o={}; for(const f of arr){const k=keyFn(f);if(k)o[k]=(o[k]||0)+f.kg;} return o;
      };
      const top=(o,desc=true)=>Object.entries(o).sort((a,b)=>desc?b[1]-a[1]:a[1]-b[1])[0]||null;
      const total=scoped.reduce((s,f)=>s+f.kg,0);
      const req=ghDateRequest(t);
      const period=req.ym?`${req.year}年${req.month}月`:req.year?`${req.year}年`:(/本月|這個月/.test(t)?"本月":"指定期間");

      // 品質 × 區域：A/B/D/NG 哪區最多/最少
      if(selectedGrades && /哪一區|哪個區|哪區|最多|最少|最高|最低/.test(t)){
        const byZone=sumBy(scoped,f=>f.zone), isMin=/最少|最低/.test(t), win=top(byZone,!isMin);
        if(win){
          const gLabel=selectedGrades.join("+")+"級";
          return `${period}${gLabel}${isMin?"最少":"最多"}的是${win[0]}，共 ${ghFmtKg(win[1])}。`;
        }
      }

      // 時間 × 產能/品質：哪個月最好、最多、最低
      if(/哪個月|哪一月|月份|月.*(?:最好|最多|最高|最少|最低)|(?:最好|最多|最高|最少|最低).*月/.test(t)){
        const byMonth=sumBy(scoped,f=>f.month), isMin=/最少|最低|最差/.test(t), win=top(byMonth,!isMin);
        if(win){
          const gLabel=selectedGrades?`${selectedGrades.join("+")}級`:"總產能";
          return `${gLabel}${isMin?"最低":"最高"}的月份是 ${win[0]}，共 ${ghFmtKg(win[1])}。`;
        }
      }

      // 區域 × 總產能：哪區產能最高
      if(!selectedGrades && /哪一區|哪個區|哪區/.test(t) && /產能|產量|收成|最多|最高|最低|最少/.test(t)){
        const byZone=sumBy(scoped,f=>f.zone), isMin=/最少|最低/.test(t), win=top(byZone,!isMin);
        if(win)return `${period}總產能${isMin?"最低":"最高"}的是${win[0]}，共 ${ghFmtKg(win[1])}。`;
      }

      // A+B / selected grade combined totals
      if(selectedGrades && /合計|總共|加總|多少|幾公斤|統合|綜合/.test(t)){
        const label=selectedGrades.join("+")+"級";
        const byZone=sumBy(scoped,f=>f.zone);
        const parts=Object.entries(byZone).sort((a,b)=>b[1]-a[1]).map(([z,v])=>`${z} ${ghFmtKg(v)}`);
        return `${period}${label}合計 ${ghFmtKg(total)}${parts.length>1?`；各區：${parts.join("、")}`:""}。`;
      }

      // Quality share / rate.
      if(selectedGrades && /比例|占比|良率|百分比|率/.test(t)){
        const all=facts.reduce((s,f)=>s+f.kg,0);
        const pct=all?total/all*100:0;
        return `${period}${selectedGrades.join("+")}級共 ${ghFmtKg(total)}，占總產能 ${pct.toFixed(1)}%。`;
      }

      // General multi-condition comparison summary.
      if(/比較|排名|綜合|統合|分析/.test(t)){
        const byZone=sumBy(scoped,f=>f.zone), byMonth=sumBy(scoped,f=>f.month), byGrade=sumBy(facts,f=>f.grade);
        const z=top(byZone,true),m=top(byMonth,true);
        const gp=Object.entries(byGrade).filter(([,v])=>v>0).map(([g,v])=>`${g}級 ${ghFmtKg(v)}`).join("、");
        return `${period}共 ${ghFmtKg(total)}；${z?`最高區域是${z[0]} ${ghFmtKg(z[1])}；`:""}${m?`最高月份是${m[0]} ${ghFmtKg(m[1])}；`:""}品質合計：${gp}。`;
      }
      return null;
    }

    function ghYieldHistoryStatus(rows){
      const archives=rows.filter(r=>r.category==="yield_archive");
      const live=rows.filter(r=>r.category==="yield");
      const years=[...new Set(archives.map(r=>r.period?.year||String(r.sourceKey||"").match(/:(\d{4})$/)?.[1]).filter(Boolean))];
      return {hasArchive:archives.length>0,archiveRows:archives.length,liveRows:live.length,years:years.sort()};
    }

    function ghYieldDirectAnswer(rows,q){
      if(!rows.length)return null;
      const x=ghYieldTotals(rows);
      if(!x.entries)return null;
      const zoneParts=Object.entries(x.byZone).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`${k} ${v.toFixed(1)}kg`);
      const gradeParts=Object.entries(x.byGrade).filter(([,v])=>v>0).map(([k,v])=>`${k}級 ${v.toFixed(1)}kg`);
      const period=ghDateRequest(q);
      const label=period.ym?period.ym:(period.year?String(period.year):"最近資料");
      return `${label}產量 ${x.total.toFixed(1)}kg`+
        (zoneParts.length?`；${zoneParts.join("、")}`:"")+
        (gradeParts.length?`。等級：${gradeParts.join("、")}`:"。");
    }

    // 「為什麼沒看到／查不到某區」是在問資料缺口的原因，不是在問總表——
    // 跟一般歷史查詢分開處理，不然會被 ghYieldDirectAnswer 的固定範本蓋掉，答非所問。
    function ghYieldMissingZoneAnswer(rows,q){
      const t=String(q||"");
      if(!/為什麼|為何|怎麼(?:會)?沒|沒看到|看不到|找不到|查不到/.test(t))return null;

      const zone=ghFindZone(t);
      if(!zone)return null; // 沒指名哪一區，交給其他邏輯處理

      const x=ghYieldTotals(rows);
      const period=ghDateRequest(q);
      const periodLabel=period.ym?`${period.year}年${period.month}月`:period.year?`${period.year}年`:"目前查詢的期間";

      if(x.byZone[zone.name])return null; // 其實有資料，不是缺口問題，交給其他邏輯回答

      const seenZones=Object.keys(x.byZone);
      return `${periodLabel}沒有查到${zone.name}的產能紀錄（即時資料跟歷史封存都查過了）。`+
        (seenZones.length?`同期間有資料的是：${seenZones.join("、")}；`:"")+
        `可能是這段時間${zone.name}還沒有人回報產量、或那段期間${zone.name}的歷史封存本來就沒收錄——如果現場確認${zone.name}其實已經有輸入資料，麻煩告訴我，可能是查詢邏輯還有沒抓到的地方。`;
    }


    function ghBuildSummaryPayload(q,mainRows,yieldRows){
      const rows=[...mainRows,...yieldRows];
      const byCategory={},byZone={};
      rows.forEach(r=>{
        byCategory[r.category]=(byCategory[r.category]||0)+1;
        const zn=r.zone?.name||"未分區";
        byZone[zn]=(byZone[zn]||0)+1;
      });
      return{
        question:q,
        queryInterpretation:{
          zone:ghFindZone(q)?.name||null,
          date:ghDateRequest(q),
          categories:[...ghRequestedCategories(q)],
          yieldRequested:/產能|收成|採收|收穫|產量|公斤|箱數|重量/.test(q),
          workSourcePolicy:{
            items1to5:"只以 worklog.function4Work1to5（功能表4圖一）判讀主管指派、級別、受文者、待確認、回報進度、完成狀態。",
            items6to8:"只以 zonework.function3Work6to8.confirmedHistory（功能表7→內層表3）統計實際已確認用量；今天的數字只算今天 confirmedAt。"
          }
        },
        coverage:{
          totalRecords:rows.length,
          byCategory,
          byZone,
          sourceProjects:{
            farm:GH_MAIN.projectId,
            yield:GH_YIELD.projectId
          }
        },
        records:rows
      };
    }

    async function ghAskAI(q,payload){
      const keys=loadKeys();
      const nameLine=teddyPreferredName?`使用者偏好被稱呼為「${teddyPreferredName}」，回答時可以這樣稱呼他/她；除此之外不要引用任何其他一般模式的個人資訊（家人、心情、興趣等），維持溫室模式只談工作資料的定位。\n\n`:"";
      const notesLine=teddyGreenhouseNotes.length?`使用者在溫室模式明確要求記住的筆記（僅供參考，不要當成 V5.1 的結構化資料，兩者衝突時以結構化資料為準）：\n${teddyGreenhouseNotes.map((n,i)=>`${i+1}. ${n}`).join("\n")}\n\n`:"";
      const system=`不要使用 Markdown（不要 **、#、表格），用一般文字；列點用「・」。\n${teddyGreenhouseIdentity()}${nameLine}${notesLine}你現在收到的是「已正規化」的 V5.1 資料，不是原始 JSON 垃圾堆。

工作資料的唯一判讀規則（最高優先，不能混用）：
- 工作項目1-5：1=打芽(側)、2=打芽(地)、3=除草、4=剪葉、5=覆蓋。
  只讀 worklog.function4Work1to5，也就是「功能表4・圖一」的狀態。
  assignedLevel 是主管指派級別（數字越大越緊急）；recipients 是被指派/受文的人；
  pendingConfirmation=true 代表已指派但仍待確認/回報；
  progress=1 代表已完成；progress=2~5 代表仍在處理中，數字越大越初期；
  confirmedBy / acknowledgedAt 用來回答誰已確認、是否已確認。
  回答「除草有沒有指派、指派給誰、確認了沒、做到哪裡」時，絕對以這組欄位為準。

- 工作項目6-8：6=補水、7=施肥、8=其他資材。
  唯一入口是「功能表7 → 內層表3」；只讀 zonework.function3Work6to8.confirmedHistory 的實際回報統計。
  只有已回報確認、且有 confirmedAt 的紀錄才算實際用量；目前尚未確認的 checks/extra 不算。
  問「今天加了多少／今天用了多少」時，只加總 confirmedAt 為今天的紀錄。
  單位固定：溝灌=噸、噴灌=分鐘、米糠/金旺=包、其他資材=kg。
  不可以拿功能表4的1-5資料推測6-8，也不可以用6-8目前未確認的輸入值當成已完成統計。

產能資料的唯一判讀規則（功能表3）：
- 任何「產能／產量／採收／收成／公斤／A/B/D/NG」問題，只能走功能表3，不得混讀 worklog、zonework 或其他工作表。
- 進功能表3後再分成：輸入產能、歷史資料、資料分析、使用紀錄、歷史資料匯入。
- 資料分析必須以「目前產能 + 已完成的歷史資料匯入」為完整資料來源；若沒有歷史封存資料，先明確要求完成歷史資料匯入，不可用零碎近期資料冒充完整分析。
- 歷史資料匯入是資料分析的前置步驟；匯入完成後才能做跨年、跨月、趨勢、比較與決策分析。
- 必須理解「時間 × 產能 × 品質 × 區域」的多條件問題，例如：去年哪個月產能最高、A級最多是哪區、B級最多是哪區、D級最多是哪區、本月A+B級合計、某年某月某區A級占比、跨月/跨區比較。
- 所有加總、最高、最低、排名、比例都只能依工作表3實際公斤數計算；不得引用功能表4、11或其他資料補值。
- 輸入產能屬寫入動作，必須先整理草稿並確認後才可寫入，不可直接覆寫。

功能表10・上下班打卡／出勤規則：
- 任何打卡、上下班、出勤、加班、請假、遲到、早退、工時問題，只能讀 attendance / attendance_pref / leave_types。
- 功能表10在 TEDDY 端只做「查詢與解讀」；不得替任何人打卡，也不得主動修改打卡紀錄。
- attendance key 格式為 attendance:{personId}:{YYYY-MM-DD}；內容可含 regular.punches、overtime.punches、leave。
- 問某一天／某月／某人時，必須先依日期與 personId 過濾，再回答；不可混入其他日期或其他人。
- regular 與 overtime 都有 punches 與 geo；punches 固定為 amIn、amOut、pmIn、pmOut 四個時段。
- leave 可含 type、note、hours、at；abnormalities 可含 pending／confirmed 的未完成班次異常。
- attendancePref:{personId} 是休息時段 restStart/restEnd；attendanceLeaveTypes 是全場共用假別清單。
- 舊資料只有 punches 或 clockInAt/clockOutAt 時，要視為 regular 正常班資料，不可漏掉。
- 找不到資料就直接說功能表10沒有查到，不可用其他工作表補猜。

其他資料分類：
- workmonth：工作月表，常見 day/items/note。
- spraylog：施肥／噴藥月曆，常見 code/name/dosage/qty/type。
- attendance / attendance_pref / leave_types：出勤、打卡、偏好、假別。
- calendar：年度計畫／行事曆／產季。
- zonenotice：分區通知／留言。
- person / access：人員、帳號、角色與權限。
- yield / yield_archive：產能逐日資料與歷史年度封存，來自獨立 figdata-d2737 / fbrfA_data。

回答入口鎖定：
- 產能＝功能表3；工作1-5＝功能表4；計畫＝功能表5；耗材6-8＝功能表7→內層表3；打卡＝功能表10。
- 程式已先選好入口並過濾資料；你只能回答提供的該入口資料，不得跳到別的功能表，不得改月份、溫室或問題主詞。
- 先回答使用者真正問的結果，不要朗讀「已進入功能表／正在讀取／資料已匯入」等流程說明。

判讀規則：
1. sourceKey 是原始 V5.1 key；category / zone / period 已由程式先解析。
2. facts 是從原始資料抽出的欄位路徑=值；回答數字、日期、資材、工項狀態時優先引用 facts。
3. 「最近」代表依 period / updatedAt / sourceKey 的日期排序理解最近資料；不要把沒有日期的設定資料當成最近工作紀錄。
4. 問某分區，只使用該分區紀錄；全場問題才可跨區彙整。
5. 工作問題先判斷是1-5還是6-8：1-5只看功能表4；6-8唯一入口為功能表7→內層表3，實際數量只看 confirmedHistory。若同時問「今天工作」，先回答1-5的指派/確認狀態，再補6-8今天已確認的統計。
6. 農場現場數字只能依提供資料回答，找不到就明確說「V5.1 目前沒有查到這項紀錄」，不可編造。
7. 若問題是一般農業知識而非現場紀錄，可使用農藝知識正常回答，不要因資料庫沒記錄就拒答。
8. 回答必須短：一般問題 1～3 句；需要列數字時最多 4 個短項目。先講結論，不重述問題，不寫長篇背景。語氣維持 TEDDY 的人設（親切、像在跟孫爸說話），不要像冷冰冰的報表；數字照資料不改。
9. 若使用者只問「看得到嗎／有沒有嗎」，直接回答有或沒有，再給最重要數字。繁體中文、自然。${payload&&payload.f7?"\n\n"+F7_RULES_TEXT:""}`;

      let body=JSON.stringify(payload,null,2);
      if(body.length>52000)body=body.slice(0,52000)+"\n...[已截斷較低優先紀錄]";
      const content=`使用者問題：${q}\n\nV5.1 結構化資料：\n${body}`;
      const select=document.getElementById("teddyModelSelect"),pref=select?select.value:"auto";
      const ghDeep=teddyIsComplexQuestion(q)&&(keys.openai||keys.anthropic);
      const chosen=ghDeep?teddyDeepChoice(keys).p:(pref==="auto"?teddyChooseProvider(q,keys,"greenhouse"):pref);

      if(chosen==="anthropic"&&keys.anthropic){
        const r=await teddyFetch("https://api.anthropic.com/v1/messages",{
          method:"POST",
          headers:{
            "Content-Type":"application/json","x-api-key":keys.anthropic,
            "anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"
          },
          body:JSON.stringify({model:ghDeep&&teddyDeepChoice(keys).p==="anthropic"?teddyDeepChoice(keys).model:"claude-sonnet-5-5",max_tokens:ghDeep?1500:500,system,messages:[{role:"user",content}]})
        },30000);
        const d=await r.json();
        if(!r.ok)throw new Error(d?.error?.message||`Claude HTTP ${r.status}`);
        return(d.content||[]).filter(x=>x.type==="text").map(x=>x.text).join("")||"沒有回覆。";
      }
      if(chosen==="openai"&&keys.openai){
        const r=await teddyFetch("https://api.openai.com/v1/responses",{
          method:"POST",
          headers:{"Content-Type":"application/json",Authorization:`Bearer ${keys.openai}`},
          body:JSON.stringify({model:teddyDeepOpenAIModel(),reasoning:{effort:ghDeep?"high":"low"},input:[{role:"developer",content:[{type:"input_text",text:system}]},{role:"user",content:[{type:"input_text",text:content}]}]})
        },90000);
        const d=await r.json();
        if(!r.ok)throw new Error(d?.error?.message||`Astra HTTP ${r.status}`);
        if(d.usage){teddyRecordChatUsage("openai",{input:d.usage.input_tokens||0,cached:d.usage.input_tokens_details?.cached_tokens||0,output:d.usage.output_tokens||0,apiCalls:1,costUsd:teddyAstraUsageCost(d.usage)});}
        return (d.output_text||((d.output||[]).flatMap(x=>x.content||[]).filter(x=>x.type==="output_text").map(x=>x.text||"").join("\n"))).trim()||"沒有回覆。";
      }
      if(chosen==="gemini"&&keys.google){
        const r=await teddyFetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${keys.google}`,{
          method:"POST",headers:{"Content-Type":"application/json"},
          body:JSON.stringify({system_instruction:{parts:[{text:system}]},contents:[{role:"user",parts:[{text:content}]}]})
        },30000);
        const d=await r.json();
        if(!r.ok)throw new Error(d?.error?.message||`Gemini HTTP ${r.status}`);
        return(d.candidates?.[0]?.content?.parts||[]).map(x=>x.text||"").join("")||"沒有回覆。";
      }
      if(chosen==="grok"&&keys.xai){
        const r=await teddyFetch("https://api.x.ai/v1/chat/completions",{
          method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${keys.xai}`},
          body:JSON.stringify({model:"grok-4.6",messages:[{role:"system",content:system},{role:"user",content}],max_tokens:500})
        },30000);
        const d=await r.json();
        if(!r.ok)throw new Error(d?.error?.message||`Grok HTTP ${r.status}`);
        return d.choices?.[0]?.message?.content||"沒有回覆。";
      }
      return`V5.1 已整理 ${payload.coverage.totalRecords} 筆相關資料，但目前沒有可用 AI Key 做語意解讀。`;
    }

    async function ghScanKeyPrefixes(){
      const docs=await ghFetchCollection(GH_MAIN.projectId,GH_MAIN.apiKey,"kv",1000);
      const counts={},samples={};
      docs.forEach(d=>{
        let prefix=d.key.includes(":")?d.key.split(":")[0]:d.key;
        counts[prefix]=(counts[prefix]||0)+1;
        if(!samples[prefix])samples[prefix]=[];
        if(samples[prefix].length<3)samples[prefix].push(d.key);
      });
      const recognized=new Set([
        "zonework","worklog","workmonth","spraylog","attendance","attendancePref",
        "attendanceLeaveTypes","calendar","zonenotice","person","monthlyWorkItemsList",
        "sprayDrugList","fertilizerList","printlog"
      ]);
      const lines=Object.keys(counts).sort().map(p=>{
        const flag=recognized.has(p)||/permission|role|auth|account|user|member|report|summary|stat|dashboard/i.test(p)
          ?"✅ 已納入/可辨識":"🆕 尚未建 schema";
        return`${p}：${counts[p]} 筆 (${flag})`;
      });
      return{total:docs.length,summary:lines.join("\n"),counts,samples};
    }

    // ===== 溫室模式語音：共用 TEDDY 原本 TTS，另有獨立開關 =====
    let ghVoiceEnabled = localStorage.getItem("teddy_greenhouse_voice") === "1";
    let ghRecognition = null;
    let ghListening = false;

    function ghStripEmojiForSpeech(text){
      return String(text || "")
        .replace(/[\p{Extended_Pictographic}\uFE0F]/gu, "")
        .replace(/[*_`#]/g, "")
        .replace(/\s{2,}/g, " ")
        .trim();
    }

    async function ghSpeak(text, force=false){
      if ((!ghVoiceEnabled && !force) || !text) return;
      let clean = ghStripEmojiForSpeech(text);
      if (!clean) return;
      // 回答太長時只唸重點、不要整段照唸——文字內容還是完整顯示在畫面上，
      // 語音只是輔助，唸太長反而讓人抓不到重點，也拖時間。
      const SPEAK_MAX = 140;
      if (clean.length > SPEAK_MAX) {
        const cut = clean.slice(0, SPEAK_MAX);
        const lastBreak = Math.max(cut.lastIndexOf("。"), cut.lastIndexOf("；"), cut.lastIndexOf("，"));
        clean = (lastBreak > SPEAK_MAX * 0.5 ? cut.slice(0, lastBreak + 1) : cut) + "，詳細內容我打在畫面上了。";
      }
      // 共用 Teddy 原本的聲音選擇、OpenAI TTS 與瀏覽器 TTS fallback
      try { await teddySpeak(clean, "sweet", true); } catch (_) {}
    }

    function ghUpdateVoiceUi(){
      const b=document.getElementById("btnGreenhouseVoice");
      if(b){
        b.textContent=ghVoiceEnabled ? "🔊 語音開" : "🔇 語音關";
        b.style.borderColor=ghVoiceEnabled ? "#5eead4" : "#355248";
        b.style.color=ghVoiceEnabled ? "#d9fff0" : "#9fb4ab";
      }
    }

    function ghInitVoice(){
      ghUpdateVoiceUi();

      const toggle=document.getElementById("btnGreenhouseVoice");
      const preview=document.getElementById("btnGreenhouseVoicePreview");
      const mic=document.getElementById("btnGreenhouseMic");
      const input=document.getElementById("greenhouseInput");
      const SR=window.SpeechRecognition || window.webkitSpeechRecognition;

      if(toggle) toggle.onclick=()=>{
        ghVoiceEnabled=!ghVoiceEnabled;
        localStorage.setItem("teddy_greenhouse_voice",ghVoiceEnabled?"1":"0");
        ghUpdateVoiceUi();
        if(!ghVoiceEnabled){
          try{ if(teddyCurrentAudio) teddyCurrentAudio.pause(); }catch(_){}
          try{ if(window.speechSynthesis) window.speechSynthesis.cancel(); }catch(_){}
        }else{
          ghSpeak("溫室語音已開啟。",true);
        }
      };

      if(preview) preview.onclick=()=>ghSpeak("我是 Pongchi，溫室管理語音已經準備好了。",true);

      if(!SR || !mic){
        if(mic){
          mic.disabled=true;
          mic.textContent="🎤 不支援";
          mic.style.opacity=".45";
          mic.title="此瀏覽器不支援語音輸入，請使用 Chrome";
        }
        return;
      }

      ghRecognition=new SR();
      ghRecognition.lang="zh-TW";
      ghRecognition.interimResults=true;
      ghRecognition.continuous=false;

      ghRecognition.onresult=(ev)=>{
        let t="";
        for(let i=ev.resultIndex;i<ev.results.length;i++) t+=ev.results[i][0].transcript;
        if(input) input.value=t;
      };

      const finish=()=>{
        ghListening=false;
        if(mic){
          mic.textContent="🎤 單次語音";
          mic.style.background="#18231f";
        }
      };

      ghRecognition.onerror=(ev)=>{
        finish();
        if(ev && ev.error && ev.error!=="no-speech"){
          ghLog("assistant","語音辨識失敗："+ev.error);
        }
      };

      ghRecognition.onend=()=>{
        finish();
        if(input && input.value.trim()) ghSend();
      };

      mic.onclick=()=>{
        if(ghListening){
          try{ghRecognition.stop();}catch(_){}
          return;
        }
        ghListening=true;
        if(mic){
          mic.textContent="⏹ 停止";
          mic.style.background="#3a1a1a";
        }
        if(input) input.value="";
        try{ghRecognition.start();}
        catch(e){
          finish();
          ghLog("assistant","無法啟動麥克風："+e.message);
        }
      };
    }

    // 耗材清單抽成共用常數：ghWork68DirectAnswer（實際回答）跟主題判斷（要不要留在耗材話題）
    // 都要用同一份，不然像「黃豆」「水果」這種只在其中一邊認得的字，會導致答案答對了、
    // 但主題狀態被誤判成「無關」而重置，下一句「那區」這種追問就接不上上文。
    const GH_MATERIAL_PATTERNS=[
      ["溝灌","噸",6],["噴灌","分鐘",6],["米糠","包",7],["金旺","包",7],
      ["黃豆","kg",8],["水果","kg",8],["硝酸鉀","kg",8],["磷酸一鉀","kg",8],
      ["硫酸鉀","kg",8],["鈣鎂粉","kg",8],["微量元素","kg",8]
    ];
    function ghIsMaterialsQuestion(q){
      const t=String(q||"");
      return GH_MATERIAL_PATTERNS.some(([name])=>t.includes(name)) ||
        /耗材|補水|澆水|施肥|肥料|其他資材|資材|工作[678]|工項[678]|灌|澆|下肥|肥下|施了肥|上肥|液態|固態|肥/.test(t);
    }

    function ghWork68DirectAnswer(q,rows){
      const text=String(q||"");
      const hits=GH_MATERIAL_PATTERNS.filter(([name])=>text.includes(name));
      const asks68=ghIsMaterialsQuestion(text);
      if(!asks68)return null;

      const zone=ghFindZone(text);
      const req=ghDateRequest(text);

      // 先判斷使用者問的是工作6、7、8中的哪一類。
      // 「肥料／施肥」只看工作7；「補水／澆水」只看工作6；
      // 明確材料名稱則以該材料為最高優先，不讓「耗材」這種大詞把其他類別混進來。
      let requestedItemId=null;
      if(!hits.length){
        if(/補水|澆水|灌水|灌溉/.test(text))requestedItemId=6;
        else if(/施肥|肥料|肥份/.test(text))requestedItemId=7;
        else if(/其他資材|資材/.test(text) && !/耗材/.test(text))requestedItemId=8;
      }

      const wantsByZone=!zone && /那區|哪一區|哪個區|哪幾區|哪些區|各區/.test(text);
      const asksWhen=/哪天|哪日|哪幾天|什麼時候|何時|幾號|哪次/.test(text);
      const asksWhat=/用了什麼|用什麼|有哪些|有什麼|什麼肥料|哪些肥料|什麼資材|哪些資材|內容/.test(text);
      const histories=[];

      rows.filter(r=>r.category==="zonework").forEach(r=>{
        const hs=r.function3Work6to8?.confirmedHistory||[];
        hs.forEach(h=>{
          if(zone && r.zone?.id!==zone.id)return;
          const at=String(h.confirmedAt||"");
          if(req.date && !at.startsWith(req.date))return;
          if(req.ym && !at.startsWith(req.ym))return;
          if(req.year && !req.month && !at.startsWith(String(req.year)))return;
          if(hits.length && !hits.some(([name])=>name===h.material))return;
          if(requestedItemId && Number(h.itemId)!==requestedItemId)return;
          histories.push({...h,zone:r.zone});
        });
      });

      const zoneLabel=zone?zone.name:"全區";
      const periodLabel=req.date?req.date:req.ym?`${req.year}年${req.month}月`:req.year?`${req.year}年`:"目前";
      const materialLabel=hits.map(([name])=>name).join("、");
      const classLabel=requestedItemId===6?"補水":requestedItemId===7?"肥料":requestedItemId===8?"其他資材":"工作6～8";

      if(!histories.length){
        if(hits.length)return `${zoneLabel}${periodLabel}沒有查到已確認的${materialLabel}使用紀錄。`;
        return `${zoneLabel}${periodLabel}沒有查到${classLabel}的已確認使用紀錄。`;
      }

      if(asksWhen){
        const sorted=[...histories].sort((a,b)=>String(a.confirmedAt).localeCompare(String(b.confirmedAt)));
        const parts=sorted.map(h=>{
          const day=String(h.confirmedAt||"").slice(0,10);
          const n=Number.isInteger(h.quantity)?String(h.quantity):String(Math.round(h.quantity*100)/100);
          return `${day} ${n}${h.unit}${h.material}`;
        });
        return `${zoneLabel}${periodLabel}已確認的${materialLabel||classLabel}使用紀錄：${parts.join("、")}。`;
      }

      if(wantsByZone){
        const byZone={};
        histories.forEach(h=>{
          const zn=h.zone?.name||"未分區";
          const key=`${zn}|${h.material}|${h.unit}`;
          byZone[key]=(byZone[key]||0)+(Number(h.quantity)||0);
        });
        const parts=Object.entries(byZone).map(([key,val])=>{
          const [zn,material,unit]=key.split("|");
          const n=Number.isInteger(val)?String(val):String(Math.round(val*100)/100);
          return `${zn} ${material} ${n}${unit}`;
        });
        return `${periodLabel}各區已確認：${parts.join("、")}。`;
      }

      // 「用了什麼肥料／資材」要回答品項，不是只判斷有沒有資料。
      // 同一品項有多筆時先加總，避免回答成一長串重複紀錄。
      const totals={};
      histories.forEach(h=>{
        const key=`${h.material}|${h.unit}`;
        totals[key]=(totals[key]||0)+(Number(h.quantity)||0);
      });
      const allParts=Object.entries(totals).map(([key,val])=>{
        const [material,unit]=key.split("|");
        const n=Number.isInteger(val)?String(val):String(Math.round(val*100)/100);
        return {material,unit,n,val};
      });

      if(asksWhat && !hits.length){
        return `${zoneLabel}${periodLabel}已確認使用的${classLabel}：${allParts.map(x=>`${x.material} ${x.n}${x.unit}`).join("、")}。`;
      }

      if(hits.length){
        const wanted=new Set(hits.map(([name])=>name));
        const parts=allParts.filter(x=>wanted.has(x.material)).map(x=>`${x.n}${x.unit}${x.material}`);
        if(!parts.length)return `${zoneLabel}${periodLabel}沒有查到已確認的${materialLabel}使用紀錄。`;
        return `${zoneLabel}${periodLabel}共用了 ${parts.join("、")}。`;
      }

      return `${zoneLabel}${periodLabel}已確認：${allParts.map(x=>`${x.material} ${x.n} ${x.unit}`).join("、")}。`;
    }

    // ===== 功能表4・工作1-5（打芽/除草/剪葉/覆蓋）唯一入口 =====
    // 跟功能表3（產能）、功能表10（打卡）同一套流程：先判斷是不是這類問題，
    // 再從已匯入的 worklog 資料裡，只挑 function4Work1to5 出來統計，不混讀其他工作表。
    function ghIsWorkQuestion(q){
      const t=String(q||"");
      return /打芽|除草|剪葉|覆蓋|工項|工作指派|指派給|受文|待確認|回報進度|工作進度|完成了嗎|做完了嗎|誰負責|誰在做|誰要做/.test(t);
    }

    function ghWork45Intent(q){
      const t=String(q||"");
      if(/誰負責|誰在做|誰要做|指派給|受文/.test(t))return "assignee";
      if(/待確認|還沒確認|尚未確認/.test(t))return "pending";
      if(/進度|完成了嗎|做完了嗎|完成了沒|做完了沒/.test(t))return "progress";
      return "summary";
    }

    function ghWork45MatchItem(q){
      const t=String(q||"");
      for(const id of [1,2,3,4,5]){
        if(t.includes(GH_WORK_ITEMS[id]))return id;
      }
      return null;
    }

    function ghWork45DirectAnswer(q,rows){
      // 功能表4採兩層回答：
      // 1) 未指定分區：只確認哪些分區目前有工作，再問「你想了解哪一區？」
      // 2) 指定分區：固定整理工作1-5的「指派 + 進度」，不主動展開格位細節。
      const text=String(q||"").trim();
      const zone=ghFindZone(text);
      const req=ghDateRequest(text);
      const itemId=ghWork45MatchItem(text);
      const onlyBudding=/打芽/.test(text) && itemId===null;

      // 已經按下「工作」功能鍵後，單獨回答「四南／三期」也視為有效追問。
      if(!zone && !ghIsWorkQuestion(text) && !/進度|情況|狀態|報告|全部|各區|各分區|目前|現在|總覽|哪些區|哪幾區|有工作/.test(text))return null;

      const base=[];
      rows.filter(r=>r.category==="worklog").forEach(r=>{
        if(req.ym && !String(r.period||"").startsWith(req.ym))return;
        if(req.date && r.period!==req.date)return;
        (r.function4Work1to5||[]).forEach(item=>{
          base.push({...item,zone:r.zone,period:r.period});
        });
      });

      const periodLabel=req.ym?`${req.year}年${req.month}月`:req.date?req.date:"目前";

      // 第一層：沒有指定分區，只報「有工作的分區」，不把全部工作細節倒出來。
      if(!zone){
        const zoneMap=new Map();
        base.forEach(i=>{
          if(!i.zone?.id)return;
          if(!zoneMap.has(i.zone.id))zoneMap.set(i.zone.id,i.zone.name);
        });
        const activeZones=GH_ZONES.filter(z=>zoneMap.has(z.id)).map(z=>z.name);
        if(!activeZones.length)return `${periodLabel}功能表4沒有查到工作1到5的紀錄。`;
        return `${periodLabel}共有 ${activeZones.length} 個分區有工作：${activeZones.join("、")}。你想了解哪一區？`;
      }

      // 第二層：指定分區後，只使用該分區資料。
      let items=base.filter(i=>i.zone?.id===zone.id);
      if(itemId)items=items.filter(i=>i.itemId===itemId);
      if(onlyBudding)items=items.filter(i=>i.itemId===1||i.itemId===2);

      if(!items.length){
        const wanted=itemId?GH_WORK_ITEMS[itemId]:onlyBudding?"打芽":"工作1到5";
        return `${zone.name}${periodLabel}沒有查到${wanted}的工作紀錄。`;
      }

      // 若同一工作因不同格位/紀錄出現多筆，先整理成工作層級，不主動展開格位。
      const byItem=new Map();
      items.forEach(i=>{
        if(!byItem.has(i.itemId))byItem.set(i.itemId,[]);
        byItem.get(i.itemId).push(i);
      });

      const lineFor=(id,list)=>{
        const first=list[0];
        const names=[];
        list.forEach(i=>(i.recipients||[]).forEach(r=>{ if(r?.name&&!names.includes(r.name))names.push(r.name); }));
        const levels=[...new Set(list.map(i=>i.assignedLevel).filter(Boolean))];
        const assigned=names.length?names.join("、"):(levels.length?`級別${levels.join("/")}`:"未指派");

        const done=list.filter(i=>i.progress===1).length;
        const pending=list.filter(i=>i.pendingConfirmation).length;
        const progressing=list.filter(i=>Number(i.progress)>1);
        let progress="尚未回報";
        if(done===list.length)progress="已完成";
        else if(progressing.length){
          const max=Math.max(...progressing.map(i=>Number(i.progress)||0));
          progress=`處理中（進度${max}/5）`;
          if(done)progress+=`，部分已完成`;
        }else if(done)progress=`部分完成（${done}/${list.length}）`;
        else if(pending)progress="已指派、待確認";

        const label={1:"打芽",2:"打芽底",3:"除草",4:"剪葉",5:"覆蓋"}[id]||first.itemName||`工作${id}`;
        return `${id}. ${label}：指派 ${assigned}，進度 ${progress}`;
      };

      const ids=itemId?[itemId]:onlyBudding?[1,2]:[1,2,3,4,5];
      const lines=[];
      ids.forEach(id=>{
        const list=byItem.get(id);
        if(list?.length)lines.push(lineFor(id,list));
        else lines.push(`${id}. ${{1:"打芽",2:"打芽底",3:"除草",4:"剪葉",5:"覆蓋"}[id]}：無工作紀錄`);
      });
      return `${zone.name}${periodLabel}工作：\n${lines.join("\n")}`;
    }

    // ===== 功能表5・工項行事曆／年度計畫 =====
    // 資料結構跟耗材(zonework)完全不同：不是逐筆確認紀錄，是「每區每月一筆」，
    // 存 {text,color,date}：color是分類(產季/剪枝/座果/度冬…)，date是那個月第幾號開始，text是備註。
    const GH_CAL_COLORS={
      season:"產季",beige:"備註",green:"座果",purple:"剪枝",
      red:"重要",cyan:"預估",alert:"度冬",none:"清空"
    };
    const GH_CAL_KEYWORD_TO_COLOR={
      產季:"season",剪枝:"purple",座果:"green",度冬:"alert",備註:"beige",重要:"red",預估:"cyan"
    };
    const GH_SOLAR_TERMS_BY_MONTH={
      1:"小寒／大寒",2:"立春／雨水",3:"驚蟄／春分",4:"清明／穀雨",
      5:"立夏／小滿",6:"芒種／夏至",7:"小暑／大暑",8:"立秋／處暑",
      9:"白露／秋分",10:"寒露／霜降",11:"立冬／小雪",12:"大雪／冬至"
    };

    function ghCalendarNormalize(data){
      data=data||{};
      let color=data.color||data.status||data.type||data.category||"none";
      // 功能表5有些舊資料直接存中文狀態，而不是色碼；統一轉回色碼。
      if(GH_CAL_KEYWORD_TO_COLOR[color]) color=GH_CAL_KEYWORD_TO_COLOR[color];
      return{
        color,
        colorLabel:GH_CAL_COLORS[color]||String(data.label||data.name||color||""),
        date:data.date||data.startDay||data.day||null,
        text:data.text||data.note||data.content||""
      };
    }

    // 原始資料裡常常「分類」跟「備註」填了同一個字（例如色碼=剪枝、text 也填「剪枝」），
    // 兩個都印出來就會變成「剪枝，剪枝」。這裡統一判斷：備註沒有補充新資訊時，就不重複顯示。
    function ghCalendarExtraText(cal){
      const text=String(cal.text||"").trim();
      if(!text)return "";
      const label=String(cal.colorLabel||"").trim();
      if(text===label || label.includes(text) || text.includes(label))return "";
      return text;
    }

    function ghCalendarPeriodFromText(text){
      const t=String(text||"");
      let m=t.match(/(20\d{2})[-_/](0?[1-9]|1[0-2])/);
      if(m)return `${m[1]}-${String(Number(m[2])).padStart(2,"0")}`;
      m=t.match(/(20\d{2})(0[1-9]|1[0-2])/);
      if(m)return `${m[1]}-${m[2]}`;
      return null;
    }

    function ghCalendarZoneFromText(text){
      const t=String(text||"");
      return ghFindZone(t) || GH_ZONES.find(z=>t.includes(z.id)||t.includes(z.yield)) || null;
    }

    // 功能表5歷史版本不一定都是 calendar:zone:YYYY-MM 的單筆格式。
    // 這個展開器同時支援：單格、YYYYMM key、中文溫室 key，以及巢狀「年/月/溫室」矩陣。
    function ghExpandCalendarDocument(doc){
      const out=[];
      const seen=new Set();
      const push=(zone,period,value,path)=>{
        if(!zone||!period||!value||typeof value!=="object")return;
        const cal=ghCalendarNormalize(value);
        const meaningful=cal.color!=="none" || !!cal.date || !!cal.text;
        if(!meaningful)return;
        const sig=`${zone.id}|${period}|${cal.color}|${cal.date||""}|${cal.text||""}`;
        if(seen.has(sig))return; seen.add(sig);
        out.push({sourceKey:doc.key+(path?`#${path}`:""),category:"calendar",meaning:"功能表5年度計畫",zone:{id:zone.id,name:zone.name},period,function5Calendar:cal,facts:[],preview:"",updatedAt:doc.updatedAt||null});
      };
      const baseZone=ghCalendarZoneFromText(doc.key);
      const basePeriod=ghCalendarPeriodFromText(doc.key);
      push(baseZone,basePeriod,doc.data,"");
      const walk=(v,path,zone,period,depth)=>{
        if(depth>6||!v||typeof v!=="object")return;
        const here=path.join(":");
        const z=ghCalendarZoneFromText(here)||zone;
        const per=ghCalendarPeriodFromText(here)||period;
        push(z,per,v,here);
        if(Array.isArray(v)){v.forEach((x,i)=>walk(x,[...path,String(i)],z,per,depth+1));return;}
        Object.entries(v).forEach(([k,x])=>walk(x,[...path,k],z,per,depth+1));
      };
      walk(doc.data,[doc.key],baseZone,basePeriod,0);
      return out;
    }

    function ghCalendarDaysInMonth(y,m){return new Date(y,m,0).getDate();}

    // 累計天數要先往回找到「真正的起始月」，再從起始月往前累加到你問的那個月為止——
    // 不是每次都把你問的月份當成起點往後算（那樣算出來的數字會整個對不上畫面）。
    function ghCalendarCumulativeDays(calRows,zoneId,targetY,targetM){
      const find=(y,m)=>calRows.find(r=>r.zone?.id===zoneId&&r.period===`${y}-${String(m).padStart(2,"0")}`)?.function5Calendar;
      const targetCal=find(targetY,targetM);
      if(!targetCal)return 0;
      const color=targetCal.color;

      let y0=targetY,m0=targetM;
      for(let i=0;i<24;i++){
        const py=m0===1?y0-1:y0, pm=m0===1?12:m0-1;
        const prev=find(py,pm);
        if(!prev||prev.color!==color)break;
        y0=py;m0=pm;
      }
      const startDate=find(y0,m0)?.date||1;

      let total=0,y=y0,m=m0,firstDay=startDate;
      for(let i=0;i<24;i++){
        const dim=ghCalendarDaysInMonth(y,m);
        const dayStart=(y===y0&&m===m0)?firstDay:1;
        total+=dim-dayStart+1;
        if(y===targetY&&m===targetM)break;
        m++;if(m>12){m=1;y++;}
      }
      return total;
    }

    const GH_CALENDAR_ZONE_ORDER=["p1","p2","zone3","south4","north4","zone5"];
    function ghCalendarZonesInOrder(){
      return GH_CALENDAR_ZONE_ORDER.map(id=>GH_ZONES.find(z=>z.id===id)).filter(Boolean);
    }
    function ghCalendarEntryReadyText(rows){
      const calRows=(rows||[]).filter(r=>r.category==="calendar"&&r.function5Calendar);
      return calRows.length ? "資料已讀取。想分析節氣、月份、區域還是溫室？" : "功能表5目前沒有讀到計畫資料。";
    }

    function ghCalendarDirectAnswer(q,rows){
      const t=String(q||"");
      const calRows=rows.filter(r=>r.category==="calendar"&&r.function5Calendar);
      const isCalQuestion=ghIsCalendarQuestion(t);
      if(!isCalQuestion)return null;

      const now=new Date(),cy=now.getFullYear(),cm=now.getMonth()+1;
      const zone=ghFindZone(t);
      const req=ghDateRequest(t);

      // 1. 日期觀念：今天／現在＋節氣，只回答日期附近的節氣；不把「接近」誤解成接近的計畫。
      if(/節氣/.test(t) && !/剪枝|座果|度冬|產季/.test(t)){
        const m=req.month||cm;
        return `${req.year||cy}年${m}月的節氣是${GH_SOLAR_TERMS_BY_MONTH[m]}。`;
      }
      if(/今天|今日|現在/.test(t) && /接近|靠近|附近|前後|什麼/.test(t) && !/剪枝|座果|度冬|產季|計畫/.test(t)){
        return `${cy}年${cm}月${now.getDate()}日，接近的節氣是${GH_SOLAR_TERMS_BY_MONTH[cm]}。`;
      }

      // 2. 下次／什麼時候要剪枝（或其他分類）——掃描未來月份，找每一區最早出現的那一筆。
      const wantsNext=/下次|下一次|什麼時候|何時|接下來/.test(t);
      const keywordHit=Object.keys(GH_CAL_KEYWORD_TO_COLOR).find(k=>t.includes(k));
      const requestedZones=ghFindZones(t);

      // 計畫＋一個或多個溫室，例如「一期二期何時剪枝」：逐區找該計畫，不混入其他區。
      if(keywordHit && requestedZones.length){
        const color=GH_CAL_KEYWORD_TO_COLOR[keywordHit];
        const hits=[];
        requestedZones.forEach(z=>{
          let recs=calRows.filter(r=>r.zone?.id===z.id && r.function5Calendar.color===color);
          if(req.ym)recs=recs.filter(r=>r.period===req.ym);
          else if(req.year)recs=recs.filter(r=>String(r.period).startsWith(`${req.year}-`));
          recs.sort((a,b)=>String(a.period).localeCompare(String(b.period)));
          if(wantsNext) recs=recs.filter(r=>r.period>=`${cy}-${String(cm).padStart(2,"0")}`);
          if(recs.length)hits.push({z,r:recs[0]});
        });
        if(!hits.length){
          const totals=requestedZones.map(z=>`${z.name}${calRows.filter(r=>r.zone?.id===z.id).length}筆`).join("、");
          return `抱歉，我不知道。（診斷：${totals}；功能表5全部總共讀到${calRows.length}筆資料）`;
        }
        const parts=hits.map(({z,r})=>{
          const [y,m]=String(r.period).split('-').map(Number), cal=r.function5Calendar;
          return `${z.name}：${y}年${m}月${cal.date?`${m}月${cal.date}日開始`:''}`.replace(/月月/g,'月');
        });
        return `${keywordHit}：${parts.join('；')}。`;
      }
      if(wantsNext && keywordHit){
        const color=GH_CAL_KEYWORD_TO_COLOR[keywordHit];
        const zones=zone?[zone]:GH_ZONES;
        const hits=[];
        zones.forEach(z=>{
          const future=calRows
            .filter(r=>r.zone?.id===z.id && r.function5Calendar.color===color && r.period>=`${cy}-${String(cm).padStart(2,"0")}`)
            .sort((a,b)=>a.period.localeCompare(b.period));
          if(future.length)hits.push({zone:z.name,period:future[0].period,date:future[0].function5Calendar.date});
        });
        if(!hits.length)return `目前查到的行事曆裡，${zone?zone.name:"各區"}接下來沒有排定${keywordHit}。`;
        hits.sort((a,b)=>a.period.localeCompare(b.period));
        const parts=hits.map(h=>{
          const [y,m]=h.period.split("-");
          return `${h.zone} ${y}年${Number(m)}月${h.date?h.date+"日":""}`;
        });
        return `下一次${keywordHit}：${parts.join("、")}。`;
      }

      // 3. 月份 × 溫室 × 內容：先鎖定該月該區，再回答，不讓 AI 自己猜。
      if(zone && (req.ym||req.year||req.month)){
        const ym=req.ym||`${req.year||cy}-${String(req.month||cm).padStart(2,"0")}`;
        const rec=calRows.find(r=>r.zone?.id===zone.id && r.period===ym);
        const [y,m]=ym.split("-").map(Number);
        if(!rec){
          // 同一份診斷邏輯：分清楚是「這區完全沒讀到資料」還是「這區有資料、這個月沒有」。
          const zoneTotal=calRows.filter(r=>r.zone?.id===zone.id).length;
          const zonePeriods=calRows.filter(r=>r.zone?.id===zone.id).map(r=>r.period).sort();
          const sample=zonePeriods.length?`，該區實際有資料的月份：${zonePeriods.join("、")}`:"";
          return `${zone.name}${y}年${m}月沒有查到功能表5計畫。（診斷：${zone.name}總共讀到${zoneTotal}筆資料${sample}；功能表5全部總共讀到${calRows.length}筆資料）`;
        }
        const cal=rec.function5Calendar;
        const keywordHit=Object.keys(GH_CAL_KEYWORD_TO_COLOR).find(k=>t.includes(k));
        if(keywordHit && GH_CAL_KEYWORD_TO_COLOR[keywordHit]!==cal.color){
          return `${zone.name}${y}年${m}月的功能表5不是${keywordHit}，目前標記為${cal.colorLabel}${cal.text?`，內容：${cal.text}`:""}。`;
        }
        const days=ghCalendarCumulativeDays(calRows,zone.id,y,m);
        const asksDetail=/內容|做什麼|在做什麼|要做什麼|有什麼|事項|工項|安排|時程|階段/.test(t);
        let out=`${zone.name} ${y}年${m}月：${cal.colorLabel}`;
        if(cal.date)out+=`，${m}月${cal.date}日開始`;
        const extra1=ghCalendarExtraText(cal);
        if(asksDetail && extra1)out+=`，${extra1}`;
        if(/累計|幾天|多久/.test(t) && days>1)out+=`，累計${days}天`;
        out+="。";
        return out;
      }

      // 4. 指定月份但沒指定區：一次整理各分區的「狀態＋開始日＋累計天數」。
      if(!zone && (req.ym||req.month)){
        const yy=req.year||cy, mm=req.month||cm;
        const ym=req.ym||`${yy}-${String(mm).padStart(2,"0")}`;
        const parts=ghCalendarZonesInOrder().map(z=>{
          const rec=calRows.find(r=>r.zone?.id===z.id && r.period===ym);
          if(!rec){
            // 診斷用：分清楚是「這區完全沒讀到任何資料」還是「這區有資料，但這個月沒有」。
            // V5.1 本尊畫面明明有資料、這裡卻答「無計畫」時，這行數字能直接告訴我們是撈取層還是比對層的問題。
            const zoneTotal=calRows.filter(r=>r.zone?.id===z.id).length;
            return `${z.name}：無計畫（該區共讀到${zoneTotal}筆資料）`;
          }
          const cal=rec.function5Calendar;
          const days=ghCalendarCumulativeDays(calRows,z.id,yy,mm);
          let x=`${z.name}：${cal.colorLabel}`;
          if(cal.date)x+=`，${mm}月${cal.date}日開始`;
          if(/累計|幾天|多久|狀態|階段/.test(t) && days>0)x+=`，累計${days}天`;
          const extraM=ghCalendarExtraText(cal);
          if(/內容|做什麼|在做什麼|要做什麼|有什麼|事項|工項|安排|時程|階段/.test(t) && extraM)x+=`，${extraM}`;
          return x;
        });
        let out=`${yy}年${mm}月各區計畫：${parts.join("；")}。\n\n（診斷：本次功能表5總共讀到 ${calRows.length} 筆資料）`;
        if(/節氣/.test(t))out+=`節氣：${GH_SOLAR_TERMS_BY_MONTH[mm]}。`;
        return out;
      }

      // 5. 問「計畫內容」本身：反向搜尋哪個溫室、哪個月份在做該計畫。
      // 例如「哪裡在剪枝」「產季計畫」「度冬有哪些」；只回符合的溫室＋月份＋開始日/累積天數。
      if(keywordHit && !zone && !(req.ym||req.month)){
        const color=GH_CAL_KEYWORD_TO_COLOR[keywordHit];
        const order=new Map(ghCalendarZonesInOrder().map((z,i)=>[z.id,i]));
        const hits=calRows.filter(r=>r.function5Calendar.color===color).sort((a,b)=>{
          const za=order.get(a.zone?.id)??99, zb=order.get(b.zone?.id)??99;
          return za-zb || String(a.period).localeCompare(String(b.period));
        });
        if(!hits.length)return `功能表5目前沒有查到${keywordHit}計畫。`;
        const parts=hits.map(r=>{
          const [y,m]=String(r.period).split('-').map(Number), cal=r.function5Calendar;
          const days=ghCalendarCumulativeDays(calRows,r.zone?.id,y,m);
          let x=`${r.zone?.name||"未分區"} ${y}年${m}月`;
          if(cal.date)x+=`，${m}月${cal.date}日開始`;
          if(days>0)x+=`，累計${days}天`;
          return x;
        });
        return `${keywordHit}：${parts.join("；")}。`;
      }

      // 6. 只問某區/溫室計畫（沒指定月份）：橫向唸出最近5個月的動作，不是把整個歷史全部倒出來。
      // 「最近5個月」＝本月往前推4個月，共5個月，跟畫面上實際能編輯的月份顆粒對齊。
      if(zone && !(req.ym||req.year||req.month)){
        const recentPeriods=[];
        {let y=cy,m=cm;for(let i=0;i<5;i++){recentPeriods.push(`${y}-${String(m).padStart(2,"0")}`);m--;if(m<1){m=12;y--;}}}
        const recentSet=new Set(recentPeriods);
        const recs=calRows.filter(r=>r.zone?.id===zone.id && r.function5Calendar.color!=="none" && recentSet.has(r.period))
          .sort((a,b)=>String(a.period).localeCompare(String(b.period)));
        if(!recs.length){
          const zoneTotal=calRows.filter(r=>r.zone?.id===zone.id).length;
          return `${zone.name}最近5個月（${recentPeriods[4]}～${recentPeriods[0]}）沒有查到功能表5計畫。（診斷：${zone.name}總共讀到${zoneTotal}筆資料；功能表5全部總共讀到${calRows.length}筆資料）`;
        }
        const parts=recs.map(r=>{
          const [y,m]=String(r.period).split('-').map(Number), cal=r.function5Calendar;
          const days=ghCalendarCumulativeDays(calRows,zone.id,y,m);
          let x=`${y}年${m}月：${cal.colorLabel}`;
          if(cal.date)x+=`，${m}月${cal.date}日開始`;
          if(days>0)x+=`，累計${days}天`;
          const extraZ=ghCalendarExtraText(cal);
          if(extraZ)x+=`，${extraZ}`;
          return x;
        });
        return `${zone.name}最近5個月計畫：${parts.join("；")}。`;
      }

      // 5. 只問某區現況（沒指定月份）——用目前月份回答。
      if(zone){
        const ym=`${cy}-${String(cm).padStart(2,"0")}`;
        const rec=calRows.find(r=>r.zone?.id===zone.id && r.period===ym);
        if(!rec)return `${zone.name} 目前（${cy}年${cm}月）行事曆沒有標記任何事項。`;
        const cal=rec.function5Calendar;
        const days=ghCalendarCumulativeDays(calRows,zone.id,cy,cm);
        let out=`${zone.name} ${cy}年${cm}月：${cal.colorLabel}${cal.date?`，${cm}月${cal.date}日開始`:""}`;
        const extraS=ghCalendarExtraText(cal);
        if(/內容|做什麼|在做什麼|要做什麼|有什麼|事項|工項|安排|時程|階段/.test(t) && extraS)out+=`，${extraS}`;
        if(/累計|幾天|多久/.test(t) && days>1)out+=`，累計${days}天`;
        if(/節氣/.test(t))out+=`，節氣是${GH_SOLAR_TERMS_BY_MONTH[cm]}`;
        return out+"。";
      }

      // 6. 沒指定分區/月份/關鍵字的籠統問題（例如「能查到年度計畫嗎」）——
      // 之前這種問法四個分支全部對不上，會直接掉進通用 AI、變成一堆條列原始資料。
      // 改成：只挑「接下來有排定事項」的部分，依分區彙整成一句話，不逐月全部列出。
      // 功能表5找不到明確資料時不猜、不延伸，但要附上診斷，不能只丟一句「不知道」讓人無從查起。
      return `抱歉，我不知道。（診斷：這次功能表5總共讀到 ${calRows.length} 筆資料）`;
    }


    // 不把「切換模式」說給使用者聽；只在背景保存目前主題與最近查詢。
    const GH_TOPIC_KEY="teddy_greenhouse_topic_v7"+(window.TEDDY_KEY_SUFFIX||"");
    const GH_CONTEXT_KEY="teddy_greenhouse_context_v7"+(window.TEDDY_KEY_SUFFIX||"");
    const GH_STATE_V38_KEY="teddy_greenhouse_state_v38"+(window.TEDDY_KEY_SUFFIX||"");

    function ghLoadConversationState(){
      let topic=null,ctx={};
      try{topic=localStorage.getItem(GH_TOPIC_KEY)||null;}catch(_){}
      try{ctx=JSON.parse(localStorage.getItem(GH_CONTEXT_KEY)||"{}")||{};}catch(_){ctx={};}
      return {topic,ctx};
    }
    function ghSaveConversationState(topic,ctx){
      try{
        if(topic)localStorage.setItem(GH_TOPIC_KEY,topic); else localStorage.removeItem(GH_TOPIC_KEY);
        localStorage.setItem(GH_CONTEXT_KEY,JSON.stringify(ctx||{}));
      }catch(_){}
    }

    function ghLoadStructuredState(){
      try{return JSON.parse(localStorage.getItem(GH_STATE_V38_KEY)||"null")||{topic:null,slots:{},lastEffective:"",updatedAt:null};}
      catch(_){return{topic:null,slots:{},lastEffective:"",updatedAt:null};}
    }
    function ghExtractStateSlots(text,previous={}){
      const t=String(text||"");
      const next={...previous};
      const zone=ghFindZone(t);if(zone)next.zone={id:zone.id,name:zone.name,yield:zone.yield};
      if(ghHasMonthOrTime(t))next.date=ghDateRequest(t);
      const grades=[...t.matchAll(/(?:A|B|D|NG)\s*級?/gi)].map(m=>m[0].toUpperCase().replace(/\s|級/g,""));
      if(grades.length)next.grades=[...new Set(grades)];
      if(/最高|最多|最大/.test(t))next.operation="max";
      else if(/最低|最少|最小/.test(t))next.operation="min";
      else if(/平均/.test(t))next.operation="average";
      else if(/比例|占比/.test(t))next.operation="ratio";
      else if(/比較|相比|差多少/.test(t))next.operation="compare";
      else if(/合計|總共|總計|多少/.test(t))next.operation="sum";
      const item=t.match(/打芽(?:側|地)?|除草|剪葉|覆蓋|補水|施肥|米糠|金旺|其他資材|產能|產量|採收|打卡|出勤|工時|請假|剪枝|座果|度冬/);
      if(item)next.item=item[0];
      return next;
    }
    function ghSaveStructuredState(state){
      state.updatedAt=Date.now();
      localStorage.setItem(GH_STATE_V38_KEY,JSON.stringify(state));
      teddyMemoryLayers.conversation.greenhouse=state;
      teddySaveMemoryLayers();
    }
    function ghStructuredContextText(slots){
      const p=[];
      if(slots.zone?.name)p.push(slots.zone.name);
      if(slots.date?.label)p.push(slots.date.label);
      if(slots.grades?.length)p.push(slots.grades.map(x=>x+"級").join("+"));
      if(slots.item)p.push(slots.item);
      const op={max:"最高",min:"最低",average:"平均",ratio:"比例",compare:"比較",sum:"合計"}[slots.operation];
      if(op)p.push(op);
      return p.join(" ");
    }

    // ===== V5.1 五個固定入口：先決定入口，再讀資料，再回答 =====
    // 固定優先序：1產能/功能表3 → 5打卡/功能表10 → 4耗材6-8/功能表7內層表3 → 3計畫/功能表5 → 2工作1-5/功能表4。
    // 行為規則：入口只在背景鎖定，不播入口說明；先解析分區/時間/項目/意圖；能直接算就直接短答，最後才交 AI。
    // 優先順序是使用者指定的固定規則；一般模式完全不使用這套路由。
    function ghHasMonthOrTime(q){
      return /今天|昨天|本週|這週|本月|這個月|上個月|上月|下個月|下月|今年|明年|後年|去年|前年|20\d{2}\s*年|(?:^|[^0-9])(?:1[0-2]|[1-9])\s*月/.test(String(q||""));
    }

    function ghIsCalendarQuestion(q){
      const t=String(q||"");
      // 明確的其他四入口關鍵字不能被「月份＋溫室」搶走。
      if(ghIsYieldQuestion(t) || ghIsAttendanceQuestion(t) || ghIsMaterialsQuestion(t))return false;
      const explicitWork15=/打芽|地芽|側芽|除草|剪葉|覆蓋|工作[1-5]|工項[1-5]|指派|待確認/.test(t);
      if(explicitWork15)return false;

      if(/節氣|行事曆|年度計畫|計畫|預計|安排|排程|時程|階段|開始日|開始時間|何時開始|什麼時候開始|產季|剪枝|座果|度冬/.test(t))return true;
      if(ghHasMonthOrTime(t)&&/要做什麼|該做什麼|做些什麼|要忙什麼|有什麼事/.test(t))return true;

      // 「今天/現在 + 接近/靠近/附近/前後」是在問「現在是年曆上的哪個時間點」，
      // 意圖跟節氣一樣，但沒講「節氣」兩個字、也沒有溫室或月份數字——
      // 之前四個判斷條件全部對不上，這句話連功能表5的大門都進不去，
      // 才會被丟到別的地方，亂猜出「接近的計畫」這種不存在的答案。
      if(/今天|今日|現在/.test(t) && /接近|靠近|附近|前後/.test(t))return true;

      // 功能表5三軸：時間 × 溫室 × 內容。
      // 「四北11月」也視為計畫查詢，因為其他入口若有明確詞已在上面先被排除。
      const hasZone=!!ghFindZone(t);
      const hasTime=ghHasMonthOrTime(t);
      const asksContent=/做什麼|在做什麼|要做什麼|有什麼|內容|事項|工項|哪一項|什麼工作|怎麼安排|安排什麼|進度|時程|階段|開始日|開始時間|幾號開始|何時開始|什麼時候開始/.test(t);
      return hasZone && hasTime && (asksContent || true);
    }

    // ===== Smart Teddy 5.7：功能表7「耗材與報表」十表引擎 =====
    // 完全對齊完全體 V5.1.C132 的 REPORT_SLOTS 與各表實際讀取邏輯：
    // 功能7 → 年份 → 月份 → 表一～表十。所有加總、排名、比例都由程式依完全體同一算法先算好，
    // 模型只負責專業解讀，不自行計算數字。
    const F7_TABLES={
      1:{no:"一",key:"materials",name:"耗材匯總表",source:"zonework:{分區}:{年月} 的 confirmHistory（只算已回報確認）",desc:"各分區補水（溝灌噸、噴灌分鐘）、施肥（米糠、金旺包）、其他資材（kg）在月份或區間內的合計"},
      2:{no:"二",key:"annual",name:"年度計畫表",source:"calendar:{分區}:{年月}，只取標記為「產季」的格子（與功能5共用同一模組）",desc:"各分區與生產區域歷年的產季計畫"},
      3:{no:"三",key:"zoneMaterials",name:"分區耗材統計",source:"與表一同一來源 confirmHistory，依分區逐日",desc:"單一分區當月每一天的補水、施肥、資材用量"},
      4:{no:"四",key:"noticeBoard",name:"留言版內容",source:"zonenotice:*，依 postedAt 年月",desc:"留言時間、留言者、內容、收件人與已讀狀態"},
      5:{no:"五",key:"climateData",name:"氣候資料",source:"environment:outdoor:hour:{年月}（中央氣象署神岡自動站逐時觀測）",desc:"逐日最高／最低／平均溫、平均濕度、日雨量、最大風速與天氣；月統計"},
      6:{no:"六",key:"fertilizerUsage",name:"施肥用量統計",source:"spraylog:{分區}:{年月}（施肥／噴藥月曆中屬於肥料的項目）＋ fertilizerList",desc:"各肥料品項依分區、月份的施用次數／數量"},
      7:{no:"七",key:"yieldLongTerm",name:"長週期產能趨勢",source:"產能庫 figdata-d2737：2026-08-01 前讀年度封存 yieldArchive，之後讀逐日 yield",desc:"2020 年起每 15 天一筆的產能（kg），可分品級 A／B／D／NG"},
      8:{no:"八",key:"zoneMaterialYield",name:"分區資材投入與產能對比",source:"zonework confirmHistory（投入）＋ 產能庫（產出）",desc:"水分（溝灌噸／噴灌分鐘）、固體肥（米糠＋金旺，包）、液體肥（其他資材，kg）與產能對比"},
      9:{no:"九",key:"climateYield",name:"氣候變遷與產能",source:"氣候逐時資料 ＋ 產能庫",desc:"年／月的雨量、最高溫、最低溫與產能對比"},
      10:{no:"十",key:"loginAudit",name:"登入 IP 與時間",source:"loginAudit:{年月}:*（僅記錄成功登入，台北時間）",desc:"登入人員、角色、IP、日期時間"},
      11:{no:"十一",key:"zoneUsageProfile",name:"溫室用量側寫",source:"zonework:{分區}:{年月} 的 confirmHistory（只算已回報確認）",desc:"固定一個溫室，攤開溝灌／噴灌／米糠／金旺／7種其他資材共11項的長期用量組成"},
      12:{no:"十二",key:"itemCrossZone",name:"細項跨溫室對比",source:"zonework:{分區}:{年月} 的 confirmHistory（只算已回報確認）",desc:"固定一個細項，比較各溫室在同一期間的用量與排名"},
      13:{no:"十三",key:"climateMaterial",name:"氣候與資材投入",source:"神岡站逐時氣候（整理成每日）× zonework confirmHistory",desc:"每日氣候對齊各溫室補水／施肥／其他資材用量；溫度分級統計（依當日最高溫）與雨天／無雨比較"},
      14:{no:"十四",key:"yieldMaterialRain",name:"產能 × 資材 × 雨量",source:"figdata-d2737 產能 ＋ zonework confirmHistory ＋ 神岡站雨量",desc:"各期產能、溝灌／噴灌／固態／液態資材與雨量並列，可看年／月／15天"}
    };
    const F7_OTHER_MATERIALS=["黃豆","水果","硝酸鉀","磷酸一鉀","硫酸鉀","鈣鎂粉","微量元素"];
    const F7_ROWS=[
      {key:"溝灌",label:"補水－溝灌",unit:"噸"},
      {key:"噴灌",label:"補水－噴灌",unit:"分鐘"},
      {key:"米糠",label:"施肥－米糠",unit:"包"},
      {key:"金旺",label:"施肥－金旺",unit:"包"},
      ...F7_OTHER_MATERIALS.map(k=>({key:k,label:"其他資材－"+k,unit:"kg"}))
    ];
    const F7_CAL_ROWS={p1:"一期",p2:"二期",zone3:"三期",south4:"四南",north4:"四北",zone5:"五期",prod:"生產區域"};
    const F7_YIELD_CUTOFF="2026-08-01";
    const F7_YIELD_ZONES=["一期","二期","三期","四南","四北","五期"];
    const F7_GRADES=["A","B","D","NG"];

    function f7Pad(n){return String(n).padStart(2,"0");}
    function f7Ym(y,m){return `${y}-${f7Pad(m)}`;}
    function f7N(v,d=2){const k=Math.pow(10,d);return Math.round((Number(v)||0)*k)/k;}
    function f7LocalDay(d){return `${d.getFullYear()}-${f7Pad(d.getMonth()+1)}-${f7Pad(d.getDate())}`;}
    function f7Today(){return f7LocalDay(new Date());}
    function f7ShiftDay(ds,delta){const d=new Date(ds+"T00:00:00");d.setDate(d.getDate()+delta);return f7LocalDay(d);}
    function f7Months(a,b){
      const out=[];if(!a||!b||a>b)return out;
      let y=Number(a.slice(0,4)),m=Number(a.slice(5,7));const ey=Number(b.slice(0,4)),em=Number(b.slice(5,7));
      while(y<ey||(y===ey&&m<=em)){out.push(f7Ym(y,m));m++;if(m>12){m=1;y++;}}
      return out;
    }
    function f7StampDay(stamp){
      if(stamp==null||stamp==="")return null;
      if(typeof stamp==="number"){const d=new Date(stamp);return isNaN(d)?null:f7LocalDay(d);}
      const s=String(stamp);let p;
      if(s.includes("/"))p=s.split(" ")[0].split("/");
      else if(s.includes("-"))p=s.split(" ")[0].split("T")[0].split("-");
      else if(/^\d{12,}$/.test(s)){const d=new Date(Number(s));return isNaN(d)?null:f7LocalDay(d);}
      else return null;
      if(p.length<3)return null;
      const y=Number(p[0]),m=Number(p[1]),d=Number(p[2]);
      if(!y||!m||!d)return null;
      return `${y}-${f7Pad(m)}-${f7Pad(d)}`;
    }
    async function f7Pool(items,limit,fn){
      const out=new Array(items.length);let i=0;
      const workers=Array.from({length:Math.max(1,Math.min(limit,items.length))},async()=>{
        while(i<items.length){const k=i++;try{out[k]=await fn(items[k],k);}catch(_){out[k]=null;}}
      });
      await Promise.all(workers);return out;
    }

    // ---- 資料讀取層：直接讀 figapi-d24dc/kv（與完全體 window.storage 同一份資料），短暫快取 ----
    const F7_CACHE=new Map();
    let f7ForceFresh=false;
    const F7_CACHE_MS=120000;
    async function f7Cached(key,loader){
      const hit=F7_CACHE.get(key);
      if(hit&&!f7ForceFresh&&Date.now()-hit.t<F7_CACHE_MS)return hit.v;
      const v=await loader();F7_CACHE.set(key,{t:Date.now(),v});return v;
    }
    function f7ParseValue(raw){let v=raw?raw.value:null;if(typeof v==="string"){try{v=JSON.parse(v);}catch(_){}}return v;}
    async function f7KvGet(key){
      return f7Cached("g:"+key,async()=>{
        const db=await ghMainFirestore();
        const d=await db.collection("kv").doc(key).get();
        if(!d.exists)return null;
        const raw=d.data()||{};
        return{key,value:f7ParseValue(raw),updatedAt:raw.updatedAt||null};
      });
    }
    async function f7KvRange(prefix){
      return f7Cached("r:"+prefix,async()=>{
        const db=await ghMainFirestore();
        const FP=firebase.firestore.FieldPath.documentId();
        const snap=await db.collection("kv").where(FP,">=",prefix).where(FP,"<",prefix+"\uf8ff").get();
        return snap.docs.map(d=>{const raw=d.data()||{};return{key:raw.key||d.id,value:f7ParseValue(raw),updatedAt:raw.updatedAt||null};});
      });
    }
    async function f7YieldGet(key){
      return f7Cached("y:"+key,async()=>{const s=await ghYieldStorage();return await s.get(key);});
    }

    // ---- 問句 → 條件 ----
    function f7Ctx(q){
      const t=ghCnDateToDigits(String(q||""));
      const now=new Date(),cy=now.getFullYear(),cm=now.getMonth()+1;
      const req=ghDateRequest(t);
      let startYm=null,endYm=null,day=null;
      const r=t.match(/(?:(20\d{2})\s*年\s*)?(1[0-2]|[1-9])\s*月?\s*(?:到|至|~|～|－)\s*(?:(20\d{2})\s*年\s*)?(1[0-2]|[1-9])\s*月/);
      if(r){
        const y1=Number(r[1]||req.year||cy),y2=Number(r[3]||y1);
        startYm=f7Ym(y1,Number(r[2]));endYm=f7Ym(y2,Number(r[4]));
      }else if(req.ym){startYm=endYm=req.ym;}
      else if(req.year){startYm=f7Ym(req.year,1);endYm=req.year===cy?f7Ym(cy,cm):f7Ym(req.year,12);}
      else{startYm=endYm=f7Ym(cy,cm);}
      if(startYm>endYm){const x=startYm;startYm=endYm;endYm=x;}
      const today=f7Today();
      if(/今天|今日/.test(t))day=today;
      else if(/昨天|昨日/.test(t))day=f7ShiftDay(today,-1);
      else if(/前天/.test(t))day=f7ShiftDay(today,-2);
      else if(!r){
        const dm=t.match(/(?:(20\d{2})\s*[年\/]\s*)?(1[0-2]|[1-9])\s*(?:月\s*(3[01]|[12]\d|[1-9])\s*(?:日|號)|\/\s*(3[01]|[12]\d|[1-9])(?![0-9]))/);
        if(dm)day=`${dm[1]||req.year||cy}-${f7Pad(dm[2])}-${f7Pad(dm[3]||dm[4])}`;
      }
      if(day){startYm=endYm=day.slice(0,7);}
      const all=/全場|全部|所有分區|各區|每一區|每區|各分區/.test(t);
      let zones=(typeof ghFindZones==="function"?ghFindZones(t):[ghFindZone(t)]).filter(Boolean);
      if(all)zones=[];
      const grades=F7_GRADES.filter(g=>g==="NG"?/NG/i.test(t):new RegExp(g+"\\s*級").test(t));
      const yearsMode=/歷年|每年|逐年|年度比較|這幾年|多年|20\d{2}\s*(?:年)?\s*(?:到|至|~|～)\s*20\d{2}/.test(t);
      return{q:t,req,startYm,endYm,day,zones,allZones:all||!zones.length,grades:grades.length?grades:[...F7_GRADES],gradeLimited:grades.length>0,year:req.year||cy,yearsMode,cy,cm,today};
    }
    function f7RangeLabel(ctx){return ctx.day?ctx.day:(ctx.startYm===ctx.endYm?ctx.startYm:`${ctx.startYm}～${ctx.endYm}`);}
    function f7ZoneList(ctx){return ctx.zones.length?ctx.zones:GH_ZONES;}

    // ---- 路由：這句話屬於功能表7哪一張表 ----
    function f7IsMenuQuestion(q){
      const t=teddyToTrad(String(q||"")).replace(/\s+/g,"");
      return /(?:幾|多少)(?:個|張)?表|哪些表|什麼表|表格有哪些|有哪幾張|十張表是|表格清單|有什麼報表/.test(t);
    }
    function ghFunction7Table(q){
      const raw=teddyToTrad(String(q||"")).replace(/\s+/g,"");
      if(f7IsMenuQuestion(raw))return null;
      // 先移除「功能表3、功能表七、功能5」這類功能表編號，避免把「功能表七」誤認成「表七」。
      const t=raw.replace(/功能表?\d+/g,"").replace(/功能表?[一二三四五六七八九十]+/g,"");
      const cn={一:1,二:2,三:3,四:4,五:5,六:6,七:7,八:8,九:9,十:10,十一:11,十二:12,十三:13,十四:14};
      const m=t.match(/(?<![代發列課圖])表(?:格)?(?:第)?(十[一二三四]|十|[一二三四五六七八九]|1[0-4]|[1-9])(?![0-9])/);
      if(m){const n=cn[m[1]]||Number(m[1]);if(n>=1&&n<=14)return n;}
      if(/登入(?:IP|紀錄|時間|稽核|位址|來源)|IP(?:位址)?|誰登入|登入過|登入次數/i.test(t))return 10;
      if(/用量側寫|溫室用量組成|用量組成/.test(t))return 11;
      {const rainW=/雨量|下雨|雨天|降雨/.test(t),yieldW=/產能|產量|收成/.test(t),matW=/資材|用量|補水|施肥|溝灌|噴灌|米糠|金旺|液態|固態/.test(t),tempW=/溫度|氣溫|高溫|低溫|最高溫|溫度分級/.test(t);
       if(/溫度分級|氣候與資材|氣候資材/.test(t))return 13;
       // 6.4.0：單純問用量走快速問答；講到統計、分析、比較、趨勢等，改讀對應的分析報表。
       if(/施肥(?:用量)?統計|施肥明細/.test(t))return 6;
       const anaW=/統計|分析|對比|比較|趨勢|走勢|排名|佔比|占比|組成|長期|歷年|關係|變化/.test(t);
       if(anaW&&matW){
         if(rainW&&yieldW)return 14;
         if(yieldW)return 8;
         if(tempW||rainW||/氣候|天氣/.test(t))return 13;
         const zoneN=(ghFindZones?ghFindZones(t):[]).length;
         const itemN=["溝灌","噴灌","米糠","金旺","黃豆","水果","硝酸鉀","磷酸一鉀","硫酸鉀","鈣鎂粉","微量元素"].filter(k=>t.includes(k)).length;
         if(itemN>=1&&zoneN!==1)return 12;
         return 11;
       }
       if(rainW&&yieldW&&matW)return 14;
       if((tempW||rainW||/氣候|天氣/.test(t))&&matW&&!yieldW)return 13;}
      if(/跨溫室|細項對比|各溫室比較|溫室間比較/.test(t)&&/溝灌|噴灌|米糠|金旺|黃豆|水果|硝酸鉀|磷酸一鉀|硫酸鉀|鈣鎂粉|微量元素/.test(t))return 12;
      const yieldWord=/產能|產量|收成|採收|收穫/;
      const climateWord=/氣候|天氣|雨量|降雨|下雨|氣溫|溫度|高溫|低溫/;
      const inputWord=/資材|投入|水分|補水|溝灌|噴灌|固體肥|液體肥|肥料|施肥|米糠|金旺/;
      if(/氣候變遷/.test(t)||(climateWord.test(t)&&yieldWord.test(t)))return 9;
      if(/投入產出|投入與產能|投入跟產能/.test(t)||(inputWord.test(t)&&yieldWord.test(t)))return 8;
      if(/長週期|每15天|每十五天|15天一筆|半月產能/.test(t)||(yieldWord.test(t)&&/趨勢|歷年|長期|走勢/.test(t)))return 7;
      if(/施肥用量|肥料用量|施肥明細|施肥統計|各月份施肥|肥料統計|肥料品項|用了哪些肥|施肥次數|施肥月曆/.test(t))return 6;
      if(/耗材匯總|耗材總表|耗材合計|耗材總計|耗材統計|全場耗材|各區耗材|耗材總量/.test(t))return 1;
      if(/分區耗材|耗材月曆|(?:每天|每日|逐日|哪幾天|哪一天).*(?:耗材|資材)|(?:耗材|資材).*(?:每天|每日|逐日|哪幾天|哪一天)/.test(t))return 3;
      if(/氣候資料|天氣紀錄|氣象紀錄|每小時天氣|溫室天氣|雨量紀錄|氣溫紀錄|降雨紀錄|神岡站/.test(t))return 5;
      if(/留言|公告/.test(t))return 4;
      if(/年度計畫表|產季計畫|歷年產季|產季表/.test(t))return 2;
      // 6.3.0：沒指定溫室的天氣／氣溫／雨量問題＝戶外神岡站（表五）；有溫室名稱的溫度濕度交給功能表9。
      if(/最高溫|最低溫|幾度|雨量|下多少雨|下了多少雨|降雨|天氣|氣溫|會不會下雨|有沒有下雨/.test(t)&&!ghFindZone(t)&&!/溫室內|室內|環境數據/.test(t))return 5;
      return null;
    }
    function ghIsFunction7Question(q){
      const t=teddyToTrad(String(q||""));
      return ghFunction7Table(t)!=null||/功能表?\s*(?:7|七)|耗材與報表|十張表|10張表|報表/.test(t);
    }
    // 舊版輔助函式保留（其他地方可能仍引用）
    function ghFunction7DateMatch(r,req){
      if(!req)return true;
      const blob=(String(r.key||"")+" "+ghSafePreview(r.data,1200)+" "+String(r.updatedAt||""));
      if(req.ym)return blob.includes(req.ym)||blob.includes(req.ym.replace("-","/"));
      if(req.year)return blob.includes(String(req.year));
      return true;
    }
    function ghFunction7ZoneMatch(r,zone){
      if(!zone)return true;
      const blob=(String(r.key||"")+" "+ghSafePreview(r.data,1200)).toLowerCase();
      return [zone.id,zone.name,zone.yield,...zone.aliases].some(x=>blob.includes(String(x||"").toLowerCase()));
    }
    function f7MenuText(){
      return "功能表7「查看各項報表」的路徑是：年份 → 月份 → 表一～表十四。\n"+
        Object.entries(F7_TABLES).map(([n,x])=>`表${x.no}・${x.name}：${x.desc}`).join("\n")+
        "\n想看哪一張、哪個分區、哪段期間，直接說就可以。";
    }

    // ---- 共用：zonework 已確認紀錄 ----
    async function f7ZoneworkConfirmed(zoneId,ym){
      const doc=await f7KvGet(`zonework:${zoneId}:${ym}`);
      const hist=(doc&&doc.value&&Array.isArray(doc.value.confirmHistory))?doc.value.confirmHistory:[];
      const out=[];const seen=new Set();
      for(const h of hist){
        if(!h||!h.rowKey)continue;
        const qty=parseFloat(h.qty);if(isNaN(qty)||qty<=0)continue;
        const day=f7StampDay(h.at);if(!day||day.slice(0,7)!==ym)continue;
        // 6.2.0：與完全體 C122 表三同一規則——同品項、同數量、同時間、同回報人、同指定事件只算一次。
        const person=h.personName||h.personId||"";
        const sig=[h.rowKey,qty,h.at,person,h.eventId||""].join("|");
        if(seen.has(sig))continue;seen.add(sig);
        out.push({rowKey:String(h.rowKey),qty,day,at:String(h.at||""),by:person||h.confirmedBy||h.byName||h.by||h.name||""});
      }
      return out;
    }
    function f7RowMeta(key){return F7_ROWS.find(r=>r.key===key)||{key,label:key,unit:""};}

    // 表一・耗材匯總表
    async function f7T1(ctx){
      let months=f7Months(ctx.startYm,ctx.endYm);if(months.length>36)months=months.slice(-36);
      const zones=f7ZoneList(ctx);
      const totals={};let count=0;
      const jobs=[];months.forEach(ym=>zones.forEach(z=>jobs.push({ym,z})));
      const got=await f7Pool(jobs,6,async j=>({j,list:await f7ZoneworkConfirmed(j.z.id,j.ym)}));
      for(const g of got){
        if(!g)continue;
        for(const h of g.list){
          if(ctx.day&&h.day!==ctx.day)continue;
          (totals[h.rowKey]||(totals[h.rowKey]={}));
          totals[h.rowKey][g.j.z.yield]=(totals[h.rowKey][g.j.z.yield]||0)+h.qty;count++;
        }
      }
      const rows=F7_ROWS.map(r=>{
        const byZone={};let total=0;
        zones.forEach(z=>{const v=f7N((totals[r.key]||{})[z.yield]||0);if(v){byZone[z.yield]=v;total+=v;}});
        return{item:r.label,unit:r.unit,byZone,total:f7N(total)};
      }).filter(r=>r.total>0);
      Object.keys(totals).filter(k=>!F7_ROWS.some(r=>r.key===k)).forEach(k=>{
        const byZone={};let total=0;Object.entries(totals[k]).forEach(([z,v])=>{byZone[z]=f7N(v);total+=v;});
        rows.push({item:k,unit:"",byZone,total:f7N(total)});
      });
      const summary=rows.length?rows.map(r=>`${r.item}：${r.total}${r.unit}（${Object.entries(r.byZone).map(([z,v])=>`${z}${v}`).join("、")}）`).join("\n"):"這段期間沒有已回報確認的耗材紀錄。";
      return{empty:!rows.length,range:f7RangeLabel(ctx),zones:zones.map(z=>z.yield),records:count,summary,data:{rows}};
    }

    // 表二・年度計畫表
    async function f7T2(ctx){
      const docs=await f7KvRange("calendar:");
      const zoneIds=ctx.zones.map(z=>z.id);
      const list=[];
      for(const d of docs){
        const rest=String(d.key).slice("calendar:".length);const parts=rest.split(":");
        if(parts.length!==2)continue;
        const [rowId,ym]=parts;const v=d.value;
        if(!v||v.color!=="season")continue;
        if(zoneIds.length&&!zoneIds.includes(rowId)&&rowId!=="prod")continue;
        const y=Number(String(ym).slice(0,4)),m=Number(String(ym).slice(5,7));
        if(ctx.req.year&&!ctx.yearsMode&&y!==ctx.req.year)continue;
        list.push({row:F7_CAL_ROWS[rowId]||rowId,year:y,month:m,date:v.date||"",text:v.text||""});
      }
      list.sort((a,b)=>a.row.localeCompare(b.row,"zh-Hant")||a.year-b.year||a.month-b.month);
      const byRow={};
      list.forEach(x=>{(byRow[x.row]||(byRow[x.row]={}));(byRow[x.row][x.year]||(byRow[x.row][x.year]=[])).push(`${x.month}月${x.text?"（"+x.text+"）":""}`);});
      const summary=list.length?Object.entries(byRow).map(([row,ys])=>`${row}：`+Object.entries(ys).map(([y,ms])=>`${y}年 ${ms.join("、")}`).join("；")).join("\n"):"年度計畫表目前沒有標記為產季的資料。";
      return{empty:!list.length,range:ctx.req.year&&!ctx.yearsMode?String(ctx.req.year):"全部年份",records:list.length,summary,data:{season:list.slice(0,240)}};
    }

    // 表三・分區耗材統計
    async function f7T3(ctx){
      let months=f7Months(ctx.startYm,ctx.endYm);if(months.length>3)months=months.slice(-3);
      const zones=f7ZoneList(ctx);const single=zones.length===1;
      const perZone={};let count=0;
      const jobs=[];months.forEach(ym=>zones.forEach(z=>jobs.push({ym,z})));
      const got=await f7Pool(jobs,6,async j=>({j,list:await f7ZoneworkConfirmed(j.z.id,j.ym)}));
      for(const g of got){
        if(!g)continue;
        const zn=g.j.z.yield;const bucket=perZone[zn]||(perZone[zn]={byDay:{},total:{}});
        for(const h of g.list){
          if(ctx.day&&h.day!==ctx.day)continue;
          const dd=bucket.byDay[h.day]||(bucket.byDay[h.day]={});
          dd[h.rowKey]=f7N((dd[h.rowKey]||0)+h.qty);
          bucket.total[h.rowKey]=f7N((bucket.total[h.rowKey]||0)+h.qty);count++;
        }
      }
      const fmt=o=>Object.entries(o).map(([k,v])=>`${f7RowMeta(k).label}${v}${f7RowMeta(k).unit}`).join("、");
      const lines=[];
      Object.entries(perZone).forEach(([zn,b])=>{
        if(!Object.keys(b.total).length)return;
        lines.push(`${zn} 合計：${fmt(b.total)}`);
        if(single||ctx.day)Object.keys(b.byDay).sort().forEach(d=>lines.push(`　${d}：${fmt(b.byDay[d])}`));
      });
      const data={};
      Object.entries(perZone).forEach(([zn,b])=>{data[zn]={total:b.total,byDay:(single||ctx.day)?b.byDay:undefined,activeDays:Object.keys(b.byDay).length};});
      return{empty:!count,range:f7RangeLabel(ctx),zones:zones.map(z=>z.yield),records:count,summary:lines.join("\n")||"這段期間沒有已回報確認的分區耗材紀錄。",data};
    }

    // 表四・留言版內容
    function f7NoticeYm(stamp){const d=f7StampDay(stamp);return d?d.slice(0,7):null;}
    async function f7T4(ctx){
      let months=f7Months(ctx.startYm,ctx.endYm);if(months.length>12)months=months.slice(-12);
      const docs=await f7KvRange("zonenotice:");
      const zoneIds=ctx.zones.map(z=>z.id);
      const rows=[];
      for(const d of docs){
        const n=d.value;if(!n||typeof n!=="object")continue;
        const ym=f7NoticeYm(n.postedAt);if(!ym||!months.includes(ym))continue;
        if(ctx.day&&f7StampDay(n.postedAt)!==ctx.day)continue;
        if(zoneIds.length&&!zoneIds.some(id=>String(d.key).includes(id)||n.zoneId===id||(n.zoneIds||[]).includes(id)))continue;
        const ids=n.recipientIds||[];
        if(window.TEDDY_ENTRY_ID==="farm"){
          const me=String((teddyHandsSession&&teddyHandsSession.id)||"").toUpperCase();
          if(!me||(String(n.senderId||"").toUpperCase()!==me&&!ids.map(x=>String(x).toUpperCase()).includes(me)))continue;
        }
        const recipients=ids.map(id=>{const name=(n.recipientNames&&n.recipientNames[id])||id;const read=(n.readBy||[]).includes(id);return `${name}${read?"（已讀"+((n.readAt&&n.readAt[id])?" "+n.readAt[id]:"")+"）":"（未讀）"}`;});
        rows.push({postedAt:n.postedAt||"",sender:n.senderName||n.senderId||"—",text:String(n.text||"").slice(0,240),recipients});
      }
      rows.sort((a,b)=>String(a.postedAt).localeCompare(String(b.postedAt)));
      const unread=rows.reduce((s,r)=>s+r.recipients.filter(x=>x.endsWith("（未讀）")).length,0);
      const summary=rows.length?`共 ${rows.length} 則留言，未讀人次 ${unread}。\n`+rows.slice(-12).map(r=>`${r.postedAt} ${r.sender}：${r.text.slice(0,60)}｜收件：${r.recipients.join("、")||"—"}`).join("\n"):"這段期間沒有留言。";
      return{empty:!rows.length,range:f7RangeLabel(ctx),records:rows.length,summary,data:{notices:rows.slice(-60)}};
    }

    // 表五・氣候資料（與完全體表五同一算法）
    function f7V(v){return v==null?"—":v;}
    function f7Num(v){const n=Number(v);return v==null||v===""||!Number.isFinite(n)?null:n;}
    function f7NormClimate(r){
      return{
        hourKey:r.hourKey||r.hour||r.key||"",observedAt:r.observedAt||r.obsTime||r.dateTime||r.datetime||"",
        temperature:f7Num(r.temperature??r.temp??r.AirTemperature??r.TEMP),
        humidity:f7Num(r.humidity??r.RelativeHumidity??r.HUMD),
        rainfall:f7Num(r.rainfall??r.rain??r.precipitation??r.Precipitation??r.H_24R),
        windSpeed:f7Num(r.windSpeed??r.WindSpeed??r.WDSD),
        weather:r.weather||r.Weather||r.weatherDescription||""
      };
    }
    async function f7ClimateMonth(ym){
      const docs=await f7KvRange(`environment:outdoor:hour:${ym}`);
      return docs.map(d=>d.value).filter(v=>v&&typeof v==="object").map(f7NormClimate)
        .filter(r=>String(r.hourKey||r.observedAt||"").slice(0,7)===ym);
    }
    function f7ClimateDaily(rows){
      const byDay={};
      rows.forEach(r=>{const day=String(r.hourKey||r.observedAt||"").slice(0,10);if(day)(byDay[day]||(byDay[day]=[])).push(r);});
      const vals=(a,k)=>a.map(x=>x[k]).filter(v=>v!=null);
      const mx=a=>a.length?Math.max(...a):null,mn=a=>a.length?Math.min(...a):null,av=a=>a.length?f7N(a.reduce((s,v)=>s+v,0)/a.length,1):null;
      return Object.keys(byDay).sort().map(day=>{
        const a=byDay[day];const w=a.map(x=>x.weather).filter(Boolean);
        return{day,obs:a.length,tMax:mx(vals(a,"temperature")),tMin:mn(vals(a,"temperature")),tAvg:av(vals(a,"temperature")),hAvg:av(vals(a,"humidity")),rain:mx(vals(a,"rainfall"))||0,windMax:mx(vals(a,"windSpeed")),weather:w.length?w[w.length-1]:""};
      });
    }
    async function f7ClimateAgg(ym,startDay,endDay){
      const rows=await f7ClimateMonth(ym);
      const daily=f7ClimateDaily(rows).filter(d=>(!startDay||d.day>=startDay)&&(!endDay||d.day<=endDay));
      const t=daily.flatMap(d=>[d.tMax,d.tMin]).filter(v=>v!=null);
      return{tMax:t.length?Math.max(...t):null,tMin:t.length?Math.min(...t):null,rainTotal:f7N(daily.reduce((s,d)=>s+(d.rain||0),0),1),days:daily.length};
    }
    async function f7T5(ctx){
      let months=f7Months(ctx.startYm,ctx.endYm);if(months.length>3)months=months.slice(-3);
      const out=[];let obs=0;const monthSummary=[];
      for(const ym of months){
        const rows=await f7ClimateMonth(ym);obs+=rows.length;
        let daily=f7ClimateDaily(rows);if(ctx.day)daily=daily.filter(d=>d.day===ctx.day);
        out.push(...daily);
        const temps=rows.map(r=>r.temperature).filter(v=>v!=null),hums=rows.map(r=>r.humidity).filter(v=>v!=null);
        if(daily.length)monthSummary.push({ym,obs:rows.length,tMax:temps.length?Math.max(...temps):null,tMin:temps.length?Math.min(...temps):null,tAvg:temps.length?f7N(temps.reduce((s,v)=>s+v,0)/temps.length,1):null,hAvg:hums.length?f7N(hums.reduce((s,v)=>s+v,0)/hums.length,1):null,rainTotal:f7N(daily.reduce((s,d)=>s+(d.rain||0),0),1),rainDays:daily.filter(d=>(d.rain||0)>0).length});
      }
      const summary=out.length?(ctx.day?out.map(d=>`${d.day}：最高${f7V(d.tMax)}°C、最低${f7V(d.tMin)}°C、平均濕度${f7V(d.hAvg)}%、雨量${f7V(d.rain)}mm、最大風速${f7V(d.windMax)}m/s、${d.weather||"—"}`).join("\n"):monthSummary.map(m=>`${m.ym}：最高${f7V(m.tMax)}°C、最低${f7V(m.tMin)}°C、平均${f7V(m.tAvg)}°C、平均濕度${f7V(m.hAvg)}%、月雨量${m.rainTotal}mm（${m.rainDays}天有雨），共${m.obs}筆逐時觀測`).join("\n")):"這段期間沒有氣候觀測資料。";
      return{empty:!out.length,range:f7RangeLabel(ctx),records:obs,summary,data:{monthSummary,daily:out.slice(-93)}};
    }

    // 表六・施肥用量統計（與完全體表六同一算法）
    function f7DosageUnit(dosage){
      const s=String(dosage||"");
      if(s.includes("公斤"))return"公斤";
      if(s.includes("公克")||/(^|[^公])克/.test(s))return"公克";
      if(s.includes("公升"))return"公升";
      if(/ml|毫升/i.test(s))return"毫升";
      if(s.includes("包"))return"包";
      return"份";
    }
    async function f7T6(ctx){
      let months=f7Months(ctx.startYm,ctx.endYm);if(months.length>24)months=months.slice(-24);
      const zones=f7ZoneList(ctx);
      const fl=await f7KvGet("fertilizerList");
      const codes=new Set((Array.isArray(fl&&fl.value)?fl.value:[]).map(f=>String(f.code||"").toUpperCase()));
      const jobs=[];months.forEach(ym=>zones.forEach(z=>jobs.push({ym,z})));
      const got=await f7Pool(jobs,6,async j=>({j,doc:await f7KvGet(`spraylog:${j.z.id}:${j.ym}`)}));
      const totals={},monthly={};let count=0;
      for(const g of got){
        if(!g||!g.doc||!g.doc.value)continue;
        const logs=g.doc.value;
        Object.entries(logs).forEach(([dayKey,entries])=>{
          if(ctx.day&&Number(dayKey)!==Number(ctx.day.slice(8,10)))return;
          (Array.isArray(entries)?entries:[]).forEach(e=>{
            const code=String(e.code||"").toUpperCase();
            if(e.type!=="fertilizer"&&!codes.has(code))return;
            const qty=Number(e.qty==null||e.qty===""?1:e.qty);if(!Number.isFinite(qty)||qty<=0)return;
            const unit=f7DosageUnit(e.dosage);const key=`${code||e.name||"未命名"}|${unit}`;
            const name=e.name||code||"未命名肥料";
            const t=totals[key]||(totals[key]={code,name,unit,byZone:{},total:0,dosage:e.dosage||""});
            t.byZone[g.j.z.yield]=f7N((t.byZone[g.j.z.yield]||0)+qty);t.total=f7N(t.total+qty);
            const mk=`${g.j.ym}|${key}`;const mm=monthly[mk]||(monthly[mk]={ym:g.j.ym,code,name,unit,total:0});mm.total=f7N(mm.total+qty);count++;
          });
        });
      }
      const rows=Object.values(totals).sort((a,b)=>(a.code||a.name).localeCompare(b.code||b.name,"zh-Hant"));
      const summary=rows.length?rows.map(r=>`${r.name}${r.code?"（"+r.code+"）":""}：${r.total}${r.unit}（${Object.entries(r.byZone).map(([z,v])=>`${z}${v}`).join("、")}）`).join("\n"):"所選期間沒有施肥紀錄。";
      return{empty:!rows.length,range:f7RangeLabel(ctx),zones:zones.map(z=>z.yield),records:count,summary,data:{items:rows,monthly:Object.values(monthly).sort((a,b)=>a.ym.localeCompare(b.ym)).slice(-120)}};
    }

    // 產能共用：逐日各品級公斤數（與完全體表七／八／九同一資料來源）
    async function f7YieldDailyByGrade(zoneName,year){
      const today=f7Today();const out={};
      const add=(ds,rec)=>{if(!rec)return;const o=out[ds]||(out[ds]={A:0,B:0,D:0,NG:0});F7_GRADES.forEach(g=>{(rec[g]||[]).forEach(e=>{o[g]+=Number(e&&e.net)||0;});});};
      if(`${year}-01-01`<F7_YIELD_CUTOFF){
        const a=await f7YieldGet(`yieldArchive:${zoneName}:${year}`);
        const arc=(a&&a.value&&typeof a.value==="object")?a.value:{};
        Object.entries(arc).forEach(([ds,rec])=>{if(ds<=today&&ds<F7_YIELD_CUTOFF&&ds.slice(0,4)===String(year))add(ds,rec);});
      }
      if(`${year}-12-31`>=F7_YIELD_CUTOFF){
        const start=`${year}-01-01`>F7_YIELD_CUTOFF?`${year}-01-01`:F7_YIELD_CUTOFF;
        const end=`${year}-12-31`<today?`${year}-12-31`:today;
        const days=[];for(let d=start;d<=end;d=f7ShiftDay(d,1))days.push(d);
        const recs=await f7Pool(days,8,ds=>f7YieldGet(`yield:${zoneName}:${ds}`));
        days.forEach((ds,i)=>{const r=recs[i];if(r&&r.value)add(ds,r.value);});
      }
      return out;
    }
    function f7SumGrades(o,grades){return grades.reduce((s,g)=>s+(Number(o&&o[g])||0),0);}
    function f7PeriodOf(ds){const d=Number(ds.slice(8,10));return `${ds.slice(0,7)}${d<=15?"上":"下"}`;}
    async function f7YieldSeries(zoneNames,years,grades){
      const perZone={};
      for(const zn of zoneNames){
        const byYear={},byMonth={},byPeriod={},byGradeYear={};
        for(const y of years){
          const daily=await f7YieldDailyByGrade(zn,y);
          Object.entries(daily).forEach(([ds,o])=>{
            const v=f7SumGrades(o,grades);
            byYear[y]=(byYear[y]||0)+v;
            const ym=ds.slice(0,7);byMonth[ym]=(byMonth[ym]||0)+v;
            const p=f7PeriodOf(ds);byPeriod[p]=(byPeriod[p]||0)+v;
            const bg=byGradeYear[y]||(byGradeYear[y]={A:0,B:0,D:0,NG:0});F7_GRADES.forEach(g=>{bg[g]+=Number(o[g])||0;});
          });
        }
        const r=o=>Object.fromEntries(Object.entries(o).map(([k,v])=>[k,f7N(v,1)]));
        perZone[zn]={byYear:r(byYear),byMonth:r(byMonth),byPeriod:r(byPeriod),byGradeYear:Object.fromEntries(Object.entries(byGradeYear).map(([y,o])=>[y,r(o)]))};
      }
      return perZone;
    }
    function f7Years(ctx){
      if(ctx.yearsMode){const ys=[];for(let y=2020;y<=ctx.cy;y++)ys.push(y);return ys;}
      if(!ctx.req.year)return [ctx.cy-1,ctx.cy];
      return [ctx.req.year];
    }
    function f7YieldZones(ctx){return ctx.zones.length?ctx.zones.map(z=>z.yield):[...F7_YIELD_ZONES];}

    // 表七・長週期產能趨勢
    async function f7T7(ctx){
      const zones=f7YieldZones(ctx),years=f7Years(ctx);
      const perZone=await f7YieldSeries(zones,years,ctx.grades);
      const farm={byYear:{},byMonth:{},byPeriod:{}};
      Object.values(perZone).forEach(z=>["byYear","byMonth","byPeriod"].forEach(k=>Object.entries(z[k]).forEach(([p,v])=>{farm[k][p]=f7N((farm[k][p]||0)+v,1);})));
      const periods=Object.entries(farm.byPeriod).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1]);
      const yearsLine=Object.entries(farm.byYear).map(([y,v])=>`${y}年 ${v}kg`).join("、");
      const top=periods.slice(0,3).map(([p,v])=>`${p}半月 ${v}kg`).join("、");
      const low=periods.slice(-3).reverse().map(([p,v])=>`${p}半月 ${v}kg`).join("、");
      const summary=periods.length?`範圍：${zones.join("、")}｜品級：${ctx.grades.join("+")}\n各年合計：${yearsLine}\n最高的半月：${top}\n最低的半月（有產出者）：${low}`:"這段期間產能庫沒有資料。";
      const monthsWanted=years.length===1?farm.byMonth:Object.fromEntries(Object.entries(farm.byMonth).slice(-24));
      return{empty:!periods.length,range:years.length===1?String(years[0]):`${years[0]}～${years[years.length-1]}`,zones,records:periods.length,summary,data:{farm:{byYear:farm.byYear,byMonth:monthsWanted,byPeriod:years.length===1?farm.byPeriod:undefined},perZone:Object.fromEntries(Object.entries(perZone).map(([z,o])=>[z,{byYear:o.byYear,byGradeYear:o.byGradeYear,byMonth:years.length===1?o.byMonth:undefined}]))}};
    }

    // 表八・分區資材投入與產能對比
    async function f7T8(ctx){
      const zones=f7ZoneList(ctx);
      const years=ctx.yearsMode?f7Years(ctx):[ctx.year];
      const months=[];years.forEach(y=>{const last=y===ctx.cy?ctx.cm:12;for(let m=1;m<=last;m++)months.push(f7Ym(y,m));});
      const jobs=[];months.forEach(ym=>zones.forEach(z=>jobs.push({ym,z})));
      const got=await f7Pool(jobs,6,async j=>({j,list:await f7ZoneworkConfirmed(j.z.id,j.ym)}));
      const yieldSeries=await f7YieldSeries(zones.map(z=>z.yield),years,ctx.grades);
      const perZone={};
      zones.forEach(z=>{perZone[z.yield]={};});
      for(const g of got){
        if(!g)continue;
        const bucketKey=ctx.yearsMode?g.j.ym.slice(0,4):g.j.ym;
        const b=perZone[g.j.z.yield][bucketKey]||(perZone[g.j.z.yield][bucketKey]={tons:0,minutes:0,solid:0,liquid:0,liquidBy:{}});
        g.list.forEach(h=>{
          if(h.rowKey==="溝灌")b.tons+=h.qty;
          else if(h.rowKey==="噴灌")b.minutes+=h.qty;
          else if(h.rowKey==="米糠"||h.rowKey==="金旺")b.solid+=h.qty;
          else if(F7_OTHER_MATERIALS.includes(h.rowKey)){b.liquid+=h.qty;b.liquidBy[h.rowKey]=(b.liquidBy[h.rowKey]||0)+h.qty;}
        });
      }
      const lines=[];const data={};
      zones.forEach(z=>{
        const ys=yieldSeries[z.yield]||{};const src=ctx.yearsMode?(ys.byYear||{}):(ys.byMonth||{});
        const keys=[...new Set([...Object.keys(perZone[z.yield]),...Object.keys(src)])].sort();
        data[z.yield]=keys.map(k=>{const b=perZone[z.yield][k]||{tons:0,minutes:0,solid:0,liquid:0,liquidBy:{}};return{period:k,waterTons:f7N(b.tons,1),waterMinutes:f7N(b.minutes,1),solidBags:f7N(b.solid,1),liquidKg:f7N(b.liquid,1),liquidBy:Object.fromEntries(Object.entries(b.liquidBy).map(([m,v])=>[m,f7N(v,1)])),yieldKg:f7N(src[k]||0,1)};});
        const tot=data[z.yield].reduce((s,r)=>({t:s.t+r.waterTons,m:s.m+r.waterMinutes,so:s.so+r.solidBags,l:s.l+r.liquidKg,y:s.y+r.yieldKg}),{t:0,m:0,so:0,l:0,y:0});
        lines.push(`${z.yield}：溝灌${f7N(tot.t,1)}噸、噴灌${f7N(tot.m,1)}分鐘、固體肥${f7N(tot.so,1)}包、液體肥${f7N(tot.l,1)}kg｜產能${f7N(tot.y,1)}kg`);
      });
      const any=Object.values(data).some(a=>a.some(r=>r.waterTons||r.waterMinutes||r.solidBags||r.liquidKg||r.yieldKg));
      return{empty:!any,range:ctx.yearsMode?`${years[0]}～${years[years.length-1]}（看年）`:`${ctx.year}年（看月）`,zones:zones.map(z=>z.yield),records:months.length*zones.length,summary:lines.join("\n"),data};
    }

    // 表九・氣候變遷與產能
    async function f7T9(ctx){
      const zones=f7YieldZones(ctx);
      const yearMode=ctx.yearsMode||(!ctx.req.year&&/變遷|歷年|長期/.test(ctx.q));
      const years=yearMode?f7Years({...ctx,yearsMode:true}):[ctx.year];
      const yieldSeries=await f7YieldSeries(zones,years,ctx.grades);
      const sumYield=(k,isYear)=>f7N(zones.reduce((s,z)=>s+(((yieldSeries[z]||{})[isYear?"byYear":"byMonth"]||{})[k]||0),0),1);
      const rows=[];
      if(yearMode){
        for(const y of years){
          const last=y===ctx.cy?ctx.cm:12;let tMax=null,tMin=null,rain=0,days=0;
          for(let m=1;m<=last;m++){const a=await f7ClimateAgg(f7Ym(y,m));if(a.tMax!=null)tMax=tMax==null?a.tMax:Math.max(tMax,a.tMax);if(a.tMin!=null)tMin=tMin==null?a.tMin:Math.min(tMin,a.tMin);rain+=a.rainTotal;days+=a.days;}
          rows.push({period:String(y),rainMm:f7N(rain,1),tMax,tMin,climateDays:days,yieldKg:sumYield(y,true)});
        }
      }else{
        const y=years[0],last=y===ctx.cy?ctx.cm:12;
        for(let m=1;m<=last;m++){const ym=f7Ym(y,m);const a=await f7ClimateAgg(ym);rows.push({period:ym,rainMm:a.rainTotal,tMax:a.tMax,tMin:a.tMin,climateDays:a.days,yieldKg:sumYield(ym,false)});}
      }
      const withClimate=rows.filter(r=>r.climateDays>0);
      const summary=rows.map(r=>`${r.period}：雨量${r.rainMm}mm、最高${r.tMax??"—"}°C、最低${r.tMin??"—"}°C${r.climateDays?"":"（無氣候資料）"}｜產能${r.yieldKg}kg`).join("\n");
      return{empty:!rows.some(r=>r.climateDays||r.yieldKg),range:yearMode?`${years[0]}～${years[years.length-1]}（看年）`:`${years[0]}年（看月）`,zones,records:withClimate.length,summary,data:{rows,note:"氣候資料只在有觀測的月份才有值；相關不等於因果。"}};
    }

    // 表十・登入 IP 與時間
    async function f7T10(ctx){
      if(window.TEDDY_ENTRY_ID==="farm"){
        const me=String((teddyHandsSession&&teddyHandsSession.id)||"").toUpperCase();
        if(!/^[AB]/.test(me))return{empty:true,range:f7RangeLabel(ctx),records:0,summary:"表十登入紀錄只有 A／B 管理帳號可以查看。",data:{}};
      }
      let months=f7Months(ctx.startYm,ctx.endYm);if(months.length>12)months=months.slice(-12);
      const person=(ctx.q.match(/\b([A-Za-z]\d{2,3})\b/)||[])[1];
      const rows=[];
      for(const ym of months){
        const docs=await f7KvRange(`loginAudit:${ym}:`);
        docs.forEach(d=>{const v=d.value;if(!v||typeof v!=="object")return;
          if(person&&String(v.personId||"").toUpperCase()!==person.toUpperCase())return;
          const day=f7StampDay(v.loginDate||v.loggedAt);if(ctx.day&&day!==ctx.day)return;
          rows.push({loggedAt:Number(v.loggedAt)||0,date:v.loginDate||"",time:v.loginTime||"",personId:v.personId||"",personName:v.personName||v.personId||"",role:v.roleLabel||v.role||"",ip:v.ip||""});});
      }
      rows.sort((a,b)=>b.loggedAt-a.loggedAt);
      const byPerson={};rows.forEach(r=>{const k=`${r.personName}(${r.personId})`;byPerson[k]=(byPerson[k]||0)+1;});
      const ips=[...new Set(rows.map(r=>r.ip).filter(Boolean))];
      const summary=rows.length?`共 ${rows.length} 次成功登入，${Object.keys(byPerson).length} 位人員，${ips.length} 個不同 IP。\n各人次數：${Object.entries(byPerson).map(([k,v])=>`${k} ${v}次`).join("、")}\n最近：${rows.slice(0,5).map(r=>`${r.date} ${r.time} ${r.personName} ${r.ip}`).join("；")}`:"這段期間沒有登入紀錄。";
      return{empty:!rows.length,range:f7RangeLabel(ctx),records:rows.length,summary,data:{logins:rows.slice(0,80).map(({loggedAt,...r})=>r),byPerson,ips}};
    }

        // ===== Smart Teddy 8.6.0：表十一／表十二（對齊完全體 V5.1.C132 ZONEWORK_ITEMS）=====
    // 與完全體同一來源：zonework:{分區}:{年月} 的 confirmHistory（只算已回報確認）。
    const GH_ZW_ITEMS=[
      {key:"溝灌",unit:"噸"},{key:"噴灌",unit:"分鐘"},{key:"米糠",unit:"包"},{key:"金旺",unit:"包"},
      {key:"黃豆",unit:"kg"},{key:"水果",unit:"kg"},{key:"硝酸鉀",unit:"kg"},{key:"磷酸一鉀",unit:"kg"},
      {key:"硫酸鉀",unit:"kg"},{key:"鈣鎂粉",unit:"kg"},{key:"微量元素",unit:"kg"}
    ];
    function ghZwItemsInText(q){const s=String(q||"");return GH_ZW_ITEMS.filter(it=>s.includes(it.key));}
    function ghProfileRange(ctx){
      // 表十一／十二是長期側寫：沒指定期間時，預設今年 1 月到本月。
      const explicit=!!(ctx.req.year||ctx.req.month||ctx.day||/到|至|~|～/.test(ctx.q));
      if(explicit)return{startYm:ctx.startYm,endYm:ctx.endYm};
      return{startYm:f7Ym(ctx.cy,1),endYm:f7Ym(ctx.cy,ctx.cm)};
    }
    function ghProfileRangeLabel(ctx,rg){return ctx.day?ctx.day:(rg.startYm===rg.endYm?rg.startYm:`${rg.startYm}～${rg.endYm}`);}
    async function ghZwSeries(zones,months,dayFilter){
      const jobs=[];months.forEach(ym=>zones.forEach(z=>jobs.push({ym,z})));
      const got=await f7Pool(jobs,6,async j=>({j,list:await f7ZoneworkConfirmed(j.z.id,j.ym)}));
      const series={};let count=0;
      for(const g of got){
        if(!g)continue;
        const zn=g.j.z.yield;
        for(const h of g.list){
          if(dayFilter&&h.day!==dayFilter)continue;
          const zo=series[zn]||(series[zn]={});
          const io=zo[h.rowKey]||(zo[h.rowKey]={});
          io[g.j.ym]=(io[g.j.ym]||0)+h.qty;count++;
        }
      }
      return{series,count};
    }
    function ghSumObj(o){return Object.values(o||{}).reduce((a,b)=>a+(Number(b)||0),0);}

    // 表十一・溫室用量側寫
    async function f7T11(ctx){
      const rg=ghProfileRange(ctx);
      let months=f7Months(rg.startYm,rg.endYm);if(months.length>36)months=months.slice(-36);
      const zones=f7ZoneList(ctx);
      const {series,count}=await ghZwSeries(zones,months,ctx.day);
      const showMonths=months.length>1&&(zones.length===1||/每月|逐月|各月|月份|趨勢/.test(ctx.q));
      const lines=[],profile={};
      zones.forEach(z=>{
        const zo=series[z.yield]||{};
        const items=GH_ZW_ITEMS.filter(it=>ghSumObj(zo[it.key])>0);
        if(!items.length)return;
        profile[z.yield]={};
        const parts=items.map(it=>{
          const m=zo[it.key],tot=f7N(ghSumObj(m));
          profile[z.yield][it.key]={unit:it.unit,total:tot,byMonth:Object.fromEntries(months.filter(ym=>m[ym]).map(ym=>[ym,f7N(m[ym])]))};
          const detail=showMonths?`（${months.filter(ym=>m[ym]).map(ym=>`${Number(ym.slice(5))}月${f7N(m[ym])}`).join("、")}）`:"";
          return `${it.key}${tot}${it.unit}${detail}`;
        });
        lines.push(`${z.yield}：${parts.join("；")}`);
      });
      return{empty:!lines.length,range:ghProfileRangeLabel(ctx,rg),zones:zones.map(z=>z.yield),records:count,
        summary:lines.length?lines.join("\n"):"這段期間沒有已回報確認的用量紀錄。",
        data:{profile,units:"溝灌=噸、噴灌=分鐘、米糠／金旺=包、其他資材=kg"}};
    }

    // 表十二・細項跨溫室對比
    async function f7T12(ctx){
      const rg=ghProfileRange(ctx),range=ghProfileRangeLabel(ctx,rg);
      const items=ghZwItemsInText(ctx.q);
      if(!items.length)return{empty:true,range,records:0,summary:"表十二要先指定一個細項："+GH_ZW_ITEMS.map(x=>x.key).join("、")+"。例如「表十二 米糠 各溫室比較」。",data:{}};
      let months=f7Months(rg.startYm,rg.endYm);if(months.length>36)months=months.slice(-36);
      const zones=ctx.zones.length>=2?ctx.zones:GH_ZONES;
      const {series,count}=await ghZwSeries(zones,months,ctx.day);
      const showMonths=months.length>1&&/每月|逐月|各月|月份|趨勢/.test(ctx.q);
      const lines=[],compare={};
      items.forEach(it=>{
        const rank=zones.map(z=>{const m=(series[z.yield]||{})[it.key]||{};return{zone:z.yield,total:f7N(ghSumObj(m)),byMonth:m};})
          .filter(r=>r.total>0).sort((a,b)=>b.total-a.total);
        compare[it.key]={unit:it.unit,zones:rank.map(r=>({zone:r.zone,total:r.total,byMonth:Object.fromEntries(Object.entries(r.byMonth).map(([k,v])=>[k,f7N(v)]))}))};
        if(!rank.length){lines.push(`${it.key}：這段期間各溫室都沒有已確認紀錄`);return;}
        const all=f7N(rank.reduce((a,r)=>a+r.total,0));
        lines.push(`${it.key}（${it.unit}）：`+rank.map(r=>{
          const detail=showMonths?`〔${months.filter(ym=>r.byMonth[ym]).map(ym=>`${Number(ym.slice(5))}月${f7N(r.byMonth[ym])}`).join("、")}〕`:"";
          return `${r.zone}${r.total}${detail}`;
        }).join("、")+`；合計${all}`);
      });
      const empty=Object.values(compare).every(c=>!c.zones.length);
      return{empty,range,zones:zones.map(z=>z.yield),records:count,summary:lines.join("\n"),data:{compare}};
    }

    // ===== Smart Teddy 8.6.0：表十三・表十四（對齊完全體 V5.1.C132）=====
    const T13_TEMP_BINS_T=[
      {label:"< 20°C",lo:-99,hi:20},{label:"20–25°C",lo:20,hi:25},{label:"25–28°C",lo:25,hi:28},
      {label:"28–31°C",lo:28,hi:31},{label:"31–34°C",lo:31,hi:34},{label:"≥ 34°C",lo:34,hi:99}
    ];
    const T14_CATS_T=[
      {key:"溝灌",unit:"噸",items:["溝灌"]},{key:"噴灌",unit:"分",items:["噴灌"]},
      {key:"固態",unit:"包",items:["米糠","金旺"]},{key:"液態",unit:"kg",items:["黃豆","水果","硝酸鉀","磷酸一鉀","硫酸鉀","鈣鎂粉","微量元素"]}
    ];
    async function ghClimateDailyMap(ym){
      const out={};
      f7ClimateDaily(await f7ClimateMonth(ym)).forEach(d=>{if(d.tMax!=null)out[d.day]=d;});
      return out;
    }
    async function ghUsageByDay(zones,ym){
      const merged={};
      const lists=await f7Pool(zones,6,z=>f7ZoneworkConfirmed(z.id,ym));
      (lists||[]).forEach(list=>(list||[]).forEach(h=>{const b=merged[h.day]||(merged[h.day]={});b[h.rowKey]=(b[h.rowKey]||0)+h.qty;}));
      return merged;
    }
    function ghSumKeys(o,keys){return keys.reduce((s,k)=>s+(Number(o&&o[k])||0),0);}

    // 表十三・氣候與資材投入：神岡站每日氣候 × 各溫室 6–8 回報確認，逐日對齊；溫度分級以當日最高溫分組。
    async function f7T13(ctx){
      const zones=f7ZoneList(ctx);
      const zoneLabel=ctx.zones.length?ctx.zones.map(z=>z.yield).join("、"):"全區合計";
      const stats=/統計|分級|高溫|低溫|雨天|晴天|下雨|不下雨|溫度越高|溫度區間/.test(ctx.q)||(!ctx.req.ym&&!ctx.day&&!!ctx.req.year);
      let months;
      if(ctx.day)months=[ctx.day.slice(0,7)];
      else if(stats&&!ctx.req.ym){const y=ctx.req.year||ctx.cy;const last=y===ctx.cy?ctx.cm:12;months=[];for(let m=1;m<=last;m++)months.push(f7Ym(y,m));}
      else months=f7Months(ctx.startYm,ctx.endYm).slice(-12);
      const days=[];
      for(const ym of months){
        const [clim,use]=await Promise.all([ghClimateDailyMap(ym),ghUsageByDay(zones,ym)]);
        Object.keys(clim).sort().forEach(d=>{if(ctx.day&&d!==ctx.day)return;days.push({date:d,clim:clim[d],use:use[d]||{}});});
      }
      const range=ctx.day||(months.length===1?months[0]:`${months[0]}～${months[months.length-1]}`);
      if(!days.length)return{empty:true,range,zones:[zoneLabel],records:0,summary:"這段期間沒有神岡站氣候資料可對照。",data:{}};
      const agg=list=>{
        const n=list.length,sum=f=>list.reduce((s,d)=>s+f(d),0);
        const tons=sum(d=>ghSumKeys(d.use,["溝灌"])),mins=sum(d=>ghSumKeys(d.use,["噴灌"]));
        return{days:n,tonsPerDay:n?f7N(tons/n,2):0,minutesPerDay:n?f7N(mins/n,1):0,tons:f7N(tons,1),minutes:f7N(mins,1),
          waterDays:list.filter(d=>ghSumKeys(d.use,["溝灌","噴灌"])>0).length,
          fertDays:list.filter(d=>ghSumKeys(d.use,[...T14_CATS_T[2].items,...T14_CATS_T[3].items])>0).length,
          tMaxAvg:n?f7N(sum(d=>d.clim.tMax)/n,1):null};
      };
      if(ctx.day){
        const d=days[0],u=Object.entries(d.use).map(([k,v])=>`${k}${f7N(v,2)}`).join("、")||"無回報";
        return{empty:false,range,zones:[zoneLabel],records:1,summary:`${d.date}：最高${d.clim.tMax}°C、最低${d.clim.tMin}°C、雨量${f7N(d.clim.rain||0,1)}mm｜${zoneLabel}用量：${u}`,data:{day:d}};
      }
      const bins=T13_TEMP_BINS_T.map(b=>({range:b.label,...agg(days.filter(d=>d.clim.tMax>=b.lo&&d.clim.tMax<b.hi))})).filter(b=>b.days);
      const rainy=agg(days.filter(d=>(d.clim.rain||0)>=1)),dry=agg(days.filter(d=>(d.clim.rain||0)<1)),total=agg(days);
      const lines=[`${zoneLabel}｜${days.length}天有氣候資料：溝灌共${total.tons}噸、噴灌共${total.minutes}分鐘；有補水${total.waterDays}天、有施肥或資材${total.fertDays}天`,
        "依當日最高溫分級（平均每天）："+bins.map(b=>`${b.range} ${b.days}天→溝灌${b.tonsPerDay}噸、噴灌${b.minutesPerDay}分`).join("；"),
        `雨天（≥1mm）${rainy.days}天：溝灌${rainy.tonsPerDay}噸/天、噴灌${rainy.minutesPerDay}分/天｜無雨${dry.days}天：溝灌${dry.tonsPerDay}噸/天、噴灌${dry.minutesPerDay}分/天`];
      return{empty:false,range,zones:[zoneLabel],records:days.length,summary:lines.join("\n"),data:{total,bins,rainy,dry}};
    }

    // 表十四・產能 × 資材 × 雨量：各期產能（全品級）＋資材四類＋神岡站雨量（每日取 H_24R 最大值再加總）。
    async function f7T14(ctx){
      const zones=f7ZoneList(ctx);
      const zoneLabel=ctx.zones.length?ctx.zones.map(z=>z.yield).join("、"):"全場";
      const mode=ctx.yearsMode?"year":/15天|半月|上半月|下半月/.test(ctx.q)?"period":"month";
      const years=mode==="year"?f7Years(ctx):[ctx.year];
      const ys=await f7YieldSeries(zones.map(z=>z.yield),years,[...F7_GRADES]);
      const months=[];years.forEach(y=>{const last=y===ctx.cy?ctx.cm:12;for(let m=1;m<=last;m++)months.push(f7Ym(y,m));});
      const bucketOf=ds=>mode==="year"?ds.slice(0,4):mode==="period"?f7PeriodOf(ds):ds.slice(0,7);
      const rows={};
      const B=k=>rows[k]||(rows[k]={period:k,yieldKg:0,rainMm:0,溝灌:0,噴灌:0,固態:0,液態:0});
      for(const ym of months){
        const [use,clim]=await Promise.all([ghUsageByDay(zones,ym),ghClimateDailyMap(ym)]);
        Object.entries(use).forEach(([ds,o])=>{const b=B(bucketOf(ds));T14_CATS_T.forEach(c=>{b[c.key]+=ghSumKeys(o,c.items);});});
        Object.entries(clim).forEach(([ds,d])=>{B(bucketOf(ds)).rainMm+=d.rain||0;});
      }
      zones.forEach(z=>{const s=ys[z.yield]||{};const src=mode==="year"?s.byYear:mode==="period"?s.byPeriod:s.byMonth;Object.entries(src||{}).forEach(([k,v])=>{B(String(k)).yieldKg+=Number(v)||0;});});
      let list=Object.values(rows).sort((a,b)=>a.period.localeCompare(b.period));
      if(ctx.req.ym&&mode!=="year")list=list.filter(r=>r.period.startsWith(ctx.req.ym));
      list.forEach(r=>{["yieldKg","rainMm","溝灌","噴灌","固態","液態"].forEach(k=>r[k]=f7N(r[k],1));});
      const range=mode==="year"?`${years[0]}～${years[years.length-1]}`:(ctx.req.ym||`${ctx.year}年`);
      if(!list.length)return{empty:true,range,zones:[zoneLabel],records:0,summary:"這段期間沒有產能、資材或雨量資料。",data:{}};
      const lines=list.slice(-12).map(r=>`${r.period}：產能${r.yieldKg}kg｜溝灌${r.溝灌}噸、噴灌${r.噴灌}分、固態${r.固態}包、液態${r.液態}kg｜雨量${r.rainMm}mm`);
      return{empty:false,range,zones:[zoneLabel],records:list.length,summary:`${zoneLabel}（${mode==="year"?"逐年":mode==="period"?"每15天":"逐月"}）\n`+lines.join("\n"),data:{mode,rows:list}};
    }

    const F7_READERS={1:f7T1,2:f7T2,3:f7T3,4:f7T4,5:f7T5,6:f7T6,7:f7T7,8:f7T8,9:f7T9,10:f7T10,11:f7T11,12:f7T12,13:f7T13,14:f7T14};
    const F7_RULES_TEXT=`功能表7「耗材與報表」判讀規則（完全體 V5.1.C132）：
- 路徑：功能7 → 年份 → 月份 → 表一～表十四。十四張表：${Object.values(F7_TABLES).map(x=>`表${x.no}${x.name}`).join("、")}。
- payload.f7.summary 與 payload.f7.data 的數字已由程式依完全體同一算法計算完成；只能引用這些數字，不可重算出不同結果、不可補猜。
- 表一／表三／表八的投入只算 confirmHistory 已回報確認的紀錄；單位：溝灌=噸、噴灌=分鐘、米糠／金旺=包、其他資材=kg。
- 表六的施肥用量來自施肥／噴藥月曆（spraylog）的肥料項目，與表一的米糠／金旺是不同資料來源，兩者不可相加。
- 表七／八／九的產能單位是 kg，品級 A／B／D／NG；2026-08-01 前是年度封存、之後是逐日資料。
- 表十一（溫室用量側寫）、表十二（細項跨溫室對比）、表十三（氣候與資材投入）、表十四（產能×資材×雨量）的用量和表一同一來源 confirmHistory，並依完全體 C122 去除完全重複的回報；表十一固定溫室看11項組成，表十二固定細項比較各溫室。
- 表五／表九的氣候是中央氣象署神岡站；月雨量＝各日雨量加總，日雨量取當日 24 小時累積最大值。
- 回答格式：先一句結論（數字＋單位＋分區＋期間），再給最多 3 點專業觀察（例如與無花果生育期、季節、水肥管理、產能的關聯，相關不等於因果）；最後一行寫「來源：功能表7・表X・表名（期間）」。總長度最多 6 行。
- 資料是空的就直接說這段期間沒有資料，並建議可以換哪個期間或分區。`;

    function f7WithTimeout(promise,ms){
      let timer;
      return Promise.race([promise,new Promise((_,rej)=>{timer=setTimeout(()=>rej(new Error(`讀取超過 ${Math.round(ms/1000)} 秒，資料量太大`)),ms);})]).finally(()=>clearTimeout(timer));
    }
    async function ghFunction7Answer(q){
      q=teddyToTrad(q);
      if(f7IsMenuQuestion(q))return f7MenuText();
      const table=ghFunction7Table(q);
      if(!table)return f7MenuText();
      const meta=F7_TABLES[table];
      f7ForceFresh=/最新|重新|刷新|更新一下|即時/.test(String(q||""));
      const ctx=f7Ctx(q);
      let result;
      try{result=await f7WithTimeout(F7_READERS[table](ctx),40000);}
      catch(e){f7ForceFresh=false;return `功能表7・表${meta.no}・${meta.name}這次沒讀成功（${e.message}）。可以縮小範圍再問，例如指定年份、月份或分區。`;}
      f7ForceFresh=false;
      const header=`功能表7・表${meta.no}・${meta.name}（${result.range}${result.zones&&result.zones.length&&result.zones.length<6?"｜"+result.zones.join("、"):""}）`;
      if(result.empty)return `${header}：${result.summary}`;
      const prompt=`【固定資料路由：${header}】\n使用者問題：${q}\n資料說明：${meta.desc}\n資料來源：${meta.source}\n只能根據 payload.f7 回答，不得改看其他表或其他功能表。`;
      const payload={selectedEntry:{id:"function7",label:"功能表7・耗材與報表",table:`表${meta.no}・${meta.name}`},f7:{table:`表${meta.no}・${meta.name}`,range:result.range,zones:result.zones||null,records:result.records,readAt:new Date().toLocaleString("zh-TW",{hour12:false}),summary:result.summary,data:result.data}};
      try{
        const ai=await f7WithTimeout(ghAskAI(prompt,payload),30000);
        if(ai&&!/^沒有回覆/.test(ai))return ai;
      }catch(e){console.warn("F7 AI 解讀失敗，改用程式摘要",e);}
      return `${header}\n${result.summary}\n來源：功能表7・表${meta.no}・${meta.name}`;
    }

    // ===== Smart Teddy 8.6.0：完全體 V5.1.C132 對齊層 =====
    // 原則：完全體＝唯一真相，Teddy＝嘴巴。
    // 1) 功能表名稱、表格名稱、版本號以完全體發布的 teddy-manifest.json 為準；讀不到才用內建備份。
    // 2) 溫室助理（?app=farm）每次提問前即時讀 person:{ID}，閱覽權限與完全體功能表2同一套規則。
    // 3) 本層只讀不寫；寫入仍走既有「草稿 → 確認 → 寫入」流程。
    const TEDDY_V51_MANIFEST_URL="https://blue-ribbon-v51.vercel.app/teddy-manifest.json";
    const TEDDY_V51_MANIFEST_BUILTIN={
      sourceVersion:"V5.1.C132",
      functions:{
        "1":{name:"人員與帳號"},"2":{name:"權限管理"},"3":{name:"產能資料輸入與分析"},
        "4":{name:"分區工項提示內容（工作1–5）"},"5":{name:"工項行事曆／年度計畫"},"6":{name:"照片影像資料庫"},
        "7":{name:"查看各項報表（表一～表十四）"},"8":{name:"果樹履歷（樹齡／高度／節間）"},"9":{name:"環境數據"},"10":{name:"上下班打卡"}
      },
      function7Tables:{
        "表一":"耗材匯總表","表二":"年度計畫表","表三":"分區耗材統計","表四":"留言板內容","表五":"氣候資料",
        "表六":"施肥用量統計","表七":"長週期產能趨勢","表八":"分區資材投入與產能對比","表九":"氣候變遷與產能",
        "表十":"登入 IP 與時間","表十一":"溫室用量側寫","表十二":"細項跨溫室對比","表十三":"氣候與資材投入","表十四":"產能 × 資材 × 雨量"
      },
      guide:"【完全體 V5.1.C132 系統說明（Teddy 回答「怎麼用／怎麼算／是什麼」的唯一依據）】\n一、整體\n- 完全體是藍帶無花果溫室的管理系統，首頁大標題「好土、好果、好生活」。點選地圖上的分區登入後，從「整體功能表」進入各功能。\n- 主選單共 10 項：1 人員與帳號、2 權限管理、3 產能資料輸入與分析、4 分區工項提示內容、5 工項行事曆／年度計畫、6 照片影像資料庫、7 查看各項報表、8 果樹履歷（樹齡／高度／節間）、9 環境數據、10 上下班打卡；另有「備份與還原」。\n- 分區共六區：一期、二期、三期、四北、四南、五期。\n- 資料庫：主要資料在 Firebase 專案 figapi-d24dc（kv 集合）；產能在另一個專案 figdata-d2737。報表全部只讀取、不寫入。\n二、權限（功能表2）\n- A 開頭帳號（設計師）、B 開頭帳號（老闆）全部功能開放。\n- 其他帳號需為「啟用」狀態；每個功能表可逐項開關「閱覽／修改」，沒設逐項開關時，依權限層級（修改、閱覽、回饋）決定。\n- 表十（登入 IP）只有 A、B 帳號可看。\n三、工作分類\n- 工作1–5（功能表4）：打芽(側)、打芽(地)、除草、剪葉、覆蓋，記錄指派與進度。\n- 工作6 補水＝溝灌（噸）、噴灌（分鐘）；工作7 施肥＝米糠、金旺（包）；工作8 其他資材＝黃豆、水果、硝酸鉀、磷酸一鉀、硫酸鉀、鈣鎂粉、微量元素（kg）。\n- 報表裡的「固態」＝米糠＋金旺；「液態」＝工作8 的 7 種資材。\n四、用量怎麼算（表一、三、六、八、十一～十四共用同一規則）\n- 只算「已回報確認」的紀錄（confirmHistory），指派或未確認的不算。\n- 完全相同的回報（同品項、同數量、同時間、同回報人、同指定事件）只算一次，因為早期資料曾被重複寫入。\n- 只認日期落在該月份的回報（每個分區每月一份文件）。\n- 數量必須大於 0 才計入。\n五、功能表7 報表（路徑：年份 → 月份 → 表格）\n- 表一 耗材匯總表；表二 年度計畫表（與功能表5共用）；表三 分區耗材統計（月曆式，逐日看各區 6–8 用量）；表四 留言板內容。\n- 表五 氣候資料：中央氣象署神岡站逐時觀測；有「月觀測／年觀測」氣候總覽，雨量柱＋最高溫紅線＋最低溫藍線。\n- 表六 施肥用量統計；表七 長週期產能趨勢（2020 至今，每 15 天一筆）；表八 分區資材投入與產能對比；表九 氣候變遷與產能（看年／看月）；表十 登入 IP 與時間。\n- 表十一 溫室用量側寫：固定一個溫室，看 11 項細項的長期組成。\n- 表十二 細項跨溫室對比：固定一個細項，比較各溫室。\n- 表十三 氣候與資材投入：神岡站每日氣候對齊各溫室 6–8 用量；「溫度分級統計」依當日最高溫分六級（<20、20–25、25–28、28–31、31–34、≥34°C），並比較雨天（雨量 ≥1mm）與無雨天。\n- 表十四 產能 × 資材 × 雨量：產能折線（左軸）、資材柱狀（右軸）、雨量雲朵；可看年／月／15 天／週。\n- 表八、十一、十二、十四有「看走勢／看當期」切換：走勢＝整段期間逐期排開；當期＝只看選定一期、各溫室並排。兩者用同一份資料，同一期數字相同。\n- 多品項可選「加總（疊加）」或「並列（各品項一根）」，全系統共用這個設定；點柱子可看逐筆明細。\n- 圖表刻度：溫度固定 0–45°C、雨量固定 0–1000mm，都切 5 格；可開「六區統一刻度」，以六區中的最大值為上限。\n六、氣候\n- 戶外氣候＝神岡站（表五、九、十三、十四）；每日雨量取當日累積雨量最大值。\n- 功能表9 是溫室「內」的人工紀錄（溫度 °C、濕度 %、照度 lux、EC mS/cm、環境異常：乾旱、淹水、悶熱、寒冷、高濕、低照度、其他），與戶外氣候不可混用。\n七、其他功能\n- 功能表6 照片：依分區與月份存放，含拍攝日期、備註、上傳者。\n- 功能表8 果樹履歷：依分區、年月、點位、樹齡、剪枝日記錄每一節的標記日、間距（cm）、有無果、果直徑（mm）、成熟日。\n- 功能表10 上下班打卡：打卡紀錄、休息時段、假別。"
    };
    let TEDDY_V51_MANIFEST=TEDDY_V51_MANIFEST_BUILTIN;
    let TEDDY_V51_MANIFEST_FROM="內建備份";
    const GH_CN_NUM=["","一","二","三","四","五","六","七","八","九","十","十一","十二","十三","十四"];
    function ghCleanName(s){return String(s||"").replace(/[（(].*$/,"").trim();}
    function ghApplyV51Manifest(){
      const tb=(TEDDY_V51_MANIFEST&&TEDDY_V51_MANIFEST.function7Tables)||{};
      for(let n=1;n<=14;n++){const nm=ghCleanName(tb["表"+GH_CN_NUM[n]]);if(nm&&F7_TABLES[n])F7_TABLES[n].name=nm;}
    }
    async function teddyLoadV51Manifest(){
      try{
        const r=await fetch(TEDDY_V51_MANIFEST_URL+"?t="+Date.now(),{cache:"no-store"});
        if(!r.ok)throw new Error("HTTP "+r.status);
        const m=await r.json();
        if(!m||!m.sourceVersion||!m.functions||!m.function7Tables)throw new Error("manifest 格式不符");
        TEDDY_V51_MANIFEST=m;TEDDY_V51_MANIFEST_FROM="完全體線上";
      }catch(e){console.warn("讀不到完全體 teddy-manifest.json，改用內建備份：",e.message);}
      ghApplyV51Manifest();
      return TEDDY_V51_MANIFEST;
    }
    window.teddyLoadV51Manifest=teddyLoadV51Manifest;
    function ghV51Version(){return (TEDDY_V51_MANIFEST&&TEDDY_V51_MANIFEST.sourceVersion)||"V5.1.C132";}
    function ghV51Guide(){return String((TEDDY_V51_MANIFEST&&TEDDY_V51_MANIFEST.guide)||TEDDY_V51_MANIFEST_BUILTIN.guide||"");}
    function ghFnName(n){const f=((TEDDY_V51_MANIFEST&&TEDDY_V51_MANIFEST.functions)||{})[String(n)];return f&&f.name?f.name:"";}
    function ghRouteMapText(){
      const lines=[`完全體 ${ghV51Version()} 功能表（依據：${TEDDY_V51_MANIFEST_FROM}）：`];
      for(let n=1;n<=10;n++){const nm=ghFnName(n);if(nm)lines.push(`功能表${n}＝${nm}`);}
      lines.push("另有：備份與還原（Teddy 不處理）");
      lines.push("功能表7：年份 → 月份 → "+Object.entries(TEDDY_V51_MANIFEST.function7Tables||{}).map(([k,v])=>`${k}${ghCleanName(v)}`).join("、"));
      lines.push("問法範例：三期9月溝灌多少／表十一三期今年用量／表十二米糠各溫室比較／四南環境數據／一期果樹履歷／二期照片");
      return lines.join("\n");
    }

    // ---- 權限：與完全體功能表2同一套規則 ----
    // A／B 開頭帳號全開；其他帳號需 status=active，有逐項開關以開關為準，否則回退 tier（修改／閱覽）。
    const GH_ENTRY_MENU={activity:4,people:1,yield:3,work:4,calendar:5,photos:6,function7:7,trees:8,environment:9};
    const GH_F7_EXTRA_MENU={2:5,7:3,8:3,9:3};
    function ghV51Access(menuNo){
      if((window.TEDDY_ENTRY_ID||"owner")!=="farm")return{view:true,edit:true};
      const s=teddyHandsSession;
      if(!s||!s.id)return{view:false,edit:false};
      if(/^[AB]/i.test(String(s.id)))return{view:true,edit:true};
      if(s.status&&String(s.status).toLowerCase()!=="active")return{view:false,edit:false};
      const perms=s.menuPerms||{},idx=menuNo-1;
      const has=Object.prototype.hasOwnProperty.call(perms,String(idx));
      const item=has?(perms[String(idx)]||{}):{};
      const edit=has?!!item.edit:s.tier==="修改";
      const view=edit||(has?!!item.view:s.tier==="閱覽");
      return{view,edit};
    }
    async function ghV51RefreshSession(){
      if(window.TEDDY_ENTRY_ID!=="farm"||!teddyHandsSession||!teddyHandsSession.id)return;
      try{
        const db=await ghMainFirestore();
        const d=await db.collection("kv").doc(`person:${teddyHandsSession.id}`).get();
        if(!d.exists){teddyHandsSession.status="missing";return;}
        let v=(d.data()||{}).value;
        if(typeof v==="string"){try{v=JSON.parse(v);}catch(_){v=null;}}
        if(v&&typeof v==="object"){
          teddyHandsSession.menuPerms=v.menuPerms||{};
          teddyHandsSession.tier=v.tier||null;
          teddyHandsSession.status=v.status||"active";
        }
      }catch(e){console.warn("權限即時同步失敗，沿用登入時權限",e);}
    }
    function ghV51DenyText(entry,q){
      if(window.TEDDY_ENTRY_ID!=="farm")return "";
      const need=[];
      if(GH_ENTRY_MENU[entry])need.push(GH_ENTRY_MENU[entry]);
      if(entry==="function7"){const tb=ghFunction7Table(q);if(tb&&GH_F7_EXTRA_MENU[tb])need.push(GH_F7_EXTRA_MENU[tb]);}
      for(const n of need){
        if(!ghV51Access(n).view)return `你的帳號在完全體功能表2還沒有開啟「功能表${n}・${ghFnName(n)}」的閱覽權限，所以這題我不能回答。需要的話請管理者到功能表2調整。`;
      }
      return "";
    }


    // ===== Smart Teddy 8.6.0：完全體說明（怎麼用／怎麼算／是什麼）=====
    // 依據只有一份：完全體發布的 teddy-manifest.json 裡的 guide（讀不到才用內建備份）。不讀任何數字資料。
    function ghIsGuideQuestion(q){
      const t=teddyToTrad(String(q||"")).replace(/\s+/g,"");
      const strong=/怎麼算|如何計算|怎麼計算|算法|計算方式|計算規則|是什麼意思|什麼意思|代表什麼|是什麼|在哪裡|在哪|怎麼操作|如何操作|怎麼用|如何使用|使用說明|說明一下|教我|差別|差在哪|有什麼不同|哪裡不同|為什麼|怎麼處理|如何處理|權限怎麼|誰可以看|誰能看/.test(t);
      if(!strong)return false;
      if(/多少|幾包|幾噸|幾公斤|幾kg|幾天|哪天|哪幾天|今天|昨天|本月|這個月|上個月|今年|去年|\d{1,2}月/.test(t))return false;
      if(ghFindZone(t)&&!/怎麼算|計算|規則|算法|意思|代表|差別|不同/.test(t))return false;
      return true;
    }
    async function ghGuideAnswer(q){
      const guide=ghV51Guide();
      const prompt=`【固定資料路由：完全體說明 ${ghV51Version()}】\n使用者問題：${q}\n只能根據 payload.guide 回答「完全體怎麼用、怎麼算、是什麼」。說明書沒寫到的就回答「說明書沒有寫到這一點，建議直接到完全體確認」，禁止猜測或補充說明書以外的功能。這題不查任何數字。回答最多 6 行，先給結論。`;
      try{
        const ai=await f7WithTimeout(ghAskAI(prompt,{selectedEntry:{id:"guide",label:"完全體說明"},guide,version:ghV51Version()}),30000);
        if(ai&&!/^沒有回覆/.test(ai))return ai;
      }catch(e){console.warn("完全體說明 AI 失敗，改用關鍵字摘錄",e);}
      const words=(String(q).match(/[\u4e00-\u9fff]{2}|表[一二三四五六七八九十]+|功能表?\d+/g)||[]);
      const lines=guide.split("\n").filter(l=>l.startsWith("- "));
      const scored=lines.map(l=>({l,s:words.filter(w=>l.includes(w)).length})).filter(x=>x.s>0).sort((a,b)=>b.s-a.s).slice(0,3);
      return scored.length?scored.map(x=>x.l).join("\n")+"\n（來源：完全體說明）":"說明書沒有寫到這一點，建議直接到完全體確認。";
    }

    // ---- 路由判斷：功能表6／8／9／1 ----
    function ghIsTreesQuestion(q){return /果樹履歷|樹履歷|履歷|點位|節間|樹齡|果直徑|果徑|著果|成熟日|有果|幾顆果|果實數|結果數/.test(String(q||""));}
    function ghIsPhotosQuestion(q){return /照片|相片|影像資料|拍照|圖檔/.test(String(q||""));}
    function ghIsEnvironmentQuestion(q){
      const t=String(q||"");
      if(/天氣|氣候|氣溫|戶外|神岡|雨量|降雨/.test(t))return false;
      if(/環境數據|環境紀錄|環境資料|環境異常|室內溫|照度|EC值|電導|悶熱|淹水|乾旱|低照度|高濕/i.test(t))return true;
      if(/(?:^|[^A-Za-z])EC(?:$|[^A-Za-z])/i.test(t))return true;
      return /溫度|濕度/.test(t)&&!!ghFindZone(t);
    }
    function ghIsPeopleQuestion(q){
      return /人員名單|員工名單|有哪些人|幾位員工|幾個員工|人員與帳號|帳號清單|誰是(?:設計師|老闆|會計|行銷|現場工程師|品管師|客服|來賓)|(?:設計師|老闆|會計|行銷|現場工程師|品管師|客服|來賓)有誰|權限層級|誰有權限|權限設定/.test(String(q||""));
    }

    // ---- 讀取器 ----
    function ghZoneYieldName(id){const z=GH_ZONES.find(x=>x.id===id);return z?z.yield:(id||"—");}
    function ghNums(arr){return arr.filter(x=>x!==null&&x!==undefined&&x!=="").map(Number).filter(x=>Number.isFinite(x)&&x>-90);}
    function ghAvg(a){return a.length?f7N(a.reduce((s,x)=>s+x,0)/a.length,1):null;}
    function ghExplicitMonths(ctx){return !!(ctx.req.year||ctx.req.month||ctx.day||/到|至|~|～/.test(ctx.q));}

    // 功能表9・環境數據：environment:{分區}:{年月} → {entries:[{date,time,temperature,humidity,illuminance,ec,abnormalities,note}]}
    async function ghV51Environment(ctx){
      const zones=f7ZoneList(ctx);
      let months=f7Months(ctx.startYm,ctx.endYm);if(months.length>12)months=months.slice(-12);
      const jobs=[];months.forEach(ym=>zones.forEach(z=>jobs.push({ym,z})));
      const got=await f7Pool(jobs,6,async j=>({j,doc:await f7KvGet(`environment:${j.z.id}:${j.ym}`)}));
      const byZone={};let count=0;
      for(const g of got){
        if(!g||!g.doc)continue;
        const v=g.doc.value;
        const list=Array.isArray(v)?v:(v&&Array.isArray(v.entries)?v.entries:[]);
        for(const e of list){
          if(!e||typeof e!=="object")continue;
          if(ctx.day&&e.date!==ctx.day)continue;
          (byZone[g.j.z.yield]||(byZone[g.j.z.yield]=[])).push(e);count++;
        }
      }
      const lines=[],data={};
      Object.entries(byZone).forEach(([zn,list])=>{
        list.sort((a,b)=>`${b.date||""} ${b.time||""}`.localeCompare(`${a.date||""} ${a.time||""}`));
        const T=ghNums(list.map(e=>e.temperature)),H=ghNums(list.map(e=>e.humidity)),L=ghNums(list.map(e=>e.illuminance)),E=ghNums(list.map(e=>e.ec));
        const ab={};list.forEach(e=>(e.abnormalities||[]).forEach(a=>ab[a]=(ab[a]||0)+1));
        const last=list[0];
        const st={records:list.length,
          temperature:T.length?{avg:ghAvg(T),min:Math.min(...T),max:Math.max(...T)}:null,
          humidity:H.length?{avg:ghAvg(H)}:null,illuminance:L.length?{avg:ghAvg(L)}:null,ec:E.length?{avg:ghAvg(E)}:null,
          abnormalities:ab,latest:last?{date:last.date,time:last.time,temperature:last.temperature,humidity:last.humidity,illuminance:last.illuminance,ec:last.ec,abnormalities:last.abnormalities||[],note:last.note||""}:null};
        data[zn]=st;
        const parts=[`${list.length}筆`];
        if(st.temperature)parts.push(`溫度平均${st.temperature.avg}°C（${st.temperature.min}～${st.temperature.max}）`);
        if(st.humidity)parts.push(`濕度平均${st.humidity.avg}%`);
        if(st.illuminance)parts.push(`照度平均${st.illuminance.avg} lux`);
        if(st.ec)parts.push(`EC平均${st.ec.avg} mS/cm`);
        const abTxt=Object.entries(ab).map(([k,n])=>`${k}${n}次`).join("、");
        if(abTxt)parts.push(`異常：${abTxt}`);
        if(last)parts.push(`最新 ${last.date||""} ${last.time||""}${last.note?"（"+String(last.note).slice(0,40)+"）":""}`);
        lines.push(`${zn}：${parts.join("，")}`);
      });
      return{empty:!lines.length,range:f7RangeLabel(ctx),zones:zones.map(z=>z.yield),records:count,
        summary:lines.length?lines.join("\n"):"這段期間功能表9沒有溫室內環境紀錄。戶外氣候請改問功能表7表五。",data:{byZone:data}};
    }

    // 功能表6・照片影像資料庫：photoMeta:{分區}:{年月}:{id}（Teddy 只讀索引，看不到照片內容）
    async function ghV51Photos(ctx){
      const zones=f7ZoneList(ctx);
      let months=f7Months(ctx.startYm,ctx.endYm);if(months.length>24)months=months.slice(-24);
      const jobs=[];months.forEach(ym=>zones.forEach(z=>jobs.push({ym,z})));
      const got=await f7Pool(jobs,6,async j=>({j,docs:await f7KvRange(`photoMeta:${j.z.id}:${j.ym}:`)}));
      const rows=[];
      for(const g of got){
        if(!g)continue;
        for(const d of (g.docs||[])){
          const v=d.value;if(!v||typeof v!=="object")continue;
          const day=v.recordDate||f7StampDay(v.uploadedAt)||"";
          if(ctx.day&&day!==ctx.day)continue;
          rows.push({zone:g.j.z.yield,ym:g.j.ym,date:day,note:String(v.note||"").slice(0,80),uploader:v.uploaderId||"",file:v.fileName||""});
        }
      }
      rows.sort((a,b)=>String(b.date).localeCompare(String(a.date)));
      const count={};rows.forEach(r=>count[r.zone]=(count[r.zone]||0)+1);
      const lines=[];
      if(rows.length){
        lines.push("張數："+Object.entries(count).map(([z,n])=>`${z}${n}張`).join("、"));
        rows.slice(0,6).forEach(r=>lines.push(`${r.date||r.ym}｜${r.zone}${r.note?"｜"+r.note:""}${r.uploader?"｜"+r.uploader:""}`));
      }
      return{empty:!rows.length,range:f7RangeLabel(ctx),zones:zones.map(z=>z.yield),records:rows.length,
        summary:lines.length?lines.join("\n"):"這段期間功能表6沒有照片紀錄。",data:{count,latest:rows.slice(0,20)}};
    }

    // 功能表8・果樹履歷：treeTableUser:{帳號}:{分區}:{年月}:{點位}:{樹齡}:{剪枝月日}（舊版 treeTable: 同結構）
    async function ghV51Trees(ctx){
      const docs=[...(await f7KvRange("treeTableUser:")),...(await f7KvRange("treeTable:"))];
      const zoneIds=ctx.zones.map(z=>z.id);
      const explicit=ghExplicitMonths(ctx);
      const pm=ctx.q.match(/(?:點位|定點|格位|第)\s*([A-Za-z0-9\-]+)\s*(?:點|號|格)?/);
      const am=ctx.q.match(/樹齡\s*(\d+)|(\d+)\s*年生/);
      const age=am?Number(am[1]||am[2]):null;
      const seen=new Set(),rows=[];
      for(const d of docs){
        const r=d.value;if(!r||typeof r!=="object"||!r.zoneId||!Array.isArray(r.rows))continue;
        if(zoneIds.length&&!zoneIds.includes(r.zoneId))continue;
        const ym=f7Ym(Number(r.year),Number(r.month));
        if(explicit&&(ym<ctx.startYm||ym>ctx.endYm))continue;
        if(pm&&String(r.point)!==String(pm[1]))continue;
        if(age&&Number(r.treeAge)!==age)continue;
        const sig=[r.zoneId,ym,r.point,r.treeAge,r.pruneDate].join("|");
        if(seen.has(sig))continue;seen.add(sig);
        const filled=r.rows.filter(x=>x&&(x.markDate||x.spacing!==""&&x.spacing!=null));
        const sp=ghNums(r.rows.map(x=>x&&x.spacing));
        const fruit=r.rows.filter(x=>x&&x.fruitStatus==="有果");
        const dia=ghNums(fruit.map(x=>x.fruitDiameter));
        const mature=r.rows.filter(x=>x&&x.matureDate).length;
        rows.push({zone:ghZoneYieldName(r.zoneId),ym,point:r.point,treeAge:r.treeAge,pruneDate:r.pruneDate||"",
          nodes:filled.length,avgSpacingCm:ghAvg(sp),fruit:fruit.length,avgFruitDiameterMm:ghAvg(dia),mature,owner:r.ownerId||r.updatedBy||"",updatedAt:Number(r.updatedAt)||0});
      }
      rows.sort((a,b)=>b.updatedAt-a.updatedAt);
      const lines=rows.slice(0,10).map(r=>`${r.zone}｜${r.ym}｜點位${r.point}｜樹齡${r.treeAge}｜剪枝${r.pruneDate||"未定"}：已記錄${r.nodes}節`+
        (r.avgSpacingCm!=null?`，平均節間${r.avgSpacingCm} cm`:"")+`，有果${r.fruit}顆`+(r.avgFruitDiameterMm!=null?`（平均果徑${r.avgFruitDiameterMm} mm）`:"")+`，已成熟${r.mature}`);
      const range=explicit?f7RangeLabel(ctx):"全部期間";
      return{empty:!rows.length,range,zones:ctx.zones.length?ctx.zones.map(z=>z.yield):[],records:rows.length,
        summary:lines.length?(rows.length>10?`共 ${rows.length} 份履歷，以下是最近更新的 10 份：\n`:"")+lines.join("\n"):"功能表8沒有符合條件的果樹履歷。",data:{records:rows.slice(0,30)}};
    }

    // 功能表1・人員與帳號：只讀姓名、編號、身分、狀態、權限層級；絕不讀出密碼。
    const GH_ROLE_LABELS={A:"設計師",B:"老闆",C:"會計",D:"行銷",E:"現場工程師",F:"品管師",G:"客服",H:"來賓"};
    async function ghV51People(ctx){
      const docs=await f7KvRange("person:");
      const roleWanted=Object.values(GH_ROLE_LABELS).find(r=>ctx.q.includes(r));
      const rows=[];
      for(const d of docs){
        const v=d.value;if(!v||typeof v!=="object")continue;
        const id=String(v.id||String(d.key).replace(/^person:/,"")).toUpperCase();
        const role=v.roleLabel||GH_ROLE_LABELS[v.roleLetter||id.charAt(0)]||"";
        if(roleWanted&&role!==roleWanted)continue;
        rows.push({id,name:v.name||"",role,status:v.status||"",tier:v.tier||""});
      }
      rows.sort((a,b)=>a.id.localeCompare(b.id));
      const active=rows.filter(r=>r.status==="active").length,pending=rows.filter(r=>r.status==="pending").length;
      const lines=[`共 ${rows.length} 位（啟用 ${active}、待設定 ${pending}）`,...rows.slice(0,40).map(r=>`${r.id} ${r.name}・${r.role}・${r.status==="active"?"啟用":r.status==="pending"?"待設定":(r.status||"—")}${r.tier?"・"+r.tier:""}`)];
      return{empty:!rows.length,range:"目前",zones:[],records:rows.length,summary:rows.length?lines.join("\n"):"功能表1沒有符合條件的人員。",data:{people:rows}};
    }


    // ===== Smart Teddy 8.6.0：今日工作總覽（某天某區做了什麼／還有什麼待做）=====
    // 依完全體功能表4的資料：工作1–5 讀各區域格 worklog 的回報（confirmHistory）與指派（assignmentHistory）；
    // 工作6–8 讀分區 zonework 的回報（與表三同一套，含去重）與指派。數字一律由程式讀取，不推算。
    const GH_WORK15_NAME={1:"打芽(側)",2:"打芽(地)",3:"除草",4:"剪葉",5:"覆蓋"};
    const GH_WORK68_NAME={6:"補水",7:"施肥（固態）",8:"其他資材（液態）"};
    function ghIsActivityQuestion(q){
      const t=teddyToTrad(String(q||""));
      const past=/做了|有做|忙了|做過|做啥|做什麼事|做了哪些|完成了什麼|完成哪些|有什麼工作|工作狀況|工作情況|進度如何|有沒有人做/.test(t);
      const day=/今天|昨天|前天|今日|這幾天|本週|這禮拜|這週|上週|上禮拜|\d+\s*\/\s*\d+|\d+\s*月\s*\d+\s*[日號]|[一二三四五六七八九十]+月[一二三四五六七八九十]+[日號]/.test(t);
      const todo=/(?:今天|明天|今日)/.test(t)&&/要做什麼|待做|該做|還沒做|沒做完|還有什麼工作/.test(t);
      return (past&&(day||!!ghFindZone(t)))||todo||ghIsPendingQuestion(t);
    }
    // 7.0.1：「還沒完成／未回報／待回報／已指定還沒做」＝問目前掛著的指派。
    function ghIsPendingQuestion(q){
      return /還沒完成|未完成|沒完成|沒做完|還沒做|未回報|還沒回報|沒回報|待回報|待完成|待處理|還掛著|已指定|已指派|指派了.{0,6}(?:沒|未)|欠.{0,4}(?:工作|回報)/.test(teddyToTrad(String(q||"")));
    }
    function ghStampDay(s){return f7StampDay(s)||"";}
    function ghDaysSince(d){if(!d)return null;const a=new Date(d+"T00:00:00"),b=new Date(f7Today()+"T00:00:00");return Math.round((b-a)/86400000);}
    // 7.0.1：目前掛著（已指定、尚未回報完成）的工作，讀本月與上個月，六區平行讀取。
    async function ghV51Pending(ctx){
      const zones=f7ZoneList(ctx);
      const cur=f7Ym(ctx.cy,ctx.cm),pd=new Date(ctx.cy,ctx.cm-2,1),prev=f7Ym(pd.getFullYear(),pd.getMonth()+1);
      const yms=[prev,cur];
      const per=await f7Pool(zones,6,async z=>{
        const items=[];
        const cells=(await f7KvRange(`worklog:${z.id}:`)).filter(d=>yms.some(ym=>String(d.key).endsWith(`:${ym}`)));
        cells.forEach(d=>{
          const v=d.value||{},parts=String(d.key).split(":"),cell=parts[2]||"",ym=parts[3]||"";
          Object.entries(v.pending||{}).forEach(([id,on])=>{
            id=Number(id);if(!on||id<1||id>5)return;
            const ts=(v.timestamps||{})[id]||{},since=ghStampDay(ts.changedAt);
            const who=(v.recipientIds||[]).map(r=>(v.recipientNames||{})[r]||r).join("、");
            const prog=(v.progress||{})[id];
            items.push({kind:"1-5",id,name:GH_WORK15_NAME[id],cell,ym,since,level:(v.levels||{})[id],who,started:prog!=null&&prog!=="",progress:prog});
          });
        });
        for(const ym of yms){
          const zw=await f7KvGet(`zonework:${z.id}:${ym}`);const zv=(zw&&zw.value)||{};
          Object.entries(zv.pending||{}).forEach(([id,on])=>{
            id=Number(id);if(!on||id<6||id>8)return;
            const since=ghStampDay(((zv.timestamps||{})[id]||{}).changedAt);
            let detail="";
            try{detail=TEDDY_WDS.options(zv,id).map(o=>{const q=TEDDY_WDS.quantity(zv,id,o);return `${o}${q!=null&&q!==""?" "+q+((V6_MAT_META[o]&&V6_MAT_META[o].unit)||"kg"):""}`;}).join("、");}catch(_){}
            items.push({kind:"6-8",id,name:GH_WORK68_NAME[id],ym,since,detail,started:!!((zv.progress||{})[id])});
          });
        }
        items.sort((a,b)=>String(a.since||"").localeCompare(String(b.since||"")));
        return{z,items};
      });
      const lines=[],data={};let total=0;
      (per||[]).forEach(r=>{
        if(!r)return;
        const {z,items}=r;data[z.yield]=items;total+=items.length;
        if(!items.length){if(ctx.zones.length)lines.push(`${z.yield}：目前沒有已指定、尚未回報完成的工作。`);return;}
        const out=items.slice(0,10).map(x=>{
          const d=ghDaysSince(x.since);
          const age=x.since?`${x.since.slice(5)}指定${d!=null?`，已 ${d} 天`:""}`:"";
          if(x.kind==="1-5")return `${x.name}（區域 ${x.cell}${x.level?`，級別 ${x.level}`:""}${x.who?`，給 ${x.who}`:""}${age?`，${age}`:""}${x.started?"，已開始回報但未完成":""}）`;
          return `${x.name}${x.detail?`：${x.detail}`:""}（${age||x.ym}${x.started?"，已開始回報但未完成":""}）`;
        });
        lines.push(`${z.yield}・${items.length} 項待完成\n　${out.join("\n　")}${items.length>10?`\n　…另有 ${items.length-10} 項`:""}`);
      });
      return{empty:!total,range:`${prev}～${cur}`,zones:zones.map(z=>z.yield),records:total,
        summary:lines.length?lines.join("\n"):"本月與上個月都沒有已指定、尚未回報完成的工作。",data};
    }
    async function ghV51Activity(ctx){
      if(ghIsPendingQuestion(ctx.q))return ghV51Pending(ctx);
      const zones=f7ZoneList(ctx);
      let from,to,label;
      const wk=typeof ghWeekRange==="function"?ghWeekRange(ctx.q):null;
      if(ctx.day){from=to=ctx.day;label=ctx.day===ctx.today?"今天":ctx.day===f7ShiftDay(ctx.today,-1)?"昨天":ctx.day;}
      else if(wk){from=wk.from;to=wk.to;label=wk.label;}
      else if(ctx.req.ym){from=`${ctx.req.ym}-01`;to=`${ctx.req.ym}-31`;label=ctx.req.ym;}
      else{from=to=ctx.today;label="今天";}
      const months=f7Months(from.slice(0,7),to.slice(0,7));
      const inRange=d=>d&&d>=from&&d<=to;
      const lines=[],data={};let total=0;
      for(const z of zones){
        const done15=[],asg15=[],pend15=[],asg68=[],pend68=[];
        for(const ym of months){
          const cells=(await f7KvRange(`worklog:${z.id}:`)).filter(d=>String(d.key).endsWith(`:${ym}`));
          for(const d of cells){
            const v=d.value||{},cell=String(d.key).split(":")[2]||"";
            (v.confirmHistory||[]).forEach(h=>{const id=Number(h.itemId);if(id>=1&&id<=5&&inRange(ghStampDay(h.at)))done15.push({id,cell,who:h.personName||h.personId||"",progress:h.progress,day:ghStampDay(h.at)});});
            (v.assignmentHistory||[]).forEach(a=>{if(inRange(ghStampDay(a.assignedAt)))(a.itemIds||[]).map(Number).filter(id=>id<=5).forEach(id=>asg15.push({id,cell}));});
            if(ym===months[months.length-1])Object.entries(v.pending||{}).forEach(([id,p])=>{if(p&&Number(id)<=5)pend15.push({id:Number(id),cell,since:ghStampDay(((v.timestamps||{})[id]||{}).changedAt)});});
          }
          const zw=await f7KvGet(`zonework:${z.id}:${ym}`);const zv=(zw&&zw.value)||{};
          (zv.assignmentHistory||[]).forEach(a=>{if(inRange(ghStampDay(a.assignedAt)))(a.itemIds||[]).map(Number).filter(id=>id>=6).forEach(id=>asg68.push(id));});
          if(ym===months[months.length-1])Object.entries(zv.pending||{}).forEach(([id,p])=>{if(p&&Number(id)>=6)pend68.push({id:Number(id),since:ghStampDay(((zv.timestamps||{})[id]||{}).changedAt)});});
        }
        const used={};
        for(const ym of months)(await f7ZoneworkConfirmed(z.id,ym)).forEach(h=>{if(inRange(h.day))used[h.rowKey]=(used[h.rowKey]||0)+h.qty;});
        const parts=[];
        if(done15.length){
          const by={};done15.forEach(x=>{(by[x.id]||(by[x.id]=[])).push(x);});
          parts.push("回報："+Object.entries(by).map(([id,xs])=>`${GH_WORK15_NAME[id]}（${[...new Set(xs.map(x=>x.cell))].slice(0,4).join("、")}${xs.some(x=>x.who)?"，"+[...new Set(xs.map(x=>x.who).filter(Boolean))].slice(0,3).join("、"):""}${xs.some(x=>x.progress!=null&&x.progress!==""&&Number(x.progress)!==1)?"，有部分進度未完成":""}）`).join("；"));
        }
        const usedTxt=Object.entries(used).map(([k,n])=>`${k} ${f7N(n,2)}${(V6_MAT_META[k]&&V6_MAT_META[k].unit)||""}`).join("、");
        if(usedTxt)parts.push("補水／施肥："+usedTxt);
        const asgTxt=[...new Set(asg15.map(x=>GH_WORK15_NAME[x.id]))].concat([...new Set(asg68)].map(id=>GH_WORK68_NAME[id]));
        if(asgTxt.length)parts.push(`${label}新指派：`+asgTxt.join("、"));
        const pendTxt=[...new Set(pend15.map(x=>`${GH_WORK15_NAME[x.id]}${x.since?`（${x.since.slice(5)}起）`:""}`))].concat(pend68.map(x=>`${GH_WORK68_NAME[x.id]}${x.since?`（${x.since.slice(5)}起）`:""}`));
        if(pendTxt.length)parts.push("目前待完成："+pendTxt.slice(0,6).join("、")+(pendTxt.length>6?` 等 ${pendTxt.length} 項`:""));
        total+=done15.length+Object.keys(used).length+asgTxt.length;
        data[z.yield]={done15,used,assigned:asgTxt,pending:pendTxt};
        if(parts.length)lines.push(`${z.yield}・${label}\n　${parts.join("\n　")}`);
        else if(ctx.zones.length)lines.push(`${z.yield}・${label}沒有工作回報、用量或指派紀錄。`);
      }
      return{empty:!lines.length,range:label,zones:zones.map(z=>z.yield),records:total,
        summary:lines.length?lines.join("\n"):`${label}各區都沒有工作回報、用量或指派紀錄。`,data};
    }

    const GH_V51X={
      photos:{label:"照片",table:"功能表6・照片影像資料庫",reader:ghV51Photos,source:"photoMeta:{分區}:{年月}:*",
        rules:"只回答張數、日期、分區、備註與上傳者；Teddy 看不到照片內容，不可描述畫面。",ready:"想查哪一區、哪個月份的照片？"},
      trees:{label:"果樹",table:"功能表8・果樹履歷",reader:ghV51Trees,source:"treeTableUser:* ／ treeTable:*",
        rules:"節間間距單位 cm、果直徑單位 mm；fruitStatus「有果」才算著果；matureDate 有值才算已成熟。",ready:"想查哪一區、哪個點位或樹齡的履歷？"},
      environment:{label:"環境",table:"功能表9・環境數據",reader:ghV51Environment,source:"environment:{分區}:{年月}",
        rules:"這是溫室內人工記錄（溫度 °C、濕度 %、照度 lux、EC mS/cm、環境異常）；戶外氣候是功能表7表五神岡站，兩者不可混用或相加。",ready:"想查哪一區的溫度、濕度、照度、EC，還是環境異常？"},
      activity:{label:"今日",table:"工作總覽（功能表4＋表三）",reader:ghV51Activity,source:"worklog:{分區}:{區域}:{年月}（工作1–5）＋ zonework:{分區}:{年月}（工作6–8）",
        rules:"這是「某天做了什麼／還有什麼待做」：回報＝已做、新指派＝當天交辦、待完成＝目前尚未回報的指派。用量只算已回報確認。不可把年度計畫當成已做的工作。",ready:"想看哪一區、哪一天做了什麼？"},
      people:{label:"人員",table:"功能表1・人員與帳號",reader:ghV51People,source:"person:{ID}",
        rules:"只談編號、姓名、身分、狀態、權限層級；絕不透露或推測密碼。",ready:"想查哪一種身分或哪位人員？"}
    };

    async function ghV51ExtraAnswer(entry,q){
      const x=GH_V51X[entry];
      const ctx=f7Ctx(q);
      f7ForceFresh=/最新|重新|刷新|更新一下|即時/.test(String(q||""));
      let result;
      try{result=await f7WithTimeout(x.reader(ctx),40000);}
      catch(e){f7ForceFresh=false;return `${x.table}這次沒讀成功（${e.message}）。可以指定分區或月份再問一次。`;}
      f7ForceFresh=false;
      const header=`${x.table}（${result.range}${result.zones&&result.zones.length&&result.zones.length<6?"｜"+result.zones.join("、"):""}）`;
      if(result.empty)return `${header}：${result.summary}`;
      const prompt=`【固定資料路由：${header}】\n使用者問題：${q}\n資料來源：${x.source}\n判讀規則：${x.rules}\n只能根據 payload.v51 回答；數字已由程式依完全體 ${ghV51Version()} 的資料算好，不可重算、不可補猜、不可改看其他功能表。先一句結論，再最多 3 點觀察，最後一行寫「來源：${x.table}」。總長度最多 6 行。`;
      const payload={selectedEntry:{id:entry,label:x.table},v51:{table:x.table,version:ghV51Version(),range:result.range,zones:result.zones||null,records:result.records,summary:result.summary,data:result.data,readAt:new Date().toLocaleString("zh-TW")}};
      try{
        const ai=await f7WithTimeout(ghAskAI(prompt,payload),30000);
        if(ai&&!/^沒有回覆/.test(ai))return ai;
      }catch(e){console.warn(`${x.table} AI 解讀失敗，改用程式摘要`,e);}
      return `${header}\n${result.summary}\n來源：${x.table}`;
    }

    setTimeout(()=>{teddyLoadV51Manifest().catch(()=>{});},0);

    // ===== Smart Teddy 8.6.0：溫室唯一資料閘門 =====
    // 所有溫室問題（語音、溫室輸入框、一般輸入框在溫室模式）都只走這一條：
    // 問句轉繁體 → 固定路由決定入口 → 該入口只讀自己的固定資料位置 → 程式計算 → 回答。
    // 不瀏覽網頁、不掃畫面、不整包掃描資料庫、不交給其他模型自由搜尋。
    const GH_ROUTE_MAP_TEXT=`完全體 V5.1.C132 固定路由：
產能＝功能表3（產能庫：逐日產能與年度封存，品級 A／B／D／NG）
工作1–5（打芽側、打芽地、除草、剪葉、覆蓋）＝功能表4
計畫／產季／節氣＝功能表5
耗材6–8（補水、施肥、其他資材的已確認用量）＝功能表7 表一（全場合計）／表三（分區逐日）
報表＝功能表7「耗材與報表」：年份 → 月份 → 表一～表十
打卡／出勤／請假＝功能表10`;
    function ghIsRouteMapQuestion(q){
      const t=String(q||"").replace(/\s+/g,"");
      return /在哪(?:裡|個)?|怎麼走|路徑|從哪裡|哪個功能表|功能表有哪些|有哪些功能|入口有哪些|要去哪裡看/.test(t)&&!/多少|幾公斤|幾包|幾噸|最高|最低|比較|趨勢|差在哪|差別|不同|意思|怎麼算/.test(t);
    }
    async function ghAskCore(question,preferredEntry=null,forcedEntry=null){
      const q=teddyToTrad(String(question||"")).trim();
      if(!q)return{ok:false,entry:null,answer:"請再說一次想查什麼。"};
      if((window.TEDDY_ENTRY_ID||"owner")==="family")return{ok:false,entry:null,answer:"家人版沒有溫室資料。"};
      if(window.TEDDY_ENTRY_ID==="farm"&&!teddyHandsSession)return{ok:false,entry:"login",answer:"請先按上方「🔐 登入」，用你自己的人員編號登入，我才能幫你查溫室資料。"};
      if(ghIsRouteMapQuestion(q))return{ok:true,entry:"route-map",answer:ghRouteMapText()};
      let entry=(forcedEntry&&GH_ENTRY_META[forcedEntry])?forcedEntry:null;
      const routed=ghRouteV51Question(q,null);
      if(!entry&&routed&&routed.id!=="general")entry=routed.id;
      if(!entry&&preferredEntry&&GH_ENTRY_META[preferredEntry]&&!/天氣好|你好|謝謝|哈囉|早安|午安|晚安|你是誰|心情|累不累|在嗎/.test(q)&&(ghLooksLikeFollowup(q)||/多少|幾|哪|最高|最低|比較|統計|紀錄|合計|平均|總共|有沒有|進度|狀況/.test(q)))entry=preferredEntry;
      if(!entry){
        const st=ghLoadConversationState();
        const hinted=ghRouteV51Question(q,st.topic||null);
        if(hinted&&hinted.id!=="general")entry=hinted.id;
      }
      const chitchat=/天氣好|你好|謝謝|哈囉|早安|午安|晚安|你是誰|心情|累不累|在嗎/.test(q);
      const asksData=!chitchat&&(ghLooksLikeFollowup(q)||/多少|幾|哪|最高|最低|比較|統計|紀錄|合計|平均|總共|有沒有|進度|狀況/.test(q));
      if(!entry&&asksData&&ghSelectedEntry&&GH_ENTRY_META[ghSelectedEntry])entry=ghSelectedEntry;
      if(!entry)return{ok:false,entry:null,answer:"這句我還對不到固定入口。請告訴我要查產能、工作、計畫、耗材、報表、照片、果樹履歷、環境數據、人員，還是打卡。"};
      if(window.TEDDY_ENTRY_ID==="farm")await ghV51RefreshSession();
      const deny=ghV51DenyText(entry,q);
      if(deny)return{ok:false,entry,answer:deny};
      const answer=await ghAnswerSelectedEntry(entry,q);
      return{ok:true,entry,answer};
    }
    window.teddyGreenhouseAsk=teddyGreenhouseAsk;

    // ===== Smart Teddy 8.6.0：問句理解層（AI 解析）＋ 答對答錯學習 =====
    // 分工：AI 只負責「聽懂問句 → 改寫成明確查詢」；數字一律由程式從完全體讀取計算；AI 再把結果講成人話。
    // 學習：記住「這種問法 → 該查哪裡」，不記數字（數字每次重新從完全體讀）。
    // 儲存：Teddy 自己的記憶（本機＋Teddy Firebase），絕不寫進完全體。
    const GH_LEARN_KEY="teddy_gh_learning_v1"+(window.TEDDY_KEY_SUFFIX||"");
    const GH_LEARN_MAX_EXAMPLES=300,GH_LEARN_MAX_LOG=300;
    let ghLearn={examples:[],log:[],updatedAt:0};
    let ghLastTurn=null;
    const GH_ENTRY_IDS=["yield","work","calendar","photos","function7","materials","trees","environment","attendance","people","guide","activity"];

    function ghLearnLoadLocal(){
      try{const v=JSON.parse(localStorage.getItem(GH_LEARN_KEY)||"null");if(v&&Array.isArray(v.examples))ghLearn=v;}catch(_){}
    }
    async function ghLearnLoadCloud(){
      if(typeof teddyEnsureFirebase!=="function"||!teddyEnsureFirebase())return;
      try{
        const doc=await firebase.firestore().collection("teddy_memory").doc(teddyGetMemoryDocId()).get();
        const c=doc.exists?(doc.data()||{}).ghLearning:null;
        if(c&&Array.isArray(c.examples)&&Number(c.updatedAt||0)>Number(ghLearn.updatedAt||0)){
          ghLearn=c;localStorage.setItem(GH_LEARN_KEY,JSON.stringify(ghLearn));
        }
      }catch(e){console.warn("學習紀錄雲端讀取失敗，使用本機：",e.message);}
    }
    async function ghLearnSave(){
      ghLearn.updatedAt=Date.now();
      if(ghLearn.examples.length>GH_LEARN_MAX_EXAMPLES)ghLearn.examples=ghLearn.examples.slice(-GH_LEARN_MAX_EXAMPLES);
      if(ghLearn.log.length>GH_LEARN_MAX_LOG)ghLearn.log=ghLearn.log.slice(-GH_LEARN_MAX_LOG);
      try{localStorage.setItem(GH_LEARN_KEY,JSON.stringify(ghLearn));}catch(_){}
      if(typeof teddyEnsureFirebase!=="function"||!teddyEnsureFirebase())return;
      try{await firebase.firestore().collection("teddy_memory").doc(teddyGetMemoryDocId()).set({ghLearning:ghLearn},{merge:true});}
      catch(e){console.warn("學習紀錄雲端儲存失敗，已保留本機：",e.message);}
    }

    // 問句正規化：去掉稱呼、語助詞、標點，讓同一種問法對得起來。
    function ghNormQ(q){
      return teddyToTrad(String(q||"")).toLowerCase()
        .replace(/teddy|泰迪|松鼠|碰氣|pongchi/g,"")
        .replace(/請問|請|幫我|幫忙|一下|查查|查一下|告訴我|我想知道|想知道/g,"")
        .replace(/[嗎呢啊呀吧喔哦啦耶欸]/g,"")
        .replace(/[\s，,。．.!！?？、：:；;「」『』（）()~～]/g,"");
    }
    function ghIsBareFollowup(q){
      const s=ghNormQ(q);
      return s.length<=6||/^(?:那|那麼|那個|還有|再|以及|跟|和|改成|換成|不是|明明)/.test(s);
    }
    function ghBigrams(s){const out=new Set();for(let i=0;i<s.length-1;i++)out.add(s.slice(i,i+2));return out;}
    function ghSimilar(a,b){
      const A=ghBigrams(a),B=ghBigrams(b);if(!A.size||!B.size)return a===b?1:0;
      let n=0;A.forEach(x=>{if(B.has(x))n++;});return n/(A.size+B.size-n);
    }
    function ghLearnExact(norm){
      const hits=ghLearn.examples.filter(e=>e.q===norm);
      const pos=hits.filter(e=>e.ok).sort((a,b)=>b.at-a.at)[0]||null;
      const neg=hits.filter(e=>!e.ok).sort((a,b)=>b.at-a.at)[0]||null;
      if(pos&&(!neg||pos.at>=neg.at))return{pos,neg:null};
      return{pos:null,neg};
    }
    // 6.6.0：內建 165 題已驗證的問法當作 AI 理解時的參考例子（不存進使用者學習紀錄）。
    const GH_SEED_EXAMPLES=([["四北今天施肥多少", "materials", "四北今天施肥多少"], ["三期今天有澆水嗎", "materials", "三期今天有澆水嗎"], ["二期水有沒有灌", "materials", "二期水有沒有灌"], ["四南肥下了沒", "materials", "四南肥下了沒"], ["一期這個月溝灌幾噸", "materials", "一期這個月溝灌幾噸"], ["五期噴灌多久", "materials", "五期噴灌多久"], ["全場今天用了多少米糠", "materials", "全場今天用了多少米糠"], ["各區金旺用量", "materials", "各區金旺用量"], ["四北昨天補水", "materials", "四北昨天補水"], ["三期前天施肥", "materials", "三期前天施肥"], ["四北9/28施肥", "materials", "四北9/28施肥"], ["四北九月二十八號施肥", "materials", "四北九月二十八號施肥"], ["二期上禮拜補水", "materials", "二期上禮拜補水"], ["三期這禮拜施肥", "materials", "三期這禮拜施肥"], ["哪一區米糠用最多", "materials", "哪一區米糠用最多"], ["四南最近一次施肥是什麼時候", "materials", "四南最近一次施肥是什麼時候"], ["一期硝酸鉀用了多少", "materials", "一期硝酸鉀用了多少"], ["三期其他資材", "materials", "三期其他資材"], ["四北8月施肥哪幾天", "materials", "四北8月施肥哪幾天"], ["今天有哪些區補水", "materials", "今天有哪些區補水"], ["四北產量", "yield", "四北產量"], ["今天收了多少", "yield", "今天收了多少"], ["三期這個月產量", "yield", "三期這個月產量"], ["一期A級多少", "yield", "一期A級多少"], ["NG比例多少", "yield", "NG比例多少"], ["今年產量跟去年比", "yield", "今年產量跟去年比"], ["哪一區產量最高", "yield", "哪一區產量最高"], ["二期上個月收成", "yield", "二期上個月收成"], ["四南B級幾公斤", "yield", "四南B級幾公斤"], ["五期產能", "yield", "五期產能"], ["四南打芽進度", "work", "四南打芽進度"], ["除草誰負責", "work", "除草誰負責"], ["三期剪葉做完了嗎", "work", "三期剪葉做完了嗎"], ["覆蓋還有哪些沒確認", "work", "覆蓋還有哪些沒確認"], ["一期工作進度", "work", "一期工作進度"], ["10月要做什麼", "calendar", "10月要做什麼"], ["三期什麼時候剪枝", "calendar", "三期什麼時候剪枝"], ["四北產季什麼時候", "calendar", "四北產季什麼時候"], ["下個月計畫", "calendar", "下個月計畫"], ["哪些區要度冬", "calendar", "哪些區要度冬"], ["表一", "function7", "表一"], ["耗材匯總", "function7", "表一 耗材匯總"], ["表二年度計畫表", "function7", "表二年度計畫表"], ["表三四北九月", "function7", "表三四北九月"], ["表四留言", "function7", "表四留言"], ["最近有什麼留言", "function7", "表四 最近有什麼留言"], ["表五今天天氣", "function7", "表五今天天氣"], ["神岡站昨天下多少雨", "function7", "表五 神岡站昨天下多少雨"], ["這個月最高溫幾度", "function7", "表五 這個月最高溫幾度"], ["今年雨量", "function7", "表五 今年雨量"], ["表六", "function7", "表六"], ["施肥統計", "function7", "表六 施肥統計"], ["表七", "function7", "表七"], ["產能長期趨勢", "function7", "表七 產能長期趨勢"], ["表八三期", "function7", "表八三期"], ["資材投入跟產能", "function7", "表八 資材投入跟產能"], ["表九", "function7", "表九"], ["氣候跟產能的關係", "function7", "表九 氣候跟產能的關係"], ["表十", "function7", "表十"], ["今天誰登入", "function7", "表十 今天誰登入"], ["表十一三期", "function7", "表十一三期"], ["三期用量側寫", "function7", "表十一 三期用量側寫"], ["表十二米糠", "function7", "表十二米糠"], ["溝灌跨溫室比較", "function7", "表十二 溝灌跨溫室比較"], ["表十三", "function7", "表十三"], ["天氣熱的時候溝灌用多少", "function7", "表十三 天氣熱的時候溝灌用多少"], ["下雨天噴灌有沒有比較少", "function7", "表十三 下雨天噴灌有沒有比較少"], ["表十四", "function7", "表十四"], ["產能資材雨量", "function7", "表十四 產能資材雨量"], ["二期今年產量施肥跟雨量", "function7", "表十四 二期今年產量施肥跟雨量"], ["一期照片", "photos", "一期照片"], ["四南最近的照片", "photos", "四南最近的照片"], ["三期果樹履歷", "trees", "三期果樹履歷"], ["樹齡2年節間多長", "trees", "樹齡2年節間多長"], ["四北有果幾顆", "trees", "四北有果幾顆"], ["四南環境數據", "environment", "四南環境數據"], ["三期溫室溫度", "environment", "三期溫室溫度"], ["二期濕度", "environment", "二期濕度"], ["四北EC", "environment", "四北EC"], ["最近有什麼環境異常", "environment", "最近有什麼環境異常"], ["今天誰請假", "attendance", "今天誰請假"], ["我今天打卡了嗎", "attendance", "我今天打卡了嗎"], ["這個月加班", "attendance", "這個月加班"], ["小明今天有來嗎", "attendance", "小明今天有來嗎"], ["人員名單", "people", "人員名單"], ["誰是品管師", "people", "誰是品管師"], ["有幾位員工", "people", "有幾位員工"], ["表三怎麼算", "guide", "表三怎麼算"], ["用量為什麼跟以前不一樣", "guide", "用量為什麼跟以前不一樣"], ["固態是什麼意思", "guide", "固態是什麼意思"], ["看走勢跟看當期差在哪", "guide", "看走勢跟看當期差在哪"], ["表十誰可以看", "guide", "表十誰可以看"], ["功能表9是什麼", "guide", "功能表9是什麼"], ["加總跟並列有什麼不同", "guide", "加總跟並列有什麼不同"], ["雨量怎麼算", "guide", "雨量怎麼算"], ["刻度為什麼固定", "guide", "刻度為什麼固定"], ["權限怎麼設定", "guide", "權限怎麼設定"], ["表十三是什麼", "guide", "表十三是什麼"], ["重複的回報怎麼處理", "guide", "重複的回報怎麼處理"], ["三期施肥趨勢分析", "function7", "表十一 三期施肥趨勢分析"], ["米糠各區比較", "function7", "表十二 米糠各區比較"], ["溝灌排名", "function7", "表十二 溝灌排名"], ["四北用量組成", "function7", "表十一 四北用量組成"], ["施肥跟產能的關係", "function7", "表八 施肥跟產能的關係"], ["天氣熱施肥量變化", "function7", "表十三 天氣熱施肥量變化"], ["產能施肥雨量關係", "function7", "表十四 產能施肥雨量關係"], ["四北米糠趨勢", "function7", "表十一 四北米糠趨勢"], ["四北施肥", "materials", "四北施肥"], ["今天施肥", "materials", "今天施肥"], ["二期液態肥", "materials", "二期液態肥"], ["三期固態肥這個月", "materials", "三期固態肥這個月"], ["今天三期溝灌多少", "materials", "今天三期溝灌多少"], ["二期這個月米糠用了多少", "materials", "二期這個月米糠用了多少"], ["昨天各區補水", "materials", "昨天各區補水"], ["三期9月產量", "yield", "三期9月產量"], ["今年A級比例", "yield", "今年A級比例"], ["一期產能跟去年比", "yield", "一期產能跟去年比"], ["除草指派給誰", "work", "除草指派給誰"], ["10月計畫", "calendar", "10月計畫"], ["耗材匯總表", "function7", "表一 耗材匯總表"], ["表三 四北 9月", "function7", "表三 四北 9月"], ["表五 今天", "function7", "表五 今天"], ["神岡站昨天雨量", "function7", "表五 神岡站昨天雨量"], ["表六施肥統計", "function7", "表六施肥統計"], ["長週期產能趨勢", "function7", "表七 長週期產能趨勢"], ["氣候變遷跟產能", "function7", "表九 氣候變遷跟產能"], ["誰登入過", "function7", "表十 誰登入過"], ["表十一 三期", "function7", "表十一 三期"], ["表十二 米糠 各溫室比較", "function7", "表十二 米糠 各溫室比較"], ["高溫的時候溝灌用多少", "function7", "表十三 高溫的時候溝灌用多少"], ["下雨天補水比較少嗎", "function7", "表十三 下雨天補水比較少嗎"], ["溫度分級統計", "function7", "表十三 溫度分級統計"], ["今年產能跟施肥還有雨量的關係", "function7", "表十四 今年產能跟施肥還有雨量的關係"], ["四南9月照片", "photos", "四南9月照片"], ["一期果樹履歷", "trees", "一期果樹履歷"], ["樹齡2年的節間", "trees", "樹齡2年的節間"], ["三期EC多少", "environment", "三期EC多少"], ["四北溫度", "environment", "四北溫度"], ["用量怎麼計算", "guide", "用量怎麼計算"], ["看走勢跟看當期有什麼不同", "guide", "看走勢跟看當期有什麼不同"], ["為什麼數字會重複", "guide", "為什麼數字會重複"], ["三期施肥", "materials", "三期施肥"], ["全場溝灌", "materials", "全場溝灌"], ["四北上個月施肥哪幾天", "materials", "四北上個月施肥哪幾天"], ["三期最近一次補水", "materials", "三期最近一次補水"], ["各區其他資材", "materials", "各區其他資材"], ["二期硝酸鉀", "materials", "二期硝酸鉀"], ["表4 留言", "function7", "表4 留言"], ["表2", "function7", "表2"], ["三期每天用了哪些資材", "function7", "表三 三期每天用了哪些資材"], ["表12 溝灌", "function7", "表12 溝灌"], ["表14 二期 今年", "function7", "表14 二期 今年"], ["表13 四北 9月", "function7", "表13 四北 9月"], ["五期照片", "photos", "五期照片"], ["三期環境異常", "environment", "三期環境異常"], ["四南照度", "environment", "四南照度"], ["一期點位3履歷", "trees", "一期點位3履歷"], ["加總跟並列差在哪", "guide", "加總跟並列差在哪"], ["刻度怎麼算", "guide", "刻度怎麼算"], ["液態是什麼", "guide", "液態是什麼"], ["四北產能多少", "yield", "四北產能多少"], ["品級NG多少", "yield", "品級NG多少"], ["覆蓋完成了嗎", "work", "覆蓋完成了嗎"], ["產季什麼時候開始", "calendar", "產季什麼時候開始"], ["請假", "attendance", "請假"]]).map(([raw,entry,canonical])=>({q:ghNormQ(raw),raw,entry,canonical,ok:true,seed:true,at:0}));
    function ghLearnSimilar(norm,limit=8){
      return [...ghLearn.examples,...GH_SEED_EXAMPLES].map(e=>({e,s:ghSimilar(norm,e.q)})).filter(x=>x.s>=0.35)
        .sort((a,b)=>b.s-a.s).slice(0,limit).map(x=>x.e);
    }
    function ghLearnRemember(turn,ok,correction=""){
      const lg0=[...ghLearn.log].reverse().find(l=>l.at===turn.at);
      if(lg0)lg0.feedback=ok?"對":"錯";
      if(!turn||!turn.entry||!GH_ENTRY_IDS.includes(turn.entry)){ghLearnSave();return false;}
      // 接續上一句的追問（例如「那三期呢」）離開上下文就沒有意義，不單獨記成問法。
      if(ghIsBareFollowup(turn.raw)&&turn.canonical===turn.raw){ghLearnSave();return false;}
      const norm=ghNormQ(turn.raw);
      ghLearn.examples=ghLearn.examples.filter(e=>!(e.q===norm&&e.ok===ok&&e.canonical===turn.canonical));
      ghLearn.examples.push({q:norm,raw:turn.raw,entry:turn.entry,canonical:turn.canonical,ok,correction:String(correction||"").slice(0,120),at:Date.now()});
      ghLearnSave();
      return true;
    }

    // ---- AI 問句解析：輸出結構化查詢，不回答數字 ----
    function ghParserSystem(similar,hint){
      const tb=F7_TABLES?Object.entries(F7_TABLES).map(([n,x])=>`表${x.no}${x.name}（${x.desc}）`).join("；"):"";
      const d=new Date();
      const pos=similar.filter(e=>e.ok).slice(0,6).map(e=>`- 問：「${e.raw}」→ entry=${e.entry}，canonical=「${e.canonical}」`).join("\n");
      const neg=similar.filter(e=>!e.ok).slice(0,4).map(e=>`- 問：「${e.raw}」曾被誤判為 entry=${e.entry}「${e.canonical}」，使用者更正：${e.correction||"（未說明）"}`).join("\n");
      return `你是完全體 ${ghV51Version()} 的問句解析器。你不回答問題、不產生任何數字，只把使用者的話改寫成明確查詢。
只輸出一個 JSON 物件，不要任何其他文字：{"entry":"...","canonical":"...","confidence":0.0,"clarify":""}

entry 只能是：
yield＝功能表3 產能／產量／收成／品級A B D NG（逐日或歷年）
work＝功能表4 工作1–5（打芽側、打芽地、除草、剪葉、覆蓋）的指派、確認、進度
calendar＝功能表5 年度計畫、產季、節氣、計畫開始日
photos＝功能表6 照片
function7＝功能表7 報表，共十四張表：${tb}
materials＝工作6–8（補水、施肥、其他資材）單一分區當日／當月已確認用量的快速問答
trees＝功能表8 果樹履歷（節間、樹齡、果徑、著果、成熟）
environment＝功能表9 溫室內環境數據（溫度、濕度、照度、EC、環境異常）；戶外天氣氣候屬於 function7 表五
attendance＝功能表10 打卡、上下班、請假、加班
people＝功能表1 人員名單、身分、權限層級
guide＝問完全體「怎麼用、怎麼算、是什麼、差別、權限規則」這類說明問題（不查數字）
activity＝某天某區「做了什麼、有沒有做、還有什麼待做」（工作1–5 回報與指派＋工作6–8 用量）；不是年度計畫
unknown＝無法判斷

canonical 規則：
- 改寫成一句明確的繁體中文查詢，保留使用者真正要問的內容。
- 保留相對時間詞原字（今天、昨天、本月、這個月、上個月、今年、去年），不要換算成日期；明確的年月日照寫。
- 分區只用：一期、二期、三期、四北、四南、五期，或「全場」。
- 細項只用：溝灌、噴灌、米糠、金旺、黃豆、水果、硝酸鉀、磷酸一鉀、硫酸鉀、鈣鎂粉、微量元素。
- entry=function7 時 canonical 必須以「表」＋中文數字開頭，例如「表十二 米糠 各溫室比較 今年」。
- 判斷不了就 entry=unknown，clarify 寫一句要反問使用者的短句。
今天是 ${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}。
${pos?"\n已確認正確的例子（優先參考）：\n"+pos:""}${neg?"\n曾經答錯、要避免的例子：\n"+neg:""}${hint?"\n本次更正：前一次判為 entry="+hint.wrongEntry+"「"+hint.wrongCanonical+"」是錯的；使用者說："+hint.correction:""}`;
    }
    function ghParseJson(text){
      const s=String(text||"").replace(/```json|```/g,"").trim();
      const a=s.indexOf("{"),b=s.lastIndexOf("}");if(a<0||b<a)return null;
      try{return JSON.parse(s.slice(a,b+1));}catch(_){return null;}
    }
    async function ghParserCall(system,user){
      const keys=loadKeys();
      if(keys.google){
        const r=await teddyFetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${keys.google}`,{
          method:"POST",headers:{"Content-Type":"application/json"},
          body:JSON.stringify({system_instruction:{parts:[{text:system}]},contents:[{role:"user",parts:[{text:user}]}],generationConfig:{responseMimeType:"application/json",temperature:0}})
        },15000);
        const d=await r.json();if(!r.ok)throw new Error(d?.error?.message||`Gemini HTTP ${r.status}`);
        return(d.candidates?.[0]?.content?.parts||[]).map(x=>x.text||"").join("");
      }
      if(keys.anthropic){
        const r=await teddyFetch("https://api.anthropic.com/v1/messages",{
          method:"POST",headers:{"Content-Type":"application/json","x-api-key":keys.anthropic,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},
          body:JSON.stringify({model:"claude-haiku-5-5",max_tokens:300,system,messages:[{role:"user",content:user}]})
        },15000);
        const d=await r.json();if(!r.ok)throw new Error(d?.error?.message||`Claude HTTP ${r.status}`);
        return(d.content||[]).filter(x=>x.type==="text").map(x=>x.text).join("");
      }
      if(keys.xai){
        const r=await teddyFetch("https://api.x.ai/v1/chat/completions",{
          method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${keys.xai}`},
          body:JSON.stringify({model:"grok-4.6",messages:[{role:"system",content:system},{role:"user",content:user}],max_tokens:300,temperature:0})
        },15000);
        const d=await r.json();if(!r.ok)throw new Error(d?.error?.message||`Grok HTTP ${r.status}`);
        return d.choices?.[0]?.message?.content||"";
      }
      if(keys.openai){
        const r=await teddyFetch("https://api.openai.com/v1/responses",{
          method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${keys.openai}`},
          body:JSON.stringify({model:"gpt-6.1-sol",reasoning:{effort:"low"},input:[{role:"developer",content:[{type:"input_text",text:system}]},{role:"user",content:[{type:"input_text",text:user}]}]})
        },30000);
        const d=await r.json();if(!r.ok)throw new Error(d?.error?.message||`Astra HTTP ${r.status}`);
        return (d.output_text||((d.output||[]).flatMap(x=>x.content||[]).filter(x=>x.type==="output_text").map(x=>x.text||"").join("")))||"";
      }
      throw new Error("沒有可用的 AI Key");
    }
    async function ghAIParse(raw,hint=null){
      const similar=ghLearnSimilar(ghNormQ(raw));
      const text=await ghParserCall(ghParserSystem(similar,hint),`使用者原句：${raw}`);
      const p=ghParseJson(text);
      if(!p)return null;
      const entry=GH_ENTRY_IDS.includes(p.entry)?p.entry:"unknown";
      return{entry,canonical:teddyToTrad(String(p.canonical||raw)).trim()||raw,confidence:Number(p.confidence)||0,clarify:String(p.clarify||"").trim()};
    }

    // ---- 回饋指令：答對／答錯／應該是… ----
    function ghFeedbackKind(t){
      const s=String(t||"").trim().replace(/[。！!～~]+$/,"");
      if(/^(?:答對了?|對了?|對的|正確|沒錯|就是這個|答得好|很好|這次對了)$/.test(s))return{kind:"ok"};
      let m=s.match(/^(?:答錯了?|錯了|不對|不是這個|不正確)[，,。：:\s]*(.*)$/);
      if(m)return{kind:"wrong",correction:m[1]||""};
      m=s.match(/^(?:應該(?:是|看|查|要看|要查)|我是問|我是要問|我要的是|要看的是)(.+)$/);
      if(m)return{kind:"wrong",correction:s};
      return null;
    }
    async function ghHandleFeedback(fb){
      const turn=ghLastTurn;
      if(!turn||Date.now()-turn.at>30*60*1000)return{ok:false,entry:null,answer:"我找不到剛才那一題，請直接再問一次。"};
      if(fb.kind==="ok"){
        const saved=ghLearnRemember(turn,true);
        return{ok:true,entry:turn.entry,answer:saved?"好，我記住了：這種問法以後就查這裡。":"好，這題答對。這句是接續上一句的追問，不單獨記成問法。"};
      }
      ghLearnRemember(turn,false,fb.correction);
      if(!fb.correction)return{ok:true,entry:turn.entry,answer:"收到，這題我記為答錯。哪裡不對？例如「應該看表三」或「我是問三期」，我會重新查。"};
      let p=null;
      try{p=await ghAIParse(turn.raw,{wrongEntry:turn.entry,wrongCanonical:turn.canonical,correction:fb.correction});}
      catch(e){return{ok:false,entry:turn.entry,answer:`已記下答錯，但重新理解時失敗（${e.message}）。請換個說法再問一次。`};}
      if(!p||p.entry==="unknown")return{ok:false,entry:turn.entry,answer:p&&p.clarify?p.clarify:"已記下答錯，但我還是對不到正確入口。請直接說要看哪個功能表或哪張表。"};
      const res=await ghAskCore(p.canonical,null,p.entry);
      ghLastTurn={at:Date.now(),raw:turn.raw,canonical:p.canonical,entry:res.entry||p.entry,source:"ai-corrected",answer:res.answer};
      ghLearnLogTurn(ghLastTurn,res);
      return{ok:res.ok,entry:res.entry,answer:`重新查了一次：\n${res.answer}\n（這次對的話說「答對了」，我就記住。）`};
    }
    function ghLearnLogTurn(turn,res){
      ghLearn.log.push({at:turn.at,q:turn.raw,entry:turn.entry||null,canonical:turn.canonical,source:turn.source,result:res&&res.ok?"答":"未答",feedback:null});
      ghLearnSave();
    }

    // ---- 學習狀況報告 ----
    function ghIsLearnReportQuestion(t){return /^(?:學習(?:紀錄|狀況|成績|報告)|你學到什麼|答對率|答錯的題目)/.test(String(t||"").trim());}
    function ghLearnReport(){
      const log=ghLearn.log,ex=ghLearn.examples;
      const bySrc={};log.forEach(l=>bySrc[l.source]=(bySrc[l.source]||0)+1);
      const ok=log.filter(l=>l.feedback==="對").length,bad=log.filter(l=>l.feedback==="錯").length;
      const miss=log.filter(l=>l.result!=="答").slice(-5).map(l=>`「${l.q}」`);
      const wrong=ex.filter(e=>!e.ok&&!ex.some(x=>x.ok&&x.q===e.q&&x.at>=e.at)).slice(-5).map(e=>`「${e.raw}」${e.correction?"→ "+e.correction:""}`);
      const names={rule:"內建規則",learned:"已學會",ai:"AI 理解","ai-corrected":"更正後重查"};
      return [`最近 ${log.length} 題：`+Object.entries(bySrc).map(([k,n])=>`${names[k]||k}${n}`).join("、"),
        `你標記答對 ${ok}、答錯 ${bad}；已學會的問法 ${ex.filter(e=>e.ok).length} 種。`,
        miss.length?`沒答出來：${miss.join("、")}`:"",
        wrong.length?`答錯待改進：${wrong.join("、")}`:""].filter(Boolean).join("\n");
    }

    // ---- 新的溫室入口：已學會 → 內建規則 → AI 理解 → 程式計算 ----
    // 7.0.1：查詢中在對話框顯示「查詢中…」，看得出不是當機；整體 35 秒時限，超過就先回報，背景查完再補上。
    function ghShowWorking(on,text){
      const box=document.getElementById("greenhouseLog");if(!box)return;
      let el=document.getElementById("ghWorkingLine");
      if(!on){if(el)el.remove();return;}
      if(!el){el=document.createElement("div");el.id="ghWorkingLine";el.style.cssText="margin:0 0 9px;color:#e8c879;font-size:13px;";box.appendChild(el);}
      el.textContent=text||"TEDDY：查詢中…";box.scrollTop=box.scrollHeight;
    }
    async function teddyGreenhouseAsk(question,preferredEntry=null){
      const t0=Date.now();let ticker=null;
      ghShowWorking(true,"TEDDY：查詢中…");
      ticker=setInterval(()=>ghShowWorking(true,`TEDDY：查詢中…（${Math.round((Date.now()-t0)/1000)} 秒）`),1000);
      const job=teddyGreenhouseAskInner(question,preferredEntry);
      try{
        const timeout=new Promise(r=>setTimeout(()=>r(null),35000));
        const res=await Promise.race([job,timeout]);
        if(res){if(res.answer)res.answer=ghStripMd(res.answer);return res;}
        job.then(late=>{if(late&&late.answer&&typeof ghLog==="function")ghLog("assistant","（剛才那題查好了）"+late.answer);}).catch(()=>{});
        return{ok:false,entry:null,answer:"這題資料比較多，超過 35 秒還沒查完。我繼續在背景查，查好會補在對話框；也可以縮小範圍，例如指定溫室或月份。"};
      }finally{clearInterval(ticker);ghShowWorking(false);}
    }
    async function teddyGreenhouseAskInner(question,preferredEntry=null){
      const raw=ghFixAsr(teddyToTrad(String(question||"")).trim());
      if(!raw)return{ok:false,entry:null,answer:"請再說一次想查什麼。"};
      if((window.TEDDY_ENTRY_ID||"owner")==="family")return{ok:false,entry:null,answer:"家人版沒有溫室資料。"};
      if(window.TEDDY_ENTRY_ID==="farm"&&!teddyHandsSession)return{ok:false,entry:"login",answer:"請先按上方「🔐 登入」，用你自己的人員編號登入，我才能幫你查溫室資料。"};
      if(/^(?:登出|取消授權|解除授權)$/.test(raw)){teddyOwnerSessionClear();return{ok:true,entry:null,answer:"已取消這台裝置的授權。之後要寫入時，請再驗證一次 A01。"};}
      const fb=ghFeedbackKind(raw);
      if(fb&&ghLastTurn)return await ghHandleFeedback(fb);
      if(ghIsLearnReportQuestion(raw))return{ok:true,entry:"learn",answer:ghLearnReport()};

      let q=raw,source="rule",forced=null;
      const norm=ghNormQ(raw);
      const {pos,neg}=ghLearnExact(norm);
      if(pos){q=pos.canonical;forced=pos.entry;source="learned";}
      else{
        const routed=ghRouteV51Question(raw,null);
        const ruleHit=!neg&&routed&&routed.id!=="general";
        const chitchat=/^(?:謝謝|哈囉|你好|早安|午安|晚安|你是誰|在嗎)/.test(raw);
        const hasContext=!!preferredEntry||!!(ghLastTurn&&Date.now()-ghLastTurn.at<10*60*1000);
        if(!ruleHit&&!chitchat&&!ghIsRouteMapQuestion(raw)&&(neg||!(ghLooksLikeFollowup(raw)&&hasContext))){
          try{
            const p=await ghAIParse(raw,neg?{wrongEntry:neg.entry,wrongCanonical:neg.canonical,correction:neg.correction}:null);
            if(p&&p.entry!=="unknown"){q=p.canonical;forced=p.entry;source="ai";}
            else if(p&&p.clarify&&!preferredEntry){
              ghLearnLogTurn({at:Date.now(),raw,canonical:raw,entry:null,source:"ai"},{ok:false});
              return{ok:false,entry:null,answer:p.clarify};
            }
          }catch(e){console.warn("AI 問句解析失敗，改用內建規則",e.message);}
        }
      }
      let res=await ghAskCore(q,preferredEntry,forced);
      // 內建規則對不到入口（例如語音辨識把「四北施肥」聽成怪字）時，再請 AI 理解一次。
      if(!res.entry&&source==="rule"){
        try{
          const p=await ghAIParse(raw);
          if(p&&p.entry!=="unknown"){q=p.canonical;forced=p.entry;source="ai";res=await ghAskCore(q,preferredEntry,forced);}
          else if(p&&p.clarify)res={ok:false,entry:null,answer:p.clarify};
        }catch(e){console.warn("AI 問句解析失敗",e.message);}
      }
      ghLastTurn={at:Date.now(),raw,canonical:q,entry:res.entry,source,answer:res.answer};
      ghLearnLogTurn(ghLastTurn,res);
      return res;
    }
    window.teddyGreenhouseAsk=teddyGreenhouseAsk;
    // 6.9.0：語音辨識常見的錯字（四旗北、市北、四期北…）先修正，再走同一套查詢。
    function ghFixAsr(s){
      return String(s||"").replace(/\s+/g,"")
        .replace(/(?:四[旗齊其期騎棋平瓶屏憑評]北|[市是事試]北|似北|四之北|四的北)/g,"四北").replace(/(?:四[旗齊其期騎棋平瓶屏憑評]南|[市是事試]南|四之南|四的南)/g,"四南")
        .replace(/(?:一[旗齊其騎棋])(?=溫室|的|施|澆|補|今|昨|這|做)/g,"一期").replace(/(?:二[旗齊其騎棋])(?=溫室|的|施|澆|補|今|昨|這|做)/g,"二期")
        .replace(/(?:三[旗齊其騎棋])(?=溫室|的|施|澆|補|今|昨|這|做)/g,"三期").replace(/(?:五[旗齊其騎棋])(?=溫室|的|施|澆|補|今|昨|這|做)/g,"五期")
        .replace(/司法|師法|施法/g,"施肥").replace(/交水|焦水/g,"澆水");
    }
    window.teddyGhLocalRoute=function(q){try{const r=ghRouteV51Question(ghFixAsr(teddyToTrad(String(q||""))),null);return r&&r.id!=="general"?r.id:null;}catch(_){return null;}};
    window.ghFeedbackButton=async function(ok){
      const res=await teddyGreenhouseAsk(ok?"答對了":"答錯了",ghSelectedEntry);
      ghLog("assistant",res.answer);
      try{await ghSpeak(res.answer);}catch(_){}
    };

    ghLearnLoadLocal();
    setTimeout(()=>{ghLearnLoadCloud().catch(()=>{});},0);


    function ghRouteV51Question(q,topicHint=null){
      const t=String(q||"");
      // 5.7：功能表7「耗材與報表」十表先依語意鎖定（對齊完全體 V5.1.C132），避免「登入IP」被誤導到功能表10打卡。
      if(ghIsGuideQuestion(t))return {id:"guide",label:"完全體說明"};
      if(ghIsFunction7Question(t))return {id:"function7",label:`功能表7・表${ghFunction7Table(t)||"?"}`};
      if(ghIsActivityQuestion(t))return {id:"activity",label:"工作總覽"};
      // 6.0.0：功能表8／6／9（完全體 C113）
      if(ghIsTreesQuestion(t))return {id:"trees",label:"功能表8・果樹履歷"};
      if(ghIsPhotosQuestion(t))return {id:"photos",label:"功能表6・照片影像資料庫"};
      if(ghIsEnvironmentQuestion(t))return {id:"environment",label:"功能表9・環境數據"};
      // 其他固定入口優先順序：產能 → 打卡 → 耗材6-8 → 計畫 → 工作1-5。
      // 先看本句明確關鍵字；只有本句沒有入口訊號時，才承接上一輪 topic。
      if(ghIsYieldQuestion(t))return {id:"yield",label:"功能表3・產能"};
      if(ghIsAttendanceQuestion(t))return {id:"attendance",label:"功能表10・打卡"};
      if(ghIsPeopleQuestion(t))return {id:"people",label:"功能表1・人員與帳號"};
      if(ghIsMaterialsQuestion(t))return {id:"materials",label:"功能表7・內層表3"};
      if(ghIsCalendarQuestion(t))return {id:"calendar",label:"功能表5・計畫"};
      if(ghIsWorkQuestion(t))return {id:"work",label:"功能表4・工作1-5"};

      if(topicHint==="function7")return {id:"function7",label:"功能表7"};
      if(topicHint==="yield")return {id:"yield",label:"功能表3・產能"};
      if(topicHint==="attendance")return {id:"attendance",label:"功能表10・打卡"};
      if(topicHint==="materials")return {id:"materials",label:"功能表7・內層表3"};
      if(topicHint==="calendar")return {id:"calendar",label:"功能表5・計畫"};
      if(topicHint==="work")return {id:"work",label:"功能表4・工作1-5"};
      if(topicHint&&GH_V51X[topicHint])return {id:topicHint,label:GH_V51X[topicHint].table};
      return {id:"general",label:"V5.1"};
    }

    function ghExplicitTopic(q){
      const t=String(q||"").replace(/\s+/g,"");
      const addressed=/teddy|泰迪|松鼠|pongchi/i.test(t);
      if(!addressed)return null;
      if(ghIsFunction7Question(t))return "function7";
      if(/產能|產量|收成|採收|品質/.test(t))return "yield";
      if(/打卡|出勤|上下班|工時|請假/.test(t))return "attendance";
      // 耗材（工作表七・分區耗材統計）跟工作1-5是分開的入口，即使背後都讀 zonework，
      // 也要分開判斷，狀態列跟直接回答函式才會對得上你實際點進去的畫面。
      if(/耗材|補水|施肥|資材|溝灌|噴灌|米糠|金旺/.test(t) || ghIsMaterialsQuestion(t))return "materials";
      if(ghIsCalendarQuestion(t))return "calendar";
      if(/工作|工項|指派|除草|打芽|剪葉/.test(t))return "work";
      return null;
    }

    function ghTopicAckOnly(q){
      const t=String(q||"").replace(/\s+/g,"");
      return /^(?:teddy|泰迪|松鼠|pongchi)?(?:我們|今天|現在|先|來)*(?:談|聊|看|處理)(?:一下)?(?:產能|產量|收成|採收|品質|工作|工項|打卡|出勤|耗材|資材|行事曆|年度計畫|節氣)(?:吧|好了|好嗎)?[。！!？?]*$/i.test(t);
    }

    function ghLooksLikeFollowup(q){
      const t=String(q||"").trim();
      if(!t)return false;
      if(/^(那|那麼|那個|那今年|那去年|那上個月|那這個月|那四北|那四南|那一期|那二期|那三期|那五期|不是|明明|明明有|有啊|不是有|應該有|我記得|改成|換成|再看|再查|還有|以及|跟|和|平均|最高|最低|最多|最少|A級|B級|D級|NG)/.test(t))return true;
      if(t.length<=14 && /今年|去年|前年|本月|這個月|上個月|今天|昨天|四北|四南|一期|二期|三期|五期|A級|B級|D級|NG|平均|最高|最低|最多|最少|哪天|哪日|哪幾天|什麼時候|何時|幾號|哪個人|誰/.test(t))return true;
      // 極短問句（≤6字，通常是單一疑問詞：哪天/多少/為什麼…）本身沒有任何主題線索，
      // 幾乎一定是承接上一句在追問細節，不該被當成全新話題洗掉主題狀態。
      if(t.length<=6 && /^(哪|誰|何|多少|為何|為什麼|怎麼|幾)/.test(t))return true;
      return false;
    }

    function ghMergeFollowup(prev,q,topic){
      if(!prev)return q;
      const t=String(q||"").trim();
      if(!ghLooksLikeFollowup(t))return q;

      // 將上一輪自然語句當作語意背景，再用本輪修正條件。
      // 明確的新時間會覆蓋舊時間；其餘主詞/項目/分析動作沿用。
      let base=String(prev);
      const hasNewTime=/今天|昨天|本週|這週|本月|這個月|上個月|今年|去年|前年|20\d{2}年|\d{1,2}月/.test(t);
      if(hasNewTime){
        base=base
          .replace(/今天|昨天|本週|這週|本月|這個月|上個月|今年|去年|前年/g,"")
          .replace(/20\d{2}\s*年(?:\s*\d{1,2}\s*月)?/g,"")
          .replace(/(?:^|[^0-9])(?:1[0-2]|[1-9])\s*月/g," ");
      }
      const hasNewZone=/四北|四南|一期|二期|三期|五期/.test(t);
      if(hasNewZone)base=base.replace(/四北(?:溫室)?|四南(?:溫室)?|一期(?:溫室)?|二期(?:溫室)?|三期(?:溫室)?|五期(?:溫室)?/g,"");
      const hasNewGrade=/A級|B級|D級|NG/.test(t);
      if(hasNewGrade)base=base.replace(/A級|B級|D級|NG/g,"");
      return `${base.trim()} ${t}`.trim();
    }

    function ghResolveConversation(q){
      const state=ghLoadConversationState();
      const structured=ghLoadStructuredState();
      const explicit=ghExplicitTopic(q);
      let topic=explicit||structured.topic||state.topic;

      // 沒有明確「Teddy，我們談…」時，完整的新問題仍可自然切換主題。
      if(!explicit && !ghLooksLikeFollowup(q)){
        if(ghIsYieldQuestion(q))topic="yield";
        else if(ghIsAttendanceQuestion(q))topic="attendance";
        else if(ghIsMaterialsQuestion(q))topic="materials";
        else if(ghIsCalendarQuestion(q))topic="calendar";
        else if(ghIsWorkQuestion(q))topic="work";
        // 三個模組都對不上、又不是延續上一句的追問，就是全新話題（包含單純聊天），
        // 不該沿用舊主題——這就是之前「hi teddy」被硬套進產能查詢的根本原因。
        else topic=null;
      }

      const prev=structured.lastEffective||(state.ctx&&state.ctx[topic])||"";
      const followup=ghLooksLikeFollowup(q);
      const slots=ghExtractStateSlots(q,followup?structured.slots:{});
      const inherited=followup?ghStructuredContextText(slots):"";
      const effective=followup&&inherited?`${inherited} ${q}`.trim():ghMergeFollowup(prev,q,topic);
      const ctx={...(state.ctx||{})};
      if(topic && !ghTopicAckOnly(q))ctx[topic]=effective;
      ghSaveConversationState(topic,ctx);
      ghSaveStructuredState({topic,slots,lastEffective:effective,updatedAt:Date.now()});
      return {topic,effective,slots,topicOnly:!!explicit&&ghTopicAckOnly(q)};
    }

    // 純粹打招呼／閒聊，不含任何模組關鍵字時，不該被舊主題「黏住」硬套進產能/工作/打卡。
    function ghIsGreetingOnly(q){
      const t=String(q||"").trim();
      if(!t)return false;
      const bare=/^(?:hi|hello|hey|yo|嗨|哈囉|哈囉囉|你好|您好|安安|早安|午安|晚安|在嗎|在不在|teddy|泰迪|松鼠|pongchi)[\s!！~～。.,，]*$/i;
      const withName=/^(?:hi|hello|hey|嗨|哈囉|你好|您好|安安)\s*(?:teddy|泰迪|松鼠|pongchi)[\s!！~～。.,，]*$/i;
      return bare.test(t) || withName.test(t);
    }


    // ===== Greenhouse 5-button architecture =====
    // Step 1 Read -> Step 2 Understand -> Step 3 Organize -> Step 4 Answer.
    // The selected button is the only data domain allowed for the current question.
    const GH_ENTRY_META={
      function7:{label:"報表",table:"功能表7・十表路由",categories:["zonework","zonenotice","report","other"]},
      yield:{label:"產能",table:"功能表3",categories:["yield","yield_archive"]},
      work:{label:"工作",table:"功能表4・工作1-5",categories:["worklog"]},
      calendar:{label:"計畫",table:"功能表5",categories:["calendar"]},
      materials:{label:"施肥",table:"功能表7・內層表3・6-8",categories:["zonework"]},
      attendance:{label:"打卡",table:"功能表10",categories:["attendance","attendance_pref","leave_types","person"]},
      photos:{label:"照片",table:"功能表6・照片影像資料庫",categories:["photo"]},
      trees:{label:"果樹",table:"功能表8・果樹履歷",categories:["tree"]},
      environment:{label:"環境",table:"功能表9・環境數據",categories:["environment"]},
      people:{label:"人員",table:"功能表1・人員與帳號",categories:["person"]},
      guide:{label:"說明",table:"完全體說明",categories:[]},
      activity:{label:"今日",table:"工作總覽（功能表4＋表三）",categories:[]}
    };
    let ghSelectedEntry=null;
    let ghEntrySelectToken=0;
    let ghEntryCache={};

    function ghSetEntryButtonState(entry){
      document.querySelectorAll('.gh-entry-btn').forEach(btn=>{
        const on=btn.dataset.entry===entry;
        btn.style.background=on?'#21483d':'#18231f';
        btn.style.borderColor=on?'#5eead4':'#355248';
        btn.style.color=on?'#eafff8':'#cde6dc';
        btn.style.boxShadow=on?'0 0 0 1px rgba(94,234,212,.25)':'none';
      });
    }

    async function ghLoadAllYieldRows(){
      const s=await ghYieldStorage();
      // 進入「產能」時主動把 fbrfA_data 的即時資料 + 年度封存都讀進本次資料池。
      // 這裡只讀，不寫入 Firebase；之後的問題先從這個資料池篩選與計算。
      const keys=[
        ...await s.list("yieldArchive:").catch(()=>[]),
        ...await s.list("yield:").catch(()=>[])
      ];
      const uniq=[...new Set(keys)];
      const rows=[];
      // 分批讀取，避免手機一次併發太高。
      for(let i=0;i<uniq.length;i+=12){
        const batch=uniq.slice(i,i+12);
        const got=await Promise.all(batch.map(async key=>{
          const r=await s.get(key).catch(()=>null);
          return r?ghNormalizeYieldRecord({key,data:r.value,updatedAt:r.updatedAt}):null;
        }));
        rows.push(...got.filter(Boolean));
      }
      return rows;
    }

    function ghFilterYieldCache(rows,q){
      const requestedZones=ghFindZones(q);
      const zoneIds=new Set(requestedZones.map(z=>z.id));
      const periods=ghYieldMonthsForQuestion(q);
      const ymSet=new Set(periods.map(p=>`${p.year}-${String(p.month).padStart(2,"0")}`));
      const out=[];
      for(const row of rows||[]){
        if(zoneIds.size && !zoneIds.has(row.zone?.id))continue;
        if(row.category==="yield_archive"){
          const raw=row.rawData&&typeof row.rawData==="object"?row.rawData:{};
          const cropped={};
          Object.keys(raw).forEach(d=>{ if(ymSet.has(String(d).slice(0,7)))cropped[d]=raw[d]; });
          if(Object.keys(cropped).length)out.push({...row,rawData:cropped});
        }else{
          const ym=String(row.period||"").slice(0,7);
          if(ymSet.has(ym))out.push(row);
        }
      }
      return out;
    }


    async function ghReadEntry(entry,force=false){
      if(!GH_ENTRY_META[entry])throw new Error('未知功能入口');
      if(!force && ghEntryCache[entry])return ghEntryCache[entry];
      let rows=[];
      if(entry==='yield') rows=await ghLoadAllYieldRows();
      else rows=await ghLoadMainEntryRows(entry);
      ghEntryCache[entry]={rows,loadedAt:Date.now()};
      return ghEntryCache[entry];
    }

    function ghYieldCoverage(rows){
      const facts=ghYieldFacts(rows||[]);
      const years=[...new Set(facts.map(f=>Number(f.year)).filter(Number.isFinite))].sort((a,b)=>a-b);
      const zones=[...new Set(facts.map(f=>f.zone).filter(Boolean))];
      return {years,zones,facts:facts.length,minYear:years[0]||null,maxYear:years[years.length-1]||null};
    }

    function ghYieldEntryReadyText(rows){
      const c=ghYieldCoverage(rows);
      if(!c.years.length)return '產能資料目前沒有成功讀取。';
      const range=c.minYear===c.maxYear?`${c.minYear}`:`${c.minYear}–${c.maxYear}`;
      return `已讀取 ${range} 產能資料。你想了解產量、品質，還是對比？`;
    }


    function ghUnderstandQuestion(entry,q){
      const zone=ghFindZone(q);
      const zones=ghFindZones(q);
      const time=ghDateRequest(q)||{};
      const t=String(q||'').trim();
      const wantsWhy=/(為什麼|原因|怎麼|如何|建議|分析)/.test(t);
      const wantsCompare=/(比較|最高|最低|最多|最少|排名|差異|趨勢|比例|平均)/.test(t);
      const wantsList=/(哪些|什麼|有什麼|內容|明細|紀錄|列出|誰)/.test(t);
      const wantsTotal=/(多少|總量|總共|合計|公斤|包|次|幾筆|工時)/.test(t);
      return {entry,question:t,zone,zones,time,wantsWhy,wantsCompare,wantsList,wantsTotal};
    }

    function ghOrganizeForAI(entry,q,rows,yieldRows=[]){
      // Reuse existing normalizer/summary builder, but only with the selected domain's rows.
      return ghBuildSummaryPayload(q,rows,yieldRows);
    }

    async function ghAnswerSelectedEntryLegacy(entry,q){
      const meta=GH_ENTRY_META[entry];
      const understood=ghUnderstandQuestion(entry,q);
      let rows=[]; let yieldRows=[]; let direct='';

      // Step 1: 使用「按下功能鍵時已主動讀入」的資料池，不重新跨表猜資料來源。
      const cache=await ghReadEntry(entry,false);
      if(entry==='yield'){
        yieldRows=ghFilterYieldCache(cache.rows,q);
        // 若背景資料池剛好沒有命中（例如資料在回答前才新增），再做一次即時精準查詢補強。
        if(!yieldRows.length)yieldRows=await ghQueryYield(q);
      }else{
        rows=cache.rows.slice();
      }

      // Step 2 + 3: Understand and organize using domain-specific deterministic functions first.
      if(entry==='yield'){
        const route=ghYieldRoute(q);
        if(route.id==='import'){
          ghOpenYieldImport();
          return '請選擇 CSV、TSV 或 JSON。';
        }
        if(route.id==='input'||route.id==='audit') return ghYieldRouteIntro(route);
        if(!yieldRows.length)return '沒有查到符合你條件的產能資料。';
        direct=ghYieldFolderAnalysisAnswer(yieldRows,q);
        if(!direct)direct= route.id==='analysis' ? ghYieldCompositeAnswer(yieldRows,q) : ghYieldDirectAnswer(yieldRows,q);
        if(!direct) direct=ghYieldCompositeAnswer(yieldRows,q);
      }else if(entry==='work'){
        direct=ghWork45DirectAnswer(q,rows);
      }else if(entry==='calendar'){
        // 功能表5已在按鍵進入時完整預載；回答只允許使用 calendar 資料。
        // 月份／區域／狀態／節氣／開始日／累積天數先由固定函式計算。
        direct=ghCalendarDirectAnswer(q,rows);
        if(!rows.length)return '功能表5目前沒有讀到計畫資料。';
      }else if(entry==='materials'){
        direct=ghWork68DirectAnswer(q,rows);
      }else if(entry==='attendance'){
        direct=ghAttendanceDirectAnswer(rows,q);
      }

      // Step 4: If a deterministic calculation/list can answer, return it immediately.
      if(direct && !understood.wantsWhy)return direct;

      // Only now call AI; the AI receives one domain only and may not switch tables.
      const payload=ghOrganizeForAI(entry,q,rows,yieldRows);
      payload.selectedEntry={id:entry,label:meta.label,table:meta.table};
      payload.questionUnderstanding=understood;
      const aiQ=`【已鎖定入口：${meta.label}／${meta.table}】\n${q}\n\n回答規則：只回答這個入口的資料；先回答結論，再補必要計算或分析；不要介紹功能表、不要說正在讀取。若為產能：依使用者指定的區域（可多選）與時間區間，只分析產量、A/B/D/NG品質公斤數與占比、或區域/期間對比；未要求的區域與期間禁止主動加入答案。若為計畫：把功能表5視為「月份×溫室」矩陣；問月份就依一期、二期、三期、四南、四北、五期順序回答；問溫室就依月份順序回答；問計畫類型就反向回答符合的溫室與月份；節氣使用月份節氣列；沒有資料支持就只回答「抱歉，我不知道」，禁止猜測或延伸。`;
      return await ghAskAI(aiQ,payload);
    }

    
    // ===== V6：計畫／耗材／打卡 整併版，正式取代舊的重複定義（不再用執行期覆蓋全域變數的做法）=====
/* TEDDY 溫室模式 V6：完全對齊 V5.1 真實 key/schema，五入口 + 上下文 */
  const V6_ZONE_ORDER=["p1","p2","zone3","south4","north4","zone5"];
  const V6_ZONE_NAME={p1:"一期溫室",p2:"二期溫室",zone3:"三期溫室",south4:"四南溫室",north4:"四北溫室",zone5:"五期溫室"};
  const V6_CAL_LABEL={season:"產季",green:"座果",purple:"剪枝",alert:"度冬",beige:"備註",red:"重要",cyan:"預估",none:""};
  const V6_SOLAR={1:"小寒／大寒",2:"立春／雨水",3:"驚蟄／春分",4:"清明／穀雨",5:"立夏／小滿",6:"芒種／夏至",7:"小暑／大暑",8:"立秋／處暑",9:"白露／秋分",10:"寒露／霜降",11:"立冬／小雪",12:"大雪／冬至"};
  const V6_MAT_META={
    "溝灌":{itemId:6,unit:"噸",kind:"補水"},"噴灌":{itemId:6,unit:"分鐘",kind:"補水"},
    "米糠":{itemId:7,unit:"包",kind:"施肥"},"金旺":{itemId:7,unit:"包",kind:"施肥"},
    "黃豆":{itemId:8,unit:"kg",kind:"其他資材"},"水果":{itemId:8,unit:"kg",kind:"其他資材"},
    "硝酸鉀":{itemId:8,unit:"kg",kind:"其他資材"},"磷酸一鉀":{itemId:8,unit:"kg",kind:"其他資材"},
    "硫酸鉀":{itemId:8,unit:"kg",kind:"其他資材"},"鈣鎂粉":{itemId:8,unit:"kg",kind:"其他資材"},
    "微量元素":{itemId:8,unit:"kg",kind:"其他資材"}
  };
  const V6_CTX={
    yield:{zones:[],year:null,month:null,intent:null,grade:null},
    work:{zones:[],year:null,month:null,item:null,intent:null},
    calendar:{zones:[],year:null,month:null,action:null,intent:null},
    materials:{zones:[],year:null,month:null,itemId:null,material:null,intent:null},
    attendance:{person:null,year:null,month:null,date:null,intent:null}
  };

  function v6Today(){const d=new Date();return {year:d.getFullYear(),month:d.getMonth()+1,day:d.getDate(),date:`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`};}
  function v6SafeJson(v){if(typeof v!=="string")return v;try{return JSON.parse(v);}catch(_){return v;}}
  function v6ZoneIds(q){
    const t=String(q||""),out=[];
    [["p1",/(?:一期|p1)/i],["p2",/(?:二期|p2)/i],["zone3",/(?:三期|zone3)/i],["south4",/(?:四南|south4)/i],["north4",/(?:四北|north4)/i],["zone5",/(?:五期|zone5)/i]]
      .forEach(([id,re])=>{if(re.test(t))out.push(id);});
    if(/四期/.test(t)){if(!out.includes("south4"))out.push("south4");if(!out.includes("north4"))out.push("north4");}
    return out;
  }
  function v6Time(q){
    const t=String(q||""),now=v6Today();let year=null,month=null,date=null,m=t.match(/(20\d{2})\s*年?/);if(m)year=Number(m[1]);
    m=t.match(/(?:^|[^\d])(\d{1,2})\s*月/);if(m)month=Number(m[1]);
    if(/今年/.test(t))year=now.year;if(/去年/.test(t))year=now.year-1;if(/明年/.test(t))year=now.year+1;
    if(/本月|這個月|這月|目前|現在/.test(t)){year=year||now.year;month=month||now.month;}
    if(/上個月|上月/.test(t)){let d=new Date(now.year,now.month-2,1);year=d.getFullYear();month=d.getMonth()+1;}
    if(/下個月|下月/.test(t)){let d=new Date(now.year,now.month,1);year=d.getFullYear();month=d.getMonth()+1;}
    m=t.match(/(20\d{2})[\/.-](\d{1,2})[\/.-](\d{1,2})/);if(m){year=+m[1];month=+m[2];date=`${m[1]}-${String(+m[2]).padStart(2,"0")}-${String(+m[3]).padStart(2,"0")}`;}
    return {year,month,date,ym:(year&&month)?`${year}-${String(month).padStart(2,"0")}`:null};
  }
  function v6CalendarAction(q){const t=String(q||"");for(const a of ["產季","剪枝","座果","度冬","重要","預估","備註"])if(t.includes(a))return a;return null;}
  function v6Material(q){const t=String(q||"");for(const k of Object.keys(V6_MAT_META))if(t.includes(k))return k;return null;}
  function v6WorkItem(q){const t=String(q||"");if(/打芽.*(?:地|底)|地芽/.test(t))return 2;if(/打芽/.test(t))return 1;if(/除草/.test(t))return 3;if(/剪葉/.test(t))return 4;if(/覆蓋/.test(t))return 5;return null;}

  async function v6PrefixDocs(prefix){
    const db=await ghMainFirestore();let docs=[];
    // 改成對「文件ID本身」做範圍查詢，不要依賴文件內部的 key 欄位——
    // 已經證實有些舊資料的 key 欄位沒有正確寫入（可能是很久以前用不同版本存的），
    // 用欄位查詢會讓這些文件完全隱形，但文件ID本身其實是對的，真正的 App 也是直接用ID讀取。
    try{
      const snap=await db.collection("kv")
        .where(firebase.firestore.FieldPath.documentId(),">=",prefix)
        .where(firebase.firestore.FieldPath.documentId(),"<",prefix+"\uf8ff")
        .get();
      docs=snap.docs;
    }catch(e){
      docs=(await ghFetchAllDocs(db.collection("kv"))).filter(d=>d.id.startsWith(prefix));
    }
    // 文件ID保證是對的（就是查詢用的依據），內部 key 欄位就算缺漏或不一致也不影響——一律以文件ID為準。
    return docs.map(doc=>{const raw=doc.data()||{};return {key:doc.id,data:v6SafeJson(raw.value),updatedAt:raw.updatedAt||null};});
  }


  // rowId 可能是英文代碼（p1/zone3...）也可能是舊版直接存中文名稱（一期/三期...）——
  // 之前只認英文代碼，如果三期、四南這幾筆是舊版用中文存的，會被這裡直接篩掉、當成沒讀到。
  const V6_ROWID_TO_ZONE={
    p1:"p1","一期":"p1",
    p2:"p2","二期":"p2","總公司":"p2",
    zone3:"zone3","三期":"zone3",
    south4:"south4","四南":"south4",
    north4:"north4","四北":"north4",
    zone5:"zone5","五期":"zone5"
  };
  function v6CalendarRow(doc){
    const m=doc.key.match(/^calendar:([^:]+):(\d{4})-(\d{2})$/);
    if(!m)return null;
    const rawRowId=m[1];
    if(rawRowId==="prod")return null;
    const zoneId=V6_ROWID_TO_ZONE[rawRowId];
    if(!zoneId)return null; // 真的辨識不出來的 rowId 才丟掉，並且會被下面的診斷計數記錄
    const d=(doc.data&&typeof doc.data==="object")?doc.data:{},color=String(d.color||"none"),text=String(d.text||"").trim();
    if(color==="none"&&!text&&!d.date)return null;
    return {sourceKey:doc.key,category:"calendar",zone:{id:zoneId,name:V6_ZONE_NAME[zoneId]},period:`${m[2]}-${m[3]}`,
      function5Calendar:{color,text,date:d.date==null?null:Number(d.date),action:(V6_CAL_LABEL[color]||text||"").trim()},rawData:d,updatedAt:doc.updatedAt};
  }
  async function v6LoadCalendar(){
    const rawDocs=await v6PrefixDocs("calendar:");
    const rows=rawDocs.map(v6CalendarRow).filter(Boolean);
    // 診斷用：記下「撈到的原始文件數」跟「篩選後的有效筆數」，兩者差太多就代表篩選這關把資料濾掉了。
    window.__ghCalendarDebug={rawCount:rawDocs.length,filteredCount:rows.length,rawKeys:rawDocs.map(d=>d.key)};
    return rows;
  }

  function v6ZoneworkRow(doc){
    const m=doc.key.match(/^zonework:(p1|p2|zone3|south4|north4|zone5):(\d{4}-\d{2})$/);if(!m)return null;
    const d=(doc.data&&typeof doc.data==="object")?doc.data:{};
    const history=(Array.isArray(d.confirmHistory)?d.confirmHistory:[]).map(h=>{
      const material=String(h.rowKey||h.itemName||""),meta=V6_MAT_META[material]||{itemId:null,unit:"",kind:""},at=String(h.at||h.confirmedAt||"");
      return {itemId:meta.itemId,material,quantity:Number(h.qty??h.quantity??0),unit:meta.unit,kind:meta.kind,confirmedAt:at,at,personName:h.personName||h.personId||"",raw:h};
    }).filter(h=>h.material&&Number.isFinite(h.quantity)&&h.quantity>0);
    return {sourceKey:doc.key,category:"zonework",zone:{id:m[1],name:V6_ZONE_NAME[m[1]]},period:m[2],function3Work6to8:{confirmedHistory:history},rawData:d,updatedAt:doc.updatedAt};
  }
  async function v6LoadMaterials(){return (await v6PrefixDocs("zonework:")).map(v6ZoneworkRow).filter(Boolean);}
  async function v6LoadWork(){return (await v6PrefixDocs("worklog:")).map(ghNormalizeMainRecord).filter(r=>r.category==="worklog");}
  async function v6LoadAttendance(){const [a,p]=await Promise.all([v6PrefixDocs("attendance:"),v6PrefixDocs("person:")]);return [...a,...p].map(ghNormalizeMainRecord).filter(r=>r.category==="attendance"||r.category==="person");}

  async function ghLoadMainEntryRows(entry){
    if(entry==="calendar")return v6LoadCalendar();
    if(entry==="materials")return v6LoadMaterials();
    if(entry==="work")return v6LoadWork();
    if(entry==="attendance")return v6LoadAttendance();
    return [];
  };

  function v6UpdateContext(entry,q){
    const c=V6_CTX[entry]||(V6_CTX[entry]={}),t=String(q||"").trim(),tm=v6Time(t),zs=v6ZoneIds(t);if(zs.length)c.zones=zs;if(tm.year)c.year=tm.year;if(tm.month)c.month=tm.month;
    if(entry==="calendar"){const a=v6CalendarAction(t);if(a)c.action=a;if(/節氣/.test(t))c.intent="solar";else if(/何時|什麼時候|幾月|哪個月/.test(t))c.intent="when";else if(/計畫|做什麼|內容|安排|時程|動作|有哪些|有什麼/.test(t))c.intent="list";}
    else if(entry==="materials"){const mat=v6Material(t);if(mat){c.material=mat;c.itemId=V6_MAT_META[mat].itemId;}if(/補水|澆水|灌溉/.test(t))c.itemId=6;if(/施肥|肥料/.test(t))c.itemId=7;if(/其他資材|資材/.test(t)&&!mat)c.itemId=8;if(/哪裡|哪一區|哪些區|哪幾區/.test(t))c.intent="where";else if(/何時|哪天|幾號|什麼時候/.test(t))c.intent="when";else if(/什麼|哪些|品項|材料/.test(t))c.intent="what";else if(/多少|用量|總量|幾包|幾噸|分鐘/.test(t))c.intent="qty";}
    else if(entry==="work"){const wi=v6WorkItem(t);if(wi)c.item=wi;}
    else if(entry==="yield"){if(/品質|A級|B級|D級|NG/.test(t))c.intent="quality";else if(/比較|對比|差異|排名/.test(t))c.intent="compare";else if(/產量|產能|收成|採收|公斤|多少/.test(t))c.intent="yield";const gm=t.match(/\b(NG|A|B|D)\s*級?/i);if(gm)c.grade=gm[1].toUpperCase();}
    return c;
  }
  function v6EffectiveQuestion(entry,q){
    const c=v6UpdateContext(entry,q),parts=[String(q||"").trim()],tm=v6Time(q);
    if(c.zones?.length&&!v6ZoneIds(q).length)parts.push(c.zones.map(id=>V6_ZONE_NAME[id]).join("、"));if(c.year&&!tm.year)parts.push(`${c.year}年`);if(c.month&&!tm.month)parts.push(`${c.month}月`);
    if(entry==="calendar"){if(c.action&&!v6CalendarAction(q))parts.push(c.action);parts.push("計畫");}
    else if(entry==="materials"){if(c.material&&!v6Material(q))parts.push(c.material);else if(c.itemId===6&&!/補水|澆水|灌溉/.test(q))parts.push("補水");else if(c.itemId===7&&!/施肥|肥料/.test(q))parts.push("施肥");else if(c.itemId===8&&!/資材/.test(q))parts.push("其他資材");if(c.intent==="where")parts.push("哪一區");if(c.intent==="when")parts.push("何時");if(c.intent==="what")parts.push("用了什麼");if(c.intent==="qty")parts.push("多少");}
    else if(entry==="work"){if(c.item&&!v6WorkItem(q))parts.push({1:"打芽",2:"打芽底",3:"除草",4:"剪葉",5:"覆蓋"}[c.item]);parts.push("工作進度");}
    else if(entry==="yield"){parts.push(c.intent==="quality"?"品質":c.intent==="compare"?"比較":"產量");if(c.grade)parts.push(c.grade+"級");}
    return parts.join(" ");
  }

  function v6PlanAnswer(q,rows){
    const t=String(q||""),now=v6Today(),tm=v6Time(t),month=tm.month,year=tm.year||now.year,zones=v6ZoneIds(t),action=v6CalendarAction(t),active=rows.filter(r=>r.category==="calendar");
    if(/節氣/.test(t)){const m=month||now.month;return `${year}年${m}月的節氣是${V6_SOLAR[m]}。`;}
    const label=r=>{const c=r.function5Calendar||{},a=V6_CAL_LABEL[c.color]||c.action||c.text||"計畫",m=Number(String(r.period).slice(5,7)),d=c.date?`${m}月${c.date}日開始`:"";return `${a}${d?"，"+d:""}${c.text&&c.text!==a?"，"+c.text:""}`;};
    if(month&&!zones.length&&!action){const ym=`${year}-${String(month).padStart(2,"0")}`;return `${year}年${month}月：`+V6_ZONE_ORDER.map(id=>{const r=active.find(x=>x.zone?.id===id&&x.period===ym);return `${V6_ZONE_NAME[id]}：${r?label(r):"無計畫"}`;}).join("；")+"。";}
    if(zones.length&&action){return zones.map(id=>{const hits=active.filter(r=>r.zone?.id===id&&(V6_CAL_LABEL[r.function5Calendar?.color]===action||String(r.function5Calendar?.text||"").includes(action))).filter(r=>!tm.year||String(r.period).startsWith(String(tm.year))).sort((a,b)=>a.period.localeCompare(b.period));return hits.length?`${V6_ZONE_NAME[id]}：${hits.map(r=>`${r.period.replace("-","年")}月${r.function5Calendar?.date?`${r.function5Calendar.date}日`:""}`).join("、")}`:`${V6_ZONE_NAME[id]}：沒有查到${action}計畫`;}).join("；")+"。";}
    if(zones.length){const sy=tm.year||now.year,sm=tm.month||now.month;return zones.map(id=>{const p=[];for(let i=0;i<5;i++){const d=new Date(sy,sm-1+i,1),y=d.getFullYear(),m=d.getMonth()+1,ym=`${y}-${String(m).padStart(2,"0")}`,r=active.find(x=>x.zone?.id===id&&x.period===ym);p.push(`${m}月${r?"："+label(r):"：無計畫"}`);}return `${V6_ZONE_NAME[id]}：${p.join("、")}`;}).join("；")+"。";}
    if(action){const hits=active.filter(r=>V6_CAL_LABEL[r.function5Calendar?.color]===action||String(r.function5Calendar?.text||"").includes(action)).filter(r=>!tm.year||String(r.period).startsWith(String(tm.year))).sort((a,b)=>a.period.localeCompare(b.period));if(!hits.length)return "抱歉，我不知道。";return `${action}計畫：`+hits.map(r=>`${r.zone.name} ${r.period.replace("-","年")}月${r.function5Calendar?.date?`${r.function5Calendar.date}日開始`:""}`).join("；")+"。";}
    const ym=`${now.year}-${String(now.month).padStart(2,"0")}`;return `${now.year}年${now.month}月：`+V6_ZONE_ORDER.map(id=>{const r=active.find(x=>x.zone?.id===id&&x.period===ym);return `${V6_ZONE_NAME[id]}：${r?label(r):"無計畫"}`;}).join("；")+"。";
  }

  // ===== Smart Teddy 8.6.0：補水／施肥／其他資材（工作6–8）改為直接讀完全體 =====
  // 與完全體 fetchZoneworkConfirmedByDay 同一套：zonework:{分區}:{年月} 的 confirmHistory，
  // qty 需 >0，日期由 at 換算；分類依完全體：工作6 補水＝溝灌、噴灌；工作7 施肥＝米糠、金旺；工作8 其他資材＝其餘 7 項。
  // 沒講時間＝本月（並在回答中寫明），講「今天／昨天／前天／幾月幾日」就只算那一天。
  const V6_KIND_ITEMS={6:["溝灌","噴灌"],7:["米糠","金旺"],8:["黃豆","水果","硝酸鉀","磷酸一鉀","硫酸鉀","鈣鎂粉","微量元素"]};
  const V6_KIND_NAME={6:"補水",7:"固態施肥",8:"液態施肥（其他資材）","78":"施肥"};
  async function v6MaterialsAnswer(q,rows){
    const t=String(q||""),ctx=f7Ctx(t);
    if(!ctx.day&&/前天/.test(t)){ctx.day=f7ShiftDay(ctx.today,-2);ctx.startYm=ctx.endYm=ctx.day.slice(0,7);}
    const week=ctx.day?null:ghWeekRange(t);
    if(week){ctx.startYm=week.from.slice(0,7);ctx.endYm=week.to.slice(0,7);}
    const mat=v6Material(t);
    // 6.4.0：「施肥」＝工作7 固態（米糠、金旺）＋工作8 液態（7 種資材），分層列出；講「固態／液態」才只看其中一層。
    // 6.9.0：同時問到水和肥（例如「四北澆水施肥」「施的肥跟水量」）就三類一起列，不再只回補水。
    const askWater=/補水|澆|灌|水/.test(t),askFert=/肥|資材|液態|固態/.test(t);
    let itemId=mat?V6_MAT_META[mat].itemId:(askWater&&askFert)?null:(/液態|其他資材|工作8|工項8/.test(t)?8:/固態|工作7|工項7/.test(t)?7:/補水|澆|灌|水/.test(t)?6:/施肥|肥|資材/.test(t)?"78":null);
    const keys=mat?[mat]:itemId==="78"?[...V6_KIND_ITEMS[7],...V6_KIND_ITEMS[8]]:itemId?V6_KIND_ITEMS[itemId]:[...V6_KIND_ITEMS[6],...V6_KIND_ITEMS[7],...V6_KIND_ITEMS[8]];
    const zoneIds=v6ZoneIds(t);
    const zones=zoneIds.length?V6_ZONE_ORDER.filter(id=>zoneIds.includes(id)):V6_ZONE_ORDER.slice();
    // 「肥下了沒／水有沒有灌」這種問法沒講日期時，回答最近一次，而不是整月合計。
    const latest=(/最近|最新|上次|上一次/.test(t)||/了沒|了嗎|有沒有/.test(t))&&!ctx.day&&!ctx.req.ym&&!ctx.req.year&&!ghWeekRange(t);
    let months;
    if(latest){
      const d=new Date();months=[];
      for(let i=2;i>=0;i--){const x=new Date(d.getFullYear(),d.getMonth()-i,1);months.push(f7Ym(x.getFullYear(),x.getMonth()+1));}
    }else{
      months=f7Months(ctx.startYm,ctx.endYm);if(months.length>24)months=months.slice(-24);
    }
    const recs=[];
    try{
      f7ForceFresh=true; // 用量會隨時新增，每次都即時讀完全體
      const jobs=[];months.forEach(ym=>zones.forEach(id=>jobs.push({ym,id})));
      const got=await f7Pool(jobs,6,async j=>({j,list:await f7ZoneworkConfirmed(j.id,j.ym)}));
      got.forEach(g=>{
        if(!g)return;
        g.list.forEach(h=>{
          if(!keys.includes(h.rowKey))return;
          if(ctx.day&&h.day!==ctx.day)return;
          if(week&&(h.day<week.from||h.day>week.to))return;
          recs.push({...h,zoneId:g.j.id});
        });
      });
    }catch(e){
      return `這次沒讀到完全體的用量資料（${e.message}），請再問一次。`;
    }finally{f7ForceFresh=false;}

    const curYm=f7Ym(ctx.cy,ctx.cm);
    const zoneLabel=zoneIds.length?zoneIds.map(id=>V6_ZONE_NAME[id]).join("、"):"全場";
    const periodLabel=latest?"最近三個月":week?week.label
      :ctx.day?(ctx.day===ctx.today?`今天（${ctx.day}）`:ctx.day===f7ShiftDay(ctx.today,-1)?`昨天（${ctx.day}）`:ctx.day===f7ShiftDay(ctx.today,-2)?`前天（${ctx.day}）`:ctx.day)
      :ctx.startYm===ctx.endYm?`${Number(ctx.startYm.slice(0,4))}年${Number(ctx.startYm.slice(5))}月${ctx.startYm===curYm?"（本月）":""}`
      :`${ctx.startYm}～${ctx.endYm}`;
    const what=mat||(itemId?V6_KIND_NAME[itemId]:"補水與施肥");
    const unitOf=k=>(V6_MAT_META[k]&&V6_MAT_META[k].unit)||"";
    const fmt=n=>String(Math.round(n*100)/100);
    const src="（完全體功能表7表三，只算已回報確認）";
    if(!recs.length)return latest?`${zoneLabel}最近三個月沒有已確認的${what}紀錄。${src}`:`${zoneLabel}・${periodLabel}沒有已確認的${what}紀錄。${src}`;

    if(latest){
      const h=recs.sort((a,b)=>b.day.localeCompare(a.day)||String(b.at).localeCompare(String(a.at)))[0];
      const sameDay=recs.filter(x=>x.day===h.day&&x.zoneId===h.zoneId);
      const tot={};sameDay.forEach(x=>tot[x.rowKey]=(tot[x.rowKey]||0)+x.qty);
      return `${V6_ZONE_NAME[h.zoneId]}最近一次${what}是 ${h.day}：${Object.entries(tot).map(([k,n])=>`${k} ${fmt(n)}${unitOf(k)}`).join("、")}。${src}`;
    }

    if(/何時|哪天|幾號|什麼時候|哪幾天|每天|逐日/.test(t)){
      const byDay={};
      recs.forEach(h=>{const k=`${h.day}|${h.zoneId}`;(byDay[k]||(byDay[k]={}))[h.rowKey]=(byDay[k][h.rowKey]||0)+h.qty;});
      const lines=Object.keys(byDay).sort().map(k=>{const [day,id]=k.split("|");return `${day.slice(5)} ${V6_ZONE_NAME[id]}：${Object.entries(byDay[k]).map(([m,n])=>`${m} ${fmt(n)}${unitOf(m)}`).join("、")}`;});
      return `${zoneLabel}・${periodLabel}已確認${what}：\n${lines.slice(-15).join("\n")}${lines.length>15?`\n（共 ${lines.length} 筆，只列最近 15 筆）`:""}\n${src}`;
    }

    const byZone={};
    recs.forEach(h=>{const o=byZone[h.zoneId]||(byZone[h.zoneId]={items:{},days:new Set(),last:""});o.items[h.rowKey]=(o.items[h.rowKey]||0)+h.qty;o.days.add(h.day);if(h.day>o.last)o.last=h.day;});
    const part=(o,ks)=>ks.filter(k=>o.items[k]).map(k=>`${k} ${fmt(o.items[k])}${unitOf(k)}`).join("、");
    const line=o=>{
      if(itemId!=="78"&&mat==null&&itemId!==null)return part(o,keys);
      const groups=[["補水",V6_KIND_ITEMS[6]],["固態",V6_KIND_ITEMS[7]],["液態",V6_KIND_ITEMS[8]]].map(([g,ks])=>[g,part(o,ks.filter(k=>keys.includes(k)))]).filter(([,s])=>s);
      return groups.length>1?groups.map(([g,s])=>`${g}－${s}`).join("；"):(groups[0]?groups[0][1]:"");
    };
    const ids=V6_ZONE_ORDER.filter(id=>byZone[id]);
    if(ids.length===1&&zoneIds.length<=1){
      const o=byZone[ids[0]];
      const extra=ctx.day?"":`（${o.days.size} 天有紀錄，最近 ${o.last.slice(5)}）`;
      const next=ctx.day?"":"\n要再深入：說「哪幾天」看逐日，「各區比較」看排名，「趨勢分析」看表十一。";
      return `${V6_ZONE_NAME[ids[0]]}・${periodLabel}已確認${what}：${line(o)}${extra}。${src}${next}`;
    }
    return `${periodLabel}已確認${what}：\n${ids.map(id=>`${V6_ZONE_NAME[id]}：${line(byZone[id])}`).join("\n")}\n${src}`;
  }
  function v6AttendanceAnswer(rows,q){
    const text=String(q||""),tm=v6Time(text),now=v6Today(),slots=["amIn","amOut","pmIn","pmOut"];
    const people=rows.filter(r=>r.category==="person").map(r=>r.rawData||{}).filter(p=>p&&p.id);
    const myId=/我/.test(text)?ghMyId():null;
    const person=(myId&&!people.some(p=>p.name&&text.includes(String(p.name)))?people.find(p=>String(p.id).toUpperCase()===myId):null)||people.find(p=>text.includes(String(p.name||""))||text.includes(String(p.id||"")))||null;
    const normalize=(raw,key)=>{
      const d=raw&&typeof raw==="object"?{...raw}:{};
      const empty=()=>({punches:{amIn:null,amOut:null,pmIn:null,pmOut:null},geo:{amIn:null,amOut:null,pmIn:null,pmOut:null}});
      let regular=d.regular||null,overtime=d.overtime||empty();
      if(!regular){regular=empty();if(d.punches)regular={punches:{...regular.punches,...d.punches},geo:{...regular.geo,...(d.geo||{})}};else if(d.clockInAt||d.clockOutAt){regular.punches.amIn=String(d.clockInAt||"").split(" ").pop()||null;regular.punches.pmOut=String(d.clockOutAt||"").split(" ").pop()||null;}}
      return {...d,regular,overtime,personId:d.personId||String(key||"").split(":")[1],date:d.date||(String(key||"").match(/20\d{2}-\d{2}-\d{2}/)||[])[0]};
    };
    const hhmm=n=>{if(!n)return null;const m=String(n).match(/^(\d{1,2}):(\d{2})$/);return m?Number(m[1])*60+Number(m[2]):null;};
    const blockHours=b=>{const p=b?.punches||{};let total=0,complete=0;[["amIn","amOut"],["pmIn","pmOut"]].forEach(([a,z])=>{const x=hhmm(p[a]),y=hhmm(p[z]);if(x!=null&&y!=null&&y>=x){total+=(y-x)/60;complete++;}});return complete?Math.round(total*100)/100:0;};
    const fmtBlock=b=>{const p=b?.punches||{};return `${p.amIn||"—"}→${p.amOut||"—"} / ${p.pmIn||"—"}→${p.pmOut||"—"}`;};
    const leaveTypes=rows.find(r=>r.category==="leave_types")?.rawData;
    if(/假別.*(?:清單|有哪些|種類)|有哪些.*假/.test(text))return `功能表10假別：${Array.isArray(leaveTypes)&&leaveTypes.length?leaveTypes.join("、"):"目前沒有查到假別清單"}。`;
    if(/休息|午休/.test(text)){
      let prefs=rows.filter(r=>r.category==="attendance_pref");if(person)prefs=prefs.filter(r=>String(r.sourceKey||"").includes(`:${person.id}`));
      if(!prefs.length)return "功能表10目前沒有查到休息時段設定。";
      return prefs.map(r=>{const d=r.rawData||{},id=String(r.sourceKey||"").split(":")[1]||"人員",p=people.find(x=>x.id===id);return `${p?.name||id}：${d.restStart||"12:00"}–${d.restEnd||"13:00"}`;}).join("；")+"。";
    }
    let target=tm.date||(tm.year&&tm.month?`${tm.year}-${String(tm.month).padStart(2,"0")}`:now.date);
    if(/昨天/.test(text)){const d=new Date(now.year,now.month-1,now.day-1);target=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;}
    let recs=rows.filter(r=>r.category==="attendance"&&String(r.sourceKey||"").includes(target)).map(r=>({row:r,data:normalize(r.rawData,r.sourceKey)}));
    if(person)recs=recs.filter(x=>x.data.personId===person.id||x.data.personName===person.name);
    if(/誰.*(?:沒|未).*(?:打卡|上班|下班)|(?:沒|未).*(?:打卡|上班|下班).*(?:誰)/.test(text)&&target.length===10){
      const present=new Set(recs.filter(x=>slots.some(k=>x.data.regular?.punches?.[k])).map(x=>x.data.personId));
      const missing=people.filter(p=>!present.has(p.id)).map(p=>p.name||p.id);return missing.length?`${target}尚未查到打卡：${missing.join("、")}。`:`${target}名單內人員都有打卡紀錄。`;
    }
    if(!recs.length)return `功能表10在${target}沒有查到符合條件的打卡／出勤紀錄。`;
    const stats=recs.reduce((a,x)=>{a.reg+=blockHours(x.data.regular);a.ot+=blockHours(x.data.overtime);if(x.data.leave)a.leave++;a.pending+=(x.data.abnormalities||[]).filter(v=>v?.status==="pending").length;return a;},{reg:0,ot:0,leave:0,pending:0});
    if(target.length===7||recs.length>4||/總計|合計|統計|幾小時|工時/.test(text))return `${target}${person?` ${person.name||person.id}`:""}共 ${recs.length} 筆；正常班 ${Math.round(stats.reg*100)/100} 小時、加班 ${Math.round(stats.ot*100)/100} 小時、請假 ${stats.leave} 筆${stats.pending?`、待確認異常 ${stats.pending} 筆`:""}。`;
    return recs.map(x=>{const d=x.data,name=d.personName||people.find(p=>p.id===d.personId)?.name||d.personId||"人員",leave=d.leave?`；請假 ${d.leave.type||"未註明"}${d.leave.hours!=null?` ${d.leave.hours}小時`:""}${d.leave.note?`（${d.leave.note}）`:""}`:"",pending=(d.abnormalities||[]).filter(v=>v?.status==="pending").length,geo=/定位|GPS|位置/.test(text)?slots.map(k=>d.regular?.geo?.[k]).filter(g=>g?.lat!=null).map(g=>`${g.lat},${g.lon}`).join("、"):"";return `${name}：正常 ${fmtBlock(d.regular)}${slots.some(k=>d.overtime?.punches?.[k])?`；加班 ${fmtBlock(d.overtime)}`:""}${leave}${pending?`；待確認異常 ${pending} 筆`:""}${geo?`；GPS ${geo}`:""}`;}).join("\n");
  }

  async function ghAnswerSelectedEntry(entry,q){
    q=teddyToTrad(q);
    if(entry==="guide")return ghGuideAnswer(q);
    if(GH_V51X[entry])return ghV51ExtraAnswer(entry,q);
    const resolved=ghResolveConversation(q);
    // 功能表7 先處理，不經過其他入口的上下文整理（避免 V6_CTX 沒有 function7 而當機）。
    if(entry==="function7"||ghFunction7Table(q)!=null||(ghFunction7Table(resolved.effective)!=null&&ghLooksLikeFollowup(q)))
      return ghFunction7Answer(ghFunction7Table(q)!=null||entry==="function7"&&!ghLooksLikeFollowup(q)?q:resolved.effective);
    const effective=v6EffectiveQuestion(entry,resolved.effective);
    if(entry==="function7"||ghFunction7Table(q)!=null||ghFunction7Table(effective)!=null)return ghFunction7Answer(ghFunction7Table(q)!=null?q:effective);
    const cache=await ghReadEntry(entry,false);
    if(entry==="calendar")return v6PlanAnswer(effective,cache.rows);
    if(entry==="materials")return v6MaterialsAnswer(effective,cache.rows);
    if(entry==="attendance")return v6AttendanceAnswer(cache.rows,effective);
    return ghAnswerSelectedEntryLegacy(entry,effective);
  };

    async function ghSelectEntry(entry){
      const selectToken=++ghEntrySelectToken;
      ghSelectedEntry=entry;ghEntryCache[entry]=null;ghSetEntryButtonState(entry);
    const status=document.getElementById("greenhouseStatus"),hint=document.getElementById("ghEntryHint"),meta=GH_ENTRY_META[entry];
    if(window.TEDDY_ENTRY_ID==="farm")await ghV51RefreshSession();
    const denySel=ghV51DenyText(entry,"");
    if(denySel){if(status)status.textContent=`${meta.label}｜沒有閱覽權限`;if(hint)hint.textContent=denySel;await ghSpeak(denySel);return;}
    if(GH_V51X[entry]){
      const x=GH_V51X[entry];
      if(status)status.textContent=`${x.label}｜${x.table}`;
      if(hint)hint.textContent=`目前：${x.label}。${x.ready}`;
      await ghSpeak(x.ready);
      return;
    }
    if(entry==="function7"){
      if(status)status.textContent="報表｜功能表7・查看各項報表（表一～表十四）";
      if(hint)hint.textContent="目前：報表。"+f7MenuText().replace(/\n/g," ");
      await ghSpeak("報表十四張表都準備好了，想看哪一張？");
      return;
    }
    if(status)status.textContent=`${meta.label}｜正在讀取 ${meta.table}…`;
      try{
        const cache=await ghReadEntry(entry,true);
        if(selectToken!==ghEntrySelectToken||ghSelectedEntry!==entry)return;
      if(status)status.textContent=`${meta.label}｜${meta.table} 已讀取 ${cache.rows.length} 組資料`;
      let ready="資料已讀取。想讓我分析什麼事？";
      if(entry==="yield")ready=ghYieldEntryReadyText(cache.rows);
      if(entry==="calendar")ready="資料已讀取。想查月份、溫室、計畫動作，還是節氣？";
      if(entry==="work")ready="資料已讀取。想了解哪一區的工作？";
      if(entry==="materials")ready="資料已讀取。想查補水、施肥、其他資材，還是哪個區域？";
      if(entry==="attendance")ready="資料已讀取。想查哪一天或哪位人員？";
      if(hint)hint.textContent=`目前：${meta.label}。${ready}`;
      await ghSpeak(ready);
    }catch(e){console.error("V6入口讀取失敗",e);if(status)status.textContent=`${meta.label}｜讀取失敗`;if(hint)hint.textContent=`讀取失敗：${e.message}`;}
  };


    async function ghSend(){
      const input=document.getElementById("greenhouseInput"),btn=document.getElementById("btnGreenhouseSend"),q=input.value.trim();
      if(!q)return;
      input.value="";ghLog("user",q);btn.disabled=true;
      const status=document.getElementById("greenhouseStatus");
      try{
        const mem=ghHandleMemoryCommand(q);
        if(mem.matched){
          ghLog("assistant",mem.reply); await ghSpeak(mem.reply); return;
        }
        if(ghIsGreetingOnly(q)){
          const reply="嗨！先選上面的功能，再直接問我。";
          ghLog("assistant",reply); await ghSpeak(reply); return;
        }
        status.textContent="理解問題、讀取固定資料中…";
        const res=await teddyGreenhouseAsk(q,ghSelectedEntry);
        const answer=res.answer;
        const meta=GH_ENTRY_META[res.entry];
        status.textContent=meta?`${meta.label}｜${meta.table}`:(res.entry==="route-map"?"固定路由":"請指定入口");
        ghLog("assistant",answer);
        try{teddyHistory.push({role:"user",text:q,source:"greenhouse",mode:"greenhouse"});teddyHistory.push({role:"assistant",text:answer,source:"greenhouse",mode:"greenhouse"});teddySaveHistory();}catch(_){}
        if(!(typeof window.teddyLiveSpeak==="function"&&window.teddyLiveSpeak(answer)))await ghSpeak(answer);
      }catch(e){
        console.error(e);
        const errMsg="查詢失敗："+e.message;
        ghLog("assistant",errMsg); await ghSpeak(errMsg);
      }finally{
        btn.disabled=false;
      }
    }

    document.addEventListener("DOMContentLoaded",()=>{
      // 稱呼要在任一模式都讀得到，不能只靠打開一般聊天面板才觸發載入——
      // 不然直接點進溫室模式的人，第一句話永遠讀不到已經存過的稱呼。
      teddyLoadHistory();
      const p=document.getElementById("btnPongchiMode"),g=document.getElementById("btnGreenhouseMode"),
        close=document.getElementById("btnGreenhouseClose"),send=document.getElementById("btnGreenhouseSend"),
        input=document.getElementById("greenhouseInput"),scan=document.getElementById("btnGreenhouseScan");

      document.querySelectorAll('.gh-entry-btn').forEach(btn=>{
        btn.onclick=()=>ghSelectEntry(btn.dataset.entry);
      });
      ghSetEntryButtonState(null);

      if(p)p.onclick=()=>setUiMode("general");
      if(g)g.onclick=()=>{
        setUiMode("greenhouse");
        const st=document.getElementById("greenhouseStatus");
        if(st)st.textContent="V5.1 已就緒・先選功能，再問分析內容";
      };
      if(close)close.onclick=()=>setUiMode("general");
      if(send)send.onclick=ghSend;
      // 5.2.6：每次載入預設一般模式，避免舊狀態/工作資料誤接管一般聊天。
      setUiMode("general");

      // 除錯用：把目前選中入口實際抓到的原始資料整段輸出成可複製文字，
      // 不用再靠螢幕截圖組出來的句子回推——直接看真正的資料本身。
      const debugBtn=document.getElementById("btnGreenhouseDebugExport");
      const debugOut=document.getElementById("greenhouseDebugOutput");
      if(debugBtn)debugBtn.onclick=()=>{
        if(!ghSelectedEntry){
          debugOut.style.display="block";
          debugOut.value="還沒選任何功能（產能／工作／計畫／施肥／打卡），沒有資料可以匯出。";
          return;
        }
        const cache=ghEntryCache[ghSelectedEntry];
        const meta=GH_ENTRY_META[ghSelectedEntry];
        const rows=cache?cache.rows:[];
        let debugLine="";
        if(ghSelectedEntry==="calendar" && window.__ghCalendarDebug){
          const dbg=window.__ghCalendarDebug;
          debugLine=`\n【撈取診斷】Firestore 原始文件數：${dbg.rawCount}　篩選後有效筆數：${dbg.filteredCount}\n原始 key 清單：${dbg.rawKeys.join("、")}\n`;
        }
        const header=`入口：${meta?meta.label:ghSelectedEntry}／${meta?meta.table:""}\n讀取時間：${cache?new Date(cache.loadedAt).toLocaleString("zh-TW"):"未知"}\n總筆數：${rows.length}\n${debugLine}\n以下是實際抓到的原始資料（可以整段複製貼給開發者比對）：\n`;
        debugOut.style.display="block";
        try{
          debugOut.value=header+JSON.stringify(rows,null,2);
        }catch(e){
          debugOut.value=header+"（JSON 序列化失敗："+e.message+"）";
        }
        debugOut.focus();debugOut.select();
      };
      if(input)input.addEventListener("keydown",e=>{if(e.key==="Enter")ghSend();});
      ghInitVoice();
      if(scan)scan.onclick=async()=>{
        scan.disabled=true;scan.textContent="掃描中…";
        try{
          await ghScanKeyPrefixes();
          ghLog("assistant","掃描完成");
        }catch(e){ghLog("assistant","掃描失敗："+e.message+"。請確認 Firebase Authentication 已啟用 Anonymous，且 Firestore kv 規則允許 request.auth != null。");}
        finally{scan.disabled=false;scan.textContent="🔍 掃描資料分類";}
      };
      const yf=document.getElementById("ghYieldImportFile");
      if(yf)yf.onchange=async()=>{
        const f=yf.files?.[0]; if(!f)return;
        try{ghLog("assistant",await ghHandleYieldImportFile(f));}
        catch(e){ghYieldImportDraft=null;document.getElementById("ghYieldImportConfirm").style.display="none";ghLog("assistant","歷史資料檢查失敗："+e.message);}
      };
      const yc=document.getElementById("btnYieldImportCommit");
      if(yc)yc.onclick=async()=>{
        yc.disabled=true;yc.textContent="匯入中…";
        try{const r=await ghYieldImportCommit();document.getElementById("ghYieldImportConfirm").style.display="none";ghLog("assistant",`歷史資料匯入完成：${r.rows} 筆，已寫入 ${r.groups} 個年度／溫室封存。現在可以進行跨月、跨年產能分析。`);}
        catch(e){ghLog("assistant","歷史資料匯入失敗："+e.message);}
        finally{yc.disabled=false;yc.textContent="確認匯入";}
      };
      const yx=document.getElementById("btnYieldImportCancel");
      if(yx)yx.onclick=()=>{ghYieldImportDraft=null;document.getElementById("ghYieldImportConfirm").style.display="none";ghLog("assistant","已取消歷史資料匯入。");};
      setUiMode("general");
    });

