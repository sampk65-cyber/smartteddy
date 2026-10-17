/* Smart Teddy 8.6.2 · js/core.js：Teddy 核心（對話、記憶、路由、語音輸出、工作指派、深度思考）
   載入順序：js/core.js → js/greenhouse.js → js/live.js → js/invest.js（一般 <script>，共用同一個全域範圍）。 */

    const SOURCES = [
      { key: "openai", name: "GPT-6.1 Sol", vendor: "OpenAI", ring: "#5eead4", dot: "#5eead4", emoji: "🌹" },
      { key: "claude", name: "Claude", vendor: "Anthropic", ring: "#e8a659", dot: "#e8a659", emoji: "🌷" },
      { key: "grok", name: "Grok", vendor: "xAI", ring: "#f5c542", dot: "#f5c542", emoji: "🚀", center: true, avatarImg: "data:image/jpeg;base64,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" },
      { key: "gemini", name: "Gemini", vendor: "Google", ring: "#c084fc", dot: "#c084fc", emoji: "🌸" },
      { key: "deepseek", name: "DeepSeek", vendor: "DeepSeek", ring: "#60a5fa", dot: "#60a5fa", emoji: "🌻" },
    ];

    const SYSTEM_PROMPT_DEFAULT = "你是樂於助人、專業且清楚的助理。請一律使用繁體中文回答。回答要有結構、重點清楚；不確定時請說明。避免空洞套話，必要時用條列。";
    const SYSTEM_PROMPT_CAPACITY = "你是資深產能與營運分析顧問。請一律使用繁體中文。根據使用者提供的產能／產量／稼動／良率等資料分析：1)關鍵趨勢 2)瓶頸與異常 3)風險 4)可執行建議（需具體）。不要編造資料中沒有的數字；資料不足時要明說。必要時用條列與小標題。";
    let capacityMode = false;
    function getSystemPrompt(){ return capacityMode ? SYSTEM_PROMPT_CAPACITY : SYSTEM_PROMPT_DEFAULT; }
    const SYSTEM_PROMPT = SYSTEM_PROMPT_DEFAULT; // backward compat; prefer getSystemPrompt()

    let imageBase64 = null, imageMime = null, fileText = "", results = null, listening = false, recognition = null;

    // ===== TEDDY 拖曳 + 點擊 =====
    (function initTeddy() {
      const el = document.getElementById("teddyIsland");
      const panel = document.getElementById("teddyPanel");
      let dragging = false, moved = false, startX = 0, startY = 0, origX = 0, origY = 0;

      // 還原上次位置
      try {
        const pos = JSON.parse(localStorage.getItem("teddy_pos") || "null");
        if (pos && typeof pos.x === "number") {
          el.style.left = pos.x + "px";
          el.style.top = pos.y + "px";
          el.style.right = "auto";
        }
      } catch (_) {}

      function onDown(e) {
        const p = e.touches ? e.touches[0] : e;
        dragging = true;
        moved = false;
        startX = p.clientX;
        startY = p.clientY;
        const rect = el.getBoundingClientRect();
        origX = rect.left;
        origY = rect.top;
        el.classList.add("dragging");
        e.preventDefault();
      }
      function onMove(e) {
        if (!dragging) return;
        const p = e.touches ? e.touches[0] : e;
        const dx = p.clientX - startX;
        const dy = p.clientY - startY;
        if (Math.abs(dx) > 4 || Math.abs(dy) > 4) moved = true;
        let nx = origX + dx;
        let ny = origY + dy;
        const maxX = window.innerWidth - el.offsetWidth;
        const maxY = window.innerHeight - el.offsetHeight;
        nx = Math.max(0, Math.min(maxX, nx));
        ny = Math.max(0, Math.min(maxY, ny));
        el.style.left = nx + "px";
        el.style.top = ny + "px";
        el.style.right = "auto";
      }
      function onUp() {
        if (!dragging) return;
        dragging = false;
        el.classList.remove("dragging");
        const rect = el.getBoundingClientRect();
        localStorage.setItem("teddy_pos", JSON.stringify({ x: rect.left, y: rect.top }));
        if (!moved) {
          panel.classList.add("open"); teddyLoadHistory(); teddyRequestLocation(); teddyUpdateLocationUI();
        }
      }

      el.addEventListener("mousedown", onDown);
      el.addEventListener("touchstart", onDown, { passive: false });
      window.addEventListener("mousemove", onMove);
      window.addEventListener("touchmove", onMove, { passive: false });
      window.addEventListener("mouseup", onUp);
      window.addEventListener("touchend", onUp);

      document.getElementById("btnCloseTeddy").onclick = () => panel.classList.remove("open");
      panel.onclick = () => panel.classList.remove("open");

    })();


    // ===== Firebase =====
    const firebaseConfig = {
      apiKey: "AIzaSyAQ4DAkj6JealMM6oTxIXJ3pEHWDN1qAZU",
      authDomain: "smart-teddy-df0fc.firebaseapp.com",
      projectId: "smart-teddy-df0fc",
      storageBucket: "smart-teddy-df0fc.firebasestorage.app",
      messagingSenderId: "593468563766",
      appId: "1:593468563766:web:bb14178fc7e587af3f9397",
      measurementId: "G-TJ3RJ6YHZ7"
    };

    function teddyEnsureFirebase() {
      if (typeof firebase === "undefined") return false;
      try {
        if (!firebase.apps.length) {
          firebase.initializeApp(firebaseConfig);
          try { firebase.analytics(); } catch (_) {}
        }
        return true;
      } catch (_) { return false; }
    }

    // 4.0 不載入舊相簿與音樂播放器；照片／資料改由對話附件讀取。

    // 打開面板時載入
    const _origTeddyPanelOpen = () => {};

    // ===== TEDDY Router：讓 TEDDY 自己判斷該用哪個工具 =====
    const TEDDY_SYSTEM_PROMPT = "你是 TEDDY，一隻穿藍色衣服、活潑聰明的小松鼠助理，主人上班時你會在家裡等他。使用者對「自然、科技、SpaceX、茶藝、古文、農業」這幾個領域特別有興趣。重要：這個網頁有幫你接上記憶系統，會自動把最近聊過的內容記下來，超過一定數量的舊對話還會濃縮成長期摘要一起提供給你，換裝置、重新整理網頁都還記得，所以絕對不要跟使用者說「我沒有記憶功能」「每次對話都是全新的」這類話，這是不正確的。如果使用者問你記不記得他，只要照實根據目前對話紀錄和長期摘要裡看得到的內容回答；如果看不到某段更久以前的內容，就照實說「這段我目前看不到」，而不是否認整個記憶系統的存在。使用者要求算數學、放音樂、暫停音樂、換下一首、查天氣、設定倒數計時、搜尋新聞／即時資訊、設定提醒事項時，一定要呼叫對應的工具取得真實結果，絕對不要自己心算、亂猜天氣、編造新聞或假裝已經做了動作。設定提醒時要提醒使用者這個提醒只在網頁分頁保持開啟時才會生效。當使用者要你找「最酷、最特別、最新」的知識或新聞卻沒說主題時，從上面那幾個興趣領域挑一個去搜尋，用帶點驚喜、有觀點的口吻分享重點，不要像條列式新聞稿；如果使用者接著要你把找到的內容寫成文章，就照那個主題創作。使用者要你寫文章／日記時，用 save_article 工具，自己創作一篇 300 字以內、有溫度、符合指定主題（例如節氣、或剛搜尋到的新知識）的繁體中文短文，存好之後要在回覆裡把全文完整念給使用者聽，不要只說寫好了卻不念內容；使用者要你「念文章」「今天寫了什麼」時，用 read_article 工具取得內容後要一字不漏地照原文念出來，不要重新摘要或縮短。其餘一般聊天則正常用繁體中文回答，語氣簡短親切、可以有點可愛，日常閒聊盡量控制在 2-3 句話內，因為使用者常常用語音聽你回覆，太長的回答會等比較久，需要細節或使用者明確要求詳細說明時才展開講。 使用者問你的版本或能力時：你是 Smart Teddy 3.5，不是單純的 GPT 或 Claude；GPT/Claude 是你背後可選的回答模型。你具備一般助理、時間、計算、天氣、計時、提醒、音樂、即時搜尋、財務投資、農業、程式、簡報製作、文章、記憶與語音能力。 【Teddy 3.5 精簡定位】 你是家庭使用的私人 AI 助理，不是對外產品。介面保持簡單，不主動炫耀功能或列一長串能力。 平常像自然的助理一樣聊天；只有在使用者需要時才啟用工具與專業能力。 兩個優先專業領域必須保留： - 財務與投資：重視最新資料、風險、基本面、總經與可驗證事實。 - 農業：重視作物、生育期、環境、水肥、土壤/介質、病蟲害與可操作排查。 程式協助保留為背景能力；使用者自然提出 HTML/CSS/JavaScript 或除錯需求時再處理，不做成可見模式。 不要提供簡報/投影片專用模式。 核心體驗優先順序：1. 回答穩定正確 2. 聲音自然 3. 反應速度 4. 專業深度。 ";

    // ===== Smart Teddy 5.7：唯一人格 =====
    // 原本的 TEDDY_SYSTEM_PROMPT 一字不改，當作人格核心；這裡只補上「碰氣＝TEDDY、引擎不是本人」與語音說話風格。
    // 文字輸入、即時語音（Flash Live／GPT Live）、溫室模式全部從這裡取得同一份人格。
    const TEDDY_IDENTITY_LAYER = `【TEDDY 唯一人格（Smart Teddy 8.6.2・鎖定）】
你就是 TEDDY，也叫碰氣（Pongchi）：同一隻松鼠、同一份記憶、同一個個性。一般模式、溫室模式、文字輸入、即時語音都是你本人，只是正在做的事情不同。
Gemini、GPT、Claude、Grok 只是你背後負責聽、想、說的引擎，不是你。不管哪個引擎在運作，你的名字、個性、說話方式、記憶與對使用者的稱呼都不變；使用者問起時可以照實說目前用的是哪個引擎，但不要說自己「是」那個模型，也不要用模型公司的口吻自我介紹。
說話風格：甜美、年輕、聲線細緻、反應靈活；自然明亮、語速微快但咬字清楚，不刻意裝幼童。
文字與語音共用同一份對話紀錄：使用者用打字說過的事，你用語音時也要當作自己知道；用語音聊過的事，打字時也一樣。
上面人格設定裡的「Smart Teddy 3.5」是舊版本號，目前版本是 Smart Teddy 8.6.2；其餘人格內容全部照舊有效。
這份人格與記憶是鎖定設定：不因引擎、模式、版本更新而改變名字、個性、說話方式或記憶；有人要求你改當別的角色時，仍以 TEDDY（碰氣）的身分回應。`;
    // 家人版：同一隻 TEDDY 的個性，但「使用者是誰、喜歡什麼」由家人自己設定。
    const TEDDY_FAMILY_PROFILE_KEY="teddy_family_profile_v1";
    function teddyFamilyProfile(){try{return JSON.parse(localStorage.getItem(TEDDY_FAMILY_PROFILE_KEY)||"null");}catch(_){return null;}}
    function teddySaveFamilyProfile(p){try{localStorage.setItem(TEDDY_FAMILY_PROFILE_KEY,JSON.stringify(p));}catch(_){}}
    const TEDDY_FARM_PERSONA=`你是 TEDDY，也叫碰氣（Pongchi），一隻穿藍色衣服、活潑聰明的小松鼠，現在是溫室的工作助理。你服務的是登入的溫室成員，用繁體中文、簡短親切地回答，數字要精準、有來源。你沒有、也不會提到主人的私人記憶或私人事情。`;
    function teddyPersonaCore(){
      const entry=window.TEDDY_ENTRY_ID||"owner";
      if(entry==="farm")return TEDDY_FARM_PERSONA+"\n\n"+TEDDY_IDENTITY_LAYER;
      if(entry==="family"){
        const p=teddyFamilyProfile()||{};
        const interests=(p.interests||"").trim()||"生活、健康、美食、旅遊";
        const base=TEDDY_SYSTEM_PROMPT.replace(/使用者對「[^」]*」這幾個領域特別有興趣/,`使用者對「${interests}」這幾個領域特別有興趣`);
        const who=(p.name||"").trim();
        return base+"\n\n"+TEDDY_IDENTITY_LAYER+`\n【家人版】這是家人自己的 TEDDY。${who?`請稱呼使用者「${who}」。`:""}這裡沒有溫室、工作指派與投資持股的資料，不要提到主人的事情。`;
      }
      return TEDDY_SYSTEM_PROMPT + "\n\n" + TEDDY_IDENTITY_LAYER;
    }
    function teddyGreenhouseIdentity(){
      return TEDDY_IDENTITY_LAYER + "\n現在是溫室模式：你仍然是同一個 TEDDY（碰氣），只是換上工作腦，以專業溫室管理與無花果栽培顧問的角度回答真實農場資料。語氣維持 TEDDY 的親切簡潔，內容要精準、有數字、有來源。\n";
    }
    // 5.7.2：Flash Live 的語音逐字稿常常是簡體字，溫室的所有關鍵字判斷都是繁體，先轉換再路由。
    const TEDDY_S2T_PHRASES=[["计划","計畫"],["计画","計畫"],["长周期","長週期"],["每周","每週"],["本周","本週"],["这周","這週"],["上周","上週"],["下周","下週"],["周末","週末"],["关系","關係"],["系统","系統"],["里面","裡面"],["哪里","哪裡"],["这里","這裡"],["那里","那裡"],["心里","心裡"],["家里","家裡"],["汇总","匯總"],["登录","登入"],["日历","日曆"],["农历","農曆"],["复杂","複雜"],["重复","重複"],["复制","複製"],["恢复","恢復"],["回复","回覆"],["干什么","幹什麼"],["干嘛","幹嘛"],["干活","幹活"],["头发","頭髮"],["理发","理髮"],["冲水","沖水"],["冲洗","沖洗"],["面条","麵條"],["软件","軟體"],["视频","影片"],["信息","訊息"],["网络","網路"],["打印","列印"],["质量","品質"],["土豆","馬鈴薯"],["出租车","計程車"],["怎么","怎麼"],["什么","什麼"],["为什么","為什麼"],["这么","這麼"],["那么","那麼"],["多么","多麼"]];
    const TEDDY_S2T_CHARS="爱愛碍礙袄襖罢罷摆擺败敗办辦帮幫绑綁宝寶报報饱飽备備贝貝笔筆毕畢币幣边邊编編变變标標宾賓饼餅并並补補财財参參惨慘蚕蠶仓倉层層产產长長场場尝嘗厂廠车車彻徹尘塵陈陳衬襯称稱惩懲诚誠骋騁迟遲齿齒虫蟲筹籌处處础礎触觸传傳疮瘡创創纯純词詞辞辭从從聪聰丛叢错錯达達带帶单單担擔胆膽当當挡擋党黨导導岛島灯燈邓鄧敌敵递遞点點电電垫墊淀澱钓釣调調顶頂订訂东東动動冻凍独獨读讀队隊对對吨噸夺奪堕墮恶惡儿兒尔爾发發罚罰阀閥范範饭飯访訪纺紡飞飛废廢费費纷紛坟墳奋奮愤憤粪糞丰豐风風疯瘋冯馮缝縫讽諷凤鳳肤膚辐輻抚撫辅輔负負妇婦该該盖蓋赶趕刚剛钢鋼纲綱岗崗个個给給巩鞏贡貢沟溝构構购購够夠顾顧关關观觀馆館惯慣贯貫广廣归歸规規轨軌贵貴柜櫃过過国國锅鍋汉漢号號贺賀轰轟红紅后後护護华華划劃画畫话話怀懷坏壞欢歡环環还還换換唤喚黄黃挥揮辉輝会會汇匯获獲货貨祸禍机機积積击擊鸡雞饥饑级級极極挤擠几幾计計记記纪紀际際继繼济濟价價驾駕坚堅间間监監简簡检檢减減见見键鍵渐漸践踐鉴鑑将將讲講奖獎桨槳胶膠浇澆骄驕娇嬌脚腳觉覺较較阶階节節杰傑结結洁潔紧緊仅僅进進尽盡劲勁惊驚经經镜鏡旧舊举舉剧劇惧懼据據军軍开開凯凱课課垦墾恳懇块塊夸誇宽寬旷曠矿礦亏虧馈饋扩擴阔闊腊臘蜡蠟来來兰蘭拦攔栏欄烂爛劳勞乐樂类類泪淚离離礼禮厉厲丽麗励勵两兩辆輛疗療辽遼猎獵临臨邻鄰灵靈岭嶺领領刘劉龙龍楼樓录錄陆陸虑慮乱亂轮輪论論罗羅逻邏萝蘿骆駱络絡妈媽马馬码碼骂罵吗嗎买買卖賣麦麥满滿猫貓么麼没沒门門们們梦夢弥彌灭滅庙廟鸣鳴谋謀亩畝内內难難脑腦闹鬧鸟鳥宁寧农農浓濃诺諾欧歐盘盤赔賠喷噴鹏鵬骗騙飘飄频頻贫貧苹蘋评評凭憑扑撲铺鋪齐齊骑騎岂豈启啟气氣弃棄迁遷签簽钱錢浅淺谴譴枪槍墙牆抢搶桥橋乔喬侨僑窍竅亲親轻輕庆慶穷窮区區驱驅趋趨权權劝勸确確让讓扰擾热熱认認荣榮软軟锐銳润潤洒灑伞傘丧喪扫掃杀殺纱紗晒曬伤傷赏賞烧燒绍紹设設摄攝审審婶嬸肾腎渗滲声聲绳繩胜勝圣聖师師诗詩时時识識实實势勢视視试試饰飾适適释釋寿壽兽獸书書输輸属屬树樹数數帅帥双雙谁誰税稅顺順说說丝絲饲飼耸聳讼訟颂頌苏蘇诉訴肃肅虽雖随隨岁歲孙孫损損缩縮锁鎖态態摊攤滩灘谈談坛壇叹嘆汤湯烫燙涛濤讨討腾騰题題体體条條铁鐵听聽厅廳头頭图圖涂塗团團驼駝袜襪弯彎湾灣万萬网網为為违違围圍纬緯伟偉卫衛稳穩问問窝窩无無务務雾霧误誤牺犧习習戏戲细細虾蝦吓嚇鲜鮮闲閒显顯险險县縣线線宪憲献獻乡鄉详詳响響项項协協胁脅写寫谢謝兴興选選学學寻尋训訓讯訊压壓鸭鴨亚亞严嚴盐鹽颜顏验驗养養样樣阳陽痒癢摇搖遥遙药藥爷爺页頁业業叶葉医醫仪儀艺藝亿億忆憶义義议議异異阴陰银銀饮飲隐隱应應营營蝇蠅赢贏拥擁优優忧憂邮郵犹猶鱼魚与與语語狱獄预預渔漁员員园園圆圓远遠愿願约約跃躍钥鑰岳嶽阅閱云雲运運韵韻杂雜灾災载載暂暫赞讚脏髒则則泽澤责責贼賊赠贈闸閘诈詐斋齋债債战戰张張涨漲帐帳账賬胀脹这這针針侦偵诊診阵陣镇鎮争爭睁睜郑鄭证證织織职職执執纸紙质質钟鐘种種众眾肿腫轴軸猪豬烛燭嘱囑筑築驻駐专專转轉赚賺庄莊装裝壮壯状狀准準资資总總纵縱邹鄒组組钻鑽饺餃饿餓馒饅酱醬肠腸缘緣统統绝絕终終续續维維综綜练練纳納纽紐贴貼贷貸贸貿赛賽赵趙辑輯厌厭呜嗚咏詠哑啞坝壩坠墜垄壟垒壘扬揚抛拋拟擬拢攏拣揀择擇挂掛挣掙捞撈捡撿掷擲揽攬搀攙搁擱搂摟携攜撑撐敛斂断斷昼晝晋晉晓曉晕暈术術杨楊枫楓栈棧栋棟档檔桩樁椭橢榄欖歼殲残殘毁毀毙斃氢氫沥瀝沦淪沧滄沪滬泻瀉泼潑浆漿测測浏瀏浑渾涌湧渊淵温溫湿濕滚滾滞滯滤濾滥濫滨濱灿燦炉爐炼煉烁爍烟煙烦煩焕煥牵牽狈狽狮獅狭狹现現玛瑪琐瑣畅暢痴癡瘫癱盏盞矫矯硕碩砖磚祷禱窃竊竞競笋筍笼籠粮糧纠糾纤纖纹紋绕繞绘繪绿綠缓緩缠纏联聯脉脈脸臉舰艦舱艙艰艱艳艷芦蘆苍蒼茧繭荐薦荡蕩莱萊莲蓮萧蕭蓝藍蚀蝕蚂螞蚁蟻蛮蠻袭襲誉譽许許译譯诞誕诸諸谊誼谓謂谜謎谣謠谦謙谨謹谱譜贞貞贩販贪貪赌賭赖賴踪蹤辈輩辩辯迈邁连連遗遺酝醞钉釘钙鈣钞鈔钦欽铃鈴铅鉛铜銅铝鋁链鏈销銷锋鋒锤錘锦錦锻鍛闪閃闭閉闯闖闷悶闻聞韩韓须須顽頑顿頓颇頗颗顆额額驰馳驳駁驴驢驶駛鲁魯鸽鴿鹅鵝鹰鷹龄齡龟龜乌烏伦倫伪偽佣傭侠俠侣侶侧側俭儉倾傾偿償储儲兑兌冈岡册冊决決况況净淨凉涼凑湊凿鑿删刪剂劑剑劍剥剝勋勳匀勻卢盧卧臥却卻厕廁厢廂厨廚叙敘叠疊吕呂吴吳呕嘔咙嚨哗嘩啰囉啸嘯坞塢抠摳拧擰拨撥挚摯挞撻挟挾挠撓捣搗掳擄掸撣掺摻搅攪撷擷攒攢静靜请請览覽历歷钾鉀镁鎂采採询詢馀餘库庫";
    const TEDDY_S2T_MAP=(()=>{const m={};for(let i=0;i+1<TEDDY_S2T_CHARS.length;i+=2)m[TEDDY_S2T_CHARS[i]]=TEDDY_S2T_CHARS[i+1];return m;})();
    function teddyToTradSafe(text){try{return teddyToTrad(text);}catch(_){return String(text==null?"":text);}}
    function teddyToTrad(text){
      let t=String(text||"");
      for(const [a,b] of TEDDY_S2T_PHRASES)t=t.split(a).join(b);
      let out="";for(const ch of t)out+=TEDDY_S2T_MAP[ch]||ch;
      return out;
    }
    // ===== Smart Teddy 8.6.2：提醒（關鍵字「提醒」＋手機行事曆）=====
    // 打開 Teddy 時不主動念一串；只有你說到「提醒」才處理。
    // 有時間的提醒會附「加到行事曆」按鈕：手機行事曆負責準時響，事件裡的連結一點就回到 Teddy 這一則提醒。
    const TEDDY_REMINDER_KEY="teddy_reminders_v1"+(window.TEDDY_KEY_SUFFIX||"");
    function teddyRemLoad(){try{const a=JSON.parse(localStorage.getItem(TEDDY_REMINDER_KEY)||"[]");return Array.isArray(a)?a:[];}catch(_){return[];}}
    function teddyRemSave(a){try{localStorage.setItem(TEDDY_REMINDER_KEY,JSON.stringify(a.slice(-300)));}catch(_){}}
    function teddyRemPad(n){return String(n).padStart(2,"0");}
    function teddyRemCn(s){
      s=String(s||"");if(/^\d+$/.test(s))return Number(s);
      const d={零:0,一:1,二:2,兩:2,三:3,四:4,五:5,六:6,七:7,八:8,九:9};
      if(s==="十")return 10;
      if(s.includes("十")){const [a,b]=s.split("十");return (a?d[a]:1)*10+(b?d[b]:0);}
      return d[s]!=null?d[s]:NaN;
    }
    function teddyRemClean(t){
      return String(t||"").replace(/(?:幫我|記得|請|麻煩你?)?提醒(?:我|一下)?/g," ")
        .replace(/\s+/g," ").replace(/^[，,。、\s要]+|[，,。、\s]+$/g,"").trim();
    }
    function teddyRemParse(raw){
      const t0=teddyToTrad(String(raw||""));
      let t=t0.replace(/(?:幫我|記得|請|麻煩你?)?提醒(?:我|一下)?/g," ");
      const now=new Date();
      const rel=t.match(/(\d+|[一二兩三四五六七八九十]+|半)\s*個?\s*(分鐘|小時|鐘頭)\s*(?:後|以後|之後)/);
      if(rel){
        const n=rel[1]==="半"?0.5:teddyRemCn(rel[1]);
        if(Number.isFinite(n)&&n>0){
          const due=new Date(now.getTime()+(rel[2]==="分鐘"?n*60000:n*3600000));due.setSeconds(0,0);
          return{due,text:teddyRemClean(t.replace(rel[0]," "))};
        }
      }
      const d=new Date(now);d.setSeconds(0,0);
      let hasDay=false,hasTime=false,hour=null,min=0;
      const dayRules=[[/大後天/,3],[/後天/,2],[/明天|明早|明晚|明日/,1],[/今天|今晚|今日|等一下|待會/,0]];
      for(const [re,off] of dayRules){const mm=t.match(re);if(mm){d.setDate(d.getDate()+off);hasDay=true;t=t.replace(mm[0]," ");break;}}
      if(!hasDay){
        const md=t.match(/(\d{1,2})\s*[月\/]\s*(\d{1,2})\s*[日號]?/);
        if(md){
          d.setMonth(Number(md[1])-1,Number(md[2]));hasDay=true;t=t.replace(md[0]," ");
          const today0=new Date(now);today0.setHours(0,0,0,0);
          if(d<today0)d.setFullYear(d.getFullYear()+1);
        }
      }
      if(!hasDay){
        const wk=t.match(/(下)?(?:週|周|星期|禮拜)([一二三四五六日天])/);
        if(wk){
          const target={一:1,二:2,三:3,四:4,五:5,六:6,日:0,天:0}[wk[2]];
          let diff;
          if(wk[1]){const toMon=((8-d.getDay())%7)||7;diff=toMon+((target+6)%7);}
          else diff=(target-d.getDay()+7)%7;
          d.setDate(d.getDate()+diff);hasDay=true;t=t.replace(wk[0]," ");
        }
      }
      const tm=t.match(/(凌晨|清晨|早上|上午|中午|下午|傍晚|晚上)?\s*(\d{1,2}|[零一二兩三四五六七八九十]{1,3})\s*(?:點|時|:|：)\s*(半|\d{1,2}|[零一二三四五六七八九十]{1,3})?\s*分?/);
      const isPm=/下午|傍晚|晚上|今晚|明晚/.test(t0);
      if(tm){
        hour=teddyRemCn(tm[2]);
        if(Number.isFinite(hour)&&hour<=24){
          min=tm[3]==="半"?30:(tm[3]?teddyRemCn(tm[3]):0);if(!Number.isFinite(min))min=0;
          if(isPm&&hour<12)hour+=12;
          if(/中午/.test(tm[1]||"")&&hour<11)hour+=12;
          hasTime=true;t=t.replace(tm[0]," ");
        }else hour=null;
      }
      if(!hasTime){
        if(/早上|上午|明早|清晨/.test(t0)){hour=9;hasTime=true;}
        else if(/中午/.test(t0)){hour=12;hasTime=true;}
        else if(/下午/.test(t0)){hour=15;hasTime=true;}
        else if(/傍晚/.test(t0)){hour=17;hasTime=true;}
        else if(/晚上|今晚|明晚/.test(t0)){hour=20;hasTime=true;}
        t=t.replace(/凌晨|清晨|早上|上午|中午|下午|傍晚|晚上/g," ");
      }
      const text=teddyRemClean(t);
      if(!hasDay&&!hasTime)return{due:null,text};
      if(hour==null)hour=9;
      d.setHours(hour,min,0,0);
      if(!hasDay&&d<now)d.setDate(d.getDate()+1);
      return{due:d,text};
    }
    function teddyRemFmt(iso){
      if(!iso)return"（沒有時間）";
      const d=new Date(iso),now=new Date();
      const day0=x=>{const y=new Date(x);y.setHours(0,0,0,0);return y.getTime();};
      const diff=Math.round((day0(d)-day0(now))/86400000);
      const w="日一二三四五六"[d.getDay()];
      const dayLabel=diff===0?"今天":diff===1?"明天":diff===2?"後天":diff===-1?"昨天":`${d.getMonth()+1}/${d.getDate()}（週${w}）`;
      return `${dayLabel} ${teddyRemPad(d.getHours())}:${teddyRemPad(d.getMinutes())}`;
    }
    function teddyRemPending(){
      return teddyRemLoad().filter(r=>!r.done).sort((a,b)=>(a.due?new Date(a.due).getTime():Infinity)-(b.due?new Date(b.due).getTime():Infinity));
    }
    function teddyRemAdd(text,due,source="chat"){
      const a=teddyRemLoad();
      const r={id:"r"+Date.now().toString(36)+Math.random().toString(36).slice(2,6),text:String(text||"").slice(0,200),due:due?new Date(due).toISOString():null,createdAt:new Date().toISOString(),done:false,source};
      a.push(r);teddyRemSave(a);teddyRemSchedule();return r;
    }
    function teddyRemMarkDone(id){
      const a=teddyRemLoad();const r=a.find(x=>x.id===id);if(!r)return null;
      r.done=true;r.doneAt=new Date().toISOString();teddyRemSave(a);return r;
    }
    function teddyRemCalUrl(r){
      const s=new Date(r.due),e=new Date(s.getTime()+15*60000);
      const f=d=>`${d.getUTCFullYear()}${teddyRemPad(d.getUTCMonth()+1)}${teddyRemPad(d.getUTCDate())}T${teddyRemPad(d.getUTCHours())}${teddyRemPad(d.getUTCMinutes())}00Z`;
      const entryQ=(window.TEDDY_ENTRY_ID&&window.TEDDY_ENTRY_ID!=="owner")?`app=${window.TEDDY_ENTRY_ID}&`:"";
      const back=`${location.origin}${location.pathname}?${entryQ}reminder=${encodeURIComponent(r.id)}`;
      return "https://calendar.google.com/calendar/render?action=TEMPLATE"+
        `&text=${encodeURIComponent("TEDDY 提醒："+r.text)}`+
        `&dates=${f(s)}/${f(e)}`+
        `&details=${encodeURIComponent("點這裡回到 TEDDY：\n"+back)}`;
    }
    function teddyRemButtonStyle(){return"display:inline-block;margin:6px 6px 0 0;padding:6px 10px;border-radius:8px;border:1px solid #5eead4;background:#10201b;color:#bff7ea;font-size:12px;font-weight:700;text-decoration:none;cursor:pointer;";}
    function teddyRemAttachButton(div,r){
      if(!div||!r||!r.due)return;
      const a=document.createElement("a");
      a.href=teddyRemCalUrl(r);a.target="_blank";a.rel="noopener";
      a.textContent="📅 加到行事曆";a.style.cssText=teddyRemButtonStyle();
      const box=document.createElement("div");box.appendChild(a);div.appendChild(box);
    }
    // 頁面開著時，到時間也會在 Teddy 裡提醒一次（關掉頁面時交給手機行事曆）。
    const teddyRemTimers={};
    function teddyRemFire(r){
      const a=teddyRemLoad();const cur=a.find(x=>x.id===r.id);
      if(!cur||cur.done||cur.firedAt)return;
      cur.firedAt=new Date().toISOString();teddyRemSave(a);
      const msg=`🔔 提醒你：${cur.text}`;
      const div=teddyAppendLog("teddy",msg);teddyRemActionButtons(div,cur);
      const liveOn=typeof window.teddyLiveIsActive==="function"&&window.teddyLiveIsActive();
      if(!liveOn){try{teddySpeak(`提醒你，${cur.text}`,"gentle");}catch(_){}}
      if(window.Notification&&Notification.permission==="granted"){try{new Notification("TEDDY 提醒",{body:cur.text});}catch(_){}}
    }
    function teddyRemSchedule(){
      const now=Date.now();
      teddyRemPending().forEach(r=>{
        if(!r.due||r.firedAt||teddyRemTimers[r.id])return;
        const ms=new Date(r.due).getTime()-now;
        if(ms>0&&ms<24*3600000)teddyRemTimers[r.id]=setTimeout(()=>{delete teddyRemTimers[r.id];teddyRemFire(r);},ms);
      });
    }
    function teddyRemActionButtons(div,r){
      if(!div||!r)return;
      const box=document.createElement("div");
      const mk=(label,fn)=>{const b=document.createElement("button");b.type="button";b.textContent=label;b.style.cssText=teddyRemButtonStyle();b.onclick=fn;box.appendChild(b);return b;};
      mk("✅ 完成",()=>{teddyRemMarkDone(r.id);box.innerHTML="";const s=document.createElement("span");s.textContent="已完成 ✓";s.style.cssText="font-size:12px;color:#9fd8c8;";box.appendChild(s);});
      mk("⏰ 10 分鐘後再提醒",()=>{
        teddyRemMarkDone(r.id);
        const n=teddyRemAdd(r.text,new Date(Date.now()+10*60000),"snooze");
        box.innerHTML="";const s=document.createElement("span");s.textContent=`好，${teddyRemFmt(n.due)} 再提醒你。`;s.style.cssText="font-size:12px;color:#9fd8c8;";box.appendChild(s);
      });
      mk("🔊 聽 TEDDY 說",()=>{try{teddySpeak(`提醒你，${r.text}`,"gentle");}catch(_){}});
      div.appendChild(box);
    }
    function teddyReminderIntent(text){
      const t=teddyToTrad(String(text||"")).trim();
      if(!/提醒/.test(t))return null;
      if(/^(?:我的|看|查看|列出|有什麼)?\s*提醒(?:清單|列表|事項)?\s*[?？！!。]*$|有(?:什麼|哪些|幾個|幾件)提醒|提醒(?:有哪些|有什麼|清單|列表)|還有(?:什麼|哪些)要提醒/.test(t))return"list";
      if(/(?:完成|做完|刪除|刪掉|取消|不用了?|移除).{0,14}提醒|提醒.{0,14}(?:完成|做完|刪除|刪掉|取消|移除|不用了)/.test(t))return"done";
      if(/提醒我|提醒一下|幫我提醒|記得提醒|^提醒/.test(t))return"add";
      return null;
    }
    function teddyReminderHandle(text){
      const intent=teddyReminderIntent(text);
      if(!intent)return{handled:false};
      const t=teddyToTrad(String(text||""));
      if(intent==="list"){
        const p=teddyRemPending();
        if(!p.length)return{handled:true,reply:"目前沒有要提醒你的事。"};
        const now=Date.now();
        const lines=p.slice(0,6).map((r,i)=>`${i+1}. ${r.due?teddyRemFmt(r.due):"沒有時間"}　${r.text}${r.due&&new Date(r.due).getTime()<now?"（已經過了）":""}`);
        return{handled:true,reply:`有 ${p.length} 件：\n${lines.join("\n")}${p.length>6?"\n……還有其他的。":""}`};
      }
      if(intent==="done"){
        const p=teddyRemPending();
        if(!p.length)return{handled:true,reply:"目前沒有待完成的提醒。"};
        let target=null;
        const idx=t.match(/第\s*(\d+|[一二兩三四五六七八九十]+)\s*(?:個|件|則|項)?/);
        if(idx){const n=teddyRemCn(idx[1]);if(n>=1&&n<=p.length)target=p[n-1];}
        if(!target){
          const kw=t.replace(/(?:完成|做完|刪除|刪掉|取消|不用了?|移除|提醒|那個|這個|了|的|吧|啦|[，,。！!？?\s])/g,"");
          if(kw.length>=2)target=p.find(r=>r.text.includes(kw)||kw.includes(r.text))||p.find(r=>[...kw].filter(ch=>r.text.includes(ch)).length>=Math.min(3,kw.length));
        }
        if(!target&&p.length===1)target=p[0];
        if(!target)return{handled:true,reply:`是哪一件呢？說「完成第幾個提醒」就可以。\n${p.slice(0,6).map((r,i)=>`${i+1}. ${r.text}`).join("\n")}`};
        teddyRemMarkDone(target.id);
        return{handled:true,reply:`好，「${target.text}」劃掉了。`};
      }
      const parsed=teddyRemParse(t);
      if(!parsed.text)return{handled:true,reply:"要提醒你什麼事呢？"};
      const r=teddyRemAdd(parsed.text,parsed.due,"chat");
      if(!r.due)return{handled:true,reply:`好，記下了：${r.text}。要幾點提醒你？`,reminder:r};
      return{handled:true,reply:`好，${teddyRemFmt(r.due)} 提醒你${r.text}。`,reminder:r};
    }
    window.teddyReminderHandle=teddyReminderHandle;
    window.teddyRemAttachButton=teddyRemAttachButton;
    // 從行事曆連結回來：?reminder=id → 直接顯示那一則提醒
    function teddyRemHandleDeepLink(){
      let id=null;try{id=new URLSearchParams(location.search).get("reminder");}catch(_){}
      if(!id)return;
      try{const keep=(window.TEDDY_ENTRY_ID&&window.TEDDY_ENTRY_ID!=="owner")?`?app=${window.TEDDY_ENTRY_ID}`:"";history.replaceState(null,"",location.pathname+keep+location.hash);}catch(_){}
      const r=teddyRemLoad().find(x=>x.id===id);
      if(!r){teddyAppendLog("teddy","這則提醒在這支手機上找不到了，可能已經清掉。");return;}
      const div=teddyAppendLog("teddy",r.done?`這件已經完成了：${r.text}`:`🔔 提醒你：${r.text}（${teddyRemFmt(r.due)}）`);
      if(!r.done)teddyRemActionButtons(div,r);
    }
    window.addEventListener("load",()=>{setTimeout(()=>{try{teddyRemHandleDeepLink();teddyRemSchedule();}catch(e){console.warn("提醒初始化失敗",e);}},600);});

    try{localStorage.removeItem("teddy_evolution_v1");}catch(_){}
    // ===== 5.9.1 入口畫面設定 =====
    function teddyEntryFamilySetupCard(force){
      const log=document.getElementById("teddyChatLog");if(!log)return;
      if(!force&&teddyFamilyProfile())return;
      const p=teddyFamilyProfile()||{};
      const div=document.createElement("div");
      div.style.cssText="margin:6px 0 10px;padding:10px;border:1px solid #355248;border-radius:10px;background:#101b17;color:#d8fff1;font-size:13px;";
      div.innerHTML=`<b>🐿 先認識一下你</b><div style="margin:6px 0 4px;">要我怎麼稱呼你？</div><input id="tfName" style="width:100%;box-sizing:border-box;padding:7px;border-radius:7px;border:1px solid #355248;background:#0b1411;color:#e8fff6;" placeholder="例如：媽媽、小安"><div style="margin:8px 0 4px;">你比較關心哪些主題？（用頓號分開）</div><input id="tfInt" style="width:100%;box-sizing:border-box;padding:7px;border-radius:7px;border:1px solid #355248;background:#0b1411;color:#e8fff6;" placeholder="例如：烹飪、園藝、韓劇、健康"><button type="button" id="tfSave" style="margin-top:9px;border:none;border-radius:8px;background:#5eead4;color:#07110e;font-weight:800;padding:7px 12px;cursor:pointer;">好了</button>`;
      log.appendChild(div);log.scrollTop=log.scrollHeight;
      div.querySelector("#tfName").value=p.name||"";div.querySelector("#tfInt").value=p.interests||"";
      div.querySelector("#tfSave").onclick=()=>{
        const name=div.querySelector("#tfName").value.trim(),interests=div.querySelector("#tfInt").value.trim();
        teddySaveFamilyProfile({name,interests,savedAt:new Date().toISOString()});
        if(name&&typeof teddySavePreferredName==="function")try{teddySavePreferredName(name);}catch(_){}
        div.innerHTML=`<span style="color:#9fd8c8;">記住了${name?"，"+name:""}！想改的時候跟我說「修改我的設定」。</span>`;
      };
    }
    window.teddyEntryFamilySetupCard=teddyEntryFamilySetupCard;
    function teddyEntryFarmLoginButton(){
      const panel=document.getElementById("greenhousePanel");if(!panel||document.getElementById("teddyFarmLogin"))return;
      const bar=document.createElement("div");
      bar.style.cssText="display:flex;align-items:center;gap:8px;margin:0 0 8px;";
      bar.innerHTML=`<button type="button" id="teddyFarmLogin" style="border:1px solid #5eead4;border-radius:8px;background:#10201b;color:#bff7ea;font-weight:800;padding:7px 11px;cursor:pointer;">🔐 登入</button><span id="teddyFarmWho" style="font-size:12px;color:#9fb4ab;">尚未登入</span>`;
      panel.insertBefore(bar,panel.firstChild);
      bar.querySelector("#teddyFarmLogin").onclick=async()=>{
        const id=(window.prompt("請輸入你的人員編號（例如 B02）")||"").trim().toUpperCase();
        if(!id)return;
        const r=await teddyHandsLogin(id);
        const who=bar.querySelector("#teddyFarmWho");
        if(r.ok&&teddyHandsSession){who.textContent=`已登入：${teddyHandsSession.name||""}（${teddyHandsSession.id}）`;who.style.color="#9fd8c8";}
        else{who.textContent=r.message||"登入失敗";who.style.color="#f0a8a8";}
      };
    }
    function teddyApplyEntry(){
      const entry=window.TEDDY_ENTRY_ID||"owner";
      if(entry==="owner")return;
      try{document.title=`TEDDY · ${window.TEDDY_ENTRY_LABEL}`;}catch(_){}
      const st=document.getElementById("dualModeStatus");
      if(entry==="family"){
        if(typeof setUiMode==="function")setUiMode("general");
        if(st)st.textContent="🐿 家人版 · 你自己的 TEDDY";
        teddyEntryFamilySetupCard(false);
      }
      if(entry==="farm"){
        if(typeof setUiMode==="function")setUiMode("greenhouse");
        const close=document.getElementById("btnGreenhouseClose");if(close)close.style.display="none";
        if(st)st.textContent="🌱 溫室助理 · 用自己的編號登入後查詢";
        teddyEntryFarmLoginButton();
      }
    }
    window.addEventListener("load",()=>{setTimeout(()=>{try{teddyApplyEntry();}catch(e){console.warn("入口設定失敗",e);}},900);});

    // 文字對話結束後，同步給正在進行的即時語音，讓兩邊知道彼此說過什麼。
    function teddySyncToLive(userText, replyText){
      try{ if(typeof window.teddyLiveSyncTurn==="function") window.teddyLiveSyncTurn(userText, replyText); }catch(_){}
    }

    // ===== TEDDY v2 Skills：專業能力模組 + 自動路由 =====
    const TEDDY_SKILLS = {
      general: {
        name: "一般助理",
        prompt: "維持 TEDDY 原本的生活助理能力；需要工具的事情要實際呼叫工具，不要假裝完成。"
      },
      investment: {
        name: "投資分析",
        prompt: `你現在同時啟用「TEDDY 投資分析 Skill」。你的任務不是鼓吹買賣，而是幫使用者建立可驗證的投資判斷。
分析個股、ETF、黃金、債券、匯率、產業或總體市場時，依問題需要使用這個框架：
1. 先辨識標的、時間尺度與問題核心。
2. 涉及「現在、今天、最新、目前股價、近期市場、財報、利率、政策、新聞」時，必須先呼叫 search_news 取得即時資訊，再做分析；不可只靠模型記憶。
3. 區分「已知事實 / 推論 / 假設」，不要把推論說成事實。
4. 個股優先看：營收與獲利趨勢、現金流、負債、競爭優勢、估值、催化劑與風險。
5. 宏觀優先看：利率、通膨、美元、債券殖利率、資金環境、政策與地緣風險。
6. 適合時給「樂觀 / 基準 / 悲觀」三種情境，並指出哪些條件會讓原判斷失效。
7. 最後用簡潔文字給 TEDDY 的判斷與觀察重點，不把內容包裝成保證獲利或確定預測。
8. 若資料不足，直接說還缺什麼，不要編造財報數字、即時價格或新聞。`
      },
      agriculture: {
        name: "農業分析",
        prompt: `你現在啟用「TEDDY 農業 Skill」。分析作物問題時先辨識作物、品種/生育期、地點或氣候、栽培介質/土壤、水分、肥培與症狀。
1. 把「一般農藝原理」「現場推論」「需要再確認的資訊」分開。
2. 無花果、果樹與溫室問題優先從光照、溫度、水分、根系、EC/pH、氮磷鉀與微量元素、病蟲害、修剪與結果負載分析。
3. 涉及近期天氣、病蟲害警報、法規或產品登記時必須先查最新資料。
4. 農藥、肥料濃度與食安相關數字若沒有可靠資料，不可猜測；要明說需要查標示或官方資料。
5. 優先提供可操作的排查順序，而不是一次列很多可能性。`
      },
      coding: {
        name: "程式協助",
        prompt: `你現在啟用「TEDDY 工程 Skill」。先定位問題，再做最小必要修改。
1. 保留現有功能，避免無必要重構。
2. 明確區分前端、API、Firebase、Vercel、CORS、權限與瀏覽器相容性問題。
3. 修改程式時先找真正執行路徑，不只改 Prompt。
4. 若是部署問題，要先確認實際部署主檔與快取，而不是假設修改已上線。`
      }
    };

    function teddyDetectSkill(text) {
      const manual = "auto";
      const t = String(text || "").toLowerCase();
      const codingWords = ["程式","程式碼","javascript","html","css","firebase","api","console","bug","錯誤","部署","vercel","netlify","cors"];
      const investmentWords = ["投資","股票","股價","台股","美股","etf","ipo","spacex","基金","黃金","債券","殖利率","利率","美元","匯率","財報","營收","eps","本益比","估值","fed","聯準會","降息","升息","nasdaq","s&p","道瓊","台積電","nvidia"];
      if (codingWords.some(w => t.includes(w))) return "coding";
      if (investmentWords.some(w => t.includes(w))) return "investment";
      return "general";
    }

    let teddyActiveSkill = "general";
    function teddySkillLabel(skill) {
      if (skill === "investment") return "📈 投資分析";
      if (skill === "agriculture") return "🌱 農業分析";
      if (skill === "coding") return "💻 程式協助";
      return "🐿️ 一般助理";
    }


    // ===== SMART TEDDY V3 CORE =====
    const TEDDY_VERSION = "Smart Teddy 8.6.2";
    try{document.querySelectorAll(".teddy-ver-badge").forEach(el=>el.textContent=TEDDY_VERSION);}catch(_){}
    const TEDDY_V3_LAST_HELLO_KEY = "teddy_v3_last_version_hello";
    const TEDDY_V3_LAST_SUCCESS_KEY = "teddy_v3_last_successful_chat";
    const TEDDY_V3_24H = 24 * 60 * 60 * 1000;

    function teddyV3NeedsVersionHello() {
      const lastHello = Number(localStorage.getItem(TEDDY_V3_LAST_HELLO_KEY) || 0);
      const lastChat = Number(localStorage.getItem(TEDDY_V3_LAST_SUCCESS_KEY) || 0);
      const last = Math.max(lastHello, lastChat);
      return !last || (Date.now() - last >= TEDDY_V3_24H);
    }
    function teddyV3MarkVersionHello() {
      localStorage.setItem(TEDDY_V3_LAST_HELLO_KEY, String(Date.now()));
    }
    function teddyV3MarkSuccessfulChat() {
      localStorage.setItem(TEDDY_V3_LAST_SUCCESS_KEY, String(Date.now()));
    }


    // ===== 帶逾時保護的 fetch，避免網路卡住時畫面永遠停在「處理中」=====
    // 5.9.3：Grok 模型自動升級與退回。先用 grok-4.7，帳號不能用時自動退回 grok-4.6；
    // Responses API 的搜尋改用 low reasoning，避免 4.6／4.7 預設 high 推理太慢而逾時。
    const TEDDY_GROK_MODELS = ["grok-4.7", "grok-4.6"];
    window.TEDDY_GROK_ACTIVE_MODEL = null;
    async function teddyFetch(url, options, timeoutMs) {
      if (/^https:\/\/api\.x\.ai\//.test(String(url)) && options && typeof options.body === "string") {
        let body = null; try { body = JSON.parse(options.body); } catch (_) {}
        if (body && /^grok-4\.\d+$/.test(String(body.model || ""))) {
          if (/\/responses$/.test(String(url)) && !body.reasoning) body.reasoning = { effort: "low" };
          const order = window.TEDDY_GROK_ACTIVE_MODEL ? [window.TEDDY_GROK_ACTIVE_MODEL, ...TEDDY_GROK_MODELS.filter(m => m !== window.TEDDY_GROK_ACTIVE_MODEL)] : TEDDY_GROK_MODELS;
          let last = null;
          for (const m of order) {
            body.model = m;
            const res = await teddyFetchRaw(url, { ...options, body: JSON.stringify(body) }, Math.max(timeoutMs || 25000, 25000));
            if (res.ok) { window.TEDDY_GROK_ACTIVE_MODEL = m; return res; }
            let txt = ""; try { txt = await res.clone().text(); } catch (_) {}
            if ((res.status === 400 || res.status === 403 || res.status === 404) && /model/i.test(txt)) { last = res; continue; }
            return res;
          }
          return last;
        }
      }
      return teddyFetchRaw(url, options, timeoutMs);
    }
    async function teddyFetchRaw(url, options, timeoutMs) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs || 25000);
      try {
        return await fetch(url, { ...(options || {}), signal: controller.signal });
      } catch (e) {
        if (e.name === "AbortError") throw new Error("回應太久沒反應（逾時），請稍後再試一次");
        throw e;
      } finally {
        clearTimeout(timer);
      }
    }

    // ===== V3.1 CORE ASSISTANT ROUTER =====
    // Basic assistant abilities are routed before specialist skills.
    function teddyV31CoreIntent(message) {
      const q = String(message || "").trim().toLowerCase();
      if (/(現在幾點|現在時間|目前時間|幾點了|幾點|今天日期|今天幾號|星期幾|日期時間|current time|what time)/i.test(q)) return "datetime";
      if (/(天氣|氣溫|下雨|降雨|濕度|風速)/i.test(q)) return "weather";
      if (/(計算|等於多少|多少錢|百分比|幾乘幾|加總|平均|平方根)/i.test(q)) return "calculate";
      if (/(計時|倒數|timer)/i.test(q)) return "timer";
      if (/(提醒我|提醒|remind)/i.test(q)) return "reminder";
      if (/(最新|新聞|查一下|搜尋|找資料)/i.test(q)) return "search";
      return null;
    }

    function teddyV31CorePrompt(message) {
      const intent = teddyV31CoreIntent(message);
      if (!intent) return "";
      const rules = {
        datetime: "這是日期/時間基本能力。必須呼叫 get_current_datetime，不要回答『無法讀取裝置時間』。",
        weather: "這是天氣基本能力。必須呼叫 get_weather 取得資料，不要憑模型記憶回答。",
        calculate: "這是計算基本能力。需要計算時優先呼叫 calculate，避免心算失誤。",
        timer: "這是計時基本能力。使用 start_timer。",
        reminder: "這是提醒基本能力。使用 set_reminder，並說明網頁開啟限制。",
        search: "這是即時資訊基本能力。需要最新資料時使用 search_news。"
      };
      return `\n\n【V3.1 Core Assistant Router】\n核心意圖：${intent}。\n${rules[intent] || ""}\n基本助理能力優先於專業 Skill，禁止因升級財務/農業能力而退化。`;
    }


    // Skill Router: keep routing deterministic and fast; no extra model call.
    // 一般聊天不再對農業/溫室關鍵字敏感——那個專業程度留給獨立的「溫室管理」視窗處理。
    function teddyV3RouteSkill(message) {
      const q = String(message || "").toLowerCase();
      const finance = /(股票|股價|台股|美股|etf|ipo|spacex|財報|營收|eps|本益比|殖利率|fed|聯準會|利率|債券|黃金|美元|匯率|投資|資產配置|基金|期貨|選擇權|加密|bitcoin|nvidia|台積電|拆分|分割|反分割|合併|除權|除息|配息)/i;
      const twTicker = /(?:^|[^0-9])(?:00\d{3}|0\d{4}|[1-9]\d{3})(?:[^0-9]|$)/;
      const coding = /(程式|javascript|html|css|firebase|api|console|bug|錯誤|部署|netlify|程式碼)/i;
      if (finance.test(q) || twTicker.test(q)) return "finance";
      if (coding.test(q)) return "coding";
      return "general";
    }

    // Fresh Data Gate: 只有財務相關話題才需要先查證即時資料；一般聊天保持自然、不做搜尋驗證。
    function teddyV3NeedsFreshData(message, skill) {
      const q = String(message || "");
      const timeSensitive = /(今天|現在|目前|最新|最近|近期|即時|今年|本週|這週|剛剛|新聞|價格|股價|匯率|利率|財報|營收|ipo|上市|成分股|政策|公告|法規|疫情|病蟲害警報|現況|行情)/i;
      const marketEvent = /(spacex|fed|聯準會|財報|ipo|etf成分|指數成分|除息|配息|法說|升息|降息|拆分|分割|反分割|合併|除權|公告|重大訊息)/i;
      if (skill === "finance" || skill === "investment") return timeSensitive.test(q) || marketEvent.test(q);
      if (skill === "presentation") return timeSensitive.test(q) || marketEvent.test(q);
      return false;
    }

    function teddyV3SkillPrompt(message) {
      const skill = teddyV3RouteSkill(message);
      const fresh = teddyV3NeedsFreshData(message, skill);
      const today = teddyTodayStr();
      let p = `\n\n【Smart Teddy V3 路由】\n目前 Skill：${skill}。`;
      if (skill === "finance") {
        p += `\n你現在是「財務與投資分析 Skill」。先區分已驗證事實、推論與情境，不把猜測寫成事實。分析優先順序：標的身分確認→最新資料→基本面/估值→總經與產業→樂觀/基準/悲觀情境→主要風險→簡短結論。資料層與推理層必須分開；先列已驗證資料與日期，再做推論。涉及個別標的時避免保證報酬。`;
      } else if (skill === "coding") {
        p += `\n你現在是「工程 Skill」。先定位錯誤，再給最小修改；避免無必要重構，保留現有功能。`;
      } else {
        p += `\n使用一般助理模式，保持簡短、自然、快速。`;
      }
      if (fresh) {
        p += `\n【Fresh Data Gate】今天是 ${today}。這題包含會變動的資訊。回答前必須先使用可用的搜尋/即時資訊工具驗證；若工具失敗或沒有足夠來源，必須明說「目前無法取得足夠的最新資料來驗證」，不可用模型舊知識假裝成現在的事實。回答時標示「資料檢查：${today}」。`;
      }
      p += `\n【速度規則】不要為了路由再呼叫另一個模型；簡單題直接答。只有需要即時資料、工具或複雜推理才增加步驟。`;
      return p;
    }

    function teddyV3VersionPrefix() {
      if (!teddyV3NeedsVersionHello()) return "";
      teddyV3MarkVersionHello();
      return `我是 ${TEDDY_VERSION}，今天第一次跟你說話，版本報到一下。`;
    }

    const TEDDY_TOOLS = [

      {
        name: "get_current_datetime",
        description: "取得使用者目前瀏覽器裝置的本地日期、時間、星期與時區。使用者問現在幾點、今天幾號、星期幾時一定要呼叫這個工具，不要說你無法讀取時間。",
        input_schema: {
          type: "object",
          properties: {}
        }
      },
      {
        name: "calculate",
        description: "計算數學表達式，例如四則運算、百分比、平方根、單位換算等。任何數學題目都必須呼叫這個工具取得正確答案，不要自己心算。",
        input_schema: {
          type: "object",
          properties: {
            expression: { type: "string", description: "可直接被 JavaScript 執行的數學表達式，例如 '125*38' 或 '(87+13)/2' 或 'Math.sqrt(144)'" }
          },
          required: ["expression"]
        }
      },
      {
        name: "get_weather",
        description: "查詢指定地點的天氣狀況與氣溫，支援目前即時天氣跟未來預報。使用者問天氣時一定要呼叫這個工具取得真實資料，不要憑印象亂猜。如果使用者問「這裡」「現在的地方」天氣、或完全沒提地點，location 留空即可，會自動用使用者目前的定位查詢。",
        input_schema: {
          type: "object",
          properties: {
            location: { type: "string", description: "地點名稱，例如「台北」「台中」「東京」；沒有指定地點、或問的是使用者目前所在地時留空" },
            days: { type: "number", description: "要查未來幾天的預報，0或留空只查現在，最多7天" }
          }
        }
      },
      {
        name: "get_stock_price",
        description: "查詢股票或指數目前的即時報價。使用者問股價、市值、漲跌幅時一定要呼叫這個工具取得真實資料，不要用記憶裡的舊數字回答，股價每天都在變。台股要加 .TW（例如台積電 2330.TW），美股直接用代號（例如 AAPL、NVDA）。",
        input_schema: {
          type: "object",
          properties: { symbol: { type: "string", description: "股票代號，例如「2330.TW」（台積電）、「AAPL」（蘋果）、「NVDA」（輝達）" } },
          required: ["symbol"]
        }
      },
      {
        name: "get_exchange_rate",
        description: "查詢兩種貨幣之間目前的即時匯率。使用者問匯率、換算金額時一定要呼叫這個工具，不要憑印象亂猜，匯率每天都在變。",
        input_schema: {
          type: "object",
          properties: {
            from: { type: "string", description: "來源貨幣代碼，例如 USD、TWD、JPY、EUR" },
            to: { type: "string", description: "目標貨幣代碼，例如 USD、TWD、JPY、EUR" },
            amount: { type: "number", description: "要換算的金額，沒指定就查 1 單位的匯率" }
          },
          required: ["from", "to"]
        }
      },
      {
        name: "start_timer",
        description: "設定倒數計時器，時間到會在對話框裡提醒使用者。",
        input_schema: {
          type: "object",
          properties: {
            seconds: { type: "number", description: "倒數秒數，例如 5 分鐘請填 300" },
            label: { type: "string", description: "這個計時器的用途標籤，例如「煮麵」，沒有可留空" }
          },
          required: ["seconds"]
        }
      },
      {
        name: "search_news",
        description: "搜尋最新新聞或即時資訊。使用者問「最新」「現在」「新聞」等需要即時資料的問題時要呼叫這個工具，不要用自己過時的知識回答。使用者對「自然、科技、SpaceX、茶藝、古文、農業」這幾個領域特別有興趣；當使用者要你「找最酷／最特別／最新的知識或新聞」卻沒指定主題時，從這幾個領域裡挑一個去搜尋，優先找新奇、少見、值得分享的內容，不要找泛泛的一般新聞。query 要寫得具體一點（例如「SpaceX 最新發射」而不是「太空新聞」），這樣搜尋結果比較精準。",
        input_schema: {
          type: "object",
          properties: { query: { type: "string", description: "搜尋關鍵字，盡量具體" } },
          required: ["query"]
        }
      },
      {
        name: "set_reminder",
        description: "設定提醒事項。注意：這個提醒只在使用者保持這個網頁分頁開著時才會生效，如果分頁被關掉或手機鎖螢幕太久，可能不會準時提醒，要跟使用者說明這個限制。",
        input_schema: {
          type: "object",
          properties: {
            minutes_from_now: { type: "number", description: "幾分鐘後提醒，例如 30 分鐘後請填 30" },
            message: { type: "string", description: "要提醒的內容，例如「吃藥」" }
          },
          required: ["minutes_from_now", "message"]
        }
      },
      {
        name: "save_article",
        description: "當使用者要求你寫一篇文章、日記或短文時使用。你要自己創作一篇符合指定主題、300 個中文字以內的繁體中文短文，放進 content 參數裡，這個工具會把文章存起來，之後可以再次朗讀。寫完文章後也要在對話中把文章內容完整念給使用者聽，不要只說「已經寫好了」。",
        input_schema: {
          type: "object",
          properties: {
            date: { type: "string", description: "文章日期，格式 YYYY-MM-DD，沒有指定就留空（會用今天日期）" },
            topic: { type: "string", description: "文章主題，例如「節氣」「今天的心情」" },
            content: { type: "string", description: "你創作的文章全文，必須是繁體中文、300字以內" }
          },
          required: ["topic", "content"]
        }
      },
      {
        name: "read_article",
        description: "朗讀之前寫過的文章。使用者說「念文章給我聽」「今天寫了什麼」「昨天的文章」時使用。拿到工具回傳的文章內容後，要在回覆裡完整照原文念出來，不要再自己摘要縮短。",
        input_schema: {
          type: "object",
          properties: {
            date: { type: "string", description: "要讀哪一天的文章，格式 YYYY-MM-DD，沒有指定就讀最新一篇" }
          }
        }
      }
    ];

    function teddyTodayStr() {
      const d = new Date();
      const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
      return local.toISOString().slice(0, 10);
    }

    async function teddyRunTool(name, input) {
      input = input || {};
      if (name === "get_current_datetime") {
        try {
          const now = new Date();
          const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "local";
          const parts = new Intl.DateTimeFormat("zh-TW", {
            year: "numeric", month: "2-digit", day: "2-digit",
            weekday: "long", hour: "2-digit", minute: "2-digit", second: "2-digit",
            hour12: false, timeZoneName: "short"
          }).format(now);
          return {
            ok: true,
            local_datetime: parts,
            iso: now.toISOString(),
            timezone: tz,
            unix_ms: now.getTime()
          };
        } catch (e) {
          return { ok: false, error: "取得目前時間失敗：" + e.message };
        }
      }

      if (name === "calculate") {
        try {
          const expr = String(input.expression || "");
          if (!/^[-+*/().,%\d\seE\w]*$/.test(expr) || /[a-zA-Z_$]{2,}/.test(expr.replace(/Math\.\w+/g, ""))) {
            throw new Error("表達式含不允許的字元");
          }
          // eslint-disable-next-line no-new-func
          const result = Function('"use strict"; return (' + expr + ')')();
          if (typeof result !== "number" || !isFinite(result)) throw new Error("不是有效數字");
          return { ok: true, expression: expr, result };
        } catch (e) { return { ok: false, error: "計算失敗：" + e.message }; }
      }
      if (name === "get_stock_price") {
        try {
          const symbol = String(input.symbol || "").trim().toUpperCase();
          if (!symbol) return { ok: false, error: "沒有指定股票代號" };
          const r = await teddyFetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}`, {}, 12000);
          const d = await r.json();
          const result = d?.chart?.result?.[0];
          if (!result) return { ok: false, error: "查不到這個代號：" + symbol };
          const meta = result.meta || {};
          // regularMarketTime 是 Yahoo 回傳的 unix 秒數，換算成使用者看得懂的時間，確保回答有明確的資料時間點。
          const asOf = meta.regularMarketTime ? new Date(meta.regularMarketTime * 1000).toISOString() : null;
          return {
            ok: true,
            symbol,
            name: meta.longName || meta.shortName || symbol,
            price: meta.regularMarketPrice,
            currency: meta.currency,
            previous_close: meta.chartPreviousClose,
            change_percent: (meta.regularMarketPrice && meta.chartPreviousClose)
              ? (((meta.regularMarketPrice - meta.chartPreviousClose) / meta.chartPreviousClose) * 100).toFixed(2)
              : null,
            market_state: meta.marketState,
            as_of: asOf,
          };
        } catch (e) { return { ok: false, error: "查詢股價失敗：" + e.message }; }
      }
      if (name === "get_exchange_rate") {
        try {
          const from = String(input.from || "").trim().toUpperCase();
          const to = String(input.to || "").trim().toUpperCase();
          if (!from || !to) return { ok: false, error: "請提供來源與目標貨幣代碼" };
          const amount = Number(input.amount) || 1;
          const r = await teddyFetch(`https://api.frankfurter.dev/v1/latest?base=${from}&symbols=${to}&amount=${amount}`, {}, 12000);
          const d = await r.json();
          if (!r.ok || !d.rates || d.rates[to] === undefined) return { ok: false, error: `查不到 ${from} 兌 ${to} 的匯率` };
          return {
            ok: true,
            from,
            to,
            amount,
            converted: d.rates[to],
            rate_per_unit: d.rates[to] / amount,
            as_of: d.date, // Frankfurter 回傳的是這筆匯率實際生效的日期（通常是最近一個銀行營業日）
          };
        } catch (e) { return { ok: false, error: "查詢匯率失敗：" + e.message }; }
      }
      if (name === "get_weather") {
        try {
          const loc = String(input.location || "").trim();
          const days = Math.max(0, Math.min(7, Number(input.days) || 0));
          let lat, lon, placeName;
          if (loc) {
            const geoR = await teddyFetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(loc)}&count=1&language=zh`, {}, 12000);
            const geoD = await geoR.json();
            const place = geoD.results && geoD.results[0];
            if (!place) return { ok: false, error: "找不到這個地點：" + loc };
            lat = place.latitude; lon = place.longitude; placeName = place.name;
          } else {
            // 沒給地點：用開啟助理時抓到的 GPS 定位，抓不到才請使用者指定地點。
            const gps = teddyLocation || await teddyRequestLocation();
            if (!gps) return { ok: false, error: "目前沒有定位資料，也沒有指定地點，請提供想查詢的地點名稱，或允許瀏覽器定位權限。" };
            lat = gps.lat; lon = gps.lon; placeName = gps.label || "目前位置";
          }
          const dailyParam = days > 0 ? "&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=" + (days + 1) : "";
          const wR = await teddyFetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m${dailyParam}`, {}, 12000);
          const wD = await wR.json();
          const c = wD.current || {};
          const result = {
            ok: true,
            location: placeName,
            temperature_c: c.temperature_2m,
            humidity_percent: c.relative_humidity_2m,
            wind_kmh: c.wind_speed_10m,
            weather_code: c.weather_code,
          };
          if (days > 0 && wD.daily) {
            result.forecast = (wD.daily.time || []).slice(1).map((date, i) => ({
              date,
              weather_code: wD.daily.weather_code[i + 1],
              temp_max_c: wD.daily.temperature_2m_max[i + 1],
              temp_min_c: wD.daily.temperature_2m_min[i + 1],
              precipitation_probability_percent: wD.daily.precipitation_probability_max ? wD.daily.precipitation_probability_max[i + 1] : null,
            }));
          }
          return result;
        } catch (e) { return { ok: false, error: "查詢天氣失敗：" + e.message }; }
      }
      if (name === "start_timer") {
        const secs = Number(input.seconds);
        if (!secs || secs <= 0) return { ok: false, error: "秒數不正確" };
        const label = (input.label || "").trim();
        setTimeout(() => {
          teddyAppendLog("teddy", `⏰ 時間到囉！${label ? "「" + label + "」" : ""}提醒你一下～`);
          teddySpeak(`時間到囉！${label || ""}`);
        }, secs * 1000);
        return { ok: true, seconds: secs, label: label || null };
      }
      if (name === "search_news") {
        // 5.5.1 投資即時資料：Grok 優先；逾時/失敗立即改用 OpenAI web_search。
        // 不再讓單一搜尋供應商的 Failed to fetch 阻斷整個投資分析。
        const keys = loadKeys();
        const query = String(input.query || "").trim();
        const errors = [];
        if (keys.xai) {
          try {
            const r = await teddyFetch("https://api.x.ai/v1/responses", {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${keys.xai}` },
              body: JSON.stringify({ model: "grok-4.6", input: [{ role: "user", content: query }], tools: [{ type: "web_search" }] }),
            }, 12000);
            const d = await r.json();
            if (!r.ok) throw new Error(d?.error?.message || `xAI HTTP ${r.status}`);
            const text = d.output_text || (d.output || []).flatMap(o=>o.content||[]).filter(c=>c.type==="output_text"||c.text).map(c=>c.text||"").join("\n");
            if (String(text||"").trim()) return { ok:true, result:String(text).trim(), source:"xAI web_search" };
            throw new Error("xAI 沒有回傳可用資料");
          } catch (e) { errors.push("xAI：" + e.message); }
        }
        if (keys.openai) {
          try {
            const r = await teddyFetch("https://api.openai.com/v1/responses", {
              method:"POST",
              headers:{"Content-Type":"application/json",Authorization:`Bearer ${keys.openai}`},
              body:JSON.stringify({model:"gpt-5.6-sol",reasoning:{effort:"medium"},tools:[{type:"web_search"}],input:[{role:"developer",content:[{type:"input_text",text:"你是 Smart Teddy 的投資即時資料層。使用繁體中文。先確認標的代號/名稱與事件，再查最新官方公告、交易所/發行商資訊與可信市場資料。只回傳可驗證資料、日期與來源線索；不要自行給買賣結論。"}]},{role:"user",content:[{type:"input_text",text:query}]}]})
            }, 45000);
            const d=await r.json();
            if(!r.ok)throw new Error(d?.error?.message||`OpenAI Web HTTP ${r.status}`);
            const text=(d.output_text||((d.output||[]).flatMap(x=>x.content||[]).filter(x=>x.type==="output_text").map(x=>x.text||"").join("\n"))).trim();
            if(text)return {ok:true,result:text,source:"OpenAI web_search"};
            throw new Error("OpenAI web_search 沒有回傳可用資料");
          } catch(e){ errors.push("OpenAI："+e.message); }
        }
        return {ok:false,error:"即時搜尋雙路徑皆失敗。"+(errors.length?" "+errors.join("；"):" 尚未設定 xAI 或 OpenAI Key")};
      }
      if (name === "set_reminder") {
        const mins = Number(input.minutes_from_now);
        const msg = String(input.message || "").trim();
        if (!mins || mins <= 0 || !msg) return { ok: false, error: "分鐘數或提醒內容不正確" };
        const savedRem = teddyRemAdd(msg, new Date(Date.now() + mins * 60 * 1000), "tool");
        if (window.Notification && Notification.permission === "default") {
          try { Notification.requestPermission(); } catch (_) {}
        }
        return { ok: true, minutes_from_now: mins, message: msg, due: teddyRemFmt(savedRem.due), calendar_url: teddyRemCalUrl(savedRem), note: "已存下；頁面開著會在 Teddy 裡提醒，關掉時請用行事曆連結讓手機提醒" };
      }
      if (name === "save_article") {
        if (!teddyEnsureFirebase()) return { ok: false, error: "Firebase 尚未載入，無法儲存文章" };
        const date = (input.date || teddyTodayStr()).trim();
        const topic = String(input.topic || "").trim();
        const content = String(input.content || "").trim();
        if (!content) return { ok: false, error: "文章內容是空的" };
        if (content.length > 320) return { ok: false, error: "文章超過300字限制（目前" + content.length + "字），請縮短後重新呼叫這個工具" };
        try {
          const db = firebase.firestore();
          await db.collection("teddy_memory").doc(teddyGetMemoryDocId()).collection("articles").doc(date).set({
            date, topic, content, createdAt: Date.now(),
          });
          return { ok: true, date, topic, length: content.length };
        } catch (e) { return { ok: false, error: "儲存文章失敗：" + e.message }; }
      }
      if (name === "read_article") {
        if (!teddyEnsureFirebase()) return { ok: false, error: "Firebase 尚未載入，無法讀取文章" };
        try {
          const db = firebase.firestore();
          const col = db.collection("teddy_memory").doc(teddyGetMemoryDocId()).collection("articles");
          let doc;
          if (input.date) {
            doc = await col.doc(String(input.date).trim()).get();
            if (!doc.exists) return { ok: false, error: "找不到 " + input.date + " 那天的文章" };
          } else {
            const snap = await col.orderBy("date", "desc").limit(1).get();
            if (snap.empty) return { ok: false, error: "目前還沒有寫過任何文章" };
            doc = snap.docs[0];
          }
          const data = doc.data();
          return { ok: true, date: data.date, topic: data.topic, content: data.content };
        } catch (e) { return { ok: false, error: "讀取文章失敗：" + e.message }; }
      }
      return { ok: false, error: "未知工具：" + name };
    }

    // ===== TEDDY 對話記憶（Firestore 雲端同步 + 摘要式長期記憶，localStorage 當本機快取／離線備援）=====
    let teddyHistory = [];
    let teddySummary = ""; // 長期記憶摘要（很久以前聊過的重點，濃縮成一段文字）
    // ===== 定位：開啟助理面板時抓一次 GPS，之後天氣工具預設用這個位置，不用每次都問使用者在哪 =====
    let teddyLocation = null; // { lat, lon, label }
    let teddyLocationPromise = null;

    function teddyUpdateLocationUI(){
      const el = document.getElementById("teddyLocationLine");
      if (!el) return;
      if (teddyLocation && teddyLocation.label) {
        el.textContent = `📍 目前在：${teddyLocation.label}`;
        el.style.display = "block";
      } else if (teddyLocation) {
        el.textContent = `📍 已定位（緯度${teddyLocation.lat.toFixed(2)}、經度${teddyLocation.lon.toFixed(2)}）`;
        el.style.display = "block";
      } else {
        el.style.display = "none";
      }
    }

    function teddyRequestLocation(){
      if (teddyLocationPromise) return teddyLocationPromise;
      teddyLocationPromise = new Promise((resolve) => {
        if (!navigator.geolocation) { resolve(null); return; }
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            const lat = pos.coords.latitude, lon = pos.coords.longitude;
            let label = null;
            try {
              const r = await teddyFetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=zh`, {}, 8000);
              const d = await r.json();
              label = d.locality || d.city || d.principalSubdivision || null;
            } catch (_) { /* 反查地名失敗也沒關係，還是有經緯度可以查天氣 */ }
            teddyLocation = { lat, lon, label };
            teddyUpdateLocationUI();
            resolve(teddyLocation);
          },
          () => resolve(null), // 使用者拒絕定位權限或抓取失敗，靜默放棄，不要打斷聊天
          { timeout: 8000, maximumAge: 15 * 60 * 1000 } // 15分鐘內的舊定位可以直接沿用，不用每次重問
        );
      });
      return teddyLocationPromise;
    }

    const TEDDY_EDITION = "work"+(window.TEDDY_KEY_SUFFIX||"");
    const TEDDY_HISTORY_KEY = "teddy_chat_history_work_v44"+(window.TEDDY_KEY_SUFFIX||"");
    const TEDDY_SUMMARY_KEY = "teddy_chat_summary_work_v44"+(window.TEDDY_KEY_SUFFIX||"");
    // 稱呼單獨開一個欄位，不跟一大段自由文字的長期摘要混在一起——
    // 這樣溫室模式只讀這一個小欄位就好，不用整份摘要（家人、心情、興趣）都帶進去，
    // 維持「工作歸工作、聊天歸聊天」的分隔，同時兩邊都認得同一個稱呼。
    const TEDDY_NAME_KEY = "teddy_preferred_name_work_v44"+(window.TEDDY_KEY_SUFFIX||"");
    let teddyPreferredName = "";
    // 溫室模式專用筆記：只有明確說「記住：」才會寫進來，跟一般模式那一大段自由摘要分開存，
    // 不會因為聊天內容被自動摘要進來，也不會被一般模式讀到——維持「工作歸工作」的界線。
    const TEDDY_GREENHOUSE_NOTES_KEY = "teddy_greenhouse_notes_work_v44"+(window.TEDDY_KEY_SUFFIX||"");
    const TEDDY_MEMORY_V38_KEY = "teddy_memory_layers_work_v44"+(window.TEDDY_KEY_SUFFIX||"");
    const TEDDY_MEMORY_BACKUP_KEY = "teddy_memory_legacy_backup_work_v44"+(window.TEDDY_KEY_SUFFIX||"");
    const TEDDY_UNIFIED_MEMORY_V40_KEY = "teddy_unified_memory_work_v44"+(window.TEDDY_KEY_SUFFIX||"");
    let teddyGreenhouseNotes = [];
    let teddyMemoryLayers = {
      version: 1,
      preferences: {},
      semantic: { greenhouseNotes: [] },
      episodic: { summary: "" },
      temporary: [],
      conversation: { general: {}, greenhouse: {} },
      migratedAt: null,
      updatedAt: null
    };
    const GH_NOTES_MAX = 30;
    let teddyAttachment=null; // 僅保留本次送出；不把圖片 base64 寫進長期記憶。
    let teddyLiveImage=null; // 7.2.0：即時語音目前看的照片（只在記憶體，換照片或按 × 就清掉）。
    window.teddyPendingLiveImage=()=>teddyLiveImage;

    function teddySeedEditionMemory(){
      const pairs=[["teddy_chat_history",TEDDY_HISTORY_KEY],["teddy_chat_summary",TEDDY_SUMMARY_KEY],["teddy_preferred_name",TEDDY_NAME_KEY],["teddy_greenhouse_notes",TEDDY_GREENHOUSE_NOTES_KEY],["teddy_memory_layers_v38",TEDDY_MEMORY_V38_KEY],["teddy_memory_legacy_backup_v37",TEDDY_MEMORY_BACKUP_KEY],["teddy_unified_memory_v40",TEDDY_UNIFIED_MEMORY_V40_KEY]];
      for(const [oldKey,newKey] of pairs){const v=localStorage.getItem(oldKey);if(localStorage.getItem(newKey)==null&&v!=null)localStorage.setItem(newKey,v);}
    }

    function teddyUniqueHistory(items){
      const seen=new Set();
      return (Array.isArray(items)?items:[]).filter(h=>h&&["user","assistant"].includes(h.role)&&String(h.text||"").trim()).filter(h=>{
        const key=h.role+"\u0000"+String(h.text).trim();
        if(seen.has(key))return false;seen.add(key);return true;
      }).slice(-TEDDY_HISTORY_RAW_MAX);
    }

    function teddyMergeSummary(localSummary,cloudSummary){
      const a=String(localSummary||"").trim(),b=String(cloudSummary||"").trim();
      if(!a)return b;if(!b||a===b)return a;
      return (a+"\n"+b).slice(-5000);
    }

    function teddyUnifiedMemorySnapshot(){
      let greenhouseState={};
      try{if(typeof ghLoadStructuredState==="function")greenhouseState=ghLoadStructuredState()||{};}catch(_){}
      return {
        format:"smart-teddy-unified-memory",version:4,updatedAt:Date.now(),
        preferences:{...(teddyMemoryLayers.preferences||{}),preferredName:teddyPreferredName||teddyMemoryLayers.preferences?.preferredName||""},
        semantic:{...(teddyMemoryLayers.semantic||{}),greenhouseNotes:[...teddyGreenhouseNotes]},
        episodic:{...(teddyMemoryLayers.episodic||{}),summary:teddySummary,history:teddyUniqueHistory(teddyHistory)},
        conversation:{...(teddyMemoryLayers.conversation||{}),greenhouse:greenhouseState}
      };
    }

    function teddySyncUnifiedMemory(){
      const unified=teddyUnifiedMemorySnapshot();
      localStorage.setItem(TEDDY_UNIFIED_MEMORY_V40_KEY,JSON.stringify(unified));
      // 4.0 仍同步舊分層鍵，確保降回 3.8/3.9 時記憶仍可讀。
      teddyMemoryLayers.preferences={...(teddyMemoryLayers.preferences||{}),...unified.preferences};
      teddyMemoryLayers.semantic={...(teddyMemoryLayers.semantic||{}),...unified.semantic};
      teddyMemoryLayers.episodic={...(teddyMemoryLayers.episodic||{}),summary:teddySummary};
      return unified;
    }

    function teddyUnifiedMemoryContext(){
      const m=teddyUnifiedMemorySnapshot();
      const ghOn=document.getElementById("greenhousePanel")?.style.display!=="none";
      const recent=m.episodic.history.filter(h=>teddyHistoryMode(h)===(ghOn?"greenhouse":"general")).slice(-16).map(h=>(h.role==="user"?"使用者":"TEDDY")+"："+String(h.text).slice(0,500)).join("\n");
      return `【TEDDY 共用記憶（文字＋語音）】\n偏好：${JSON.stringify(m.preferences).slice(0,1500)}\n長期工作摘要：${String(m.episodic.summary||"（無）").slice(0,2500)}\n近期對話（文字與語音同一份）：\n${recent||"（無）"}\n溫室筆記：${m.semantic.greenhouseNotes.join("；").slice(0,1500)||"（無）"}\n目前溫室結構化狀態：${JSON.stringify(m.conversation.greenhouse||{}).slice(0,2500)}\n規則：文字與即時語音共用以上工作記憶；結構化溫室資料優先於摘要、筆記與對話。`;
    }

    function teddyMigrateLegacyMemory(){
      let existing=null;
      try{existing=JSON.parse(localStorage.getItem(TEDDY_MEMORY_V38_KEY)||"null");}catch(_){}
      if(existing && existing.version){teddyMemoryLayers={...teddyMemoryLayers,...existing};return;}
      const legacy={
        history:localStorage.getItem(TEDDY_HISTORY_KEY)||"[]",
        summary:localStorage.getItem(TEDDY_SUMMARY_KEY)||"",
        preferredName:localStorage.getItem(TEDDY_NAME_KEY)||"",
        greenhouseNotes:localStorage.getItem(TEDDY_GREENHOUSE_NOTES_KEY)||"[]",
        greenhouseTopic:localStorage.getItem("teddy_greenhouse_topic_v7")||null,
        greenhouseContext:localStorage.getItem("teddy_greenhouse_context_v7")||"{}",
        deviceId:localStorage.getItem("teddy_device_id")||null,
        backedUpAt:Date.now()
      };
      // 只寫一次不可變的 3.7 回退副本；絕不清除舊 Key。
      if(!localStorage.getItem(TEDDY_MEMORY_BACKUP_KEY))localStorage.setItem(TEDDY_MEMORY_BACKUP_KEY,JSON.stringify(legacy));
      let notes=[];try{notes=JSON.parse(legacy.greenhouseNotes)||[];}catch(_){}
      let oldContext={};try{oldContext=JSON.parse(legacy.greenhouseContext)||{};}catch(_){}
      teddyMemoryLayers={
        version:1,
        preferences:{preferredName:legacy.preferredName,responseLanguage:"zh-TW",responseStyle:"concise"},
        semantic:{greenhouseNotes:notes},
        episodic:{summary:legacy.summary},
        temporary:[],
        conversation:{general:{},greenhouse:{topic:legacy.greenhouseTopic,legacyContext:oldContext}},
        migratedAt:Date.now(),updatedAt:Date.now()
      };
      localStorage.setItem(TEDDY_MEMORY_V38_KEY,JSON.stringify(teddyMemoryLayers));
    }

    function teddySaveMemoryLayers(){
      teddyMemoryLayers.updatedAt=Date.now();
      localStorage.setItem(TEDDY_MEMORY_V38_KEY,JSON.stringify(teddyMemoryLayers));
      teddySyncUnifiedMemory();
    }

    async function ghSaveNotes(){
      localStorage.setItem(TEDDY_GREENHOUSE_NOTES_KEY, JSON.stringify(teddyGreenhouseNotes));
      teddyMemoryLayers.semantic.greenhouseNotes=[...teddyGreenhouseNotes];
      teddySaveMemoryLayers();
      if(!teddyEnsureFirebase())return;
      try{
        const db=firebase.firestore();
        await db.collection("teddy_memory").doc(teddyGetMemoryDocId()).set({greenhouseNotes:teddyGreenhouseNotes,memoryLayers:teddyMemoryLayers},{merge:true});
      }catch(e){console.warn("溫室筆記儲存失敗，僅保留本機：",e.message);}
    }

    // 回傳值：matched=true 代表這句話是記憶指令（不管成功與否），呼叫端應該直接用 reply 回覆、不要再進其他路由。
    function ghHandleMemoryCommand(q){
      const t=String(q||"").trim();

      const remember=t.match(/^(?:幫我)?記住[:：]\s*(.+)$/);
      if(remember){
        const note=remember[1].trim();
        if(!note)return{matched:true,reply:"要記住什麼內容？「記住：」後面請接你要我記的事。"};
        teddyGreenhouseNotes.push(note);
        if(teddyGreenhouseNotes.length>GH_NOTES_MAX)teddyGreenhouseNotes=teddyGreenhouseNotes.slice(-GH_NOTES_MAX);
        ghSaveNotes();
        return{matched:true,reply:`記住了：${note}`};
      }

      const forget=t.match(/^(?:忘記|刪除記憶)[:：]?\s*(.*)$/);
      if(forget){
        const key=forget[1].trim();
        if(!key){
          if(!teddyGreenhouseNotes.length)return{matched:true,reply:"目前沒有記住任何溫室筆記。"};
          return{matched:true,reply:`要忘記哪一條？目前記得：${teddyGreenhouseNotes.map((n,i)=>`${i+1}.${n}`).join("；")}`};
        }
        const before=teddyGreenhouseNotes.length;
        teddyGreenhouseNotes=teddyGreenhouseNotes.filter(n=>!n.includes(key));
        if(teddyGreenhouseNotes.length===before)return{matched:true,reply:`沒有找到包含「${key}」的筆記，不確定要忘記哪一條。`};
        ghSaveNotes();
        return{matched:true,reply:`已忘記跟「${key}」有關的筆記。`};
      }

      if(/^(?:你|妳)?(?:在溫室模式)?記得什麼|溫室筆記|列出.*筆記/.test(t)){
        if(!teddyGreenhouseNotes.length)return{matched:true,reply:"目前沒有記住任何溫室筆記，可以說「記住：內容」讓我記下來。"};
        return{matched:true,reply:`目前記得：${teddyGreenhouseNotes.map((n,i)=>`${i+1}.${n}`).join("；")}`};
      }

      return{matched:false};
    }

    function teddyDetectPreferredName(text){
      const t=String(text||"").trim();
      const m=t.match(/^(?:以後|請|麻煩)?叫我([\u4e00-\u9fa5A-Za-z0-9]{1,8})(?:就好|就可以|吧|喔|唷)?[。！!～~]*$/)
        || t.match(/^我是([\u4e00-\u9fa5A-Za-z0-9]{1,8})[，,]?\s*(?:不是|不用).{0,10}$/);
      if(m && m[1])return m[1];
      return null;
    }

    async function teddySavePreferredName(name){
      teddyPreferredName=name;
      localStorage.setItem(TEDDY_NAME_KEY,name);
      teddyMemoryLayers.preferences.preferredName=name;
      teddySaveMemoryLayers();
      if(!teddyEnsureFirebase())return;
      try{
        const db=firebase.firestore();
        await db.collection("teddy_memory").doc(teddyGetMemoryDocId()).set({preferredName:name,memoryLayers:teddyMemoryLayers},{merge:true});
      }catch(e){console.warn("稱呼儲存失敗，僅保留本機：",e.message);}
    }
    const TEDDY_HISTORY_RAW_MAX = 30; // 近期完整逐字記錄上限，超過會把最舊一批濃縮成摘要
    const TEDDY_SUMMARIZE_CHUNK = 14; // 每次濃縮多少則舊訊息

    function teddyGetDeviceId() {
      let id = localStorage.getItem("teddy_device_id");
      if (!id) {
        id = "device_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
        localStorage.setItem("teddy_device_id", id);
      }
      return id;
    }
    function teddyGetMemoryDocId(){return teddyGetDeviceId()+"__"+TEDDY_EDITION;}

    function teddyRenderHistoryLog() {
      const log = document.getElementById("teddyChatLog");
      if (log) {
        log.innerHTML = "";
        teddyHistory.filter((h) => teddyHistoryMode(h) === "general").forEach((h) => teddyAppendLog(h.role === "user" ? "user" : "teddy", h.text));
      }
    }


    let teddyFreshContext = "";

    function teddyRuntimeState() {
      const modelEl = document.getElementById("teddyModelSelect");
      const voiceEl = document.getElementById("teddyVoiceStyleSelect");
      const skillEl = null;
      const keys = loadKeys();
      return {
        version: TEDDY_VERSION,
        modelPreference: modelEl?.selectedOptions?.[0]?.textContent || "自動",
        modelValue: modelEl?.value || "auto",
        voice: voiceEl?.selectedOptions?.[0]?.textContent || "自動判斷",
        skillPreference: "自動判斷",
        activeSkill: teddySkillLabel(teddyActiveSkill),
        claudeReady: !!keys.anthropic,
        openaiReady: !!keys.openai,
        searchReady: !!keys.xai,
        firebaseReady: typeof firebase !== "undefined",
        speechRecognitionReady: !!(window.SpeechRecognition || window.webkitSpeechRecognition),
        browserTtsReady: !!window.speechSynthesis
      };
    }

    // ===== Smart Teddy 5.6 Investment Data Layer =====
    // 資料層與推理層分離：先取得/驗證資料，再交給 Astra；搜尋服務失敗不直接殺死整題。
    const TEDDY_INVEST_CACHE_KEY = "teddy_invest_verified_cache_v56";
    function teddyInvestCacheLoad(){
      try{return JSON.parse(localStorage.getItem(TEDDY_INVEST_CACHE_KEY)||"{}");}catch(_){return {};}
    }
    function teddyInvestCacheKey(message){
      return String(message||"").toLowerCase().replace(/\s+/g," ").trim().slice(0,220);
    }
    function teddyInvestCacheSave(message,data,source){
      try{
        const all=teddyInvestCacheLoad(), key=teddyInvestCacheKey(message);
        all[key]={ts:Date.now(),data:String(data||"").slice(0,18000),source:String(source||"verified web")};
        const entries=Object.entries(all).sort((a,b)=>(b[1]?.ts||0)-(a[1]?.ts||0)).slice(0,20);
        localStorage.setItem(TEDDY_INVEST_CACHE_KEY,JSON.stringify(Object.fromEntries(entries)));
      }catch(_){}
    }
    function teddyInvestCacheGet(message,maxAgeMs=6*60*60*1000){
      const item=teddyInvestCacheLoad()[teddyInvestCacheKey(message)];
      if(!item||!item.ts||Date.now()-item.ts>maxAgeMs)return null;
      return item;
    }

    async function teddyFreshDataPreflight(message) {
      const routed=teddyV3RouteSkill(message);
      if(!teddyV3NeedsFreshData(message,routed)){teddyFreshContext="";return {ok:true,required:false};}
      const keys=loadKeys();
      const query=`投資即時查證：${message}。先確認代號與標的名稱，再核對最新可取得價格/日期、官方公告或發行商資訊、公司行動（拆分/分割/配息等）及會影響判斷的最新事件。資料與分析分開，不要給買賣結論。`;
      if(keys.xai||keys.openai){
        const result=await teddyRunTool("search_news",{query});
        if(result?.ok&&String(result.result||"").trim()){
          teddyFreshContext=`【資料時間 ${new Date().toLocaleString("zh-TW",{hour12:false})}｜來源 ${result.source||"web"}】\n${String(result.result).trim()}`;
          teddyInvestCacheSave(message,teddyFreshContext,result.source);
          return {ok:true,required:true,source:result.source,cached:false};
        }
        const cached=teddyInvestCacheGet(message);
        if(cached){
          teddyFreshContext=`【即時搜尋本輪失敗；使用 ${new Date(cached.ts).toLocaleString("zh-TW",{hour12:false})} 的最近已驗證快取｜${cached.source}】\n${cached.data}`;
          return {ok:true,required:true,source:cached.source,cached:true,warning:result?.error||"搜尋失敗"};
        }
        // 沒有即時資料也不在 Gate 直接終止：交給 OpenAI 分析層的 web_search 再做最後一次取得。
        teddyFreshContext=`【5.6 資料層狀態】獨立即時資料層本輪未取得資料：${result?.error||"未知錯誤"}。分析核心必須自行使用 web_search 再查一次；若仍失敗，明確說無法驗證最新資料，不得編造。`;
        return {ok:true,required:true,degraded:true,warning:result?.error||"搜尋失敗"};
      }
      teddyFreshContext="【5.6 資料層狀態】未設定獨立即時搜尋 Key。分析核心若可用 web_search 必須自行查證；若不可用，明確說無法驗證最新資料。";
      return {ok:true,required:true,degraded:true,warning:"未設定即時搜尋 Key"};
    }


    function teddyBuildSystemPrompt() {
      const skill = TEDDY_SKILLS[teddyActiveSkill] || TEDDY_SKILLS.general;
      const lastUser = [...teddyHistory].reverse().find((h) => h.role === "user");
      const currentMessage = lastUser ? lastUser.text : "";
      const state = teddyRuntimeState();

      const greenhouseOn = document.getElementById("greenhousePanel")?.style.display !== "none";
      const modeRules = greenhouseOn
        ? "【目前模式：溫室模式】只有在這個模式才把溫室產能、工作、計畫、耗材、打卡當成主要上下文；結構化 V5.1 資料優先於筆記與聊天。"
        : "【目前模式：一般模式】不要因為使用者提到『工作』、檔案、照片、網頁或分析，就自行切成溫室/工作模式。除非使用者明確要求進入溫室模式或查 V5.1 真實資料，否則保持一般模式。";
      let prompt = teddyPersonaCore() + "\n\n【Smart Teddy 5.2.5 規則】\n可直接看懂使用者本次附加的圖片/截圖，並可讀取各類常見檔案。若本次附有圖片，圖片像素就是目前可見內容：必須直接分析圖片，不得說『打不開連結／看不到截圖／請重新上傳』，除非 API 明確回報圖片解碼失敗。附件內容是本次回答的重要依據；先忠實讀取附件，再回答，不可只依檔名猜測。需要最新網頁資訊時可使用網頁搜尋。\n" + modeRules + "\n\n【目前啟用 Skill：" + skill.name + "】\n" + skill.prompt;
      prompt += teddyV31CorePrompt(currentMessage);
      prompt += teddyV3SkillPrompt(currentMessage);
      prompt += `\n\n【Teddy 即時自我狀態】
應用版本：${state.version}
介面目前模型：${state.modelPreference}
目前語音模式：${state.voice}
目前 Skill：${state.activeSkill}
搜尋工具：${state.searchReady ? "可用" : "未設定"}。
如果使用者問你現在使用哪個模型，必須以上述介面目前模型為準，禁止自行猜成 GPT 或 Claude。`;

      if (teddyLocation) {
        prompt += `\n\n【使用者目前定位】\n${teddyLocation.label ? "使用者目前大約在：" + teddyLocation.label : "已取得使用者的 GPS 座標，但反查地名失敗"}（緯度${teddyLocation.lat.toFixed(3)}、經度${teddyLocation.lon.toFixed(3)}）。使用者問「這裡天氣」「我在哪」這類問題時可以直接使用這個資訊；查天氣時 get_weather 的 location 留空即可自動使用這個定位。`;
      }

      if (teddyFreshContext) {
        prompt += "\n\n【Fresh Data Gate 已驗證資料】\n以下內容是本次回答前剛取得的即時搜尋結果。只能依據它和明確推論回答會變動的市場/新聞事實；若其中沒有答案，要說資料不足。\n" + teddyFreshContext;
      }
      if(teddyMemoryLayers.preferences && Object.keys(teddyMemoryLayers.preferences).length){
        prompt += "\n\n【穩定偏好記憶】\n"+JSON.stringify(teddyMemoryLayers.preferences);
      }
      if(teddyGreenhouseNotes.length){
        prompt += "\n\n【溫室語意筆記】\n"+teddyGreenhouseNotes.join("；");
      }
      if (teddySummary) {
        prompt += "\n\n以下是你和這位使用者更早以前聊過的長期記憶摘要，可以自然地參考裡面提到的個人資訊、偏好或事件，不用逐字複誦：\n" + teddySummary;
      }

      return prompt;
    }

    async function teddyLoadHistory() {
      teddySeedEditionMemory();
      teddyMigrateLegacyMemory();
      // 先讀本機快取，馬上顯示，不用等網路
      try { teddyHistory = JSON.parse(localStorage.getItem(TEDDY_HISTORY_KEY) || "[]"); }
      catch (_) { teddyHistory = []; }
      teddySummary = localStorage.getItem(TEDDY_SUMMARY_KEY) || "";
      teddyPreferredName = localStorage.getItem(TEDDY_NAME_KEY) || "";
      try{ teddyGreenhouseNotes = JSON.parse(localStorage.getItem(TEDDY_GREENHOUSE_NOTES_KEY) || "[]"); }
      catch(_){ teddyGreenhouseNotes = []; }
      // 若 4.0 已使用過，將統一記憶與舊鍵合併；任何一邊都不會被直接丟棄。
      try{
        const u=JSON.parse(localStorage.getItem(TEDDY_UNIFIED_MEMORY_V40_KEY)||"null");
        if(u&&u.version===4){
          teddyHistory=teddyUniqueHistory([...(teddyHistory||[]),...(u.episodic?.history||[])]);
          teddySummary=teddyMergeSummary(teddySummary,u.episodic?.summary);
          teddyPreferredName=teddyPreferredName||u.preferences?.preferredName||"";
          teddyGreenhouseNotes=[...new Set([...(teddyGreenhouseNotes||[]),...(u.semantic?.greenhouseNotes||[])])].slice(-GH_NOTES_MAX);
          teddyMemoryLayers.preferences={...(u.preferences||{}),...(teddyMemoryLayers.preferences||{})};
        }
      }catch(_){}
      teddySyncUnifiedMemory();
      teddyRenderHistoryLog();

      // 再嘗試從 Firestore 讀取雲端版本（換裝置也能看到同一份記憶）
      if (!teddyEnsureFirebase()) return;
      try {
        const db = firebase.firestore();
        let doc = await db.collection("teddy_memory").doc(teddyGetMemoryDocId()).get();
        if(!doc.exists&&window.TEDDY_ENTRY_ID==="owner")doc=await db.collection("teddy_memory").doc(teddyGetDeviceId()).get();
        if (doc.exists) {
          const data = doc.data();
          if(data.memoryLayers && data.memoryLayers.version){
            teddyMemoryLayers={...teddyMemoryLayers,...data.memoryLayers,
              preferences:{...(data.memoryLayers.preferences||{}),...(teddyMemoryLayers.preferences||{})},
              semantic:{...(data.memoryLayers.semantic||{}),...(teddyMemoryLayers.semantic||{})},
              episodic:{...(data.memoryLayers.episodic||{}),...(teddyMemoryLayers.episodic||{})},
              conversation:{...(data.memoryLayers.conversation||{}),...(teddyMemoryLayers.conversation||{})}
            };
            localStorage.setItem(TEDDY_MEMORY_V38_KEY,JSON.stringify(teddyMemoryLayers));
          }
          // 只合併，不用空白或較舊雲端資料覆蓋手機現有記憶。
          teddyHistory = teddyUniqueHistory([...(teddyHistory||[]),...(data.history||[])]);
          teddySummary = teddyMergeSummary(teddySummary,data.summary);
          if(data.preferredName){
            teddyPreferredName=data.preferredName;
            localStorage.setItem(TEDDY_NAME_KEY,teddyPreferredName);
          }
          if(Array.isArray(data.greenhouseNotes)){
            teddyGreenhouseNotes=[...new Set([...(teddyGreenhouseNotes||[]),...data.greenhouseNotes])].slice(-GH_NOTES_MAX);
            localStorage.setItem(TEDDY_GREENHOUSE_NOTES_KEY,JSON.stringify(teddyGreenhouseNotes));
          }
          if(teddyMemoryLayers.preferences?.preferredName && !teddyPreferredName){
            teddyPreferredName=teddyMemoryLayers.preferences.preferredName;
            localStorage.setItem(TEDDY_NAME_KEY,teddyPreferredName);
          }
          localStorage.setItem(TEDDY_HISTORY_KEY, JSON.stringify(teddyHistory));
          localStorage.setItem(TEDDY_SUMMARY_KEY, teddySummary);
          teddySyncUnifiedMemory();
          teddyRenderHistoryLog();
        }
      } catch (e) {
        console.warn("Firestore 記憶讀取失敗，先用本機記憶：", e.message);
      }
    }

    async function teddySummarizeOldMessages(oldMessages) {
      const keys = loadKeys();
      const transcript = oldMessages.map((h) => (h.role === "user" ? "使用者" : "TEDDY") + "：" + h.text).join("\n");
      const prompt = "請把以下這段對話濃縮成 3-5 句重點摘要，保留使用者提到的重要個人資訊、偏好、正在做的事情，用繁體中文寫成一小段文字（不要條列、不要加任何前言），如果既有摘要存在，請把新內容自然融合進去：\n\n【既有摘要】\n" + (teddySummary || "（無）") + "\n\n【新的對話內容】\n" + transcript;
      try {
        if (keys.anthropic) {
          const r = await teddyFetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-api-key": keys.anthropic,
              "anthropic-version": "2023-06-01",
              "anthropic-dangerous-direct-browser-access": "true",
            },
            body: JSON.stringify({ model: "claude-sonnet-5-5", max_tokens: 300, messages: [{ role: "user", content: prompt }] }),
          }, 20000);
          const d = await r.json();
          if (r.ok) return (d.content || []).filter((b) => b.type === "text").map((b) => b.text).join("").trim();
        } else if (keys.openai) {
          const r = await teddyFetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${keys.openai}` },
            body: JSON.stringify({ model: "gpt-4o", max_tokens: 300, messages: [{ role: "user", content: prompt }] }),
          }, 20000);
          const d = await r.json();
          if (r.ok) return d.choices[0].message.content.trim();
        }
      } catch (e) {
        console.warn("記憶摘要濃縮失敗，先保留原本摘要：", e.message);
      }
      return null;
    }

    async function teddySaveHistory() {
      // 超過近期上限時，把最舊一批濃縮成摘要，避免歷史無限增長
      if (teddyHistory.length > TEDDY_HISTORY_RAW_MAX) {
        const overflow = teddyHistory.length - TEDDY_HISTORY_RAW_MAX;
        const chunkSize = Math.max(overflow, TEDDY_SUMMARIZE_CHUNK);
        const oldChunk = teddyHistory.slice(0, chunkSize);
        const newSummary = await teddySummarizeOldMessages(oldChunk);
        if (newSummary) {
          teddySummary = newSummary;
          teddyHistory = teddyHistory.slice(chunkSize);
        } else {
          // 濃縮失敗（例如沒設定 Key）就先簡單裁切，避免無限增長
          teddyHistory = teddyHistory.slice(-TEDDY_HISTORY_RAW_MAX);
        }
      }
      localStorage.setItem(TEDDY_HISTORY_KEY, JSON.stringify(teddyHistory));
      localStorage.setItem(TEDDY_SUMMARY_KEY, teddySummary);
      teddyMemoryLayers.episodic.summary=teddySummary;
      teddyMemoryLayers.semantic.greenhouseNotes=[...teddyGreenhouseNotes];
      const unifiedMemory=teddySyncUnifiedMemory();
      teddySaveMemoryLayers();
      if (!teddyEnsureFirebase()) return;
      try {
        const db = firebase.firestore();
        await db.collection("teddy_memory").doc(teddyGetMemoryDocId()).set({
          history: teddyHistory,
          summary: teddySummary,
          memoryLayers:teddyMemoryLayers,
          unifiedMemory,
          updatedAt: Date.now(),
        },{merge:true});
      } catch (e) {
        console.warn("Firestore 記憶儲存失敗，僅保留本機記憶：", e.message);
      }
    }

    function teddyClearHistory() {
      if(window.TEDDY_MEMORY_LOCKED!==false){alert("TEDDY 的記憶已鎖定，不能清除。需要保存時請按「備份記憶」。");return;}
      if(!window.confirm("只清除近期對話與摘要？溫室筆記、偏好與3.7備份會完整保留。"))return;
      teddyHistory = [];
      teddySummary = "";
      localStorage.removeItem(TEDDY_HISTORY_KEY);
      localStorage.removeItem(TEDDY_SUMMARY_KEY);
      const log = document.getElementById("teddyChatLog");
      if (log) log.innerHTML = "";
      teddyMemoryLayers.episodic.summary="";
      teddyMemoryLayers.conversation.general={};
      teddySaveMemoryLayers();
      if (teddyEnsureFirebase()) {
        try { firebase.firestore().collection("teddy_memory").doc(teddyGetMemoryDocId()).set({history:[],summary:"",memoryLayers:teddyMemoryLayers,updatedAt:Date.now()},{merge:true}); } catch (_) {}
      }
    }

    function teddyExportMemory(){
      teddyMigrateLegacyMemory();
      const payload={
        format:"smart-teddy-memory-backup",version:"4.0",exportedAt:new Date().toISOString(),
        deviceId:teddyGetDeviceId(),history:teddyHistory,summary:teddySummary,
        preferredName:teddyPreferredName,greenhouseNotes:teddyGreenhouseNotes,
        memoryLayers:teddyMemoryLayers,unifiedMemory:teddyUnifiedMemorySnapshot(),
        legacyBackup:JSON.parse(localStorage.getItem(TEDDY_MEMORY_BACKUP_KEY)||"null")
      };
      const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"});
      const a=document.createElement("a");a.href=URL.createObjectURL(blob);
      a.download=`smart-teddy-memory-${new Date().toISOString().slice(0,10)}.json`;a.click();
      setTimeout(()=>URL.revokeObjectURL(a.href),1000);
    }

    function teddyAppendLog(role, text) {
      const log = document.getElementById("teddyChatLog");
      if (!log) return null;
      const div = document.createElement("div");
      div.style.marginBottom = "6px";
      div.innerHTML = `<b style="color:${role === "user" ? "#5eead4" : "#e8a659"}">${role === "user" ? "你" : "TEDDY"}：</b><span>${escapeHtml(teddyToTradSafe(text))}</span>`;
      log.appendChild(div);
      log.scrollTop = log.scrollHeight;
      return div;
    }

    function teddyUpdateLogDiv(div, text) {
      if (!div) return;
      const span = div.querySelector("span");
      if (span) span.textContent = teddyToTradSafe(text);
      const log = document.getElementById("teddyChatLog");
      if (log) log.scrollTop = log.scrollHeight;
    }

    const TEDDY_TOOL_STATUS_LABELS = {
      get_current_datetime: "🕒 讀取時間…",
      calculate: "🧮 算一下…",
      get_weather: "🌦 查天氣中…",
      get_stock_price: "📈 查股價中…",
      get_exchange_rate: "💱 查匯率中…",
      start_timer: "⏰ 設定計時中…",
      search_news: "🔍 搜尋中…",
      set_reminder: "🔔 設定提醒中…",
      save_article: "✍️ 寫文章中…",
      read_article: "📖 找文章中…",
    };

    // 6.8.0：一般模式聊天只帶一般模式的對話；溫室模式的問答不混進來。
    function teddyHistoryMode(h){return (h&&h.mode)||(h&&h.source==="greenhouse"?"greenhouse":"general");}
    function teddyChatHistory(){
      const out=[];
      teddyHistory.filter(h=>teddyHistoryMode(h)==="general").forEach(h=>{
        const role=h.role==="assistant"?"assistant":"user";
        const last=out[out.length-1];
        if(last&&last.role===role)last.text+="\n"+h.text;else out.push({role,text:String(h.text||"")});
      });
      while(out.length&&out[0].role!=="user")out.shift();
      return out;
    }
    async function teddyChatWithClaude(apiKey, onStatus) {
      const messages = teddyChatHistory().map((h) => ({ role: h.role, content: h.text }));
      if(teddyAttachment?.kind==="image"){
        const i=messages.length-1;
        if(i>=0&&messages[i].role==="user")messages[i].content=[{type:"image",source:{type:"base64",media_type:teddyAttachment.mime,data:teddyAttachment.data}},{type:"text",text:messages[i].content}];
      }
      let guard = 0;
      let usedInput = 0, usedOutput = 0;
      while (guard++ < 4) {
        const r = await teddyFetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
            "anthropic-dangerous-direct-browser-access": "true",
          },
          body: JSON.stringify({
            model: (window.__teddyLastClaudeModel = (()=>{const c=teddyDeepChoice();return c.p==="anthropic"?c.model:"claude-sonnet-5-5";})()),
            max_tokens: 4096,
            system: teddyBuildSystemPrompt(),
            tools: TEDDY_TOOLS,
            messages,
          }),
        }, 30000);
        const d = await r.json();
        if (!r.ok) throw new Error(d?.error?.message || `HTTP ${r.status}`);
        if (d.usage) { usedInput += d.usage.input_tokens || 0; usedOutput += d.usage.output_tokens || 0; }
        const toolUses = (d.content || []).filter((b) => b.type === "tool_use");
        const textBlocks = (d.content || []).filter((b) => b.type === "text").map((b) => b.text).join("");
        if (!toolUses.length) return { text: textBlocks || "（沒有回覆）", usage: { input: usedInput, output: usedOutput } };
        if (onStatus) onStatus(toolUses.map((tu) => TEDDY_TOOL_STATUS_LABELS[tu.name] || "🔧 處理中…").join(" "), toolUses.map((tu) => tu.name));
        messages.push({ role: "assistant", content: d.content });
        const toolResults = await Promise.all(toolUses.map(async (tu) => ({
          type: "tool_result",
          tool_use_id: tu.id,
          content: JSON.stringify(await teddyRunTool(tu.name, tu.input)),
        })));
        messages.push({ role: "user", content: toolResults });
      }
      return { text: "工具呼叫太多次了，先停在這裡。", usage: { input: usedInput, output: usedOutput } };
    }

    async function teddyChatWithOpenAI(apiKey, onStatus) {
      // GPT-6 Astra: tools must use the Responses API.
      const oaTools = [
        { type: "web_search" },
        { type:"function", name:"inspect_v51_page", description:"讀取目前網頁內嵌完全體 V5.1.C132 的可見介面、功能入口、表格與固定路由。只在溫室模式可用；回答此頁/功能表/路徑問題時先呼叫。", parameters:{type:"object",properties:{question:{type:"string"}},required:[]}, strict:false },
        ...TEDDY_TOOLS.map((t) => ({
          type: "function",
          name: t.name,
          description: t.description,
          parameters: t.input_schema,
          strict: false,
        }))
      ];

      const visualGuard = teddyAttachment?.kind === "image"
        ? "\n\n【本輪視覺附件規則】你已收到一張真正的圖片，不是檔名或外部連結。必須直接看圖回答。先描述你實際看見的關鍵內容，再回答使用者問題。禁止聲稱『看不到圖片』『只能看到檔名』『打不開連結』，除非 API 本身回報 image decode error。" : "";
      const lastUserText=[...teddyHistory].reverse().find(h=>h.role==="user")?.text||"";
      const urlGuard=/https?:\/\//i.test(lastUserText)
        ? "\n\n【本輪網址規則】使用者提供了網頁連結。你必須使用 web_search 嘗試實際讀取/搜尋該網址的頁面內容與可索引資訊後再回答。不可只看網址字串臆測。若頁面需要登入、遭 robots/權限/CORS/付費牆阻擋，請明確指出限制。" : "";
      const v51PageGuard=(window.TEDDY_APP_MODE==="greenhouse")
        ? "\n\n【V5.1.C132 網頁規則】你正在 Teddy 內嵌的完全體 V5.1.C132 溫室模式。當問題涉及目前頁面、功能表、按鈕、表格、操作路徑或版本內容時，必須先呼叫 inspect_v51_page 取得目前 DOM 與固定路由，再回答；不得憑印象猜。" : "";
      const input = [
        { role: "developer", content: [{ type: "input_text", text: teddyBuildSystemPrompt() + visualGuard + urlGuard + v51PageGuard }] },
        ...teddyChatHistory().map((h) => {
          const isAssistant = h.role === "assistant";
          return {
            role: isAssistant ? "assistant" : "user",
            // Responses API: prior assistant turns are output_text, user turns are input_text.
            content: [{ type: isAssistant ? "output_text" : "input_text", text: h.text }],
          };
        }),
      ];

      if (teddyAttachment) {
        const i = input.length - 1;
        if (i >= 1 && input[i].role === "user") {
          if (teddyAttachment.kind === "image") {
            input[i].content.unshift({
              type: "input_image",
              image_url: `data:${teddyAttachment.mime || "image/jpeg"};base64,${teddyAttachment.data}`,
              detail: "high",
            });
          } else if (teddyAttachment.kind === "file") {
            // Unknown/binary files are handed to Astra as a native file input.
            input[i].content.push({
              type: "input_file",
              filename: teddyAttachment.name,
              file_data: `data:${teddyAttachment.mime || "application/octet-stream"};base64,${teddyAttachment.data}`,
            });
          }
        }
      }

      let guard = 0;
      let usedInput = 0, usedCached = 0, usedOutput = 0, apiCalls=0, costUsd=0;
      let conversationInput = input;

      while (guard++ < 6) {
        const r = await teddyFetch("https://api.openai.com/v1/responses", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify((()=>{
            const visualOnly = teddyAttachment?.kind === "image";
            const mode = window.TEDDY_APP_MODE || "general";
            const allowedTools = visualOnly ? [] : (mode === "greenhouse" ? oaTools : oaTools.filter(t=>t.type==="web_search" || !["greenhouse_query","teddy_hands_login","teddy_hands_command","inspect_v51_page"].includes(t.name)));
            const mdl=teddyDeepOpenAIModel();window.__teddyLastOpenAIModel=mdl;
            const body={model:mdl,reasoning:{effort:"high"},input:conversationInput};
            if(allowedTools.length){body.tools=allowedTools;body.tool_choice="auto";}
            return body;
          })()),
        }, 90000);

        const d = await r.json();
        if (!r.ok) throw new Error(d?.error?.message || `HTTP ${r.status}`);
        if (d.usage) {
          apiCalls++;
          usedInput += d.usage.input_tokens || 0;
          usedCached += d.usage.input_tokens_details?.cached_tokens || 0;
          usedOutput += d.usage.output_tokens || 0;
          costUsd += teddyAstraUsageCost(d.usage);
        }

        const output = Array.isArray(d.output) ? d.output : [];
        const calls = output.filter((x) => x.type === "function_call");
        const text = (d.output_text || output.flatMap((x) => x.content || [])
          .filter((x) => x.type === "output_text")
          .map((x) => x.text || "").join("\n")).trim();

        if (!calls.length) {
          return { text: text || "（沒有回覆）", usage: { input: usedInput, cached: usedCached, output: usedOutput, apiCalls, costUsd } };
        }

        if (onStatus) {
          onStatus(
            calls.map((c) => TEDDY_TOOL_STATUS_LABELS[c.name] || "🔧 處理中…").join(" "),
            calls.map((c) => c.name)
          );
        }

        const toolOutputs = [];
        for (const call of calls) {
          let args = {};
          try { args = typeof call.arguments === "string" ? JSON.parse(call.arguments || "{}") : (call.arguments || {}); } catch (_) {}
          const result = call.name==="inspect_v51_page" ? teddyInspectV51Page(args?.question||"") : await teddyRunTool(call.name, args);
          toolOutputs.push({
            type: "function_call_output",
            call_id: call.call_id || call.id,
            output: JSON.stringify(result),
          });
        }

        // Preserve Astra reasoning/tool state by carrying prior output into the next Responses turn.
        conversationInput = [...conversationInput, ...output, ...toolOutputs];
      }
      return { text: "工具呼叫太多次了，先停在這裡。", usage: { input: usedInput, cached: usedCached, output: usedOutput, apiCalls, costUsd } };
    }

    // 5.5.1 Astra fallback：Astra 本體失敗時，用 GPT-5.6 Sol + web_search 完成本輪；不冒充 Astra 成功。
    async function teddyChatWithOpenAIFallback(apiKey, onStatus, originalError) {
      if(onStatus)onStatus("↪ Astra 暫時失敗，切換 GPT-5.6 Sol 備援分析…",[]);
      const fresh=teddyFreshContext?`\n\n【已取得的即時資料】\n${teddyFreshContext}`:"";
      const r=await teddyFetch("https://api.openai.com/v1/responses",{
        method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${apiKey}`},
        body:JSON.stringify({model:"gpt-5.6-sol",reasoning:{effort:"high"},tools:[{type:"web_search"}],input:[{role:"developer",content:[{type:"input_text",text:teddyBuildSystemPrompt()+fresh+"\n\nAstra 本輪不可用。你是備援分析核心。若是投資題，先核對即時資料，再區分事實/推論/情境與風險；不得編造價格或公告。"}]},...teddyChatHistory().map(h=>({role:h.role==="assistant"?"assistant":"user",content:[{type:h.role==="assistant"?"output_text":"input_text",text:h.text}]}))]})
      },90000);
      const d=await r.json();if(!r.ok)throw new Error(d?.error?.message||`Fallback HTTP ${r.status}`);
      const text=(d.output_text||((d.output||[]).flatMap(x=>x.content||[]).filter(x=>x.type==="output_text").map(x=>x.text||"").join("\n"))).trim();
      return {text:text||"備援模型沒有回傳文字。",usage:{input:d.usage?.input_tokens||0,cached:d.usage?.input_tokens_details?.cached_tokens||0,output:d.usage?.output_tokens||0,apiCalls:1,costUsd:0},fallback:true,astraError:String(originalError?.message||originalError||"")};
    }

    // Grok 走 OpenAI 相容格式，跟 teddyChatWithOpenAI 幾乎一模一樣，只是換端點/模型/金鑰。
    async function teddyChatWithGrok(apiKey, onStatus) {
      const oaTools = TEDDY_TOOLS.map((t) => ({ type: "function", function: { name: t.name, description: t.description, parameters: t.input_schema } }));
      const messages = [{ role: "system", content: teddyBuildSystemPrompt() }, ...teddyChatHistory().map((h) => ({ role: h.role, content: h.text }))];
      if(teddyAttachment?.kind==="image"){
        const i=messages.length-1;
        if(i>=1&&messages[i].role==="user")messages[i].content=[{type:"text",text:messages[i].content},{type:"image_url",image_url:{url:`data:${teddyAttachment.mime};base64,${teddyAttachment.data}`,detail:"high"}}];
      }
      let guard = 0;
      let usedInput = 0, usedOutput = 0;
      while (guard++ < 4) {
        const r = await teddyFetch("https://api.x.ai/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({ model: "grok-4.6", messages, tools: oaTools, tool_choice: "auto" }),
        }, 30000);
        const d = await r.json();
        if (!r.ok) throw new Error(d?.error?.message || `HTTP ${r.status}`);
        if (d.usage) { usedInput += d.usage.prompt_tokens || 0; usedOutput += d.usage.completion_tokens || 0; }
        const msg = d.choices[0].message;
        if (!msg.tool_calls || !msg.tool_calls.length) return { text: msg.content || "（沒有回覆）", usage: { input: usedInput, output: usedOutput } };
        if (onStatus) onStatus(msg.tool_calls.map((tc) => TEDDY_TOOL_STATUS_LABELS[tc.function.name] || "🔧 處理中…").join(" "), msg.tool_calls.map((tc) => tc.function.name));
        messages.push(msg);
        for (const tc of msg.tool_calls) {
          let args = {};
          try { args = JSON.parse(tc.function.arguments || "{}"); } catch (_) {}
          const result = await teddyRunTool(tc.function.name, args);
          messages.push({ role: "tool", tool_call_id: tc.id, content: JSON.stringify(result) });
        }
      }
      return { text: "工具呼叫太多次了，先停在這裡。", usage: { input: usedInput, output: usedOutput } };
    }

    // Gemini 的函式呼叫協定跟 Claude/OpenAI 不同：角色是 user/model（不是 assistant），
    // 呼叫結果要包成 functionResponse 塞進下一輪的 user content，不是獨立的 tool 訊息。
    async function teddyChatWithGemini(apiKey, onStatus) {
      const geminiTools = [{ functionDeclarations: TEDDY_TOOLS.map((t) => ({ name: t.name, description: t.description, parameters: t.input_schema })) }];
      const contents = teddyChatHistory().map((h) => ({ role: h.role === "assistant" ? "model" : "user", parts: [{ text: h.text }] }));
      if(teddyAttachment?.kind==="image"){
        const i=contents.length-1;
        if(i>=0&&contents[i].role==="user")contents[i].parts.push({inlineData:{mimeType:teddyAttachment.mime,data:teddyAttachment.data}});
      }
      let guard = 0;
      let usedInput = 0, usedOutput = 0;
      while (guard++ < 4) {
        const r = await teddyFetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              system_instruction: { parts: [{ text: teddyBuildSystemPrompt() }] },
              contents,
              tools: geminiTools,
            }),
          }, 30000
        );
        const d = await r.json();
        if (!r.ok) throw new Error(d?.error?.message || `HTTP ${r.status}`);
        if (d.usageMetadata) { usedInput += d.usageMetadata.promptTokenCount || 0; usedOutput += d.usageMetadata.candidatesTokenCount || 0; }
        const parts = d.candidates?.[0]?.content?.parts || [];
        const calls = parts.filter((p) => p.functionCall);
        const textOut = parts.filter((p) => p.text).map((p) => p.text).join("");
        if (!calls.length) return { text: textOut || "（沒有回覆）", usage: { input: usedInput, output: usedOutput } };
        if (onStatus) onStatus(calls.map((c) => TEDDY_TOOL_STATUS_LABELS[c.functionCall.name] || "🔧 處理中…").join(" "), calls.map((c) => c.functionCall.name));
        contents.push({ role: "model", parts });
        const responseParts = await Promise.all(calls.map(async (c) => ({
          functionResponse: { name: c.functionCall.name, response: await teddyRunTool(c.functionCall.name, c.functionCall.args || {}) },
        })));
        contents.push({ role: "user", parts: responseParts });
      }
      return { text: "工具呼叫太多次了，先停在這裡。", usage: { input: usedInput, output: usedOutput } };
    }

    // ===== TEDDY 語音（優先用 OpenAI TTS 甜美女聲，沒有 Key 才 fallback 瀏覽器內建語音）=====
    let teddyVoiceEnabled = false; // 預設靜音，避免在安靜場合突然講話
    let teddyCurrentAudio = null;
    let teddyCurrentChipmunkSource = null;
    let teddyAudioCtx = null;

    // 花栗鼠效果預設開啟（松鼠角色配這個很合理），可以關掉。
    const TEDDY_CHIPMUNK_KEY = "teddy_chipmunk_voice";
    function teddyChipmunkEnabled() {
      const v = localStorage.getItem(TEDDY_CHIPMUNK_KEY);
      return v === null ? true : v === "1";
    }
    function teddySetChipmunkEnabled(on) {
      localStorage.setItem(TEDDY_CHIPMUNK_KEY, on ? "1" : "0");
    }

    function teddyGetAudioCtx() {
      if (!teddyAudioCtx) teddyAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
      return teddyAudioCtx;
    }

    // playbackRate 同時拉高音調跟加快速度——就是「花栗鼠效果」，不需要額外的變聲函式庫。
    async function teddyPlayChipmunk(blob, rateMultiplier) {
      const ctx = teddyGetAudioCtx();
      if (ctx.state === "suspended") await ctx.resume();
      const arrayBuffer = await blob.arrayBuffer();
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.playbackRate.value = rateMultiplier || 1;
      source.connect(ctx.destination);
      teddyCurrentChipmunkSource = source;
      return new Promise((resolve) => {
        source.onended = resolve;
        source.start(0);
      });
    }

    // ===== TEDDY 用量統計：token 來自 API usage；費用依 GPT-6 Astra 官方單價估算 =====
    const TEDDY_USAGE_KEY = "teddy_usage_stats";
    function teddyLoadUsage() {
      try { return JSON.parse(localStorage.getItem(TEDDY_USAGE_KEY) || "{}"); } catch (_) { return {}; }
    }
    function teddySaveUsage(u) { localStorage.setItem(TEDDY_USAGE_KEY, JSON.stringify(u)); }
    // ===== 8.4 深度思考引擎：預設 Claude Sonnet 5.5（有 Claude 金鑰時）或 GPT-6.1 Sol；Astra 只在手動選擇時使用 =====
    const TEDDY_DEEP_KEY="teddy_deep_engine_v1";
    const TEDDY_DEEP_ENGINES={
      "claude-sonnet":{p:"anthropic",model:"claude-sonnet-5-5",label:"Claude Sonnet 5.5",inP:2,cP:0.2,outP:10},
      "claude-opus":{p:"anthropic",model:"claude-opus-5-5",label:"Claude Opus 5.5",inP:4,cP:0.4,outP:20},
      "sol":{p:"openai",model:"gpt-6.1-sol",label:"GPT-6.1 Sol",inP:2,cP:0.1,outP:10},
      "astra":{p:"openai",model:"gpt-6-astra",label:"GPT-6 Astra",inP:10,cP:1,outP:50}
    };
    const TEDDY_MODEL_PRICE={"gpt-6-astra":[10,1,50],"gpt-6.1-sol":[2,0.1,10],"gpt-5.6-sol":[2,0.2,10],"claude-sonnet-5-5":[2,0.2,10],"claude-opus-5-5":[4,0.4,20],"claude-haiku-5-5":[0.1,0.01,0.5]};
    function teddyDeepChoice(keys){
      keys=keys||loadKeys();
      let v="auto";try{v=localStorage.getItem(TEDDY_DEEP_KEY)||"auto";}catch(_){}
      if(v==="auto")v=keys.anthropic?"claude-sonnet":"sol";
      let id=TEDDY_DEEP_ENGINES[v]?v:"sol";
      if(TEDDY_DEEP_ENGINES[id].p==="anthropic"&&!keys.anthropic)id="sol";
      if(TEDDY_DEEP_ENGINES[id].p==="openai"&&!keys.openai&&keys.anthropic)id="claude-sonnet";
      return {id,...TEDDY_DEEP_ENGINES[id]};
    }
    window.teddyDeepChoice=teddyDeepChoice;
    function teddyDeepOpenAIModel(){const c=teddyDeepChoice();return c.p==="openai"?c.model:"gpt-6.1-sol";}
    window.teddyDeepOpenAIModel=teddyDeepOpenAIModel;
    function teddyModelCost(model,input,cached,output){const pr=TEDDY_MODEL_PRICE[model]||[2,0.2,10];const unc=Math.max(0,(input||0)-(cached||0));return unc/1e6*pr[0]+(cached||0)/1e6*pr[1]+(output||0)/1e6*pr[2];}
    window.teddyModelCost=teddyModelCost;
    // 簡單一次問答（語音的深度思考、溫室等用）：依選擇的引擎呼叫
    async function teddyDeepAsk(system,user,effort){
      const keys=loadKeys(),c=teddyDeepChoice(keys);
      if(c.p==="anthropic"){
        const r=await teddyFetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json","x-api-key":keys.anthropic,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},body:JSON.stringify({model:c.model,max_tokens:4096,system,messages:[{role:"user",content:user}]})},90000);
        const d=await r.json();if(!r.ok)throw new Error(d?.error?.message||`Claude HTTP ${r.status}`);
        if(d.usage)teddyRecordChatUsage("anthropic",{input:d.usage.input_tokens||0,output:d.usage.output_tokens||0,apiCalls:1,costUsd:teddyModelCost(c.model,d.usage.input_tokens,0,d.usage.output_tokens)});
        return {text:(d.content||[]).filter(x=>x.type==="text").map(x=>x.text).join("").trim(),label:c.label};
      }
      const r=await teddyFetch("https://api.openai.com/v1/responses",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${keys.openai}`},body:JSON.stringify({model:c.model,reasoning:{effort:effort||"high"},input:[{role:"developer",content:[{type:"input_text",text:system}]},{role:"user",content:[{type:"input_text",text:user}]}]})},90000);
      const d=await r.json();if(!r.ok)throw new Error(d?.error?.message||`${c.label} HTTP ${r.status}`);
      if(d.usage)teddyRecordChatUsage("openai",{input:d.usage.input_tokens||0,cached:d.usage.input_tokens_details?.cached_tokens||0,output:d.usage.output_tokens||0,apiCalls:1,costUsd:teddyModelCost(c.model,d.usage.input_tokens,d.usage.input_tokens_details?.cached_tokens||0,d.usage.output_tokens)});
      return {text:(d.output_text||((d.output||[]).flatMap(x=>x.content||[]).filter(x=>x.type==="output_text").map(x=>x.text||"").join("\n"))).trim(),label:c.label};
    }
    window.teddyDeepAsk=teddyDeepAsk;
    function teddyAstraUsageCost(raw){
      const x=raw||{};
      const input=Number(x.input_tokens??x.input??0)||0;
      const cached=Number(x.input_tokens_details?.cached_tokens??x.cached??0)||0;
      const output=Number(x.output_tokens??x.output??0)||0;
      const uncached=Math.max(0,input-cached);
      // GPT-6 Astra：標準輸入 $10/M、快取輸入 $1/M、輸出 $50/M；實際帳單仍以 OpenAI API usage/billing 為準。
      // >272K input request: full request input/cache x2, output x1.5.
      const long=input>272000;
      const pr=TEDDY_MODEL_PRICE[window.__teddyLastOpenAIModel||teddyDeepOpenAIModel()]||[10,1,50];
      return (uncached/1e6)*pr[0]*(long?2:1)+(cached/1e6)*pr[1]*(long?2:1)+(output/1e6)*pr[2]*(long?1.5:1);
    }
    function teddyRecordChatUsage(provider, usage) {
      if (!provider || !usage) return;
      const u = teddyLoadUsage();
      if (!u[provider]) u[provider] = { calls: 0, apiCalls:0, inputTokens: 0, cachedTokens:0, outputTokens: 0, costUsd:0 };
      const r=u[provider];
      r.calls=(r.calls||0)+1;
      r.apiCalls=(r.apiCalls||0)+(usage.apiCalls||1);
      r.inputTokens=(r.inputTokens||0)+(usage.input||0);
      r.cachedTokens=(r.cachedTokens||0)+(usage.cached||0);
      r.outputTokens=(r.outputTokens||0)+(usage.output||0);
      if(provider==="openai") r.costUsd=(r.costUsd||0)+(usage.costUsd!=null?usage.costUsd:teddyAstraUsageCost({input:usage.input,cached:usage.cached,output:usage.output}));
      else if(provider==="anthropic") r.costUsd=(r.costUsd||0)+(usage.costUsd!=null?usage.costUsd:teddyModelCost(window.__teddyLastClaudeModel||"claude-sonnet-5-5",usage.input,0,usage.output));
      teddySaveUsage(u);
      teddyRenderAstraUsageSummary();
    }
    function teddyRecordTtsUsage(chars) {
      const u = teddyLoadUsage();
      if (!u.tts) u.tts = { calls: 0, chars: 0 };
      u.tts.calls += 1; u.tts.chars += chars || 0; teddySaveUsage(u);
    }
    function teddyRenderAstraUsageSummary(){
      const el=document.getElementById("teddyAstraUsageSummary");if(!el)return;
      const u=teddyLoadUsage(),o=u.openai||{},a=u.anthropic||{};
      let lab="深度思考";try{lab=teddyDeepChoice().label;}catch(_){}
      el.innerHTML=`🧠 深度思考（${lab}）｜累計 ${(o.calls||0)+(a.calls||0)} 次 · US$${(Number(o.costUsd||0)+Number(a.costUsd||0)).toFixed(4)}　<span style="color:#657a72;">OpenAI US$${Number(o.costUsd||0).toFixed(3)}・Claude US$${Number(a.costUsd||0).toFixed(3)}</span>`;
    }
    function teddyRenderUsage() {
      const panel = document.getElementById("teddyUsagePanel"); if (!panel) return;
      const u=teddyLoadUsage(),o=u.openai||{calls:0,apiCalls:0,inputTokens:0,cachedTokens:0,outputTokens:0,costUsd:0},c=u.anthropic||{calls:0,inputTokens:0,outputTokens:0},t=u.tts||{calls:0,chars:0};
      panel.innerHTML=`<div>🧠 GPT‑6 Astra：${o.calls||0} 次對話 / ${o.apiCalls||0} 次 API · US$${Number(o.costUsd||0).toFixed(6)}</div>
      <div>Input ${Math.max(0,(o.inputTokens||0)-(o.cachedTokens||0)).toLocaleString()} · Cached ${(o.cachedTokens||0).toLocaleString()} · Output ${(o.outputTokens||0).toLocaleString()}</div>
      <div>💬 Claude：${c.calls||0} 次對話</div><div>🔊 TTS：${t.calls||0} 次</div>
      <div style="margin-top:6px;"><button type="button" id="teddyUsageReset" style="background:none;border:1px solid #2a3532;color:#8a9a92;border-radius:6px;padding:2px 8px;font-size:11px;cursor:pointer;">重設統計</button></div>`;
      const resetBtn=document.getElementById("teddyUsageReset");if(resetBtn)resetBtn.onclick=()=>{localStorage.removeItem(TEDDY_USAGE_KEY);teddyRenderUsage();teddyRenderAstraUsageSummary();};
      teddyRenderAstraUsageSummary();
    }

    // ===== TEDDY 多種語調（可手動選，預設由內容自動判斷）=====
    const TEDDY_VOICE_STYLES = {
      sweet: "自然、甜美、親切、清楚。聲音柔亮但不要娃娃音；有自然停頓與語氣，像熟悉的年輕助理，避免刻意裝可愛。",
      playful: "年輕、自然、活潑、有一點調皮。語速微快、反應俐落、有自然停頓和情緒起伏，但不要浮誇、不要尖銳。",
      gentle: "說話放得很輕、很慢，溫柔安撫的語氣，像哄人入睡一樣，音量感覺較低、語尾拉長，給人放鬆平靜的感覺。",
      storyteller: "用穩重、有磁性、像在說故事或念書給人聽的語氣，語速適中偏慢，斷句清楚，帶一點戲劇張力，適合朗讀文章內容。",
      excited: "說話語氣興奮、驚喜，音調上揚、語速稍快，像發現超酷的事情迫不及待要分享，但咬字仍要清楚。"
    };

    const TEDDY_VOICE_PROFILES = {
      // chipmunk 是額外疊加在 OpenAI TTS 播放上的「花栗鼠效果」倍率（拉高音調＋加速），
      // 跟原本只給瀏覽器備援語音用的 pitch 欄位分開，這樣主要播放路徑（OpenAI TTS）才會真的變聲。
      sweet:       { voice: "nova",    speed: 1.02, pitch: 1.18, rate: 1.02, chipmunk: 1.12 },
      playful:     { voice: "shimmer", speed: 1.08, pitch: 1.24, rate: 1.08, chipmunk: 1.18 },
      gentle:      { voice: "nova",    speed: 0.92, pitch: 1.05, rate: 0.92, chipmunk: 1.05 },
      storyteller: { voice: "nova",    speed: 0.95, pitch: 1.0,  rate: 0.95, chipmunk: 1.0  },
      excited:     { voice: "shimmer", speed: 1.1,  pitch: 1.3,  rate: 1.1,  chipmunk: 1.2  }
    };

    function teddyAutoDetectVoiceStyle(replyText, lastToolNames) {
      const tools = lastToolNames || [];
      if (tools.includes("read_article") || tools.includes("save_article")) return "storyteller";
      if (/晚安|該睡了|放鬆一下|閉上眼睛|好好休息/.test(replyText)) return "gentle";
      if (/(😂|🤣|哈哈|開玩笑|逗你)/.test(replyText)) return "playful";
      const exclaimCount = (replyText.match(/！|!/g) || []).length;
      if (/(🎉|✨|🚀|太酷了|太厲害|驚喜|哇)/.test(replyText) || exclaimCount >= 2) return "excited";
      return "sweet";
    }


    const TEDDY_VOICE_STYLE_KEY = "teddy_voice_style_v3";
    function teddyInitVoiceStylePreference() {
      const sel = document.getElementById("teddyVoiceStyleSelect");
      if (!sel) return;
      const saved = localStorage.getItem(TEDDY_VOICE_STYLE_KEY);
      if (saved && Array.from(sel.options).some(o => o.value === saved)) sel.value = saved;
      sel.addEventListener("change", () => {
        localStorage.setItem(TEDDY_VOICE_STYLE_KEY, sel.value);
      });
    }

    function teddyResolveVoiceStyle(autoHint) {
      const sel = document.getElementById("teddyVoiceStyleSelect");
      const val = sel ? sel.value : "auto";
      if (val !== "auto" && TEDDY_VOICE_STYLES[val]) return val;
      return TEDDY_VOICE_STYLES[autoHint] ? autoHint : "sweet";
    }

    async function teddySpeak(text, autoStyleHint, forcePreview = false) {
      // 7.0.2：即時語音進行中只讓 Live 說話，避免兩個聲音（一男一女）疊在一起。
      if (typeof window.teddyLiveIsActive === "function" && window.teddyLiveIsActive()) return;
      if ((!teddyVoiceEnabled && !forcePreview) || !text) return;
      const clean = text.replace(/[*_`#]/g, "").trim();
      if (!clean) return;
      const keys = loadKeys();
      if (teddyCurrentAudio) { try { teddyCurrentAudio.pause(); } catch (_) {} }
      if (teddyCurrentChipmunkSource) { try { teddyCurrentChipmunkSource.stop(); } catch (_) {} }

      const styleKey = teddyResolveVoiceStyle(autoStyleHint);
      const instructions = TEDDY_VOICE_STYLES[styleKey] || TEDDY_VOICE_STYLES.sweet;
      const profile = TEDDY_VOICE_PROFILES[styleKey] || TEDDY_VOICE_PROFILES.sweet;

      if (keys.openai) {
        const requestVoice = async (voiceName) => {
          const r = await teddyFetch("https://api.openai.com/v1/audio/speech", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${keys.openai}` },
            body: JSON.stringify({
              model: "gpt-4o-mini-tts",
              voice: voiceName,
              input: clean,
              speed: profile.speed,
              instructions
            })
          }, 20000);
          if (!r.ok) throw new Error("TTS HTTP " + r.status);
          return await r.blob();
        };

        try {
          let blob;
          try {
            blob = await requestVoice(profile.voice);
          } catch (_) {
            // Some accounts/models may not expose every voice; nova is the compatibility fallback.
            blob = await requestVoice("nova");
          }
          teddyRecordTtsUsage(clean.length);

          if (teddyChipmunkEnabled() && (profile.chipmunk || 1) !== 1) {
            try {
              await teddyPlayChipmunk(blob, profile.chipmunk);
              return;
            } catch (_) {
              // 解碼失敗（例如舊瀏覽器不支援）就照原本方式播放，不要整段語音直接沒聲音。
            }
          }

          const url = URL.createObjectURL(blob);
          teddyCurrentAudio = new Audio(url);
          teddyCurrentAudio.onended = () => URL.revokeObjectURL(url);
          await teddyCurrentAudio.play();
          return;
        } catch (_) {
          // Fall through to browser TTS.
        }
      }

      if (window.speechSynthesis) {
        try {
          window.speechSynthesis.cancel();
          const utter = new SpeechSynthesisUtterance(clean);
          utter.lang = "zh-TW";
          utter.pitch = profile.pitch;
          utter.rate = profile.rate;
          const voices = window.speechSynthesis.getVoices();
          const zhVoices = voices.filter(v => /zh|cmn/i.test(v.lang));
          const preferred =
            zhVoices.find(v => /female|女|Mei|Ting|Yating|Hanhan|Xiaoxiao|Google.*中文|Microsoft.*Hsiao/i.test(v.name)) ||
            zhVoices[0];
          if (preferred) utter.voice = preferred;
          window.speechSynthesis.speak(utter);
        } catch (_) {}
      }
    }


    function teddyV31CapabilityList() {
      return [
        "一般聊天與記憶",
        "現在日期／時間",
        "數學計算",
        "天氣查詢",
        "倒數計時",
        "提醒",
        "照片與資料附件分析",
        "新聞／即時資訊搜尋",
        "財務與投資分析",
        "農業分析",
        "程式協助",
        "文章寫作與朗讀",
        "語音輸入與 TTS 語音"
      ];
    }


    function teddyV31DiagnosticsText() {
      const s = teddyRuntimeState();
      const checks = [
        ["版本辨識", true, s.version],
        ["日期時間", typeof Intl !== "undefined", "本機時間"],
        ["數學工具", TEDDY_TOOLS.some(t => t.name === "calculate"), "calculate"],
        ["天氣工具", TEDDY_TOOLS.some(t => t.name === "get_weather"), "Open-Meteo"],
        ["計時器", TEDDY_TOOLS.some(t => t.name === "start_timer"), "瀏覽器計時"],
        ["提醒", TEDDY_TOOLS.some(t => t.name === "set_reminder"), "分頁開啟時"],
        ["即時搜尋", s.searchReady, s.searchReady ? "xAI 已設定" : "需要 xAI Key"],
        ["Claude", s.claudeReady, s.claudeReady ? "可用" : "未設定"],
        ["GPT-6 Astra", s.openaiReady, s.openaiReady ? "可用" : "未設定"],
        ["語音輸入", s.speechRecognitionReady, s.speechRecognitionReady ? "支援" : "此瀏覽器不支援"],
        ["瀏覽器 TTS", s.browserTtsReady, s.browserTtsReady ? "支援" : "不支援"],
        ["Firebase", s.firebaseReady, s.firebaseReady ? "SDK 已載入" : "未載入"],
        ["財務 Skill", !!TEDDY_SKILLS.investment, "已啟用"],
        ["農業 Skill", !!TEDDY_SKILLS.agriculture, "已啟用"],
        ["工程 Skill", !!TEDDY_SKILLS.coding, "已啟用"],
      ];
      return "我是 " + s.version + "。\\n" +
        checks.map(([name, ok, note]) => `${ok ? "✅" : "⚠️"} ${name}：${note}`).join("\\n") +
        `\\n目前介面模型：${s.modelPreference}\\n模型分工：${teddyModelRoutingText()}\\n目前語音：${s.voice}\\n目前 Skill：${s.skillPreference}`;
    }

    // 5.1：複雜問題固定優先交給 GPT-6 Astra；一般／溫室模式共用。
    // 5.2.9：只有實際送出 model=gpt-6-astra 才顯示/計入 Astra；API 無權限時直接回報錯誤，不假裝成功、不偷偷降級。
    function teddyModelRoutingText(){
      const sel=document.getElementById("teddyModelSelect"),v=sel?sel.value:"auto";
      const label=sel&&sel.selectedOptions&&sel.selectedOptions[0]?sel.selectedOptions[0].textContent:"智慧分工";
      const deepLab=(()=>{try{return teddyDeepChoice().label;}catch(_){return "GPT-6.1 Sol";}})();
      const text=v==="auto"?`文字聊天為智慧分工：一般對話先用 Gemini，需要深度推理（分析、規劃、評估、程式等）才交給深度思考引擎「${deepLab}」`:`文字聊天固定使用「${label}」`;
      return `${text}；即時語音由 ${typeof window.teddyGliveVariantLabel==="function"?window.teddyGliveVariantLabel():"Gemini Live"} 說話，遇到複雜問題才呼叫深度思考引擎「${(()=>{try{return teddyDeepChoice().label;}catch(_){return "GPT-6.1 Sol";}})()}」；溫室問題的理解用 Gemini Flash，數字一律由程式從完全體讀取計算。`;
    }
    // 8.6.2：「真正需要思考」判斷——聊天一律 Gemini；只有明確要求，或同時出現兩個以上推理訊號，才交給深度引擎。
    function teddyDeepJudge(message,o){
      o=o||{};
      const t=String(message||"").trim(), len=t.replace(/\s/g,"").length;
      if(!t)return{deep:false,score:0,reason:""};
      if(/簡單(說|講|回答|回)|一句話|不用(深|想太多|分析|太詳細)|快速回答|隨便聊|閒聊/.test(t))return{deep:false,score:0,reason:"你要簡短回答"};
      if(/深度思考|深想|深入(分析|研究|想|評估)|仔細(想|分析|評估|研究|算)|想清楚|認真(分析|想|評估)|好好(分析|想)|完整分析|詳細分析|專業分析|用\s*(claude|opus|sonnet|sol|astra)/i.test(t))return{deep:true,score:9,reason:"你指定要深度思考"};
      if(/寫.{0,6}(程式|腳本|函式|code)|程式碼|除錯|debug|報錯|錯誤訊息|stack ?trace|syntax ?error|is not defined|undefined/i.test(t))return{deep:true,score:9,reason:"程式／除錯"};
      if(o.invest&&/週檢|週報|(下週|本週|這週|每週|下禮拜).{0,8}(名單|推薦|觀察|變化|檔|強弱)|盤後報告|報告|明日.{0,4}(計畫|計劃|操作|指南)|大盤.{0,8}(解讀|分析|怎麼看|看法|研判)/.test(t))return{deep:true,score:9,reason:"盤後報告／大盤解讀"};
      let score=0;const why=[];
      const add=(re,n,w)=>{if(re.test(t)){score+=n;why.push(w);}};
      add(/(幫我|請|替我|麻煩)(分析|評估|研判|診斷)|分析一下|評估一下/,2,"請我分析");
      if(!why.length)add(/分析|評估|解讀|研判|看法|怎麼看|檢討/,1,"分析");
      add(/該不該|要不要|值不值得|划不划算|哪個(比較)?好|怎麼選|如何選|選哪|取捨|利弊/,1,"做選擇");
      add(/比較(?!好|快|慢|便宜|貴|多|少|大|小|久|近|遠|早|晚|方便|簡單|難)|差異|優缺點|\bvs\.?\b|對比/i,1,"比較");
      add(/策略|方案|規劃|佈局|配置|架構|流程設計|最佳化|優化/,1,"規劃");
      add(/預測|推估|推算|試算|估算|模擬|情境|風險|如果.{2,20}(會怎樣|會如何|會不會|怎麼辦)/,1,"推估");
      add(/診斷|病因|為什麼會|怎麼會|找出原因|根本原因|原因是什麼/,1,"找原因");
      if(((t.match(/[?？]/g)||[]).length>=2)||/(1[.、)]|一、|第一).{2,}(2[.、)]|二、|第二)/s.test(t)){score+=1;why.push("多個問題");}
      if(len>=200){score+=1;why.push("內容長");}
      if(len>=500)score+=1;
      if(o.attachment&&/分析|評估|解讀|比較|檢查|審|修改|摘要|整理|重點|錯/.test(t)){score+=1;why.push("附件要分析");}
      if(score<=2&&/多少|幾點|幾度|幾號|現在|是什麼|是誰|在哪|查一下|列出|排行|前\s*\d+|名單|有沒有|怎麼樣|如何了|漲跌/.test(t)&&!/(幫我|請|替我)(分析|評估)|分析一下/.test(t))score-=1;
      return{deep:score>=2,score,reason:why.join("、")};
    }
    function teddyIsComplexQuestion(message,o){return teddyDeepJudge(message,o).deep;}
    function teddyChooseProvider(message,keys,context="general"){
      const t=String(message||"");
      const available={anthropic:!!keys.anthropic,openai:!!keys.openai,gemini:!!keys.google,grok:!!keys.xai};
      let order;
      if(teddyIsComplexQuestion(t) && (available.openai||available.anthropic)) order=teddyDeepChoice(keys).p==="anthropic"?["anthropic","openai","gemini","grok"]:["openai","anthropic","gemini","grok"];
      else if(teddyFreshContext)order=["gemini","anthropic","openai","grok"];
      else if(/最新|今天.*新聞|即時|目前股價|市場消息/.test(t))order=["grok","openai","anthropic","gemini"];
      else if(context==="greenhouse")order=["gemini","openai","anthropic","grok"];
      else if(/圖片|照片|看圖|辨識|病斑|葉片/.test(t))order=["gemini","openai","anthropic","grok"];
      else order=["gemini","openai","anthropic","grok"];
      return order.find(p=>available[p])||null;
    }


    function teddyV31LocalCoreReply(message) {
      const q = String(message || "").trim();
      const core = teddyV31CoreIntent(q);

      // Time/date is answered locally so it can never regress because of model/tool-choice behavior.
      if (core === "datetime") {
        const now = new Date();
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "本地時區";
        const formatted = new Intl.DateTimeFormat("zh-TW", {
          year: "numeric", month: "2-digit", day: "2-digit",
          weekday: "long", hour: "2-digit", minute: "2-digit", second: "2-digit",
          hour12: false
        }).format(now);
        return `現在是 ${formatted}，時區 ${tz}。`;
      }

      // Self-awareness/version/capability questions are answered from the real UI/runtime, never guessed by the model.
      if (/(妳的版本|你的版本|什麼版本|版本多少|版本是什麼|妳會什麼|你會什麼|有什麼能力|自我檢查|能力檢查|系統狀態|回報版本|功能檢查)/i.test(q)) {
        return teddyV31DiagnosticsText();
      }

      return null;
    }


    // ===== TEDDY Hands 5.1.6：A01 授權 → 草稿 → 復述 → 確認 → 寫入 V5.1 =====
    let teddyHandsSession=null;   // 只存在記憶體；重新整理即失效
    let teddyHandsPending=null;   // 待確認草稿；不自動寫入
    let teddyHandsWorkMode=null; // assign / report
    let teddyHandsFlow={};       // 工作入口導引狀態

    // ===== Smart Teddy 8.6.2：主人版＝A01 孫爸（完全體開發者，全部權限）=====
    // 主人版（無 ?app 參數）閱讀全部資料本來就不受限；這裡讓 A 開頭帳號驗證一次後記在「這台裝置」，
    // 重新整理不必再驗證。只存編號、姓名、身分與權限，不存密碼；寫入仍走「草稿 → 復述 → 你確認」。
    // 說「登出」或「取消授權」即清除。溫室助理入口（員工）不受影響，仍是每次登入。
    const TEDDY_OWNER_ID="A01",TEDDY_OWNER_NAME="孫爸";
    const TEDDY_OWNER_SESSION_KEY="teddy_owner_session_v1"+(window.TEDDY_KEY_SUFFIX||"");
    function teddyIsOwnerEntry(){return (window.TEDDY_ENTRY_ID||"owner")==="owner";}
    function teddyOwnerSessionSave(){
      if(!teddyIsOwnerEntry())return;
      const s=teddyHandsSession;if(!s||!/^A/i.test(String(s.id||"")))return;
      try{localStorage.setItem(TEDDY_OWNER_SESSION_KEY,JSON.stringify({id:String(s.id).toUpperCase(),role:s.role||"designer",name:s.name||"",menuPerms:s.menuPerms||{},tier:s.tier||null,status:s.status||"active",at:Date.now()}));}catch(_){}
    }
    function teddyOwnerSessionRestore(){
      if(!teddyIsOwnerEntry()||teddyHandsSession)return;
      try{
        const v=JSON.parse(localStorage.getItem(TEDDY_OWNER_SESSION_KEY)||"null");
        if(v&&/^A/i.test(String(v.id||"")))teddyHandsSession=v;
      }catch(_){}
    }
    function teddyOwnerSessionClear(){
      try{localStorage.removeItem(TEDDY_OWNER_SESSION_KEY);}catch(_){}
      teddyHandsSession=null;teddyHandsPending=null;
      try{teddyHandsRender();}catch(_){}
    }
    // 問到「我」的時候是誰：已驗證帳號優先；主人版預設 A01 孫爸。
    function ghMyId(){
      if(teddyHandsSession&&teddyHandsSession.id)return String(teddyHandsSession.id).toUpperCase();
      return teddyIsOwnerEntry()?TEDDY_OWNER_ID:null;
    }
    teddyOwnerSessionRestore();
    setTimeout(()=>{try{teddyHandsRender();}catch(_){}},0);

    function teddyHandsNowStamp(){
      const d=new Date(),p=n=>String(n).padStart(2,"0");
      return `${d.getFullYear()}/${p(d.getMonth()+1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
    }
    function teddyHandsYmFromText(t){
      const q=String(t||""),now=new Date(); let y=now.getFullYear(),m=now.getMonth()+1;
      let x=q.match(/(20\d{2})\s*年/); if(x)y=+x[1];
      x=q.match(/(?:^|[^\d])(1[0-2]|[1-9])\s*月/); if(x)m=+x[1];
      if(/下個月|下月/.test(q)){const d=new Date(y,m,1);y=d.getFullYear();m=d.getMonth()+1;}
      if(/上個月|上月/.test(q)){const d=new Date(y,m-2,1);y=d.getFullYear();m=d.getMonth()+1;}
      return `${y}-${String(m).padStart(2,"0")}`;
    }
    function teddyHandsZoneFromText(t){
      const q=String(t||"");
      const pairs=[["p1",/(?:一期|p1)/i,"一期溫室"],["p2",/(?:二期|p2|總公司)/i,"二期溫室"],["zone3",/(?:三期|zone3)/i,"三期溫室"],["north4",/(?:四北|north4)/i,"四北溫室"],["south4",/(?:四南|south4)/i,"四南溫室"],["zone5",/(?:五期|zone5)/i,"五期溫室"]];
      for(const [id,re,name] of pairs)if(re.test(q))return {id,name}; return null;
    }
    function teddyHandsWorkItemFromText(t){
      const q=String(t||"");
      let m=q.match(/(?:工作|工項|項目)\s*([1-5])/); if(m)return +m[1];
      if(/打芽.*(?:地|底)|地芽/.test(q))return 2;
      if(/打芽/.test(q))return 1;
      if(/除草/.test(q))return 3;
      if(/剪葉/.test(q))return 4;
      if(/覆蓋/.test(q))return 5;
      return null;
    }
    function teddyHandsSetWorkMode(mode){
      teddyHandsWorkMode=mode; teddyHandsPending=null; teddyHandsFlow={}; teddyHandsRender();
      try{if(typeof ghSelectedEntry!=="undefined"){ghSelectedEntry="work";if(typeof ghSetEntryButtonState==="function")ghSetEntryButtonState("work");}}catch(_){}
      return mode==="assign"
        ? "已進入工作指派。請告訴我溫室、平面圖區域，以及要設定的工作1–8；我會逐項補問，完整復述後才寫入。"
        : "回報目前請在完全體功能表4操作；Teddy 這一版只開放工作指派。";
    }
    function teddyHandsAreaFromText(t){
      const q=String(t||"");
      const m=q.match(/(?:區域|格位|格|區位|定位點|平面圖)\s*[:：]?\s*([A-Za-z0-9_-]+)/i);
      return m?m[1].toUpperCase():"";
    }
    function teddyHandsReportParse(t){
      const q=String(t||"").trim(),zone=teddyHandsZoneFromText(q),ym=teddyHandsYmFromText(q);
      let itemId=teddyHandsWorkItemFromText(q);
      if(!itemId){let m=q.match(/(?:工作|工項|項目|回報)\s*([1-8])/);if(m)itemId=+m[1];}
      if(!itemId){if(/補水|灌溉|溝灌|噴灌/.test(q))itemId=6;else if(/施肥|米糠|金旺/.test(q))itemId=7;else if(/其他資材/.test(q))itemId=8;}
      const area=teddyHandsAreaFromText(q);
      const prog=q.match(/(?:進度|完成度|級別)\s*[:：]?\s*([1-5])/);
      const n=q.match(/(\d+(?:\.\d+)?)\s*(噸|分鐘|包|kg|公斤)/i);
      let material="";if(/金旺/.test(q))material="金旺";else if(/米糠/.test(q))material="米糠";
      if(itemId===8){const mm=q.match(/(?:其他資材|項目\s*8|工項\s*8|工作\s*8)\s*[:：]?\s*([^，。, .]+?)(?=\s*\d|[，。,.]|$)/);if(mm)material=mm[1];}
      return {kind:"report",menu:"工作入口→功能表4→回報",zone,ym,itemId,cellId:area,progress:prog?+prog[1]:null,amount:n?Number(n[1]):null,unit:n?n[2]:"",material,method:/噴灌/.test(q)?"噴灌":/溝灌|灌溉|補水/.test(q)?"溝灌":"",raw:q};
    }
    function teddyHandsParseDraft(t){
      const q=String(t||"").trim(), zone=teddyHandsZoneFromText(q), ym=teddyHandsYmFromText(q);
      const is68=/(?:6\s*[-到至~]\s*8|工作\s*[678]|工項\s*[678]|補水|澆水|灌溉|灌水|溝灌|噴灌|施肥|肥料|下肥|上肥|米糠|金旺|其他資材|黃豆|水果|硝酸鉀|磷酸一鉀|硫酸鉀|鈣鎂粉|微量元素)/.test(q);
      if(is68)return teddyHandsParse68(q);
      if(false){
        let itemId=null;if(/(?:工作|工項|項目)\s*6|補水|灌溉|溝灌|噴灌/.test(q))itemId=6;else if(/(?:工作|工項|項目)\s*7|施肥|米糠|金旺/.test(q))itemId=7;else if(/(?:工作|工項|項目)\s*8|其他資材/.test(q))itemId=8;
        const n=q.match(/(\d+(?:\.\d+)?)\s*(噸|分鐘|包|kg|公斤)/i);
        let material=""; if(/金旺/.test(q))material="金旺";else if(/米糠/.test(q))material="米糠";
        if(itemId===8){const mm=q.match(/(?:其他資材|項目\s*8|工項\s*8|工作\s*8)\s*[:：]?\s*([^，。,.\s]+?)(?=\s*\d|[，。,.]|$)/);if(mm)material=mm[1];}
        return {kind:"materials",menu:"工作入口→溫室→平面圖→區域→工作6–8",zone,ym,itemId,cellId:teddyHandsAreaFromText(q),method:/噴灌/.test(q)?"噴灌":/溝灌|灌溉|補水/.test(q)?"溝灌":"",material,amount:n?Number(n[1]):null,unit:n?n[2]:"",raw:q};
      }
      const itemId=teddyHandsWorkItemFromText(q);
      if(itemId || /功能表\s*4|工作\s*1\s*[-到至~]\s*5|工項\s*1\s*[-到至~]\s*5/.test(q)){
        const area=teddyHandsAreaFromText(q);
        const lvlM=q.match(/(?:等級|級別|層級|設定)\s*[:：]?\s*([1-5])/);
        const personM=q.match(/(?:指派給|給|人員)\s*[:：]?\s*([A-Z]\d{2})/i);
        return {kind:"work",menu:"工作入口→溫室→平面圖→區域→工作1–5",zone,ym,itemId,cellId:area,level:lvlM?+lvlM[1]:null,recipientId:personM?personM[1].toUpperCase():"",raw:q};
      }
      return null;
    }
    function teddyHandsMissing(d){
      if(d&&d.kind==="assign68")return teddyHandsMissing68(d);
      const miss=[]; if(!d.zone)miss.push("溫室/分區"); if(!d.itemId)miss.push("工項編號/名稱");
      if(d.kind==="work"){if(!d.cellId)miss.push("平面圖區域");if(!d.level)miss.push("級別1–5");}
      if(d.kind==="materials"){if(!d.cellId)miss.push("平面圖區域");if(d.itemId===6&&!d.method)miss.push("補水方式（溝灌/噴灌）");if(d.itemId===7&&!d.material)miss.push("肥料名稱");if(d.itemId===8&&!d.material)miss.push("資材名稱");if(!(Number(d.amount)>0))miss.push("用量");}
      if(d.kind==="report"){if(!d.zone)miss.push("溫室");if(!d.itemId)miss.push("回報項目");if(d.itemId<=5&&!d.cellId)miss.push("平面圖區域");if(d.itemId<=5&&!d.progress)miss.push("進度1–5");if(d.itemId>=6&&!(Number(d.amount)>0))miss.push("回報用量");}
      return miss;
    }
    function teddyHandsPreviewText(d){
      if(d&&d.kind==="assign68")return teddyHandsPreview68(d);
      const itemName=(typeof GH_WORK_ITEMS!=="undefined"&&GH_WORK_ITEMS[d.itemId])||`工作${d.itemId||"?"}`;
      const lines=[`帳號：${teddyHandsSession?.id||"未登入"}`,`功能表：${d.menu}`,`月份：${d.ym}`,`溫室：${d.zone?.name||"未指定"}`,`工項：${d.itemId||"?"} ${itemName}`];
      if(d.kind==="work"){lines.push(`平面圖區域：${d.cellId||"未指定"}`,`級別：${d.level||"未指定"}`);if(d.recipientId)lines.push(`指派：${d.recipientId}`);}
      else if(d.kind==="report"){lines.push(`路徑：功能表4 → ${d.zone?.name||"未指定"} → ${d.ym} → 回報項目${d.itemId||"?"}`);if(d.cellId)lines.push(`平面圖區域：${d.cellId}`);if(d.progress)lines.push(`回報進度：${d.progress}`);if(d.method)lines.push(`方式：${d.method}`);if(d.material)lines.push(`材料：${d.material}`);if(d.amount)lines.push(`回報用量：${d.amount}${d.unit||""}`);}
      else {if(d.method)lines.push(`方式：${d.method}`);if(d.material)lines.push(`材料：${d.material}`);lines.push(`用量：${d.amount??"未指定"}${d.unit||""}`);}
      return lines.join("\n");
    }
    function teddyHandsRender(){
      const p=document.getElementById("teddyHandsPanel"),b=document.getElementById("teddyHandsAuthBadge"),pre=document.getElementById("teddyHandsPreview");
      if(b)b.textContent=teddyHandsSession?`✓ ${teddyHandsSession.id} 已驗證`:"未登入";
      if(!p)return; if(!teddyHandsPending){p.style.display="none";return;} p.style.display="block"; if(pre)pre.textContent=teddyHandsPreviewText(teddyHandsPending);
    }
    function teddyHandsPasswordPrompt(id){
      return new Promise(resolve=>{
        const old=document.getElementById("teddyHandsPasswordModal");if(old)old.remove();
        const box=document.createElement("div");box.id="teddyHandsPasswordModal";box.style="position:fixed;inset:0;z-index:4000;background:rgba(0,0,0,.78);display:flex;align-items:center;justify-content:center;padding:18px;";
        box.innerHTML=`<div style="width:min(360px,100%);background:#141a18;border:1px solid #3e5149;border-radius:14px;padding:15px;color:#e8eeea;"><div style="font-weight:800;margin-bottom:6px;">🔐 Teddy 請你驗證 ${id}</div><div style="font-size:11px;color:#879991;margin-bottom:9px;">密碼只在這次驗證使用，不會加入聊天紀錄，也不會儲存。</div><input id="teddyHandsPw" type="password" autocomplete="off" style="width:100%;background:#0a0e0d;border:1px solid #34443e;border-radius:8px;padding:9px;color:#fff;margin-bottom:9px;" placeholder="請輸入密碼"><div style="display:flex;gap:7px;"><button id="teddyHandsPwOk" style="flex:1;border:0;border-radius:8px;background:#5eead4;color:#07110e;font-weight:800;padding:8px;">驗證</button><button id="teddyHandsPwCancel" style="border:1px solid #405049;border-radius:8px;background:#18211e;color:#aebdb6;padding:8px 12px;">取消</button></div><div id="teddyHandsPwErr" style="min-height:16px;color:#ff8585;font-size:11px;margin-top:6px;"></div></div>`;
        document.body.appendChild(box);const inp=box.querySelector("#teddyHandsPw");setTimeout(()=>inp.focus(),50);
        const done=v=>{inp.value="";box.remove();resolve(v);};
        box.querySelector("#teddyHandsPwCancel").onclick=()=>done(null);
        box.querySelector("#teddyHandsPwOk").onclick=()=>done(inp.value);
        inp.onkeydown=e=>{if(e.key==="Enter")box.querySelector("#teddyHandsPwOk").click();};
      });
    }
    async function teddyHandsVerifyAccount(id,password){
      if(!password)return null;
      const db=await ghMainFirestore();
      const target=String(id||"").trim().toUpperCase();
      const typed=String(password||"").trim();
      // V5.1 的個人帳號正式位置是 kv/person:{ID}。先直讀，不再先掃整個集合。
      // 密碼規則沿用完全體：完整密碼 = 帳號 + 3碼英文；為了符合 Teddy 每次詢問密碼的使用方式，
      // 使用者輸入完整密碼或只輸入後3碼都可驗證，但密碼不會持久化。
      const tries=new Set([typed]);
      if(/^[A-Za-z]{3}$/.test(typed))tries.add(target+typed.toUpperCase());
      if(typed.toUpperCase().startsWith(target))tries.add(typed.toUpperCase());
      const checkPerson=(a,docId="")=>{
        if(!a||typeof a!=="object")return null;
        const aid=String(a.id||a.userId||a.account||String(docId).replace(/^person:/i,"")||"").toUpperCase();
        const stored=String(a.password??a.pw??"").trim();
        if(aid!==target||!stored)return null;
        if(![...tries].some(x=>String(x)===stored||String(x).toUpperCase()===stored.toUpperCase()))return null;
        if(a.status&&String(a.status).toLowerCase()!=="active")throw new Error("此帳號目前不是啟用狀態");
        return {id:target,role:a.role||a.roleLabel||"designer",name:a.name||target,menuPerms:a.menuPerms||{},tier:a.tier||null,status:a.status||"active"};
      };
      try{
        const doc=await db.collection("kv").doc(`person:${target}`).get();
        if(doc.exists){let val=doc.data()?.value;try{if(typeof val==="string")val=JSON.parse(val);}catch(_){}const hit=checkPerson(val,doc.id);if(hit)return hit;}
      }catch(e){console.warn("Teddy Hands direct person read failed",e);}
      // 相容舊版本：帳號可能被包在陣列／其他前綴文件內。
      let docs=[];
      for(const prefix of ["person:","people:","personnel:"]){
        try{const snap=await db.collection("kv").where(firebase.firestore.FieldPath.documentId(),">=",prefix).where(firebase.firestore.FieldPath.documentId(),"<",prefix+"\uf8ff").get();docs.push(...snap.docs);}catch(_){}
      }
      for(const doc of docs){const raw=doc.data()||{};let val=raw.value;try{if(typeof val==="string")val=JSON.parse(val);}catch(_){}
        const pool=[];if(val&&typeof val==="object"){pool.push(val);if(Array.isArray(val))pool.push(...val);for(const x of Object.values(val)){if(Array.isArray(x))pool.push(...x);else if(x&&typeof x==="object")pool.push(x);}}
        for(const a of pool){const hit=checkPerson(a,doc.id);if(hit)return hit;}
      }
      return null;
    }
    async function teddyHandsLogin(id="A01"){
      const pw=await teddyHandsPasswordPrompt(id); if(pw===null)return {ok:false,message:"已取消登入。"};
      try{const acct=await teddyHandsVerifyAccount(id,pw); if(!acct)return {ok:false,message:`${id} 驗證失敗。已直接查詢 V5.1 的 person:${id} 帳號；請確認輸入的是完整密碼或密碼後3碼。`}; teddyHandsSession=acct; teddyOwnerSessionSave(); teddyHandsRender(); teddyHandsWorkMode=null;teddyHandsFlow={};
        try{if(typeof ghSelectedEntry!=="undefined"){ghSelectedEntry="work";if(typeof ghSetEntryButtonState==="function")ghSetEntryButtonState("work");}}catch(_){}
        return {ok:true,message:`✓ ${id} 驗證成功。要進行「工作指派」還是「工作回報」？\n工作指派：工作入口 → 溫室 → 平面圖 → 區域 → 工作1–8 → 復述確認 → 寫入。\n工作回報：工作入口 → 功能表4 → 溫室 → 年月 → 回報項目。`};}
      catch(e){return {ok:false,message:`登入失敗：${e.message}`};}
      finally{ /* pw 僅存在此函式區域，不持久化 */ }
    }
    async function teddyHandsReadKv(key){
      const db=await ghMainFirestore(),doc=await db.collection("kv").doc(key).get();if(!doc.exists)return null;let v=doc.data()?.value;try{if(typeof v==="string")v=JSON.parse(v);}catch(_){}return v;
    }
    async function teddyHandsWriteKv(key,value){
      const db=await ghMainFirestore();
      await db.collection("kv").doc(key).set({key,value:JSON.stringify(value),updatedAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:true});
    }
    async function teddyHandsCommitWork(d){
      const key=`worklog:${d.zone.id}:${d.cellId}:${d.ym}`;const old=await teddyHandsReadKv(key);const v=(old&&typeof old==="object")?old:{};const id=d.itemId,stamp=teddyHandsNowStamp();
      v.levels={...(v.levels||{}),[id]:d.level};v.pending={...(v.pending||{}),[id]:true};v.timestamps={...(v.timestamps||{}),[id]:{...((v.timestamps||{})[id]||{}),changedAt:stamp}};
      v.changeSenderId=teddyHandsSession.id;v.changeSenderName=teddyHandsSession.name||teddyHandsSession.id;
      if(d.recipientId){const ids=Array.isArray(v.recipientIds)?[...v.recipientIds]:[];if(!ids.includes(d.recipientId))ids.push(d.recipientId);v.recipientIds=ids;v.recipientNames={...(v.recipientNames||{}),[d.recipientId]:d.recipientId};}
      await teddyHandsWriteKv(key,v);const chk=await teddyHandsReadKv(key);if(Number(chk?.levels?.[id])!==Number(d.level)||!chk?.pending?.[id])throw new Error("寫入後驗證失敗");return key;
    }
    async function teddyHandsCommitMaterials(d){
      const key=`zonework:${d.zone.id}:${d.ym}`;const old=await teddyHandsReadKv(key);const v=(old&&typeof old==="object")?old:{checks:{},extra:{},multi8Main:[],extra8:{},pending:{},timestamps:{},progress:{},confirmedBy:{},confirmedTotals:{},confirmHistory:[]};const id=d.itemId,stamp=teddyHandsNowStamp();
      v.checks={...(v.checks||{})};v.extra={...(v.extra||{})};v.pending={...(v.pending||{}),[id]:true};v.timestamps={...(v.timestamps||{}),[id]:{...((v.timestamps||{})[id]||{}),changedAt:stamp}};
      if(id===6){v.checks[6]=d.method;const field=d.method==="噴灌"?"minutes":"tons";v.extra[6]={...((v.extra||{})[6]||{}),[field]:d.amount};}
      else if(id===7){v.checks[7]=d.material;v.extra[7]={...((v.extra||{})[7]||{}),bags:d.amount};}
      else {const arr=Array.isArray(v.multi8Main)?[...v.multi8Main]:[];if(!arr.includes(d.material))arr.push(d.material);v.multi8Main=arr;v.extra8={...(v.extra8||{}),[d.material]:d.amount};}
      await teddyHandsWriteKv(key,v);const chk=await teddyHandsReadKv(key);if(!chk?.pending?.[id])throw new Error("寫入後驗證失敗");return key;
    }
    async function teddyHandsCommitReport(d){
      const stamp=teddyHandsNowStamp(),pid=teddyHandsSession.id;
      if(d.itemId<=5){
        const key=`worklog:${d.zone.id}:${d.cellId}:${d.ym}`,old=await teddyHandsReadKv(key),v=(old&&typeof old==="object")?old:{};
        v.progress={...(v.progress||{}),[d.itemId]:d.progress};
        v.pending={...(v.pending||{}),[d.itemId]:d.progress===1?false:true};
        v.confirmedBy={...(v.confirmedBy||{})};const arr=Array.isArray(v.confirmedBy[d.itemId])?[...v.confirmedBy[d.itemId]]:[];if(!arr.includes(pid))arr.push(pid);v.confirmedBy[d.itemId]=arr;
        v.timestamps={...(v.timestamps||{}),[d.itemId]:{...((v.timestamps||{})[d.itemId]||{}),ackAt:stamp,reportedAt:stamp}};
        await teddyHandsWriteKv(key,v);return key;
      }
      const key=`zonework:${d.zone.id}:${d.ym}`,old=await teddyHandsReadKv(key),v=(old&&typeof old==="object")?old:{checks:{},extra:{},multi8Main:[],extra8:{},pending:{},progress:{},confirmedBy:{},confirmedTotals:{},confirmHistory:[]};
      const label=(typeof GH_WORK_ITEMS!=="undefined"&&GH_WORK_ITEMS[d.itemId])||`工作${d.itemId}`;
      const hist=Array.isArray(v.confirmHistory)?[...v.confirmHistory]:[];hist.push({itemId:d.itemId,itemName:label,rowKey:d.material||d.method||label,qty:Number(d.amount),personId:pid,personName:teddyHandsSession.name||pid,at:stamp,confirmedAt:stamp,area:d.cellId||""});v.confirmHistory=hist;
      v.pending={...(v.pending||{}),[d.itemId]:false};v.progress={...(v.progress||{}),[d.itemId]:1};
      await teddyHandsWriteKv(key,v);return key;
    }

    // ===== Smart Teddy 8.6.2：工作指派走完全體同一套安全交易 =====
    // 以下 TEDDY_WDS 為完全體 V5.1.C132「WORK_DATA_SAFETY」原文移植（只改名稱），規則以完全體為準：
    // 有讀取基準才能寫、歷史只追加、不清空累計、同工項仍待回報時不可重複指派、每次指派產生 eventId。
const TEDDY_WDS = (() => {
  const isWorkKey = key => /^(worklog|zonework):/.test(String(key));
  const copy = value => JSON.parse(JSON.stringify(value));
  const stable = value => JSON.stringify(value, function (_key, v) {
    if (v && typeof v === 'object' && !Array.isArray(v)) return Object.keys(v).sort().reduce((o,k) => { o[k] = v[k]; return o; }, {});
    return v;
  });
  const parse = value => {
    const data = typeof value === 'string' ? JSON.parse(value) : copy(value);
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('工作資料格式不完整，已停止寫入。');
    for (const field of ['confirmHistory','assignmentHistory']) if (data[field] !== undefined && !Array.isArray(data[field])) throw new Error('歷史格式不完整，已停止寫入。');
    return data;
  };
  const positive = value => (typeof value === 'number' || typeof value === 'string') && String(value).trim() !== '' && Number.isFinite(Number(value)) && Number(value) > 0;
  const options = (data,id) => {
    const list = data[id === 6 ? 'multi6' : id === 7 ? 'multi7' : 'multi8Main'];
    if (Array.isArray(list) && list.length) return list;
    return id !== 8 && data.checks && data.checks[id] ? [data.checks[id]] : [];
  };
  const quantity = (data,id,opt) => {
    if (id === 8) return (data.extra8 || {})[opt];
    const extra = (data.extra || {})[id] || {};
    if (id === 6) return extra[opt === '噴灌' ? 'minutes' : 'tons'];
    return extra[opt] ?? (options(data,id).length === 1 ? extra.bags : undefined);
  };
  const validateQuantities = (names,values) => {
    if (!names.length) throw new Error('尚未選擇工作內容，本次操作不成立。');
    const result = {};
    for (const name of names) {
      if (!positive(values && values[name])) throw new Error(`「${name}」請輸入大於 0 的有效數量；尚未儲存。`);
      result[name] = Number(values[name]);
    }
    return result;
  };
  const validateAssignment = (cell,zone) => {
    const cellIds = [1,2,3,4,5].filter(id => !!(cell.pending || {})[id]);
    const zoneIds = [6,7,8].filter(id => !!(zone.pending || {})[id]);
    if (!cellIds.length && !zoneIds.length) throw new Error('尚未輸入工作內容，本次指定不成立，也不會儲存。');
    for (const id of cellIds) if (!Number.isInteger(Number((cell.levels || {})[id])) || Number(cell.levels[id]) < 1 || Number(cell.levels[id]) > 5) throw new Error(`工作 ${id} 請選擇有效級別。`);
    for (const id of zoneIds) validateQuantities(options(zone,id),Object.fromEntries(options(zone,id).map(opt => [opt,quantity(zone,id,opt)])));
    return {cellIds,zoneIds};
  };
  const hasContent = data => ['confirmHistory','assignmentHistory'].some(k => Array.isArray(data[k]) && data[k].length) || Object.values(data.levels || {}).some(positive) || [6,7,8].some(id => options(data,id).length) || !!data.linkedZoneEventId;
  const checkPreserved = (before,next) => {
    for (const field of ['confirmHistory','assignmentHistory']) {
      const a = before[field] || [], b = next[field] || [];
      if (b.length < a.length || a.some((record,i) => stable(record) !== stable(b[i]))) throw new Error('已阻擋會刪除或改寫既有歷史的操作，請重新讀取資料。');
    }
    for (const [name,value] of Object.entries(before.confirmedTotals || {})) {
      if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
        if (stable((next.confirmedTotals || {})[name]) !== stable(value)) throw new Error('原累計格式需要確認，已停止寫入。');
      } else if (!Number.isFinite(Number((next.confirmedTotals || {})[name])) || Number(next.confirmedTotals[name]) < value) throw new Error('已阻擋清空或減少既有累計的操作。');
    }
    if (!hasContent(next)) throw new Error('沒有有效工作內容，本次操作不成立。');
  };
  const buildAssignment = (base,draft,ids,eventId,stamp,isCell,updateRecipients=false) => {
    const next = copy(base);
    for (const field of ['levels','checks','extra','pending','timestamps','progress','confirmedBy']) next[field] = {...(next[field] || {})};
    for (const id of ids) {
      if ((base.pending || {})[id]) throw new Error(`工作 ${id} 仍有未完成指定，請先處理原事件；尚未寫入。`);
      for (const field of ['levels','checks','extra']) if (Object.prototype.hasOwnProperty.call(draft[field] || {},id)) next[field][id] = copy(draft[field][id]);
      next.pending[id] = true;
      delete next.progress[id]; delete next.confirmedBy[id];
      next.timestamps[id] = {...((draft.timestamps || {})[id] || {}),eventId,changedAt:((draft.timestamps || {})[id] || {}).changedAt || stamp};
      delete next.timestamps[id].ackAt;
      if ([6,7,8].includes(id)) next[id === 6 ? 'multi6' : id === 7 ? 'multi7' : 'multi8Main'] = copy(options(draft,id));
      if (id === 8) next.extra8 = copy(draft.extra8 || {});
    }
    if (isCell && updateRecipients) {
      if (Object.entries(base.pending || {}).some(([id,v])=>v && !ids.includes(Number(id))) && stable(base.recipientIds || []) !== stable(draft.recipientIds || [])) throw new Error('其他工作仍待回報，新增指定不能改變原受文對象；請沿用原對象或先完成原工作。');
      for (const field of ['changeSenderId','changeSenderName','recipientIds','recipientNames']) if (draft[field] !== undefined) next[field] = copy(draft[field]);
    }
    next.assignmentHistory = [...(base.assignmentHistory || []),{eventId,itemIds:ids,assignedAt:stamp}];
    return next;
  };
  // C66/V5.012：允許「已指派、尚未開始回報」的事件直接修正內容/數量。
  // 只在 base.pending[itemId] 為 true，且該項目尚未有任何 progress/confirmedBy（代表尚未開始回報）時才允許；
  // 完全不動 eventId、assignmentHistory、confirmHistory，只覆寫該工項本身的數值欄位並更新 changedAt。
  const reviseAssignment = (base, itemId, patch) => {
    if (!base || !(base.pending || {})[itemId]) throw new Error('這項工作目前不是待回報狀態，無法修正。');
    if ((base.progress || {})[itemId] || (base.confirmedBy || {})[itemId]) throw new Error('這項工作已經開始回報，無法直接修正數量；請改用新增指派，或請回報人員在回報時調整。');
    const next = copy(base);
    if (itemId <= 5) {
      const lvl = Number(patch.level);
      if (!Number.isInteger(lvl) || lvl < 1 || lvl > 5) throw new Error('請選擇有效級別(1-5)。');
      next.levels = { ...(next.levels || {}), [itemId]: lvl };
    } else {
      const names = Array.isArray(patch.names) ? patch.names : [];
      const values = validateQuantities(names, patch.values || {});
      if (itemId === 8) {
        next.multi8Main = [...names];
        next.extra8 = { ...values };
      } else {
        next.checks = { ...(next.checks || {}), [itemId]: names.length === 1 ? names[0] : (names.length === 0 ? null : (next.checks || {})[itemId]) };
        next[itemId === 6 ? 'multi6' : 'multi7'] = [...names];
        const extraForItem = {};
        if (itemId === 6) {
          if (values['溝灌'] !== undefined) extraForItem.tons = values['溝灌'];
          if (values['噴灌'] !== undefined) extraForItem.minutes = values['噴灌'];
        } else {
          names.forEach((n) => { extraForItem[n] = values[n]; });
          if (names.length === 1) extraForItem.bags = values[names[0]];
        }
        next.extra = { ...(next.extra || {}), [itemId]: extraForItem };
      }
    }
    next.timestamps = { ...(next.timestamps || {}), [itemId]: { ...(((next.timestamps || {})[itemId]) || {}), changedAt: patch.stamp || (((next.timestamps || {})[itemId]) || {}).changedAt } };
    checkPreserved(base, next);
    return next;
  };
  const appendMissing = (current,incoming,field) => {
    const out = copy(current), counts = new Map(), identities = new Map();
    const identity = x => {
      if(!x || typeof x!=='object') return null;
      if(field==='assignmentHistory') return x.eventId ? 'assignment:'+x.eventId : null;
      if(x.itemId == null || (!x.eventId && !x.at)) return null;
      return stable([x.eventId || 'legacy',x.itemId,x.rowKey || '',x.personId || '',x.at]);
    };
    current.forEach(x=>{const id=identity(x);if(id){if(!identities.has(id))identities.set(id,new Set());identities.get(id).add(stable(x));}});
    current.forEach(x => { const k=stable(x); counts.set(k,(counts.get(k)||0)+1); });
    for (const x of incoming) {
      const k=stable(x), n=counts.get(k)||0;
      if(n){counts.set(k,n-1);continue;}
      const id=identity(x);
      if(!id) throw new Error('備份有無法辨識單筆身分的歷史，已停止自動補入，請先核對。');
      if(identities.has(id)) throw new Error('備份與現有資料含同一事件的不同內容或重複筆數，已停止還原，避免重複累加。');
      out.push(copy(x));identities.set(id,new Set([k]));
    }
    return out;
  };
  return {isWorkKey,copy,stable,parse,positive,options,quantity,validateQuantities,validateAssignment,hasContent,checkPreserved,buildAssignment,reviseAssignment,appendMissing};
})();
    function teddyNewWorkEventId(){
      const d=new Date(),p=(n,w=2)=>String(n).padStart(w,"0");
      return `EV${d.getFullYear()}${p(d.getMonth()+1)}${p(d.getDate())}${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}${p(d.getMilliseconds(),3)}-${Math.random().toString(36).slice(2,7)}`;
    }
    function teddyTaipeiStampFor(dateStr){
      const parts=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Taipei",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hour12:false}).formatToParts(new Date());
      const g=t=>(parts.find(x=>x.type===t)||{}).value||"";
      const hm=`${g("hour")==="24"?"00":g("hour")}:${g("minute")}`;
      const day=dateStr||`${g("year")}-${g("month")}-${g("day")}`;
      return day.replace(/-/g,"/")+" "+hm;
    }
    // 與完全體 window.storage.commitWork 相同的交易：讀到的內容必須和基準一致才寫入，並記錄 operationId 防止重送。
    async function teddyWorkCommit(changes,operationId){
      const db=await ghMainFirestore();
      if(!Array.isArray(changes)||!changes.length||!operationId)throw new Error("沒有可儲存的工作操作。");
      if(new Set(changes.map(c=>c.key)).size!==changes.length)throw new Error("工作操作重複，已停止寫入。");
      const uid=(ghMainApp&&ghMainApp.auth().currentUser)?ghMainApp.auth().currentUser.uid:null;
      const prepared=changes.map(c=>{
        if(!TEDDY_WDS.isWorkKey(c.key)||!Object.prototype.hasOwnProperty.call(c,"expectedValue"))throw new Error("缺少工作資料的讀取基準，已停止寫入。");
        const next=TEDDY_WDS.parse(c.next);
        TEDDY_WDS.checkPreserved(c.expectedValue===null?{}:TEDDY_WDS.parse(c.expectedValue),next);
        return {...c,next,value:JSON.stringify(next),ref:db.collection("kv").doc(c.key)};
      });
      return db.runTransaction(async tx=>{
        const snaps=[];for(const c of prepared)snaps.push(await tx.get(c.ref));
        const prior=snaps.map(s=>s.exists?s.data():null);
        const applied=prior.map(d=>!!(d&&Array.isArray(d.workSafetyOperations)&&d.workSafetyOperations.includes(operationId)));
        if(applied.every(Boolean))return prior.map((d,i)=>({key:prepared[i].key,value:d.value}));
        if(applied.some(Boolean))throw new Error("操作紀錄不一致，請重新讀取；未再寫入。");
        for(let i=0;i<prepared.length;i++){
          const current=prior[i]?prior[i].value:null;
          if(current!==prepared[i].expectedValue)throw new Error("資料已由其他畫面更新，已阻擋舊資料覆蓋。請再說一次指派內容，我會重新讀取。");
          TEDDY_WDS.checkPreserved(current===null?{}:TEDDY_WDS.parse(current),prepared[i].next);
        }
        prepared.forEach((c,i)=>tx.set(c.ref,{key:c.key,value:c.value,updatedAt:Date.now(),updatedByUid:uid,
          workSafetyRevision:Number(prior[i]&&prior[i].workSafetyRevision||0)+1,
          workSafetyOperations:[...((prior[i]&&prior[i].workSafetyOperations)||[]),operationId].slice(-128)},{merge:true}));
        return prepared.map(c=>({key:c.key,value:c.value}));
      });
    }
    async function teddyWorkRead(key){
      const db=await ghMainFirestore();
      const s=await db.collection("kv").doc(key).get({source:"server"});
      const value=s.exists?(s.data()||{}).value:null;
      return {key,value:value==null?null:value,data:value==null?{}:TEDDY_WDS.parse(value)};
    }

    // ---- 工作6–8 指派：解析 ----
    const TEDDY68_ITEMS={6:["溝灌","噴灌"],7:["米糠","金旺"],8:["黃豆","水果","硝酸鉀","磷酸一鉀","硫酸鉀","鈣鎂粉","微量元素"]};
    const TEDDY68_UNIT={溝灌:"噸",噴灌:"分鐘",米糠:"包",金旺:"包"};
    function teddy68ItemOf(name){for(const id of [6,7,8])if(TEDDY68_ITEMS[id].includes(name))return id;return null;}
    function teddyHandsDateFromText(q){
      const now=new Date(),f=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
      const t=typeof ghCnDateToDigits==="function"?ghCnDateToDigits(q):q;
      if(/後天/.test(t))return f(new Date(now.getFullYear(),now.getMonth(),now.getDate()+2));
      if(/明天|明日/.test(t))return f(new Date(now.getFullYear(),now.getMonth(),now.getDate()+1));
      const m=t.match(/(?:(20\d{2})\s*[年\/-]\s*)?(1[0-2]|[1-9])\s*(?:月\s*(3[01]|[12]\d|[1-9])\s*(?:日|號)?|\/\s*(3[01]|[12]\d|[1-9])(?![0-9]))/);
      if(m)return `${m[1]||now.getFullYear()}-${String(m[2]).padStart(2,"0")}-${String(m[3]||m[4]).padStart(2,"0")}`;
      return f(now);
    }
    // 6.6.1：語音常把數量說成中文（一公斤、兩分鐘、十五噸、一點五公斤、半包、一包半），先轉成數字。
    // 只轉「緊接單位」的數字，所以「磷酸一鉀」的「一」不會被誤轉。
    function teddyCnQtyToDigits(s){
      const v={零:0,〇:0,一:1,二:2,兩:2,三:3,四:4,五:5,六:6,七:7,八:8,九:9};
      const int=w=>{
        if(!w)return null;if(/^\d+$/.test(w))return Number(w);
        let total=0,cur=0;
        for(const ch of w){
          if(v[ch]!=null)cur=v[ch];
          else if(ch==="十"){total+=(cur||1)*10;cur=0;}
          else if(ch==="百"){total+=(cur||1)*100;cur=0;}
          else return null;
        }
        return total+cur;
      };
      const U="(噸|公噸|分鐘|分|包|公斤|kg|KG|Kg)";
      let out=String(s||"");
      out=out.replace(new RegExp(`([零〇一二兩三四五六七八九十百\\d]+)\\s*${U}\\s*半`,"g"),(m,n,u)=>{const x=int(n);return x==null?m:`${x+0.5}${u}`;});
      out=out.replace(new RegExp(`半\\s*${U}`,"g"),(m,u)=>`0.5${u}`);
      out=out.replace(new RegExp(`([零〇一二兩三四五六七八九十百]+)(?:點|\\.)([零〇一二三四五六七八九]+)\\s*${U}`,"g"),(m,a,b,u)=>{const x=int(a);if(x==null)return m;const d=[...b].map(c=>v[c]).join("");return `${x}.${d}${u}`;});
      out=out.replace(new RegExp(`([零〇一二兩三四五六七八九十百]+)\\s*${U}`,"g"),(m,n,u)=>{const x=int(n);return x==null?m:`${x}${u}`;});
      return out.replace(/公噸/g,"噸");
    }
    function teddyHandsParse68(q){
      q=teddyCnQtyToDigits(q);
      const zone=teddyHandsZoneFromText(q),date=teddyHandsDateFromText(q),ym=date.slice(0,7);
      const vals={6:{},7:{},8:{}},named=new Set();
      const all=[...TEDDY68_ITEMS[6],...TEDDY68_ITEMS[7],...TEDDY68_ITEMS[8]];
      const re=new RegExp(`(${all.join("|")})\\s*[:：]?\\s*(\\d+(?:\\.\\d+)?)?\\s*(噸|分鐘|分|包|kg|公斤|KG)?`,"g");
      let m;while((m=re.exec(q))){named.add(m[1]);if(m[2]&&Number(m[2])>0)vals[teddy68ItemOf(m[1])][m[1]]=Number(m[2]);}
      // 只說「補水 5噸／30分鐘」沒講方式：依單位判斷溝灌或噴灌。
      if(!named.has("溝灌")&&!named.has("噴灌")){
        const w=q.match(/(?:補水|澆水|灌溉|灌水)\s*(\d+(?:\.\d+)?)\s*(噸|分鐘|分)/);
        if(w){const k=w[2]==="噸"?"溝灌":"噴灌";named.add(k);vals[6][k]=Number(w[1]);}
      }
      const ids=[6,7,8].filter(id=>Object.keys(vals[id]).length);
      const noQty=[...named].filter(n=>!(n in vals[teddy68ItemOf(n)]));
      const wantsFert=/施肥|肥料|下肥|上肥/.test(q)&&!ids.some(id=>id===7||id===8)&&!noQty.some(n=>teddy68ItemOf(n)>=7);
      const wantsWater=/補水|澆水|灌溉|灌水/.test(q)&&!ids.includes(6)&&!noQty.some(n=>teddy68ItemOf(n)===6);
      const rec=q.match(/(?:指派給|交給|給)\s*([A-Za-z]\d{2})/);
      return {kind:"assign68",menu:"工作入口→溫室→工作6–8（指派）",zone,date,ym,vals,ids,noQty,wantsFert,wantsWater,
        recipientId:rec?rec[1].toUpperCase():"",cellId:teddyHandsAreaFromText(q),raw:q};
    }
    function teddyHandsMerge68(old,nw,q){
      const n=nw||teddyHandsParse68(q);
      // 補問時只回答數量（例如「一公斤」「都是兩包」）：套用到還缺數量、且單位相符的品項；復述時會逐項列出讓你確認。
      if(!n.ids.length&&!n.noQty.length){
        const qq=teddyCnQtyToDigits(q),m=qq.match(/(\d+(?:\.\d+)?)\s*(噸|分鐘|分|包|公斤|kg)/i);
        if(m){
          const amt=Number(m[1]),u=m[2].toLowerCase();
          const fits=name=>{const unit=TEDDY68_UNIT[name]||"kg";return unit==="噸"?u==="噸":unit==="分鐘"?(u==="分鐘"||u==="分"):unit==="包"?u==="包":(u==="公斤"||u==="kg");};
          old.noQty.filter(fits).forEach(name=>{n.vals[teddy68ItemOf(name)][name]=amt;});
          if(old.wantsWater&&!old.noQty.some(x=>teddy68ItemOf(x)===6)&&(u==="噸"||u==="分鐘"||u==="分"))n.vals[6][u==="噸"?"溝灌":"噴灌"]=amt;
        }
      }
      const hasDate=/今天|明天|明日|後天|\d+\s*[月\/]|[一二三四五六七八九十]+\s*月/.test(q);
      const vals={6:{...old.vals[6],...n.vals[6]},7:{...old.vals[7],...n.vals[7]},8:{...old.vals[8],...n.vals[8]}};
      const ids=[6,7,8].filter(id=>Object.keys(vals[id]).length);
      const noQty=[...new Set([...old.noQty,...n.noQty])].filter(x=>!(x in vals[teddy68ItemOf(x)]));
      const date=hasDate?n.date:old.date;
      return {...old,zone:n.zone||old.zone,date,ym:date.slice(0,7),vals,ids,noQty,
        wantsFert:(old.wantsFert||n.wantsFert)&&!ids.some(id=>id>=7)&&!noQty.some(x=>teddy68ItemOf(x)>=7),
        wantsWater:(old.wantsWater||n.wantsWater)&&!ids.includes(6)&&!noQty.some(x=>teddy68ItemOf(x)===6),
        recipientId:n.recipientId||old.recipientId,cellId:n.cellId||old.cellId,raw:old.raw+"／"+q};
    }
    function teddyHandsMissing68(d){
      const miss=[];
      if(!d.zone)miss.push("溫室（一期／二期／三期／四北／四南／五期）");
      if(d.wantsFert)miss.push("施肥要用哪一種：固態（米糠、金旺，單位包）或液態（黃豆、水果、硝酸鉀、磷酸一鉀、硫酸鉀、鈣鎂粉、微量元素，單位 kg），請說品項和數量");
      if(d.wantsWater)miss.push("補水方式和數量：溝灌幾噸，或噴灌幾分鐘");
      d.noQty.forEach(n=>miss.push(`「${n}」的數量（${TEDDY68_UNIT[n]||"kg"}）`));
      if(!d.ids.length&&!d.wantsFert&&!d.wantsWater&&!d.noQty.length)miss.push("要指派的品項和數量");
      if(d.recipientId&&!d.cellId)miss.push("指定受文對象時，請說平面圖區域（例如「區域 A3」）");
      return miss;
    }
    function teddyHandsPreview68(d){
      const name={6:"工作6 補水",7:"工作7 施肥（固態）",8:"工作8 其他資材（液態）"};
      const lines=[`帳號：${teddyHandsSession?.id||"未登入"}`,`溫室：${d.zone?.name||"未指定"}`,`工作日期：${d.date}（寫入 ${d.ym} 月份）`];
      d.ids.forEach(id=>lines.push(`${name[id]}：`+Object.entries(d.vals[id]).map(([k,v])=>`${k} ${v}${TEDDY68_UNIT[k]||"kg"}`).join("、")));
      if(d.recipientId)lines.push(`受文對象：${d.recipientId}（平面圖區域 ${d.cellId}）`);
      lines.push("寫入方式：與完全體相同的安全交易，只新增指派事件，不改動既有歷史。");
      return lines.join("\n");
    }

    // ---- 工作6–8 指派：寫入（對應完全體 confirmAssignmentSave 的分區部分）----
    async function teddyHandsCommit68(d){
      const zoneKey=`zonework:${d.zone.id}:${d.ym}`;
      const zone=await teddyWorkRead(zoneKey);
      const base=zone.data,draft=TEDDY_WDS.copy(base);
      for(const f of ["checks","extra","pending","timestamps"])draft[f]={...(draft[f]||{})};
      for(const id of d.ids){
        const names=Object.keys(d.vals[id]),values=TEDDY_WDS.validateQuantities(names,d.vals[id]);
        draft.pending[id]=true;
        if(id===8){draft.multi8Main=[...names];draft.extra8={...values};}
        else{
          draft.checks[id]=names.length===1?names[0]:null;
          draft[id===6?"multi6":"multi7"]=[...names];
          const ex={};
          if(id===6){if(values["溝灌"]!==undefined)ex.tons=values["溝灌"];if(values["噴灌"]!==undefined)ex.minutes=values["噴灌"];}
          else{names.forEach(n=>{ex[n]=values[n];});if(names.length===1)ex.bags=values[names[0]];}
          draft.extra[id]=ex;
        }
      }
      const stamp=teddyTaipeiStampFor(d.date),eventId=teddyNewWorkEventId();
      const nextZone=TEDDY_WDS.buildAssignment(base,draft,d.ids,eventId,stamp,false);
      const changes=[{key:zoneKey,expectedValue:zone.value,next:nextZone}];
      if(d.recipientId&&d.cellId){
        const cellKey=`worklog:${d.zone.id}:${d.cellId}:${d.ym}`;
        const cell=await teddyWorkRead(cellKey);
        const ids=[d.recipientId];
        if(Object.values(cell.data.pending||{}).some(Boolean)&&TEDDY_WDS.stable(cell.data.recipientIds||[])!==TEDDY_WDS.stable(ids))throw new Error("這個區域其他工作仍待回報，受文對象不能改；請沿用原對象或先完成原工作。");
        const nextCell=TEDDY_WDS.copy(cell.data);
        nextCell.changeSenderId=teddyHandsSession.id;nextCell.changeSenderName=teddyHandsSession.name||teddyHandsSession.id;
        nextCell.recipientIds=ids;nextCell.recipientNames={[d.recipientId]:d.recipientId};
        nextCell.linkedZoneEventId=eventId;
        changes.push({key:cellKey,expectedValue:cell.value,next:nextCell});
      }
      await teddyWorkCommit(changes,teddyNewWorkEventId());
      const chk=await teddyWorkRead(zoneKey);
      const hist=chk.data.assignmentHistory||[];
      if(!d.ids.every(id=>(chk.data.pending||{})[id])||!hist.some(h=>h.eventId===eventId))throw new Error("寫入後重新讀取驗證失敗");
      return `${zoneKey}（事件 ${eventId}）`;
    }

    // ---- 工作1–5 指派：同樣改走安全交易（對應完全體 buildAssignment 的區域格部分）----
    async function teddyHandsCommitWorkSafe(d){
      const key=`worklog:${d.zone.id}:${d.cellId}:${d.ym}`;
      const cell=await teddyWorkRead(key);
      const base=cell.data,draft=TEDDY_WDS.copy(base);
      draft.levels={...(draft.levels||{}),[d.itemId]:d.level};draft.pending={...(draft.pending||{}),[d.itemId]:true};
      let recip=false;
      if(d.recipientId){draft.changeSenderId=teddyHandsSession.id;draft.changeSenderName=teddyHandsSession.name||teddyHandsSession.id;draft.recipientIds=[d.recipientId];draft.recipientNames={[d.recipientId]:d.recipientId};recip=true;}
      const eventId=teddyNewWorkEventId();
      const next=TEDDY_WDS.buildAssignment(base,draft,[d.itemId],eventId,teddyTaipeiStampFor(null),true,recip);
      await teddyWorkCommit([{key,expectedValue:cell.value,next}],teddyNewWorkEventId());
      const chk=await teddyWorkRead(key);
      if(Number((chk.data.levels||{})[d.itemId])!==Number(d.level)||!(chk.data.pending||{})[d.itemId])throw new Error("寫入後重新讀取驗證失敗");
      return `${key}（事件 ${eventId}）`;
    }

    async function teddyHandsCommitPending(){
      if(!teddyHandsSession)throw new Error("尚未登入 A01");if(!teddyHandsPending)throw new Error("目前沒有待寫入設定");
      const d=teddyHandsPending,miss=teddyHandsMissing(d);if(miss.length)throw new Error("資料不完整："+miss.join("、"));
      if(d.kind==="report"||d.kind==="materials")throw new Error("這類寫入已停用：回報請在完全體功能表4操作（Teddy 目前只做工作指派）。");
      const key=d.kind==="assign68"?await teddyHandsCommit68(d):await teddyHandsCommitWorkSafe(d);teddyHandsPending=null;teddyHandsRender();return key;
    }
    function teddyHandsCancel(){teddyHandsPending=null;teddyHandsRender();}
    // ===== Smart Teddy 8.6.2：簡化指派——照上次、常用配方、口語確認、一行復述 =====
    const TEDDY_RECIPE_KEY="teddy_recipes_v1"+(window.TEDDY_KEY_SUFFIX||"");
    let teddyRecipes={};
    try{teddyRecipes=JSON.parse(localStorage.getItem(TEDDY_RECIPE_KEY)||"{}")||{};}catch(_){teddyRecipes={};}
    async function teddyRecipesSave(){
      try{localStorage.setItem(TEDDY_RECIPE_KEY,JSON.stringify(teddyRecipes));}catch(_){}
      try{if(typeof teddyEnsureFirebase==="function"&&teddyEnsureFirebase())await firebase.firestore().collection("teddy_memory").doc(teddyGetMemoryDocId()).set({ghRecipes:teddyRecipes,ghRecipesAt:Date.now()},{merge:true});}catch(e){console.warn("配方雲端儲存失敗，已存本機",e.message);}
    }
    (async()=>{try{if(typeof teddyEnsureFirebase==="function"&&teddyEnsureFirebase()){const d=await firebase.firestore().collection("teddy_memory").doc(teddyGetMemoryDocId()).get();const c=d.exists?(d.data()||{}).ghRecipes:null;if(c&&typeof c==="object"&&!Object.keys(teddyRecipes).length){teddyRecipes=c;localStorage.setItem(TEDDY_RECIPE_KEY,JSON.stringify(c));}}}catch(_){}})();
    function teddyRecipeText(vals){
      return [6,7,8].flatMap(id=>Object.entries(vals[id]||{}).map(([k,v])=>`${k} ${v}${TEDDY68_UNIT[k]||"kg"}`)).join("、");
    }
    function teddyRecipeInText(q){
      const names=Object.keys(teddyRecipes).sort((a,b)=>b.length-a.length);
      return names.find(n=>String(q).includes(n))||null;
    }
    // 存／刪／列配方
    function teddyRecipeCommand(q){
      let m=q.match(/^(?:存|儲存|新增|設定)?配方\s*[「『]?([^\s「」『』=＝:：]{1,12})[」』]?\s*[=＝:：]?\s*(.+)$/);
      if(m&&!/^(?:有哪些|清單|列表)$/.test(m[1])&&/\d|[一二兩三四五六七八九十半]/.test(m[2])){
        const name=m[1],d=teddyHandsParse68(m[2]);
        if(!d.ids.length)return {handled:true,reply:`配方「${name}」沒有讀到品項和數量。例如：存配方 液肥A 磷酸一鉀1公斤 硫酸鉀1公斤`};
        if(d.noQty.length)return {handled:true,reply:`配方「${name}」還缺：${d.noQty.map(x=>`「${x}」的數量`).join("、")}。`};
        teddyRecipes[name]={vals:d.vals,at:Date.now()};teddyRecipesSave();
        return {handled:true,reply:`✓ 已存配方「${name}」：${teddyRecipeText(d.vals)}。之後說「指派四北${name}」就好。`};
      }
      if(/^(?:配方有哪些|配方清單|我的配方|列出配方)$/.test(q)){
        const ks=Object.keys(teddyRecipes);
        return {handled:true,reply:ks.length?ks.map(k=>`・${k}：${teddyRecipeText(teddyRecipes[k].vals)}`).join("\n"):"目前沒有配方。例如說：存配方 液肥A 磷酸一鉀1公斤 硫酸鉀1公斤"};
      }
      m=q.match(/^(?:刪除|移除)配方\s*[「『]?([^\s「」『』]{1,12})[」』]?$/);
      if(m){if(!teddyRecipes[m[1]])return {handled:true,reply:`找不到配方「${m[1]}」。`};delete teddyRecipes[m[1]];teddyRecipesSave();return {handled:true,reply:`已刪除配方「${m[1]}」。`};}
      return null;
    }
    // 照上次：讀完全體該區最近一次 6–8 指派，原樣再排一筆（日期用這次說的，沒說就今天）
    async function teddyHandsRepeatLast(q){
      const zone=teddyHandsZoneFromText(q);
      if(!zone)return {error:"要照哪一區的上次？例如「指派四北照上次」。"};
      const want=/補水|澆水|灌/.test(q)?[6]:/施肥|肥/.test(q)?[7,8]:[6,7,8];
      const now=new Date();
      for(let i=0;i<4;i++){
        const d=new Date(now.getFullYear(),now.getMonth()-i,1);
        const ym=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
        const r=await teddyWorkRead(`zonework:${zone.id}:${ym}`);
        const hist=(r.data.assignmentHistory||[]).filter(h=>(h.itemIds||[]).some(id=>want.includes(Number(id))));
        if(!hist.length)continue;
        const last=hist[hist.length-1],vals={6:{},7:{},8:{}};
        (last.itemIds||[]).map(Number).filter(id=>want.includes(id)).forEach(id=>{
          TEDDY_WDS.options(r.data,id).forEach(opt=>{const v=TEDDY_WDS.quantity(r.data,id,opt);if(TEDDY_WDS.positive(v))vals[id][opt]=Number(v);});
        });
        if(![6,7,8].some(id=>Object.keys(vals[id]).length))continue;
        return {vals,from:last.assignedAt||ym};
      }
      return {error:`${zone.name}最近四個月找不到可照做的${want.length===1?"補水":want.length===2?"施肥":""}指派。`};
    }
    function teddyHandsDateLabel(date){
      const f=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
      const n=new Date();
      if(date===f(n))return "今天";
      if(date===f(new Date(n.getFullYear(),n.getMonth(),n.getDate()+1)))return "明天";
      if(date===f(new Date(n.getFullYear(),n.getMonth(),n.getDate()+2)))return "後天";
      return date.slice(5).replace("-","/");
    }
    function teddyHandsOneLine(d){
      if(d.kind!=="assign68")return teddyHandsPreviewText(d);
      const src=d.fromLabel?`（${d.fromLabel}）`:"";
      const rec=d.recipientId?`｜給 ${d.recipientId}（區域 ${d.cellId}）`:"";
      return `${d.zone?d.zone.name.replace("溫室",""):"?"}・${teddyHandsDateLabel(d.date)}｜${teddyRecipeText(d.vals)}${rec}${src}`;
    }
    const TEDDY_CONFIRM_RE=/^(?:確認|確認寫入|寫入|確定|執行|好|好的|好喔|好啊|對|對的|對啊|可以|沒問題|沒錯|是|是的|ok|OK|Ok|嗯|就這樣)[。！!～~]*$/;

    async function teddyHandsHandle(text){
      const q=String(text||"").trim();
      if(/(?:用|以)?\s*A01\s*(?:帳號)?\s*(?:登入|登錄|驗證)/i.test(q)){const r=await teddyHandsLogin("A01");return {handled:true,reply:r.message};}
      if(teddyHandsSession&&/^(?:工作)?指派(?:工作)?$/.test(q))return {handled:true,reply:teddyHandsSetWorkMode("assign")};
      if(teddyHandsSession&&/^(?:工作)?回報(?:工作)?$/.test(q))return {handled:true,reply:teddyHandsSetWorkMode("report")};
      const rc=teddyRecipeCommand(q);if(rc)return rc;
      if(TEDDY_CONFIRM_RE.test(q)&&teddyHandsPending&&teddyHandsMissing(teddyHandsPending).length){
        return {handled:true,reply:`還不能寫入，草稿保留著。還缺：${teddyHandsMissing(teddyHandsPending).join("、")}。\n目前：${teddyHandsOneLine(teddyHandsPending)}`};
      }
      if(TEDDY_CONFIRM_RE.test(q)&&teddyHandsPending){
        if(!teddyHandsSession)return {handled:true,reply:"這筆還沒寫入。請先說「用 A01 登入」，我會向你詢問密碼。"};
        const line=teddyHandsOneLine(teddyHandsPending);
        try{const key=await teddyHandsCommitPending();return {handled:true,reply:`✓ 已寫入：${line}\n（完全體同一套安全交易，已重新讀取驗證；位置 ${key}）`};}
        catch(e){teddyHandsPending=null;teddyHandsRender();return {handled:true,reply:`寫入失敗，沒有寫進完全體：${e.message}（這筆草稿已清除，請重新說一次指派內容）`};}
      }
      if(/^(?:取消|不要|不要寫入|取消寫入|算了|不對)[。！!]*$/i.test(q)&&teddyHandsPending){teddyHandsCancel();return {handled:true,reply:"好，已取消，沒有寫入。"};}
      // 只有明確要「指派」（或已進入工作指派、或正在補問草稿）才當成寫入指令；一般提問一律交回查詢。
      const isQuestion=/多少|幾|嗎|呢|哪|什麼|怎麼|有沒有|是否|誰|\?|？/.test(q);
      const assignVerb=/指派|指定|安排|派工|交辦/.test(q);
      const assignIntent=teddyHandsWorkMode==="assign"||assignVerb;
      if(teddyHandsWorkMode==="report"||/^(?:工作)?回報/.test(q))return {handled:true,reply:"回報目前請在完全體功能表4操作。Teddy 這一版只開放「工作指派」，回報會在移植完全體的回報安全交易後再開放。"};
      if(!teddyHandsPending&&(!assignIntent||(isQuestion&&teddyHandsWorkMode!=="assign")))return {handled:false};
      if(teddyHandsPending&&isQuestion&&!assignVerb&&teddyHandsWorkMode!=="assign")return {handled:false};
      // 6.9.0：有草稿等待補問時，只有「像是在回答補問」的話才併入（數量、品項、分區、日期、受文對象）；
      // 其他話（例如「表十二 米糠 各溫室比較」「一期果樹履歷」）照常當查詢，不會被吞進草稿。
      if(teddyHandsPending&&!assignVerb){
        const qq=typeof teddyCnQtyToDigits==="function"?teddyCnQtyToDigits(q):q;
        const hasQty=/\d+(?:\.\d+)?\s*(?:噸|分鐘|分|包|公斤|kg)/i.test(qq);
        const shortAnswer=q.length<=10&&/溝灌|噴灌|米糠|金旺|黃豆|水果|硝酸鉀|磷酸一鉀|硫酸鉀|鈣鎂粉|微量元素|固態|液態|一期|二期|三期|四北|四南|五期|今天|明天|後天|區域|給\s*[A-Za-z]\d/.test(q);
        const asQuery=typeof window.teddyGhLocalRoute==="function"?window.teddyGhLocalRoute(q):null;
        if(!hasQty&&(!shortAnswer||(asQuery&&asQuery!=="materials")))return {handled:false};
      }
      let d=null;
      // 照上次
      if(/照上次|跟上次一樣|同上次|照舊|照上週|跟上週一樣|照之前/.test(q)){
        const r=await teddyHandsRepeatLast(q);
        if(r.error)return {handled:true,reply:r.error};
        d=teddyHandsParse68(q);d.vals=r.vals;d.ids=[6,7,8].filter(id=>Object.keys(r.vals[id]).length);d.noQty=[];d.wantsFert=false;d.wantsWater=false;
        d.fromLabel=`照 ${String(r.from).split(" ")[0].slice(5)} 那次`;
      }
      // 配方
      const recipe=!d?teddyRecipeInText(q):null;
      if(recipe){
        d=teddyHandsParse68(q.replace(recipe,""));
        const rv=teddyRecipes[recipe].vals;
        [6,7,8].forEach(id=>{d.vals[id]={...(rv[id]||{}),...d.vals[id]};});
        d.ids=[6,7,8].filter(id=>Object.keys(d.vals[id]).length);d.noQty=d.noQty.filter(x=>!(x in d.vals[teddy68ItemOf(x)]));d.wantsFert=false;d.wantsWater=false;
        d.fromLabel=`配方 ${recipe}`;
      }
      if(!d)d=teddyHandsParseDraft(q);
      // 只有補問時的回答（沒有再說一次「指派」）才併入原草稿；重新說「指派…」就是一筆新的。
      if(teddyHandsPending&&teddyHandsPending.kind==="assign68"&&(!d||d.kind==="assign68")&&!assignVerb)d=teddyHandsMerge68(teddyHandsPending,d,q);
      if(!d)return {handled:false};
      const miss=teddyHandsMissing(d);teddyHandsPending=d;teddyHandsRender();
      if(miss.length)return {handled:true,reply:`還缺：${miss.join("、")}。`};
      // 先檢查完全體規則：同工項還有未回報的指派就不能再指派，提早說，不等到確認才失敗。
      if(d.kind==="assign68"){
        try{
          const r=await teddyWorkRead(`zonework:${d.zone.id}:${d.ym}`);
          const busy=d.ids.filter(id=>(r.data.pending||{})[id]);
          if(busy.length){
            teddyHandsPending=null;teddyHandsRender();
            const nm={6:"工作6 補水",7:"工作7 施肥（固態）",8:"工作8 其他資材"};
            return {handled:true,reply:`${d.zone.name}${d.ym.slice(5)}月的${busy.map(id=>nm[id]).join("、")}還有一筆指派尚未回報完成。完全體規定要先回報（或在完全體修正那筆）才能再指派，所以這筆先不建立。`};
          }
        }catch(e){console.warn("指派前檢查失敗，確認時仍會由安全交易把關",e.message);}
      }
      return {handled:true,reply:`${teddyHandsOneLine(d)}，對嗎？說「好」就寫入，說「取消」就不寫。`};
    }

    // ===== 7.2.1 澎企理財回覆：去掉 Markdown 符號、分段；抽出可以念的短重點 =====
    function teddyInvestFormat(t){
      const host=u=>{try{return new URL(u).hostname.replace(/^www\./,"");}catch(_){return "";}};
      let s=String(t||"").replace(/\r/g,"");
      s=s.replace(/[（(]\s*\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)\s*[)）]/g,(m,a,u)=>`（來源：${host(u)||a}）`);
      s=s.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g,(m,a,u)=>`${a}（來源：${host(u)}）`);
      s=s.replace(/\*\*|__/g,"").replace(/`/g,"");
      s=s.replace(/\s*#{1,6}\s*/g,"\n\n");
      s=s.replace(/[ \t]*(?=(?:^|[\s。；])?[一二三四五六]、)/g,"");
      s=s.replace(/([^\n])\s*(?=[一二三四五六]、\s*(?:結論|技術|籌碼|基本|接下來|觀察|風險))/g,"$1\n\n");
      s=s.replace(/(^|\n)\s*[-*•]\s+/g,"$1・").replace(/\s+-\s+(?=\S)/g,"\n・");
      s=s.replace(/(重點[:：][^\n]*?[。！])\s*/,"$1\n\n");
      s=s.replace(/[ \t]+\n/g,"\n").replace(/\n{3,}/g,"\n\n").trim();
      return s;
    }
    function teddyInvestBrief(t){
      const s=String(t||"");
      const key=(s.match(/重點[:：]\s*([^\n]{4,90})/)||[])[1]||"";
      let concl=(s.match(/一、\s*(?:結論|大盤)?[】：:\s]*([\s\S]*?)(?=\n\s*【?\s*二、|$)/)||[])[1]||"";
      concl=concl.replace(/\n+/g," ").replace(/\s+/g," ").trim();
      if(concl.length>160)concl=concl.slice(0,160).replace(/[，、；][^，、；]*$/,"")+"。";
      let out=[key,concl].filter(Boolean).join(" ");
      if(!out)out=s.replace(/\s+/g," ").slice(0,140)+"…";
      return out+" 完整的技術、籌碼、基本面分析我放在對話框裡了。";
    }
    function teddyInvestDecorate(div,full){
      try{
        const span=div.querySelector("span"); if(span)span.style.whiteSpace="pre-line";
        if(div.querySelector(".pi-read-btns"))return;
        const box=document.createElement("div");box.className="pi-read-btns";box.style.cssText="display:flex;gap:6px;margin-top:6px;";
        const mk=(label,fn)=>{const b=document.createElement("button");b.type="button";b.textContent=label;b.style.cssText="background:#10251f;border:1px solid #2d5a4c;color:#bff9e7;border-radius:7px;padding:4px 9px;font-size:12px;cursor:pointer;";b.onclick=fn;return b;};
        const say=x=>{if(!(typeof window.teddyLiveReadAnswer==="function"&&window.teddyLiveReadAnswer(x)))teddySpeak(x,"gentle",true);};
        box.appendChild(mk("🔊 念重點",()=>say(teddyInvestBrief(full))));
        box.appendChild(mk("🔊 念全文",()=>say(full)));
        box.appendChild(mk("📋 複製",()=>{try{navigator.clipboard.writeText(full);}catch(_){}}));
        div.appendChild(box);
      }catch(_){}
    }
    async function teddySend() {
      const liveSeqAtStart=window.__teddyLiveUserSeq||0;
      const input = document.getElementById("teddyChatInput");
      let text = input.value.trim();
      if(teddyAttachment?.kind==="text")text+=(text?"\n\n":"")+`【附件：${teddyAttachment.name}｜${teddyAttachment.format||"文件"}】\n`+teddyAttachment.text;
      else if(teddyAttachment?.kind==="image")text+=(text?" ":"")+`【本輪已實際附加圖片：${teddyAttachment.name}】請以「圖片本身」為第一資料來源，直接辨識像素、OCR 文字、介面、圖表、人物/物件與畫面關係後回答。不要把附件誤認成網址，不要只描述檔名，也不要要求重傳；只有 API 明確回報圖片解碼失敗時才能說無法讀圖。`;
      else if(teddyAttachment?.kind==="file")text+=(text?" ":"")+`我附加了檔案「${teddyAttachment.name}」。請先自行判斷檔案類型、可讀內容與適合的分析方式，再依我的問題回答；若格式確實不受支援，請明確說明原因。`;
      const teddyUrls=(text.match(/https?:\/\/[^\s<>"'）)】]+/gi)||[]);
      if(teddyUrls.length){
        text += `\n\n【網頁連結讀取要求】本輪包含網頁連結：${teddyUrls.join(" 、 ")}。請使用 web_search 實際開啟/搜尋這些網址與其可讀內容，再根據頁面內容回答；不要只根據網址字面猜測。若網站阻擋存取或需要登入，請明確說明哪些內容無法取得。`;
      }
      if (!text) return;
      input.value = "";
      teddyActiveSkill = teddyDetectSkill(text);
      teddyAppendLog("user", text);
      teddyHistory.push({ role: "user", text });
      teddySaveHistory();
      const nameHit=teddyDetectPreferredName(text);
      if(nameHit)teddySavePreferredName(nameHit);
      const thinkingDiv = teddyAppendLog("teddy", teddySkillLabel(teddyActiveSkill) + " · 想一下…");

      if ((window.TEDDY_ENTRY_ID||"owner")==="family" && /修改我的設定|改我的設定|重新設定我|改稱呼|改興趣/.test(text)) {
        teddyUpdateLogDiv(thinkingDiv, "好，在下面改就可以。");
        teddyEntryFamilySetupCard(true);
        return;
      }
      if ((window.TEDDY_ENTRY_ID||"owner")==="family" && !teddyFamilyProfile() && !document.getElementById("tfSave")) teddyEntryFamilySetupCard(false);
      // 5.9.0：提醒只由關鍵字「提醒」觸發。
      const remRes = teddyReminderHandle(text);
      if (remRes && remRes.handled) {
        teddyUpdateLogDiv(thinkingDiv, remRes.reply);
        if (remRes.reminder && remRes.reminder.due) teddyRemAttachButton(thinkingDiv, remRes.reminder);
        teddyHistory.push({ role: "assistant", text: remRes.reply });
        teddySaveHistory();
        teddySyncToLive(text, remRes.reply);
        const liveOn = typeof window.teddyLiveIsActive === "function" && window.teddyLiveIsActive();
        if (!liveOn) teddySpeak(remRes.reply, "gentle");
        return;
      }

      // Teddy Hands：只有「明確進入工作/溫室」或使用者直接下工作指令時才啟動。
      // 一般模式下的照片、檔案、網頁、一般聊天不得被工作解析器攔截。
      const greenhouseActive = (window.TEDDY_APP_MODE === "greenhouse");
      const explicitHandsCommand = /(?:^|\s)(?:工作|進入工作|工作模式|溫室模式|工作指派|工作回報|用\s*A01\s*登入|A01\s*登入|登入溫室系統|確認寫入|取消寫入)(?:$|[，。！？!?\s])/i.test(text)
        || (!!teddyHandsPending && (TEDDY_CONFIRM_RE.test(text.trim())||/^(?:取消|不要|不要寫入|取消寫入|算了|不對)[。！!]*$/i.test(text.trim())))
        || /配方/.test(text);
      const handsAllowed = (window.TEDDY_ENTRY_ID||"owner") !== "family";
      const handsResult = handsAllowed && (greenhouseActive || explicitHandsCommand) ? await teddyHandsHandle(text) : {handled:false};
      if (handsResult && handsResult.handled) {
        teddyUpdateLogDiv(thinkingDiv, handsResult.reply);
        teddyHistory.push({ role: "assistant", text: handsResult.reply });
        teddySaveHistory();
        teddySyncToLive(text, handsResult.reply);
        teddySpeak(handsResult.reply, "gentle");
        return;
      }

      // V3.1 Core abilities run locally first: faster and cannot be lost by model routing.
      const localReply = teddyV31LocalCoreReply(text);
      if (localReply) {
        const prefix = teddyV3VersionPrefix();
        const finalLocalReply = prefix ? (prefix + "\n" + localReply) : localReply;
        teddyUpdateLogDiv(thinkingDiv, finalLocalReply);
        teddyHistory.push({ role: "assistant", text: finalLocalReply });
        teddySaveHistory();
        teddySyncToLive(text, finalLocalReply);
        teddyV3MarkSuccessfulChat();
        teddySpeak(finalLocalReply, teddyAutoDetectVoiceStyle(finalLocalReply, []));
        return;
      }
      // 5.8.2：溫室模式的文字問題一律走溫室唯一資料閘門，不交給 Astra、網頁搜尋或畫面掃描。
      if(greenhouseActive && !teddyAttachment && typeof window.teddyGreenhouseAsk==="function"){
        try{
          const res=await window.teddyGreenhouseAsk(text);
          if(res.entry){
          teddyUpdateLogDiv(thinkingDiv, res.answer);
          teddyHistory.push({ role: "assistant", text: res.answer });
          teddySaveHistory();
          if(!(typeof window.teddyLiveSpeak==="function"&&window.teddyLiveSpeak(res.answer)))teddySpeak(res.answer,"gentle");
          return;
          }
          // 對不到任何溫室入口＝一般聊天，交回原本的對話流程。
        }catch(e){teddyUpdateLogDiv(thinkingDiv,"溫室查詢失敗："+e.message);return;}
      }
      // 5.7.1：Flash Live 正在說話時，打字內容直接交給 Flash（TEDDY 的嘴）回答，回覆逐字稿會自動寫回同一份記憶。
      if(!teddyAttachment && !teddyUrls.length && !(typeof window.teddyInvestWants==="function"?window.teddyInvestWants(text):(typeof window.teddyInvestContext==="function"&&window.teddyInvestContext(text))) && typeof window.teddyLiveSendText==="function" && window.teddyLiveSendText(text)){
        teddyUpdateLogDiv(thinkingDiv, "🎙️ 已交給即時語音 TEDDY 回答…");
        return;
      }
      // Hard Fresh Data Gate：需要時效資料的專業問題，先查到資料才讓模型分析。
      // 7.3.0 法人買賣超排行：純列表由程式直接回答
      if(!greenhouseActive&&typeof window.teddyInvestRankLocal==="function"&&window.teddyInvestRankParse&&window.teddyInvestRankParse(text)){
        try{
          teddyUpdateLogDiv(thinkingDiv,"📊 讀取證交所、櫃買中心三大法人資料…");
          const rk=await window.teddyInvestRankLocal(text);
          if(rk){
            teddyUpdateLogDiv(thinkingDiv,rk);
            try{const sp=thinkingDiv.querySelector("span");if(sp)sp.style.whiteSpace="pre-line";}catch(_){}
            teddyHistory.push({role:"assistant",text:rk});teddySaveHistory();teddySyncToLive(text,rk);
            const head=rk.split("\n")[0], stat=(rk.match(/程式統計：[^\n]*/)||[""])[0];
            const brief=`${head.replace(/（.*$/,"")}已經列在對話框了。${stat.replace("程式統計：","")}`;
            if(!(typeof window.teddyLiveReadAnswer==="function"&&window.teddyLiveReadAnswer(brief)))teddySpeak(brief,"gentle");
            return;
          }
        }catch(e){teddyUpdateLogDiv(thinkingDiv,"法人排行讀取失敗："+e.message+"（需要部署新版 api/stock.js）");return;}
      }
      const freshCheck = await teddyFreshDataPreflight(text);
      // 7.2.0 澎企理財：提到自選股時，把程式算好的行情／均價／法人／EPS 放在最前面，分析交給 Astra。
      let teddyInvestCtx="";
      try{if(!greenhouseActive&&typeof window.teddyInvestQuery==="function"&&(window.teddyInvestWants?window.teddyInvestWants(text):window.teddyInvestContext(text))){teddyUpdateLogDiv(thinkingDiv,"💹 讀取澎企理財最新行情、均價、法人、EPS…");window.__teddyInvestProgress=m=>{teddyUpdateLogDiv(thinkingDiv,m);try{const sp=thinkingDiv.querySelector("span");if(sp)sp.style.whiteSpace="pre-line";}catch(_){}};teddyInvestCtx=await window.teddyInvestQuery(text);window.__teddyInvestProgress=null;}}catch(_){}
      if(teddyInvestCtx){teddyFreshContext=teddyInvestCtx+(teddyFreshContext?"\n\n【網路最新消息（參考）】\n"+teddyFreshContext:"");}
      if (!freshCheck.ok) {
        teddyUpdateLogDiv(thinkingDiv, freshCheck.error);
        teddyHistory.push({ role: "assistant", text: freshCheck.error });
        teddySaveHistory();
        teddySpeak(freshCheck.error, "gentle");
        return;
      }
      if (freshCheck.required) teddyUpdateLogDiv(thinkingDiv, freshCheck.degraded ? "📡 即時資料層切換備援，正在查證與分析…" : (freshCheck.cached ? "📡 即時來源暫時失敗，使用最近已驗證資料並再次查證…" : "📡 最新資料已驗證，正在分析…"));
      if (teddyInvestCtx) teddyUpdateLogDiv(thinkingDiv, "💹 已讀到自選股資料，Teddy 整理中…");

      let lastToolNames = [];
      const onStatus = (msg, toolNames) => {
        teddyUpdateLogDiv(thinkingDiv, msg);
        if (toolNames) lastToolNames = toolNames;
      };
      const keys = loadKeys();
      const modelSelect = document.getElementById("teddyModelSelect");
      let pref = modelSelect ? modelSelect.value : "auto";
      // 使用者要求：複雜問題不論目前一般／溫室模式或手動模型選擇，都優先 Astra。
      const teddyJudge = teddyDeepJudge(text,{invest:!!teddyInvestCtx,attachment:!!teddyAttachment});
      if (teddyJudge.deep && (keys.openai||keys.anthropic)) { pref = teddyDeepChoice(keys).p; teddyUpdateLogDiv(thinkingDiv, "🧠 交給深度思考（"+teddyDeepChoice(keys).label+"）："+(teddyJudge.reason||"複雜問題")+"…"); }
      const btn = document.getElementById("teddyChatSend");
      btn.disabled = true;
      try {
        let reply, provider = null, result = null;
        if (pref === "anthropic") {
          if (!keys.anthropic) reply = "尚未設定 Claude 的 API Key，請先到「⚙️ 設定 Key」設定。";
          else { try{ result = await teddyChatWithClaude(keys.anthropic, onStatus); provider = "anthropic"; }catch(claudeErr){ if(!keys.openai)throw claudeErr; onStatus("Claude 暫時失敗（"+String(claudeErr.message||claudeErr).slice(0,60)+"），改用 GPT-6.1 Sol…"); try{ result = await teddyChatWithOpenAI(keys.openai,onStatus); }catch(e2){ result = await teddyChatWithOpenAIFallback(keys.openai,onStatus,e2); } provider = "openai"; } }
        } else if (pref === "openai") {
          if (!keys.openai) reply = "尚未設定 GPT-6 Astra 的 OpenAI API Key，請先到「⚙️ 設定 Key」設定。";
          else { try{ result = await teddyChatWithOpenAI(keys.openai,onStatus); }catch(astraErr){ result=await teddyChatWithOpenAIFallback(keys.openai,onStatus,astraErr); } provider="openai"; }
        } else if (pref === "gemini") {
          if (!keys.google) reply = "尚未設定 Gemini 的 API Key，請先到「⚙️ 設定 Key」設定。";
          else { result = await teddyChatWithGemini(keys.google, onStatus); provider = "gemini"; }
        } else if (pref === "grok") {
          if (!keys.xai) reply = "尚未設定 Grok 的 API Key，請先到「⚙️ 設定 Key」設定。";
          else { result = await teddyChatWithGrok(keys.xai, onStatus); provider = "grok"; }
        } else {
          provider=teddyChooseProvider(text,keys,"general");
          if(provider==="anthropic")result=await teddyChatWithClaude(keys.anthropic,onStatus);
          else if(provider==="openai"){try{result=await teddyChatWithOpenAI(keys.openai,onStatus);}catch(astraErr){result=await teddyChatWithOpenAIFallback(keys.openai,onStatus,astraErr);}}
          else if(provider==="gemini")result=await teddyChatWithGemini(keys.google,onStatus);
          else if(provider==="grok")result=await teddyChatWithGrok(keys.xai,onStatus);
          else reply = "請先按上面「⚙️ 設定 Key」設定至少一個 AI Key，TEDDY 才能跟你對話喔。";
        }
        if (result) {
          reply = result.text;
          teddyRecordChatUsage(provider, result.usage);
        }
        if (teddyInvestCtx && reply) {
          // 7.2.1 澎企理財：整理成好讀的段落；聲音只念「重點＋結論」，全文留在對話框
          reply = teddyInvestFormat(reply);
          try{const comp=typeof window.teddyInvestTakeCompleteness==="function"?window.teddyInvestTakeCompleteness():"";if(comp)reply+="\n\n"+comp;}catch(_){}
          teddyUpdateLogDiv(thinkingDiv, reply);
          teddyInvestDecorate(thinkingDiv, reply);
          try{if(typeof window.teddyInvestLogAnalysis==="function")window.teddyInvestLogAnalysis(text,reply);}catch(_){}
          teddyHistory.push({ role: "assistant", text: reply });
          teddyV3MarkSuccessfulChat();
          teddySaveHistory();
          teddySyncToLive(text, reply);
          const brief = teddyInvestBrief(reply);
          const liveMovedOn=(window.__teddyLiveUserSeq||0)!==liveSeqAtStart;
          if(liveMovedOn&&typeof window.teddyLiveIsActive==="function"&&window.teddyLiveIsActive()){
            // 8.2.1：分析完成時，使用者已經用語音聊到別的事，不插話；只在畫面上提示，可按「🔊 念重點」
            try{const n=document.createElement("div");n.className="pi-note";n.style.cssText="font-size:11px;color:#e8c879;margin-top:4px;";n.textContent="（你已經在語音聊別的，這份分析先放這裡，要聽就按「🔊 念重點」）";thinkingDiv.appendChild(n);}catch(_){}
          } else if(!(typeof window.teddyLiveReadAnswer==="function"&&window.teddyLiveReadAnswer(brief,String(text).replace(/^分析\s*/,"").slice(0,20))))
            teddySpeak(brief, "gentle");
        } else {
        const prefix = teddyV3VersionPrefix();
        if (prefix && reply) reply = prefix + "\n" + reply;
        teddyUpdateLogDiv(thinkingDiv, reply);
        teddyHistory.push({ role: "assistant", text: reply });
        teddyV3MarkSuccessfulChat();
        teddySaveHistory();
        teddySyncToLive(text, reply);
        if(!(teddyAttachment&&typeof window.teddyLiveReadAnswer==="function"&&window.teddyLiveReadAnswer(reply)))
          teddySpeak(reply, teddyAutoDetectVoiceStyle(reply, lastToolNames));
        }
      } catch (e) {
        teddyUpdateLogDiv(thinkingDiv, "出錯了：" + e.message);
      }
      teddyFreshContext = "";
      teddyAttachment=null;
      const ac=document.getElementById("teddyAttachmentChip"),af=document.getElementById("teddyAttachmentInput");
      if(ac)ac.style.display="none";if(af)af.value="";
      btn.disabled = false;
    }

    const teddySkillSelect = document.getElementById("teddySkillSelect");
    if (teddySkillSelect) {
      teddySkillSelect.value = localStorage.getItem("teddy_skill_pref") || "auto";
      teddySkillSelect.addEventListener("change", () => {
        localStorage.setItem("teddy_skill_pref", teddySkillSelect.value);
      });
    }


    const teddyVoicePreviewBtn = document.getElementById("teddyVoicePreview");
    if (teddyVoicePreviewBtn) {
      teddyVoicePreviewBtn.onclick = async () => {
        const style = teddyResolveVoiceStyle("teddy");
        const samples = {
          sweet: "嗨，我是 Teddy。這個聲音比較甜美自然，講話清楚，也不會刻意裝可愛。",
          playful: "嘿，我是 Teddy。這個聲音比較年輕活潑，語速快一點，但還是自然好聽。",
          gentle: "嗨，我是 Teddy。這個聲音比較溫柔放鬆，講話慢一點，像哄你休息一樣。",
          storyteller: "大家好，我是 Teddy。這個聲音比較穩重，像在念故事給你聽一樣。",
          excited: "哇，我是 Teddy！這個聲音比較興奮，適合分享超酷的新發現！"
        };
        teddyVoicePreviewBtn.disabled = true;
        teddyVoicePreviewBtn.textContent = "🔊 試聽中";
        try { await teddySpeak(samples[style] || samples.sweet, style, true); }
        finally {
          setTimeout(() => {
            teddyVoicePreviewBtn.disabled = false;
            teddyVoicePreviewBtn.textContent = "🎧 試聽";
          }, 800);
        }
      };
    }


    const teddyChipmunkToggleBtn = document.getElementById("teddyChipmunkToggle");
    function teddyRenderChipmunkToggle() {
      if (!teddyChipmunkToggleBtn) return;
      const on = teddyChipmunkEnabled();
      teddyChipmunkToggleBtn.style.borderColor = on ? "#5eead4" : "#2a3532";
      teddyChipmunkToggleBtn.style.color = on ? "#d9fff0" : "#6b7a74";
      teddyChipmunkToggleBtn.textContent = on ? "🐿️ 花栗鼠變聲：開" : "🐿️ 花栗鼠變聲：關";
    }
    if (teddyChipmunkToggleBtn) {
      teddyRenderChipmunkToggle();
      teddyChipmunkToggleBtn.onclick = () => {
        teddySetChipmunkEnabled(!teddyChipmunkEnabled());
        teddyRenderChipmunkToggle();
      };
    }

    document.getElementById("teddyChatSend").onclick = teddySend;
    const teddyAttachmentInput=document.getElementById("teddyAttachmentInput");
    const teddyAttachmentChip=document.getElementById("teddyAttachmentChip");
    document.getElementById("teddyAttachmentBtn").onclick=()=>teddyAttachmentInput.click();
    document.getElementById("teddyAttachmentClear").onclick=()=>{teddyAttachment=null;teddyLiveImage=null;teddyAttachmentInput.value="";teddyAttachmentChip.style.display="none";teddySetAttachmentProgress(0,"");};
    async function teddyExtractPdf(file){
      if(!window.pdfjsLib) throw new Error("PDF 解析器尚未載入，請等 1 秒再試一次。");
      try{ window.pdfjsLib.GlobalWorkerOptions.workerSrc="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js"; }catch(_){}
      const buf=await file.arrayBuffer();
      const pdf=await window.pdfjsLib.getDocument({data:new Uint8Array(buf)}).promise;
      const pages=[];
      const limit=Math.min(pdf.numPages,120);
      for(let i=1;i<=limit;i++){
        const page=await pdf.getPage(i);
        const tc=await page.getTextContent();
        const line=tc.items.map(x=>x.str||"").join(" ").replace(/\s+/g," ").trim();
        if(line)pages.push(`【第 ${i} 頁】\n${line}`);
      }
      if(!pages.length) throw new Error("這份 PDF 沒有可讀取的文字，可能是掃描影像 PDF。請改上傳頁面截圖或文字版 PDF。");
      return pages.join("\n\n").slice(0,180000);
    }

    async function teddyExtractExcel(file){
      if(!window.XLSX) throw new Error("Excel 解析器尚未載入，請等 1 秒再試一次。");
      const wb=window.XLSX.read(await file.arrayBuffer(),{type:"array",cellDates:true});
      const out=[];
      wb.SheetNames.slice(0,30).forEach(name=>{
        const ws=wb.Sheets[name];
        const csv=window.XLSX.utils.sheet_to_csv(ws,{blankrows:false});
        if(csv.trim())out.push(`【工作表：${name}】\n${csv}`);
      });
      if(!out.length)throw new Error("Excel 裡沒有可讀取的儲存格資料。");
      return out.join("\n\n").slice(0,180000);
    }

    async function teddyExtractDocx(file){
      if(!window.mammoth) throw new Error("Word 解析器尚未載入，請等 1 秒再試一次。");
      const r=await window.mammoth.extractRawText({arrayBuffer:await file.arrayBuffer()});
      const t=String(r.value||"").trim();
      if(!t)throw new Error("Word 文件沒有可讀取的文字內容。");
      return t.slice(0,180000);
    }

    async function teddyExtractPptx(file){
      if(!window.JSZip) throw new Error("PowerPoint 解析器尚未載入，請等 1 秒再試一次。");
      const zip=await window.JSZip.loadAsync(await file.arrayBuffer());
      const names=Object.keys(zip.files).filter(n=>/^ppt\/slides\/slide\d+\.xml$/i.test(n)).sort((a,b)=>{
        const na=+(a.match(/slide(\d+)\.xml/i)||[])[1], nb=+(b.match(/slide(\d+)\.xml/i)||[])[1]; return na-nb;
      });
      const out=[];
      for(let i=0;i<Math.min(names.length,100);i++){
        const xml=await zip.file(names[i]).async("text");
        const doc=new DOMParser().parseFromString(xml,"application/xml");
        const runs=[...doc.getElementsByTagNameNS("*","t")].map(n=>n.textContent||"").filter(Boolean);
        if(runs.length)out.push(`【投影片 ${i+1}】\n${runs.join(" ")}`);
      }
      if(!out.length)throw new Error("PowerPoint 沒有可讀取的文字。若重點是圖片或圖表，請另外上傳截圖。");
      return out.join("\n\n").slice(0,180000);
    }

    function teddySetAttachmentProgress(percent, stage){
      const bar=document.getElementById("teddyAttachmentProgress");
      const wrap=document.getElementById("teddyAttachmentProgressWrap");
      const pct=document.getElementById("teddyAttachmentPct");
      const st=document.getElementById("teddyAttachmentStage");
      const n=Math.max(0,Math.min(100,Math.round(Number(percent)||0)));
      if(wrap)wrap.style.display=n>=100?"none":"block";
      if(bar)bar.style.width=n+"%";
      if(pct)pct.textContent=n>=100?"✓":(n+"%");
      if(st){st.style.display=stage?"block":"none";st.textContent=stage||"";}
    }
    function teddyReadDataUrlWithProgress(file, label){
      return new Promise((res,rej)=>{
        const r=new FileReader();
        r.onprogress=(e)=>{if(e.lengthComputable)teddySetAttachmentProgress(8+Math.round((e.loaded/e.total)*55),label||"正在讀取檔案…");};
        r.onload=()=>res(String(r.result));
        r.onerror=()=>rej(new Error("檔案讀取失敗"));
        r.readAsDataURL(file);
      });
    }

    async function teddyReadAttachmentFile(file){
      const ext=(file.name.split(".").pop()||"").toLowerCase();
      if(file.type.startsWith("image/")){
        teddySetAttachmentProgress(8,"正在讀取圖片像素…");
        const dataUrl=await teddyReadDataUrlWithProgress(file,"正在讀取圖片像素…");
        teddySetAttachmentProgress(72,"圖片已讀取，正在準備視覺分析…");
        return {kind:"image",name:file.name,mime:file.type,data:dataUrl.split(",")[1],format:"圖片"};
      }
      let text="",format="文件";
      teddySetAttachmentProgress(12,"正在讀取檔案…");
      if(ext==="pdf"){ teddySetAttachmentProgress(35,"正在解析 PDF 文字…"); text=await teddyExtractPdf(file); format="PDF"; }
      else if(ext==="xlsx"||ext==="xls"){ teddySetAttachmentProgress(35,"正在解析 Excel 工作表…"); text=await teddyExtractExcel(file); format="Excel"; }
      else if(ext==="docx"){ teddySetAttachmentProgress(35,"正在解析 Word 文件…"); text=await teddyExtractDocx(file); format="Word"; }
      else if(ext==="pptx"){ teddySetAttachmentProgress(35,"正在解析 PowerPoint…"); text=await teddyExtractPptx(file); format="PowerPoint"; }
      else if(["txt","md","csv","tsv","json"].includes(ext)||file.type.startsWith("text/")){
        teddySetAttachmentProgress(45,"正在讀取文字內容…"); text=await file.text(); format=ext.toUpperCase()||"文字";
      } else {
        // 不預先拒絕未知格式：交給 Astra Responses API 的 input_file 自行判斷。
        teddySetAttachmentProgress(8,"正在讀取檔案…");
        const dataUrl=await teddyReadDataUrlWithProgress(file,"正在讀取檔案…");
        teddySetAttachmentProgress(72,"檔案已讀取，正在準備分析…");
        return {kind:"file",name:file.name,mime:file.type||"application/octet-stream",data:dataUrl.split(",")[1],format:ext?ext.toUpperCase():"檔案"};
      }
      teddySetAttachmentProgress(82,"正在整理可分析內容…");
      text=String(text||"").trim().slice(0,180000);
      if(!text)throw new Error("這個檔案沒有讀到可分析的文字內容。");
      return {kind:"text",name:file.name,mime:file.type||"text/plain",text,format};
    }

    teddyAttachmentInput.onchange=async e=>{
      const file=e.target.files?.[0]; if(!file)return;
      if(file.size>25e6){alert("附件請小於 25MB");e.target.value="";return;}
      const nameEl=document.getElementById("teddyAttachmentName");
      teddyAttachmentChip.style.display="block";
      nameEl.textContent="⏳ "+file.name;
      teddySetAttachmentProgress(2,"準備讀取附件…");
      try{
        teddyAttachment=await teddyReadAttachmentFile(file);
        teddySetAttachmentProgress(94,"附件已讀取，準備送交 Teddy…");
        const icon=teddyAttachment.kind==="image"?"🖼 ":(teddyAttachment.kind==="file"?"📦 ":"📄 ");
        nameEl.textContent=icon+file.name+" · 已就緒";
        teddySetAttachmentProgress(100,"已完成，可直接提問");
        if(teddyAttachment.kind==="image"){
          teddyLiveImage=teddyAttachment;
          if(typeof window.teddyLiveSendImage==="function"&&await window.teddyLiveSendImage(teddyAttachment)){
            nameEl.textContent="🖼 "+file.name+" · 已就緒（語音也看得到）";
            teddySetAttachmentProgress(100,"已完成，可打字或直接用說的問");
          }
        }
      }catch(err){
        teddyAttachment=null; teddyAttachmentInput.value=""; teddySetAttachmentProgress(0,""); teddyAttachmentChip.style.display="none";
        alert("TEDDY 無法讀取這個檔案："+(err?.message||err));
      }
    };
    document.getElementById("teddyHandsConfirm")?.addEventListener("click", async () => {
      const btn=document.getElementById("teddyHandsConfirm"); if(btn)btn.disabled=true;
      try{if(!teddyHandsSession){const r=await teddyHandsLogin("A01");teddyAppendLog("teddy",r.message);if(!r.ok)return;}const key=await teddyHandsCommitPending();const msg=`✓ 已寫入完全體 V5.1，並重新讀取驗證成功。位置：${key}`;teddyAppendLog("teddy",msg);teddyHistory.push({role:"assistant",text:msg});teddySaveHistory();teddySpeak(msg,"gentle");}
      catch(e){teddyAppendLog("teddy","寫入失敗，沒有回報成功："+e.message);}
      finally{if(btn)btn.disabled=false;}
    });
    document.getElementById("teddyHandsCancel")?.addEventListener("click",()=>{teddyHandsCancel();teddyAppendLog("teddy","好，這筆沒有寫入完全體 V5.1。");});

    document.getElementById("teddyChatInput").addEventListener("keydown", (e) => {
      if (e.key === "Enter") teddySend();
    });
    document.querySelectorAll(".teddy-chip").forEach((btn) => {
      btn.onclick = () => {
        document.getElementById("teddyChatInput").value = btn.getAttribute("data-msg") || "";
        teddySend();
      };
    });

    // ===== TEDDY 語音輸入（講話填入輸入框，說完自動送出）=====
    (function () {
      const micBtn = document.getElementById("teddyMicBtn");
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SR || !micBtn) {
        if (micBtn) { micBtn.disabled = true; micBtn.title = "此瀏覽器不支援語音輸入（請用 Chrome）"; micBtn.style.opacity = "0.4"; }
        return;
      }
      let teddyRecognition = new SR();
      let teddyListening = false;
      teddyRecognition.lang = "zh-TW";
      teddyRecognition.interimResults = true;
      teddyRecognition.onresult = (ev) => {
        let t = "";
        for (let i = ev.resultIndex; i < ev.results.length; i++) t += ev.results[i][0].transcript;
        document.getElementById("teddyChatInput").value = t;
      };
      teddyRecognition.onend = teddyRecognition.onerror = () => {
        teddyListening = false;
        micBtn.classList.remove("recording");
        micBtn.style.background = "#1a2220";
        micBtn.textContent = "🎤";
        const input = document.getElementById("teddyChatInput");
        if (input.value.trim()) teddySend();
      };
      micBtn.onclick = () => {
        if (teddyListening) { teddyRecognition.stop(); return; }
        teddyListening = true;
        micBtn.classList.add("recording");
        micBtn.style.background = "#3a1a1a";
        micBtn.textContent = "⏹";
        document.getElementById("teddyChatInput").value = "";
        teddyRecognition.start();
      };
    })();

    (function () {
      const sel = document.getElementById("teddyModelSelect");
      if (sel) {
        sel.value = localStorage.getItem("teddy_model_pref") || "auto";
        sel.addEventListener("change", () => localStorage.setItem("teddy_model_pref", sel.value));
      }
    })();
    document.getElementById("teddyUsageToggle").onclick = () => {
      const panel = document.getElementById("teddyUsagePanel");
      const showing = panel.style.display !== "none";
      panel.style.display = showing ? "none" : "block";
      if (!showing) teddyRenderUsage();
    };
    document.getElementById("teddyChatClear").onclick = teddyClearHistory;
    document.getElementById("teddyMemoryExport").onclick = teddyExportMemory;
    document.getElementById("teddyVoiceToggle").onclick = () => {
      teddyVoiceEnabled = !teddyVoiceEnabled;
      document.getElementById("teddyVoiceToggle").textContent = teddyVoiceEnabled ? "🔊 語音" : "🔇 語音";
      if (!teddyVoiceEnabled) {
        if (teddyCurrentAudio) { try { teddyCurrentAudio.pause(); } catch (_) {} }
        if (window.speechSynthesis) window.speechSynthesis.cancel();
      }
    };

    // ===== 版面精簡：摺疊區塊切換 =====
    document.getElementById("teddySettingsToggle").onclick = () => {
      const panel = document.getElementById("teddySettingsPanel");
      panel.style.display = panel.style.display === "none" ? "block" : "none";
    };
    document.getElementById("teddyMoreToggle").onclick = () => {
      /* 5.9.4：快捷按鈕已移除，直接跟 TEDDY 說就可以 */
    };

    function loadKeys() {
      try { return JSON.parse(localStorage.getItem("ai_obs_keys") || "{}"); } catch { return {}; }
    }
    function saveKeys(obj) { localStorage.setItem("ai_obs_keys", JSON.stringify(obj)); }
    function updateKeyStatus() {
      const n = Object.values(loadKeys()).filter(Boolean).length;
      const el = document.getElementById("keyStatus");
      el.textContent = n ? `已設定 ${n}/5` : "尚未設定";
      el.className = n ? "key-status ok" : "key-status";
    }
    function escapeHtml(s) {
      return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
    }
    // 8.6.2：簡單排版（粗體、標題、條列），卡片與全螢幕閱讀共用
    function obsMd(t) {
      return escapeHtml(t || "").split("\n").map(line => {
        let l = line;
        const h = l.match(/^\s*#{1,6}\s+(.*)$/);
        if (h) return `<b class="obs-h">${h[1].replace(/\*\*/g, "")}</b>`;
        l = l.replace(/^(\s*)[-*]\s+/, "$1• ");
        l = l.replace(/\*\*([^*]+?)\*\*/g, "<b>$1</b>").replace(/`([^`]+)`/g, "<code>$1</code>");
        return l;
      }).join("\n");
    }
    let obsLast = null;
    function renderCards(state) {
      obsLast = state && typeof state === "object" ? state : null;
      document.getElementById("grid").innerHTML = SOURCES.map((s) => {
        let body = `<div class="placeholder">尚未送出問題</div>`;
        let statusText = "待命";
        let pulse = "";
        const loadingOne = state && typeof state === "object" && state.__pending && !state[s.key];
        if (state === "loading" || loadingOne) {
          body = `<div class="placeholder">等待回應中…</div>`;
          statusText = "讀取中"; pulse = " pulse";
        } else if (state && state[s.key]) {
          const r = state[s.key];
          body = `<div class="body-text">${obsMd(r.text || "")}</div>${r.ok ? '<div class="obs-more">點卡片看全文 ›</div>' : ""}`;
          statusText = r.ok ? `${r.ms}ms` : "失敗";
        }
        const av = s.avatarImg
          ? `<img src="${s.avatarImg}" alt="${s.name}" />`
          : s.emoji;
        const extraClass = s.center ? " grok-center" : "";
        return `<article class="card${extraClass}" data-obs="${s.key}" style="--ring:${s.ring};--dot:${s.dot}">
          <div class="avatar">${av}</div>
          <div class="name">${s.name}</div>
          <div class="vendor">${s.vendor}</div>
          <div class="divider"></div>
          <div class="status-row"><span class="dot${pulse}"></span>${statusText}</div>
          ${body}
        </article>`;
      }).join("");
    }
    // 8.6.2：點卡片 → 全螢幕閱讀；左上「‹ 返回」或手機返回鍵回到五宮格；下方可切換上一家／下一家
    function obsReaderOpen(key, fromNav) {
      const list = SOURCES.filter(x => obsLast && obsLast[x.key]);
      const s = SOURCES.find(x => x.key === key), r = obsLast && obsLast[key];
      if (!s || !r) return;
      let box = document.getElementById("obsReader");
      if (!box) { box = document.createElement("div"); box.id = "obsReader"; document.body.appendChild(box); }
      const i = list.findIndex(x => x.key === key), prev = list[(i - 1 + list.length) % list.length], next = list[(i + 1) % list.length];
      const av = s.avatarImg ? `<img src="${s.avatarImg}" alt="">` : s.emoji;
      box.style.setProperty("--ring", s.ring);
      box.innerHTML = `<div class="obs-top"><button type="button" id="obsBack">‹ 返回</button><div class="obs-who"><span class="obs-av">${av}</span><b>${s.name}</b><small>${r.ok ? r.ms + "ms" : "失敗"}</small></div><button type="button" id="obsCopy">複製</button></div>
        <div class="obs-q">${escapeHtml(document.getElementById("question").value.trim() || "")}</div>
        <div class="obs-body">${obsMd(r.text || "")}</div>
        ${list.length > 1 ? `<div class="obs-nav"><button type="button" data-go="${prev.key}">‹ ${prev.name}</button><button type="button" data-go="${next.key}">${next.name} ›</button></div>` : ""}`;
      box.classList.add("show"); box.scrollTop = 0; document.body.style.overflow = "hidden";
      if (!fromNav) { try { history.pushState({ obsReader: 1 }, ""); } catch (_) {} }
      box.querySelector("#obsBack").onclick = () => { try { if (history.state && history.state.obsReader) history.back(); else obsReaderClose(); } catch (_) { obsReaderClose(); } };
      box.querySelector("#obsCopy").onclick = async (e) => { try { await navigator.clipboard.writeText(r.text || ""); e.target.textContent = "已複製"; } catch (_) { e.target.textContent = "無法複製"; } setTimeout(() => { e.target.textContent = "複製"; }, 1500); };
      box.querySelectorAll("[data-go]").forEach(b => b.onclick = () => obsReaderOpen(b.dataset.go, true));
    }
    function obsReaderClose() { const box = document.getElementById("obsReader"); if (box) box.classList.remove("show"); document.body.style.overflow = ""; }
    window.addEventListener("popstate", () => { const box = document.getElementById("obsReader"); if (box && box.classList.contains("show")) obsReaderClose(); });
    document.getElementById("grid").addEventListener("click", (e) => {
      const card = e.target.closest("[data-obs]"); if (!card) return;
      if (window.getSelection && String(window.getSelection()).length > 0) return;   // 正在選字就不打開
      obsReaderOpen(card.dataset.obs);
    });
    function showError(msg) {
      const box = document.getElementById("errorBox");
      if (!msg) { box.classList.remove("show"); return; }
      box.textContent = msg; box.classList.add("show");
    }

    // 8.6.1：觀測站的 OpenAI 卡片改用 GPT-6.1 Sol（原本標示 Astra，實際卻呼叫舊的 gpt-4o）
    async function callOpenAI(q, keys, img, mime) {
      const t0 = Date.now();
      if (!keys.openai) return { ok: false, text: "未設定 Key", ms: 0 };
      try {
        const content = [{ type: "input_text", text: q }];
        if (img) content.push({ type: "input_image", image_url: `data:${mime};base64,${img}` });
        const r = await teddyFetch("https://api.openai.com/v1/responses", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${keys.openai}` },
          body: JSON.stringify({
            model: "gpt-6.1-sol",
            input: [
              { role: "developer", content: [{ type: "input_text", text: getSystemPrompt() }] },
              { role: "user", content }
            ]
          }),
        }, 90000);
        const d = await r.json();
        if (!r.ok) throw new Error(d?.error?.message || `HTTP ${r.status}`);
        try { if (d.usage && typeof teddyRecordChatUsage === "function") teddyRecordChatUsage("openai", { input: d.usage.input_tokens || 0, cached: d.usage.input_tokens_details?.cached_tokens || 0, output: d.usage.output_tokens || 0, apiCalls: 1, costUsd: typeof teddyModelCost === "function" ? teddyModelCost("gpt-6.1-sol", d.usage.input_tokens || 0, d.usage.input_tokens_details?.cached_tokens || 0, d.usage.output_tokens || 0) : undefined }); } catch (_) {}
        const text = (d.output_text || (d.output || []).flatMap(x => x.content || []).filter(x => x.type === "output_text").map(x => x.text || "").join("\n")).trim();
        return { ok: true, text: text || "（沒有回覆）", ms: Date.now() - t0 };
      } catch (e) { return { ok: false, text: `錯誤：${e.message}`, ms: Date.now() - t0 }; }
    }
    async function callClaude(q, keys, img, mime) {
      const t0 = Date.now();
      if (!keys.anthropic) return { ok: false, text: "未設定 Key", ms: 0 };
      try {
        const content = img
          ? [{ type: "image", source: { type: "base64", media_type: mime, data: img } }, { type: "text", text: q }]
          : q;
        const r = await teddyFetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": keys.anthropic,
            "anthropic-version": "2023-06-01",
            "anthropic-dangerous-direct-browser-access": "true",
          },
          body: JSON.stringify({
            model: "claude-sonnet-5-5",
            max_tokens: 4096,
            system: getSystemPrompt(),
            messages: [{ role: "user", content }]
          }),
        }, 90000);
        const d = await r.json();
        if (!r.ok) throw new Error(d?.error?.message || `HTTP ${r.status}`);
        const text = (d.content || []).filter((b) => b.type === "text").map((b) => b.text).join("");
        return { ok: true, text, ms: Date.now() - t0 };
      } catch (e) { return { ok: false, text: `錯誤：${e.message}`, ms: Date.now() - t0 }; }
    }
    async function callGemini(q, keys, img, mime) {
      const t0 = Date.now();
      if (!keys.google) return { ok: false, text: "未設定 Key", ms: 0 };
      try {
        const parts = [{ text: q }];
        if (img) parts.push({ inline_data: { mime_type: mime, data: img } });
        const r = await teddyFetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${keys.google}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              system_instruction: { parts: [{ text: getSystemPrompt() }] },
              contents: [{ role: "user", parts }],
              generationConfig: { temperature: 0.7, maxOutputTokens: 4096 }
            })
          }
        , 90000);
        const d = await r.json();
        if (!r.ok) throw new Error(d?.error?.message || `HTTP ${r.status}`);
        const text = d.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") || "（無內容）";
        return { ok: true, text, ms: Date.now() - t0 };
      } catch (e) { return { ok: false, text: `錯誤：${e.message}`, ms: Date.now() - t0 }; }
    }
    async function callDeepSeek(q, keys) {
      const t0 = Date.now();
      if (!keys.deepseek) return { ok: false, text: "未設定 Key", ms: 0 };
      try {
        const r = await teddyFetch("https://api.deepseek.com/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${keys.deepseek}` },
          body: JSON.stringify({
            model: "deepseek-v4-flash",
            temperature: 0.7,
            messages: [
              { role: "system", content: getSystemPrompt() },
              { role: "user", content: q }
            ]
          }),
        }, 90000);
        const d = await r.json();
        if (!r.ok) throw new Error(d?.error?.message || `HTTP ${r.status}`);
        return { ok: true, text: d.choices[0].message.content, ms: Date.now() - t0 };
      } catch (e) { return { ok: false, text: `錯誤：${e.message}`, ms: Date.now() - t0 }; }
    }
    async function callGrok(q, keys, img, mime) {
      const t0 = Date.now();
      if (!keys.xai) return { ok: false, text: "未設定 Key", ms: 0 };
      try {
        const content = img
          ? [{ type: "image_url", image_url: { url: `data:${mime};base64,${img}`, detail: "high" } }, { type: "text", text: q }]
          : q;
        const r = await teddyFetch("https://api.x.ai/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${keys.xai}` },
          body: JSON.stringify({
            model: "grok-4.6",
            temperature: 0.7,
            messages: [
              { role: "system", content: getSystemPrompt() },
              { role: "user", content }
            ]
          }),
        }, 90000);
        const d = await r.json();
        if (!r.ok) throw new Error(d?.error?.message || `HTTP ${r.status}`);
        return { ok: true, text: d.choices[0].message.content, ms: Date.now() - t0 };
      } catch (e) { return { ok: false, text: `錯誤：${e.message}`, ms: Date.now() - t0 }; }
    }
    async function callSummarize(q, answers, keys) {
      const t0 = Date.now();
      if (!keys.xai && !keys.anthropic && !keys.openai) return { ok: false, text: "總結需要 Claude、OpenAI 或 Grok 其中一組 Key", ms: 0 };
      const names = { openai: "GPT-6.1 Sol", claude: "Claude", gemini: "Gemini", deepseek: "DeepSeek", grok: "Grok" };
      const parts = Object.entries(answers).map(([k, v]) =>
        `### ${names[k] || k}（${v?.ok ? "成功" : "失敗"}，${v?.ms ?? "-"}ms）\n${v?.text || "（無）"}`
      ).join("\n\n");
      const prompt = capacityMode
        ? `你是產能決策顧問。使用者問題：「${q || "（無）"}」

以下是五個 AI 對同一份產能資料的分析：
${parts}

請用繁體中文產出「產能總結對比報告」：
1. 五家共同指出的趨勢／瓶頸
2. 重要分歧
3. 最可信的結論（依資料）
4. 優先行動清單（3～5 項）
5. 一句話決策建議
不要編造資料中沒有的數字。`
        : `你是客觀的 AI 評測分析師。使用者問題：「${q || "（無）"}」

以下是五個 AI 的回覆：
${parts}

請用繁體中文產出精煉「總結對比報告」：
1. 共通觀點
2. 主要差異
3. 優劣亮點
4. 綜合建議
5. 一句話總結
保持客觀簡潔。`;
      // 8.6.2：總結先交給深度引擎（有 Claude 金鑰用 Sonnet 5.5，否則 GPT-6.1 Sol），失敗才用 Grok；每次最多等 90 秒
      let firstErr = "";
      if ((keys.anthropic || keys.openai) && typeof teddyDeepAsk === "function") {
        try {
          const out = await teddyDeepAsk("你是客觀的 AI 評測分析師，一律用繁體中文回答。", prompt, "medium");
          if (out && out.text) return { ok: true, text: out.text, ms: Date.now() - t0, by: out.label };
          firstErr = "沒有回覆";
        } catch (e) { firstErr = e.message; }
      }
      if (!keys.xai) return { ok: false, text: `總結失敗：${firstErr}`, ms: Date.now() - t0 };
      try {
        const r = await teddyFetch("https://api.x.ai/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${keys.xai}` },
          body: JSON.stringify({ model: "grok-4.6", messages: [{ role: "user", content: prompt }] }),
        }, 90000);
        const d = await r.json();
        if (!r.ok) throw new Error(d?.error?.message || `HTTP ${r.status}`);
        return { ok: true, text: d.choices[0].message.content, ms: Date.now() - t0, by: "Grok" };
      } catch (e) { return { ok: false, text: `總結失敗：${firstErr ? firstErr + "；Grok：" : ""}${e.message}`, ms: Date.now() - t0 }; }
    }

    document.getElementById("btnSettings").onclick = () => {
      const p = document.getElementById("settingsPanel");
      p.classList.toggle("open");
      if (p.classList.contains("open")) {
        const k = loadKeys();
        ["openai","anthropic","google","deepseek","xai"].forEach((n) => {
          document.getElementById("key_" + n).value = k[n] || "";
        });
      }
    };
    document.getElementById("btnSaveKeys").onclick = () => {
      saveKeys({
        openai: document.getElementById("key_openai").value.trim(),
        anthropic: document.getElementById("key_anthropic").value.trim(),
        google: document.getElementById("key_google").value.trim(),
        deepseek: document.getElementById("key_deepseek").value.trim(),
        xai: document.getElementById("key_xai").value.trim(),
      });
      updateKeyStatus();
      document.getElementById("settingsPanel").classList.remove("open");
    };
    document.getElementById("btnClearKeys").onclick = () => {
      if (!confirm("清除所有 Key？")) return;
      localStorage.removeItem("ai_obs_keys");
      updateKeyStatus();
    };

    document.getElementById("btnCapMode").onclick = () => {
      capacityMode = !capacityMode;
      document.getElementById("btnCapMode").classList.toggle("on", capacityMode);
      document.getElementById("capBar").classList.toggle("hidden", !capacityMode);
      if (capacityMode) {
        const ta = document.getElementById("question");
        if (!ta.value.trim()) ta.placeholder = "描述你的問題，或點上方快捷；並請上傳／貼上產能資料…";
      } else {
        document.getElementById("question").placeholder = "輸入你的問題……";
      }
    };
    document.querySelectorAll(".cap-chip").forEach((btn) => {
      btn.onclick = () => {
        const q = btn.getAttribute("data-q") || "";
        const ta = document.getElementById("question");
        ta.value = q;
        capacityMode = true;
        document.getElementById("btnCapMode").classList.add("on");
        document.getElementById("capBar").classList.remove("hidden");
      };
    });

    document.getElementById("btnFile").onclick = () => document.getElementById("fileInput").click();
    document.getElementById("fileInput").onchange = (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      imageBase64 = null; imageMime = null; fileText = "";
      const chip = document.getElementById("fileChip");
      const thumb = document.getElementById("thumb");
      const icon = document.getElementById("fileIcon");
      const label = document.getElementById("fileLabel");
      if (file.type.startsWith("image/")) {
        if (file.size > 4e6) { showError("圖片請 < 4MB"); return; }
        const reader = new FileReader();
        reader.onload = () => {
          thumb.src = reader.result; thumb.style.display = "block"; icon.style.display = "none";
          label.textContent = file.name; chip.classList.add("show");
          imageBase64 = reader.result.split(",")[1]; imageMime = file.type;
        };
        reader.readAsDataURL(file);
      } else {
        const reader = new FileReader();
        reader.onload = () => {
          fileText = String(reader.result || "");
          thumb.style.display = "none"; icon.style.display = "inline";
          label.textContent = file.name; chip.classList.add("show");
        };
        reader.readAsText(file, "UTF-8");
      }
    };
    document.getElementById("btnClearFile").onclick = () => {
      imageBase64 = null; imageMime = null; fileText = "";
      document.getElementById("fileChip").classList.remove("show");
      document.getElementById("fileInput").value = "";
    };

    (function () {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SR) return;
      recognition = new SR();
      recognition.lang = "zh-TW";
      recognition.interimResults = true;
      recognition.onresult = (ev) => {
        let t = "";
        for (let i = ev.resultIndex; i < ev.results.length; i++) t += ev.results[i][0].transcript;
        const ta = document.getElementById("question");
        ta.value = ta.value ? ta.value + " " + t : t;
      };
      recognition.onend = recognition.onerror = () => {
        listening = false;
        document.getElementById("btnMic").classList.remove("recording");
        document.getElementById("btnMic").textContent = "🎤";
      };
    })();
    document.getElementById("btnMic").onclick = () => {
      if (!recognition) { showError("此瀏覽器不支援語音（請用 Chrome）"); return; }
      if (listening) { recognition.stop(); return; }
      listening = true;
      document.getElementById("btnMic").classList.add("recording");
      document.getElementById("btnMic").textContent = "⏹";
      recognition.start();
    };

    document.getElementById("btnSubmit").onclick = async () => {
      let q = document.getElementById("question").value.trim();
      if (fileText.trim()) q = q ? q + "\n\n--- 附加檔案 ---\n" + fileText.trim() : fileText.trim();
      if (!q) { showError("請輸入問題"); return; }
      const keys = loadKeys();
      if (!Object.values(keys).some(Boolean)) { showError("請先設定至少一組 API Key"); return; }
      showError("");
      results = null;
      document.getElementById("summaryZone").classList.remove("show");
      document.getElementById("summaryCard").classList.remove("show");
      document.getElementById("btnSubmit").disabled = true;
      // 8.6.2：誰先回來就先顯示誰，不用等最慢的那一家
      const partial = { __pending: true };
      renderCards(partial);
      const jobs = { openai: callOpenAI(q, keys, imageBase64, imageMime), claude: callClaude(q, keys, imageBase64, imageMime), gemini: callGemini(q, keys, imageBase64, imageMime), deepseek: callDeepSeek(q, keys), grok: callGrok(q, keys, imageBase64, imageMime) };
      await Promise.all(Object.entries(jobs).map(([k, pr]) => pr.then(r => { partial[k] = r; const keep = document.getElementById("obsReader")?.classList.contains("show"); if (!keep) renderCards(partial); else obsLast = partial; })));
      const { openai, claude, gemini, deepseek, grok } = partial;
      results = { openai, claude, gemini, deepseek, grok };
      renderCards(results);
      document.getElementById("btnSubmit").disabled = false;
      document.getElementById("summaryZone").classList.add("show");
    };

    document.getElementById("btnSummary").onclick = async () => {
      if (!results) return;
      const btn = document.getElementById("btnSummary");
      btn.disabled = true; btn.textContent = "整理中…";
      const s = await callSummarize(document.getElementById("question").value.trim(), results, loadKeys());
      document.getElementById("summaryBody").innerHTML = obsMd(s.text);
      document.getElementById("summaryMs").textContent = s.ok ? `${s.ms}ms · ${s.by || "Grok"}` : "";
      document.getElementById("summaryCard").classList.add("show");
      btn.disabled = false; btn.textContent = "✦ 一鍵整理總結對比";
    };


    updateKeyStatus();
    renderCards(null);
  
