/* Smart Teddy 8.6.0 · js/invest.js：澎企理財（自選股、指標、盤後報告、週檢、雲端同步）
   載入順序：js/core.js → js/greenhouse.js → js/live.js → js/invest.js（一般 <script>，共用同一個全域範圍）。 */

// ===== Smart Teddy 8.6.0：澎企理財（一般模式・自選股即時畫面＋Teddy 分析）=====
// 原則：數字由程式讀證交所／FinMind 計算，Teddy 只負責解釋；不碰帳戶、不下單。
(() => {
  "use strict";
  const LS_CFG = "teddy_invest_cfg_v1", LS_CACHE = "teddy_invest_cache_v1";
  const DEFAULT_GROUPS = [
    { name: "自選1金融", items: ["合庫金", "玉山金", "兆豐金", "華南金", "第一金", "彰銀", "富邦金", "國泰金", "富邦越南", { name: "台新新光金", code: "2887" }] },
    { name: "散熱群組六", items: ["奇鋐", "雙鴻", "健策", "台達電", "建準"] },
    { name: "自選ETF群", items: ["元大台灣50", "元大高股息", "富邦台50", "國泰永續高股息", "國泰台灣領袖50", "富邦NASDAQ", "元大S&P500", "第一金太空衛星", "元大航太防衛科技", "台新標普500", "國泰費城半導體", "玉山全球藍籌100", "主動統一台股增長", "主動聯博動能50", "富邦恒生國企", "富邦未來車", "國泰智能電動車"] },
    { name: "自選AI群", items: ["佳能", "鴻海", "廣達", "台達電", "昇達科", "華通", "啟碁", "穩懋", "世芯-KY", "聯發科", "創意", "兆聯實業", "材料-KY", "家登", "衛司特", "台玻", "群創", "台積電", "同欣電", "耀登", "博弘", "日月光投控", "技嘉", "華邦電", "旺宏", "力成", "中砂", "崇越", "華立", "三福化", "勝一", "京鼎", "天虹"] },
    { name: "自選食品2", items: ["統一", "統一證", "統一超", "全家", "八方雲集", "台肥", "興農"] },
    { name: "自選3航太", items: ["雷虎", "漢翔", "長榮航太", "碳基", "中光電", "為升", "華通", "昇達科", "啟碁", "仲琦", "穩懋", "聯茂", "耀華", "奇鋐", "元晶"] },
    { name: "機器人群組", items: ["上銀", "達航科技", "直得", "台灣精銳", "和大", "宇隆", "崧騰"] }
  ];
  const ALIASES = { "台新新光金": ["台新金"], "材料-KY": ["材料*-KY"], "世芯-KY": ["世芯"] };

  const load = k => { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch (_) { return null; } };
  const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) {} };
  const itemObj = x => typeof x === "string" ? { name: x } : { ...x };
  let cfg = load(LS_CFG);
  if (!cfg || !Array.isArray(cfg.groups)) cfg = { groups: DEFAULT_GROUPS.map(g => ({ name: g.name, items: g.items.map(itemObj) })), active: 0, token: "" };
  let cache = load(LS_CACHE) || {};
  cache.daily = cache.daily || {}; cache.inst = cache.inst || {}; cache.eps = cache.eps || {};
  // ---- 8.3 雲端同步：共用自選（孫爸維護、家人唯讀）＋個人資料（持股、紀錄、個人群組）----
  const ENTRY = window.TEDDY_ENTRY_ID || "owner", IS_OWNER = ENTRY === "owner";
  const isLocked = g => !IS_OWNER && !!g?.shared;
  // 家人第一次打開：先用內建群組當「共用群組」佔位，同步後換成孫爸的最新版
  if (!IS_OWNER && !cfg.sharedAt && !cfg.groups.some(g => g.shared)) { cfg.groups = cfg.groups.map(g => ({ ...g, shared: true })); save(LS_CFG, cfg); }
  if (!cfg.cloudKey) { cfg.cloudKey = Math.random().toString(36).slice(2, 6).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase(); save(LS_CFG, cfg); }
  const CLOUD = "teddy_invest";
  const privDocId = () => "p_" + cfg.cloudKey;
  const fsdb = () => { try { return (typeof teddyEnsureFirebase === "function" && teddyEnsureFirebase() && window.firebase?.firestore) ? firebase.firestore() : null; } catch (_) { return null; } };
  const clean = o => JSON.parse(JSON.stringify(o));
  let cloudState = "", pushT = null;
  function schedulePush() { clearTimeout(pushT); pushT = setTimeout(pushCloud, 1500); }
  async function pushCloud() {
    const db = fsdb(); if (!db) { cloudState = "☁ 未連線"; return; }
    try {
      const now = Date.now();
      if (IS_OWNER && cfg.dirtyShared) {
        await db.collection(CLOUD).doc("shared_watchlist").set(clean({ groups: cfg.groups.map(g => ({ name: g.name, items: g.items.map(it => ({ name: it.name, ...(it.code ? { code: it.code } : {}) })) })), updatedAt: now, by: "A01" }));
        cfg.sharedAt = now; cfg.dirtyShared = false;
      }
      await db.collection(CLOUD).doc(privDocId()).set(clean({ pos: cfg.pos || {}, log: (cfg.log || []).slice(0, 60), weekly: (cfg.weekly || []).slice(0, 8).map(w => window.__wkEnc ? window.__wkEnc(w) : w), myGroups: IS_OWNER ? [] : cfg.groups.filter(g => !g.shared).map(g => ({ name: g.name, items: g.items })), updatedAt: now, entry: ENTRY }));
      cfg.privAt = now; save(LS_CFG, cfg);
      cloudState = "☁ 已同步 " + new Date().toLocaleTimeString("zh-TW", { hour12: false }).slice(0, 5);
    } catch (e) { cloudState = "☁ 同步失敗：" + e.message; }
    try { render(); } catch (_) {}
  }
  async function pullCloud() {
    const db = fsdb(); if (!db) { cloudState = "☁ 未連線"; return; }
    try {
      const [sh, me] = await Promise.all([db.collection(CLOUD).doc("shared_watchlist").get(), db.collection(CLOUD).doc(privDocId()).get()]);
      let changed = false;
      if (sh.exists) {
        const d = sh.data() || {}, groups = Array.isArray(d.groups) ? d.groups : [];
        if (IS_OWNER) { if (!cfg.dirtyShared && (d.updatedAt || 0) > (cfg.sharedAt || 0) && groups.length) { cfg.groups = groups.map(g => ({ name: g.name, items: g.items.map(itemObj) })); cfg.sharedAt = d.updatedAt; changed = true; } }
        else if (groups.length && (d.updatedAt || 0) !== (cfg.sharedAt || 0)) { cfg.groups = groups.map(g => ({ name: g.name, shared: true, items: g.items.map(itemObj) })).concat(cfg.groups.filter(g => !g.shared)); cfg.sharedAt = d.updatedAt; changed = true; }
      } else if (IS_OWNER) { cfg.dirtyShared = true; schedulePush(); }      // 第一次：把孫爸手機上的自選上傳成共用版
      if (me.exists) {
        const d = me.data() || {};
        if ((d.updatedAt || 0) > (cfg.privAt || 0)) {
          cfg.pos = d.pos || cfg.pos; cfg.log = d.log || cfg.log; if (Array.isArray(d.weekly)) { const mp = {}; for (const w of (cfg.weekly || []).concat(d.weekly.map(w => window.__wkDec ? window.__wkDec(w) : w))) if (w && w.wk && (!mp[w.wk] || (w.at || 0) > (mp[w.wk].at || 0))) mp[w.wk] = w; cfg.weekly = Object.values(mp).sort((a, b) => a.wk < b.wk ? 1 : -1).slice(0, 10); }
          if (!IS_OWNER && Array.isArray(d.myGroups)) cfg.groups = cfg.groups.filter(g => g.shared).concat(d.myGroups.map(g => ({ name: g.name, items: (g.items || []).map(itemObj) })));
          cfg.privAt = d.updatedAt; changed = true;
        }
      }
      if (cfg.active >= cfg.groups.length) cfg.active = 0;
      save(LS_CFG, cfg);
      cloudState = "☁ 已同步 " + new Date().toLocaleTimeString("zh-TW", { hour12: false }).slice(0, 5);
      if (changed) { try { fillGroups(); render(); } catch (_) {} }
    } catch (e) { cloudState = "☁ 同步失敗：" + e.message; }
    try { render(); } catch (_) {}
  }
  const saveCfg = () => { save(LS_CFG, cfg); schedulePush(); };
  const saveShared = () => { if (IS_OWNER) cfg.dirtyShared = true; saveCfg(); };
  // 手機儲存空間有限：存不下就先縮短日K／本益比歷史，再不行就只留基本資料。
  const saveCache = () => {
    const tryW = () => { try { localStorage.setItem(LS_CACHE, JSON.stringify(cache)); return true; } catch (_) { return false; } };
    if (tryW()) return;
    Object.values(cache.daily || {}).forEach(x => { if (x.rows) x.rows = x.rows.slice(-130); });
    Object.values(cache.per || {}).forEach(x => { if (x.rows) x.rows = x.rows.slice(-120); });
    if (tryW()) return;
    cache.per = {}; cache.rev = {}; cache.mg = {}; tryW();
  };
  let rt = {}, rtAt = null, rtSrc = "", busy = false, pollTimer = null, lastErr = "", progress = "";

  // ---------- 工具 ----------
  const norm = s => String(s || "").replace(/[\s*＊]/g, "").replace(/[！-～]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xfee0)).toUpperCase();
  const tpNow = () => { const d = new Date(); return new Date(d.getTime() + (480 + d.getTimezoneOffset()) * 60000); };
  const ymd = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const daysAgo = n => { const d = tpNow(); d.setDate(d.getDate() - n); return ymd(d); };
  const fmt = (v, dp = 2) => v == null || !isFinite(v) ? "—" : Number(v).toLocaleString("en-US", { minimumFractionDigits: dp, maximumFractionDigits: dp });
  const fmtInt = v => v == null || !isFinite(v) ? "—" : (v > 0 ? "+" : "") + Math.round(v).toLocaleString("en-US");
  const isMarketTime = () => { const t = tpNow(), w = t.getDay(), m = t.getHours() * 60 + t.getMinutes(); return w >= 1 && w <= 5 && m >= 539 && m <= 816; };
  // 收盤後資料（日K、法人）在台北時間 hh 點以後才算「今天的」；之前抓的要重抓。
  const stale = (ts, hh) => { if (!ts) return true; const now = tpNow(), f = new Date(ts + (480 + new Date(ts).getTimezoneOffset()) * 60000), fh = f.getHours(), nh = now.getHours(); if (ymd(f) === ymd(now)) return fh < hh && nh >= hh; return nh >= hh || fh < hh || (Date.now() - ts) > 36 * 3600e3; };
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  // 8.1：資料錯誤登記簿——哪一項讀不到、原因是什麼，點狀態列就能看
  const DS_LABEL = { TaiwanStockInfo: "代號對照", TaiwanStockPrice: "日K", TaiwanStockInstitutionalInvestorsBuySell: "個股法人", TaiwanStockFinancialStatements: "財報EPS", TaiwanStockPER: "本益比", TaiwanStockMonthRevenue: "月營收", TaiwanStockMarginPurchaseShortSale: "個股融資券", TaiwanStockShareholding: "外資持股", TaiwanStockDividend: "股利", TaiwanStockTotalInstitutionalInvestors: "大盤法人", TaiwanStockTotalMarginPurchaseShortSale: "大盤融資", TaiwanFuturesInstitutionalInvestors: "期貨外資", rt: "即時行情", rank: "法人排行", yh: "走勢圖", ver: "api 版本" };
  const errs = {};
  const errKey = p => DS_LABEL[p.dataset] || DS_LABEL[p.type] || p.dataset || p.type;
  async function api(params) {
    const key = errKey(params);
    try { const j = await apiRaw(params); delete errs[key]; return j; }
    catch (e) { errs[key] = { msg: String(e.message || e).slice(0, 160), at: Date.now() }; throw e; }
  }
  async function apiRaw(params) {
    const qs = new URLSearchParams(params);
    const headers = cfg.token ? { "x-finmind-token": cfg.token } : {};
    let err = null, answered = false;
    try {
      const r = await fetch("/api/stock?" + qs, { headers });
      const ct = r.headers.get("content-type") || "";
      if (/json/.test(ct)) {
        answered = true;
        const j = await r.json().catch(() => ({}));
        if (r.ok && j.ok !== false) return j;
        const m = j.error || j.msg || ("HTTP " + r.status);
        err = new Error(/不支援的資料集|type 必須是 rt/.test(m) ? "網站上的 api/stock.js 是舊版，請更新到 8.1 版" : m);
      } else err = new Error(r.status === 404 ? "還沒部署 api/stock.js" : "HTTP " + r.status);
    } catch (e) { err = e; }
    if (!answered && params.type === "fm") { // 只有轉接站完全連不到時，才直接連 FinMind
      const p = new URLSearchParams(params); p.delete("type");
      let r;
      try { r = await fetch("https://api.finmindtrade.com/api/v4/data?" + p, { headers: cfg.token ? { Authorization: "Bearer " + cfg.token } : {} }); }
      catch (_) { throw new Error("轉接站與 FinMind 都連不到"); }
      const d = await r.json();
      if (d.status && d.status !== 200) throw new Error("FinMind：" + (d.msg || "錯誤"));
      return { ok: true, data: d.data || [] };
    }
    throw err;
  }

  // ---------- 代號對照（名稱 → 代號／上市櫃） ----------
  let infoJob = null;
  function ensureInfo() { if (!infoJob) infoJob = ensureInfoInner().finally(() => { infoJob = null; }); return infoJob; }
  async function ensureInfoInner() {
    if (cache.info && Date.now() - cache.info.ts < 7 * 864e5 && Object.keys(cache.info.map || {}).length > 500) return cache.info;
    const j = await api({ type: "fm", dataset: "TaiwanStockInfo" });
    const map = {}, byCode = {};
    for (const r of j.data || []) {
      const code = String(r.stock_id || ""); if (!/^[0-9]{4,6}[A-Z]?$/.test(code)) continue;
      const type = r.type === "tpex" ? "tpex" : (r.type === "twse" ? "twse" : (r.type || "other"));
      const n = norm(r.stock_name);
      const prev = map[n];
      if (!prev || (prev[1] !== "twse" && prev[1] !== "tpex")) map[n] = [code, type, r.stock_name];
      if (!byCode[code] || byCode[code][1] === "other") byCode[code] = [r.stock_name, type, r.industry_category || ""];
    }
    cache.info = { ts: Date.now(), map, byCode }; saveCache();
    return cache.info;
  }
  function resolve(item) {
    const info = cache.info; if (!info) return null;
    if (item.code) { const b = info.byCode[item.code]; return { code: item.code, type: b ? b[1] : (item.type || "twse"), name: item.name || (b && b[0]) || item.code, industry: b ? b[2] : "" }; }
    const n = norm(item.name);
    const tryKeys = [n, ...(ALIASES[item.name] || []).map(norm)];
    for (const k of tryKeys) { const m = info.map[k]; if (m) return { code: m[0], type: m[1], name: item.name, industry: (info.byCode[m[0]] || [])[2] || "" }; }
    const cands = Object.keys(info.map).filter(k => k.startsWith(n) || (n.startsWith(k) && k.length >= 3) || k.includes(n)).sort((a, b) => a.length - b.length);
    if (cands.length) { const m = info.map[cands[0]]; return { code: m[0], type: m[1], name: item.name, fuzzy: m[2], industry: (info.byCode[m[0]] || [])[2] || "" }; }
    return null;
  }
  const groupItems = g => (g?.items || []).map(it => ({ it, r: resolve(it) }));

  // ---------- 資料：即時、日K、法人、EPS ----------
  async function loadRealtime(list) {
    const ok = list.filter(x => x.r && (x.r.type === "twse" || x.r.type === "tpex"));
    if (!ok.length) return;
    const ex = [...new Set(ok.map(x => `${x.r.type === "tpex" ? "otc" : "tse"}_${x.r.code}.tw`))].join("|");
    const j = await api({ type: "rt", ex });
    for (const q of j.quotes || []) rt[q.code] = q;
    rtAt = j.at || new Date().toISOString(); rtSrc = (j.quotes || [])[0]?.src || "";
  }
  // 資料版本：v2 起日K存一年（算 52 週、MACD、KD），財報多存營收／毛利／營益。
  const DV = 2;
  async function loadDaily(code) {
    const c0 = cache.daily[code];
    if (c0 && c0.v === DV && !stale(c0.ts, 15)) return;
    const j = await api({ type: "fm", dataset: "TaiwanStockPrice", data_id: code, start_date: daysAgo(400) });
    const rows = (j.data || []).map(r => [r.date, +r.open, +r.max, +r.min, +r.close, Math.round((+r.Trading_Volume || 0) / 1000), +r.Trading_money || 0]).filter(r => r[4] > 0);
    cache.daily[code] = { v: DV, ts: Date.now(), rows: rows.slice(-260) };
  }
  async function loadInst(code) {
    const c0 = cache.inst[code];
    if (c0 && c0.v === DV && !stale(c0.ts, 17)) return;
    const j = await api({ type: "fm", dataset: "TaiwanStockInstitutionalInvestorsBuySell", data_id: code, start_date: daysAgo(45) });
    const by = {};
    for (const r of j.data || []) {
      const d = by[r.date] || (by[r.date] = [r.date, 0, 0, 0]);
      const net = ((+r.buy || 0) - (+r.sell || 0)) / 1000;
      if (/^Foreign/i.test(r.name)) d[1] += net; else if (/Investment_Trust/i.test(r.name)) d[2] += net; else if (/^Dealer/i.test(r.name)) d[3] += net;
    }
    cache.inst[code] = { v: DV, ts: Date.now(), rows: Object.values(by).sort((a, b) => a[0] < b[0] ? -1 : 1).slice(-25) };
  }
  async function loadEps(code) {
    if (/^00/.test(code)) return;
    const c0 = cache.eps[code];
    if (c0 && c0.v === DV && Date.now() - c0.ts < 5 * 864e5) return;
    const j = await api({ type: "fm", dataset: "TaiwanStockFinancialStatements", data_id: code, start_date: daysAgo(1000) });
    const by = {};
    for (const r of j.data || []) {
      if (!/^(EPS|Revenue|GrossProfit|OperatingIncome)$/.test(r.type)) continue;
      (by[r.date] || (by[r.date] = { d: r.date }))[r.type] = +r.value;
    }
    const qs = Object.values(by).sort((a, b) => a.d < b.d ? -1 : 1).slice(-10);
    cache.eps[code] = { v: DV, ts: Date.now(), q: qs.filter(x => x.EPS != null).map(x => [x.d, x.EPS]).slice(-8), fin: qs };
  }
  // 深入資料（打開單檔或請 Teddy 分析時才讀）：本益比／淨值比／殖利率、月營收、融資融券
  cache.per = cache.per || {}; cache.rev = cache.rev || {}; cache.mg = cache.mg || {};
  async function loadPER(code) {
    if (/^00/.test(code)) return;
    if (cache.per[code] && !stale(cache.per[code].ts, 18)) return;
    const j = await api({ type: "fm", dataset: "TaiwanStockPER", data_id: code, start_date: daysAgo(370) });
    cache.per[code] = { ts: Date.now(), rows: (j.data || []).map(r => [r.date, +r.PER || 0, +r.PBR || 0, +r.dividend_yield || 0]).slice(-250) };
  }
  async function loadRev(code) {
    if (/^00/.test(code)) return;
    if (cache.rev[code] && Date.now() - cache.rev[code].ts < 20 * 3600e3) return;
    const j = await api({ type: "fm", dataset: "TaiwanStockMonthRevenue", data_id: code, start_date: daysAgo(800) });
    const m = {};
    for (const r of j.data || []) { const y = +r.revenue_year, mo = +r.revenue_month; if (y && mo) m[`${y}-${String(mo).padStart(2, "0")}`] = +r.revenue; }
    cache.rev[code] = { ts: Date.now(), rows: Object.entries(m).sort((a, b) => a[0] < b[0] ? -1 : 1).slice(-26) };
  }
  async function loadMargin(code) {
    if (cache.mg[code] && !stale(cache.mg[code].ts, 21)) return;
    const j = await api({ type: "fm", dataset: "TaiwanStockMarginPurchaseShortSale", data_id: code, start_date: daysAgo(40) });
    cache.mg[code] = { ts: Date.now(), rows: (j.data || []).map(r => [r.date, +r.MarginPurchaseTodayBalance || 0, +r.ShortSaleTodayBalance || 0]).slice(-20) };
  }
  cache.hold = cache.hold || {}; cache.div = cache.div || {}; cache.mkt = cache.mkt || {};
  cfg.pos = cfg.pos || {}; cfg.log = cfg.log || [];
  async function loadHold(code) {
    if (cache.hold[code] && !stale(cache.hold[code].ts, 18)) return;
    const j = await api({ type: "fm", dataset: "TaiwanStockShareholding", data_id: code, start_date: daysAgo(45) });
    cache.hold[code] = { ts: Date.now(), rows: (j.data || []).map(r => [r.date, +r.ForeignInvestmentSharesRatio]).filter(r => isFinite(r[1])).slice(-30) };
  }
  async function loadDiv(code) {
    if (cache.div[code] && Date.now() - cache.div[code].ts < 3 * 864e5) return;
    const j = await api({ type: "fm", dataset: "TaiwanStockDividend", data_id: code, start_date: daysAgo(2400) });
    const rows = (j.data || []).map(r => ({ y: String(r.year || ""), cash: (+r.CashEarningsDistribution || 0) + (+r.CashStatutorySurplus || 0), stock: (+r.StockEarningsDistribution || 0) + (+r.StockStatutorySurplus || 0), ex: String(r.CashExDividendTradingDate || r.StockExDividendTradingDate || "").slice(0, 10) }));
    cache.div[code] = { ts: Date.now(), rows: rows.slice(-24) };
  }
  // 大盤：加權指數日K、三大法人總金額、融資餘額、台指期外資未平倉、即時指數
  async function loadBench() {
    const b = cache.mkt.bench;
    if (b && !stale(b.ts, 15)) return;
    const j = await api({ type: "fm", dataset: "TaiwanStockPrice", data_id: "TAIEX", start_date: daysAgo(400) });
    const rows = (j.data || []).map(r => [r.date, +r.close, +r.max, +r.min]).filter(r => r[1] > 0);
    if (rows.length) cache.mkt.bench = { ts: Date.now(), rows: rows.slice(-260) };
  }
  let mktJob = null;
  function loadMarket() { if (!mktJob) mktJob = loadMarketInner().finally(() => { mktJob = null; }); return mktJob; }
  async function loadMarketInner() {
    const M = cache.mkt, jobs = [], ST = M.status = {};
    const mark = (k, ok) => { ST[k] = ok; };
    jobs.push(loadBench().then(() => mark("加權日K", !!M.bench)).catch(e => { mark("加權日K", false); lastErr = "大盤：" + e.message; }));
    if (!M.inst || !M.inst.v2 || stale(M.inst.ts, 16)) jobs.push(api({ type: "fm", dataset: "TaiwanStockTotalInstitutionalInvestors", start_date: daysAgo(16) }).then(j => {
      const by = {}, seen = new Set();
      for (const r of j.data || []) {
        const key = r.date + "|" + r.name; if (seen.has(key)) continue; seen.add(key);   // 同一天同一類只算一次
        const d = by[r.date] || (by[r.date] = { d: r.date, f: 0, t: 0, s: 0, fb: 0, fs: 0 }); const net = ((+r.buy || 0) - (+r.sell || 0)) / 1e8;
        if (/^Foreign/i.test(r.name)) { d.f += net; d.fb += (+r.buy || 0) / 1e8; d.fs += (+r.sell || 0) / 1e8; } else if (/^Investment_Trust$/i.test(r.name)) d.t += net; else if (/^Dealer(_self|_Hedging)?$/i.test(r.name)) d.s += net;
      }
      const rows = Object.values(by).sort((a, b) => a.d < b.d ? -1 : 1).slice(-10); if (rows.length) M.inst = { ts: Date.now(), rows, v2: true }; mark("法人金額", rows.length > 0);
    }).catch(() => mark("法人金額", false))); else mark("法人金額", true);
    if (!M.margin || stale(M.margin.ts, 21)) jobs.push(api({ type: "fm", dataset: "TaiwanStockTotalMarginPurchaseShortSale", start_date: daysAgo(16) }).then(j => {
      const rows = (j.data || []).filter(r => r.name === "MarginPurchaseMoney").map(r => [r.date, +r.TodayBalance || 0, +r.YesBalance || 0]).filter(r => r[1] > 0);
      if (rows.length) M.margin = { ts: Date.now(), rows: rows.slice(-10) }; mark("融資餘額", rows.length > 0);
    }).catch(() => mark("融資餘額", false))); else mark("融資餘額", true);
    if (!M.fut || stale(M.fut.ts, 16)) jobs.push(api({ type: "fm", dataset: "TaiwanFuturesInstitutionalInvestors", data_id: "TX", start_date: daysAgo(16) }).then(j => {
      const rows = (j.data || []).filter(r => /外資/.test(String(r.institutional_investors || r.name || ""))).map(r => [r.date, (+r.long_open_interest_balance_volume || 0) - (+r.short_open_interest_balance_volume || 0)]);
      if (rows.length) M.fut = { ts: Date.now(), rows: rows.slice(-10) }; mark("期貨外資", rows.length > 0);
    }).catch(() => mark("期貨外資", false))); else mark("期貨外資", true);
    jobs.push(api({ type: "rt", ex: "tse_t00.tw|otc_o00.tw" }).then(j => { const qs = j.quotes || []; mark("即時指數", qs.some(q => q.code === "t00" && q.price != null)); mark("櫃買指數", qs.some(q => q.code === "o00" && q.price != null)); for (const q of qs) M["rt_" + q.code] = q; M.rtAt = j.at; }).catch(() => { mark("即時指數", false); mark("櫃買指數", false); }));
    await Promise.all(jobs); saveCache();
  }
  async function loadDeep(codes) {
    let i = 0;
    const worker = async () => { while (i < codes.length) { const c = codes[i++];
      for (const f of [loadDaily, loadInst, loadEps, loadPER, loadRev, loadMargin, loadHold, loadDiv]) { try { await f(c); } catch (e) { lastErr = "資料：" + e.message; } } } };
    await Promise.all([worker(), worker(), worker(), loadBench().catch(() => {})]);
    saveCache();
  }
  async function loadDetails(list, onStep) {
    const codes = [...new Set(list.filter(x => x.r).map(x => x.r.code))];
    let done = 0, i = 0;
    const worker = async () => {
      while (i < codes.length) {
        const c = codes[i++];
        try { await loadDaily(c); } catch (e) { lastErr = "日K：" + e.message; }
        try { await loadInst(c); } catch (e) { lastErr = "法人：" + e.message; }
        try { await loadEps(c); } catch (e) { lastErr = "EPS：" + e.message; }
        done++; onStep && onStep(done, codes.length);
      }
    };
    await Promise.all([worker(), worker(), worker()]);
    saveCache();
  }

  // ---------- 指標（標準公式，全部由程式計算） ----------
  const avg = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : null;
  const emaArr = (a, n) => { const k = 2 / (n + 1); let e = null; return a.map(v => (e = e == null ? v : v * k + e * (1 - k))); };
  function rsi(c, n = 14) {
    if (c.length < n + 1) return null;
    let g = 0, l = 0;
    for (let i = 1; i <= n; i++) { const d = c[i] - c[i - 1]; if (d > 0) g += d; else l -= d; }
    g /= n; l /= n;
    for (let i = n + 1; i < c.length; i++) { const d = c[i] - c[i - 1]; g = (g * (n - 1) + Math.max(d, 0)) / n; l = (l * (n - 1) + Math.max(-d, 0)) / n; }
    return l === 0 ? 100 : 100 - 100 / (1 + g / l);
  }
  function kdCalc(h, l, c, n = 9) { // 台灣常用 KD(9,3,3)
    if (c.length < n) return null;
    let K = 50, D = 50, pK = 50, pD = 50;
    for (let i = n - 1; i < c.length; i++) {
      const hh = Math.max(...h.slice(i - n + 1, i + 1)), ll = Math.min(...l.slice(i - n + 1, i + 1));
      const rsv = hh === ll ? 50 : (c[i] - ll) / (hh - ll) * 100;
      pK = K; pD = D; K = K * 2 / 3 + rsv / 3; D = D * 2 / 3 + K / 3;
    }
    return { K, D, cross: pK <= pD && K > D ? "黃金交叉" : (pK >= pD && K < D ? "死亡交叉" : "") };
  }
  function macdCalc(c) { // MACD(12,26,9)
    if (c.length < 40) return null;
    const e12 = emaArr(c, 12), e26 = emaArr(c, 26), dif = c.map((_, i) => e12[i] - e26[i]), sig = emaArr(dif, 9), n = c.length - 1;
    return { dif: dif[n], dea: sig[n], hist: dif[n] - sig[n], prevHist: dif[n - 1] - sig[n - 1] };
  }
  const pctOf = (a, b) => a != null && b ? (a / b - 1) * 100 : null;

  // ---------- 計算（只用讀到的資料，算不出就是「—」） ----------
  function metrics(code) {
    const q = rt[code] || null, d = cache.daily[code]?.rows || [], inst = cache.inst[code]?.rows || [], eps = cache.eps[code]?.q || [];
    const lastD = d[d.length - 1], prevD = d[d.length - 2];
    let price = q?.price ?? lastD?.[4] ?? null, prev = q?.prev ?? (q ? null : prevD?.[4]) ?? null;
    const today = ymd(tpNow());
    const qToday = q?.price != null && q.date && q.date.replace(/(\d{4})(\d{2})(\d{2})/, "$1-$2-$3") === today;
    const addToday = qToday && lastD && lastD[0] !== today;
    // 盤中把即時價當成今天一根；收盤後日K已含今天就直接用
    const C = d.map(r => r[4]).concat(addToday ? [q.price] : []);
    const H = d.map(r => r[2]).concat(addToday ? [q.high ?? q.price] : []);
    const L = d.map(r => r[3]).concat(addToday ? [q.low ?? q.price] : []);
    const ma = (n, back = 0) => C.length >= n + back ? avg(C.slice(C.length - n - back, C.length - back)) : null;
    const chg = price != null && prev ? price - prev : null;
    const pct = chg != null && prev ? chg / prev * 100 : null;
    const vwap = lastD && lastD[5] > 0 ? lastD[6] / (lastD[5] * 1000) : null;
    const instLast = inst[inst.length - 1] || null;
    const sumN = (k, n) => inst.length ? inst.slice(-n).reduce((a, r) => a + r[k], 0) : null;
    let streak = 0; for (let k = inst.length - 1; k >= 0; k--) { const v = inst[k][1]; if (!v) break; if (streak === 0) streak = v > 0 ? 1 : -1; else if ((v > 0) === (streak > 0)) streak += streak > 0 ? 1 : -1; else break; }
    const eps4 = eps.length >= 4 ? eps.slice(-4).reduce((a, r) => a + r[1], 0) : null;
    const epsPrev4 = eps.length >= 8 ? eps.slice(-8, -4).reduce((a, r) => a + r[1], 0) : null;
    const lastEps = eps[eps.length - 1] || null;
    const qLabel = s => { if (!s) return ""; const [y, m] = s.split("-"); return `${y}Q${Math.ceil(+m / 3)}`; };
    // 量能：今日量 ÷ 前5日均量（盤中依已開盤時間估全日量）
    // 盤中：今日量 vs 前5日；非盤中：最近一天 vs 它前面5天
    const prevVols = (qToday ? d.filter(r => r[0] !== today) : d.slice(0, -1)).map(r => r[5]);
    const avg5v = prevVols.length >= 5 ? avg(prevVols.slice(-5)) : null;
    let volToday = qToday ? q.vol : (lastD ? lastD[5] : null), volEst = volToday;
    if (qToday && isMarketTime() && volToday != null) { const t = tpNow(), mins = t.getHours() * 60 + t.getMinutes() - 540; volEst = volToday / Math.min(1, Math.max(0.08, mins / 270)); }
    const ma20 = ma(20), ma60 = ma(60), ma20prev = ma(20, 5);
    const hi52 = H.length ? Math.max(...H.slice(-250)) : null, lo52 = L.length ? Math.min(...L.slice(-250)) : null;
    let trend = "—";
    if (price != null && ma20 && ma60 && ma20prev) {
      const up = ma20 > ma20prev;
      trend = price > ma20 && ma20 > ma60 && up ? "多頭排列（價>月線>季線，月線上彎）" : (price < ma20 && ma20 < ma60 && !up ? "空頭排列（價<月線<季線，月線下彎）" : `整理（月線${up ? "上彎" : "下彎"}）`);
    }
    // 基本面
    const fin = cache.eps[code]?.fin || [];
    const fq = fin[fin.length - 1] || null;
    const fqYA = fq ? fin.find(x => x.d === `${+fq.d.slice(0, 4) - 1}${fq.d.slice(4)}`) : null;
    const gm = x => x && x.Revenue ? x.GrossProfit / x.Revenue * 100 : null, om = x => x && x.Revenue ? x.OperatingIncome / x.Revenue * 100 : null;
    const rev = cache.rev[code]?.rows || [];
    const rv = Object.fromEntries(rev), lastRev = rev[rev.length - 1] || null;
    const ymBack = (ym, k) => { let [y, m] = ym.split("-").map(Number); m -= k; while (m <= 0) { m += 12; y--; } return `${y}-${String(m).padStart(2, "0")}`; };
    let revYoY = null, revMoM = null, rev3YoY = null, revCumYoY = null;
    if (lastRev) {
      const ym = lastRev[0];
      revYoY = pctOf(rv[ym], rv[ymBack(ym, 12)]); revMoM = pctOf(rv[ym], rv[ymBack(ym, 1)]);
      const s3 = [0, 1, 2].map(k => rv[ymBack(ym, k)]), s3p = [0, 1, 2].map(k => rv[ymBack(ym, k + 12)]);
      if (s3.every(Boolean) && s3p.every(Boolean)) rev3YoY = pctOf(s3.reduce((a, b) => a + b), s3p.reduce((a, b) => a + b));
      const mo = +ym.slice(5), cy = [], py = [];
      for (let k = 0; k < mo; k++) { cy.push(rv[ymBack(ym, k)]); py.push(rv[ymBack(ym, k + 12)]); }
      if (cy.every(Boolean) && py.every(Boolean)) revCumYoY = pctOf(cy.reduce((a, b) => a + b), py.reduce((a, b) => a + b));
    }
    const per = cache.per[code]?.rows || [], perLast = per[per.length - 1] || null;
    const pers = per.map(r => r[1]).filter(v => v > 0);
    const perPct = perLast && perLast[1] > 0 && pers.length > 50 ? pers.filter(v => v <= perLast[1]).length / pers.length * 100 : null;
    const mg = cache.mg[code]?.rows || [], mgLast = mg[mg.length - 1] || null, mg5 = mg.length >= 6 ? mg[mg.length - 6] : null;
    const k = kdCalc(H, L, C), mc = macdCalc(C);
    // ---- 8.0 進階：報酬與相對大盤、波動、ATR、布林、支撐壓力、新高新低、均線穿越 ----
    const retN = n => C.length > n ? pctOf(C[C.length - 1], C[C.length - 1 - n]) : null;
    const B = (cache.mkt?.bench?.rows || []).map(r => r[1]);
    const bRet = n => B.length > n ? pctOf(B[B.length - 1], B[B.length - 1 - n]) : null;
    const yIdx = d.findIndex(r => r[0].slice(0, 4) === today.slice(0, 4));
    const ytd = yIdx > 0 ? pctOf(price, d[yIdx - 1][4]) : null;
    const lr = C.slice(-21).map((v, i, a) => i ? Math.log(v / a[i - 1]) : null).filter(v => v != null && isFinite(v));
    const vol20 = lr.length >= 15 ? Math.sqrt(Math.max(0, avg(lr.map(x => x * x)) - avg(lr) ** 2)) * Math.sqrt(252) * 100 : null;
    let atr = null;
    if (C.length > 15) { const tr = []; for (let i = C.length - 14; i < C.length; i++) tr.push(Math.max(H[i] - L[i], Math.abs(H[i] - C[i - 1]), Math.abs(L[i] - C[i - 1]))); atr = avg(tr); }
    let bbU = null, bbL = null, bbB = null;
    if (C.length >= 20) { const w = C.slice(-20), mu = avg(w), sd = Math.sqrt(avg(w.map(x => (x - mu) ** 2))); bbU = mu + 2 * sd; bbL = mu - 2 * sd; bbB = sd && price != null ? (price - bbL) / (bbU - bbL) * 100 : null; }
    const hi20 = H.length >= 21 ? Math.max(...H.slice(-21, -1)) : null, lo20 = L.length >= 21 ? Math.min(...L.slice(-21, -1)) : null;
    const prevHi52 = H.length > 20 ? Math.max(...H.slice(-251, -1)) : null, prevLo52 = L.length > 20 ? Math.min(...L.slice(-251, -1)) : null;
    const newHi52 = price != null && prevHi52 != null && price > prevHi52, newLo52 = price != null && prevLo52 != null && price < prevLo52;
    const ma20y = C.length >= 21 ? avg(C.slice(-21, -1)) : null, cy = C.length >= 2 ? C[C.length - 2] : null;
    const crossDown20 = !!(cy != null && ma20y && price != null && ma20 && cy >= ma20y && price < ma20);
    const crossUp20 = !!(cy != null && ma20y && price != null && ma20 && cy < ma20y && price >= ma20);
    const revVals = rev.map(r => r[1]);
    const revHi12 = !!(lastRev && revVals.length >= 12 && lastRev[1] >= Math.max(...revVals.slice(-12)));
    const revHiAll = !!(lastRev && revVals.length >= 20 && lastRev[1] >= Math.max(...revVals));
    const prevRevYoY = rev.length >= 2 ? pctOf(rv[rev[rev.length - 2][0]], rv[ymBack(rev[rev.length - 2][0], 12)]) : null;
    const pbrV = perLast && perLast[2] > 0 ? perLast[2] : null, bps = pbrV && price ? price / pbrV : null;
    const roe = eps4 != null && bps ? eps4 / bps * 100 : null;
    const hold = cache.hold[code]?.rows || [], hl = hold[hold.length - 1] || null, h20 = hold.length >= 2 ? hold[Math.max(0, hold.length - 20)] : null;
    const divs = cache.div[code]?.rows || [], y1 = daysAgo(365);
    const cash12 = divs.filter(x => x.ex && x.ex >= y1 && x.ex <= today).reduce((a, x) => a + x.cash, 0);
    const yrs = [...new Set(divs.filter(x => x.cash > 0).map(x => parseInt(x.y)).filter(Boolean))].sort((a, b) => b - a);
    let divYears = 0; for (let i = 0; i < yrs.length; i++) { if (i === 0 || yrs[i - 1] - yrs[i] === 1) divYears++; else break; }
    const nextDiv = divs.filter(x => x.ex && x.ex > today && x.cash > 0).sort((a, b) => a.ex < b.ex ? -1 : 1)[0] || null;
    const pos = cfg.pos?.[code] && cfg.pos[code].shares > 0 ? cfg.pos[code] : null;
    const posM = pos && price != null ? { cost: pos.cost, shares: pos.shares, mv: price * pos.shares, pnl: pos.cost ? (price - pos.cost) * pos.shares : null, pnlPct: pos.cost ? pctOf(price, pos.cost) : null } : (pos ? { cost: pos.cost, shares: pos.shares } : null);
    return {
      price, prev, chg, pct, open: q?.open ?? lastD?.[1], high: q?.high ?? lastD?.[2], low: q?.low ?? lastD?.[3], vol: q?.vol ?? lastD?.[5],
      limitUp: q?.limitUp, limitDown: q?.limitDown, time: q?.time, live: !!q,
      ma5: ma(5), ma20, ma60, ma20prev, vwap, vwapDate: lastD?.[0], dataDate: addToday ? today : lastD?.[0],
      bias20: pctOf(price, ma20), bias60: pctOf(price, ma60), trend,
      rsi14: rsi(C), K: k?.K ?? null, D: k?.D ?? null, kdCross: k?.cross || "", macd: mc,
      volRatio: volEst != null && avg5v ? volEst / avg5v : null, volEstimated: qToday && isMarketTime(), avg5v,
      hi52, lo52, fromHi: pctOf(price, hi52), fromLo: pctOf(price, lo52), days: C.length,
      fToday: instLast ? instLast[1] : null, tToday: instLast ? instLast[2] : null, dToday: instLast ? instLast[3] : null, instDate: instLast?.[0],
      f5: sumN(1, 5), t5: sumN(2, 5), d5: sumN(3, 5), f20: inst.length >= 20 ? sumN(1, 20) : null, t20: inst.length >= 20 ? sumN(2, 20) : null, fStreak: streak,
      eps4, epsPrev4, eps4YoY: eps4 != null && epsPrev4 && epsPrev4 > 0 ? pctOf(eps4, epsPrev4) : null,
      lastEps: lastEps ? lastEps[1] : null, lastEpsQ: lastEps ? qLabel(lastEps[0]) : "", epsQs: eps.slice(-4).map(r => [qLabel(r[0]), r[1]]),
      pe: eps4 && eps4 > 0 && price ? price / eps4 : null,
      finQ: fq ? qLabel(fq.d) : "", gm: gm(fq), gmYA: gm(fqYA), om: om(fq), omYA: om(fqYA),
      revYM: lastRev?.[0] || "", revYoY, revMoM, rev3YoY, revCumYoY,
      perDate: perLast?.[0] || "", perOfficial: perLast && perLast[1] > 0 ? perLast[1] : null, pbr: perLast && perLast[2] > 0 ? perLast[2] : null, dy: perLast ? perLast[3] : null, perPct,
      mgDate: mgLast?.[0] || "", mgBal: mgLast?.[1] ?? null, mgChg5: mgLast && mg5 ? mgLast[1] - mg5[1] : null, shortBal: mgLast?.[2] ?? null, shortRatio: mgLast && mgLast[1] ? mgLast[2] / mgLast[1] * 100 : null,
      deep: !!(cache.mg[code] || cache.per[code] || cache.rev[code]),
      ret5: retN(5), ret20: retN(20), ret60: retN(60), ytd, bRet20: bRet(20), bRet60: bRet(60),
      rel20: retN(20) != null && bRet(20) != null ? retN(20) - bRet(20) : null, rel60: retN(60) != null && bRet(60) != null ? retN(60) - bRet(60) : null,
      vol20, atr, atrPct: atr && price ? atr / price * 100 : null, bbU, bbL, bbB, hi20, lo20, newHi52, newLo52, crossDown20, crossUp20,
      revHi12, revHiAll, prevRevYoY, roe, bps,
      holdDate: hl?.[0] || "", holdPct: hl ? hl[1] : null, holdChg: hl && h20 && h20 !== hl ? hl[1] - h20[1] : null,
      cash12: divs.length ? cash12 : null, divYield12: divs.length && price ? cash12 / price * 100 : null, divYears: divs.length ? divYears : null, nextDiv, divRows: divs.slice(-6),
      pos: posM
    };
  }
  const colorOf = v => v == null || Math.abs(v) < 1e-9 ? "#f5e663" : (v > 0 ? "#ff5a5a" : "#5ce65c");
  // ---- 8.0 訊號：程式規則，固定門檻（lv 2=偏多 3=偏空 1=注意）----
  function alertsOf(m) {
    const a = [], add = (lv, t) => a.push({ lv, t });
    if (m.newHi52) add(2, "創 52 週新高"); if (m.newLo52) add(3, "創 52 週新低");
    if (m.crossDown20) add(3, "今日跌破月線"); if (m.crossUp20) add(2, "今日站回月線");
    if (m.volRatio != null && m.volRatio >= 2) add(1, `爆量 ${fmt(m.volRatio, 1)} 倍${m.volEstimated ? "（估）" : ""}`);
    if (m.fStreak >= 5) add(2, `外資連買 ${m.fStreak} 天`); if (m.fStreak <= -5) add(3, `外資連賣 ${-m.fStreak} 天`);
    if (m.rsi14 != null && m.rsi14 >= 80) add(1, `RSI ${fmt(m.rsi14, 0)} 過熱`); if (m.rsi14 != null && m.rsi14 <= 20) add(1, `RSI ${fmt(m.rsi14, 0)} 超賣`);
    if (m.kdCross === "黃金交叉" && m.K != null && m.K < 30) add(2, "KD 低檔黃金交叉"); if (m.kdCross === "死亡交叉" && m.K != null && m.K > 70) add(3, "KD 高檔死亡交叉");
    if (m.bbB != null && m.bbB > 100) add(1, "突破布林上軌"); if (m.bbB != null && m.bbB < 0) add(1, "跌破布林下軌");
    if (m.revYoY != null && m.prevRevYoY != null && m.revYoY < 0 && m.prevRevYoY >= 0) add(3, "月營收 YoY 轉負");
    if (m.revYoY != null && m.prevRevYoY != null && m.revYoY > 0 && m.prevRevYoY <= 0) add(2, "月營收 YoY 轉正");
    if (m.revHiAll) add(2, "月營收創近兩年新高"); else if (m.revHi12) add(2, "月營收創 12 個月新高");
    if (m.mgChg5 != null && m.mgBal && m.mgBal - m.mgChg5 > 0 && m.mgChg5 / (m.mgBal - m.mgChg5) > 0.1 && (m.ret5 ?? 0) < 0) add(3, "融資 5 日增逾 10% 但股價走弱");
    if (m.holdChg != null && Math.abs(m.holdChg) >= 1) add(m.holdChg > 0 ? 2 : 3, `外資持股比 20 日${m.holdChg > 0 ? "增" : "減"} ${fmt(Math.abs(m.holdChg), 2)} 個百分點`);
    if (m.pos?.cost && m.price != null && m.price < m.pos.cost) add(1, `低於持股成本 ${fmt(m.pos.cost)}`);
    if (m.nextDiv) add(1, `${m.nextDiv.ex.slice(5).replace("-", "/")} 除息 ${fmt(m.nextDiv.cash, 2)} 元`);
    return a;
  }
  const lvColor = lv => lv === 2 ? "#ff7a7a" : lv === 3 ? "#6fe06f" : "#f5c542";
  function marketMetrics() {
    const M = cache.mkt || {}, b = M.bench?.rows || [], qT = M.rt_t00, qO = M.rt_o00, today = ymd(tpNow());
    const C = b.map(r => r[1]);
    const qDay = qT?.date ? qT.date.replace(/(\d{4})(\d{2})(\d{2})/, "$1-$2-$3") : "";
    const live = !!(qT && qT.price != null && qDay === today && b.length && b[b.length - 1][0] !== today);
    const S = live ? C.concat([qT.price]) : C;
    const Hh = b.map(r => r[2] || r[1]).concat(live ? [qT.high ?? qT.price] : []), Ll = b.map(r => r[3] || r[1]).concat(live ? [qT.low ?? qT.price] : []);
    const ma = n => S.length >= n ? avg(S.slice(-n)) : null;
    let mAtr = null; if (S.length > 15) { const tr = []; for (let i = S.length - 14; i < S.length; i++) tr.push(Math.max(Hh[i] - Ll[i], Math.abs(Hh[i] - S[i - 1]), Math.abs(Ll[i] - S[i - 1]))); mAtr = avg(tr); }
    const mHi20 = Hh.length >= 21 ? Math.max(...Hh.slice(-21, -1)) : null, mLo20 = Ll.length >= 21 ? Math.min(...Ll.slice(-21, -1)) : null;
    const dayHi = qT?.high ?? Hh[Hh.length - 1] ?? null, dayLo = qT?.low ?? Ll[Ll.length - 1] ?? null;
    const px = qT?.price ?? (S.length ? S[S.length - 1] : null), prev = qT?.prev ?? (C.length >= 2 ? C[C.length - 2] : null);
    const inst = M.inst?.rows || [], il = inst[inst.length - 1] || null;
    const mg = M.margin?.rows || [], ml = mg[mg.length - 1] || null;
    const fu = M.fut?.rows || [], fl = fu[fu.length - 1] || null, fp = fu[fu.length - 2] || null;
    const ma20 = ma(20), ma60 = ma(60);
    return { taiex: px, taiexChg: px != null && prev ? px - prev : null, taiexPct: pctOf(px, prev), otc: qO?.price ?? null, otcPct: qO?.prev ? pctOf(qO.price, qO.prev) : null,
      ma20, ma60, rsi: rsi(S), hi52: S.length ? Math.max(...S.slice(-250)) : null, fromHi: S.length ? pctOf(px, Math.max(...S.slice(-250))) : null,
      ma5: ma(5), atr: mAtr, hi20: mHi20, lo20: mLo20, dayHi, dayLo,
      trend: px && ma20 && ma60 ? (px > ma20 && ma20 > ma60 ? "多頭排列" : px < ma20 && ma20 < ma60 ? "空頭排列" : "整理") : "—",
      instDate: il?.d || "", fBuy: il?.fb ?? null, fSell: il?.fs ?? null, fNet: il?.f ?? null, tNet: il?.t ?? null, sNet: il?.s ?? null, f5: inst.length >= 5 ? inst.slice(-5).reduce((a, r) => a + r.f, 0) : null,
      mgDate: ml?.[0] || "", mgPct: ml && ml[2] ? pctOf(ml[1], ml[2]) : null, mg5Pct: mg.length >= 6 && mg[mg.length - 6][1] ? pctOf(ml[1], mg[mg.length - 6][1]) : null,
      futDate: fl?.[0] || "", futNet: fl ? fl[1] : null, futChg: fl && fp ? fl[1] - fp[1] : null, time: qT?.time || "", has: !!(qT || b.length) };
  }

  // ---------- 畫面 ----------
  const css = `
  #pongchiInvest{display:none;position:fixed;inset:0;z-index:1700;background:#000;color:#eee;flex-direction:column;font-family:inherit}
  #pongchiInvest .pi-top{display:flex;align-items:center;gap:8px;padding:10px 10px 8px;background:#0b0b0b;border-bottom:1px solid #222}
  #pongchiInvest .pi-btn{background:#2a2a2a;border:1px solid #444;color:#eee;border-radius:7px;padding:7px 12px;font-size:14px;font-weight:700;cursor:pointer;white-space:nowrap}
  #pongchiInvest select{flex:1;min-width:0;background:#000;color:#fff;border:1px solid #444;border-radius:8px;font-size:16px;font-weight:700;padding:6px 8px;text-align:center}
  #pongchiInvest .pi-sub{display:flex;justify-content:space-between;gap:8px;padding:5px 10px;font-size:11px;color:#8a8a8a;background:#0b0b0b}
  #pongchiInvest .pi-scroll{flex:1;overflow:auto;-webkit-overflow-scrolling:touch}
  #pongchiInvest table{border-collapse:collapse;min-width:100%;font-variant-numeric:tabular-nums}
  #pongchiInvest th{position:sticky;top:0;z-index:2;background:#2b2f33;color:#ddd;font-size:14px;font-weight:700;padding:9px 8px;text-align:right;white-space:nowrap}
  #pongchiInvest th:first-child,#pongchiInvest td:first-child{position:sticky;left:0;z-index:1;background:#000;text-align:center}
  #pongchiInvest th:first-child{z-index:3;background:#2b2f33}
  #pongchiInvest td{padding:11px 8px;border-bottom:1px solid #1e1e1e;text-align:right;white-space:nowrap;font-size:17px}
  #pongchiInvest td.nm{font-size:16px;color:#f2f2f2;min-width:96px;max-width:110px;white-space:normal;line-height:1.2}
  #pongchiInvest td.nm small{display:block;font-size:10px;color:#6f6f6f;margin-top:2px}
  #pongchiInvest td.ex{font-size:14px;color:#cfcfcf}
  #pongchiInvest tr{cursor:pointer}
  #pongchiInvest .lim{color:#fff!important;border-radius:4px;padding:1px 4px}
  #pongchiInvest .pi-bottom{display:flex;gap:8px;padding:8px 10px calc(8px + env(safe-area-inset-bottom));background:#0b0b0b;border-top:1px solid #222}
  #pongchiInvest .pi-bottom button{flex:1 1 0;min-width:0;padding:7px 4px;font-size:13px;overflow:hidden;text-overflow:ellipsis}
  #pongchiInvest .pi-sheet{display:none;position:absolute;left:0;right:0;bottom:0;max-height:82%;overflow:auto;background:#101412;border-top:2px solid #5eead4;border-radius:16px 16px 0 0;padding:14px 14px calc(14px + env(safe-area-inset-bottom));z-index:5}
  #pongchiInvest .pi-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin:8px 0}
  #pongchiInvest .pi-cell{background:#171d1a;border:1px solid #263a33;border-radius:8px;padding:6px 7px;font-size:11px;color:#8fa69d}
  #pongchiInvest .pi-cell b{display:block;font-size:15px;color:#e8f5ef;margin-top:2px;font-variant-numeric:tabular-nums}
  #pongchiInvest .pi-h{font-size:12px;color:#5eead4;font-weight:800;margin:10px 0 2px}
  #pongchiInvest .pi-note{font-size:11px;color:#7a8a83;line-height:1.5}
  #pongchiInvest input{background:#0b110f;border:1px solid #30483f;border-radius:7px;color:#e8eeea;padding:8px;font-size:14px;min-width:0}
  #pongchiInvest .pi-edit-row{display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid #1e2a25;font-size:14px}
  #pongchiInvest .pi-edit-row span{flex:1}
  #pongchiInvest .pi-badge{display:inline-block;font-size:10px;font-weight:800;border-radius:8px;padding:0 5px;margin-left:3px;color:#111;vertical-align:middle}
  #pongchiInvest .pi-mkt{display:flex;gap:10px;align-items:center;overflow-x:auto;white-space:nowrap;padding:6px 10px;background:#101010;border-bottom:1px solid #222;font-size:12px;color:#bbb;cursor:pointer;font-variant-numeric:tabular-nums}
  #pongchiInvest .pi-mkt b{font-weight:800}
  #pongchiInvest .pi-port{padding:5px 10px;background:#140f08;border-bottom:1px solid #2a2014;font-size:12px;color:#e8c58a;display:none}
  #pongchiInvest .pi-sig{display:flex;flex-wrap:wrap;gap:5px;margin:6px 0}
  #pongchiInvest .pi-sig span{font-size:12px;border-radius:6px;padding:3px 7px;background:#1b1b1b;border:1px solid #333}
  #pongchiInvest .pi-tabs{display:flex;gap:4px;overflow-x:auto;margin:6px 0 4px}
  #pongchiInvest .pi-tabs button{flex:1;min-width:38px;background:#171d1a;border:1px solid #263a33;color:#9fb5ac;border-radius:7px;padding:6px 0;font-size:12px;cursor:pointer}
  #pongchiInvest .pi-tabs button.on{background:#10251f;border-color:#5eead4;color:#d9fff0;font-weight:800}
  #pongchiInvest .pi-x{background:none;border:1px solid #5a2a2a;color:#ff8a8a;border-radius:6px;padding:2px 9px;cursor:pointer}
  `;
  const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
  const root = document.createElement("div"); root.id = "pongchiInvest";
  root.innerHTML = `
    <div class="pi-top">
      <button type="button" class="pi-btn" id="piBack">返回</button>
      <select id="piGroup" aria-label="自選群組"></select>
      <button type="button" class="pi-btn" id="piEdit" title="編輯自選">✎</button>
      <button type="button" class="pi-btn" id="piRefresh" title="重新整理">⟳</button>
    </div>
    <div class="pi-sub"><span id="piStatus">💹 澎企理財</span><span id="piTime"></span></div>
    <div class="pi-mkt" id="piMkt" title="點我看大盤"><span>🌐 大盤讀取中…</span></div>
    <div class="pi-port" id="piPort"></div>
    <div class="pi-scroll"><table><thead><tr><th>商品</th><th>成交</th><th>漲跌</th><th>幅度</th><th>月均價</th><th>外資(張)</th><th>EPS(4季)</th><th>本益比</th></tr></thead><tbody id="piBody"></tbody></table>
      <div class="pi-note" style="padding:10px 12px 18px;">左右滑可看月均價、外資、EPS、本益比。點一檔看詳細。資料：證交所即時行情、FinMind（日K、三大法人、財報）。僅供觀測，不構成投資建議。</div>
    </div>
    <div class="pi-bottom">
      <button type="button" class="pi-btn" id="piAskGroup">🐿 分析</button>
      <button type="button" class="pi-btn" id="piAskAll">🐿 重點</button>
      <button type="button" class="pi-btn" id="piReport">📋 盤後</button>
      <button type="button" class="pi-btn" id="piWeek">📅 週檢</button>
      <button type="button" class="pi-btn" id="piLog" style="flex:0 0 40px">🗂</button>
    </div>
    <div class="pi-sheet" id="piSheet"></div>`;
  document.body.appendChild(root);
  const $ = id => document.getElementById(id);

  function fillGroups() {
    $("piGroup").innerHTML = cfg.groups.map((g, i) => `<option value="${i}">${IS_OWNER ? "" : (g.shared ? "" : "⭐ ")}${esc(g.name)}</option>`).join("");
    if (cfg.active >= cfg.groups.length) cfg.active = 0;
    $("piGroup").value = String(cfg.active);
  }
  function render() {
    const g = cfg.groups[cfg.active]; if (!g) return;
    const rows = groupItems(g).map(({ it, r }, idx) => {
      if (!r) return `<tr data-idx="${idx}"><td class="nm">${esc(it.name)}<small>${cache.info ? "找不到代號，點 ✎ 修正" : "對照中…"}</small></td><td colspan="7" style="text-align:left;color:#777;font-size:13px;">—</td></tr>`;
      const m = metrics(r.code), c = colorOf(m.chg);
      const atUp = m.limitUp && m.price >= m.limitUp - 1e-9, atDn = m.limitDown && m.price <= m.limitDown + 1e-9;
      const priceHtml = m.price == null ? "—" : (atUp || atDn ? `<span class="lim" style="background:${atUp ? "#d22" : "#1a8f1a"}">${fmt(m.price)}</span>` : fmt(m.price));
      const flat = m.chg == null || Math.abs(m.chg) < 1e-9;
      const al = alertsOf(m), worst = al.some(x => x.lv === 3) ? 3 : al.some(x => x.lv === 2) ? 2 : 1;
      const badge = al.length ? `<span class="pi-badge" style="background:${lvColor(worst)}">🔔${al.length}</span>` : "";
      return `<tr data-idx="${idx}"><td class="nm">${esc(r.name)}${badge}<small>${r.code}${r.fuzzy ? "？" : ""}${m.pos?.pnlPct != null ? ` <span style="color:${colorOf(m.pos.pnlPct)}">${sgn(m.pos.pnlPct)}</span>` : ""}</small></td>
        <td style="color:${c}">${priceHtml}</td>
        <td style="color:${c}">${flat ? "--" : (m.chg > 0 ? "+" : "") + fmt(m.chg)}</td>
        <td style="color:${c}">${flat ? "--" : fmt(Math.abs(m.pct)) + "%"}</td>
        <td class="ex" style="color:${m.ma20 && m.price ? (m.price >= m.ma20 ? "#ff8a8a" : "#8fe08f") : "#cfcfcf"}">${fmt(m.ma20)}</td>
        <td class="ex" style="color:${colorOf(m.fToday)}">${m.fToday == null ? "—" : fmtInt(m.fToday)}</td>
        <td class="ex">${m.eps4 == null ? "—" : fmt(m.eps4)}</td>
        <td class="ex">${m.pe == null ? "—" : fmt(m.pe, 1)}</td></tr>`;
    });
    $("piBody").innerHTML = rows.join("");
    { const anyD = Object.values(cache.daily).map(x => x.rows?.[x.rows.length - 1]?.[0]).filter(Boolean).sort().pop();
      $("piTime").textContent = rtAt ? `${rtSrc ? rtSrc + "・" : ""}${new Date(rtAt).toLocaleTimeString("zh-TW", { hour12: false })}${isMarketTime() ? "・盤中自動更新" : "・已收盤"}` : (anyD ? `顯示 ${anyD.slice(5).replace("-", "/")} 收盤價` : ""); }
    { const n = Object.keys(errs).length; $("piStatus").textContent = progress || (n ? `⚠ ${n} 項資料未取得（點這裡看）` : `💹 澎企理財${cloudState ? "　" + cloudState : ""}`); }
    renderMarket(); renderPort();
  }
  function renderMarket() {
    const k = marketMetrics(), el = $("piMkt"); if (!el) return;
    if (!k.has) { el.innerHTML = "<span>🌐 大盤讀取中…</span>"; return; }
    const pc = v => `<b style="color:${colorOf(v)}">${sgn(v, 2)}</b>`;
    el.innerHTML = `<span>加權 <b>${fmt(k.taiex, 2)}</b> ${pc(k.taiexPct)}</span>${k.otc != null ? `<span>櫃買 <b>${fmt(k.otc, 2)}</b> ${pc(k.otcPct)}</span>` : ""}${k.fNet != null ? `<span>外資 <b style="color:${colorOf(k.fNet)}">${sgn(k.fNet, 1, "億")}</b></span>` : ""}${k.futNet != null ? `<span>期外資 <b style="color:${colorOf(k.futNet)}">${fmtInt(k.futNet)}口</b></span>` : ""}<span style="color:#5eead4">›</span>`;
  }
  function portOf(list) {
    let mv = 0, cost = 0, n = 0;
    for (const r of list) { const m = metrics(r.code); if (m.pos?.mv != null) { mv += m.pos.mv; n++; if (m.pos.cost) cost += m.pos.cost * m.pos.shares; } }
    return n ? { n, mv, cost, pnl: cost ? mv - cost : null, pct: cost ? (mv / cost - 1) * 100 : null } : null;
  }
  function renderPort() {
    const el = $("piPort"); if (!el) return;
    const p = portOf(groupItems(cfg.groups[cfg.active]).filter(x => x.r).map(x => x.r));
    if (!p) { el.style.display = "none"; return; }
    el.style.display = "block";
    el.innerHTML = `💼 這組持股 ${p.n} 檔：市值 ${Math.round(p.mv).toLocaleString()} 元${p.pnl != null ? `，未實現損益 <b style="color:${colorOf(p.pnl)}">${fmtInt(p.pnl)} 元（${sgn(p.pct, 2)}）</b>` : ""}`;
  }
  function marketHtml() {
    const k = marketMetrics(), cell = (a, b, col) => `<div class="pi-cell">${a}<b${col ? ` style="color:${col}"` : ""}>${b}</b></div>`;
    return `<div style="display:flex;justify-content:space-between;align-items:center;"><b style="font-size:18px;">🌐 大盤總覽</b><button type="button" class="pi-btn" id="piSheetClose">✕</button></div>
      <div class="pi-h">指數 ${k.time ? `<span class="pi-note">（${esc(k.time)}）</span>` : ""}</div>
      <div class="pi-grid">${cell("加權指數", fmt(k.taiex, 2))}${cell("漲跌", sgn(k.taiexChg, 2, "") + "（" + sgn(k.taiexPct, 2) + "）", colorOf(k.taiexChg))}${cell("櫃買指數", k.otc == null ? "—" : fmt(k.otc, 2) + "（" + sgn(k.otcPct, 2) + "）", colorOf(k.otcPct))}
        ${cell("趨勢", k.trend)}${cell("月線 / 季線", `${fmt(k.ma20, 0)} / ${fmt(k.ma60, 0)}`)}${cell("RSI(14)", fmt(k.rsi, 1))}${cell("52週高", fmt(k.hi52, 0))}${cell("距高點", sgn(k.fromHi), colorOf(k.fromHi))}</div>
      <div class="pi-h">三大法人（億元）${k.instDate ? `<span class="pi-note">　${k.instDate}</span>` : ""}</div>
      <div class="pi-grid">${cell("外資", sgn(k.fNet, 1, ""), colorOf(k.fNet))}${cell("投信", sgn(k.tNet, 1, ""), colorOf(k.tNet))}${cell("自營商", sgn(k.sNet, 1, ""), colorOf(k.sNet))}${cell("外資 5 日", sgn(k.f5, 1, ""), colorOf(k.f5))}${cell("外資買進", k.fBuy == null ? "—" : fmt(k.fBuy, 1))}${cell("外資賣出", k.fSell == null ? "—" : fmt(k.fSell, 1))}</div>
      <div class="pi-h">槓桿與期貨</div>
      <div class="pi-grid">${cell(`融資餘額日變化${k.mgDate ? " " + k.mgDate.slice(5) : ""}`, sgn(k.mgPct, 2), colorOf(k.mgPct))}${cell("融資 5 日變化", sgn(k.mg5Pct, 2), colorOf(k.mg5Pct))}${cell(`台指期外資淨未平倉${k.futDate ? " " + k.futDate.slice(5) : ""}`, k.futNet == null ? "—" : fmtInt(k.futNet) + " 口", colorOf(k.futNet))}${cell("較前日", k.futChg == null ? "—" : fmtInt(k.futChg) + " 口", colorOf(k.futChg))}</div>
      <div style="display:flex;gap:8px;margin-top:12px;"><button type="button" class="pi-btn" id="piAskMkt" style="flex:1;background:#10251f;border-color:#5eead4;color:#d9fff0;">🐿 請 Teddy 解讀大盤</button></div>
      <div class="pi-note" style="margin-top:8px;">來源：證交所即時指數、FinMind（加權指數、三大法人買賣金額、融資餘額、期交所三大法人）。</div>`;
  }
  const sgn = (v, dp = 1, unit = "%") => v == null || !isFinite(v) ? "—" : (v > 0 ? "+" : "") + fmt(v, dp) + unit;
  // ---------- 8.1 走勢圖：1日／1週（盤中）、1月～1年（日線＋月線、季線）、3年／5年（週線＋13週、52週均線） ----------
  const RANGES = [["1d", "1日"], ["5d", "1週"], ["1m", "1月"], ["3m", "3月"], ["6m", "半年"], ["1y", "1年"], ["3y", "3年"], ["5y", "5年"]];
  let chartRange = "3m"; try { chartRange = localStorage.getItem("teddy_invest_chart_range") || "3m"; } catch (_) {}
  const longCache = {};
  const tpOf = t => new Date(t * 1000 + (480 + new Date().getTimezoneOffset()) * 60000);
  const hm = d => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  async function chartData(r, range) {
    const code = r.code;
    if (range === "1d" || range === "5d") {
      let j = null;
      try { j = await api({ type: "yh", sym: `${code}.${r.type === "tpex" ? "TWO" : "TW"}`, range, interval: range === "1d" ? "5m" : "30m" }); }
      catch (e) {
        if (range === "1d") throw e;
        // 1週備援：盤中資料讀不到時，改用最近 6 個交易日的日線
        const dd = cache.daily[code]?.rows || []; if (dd.length < 3) throw e;
        delete errs["走勢圖"];
        return { pts: dd.slice(-6).map(x => ({ x: x[0], c: x[4] })), labels: null, note: "盤中資料暫時讀不到，改用日線" };
      }
      if (!j.pts?.length) throw new Error("沒有盤中走勢資料");
      return { pts: j.pts.map(([t, c]) => { const d = tpOf(t); return { x: range === "1d" ? hm(d) : `${d.getMonth() + 1}/${d.getDate()} ${hm(d)}`, c }; }), ref: range === "1d" ? j.prev : null, refLabel: "昨收", labels: null, intraday: true };
    }
    if (range === "3y" || range === "5y") {
      if (!longCache[code]) { const j = await api({ type: "fm", dataset: "TaiwanStockPrice", data_id: code, start_date: daysAgo(1840) }); longCache[code] = (j.data || []).map(x => [x.date, +x.close]).filter(x => x[1] > 0); }
      const wk = []; let last = null;
      const keyOf = ds => { const d = new Date(ds + "T00:00:00"); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return ymd(d); };
      for (const [dt, c] of longCache[code]) { const k = keyOf(dt); if (last && last.k === k) { last.x = dt; last.c = c; } else { last = { k, x: dt, c }; wk.push(last); } }
      if (!wk.length) throw new Error("長期日K讀不到");
      const C = wk.map(p => p.c);
      wk.forEach((p, i) => { p.m1 = i >= 12 ? avg(C.slice(i - 12, i + 1)) : null; p.m2 = i >= 51 ? avg(C.slice(i - 51, i + 1)) : null; });
      const from = daysAgo(365 * (range === "3y" ? 3 : 5));
      return { pts: wk.filter(p => p.x >= from), labels: ["13週均線", "52週均線"], weekly: true };
    }
    const d = cache.daily[code]?.rows || [], today = ymd(tpNow()), q = rt[code];
    const series = d.map(x => ({ x: x[0], c: x[4] }));
    if (q?.price != null && q.date && q.date.replace(/(\d{4})(\d{2})(\d{2})/, "$1-$2-$3") === today && (!d.length || d[d.length - 1][0] !== today)) series.push({ x: today, c: q.price });
    if (!series.length) throw new Error("日K 還沒讀到");
    const C = series.map(p => p.c);
    series.forEach((p, i) => { p.m1 = i >= 19 ? avg(C.slice(i - 19, i + 1)) : null; p.m2 = i >= 59 ? avg(C.slice(i - 59, i + 1)) : null; });
    return { pts: series.slice(-({ "1m": 22, "3m": 66, "6m": 130, "1y": 250 }[range] || 66)), labels: ["月線(20日)", "季線(60日)"] };
  }
  function drawChart(box, data) {
    const pts = data.pts, n = pts.length;
    if (n < 2) { box.innerHTML = `<div class="pi-note">資料點太少，畫不出走勢。</div>`; return; }
    const W = Math.max(280, Math.floor(box.clientWidth || 340)), H = 210, pl = 4, pr = 54, pt = 10, pb = 22;
    const vals = pts.flatMap(p => [p.c, p.m1, p.m2]).filter(v => v != null && isFinite(v)).concat(data.ref != null ? [data.ref] : []);
    let lo = Math.min(...vals), hi = Math.max(...vals); const pad = (hi - lo) * 0.08 || Math.abs(hi) * 0.01 || 1; lo -= pad; hi += pad;
    const X = i => pl + (W - pl - pr) * (i / (n - 1)), Y = v => pt + (H - pt - pb) * (1 - (v - lo) / (hi - lo));
    const base = data.ref ?? pts[0].c, lastC = pts[n - 1].c, chg = pctOf(lastC, base);
    const col = chg == null || Math.abs(chg) < 1e-9 ? "#c98500" : chg > 0 ? "#e66767" : "#199e70";
    const path = k => { let s = "", pen = false; pts.forEach((p, i) => { const v = p[k]; if (v == null || !isFinite(v)) { pen = false; return; } s += (pen ? "L" : "M") + X(i).toFixed(1) + "," + Y(v).toFixed(1); pen = true; }); return s; };
    const pricePath = path("c"), area = `${pricePath}L${X(n - 1).toFixed(1)},${H - pb}L${X(0).toFixed(1)},${H - pb}Z`;
    const cs = pts.map(p => p.c), hiV = Math.max(...cs), loV = Math.min(...cs);
    const tick = [hi - pad, (hi + lo) / 2, lo + pad];
    const dp = lastC >= 1000 ? 0 : lastC >= 100 ? 1 : 2;
    const xl = [0, Math.floor((n - 1) / 2), n - 1].map(i => `<text x="${Math.min(Math.max(X(i), 18), W - pr - 18)}" y="${H - 6}" text-anchor="middle" font-size="10" fill="#7a8a83">${esc(data.intraday ? pts[i].x : data.weekly ? String(pts[i].x).slice(0, 7).replace("-", "/") : String(pts[i].x).slice(5).replace("-", "/"))}</text>`).join("");
    const legend = data.labels ? `<div style="display:flex;gap:12px;font-size:11px;color:#9fb5ac;margin-top:2px;"><span><i style="display:inline-block;width:14px;height:2px;background:${col};vertical-align:middle;margin-right:4px"></i>收盤</span><span><i style="display:inline-block;width:14px;height:2px;background:#3987e5;vertical-align:middle;margin-right:4px"></i>${data.labels[0]}</span><span><i style="display:inline-block;width:14px;border-top:2px dashed #c98500;vertical-align:middle;margin-right:4px"></i>${data.labels[1]}</span></div>` : (data.ref != null ? `<div style="font-size:11px;color:#9fb5ac;margin-top:2px;">虛線＝${data.refLabel} ${fmt(data.ref)}</div>` : "");
    box.innerHTML = `${data.note ? `<div class="pi-note" style="color:#e8c879;">${esc(data.note)}</div>` : ""}<div style="display:flex;justify-content:space-between;font-size:12px;color:#9fb5ac;margin:2px 0 4px;"><span>區間漲跌 <b style="color:${col}">${sgn(chg, 2)}</b>（${fmt(base)} → ${fmt(lastC)}）</span><span>高 ${fmt(hiV)}　低 ${fmt(loV)}</span></div>
      <svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="display:block;touch-action:pan-y;" role="img" aria-label="走勢圖，區間漲跌 ${sgn(chg, 2)}">
        <defs><linearGradient id="piG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${col}" stop-opacity=".22"/><stop offset="1" stop-color="${col}" stop-opacity="0"/></linearGradient></defs>
        ${tick.map(v => `<line x1="${pl}" x2="${W - pr}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}" stroke="#1f2b27" stroke-width="1"/><text x="${W - pr + 6}" y="${(Y(v) + 3.5).toFixed(1)}" font-size="10" fill="#7a8a83">${fmt(v, dp)}</text>`).join("")}
        <path d="${area}" fill="url(#piG)"/>
        ${data.ref != null ? `<line x1="${pl}" x2="${W - pr}" y1="${Y(data.ref).toFixed(1)}" y2="${Y(data.ref).toFixed(1)}" stroke="#9fb5ac" stroke-width="1" stroke-dasharray="3 3"/>` : ""}
        ${data.labels ? `<path d="${path("m2")}" fill="none" stroke="#c98500" stroke-width="1.5" stroke-dasharray="4 3"/><path d="${path("m1")}" fill="none" stroke="#3987e5" stroke-width="1.5"/>` : ""}
        <path d="${pricePath}" fill="none" stroke="${col}" stroke-width="2" stroke-linejoin="round"/>
        <circle cx="${X(n - 1).toFixed(1)}" cy="${Y(lastC).toFixed(1)}" r="4" fill="${col}" stroke="#101412" stroke-width="2"/>
        ${xl}
        <g id="piCross" style="display:none"><line id="piCrossL" y1="${pt}" y2="${H - pb}" stroke="#d9fff0" stroke-opacity=".5" stroke-width="1"/><circle id="piCrossD" r="4" fill="${col}" stroke="#101412" stroke-width="2"/></g>
        <rect x="0" y="0" width="${W - pr}" height="${H}" fill="transparent" id="piHit"/>
      </svg>${legend}
      <div id="piTip" style="display:none;position:absolute;top:24px;background:#0b110f;border:1px solid #30483f;border-radius:7px;padding:5px 8px;font-size:11px;color:#d9fff0;pointer-events:none;white-space:nowrap;font-variant-numeric:tabular-nums;"></div>`;
    const hit = box.querySelector("#piHit"), cross = box.querySelector("#piCross"), cl = box.querySelector("#piCrossL"), cd = box.querySelector("#piCrossD"), tip = box.querySelector("#piTip");
    const show = ev => {
      const rc = hit.getBoundingClientRect(), x = (ev.touches ? ev.touches[0].clientX : ev.clientX) - rc.left;
      const i = Math.max(0, Math.min(n - 1, Math.round((x - pl) / (W - pl - pr) * (n - 1)))), p = pts[i];
      cross.style.display = ""; cl.setAttribute("x1", X(i)); cl.setAttribute("x2", X(i)); cd.setAttribute("cx", X(i)); cd.setAttribute("cy", Y(p.c));
      tip.innerHTML = `${esc(p.x)}<br>收 <b>${fmt(p.c)}</b>${data.labels && p.m1 != null ? `<br>${data.labels[0]} ${fmt(p.m1)}` : ""}${data.labels && p.m2 != null ? `<br>${data.labels[1]} ${fmt(p.m2)}` : ""}`;
      tip.style.display = "block"; tip.style.left = Math.min(Math.max(0, X(i) - 50), W - 120) + "px";
    };
    const hide = () => { cross.style.display = "none"; tip.style.display = "none"; };
    hit.addEventListener("pointermove", show); hit.addEventListener("pointerdown", show); hit.addEventListener("touchmove", show, { passive: true });
    hit.addEventListener("pointerleave", hide); hit.addEventListener("touchend", () => setTimeout(hide, 1500));
  }
  function renderChart(r) {
    const box = $("piChart"); if (!box) return;
    const tabs = $("piRanges");
    if (tabs) tabs.querySelectorAll("button").forEach(b => { b.classList.toggle("on", b.dataset.rg === chartRange); b.onclick = () => { chartRange = b.dataset.rg; try { localStorage.setItem("teddy_invest_chart_range", chartRange); } catch (_) {} renderChart(r); }; });
    const want = chartRange;
    box.innerHTML = `<div class="pi-note" style="padding:20px 0;text-align:center;">⏳ 讀取走勢…</div>`;
    chartData(r, want).then(d => { if ($("piChart") === box && chartRange === want) drawChart(box, d); })
      .catch(e => { if ($("piChart") === box) box.innerHTML = `<div class="pi-note" style="padding:12px 0;">走勢資料讀不到：${esc(/429/.test(e.message) ? "Yahoo 暫時限制讀取次數，過幾分鐘再點一次；其他區間不受影響" : e.message)}</div>`; });
  }
  function errHtml() {
    const e = Object.entries(errs);
    const old = e.some(([, v]) => /舊版|部署/.test(v.msg)), level = e.some(([, v]) => /level|sponsor|upgrade|權限|會員/i.test(v.msg));
    return `<div style="display:flex;justify-content:space-between;align-items:center;"><b style="font-size:17px;">⚠ 資料讀取狀況</b><button type="button" class="pi-btn" id="piSheetClose">✕</button></div>
      ${old ? `<div class="pi-note" style="color:#e8c879;margin:6px 0;">👉 網站上的 api/stock.js 是舊版：到 GitHub 把 api/stock.js 整份換成最新版（第一行寫 Smart Teddy 8.1.0），Commit 後等 1 分鐘再按 ⟳。</div>` : ""}
      ${level ? `<div class="pi-note" style="color:#e8c879;margin:6px 0;">👉 有些資料 FinMind 免費帳號不開放或已達每小時上限，這幾項會顯示「—」，其他功能不受影響。</div>` : ""}
      ${e.map(([k, v]) => `<div class="pi-edit-row" style="display:block"><b>${esc(k)}</b><div class="pi-note">${esc(v.msg)}</div></div>`).join("") || '<div class="pi-note">目前全部正常。</div>'}`;
  }
  function detailHtml(it, r) {
    const m = metrics(r.code), c = colorOf(m.chg), etf = /^00/.test(r.code);
    const pos = (p, a) => p != null && a != null ? (p >= a ? "站上" : "跌破") : "";
    const cell = (k, v, col) => `<div class="pi-cell">${k}<b${col ? ` style="color:${col}"` : ""}>${v}</b></div>`;
    const loading = !m.deep ? `<div class="pi-note" style="color:#e8c879;">⏳ 正在讀取營收、本益比、融資資料…</div>` : "";
    return `<div style="display:flex;justify-content:space-between;align-items:center;">
        <div><div style="font-size:19px;font-weight:900;">${esc(r.name)} <span style="font-size:12px;color:#7a8a83;">${r.code}・${r.type === "tpex" ? "上櫃" : "上市"}${r.industry ? "・" + esc(r.industry) : ""}</span></div>
        <div style="font-size:24px;font-weight:900;color:${c};font-variant-numeric:tabular-nums;">${fmt(m.price)} <span style="font-size:15px;">${m.chg == null ? "" : (m.chg > 0 ? "+" : "") + fmt(m.chg) + "（" + fmt(m.pct) + "%）"}</span></div></div>
        <button type="button" class="pi-btn" id="piSheetClose">✕</button></div>
      ${r.fuzzy ? `<div class="pi-note" style="color:#e8c879;">⚠ 名稱用模糊比對成「${esc(r.fuzzy)}」，不對的話請到 ✎ 改成代號。</div>` : ""}
      ${(() => { const al = alertsOf(m); return al.length ? `<div class="pi-h">🔔 訊號</div><div class="pi-sig">${al.map(x => `<span style="color:${lvColor(x.lv)};border-color:${lvColor(x.lv)}55">${esc(x.t)}</span>`).join("")}</div>` : ""; })()}
      <div class="pi-h">💼 我的持股 <span class="pi-note">（選填，只存在這支手機）</span></div>
      <div style="display:flex;gap:6px;align-items:center;font-size:12px;color:#8fa69d;">成本<input id="piPosCost" inputmode="decimal" value="${m.pos?.cost ?? ""}" style="width:80px">股數<input id="piPosSh" inputmode="numeric" value="${m.pos?.shares ?? ""}" style="width:90px"><button type="button" class="pi-btn" id="piPosSave" style="padding:6px 10px">存</button></div>
      ${m.pos?.mv != null ? `<div class="pi-grid">${cell("市值", Math.round(m.pos.mv).toLocaleString())}${cell("未實現損益", m.pos.pnl == null ? "—" : fmtInt(m.pos.pnl), colorOf(m.pos.pnl))}${cell("報酬率", sgn(m.pos.pnlPct, 2), colorOf(m.pos.pnlPct))}</div>` : ""}
      <div class="pi-h">${m.live ? `今日即時行情 ${m.time ? `<span class="pi-note">（${esc(m.time)}）</span>` : ""}` : `最近收盤 ${m.vwapDate ? m.vwapDate.slice(5).replace("-", "/") : ""} <span class="pi-note" style="color:#e8c879;">（不是即時價）</span>`}</div>
      <div class="pi-grid">${cell("開盤", fmt(m.open))}${cell("最高", fmt(m.high))}${cell("最低", fmt(m.low))}${cell("昨收", fmt(m.prev))}${cell("成交量(張)", m.vol == null ? "—" : Math.round(m.vol).toLocaleString())}${cell(`量比${m.volEstimated ? "(估)" : ""}`, m.volRatio == null ? "—" : fmt(m.volRatio, 2) + " 倍")}</div>
      <div class="pi-h">走勢圖</div>
      <div class="pi-tabs" id="piRanges">${RANGES.map(([k, t]) => `<button type="button" data-rg="${k}">${t}</button>`).join("")}</div>
      <div id="piChart" style="position:relative;min-height:236px"></div>
      <div class="pi-h">趨勢與均價</div>
      <div class="pi-note" style="color:#d9fff0;font-size:13px;">${esc(m.trend)}</div>
      <div class="pi-grid">${cell("5日均 " + pos(m.price, m.ma5), fmt(m.ma5))}${cell("月均(20日) " + pos(m.price, m.ma20), fmt(m.ma20))}${cell("季均(60日) " + pos(m.price, m.ma60), fmt(m.ma60))}
        ${cell("月線乖離", sgn(m.bias20), colorOf(m.bias20))}${cell("季線乖離", sgn(m.bias60), colorOf(m.bias60))}${cell(`成交均價 ${m.vwapDate ? m.vwapDate.slice(5) : ""}`, fmt(m.vwap))}</div>
      <div class="pi-h">動能指標</div>
      <div class="pi-grid">${cell("RSI(14)", m.rsi14 == null ? "—" : fmt(m.rsi14, 1))}${cell("KD(9)", m.K == null ? "—" : `${fmt(m.K, 0)} / ${fmt(m.D, 0)}`)}${cell("KD 訊號", m.kdCross || "—")}
        ${cell("MACD 柱", m.macd ? sgn(m.macd.hist, 2, "") : "—", colorOf(m.macd?.hist))}${cell("柱狀變化", m.macd ? (Math.abs(m.macd.hist) > Math.abs(m.macd.prevHist) ? "擴大" : "收斂") : "—")}${cell("DIF / DEA", m.macd ? `${fmt(m.macd.dif, 2)} / ${fmt(m.macd.dea, 2)}` : "—")}</div>
      <div class="pi-h">52 週位置</div>
      <div class="pi-grid">${cell("52週高", fmt(m.hi52))}${cell("52週低", fmt(m.lo52))}${cell("距高點", sgn(m.fromHi), colorOf(m.fromHi))}</div>
      <div class="pi-h">籌碼（張）${m.instDate ? `<span class="pi-note">　法人最新 ${m.instDate}</span>` : ""}</div>
      <div class="pi-grid">${cell("外資 今日", fmtInt(m.fToday), colorOf(m.fToday))}${cell("外資 5日", fmtInt(m.f5), colorOf(m.f5))}${cell("外資 20日", fmtInt(m.f20), colorOf(m.f20))}
        ${cell("投信 今日", fmtInt(m.tToday), colorOf(m.tToday))}${cell("投信 5日", fmtInt(m.t5), colorOf(m.t5))}${cell("投信 20日", fmtInt(m.t20), colorOf(m.t20))}
        ${cell("自營 今日", fmtInt(m.dToday), colorOf(m.dToday))}${cell("外資連續", m.fStreak ? (m.fStreak > 0 ? `買超 ${m.fStreak} 天` : `賣超 ${-m.fStreak} 天`) : "—", colorOf(m.fStreak))}${cell(`融資5日增減${m.mgDate ? " " + m.mgDate.slice(5) : ""}`, fmtInt(m.mgChg5), colorOf(m.mgChg5))}
        ${cell("融資餘額", m.mgBal == null ? "—" : Math.round(m.mgBal).toLocaleString())}${cell("融券餘額", m.shortBal == null ? "—" : Math.round(m.shortBal).toLocaleString())}${cell("券資比", m.shortRatio == null ? "—" : fmt(m.shortRatio, 1) + "%")}</div>
      <div class="pi-h">報酬與相對大盤</div>
      <div class="pi-grid">${cell("5 日", sgn(m.ret5), colorOf(m.ret5))}${cell("20 日", sgn(m.ret20), colorOf(m.ret20))}${cell("60 日", sgn(m.ret60), colorOf(m.ret60))}
        ${cell("今年以來", sgn(m.ytd), colorOf(m.ytd))}${cell("20 日相對大盤", sgn(m.rel20), colorOf(m.rel20))}${cell("60 日相對大盤", sgn(m.rel60), colorOf(m.rel60))}</div>
      <div class="pi-h">波動與區間</div>
      <div class="pi-grid">${cell("20 日年化波動", m.vol20 == null ? "—" : fmt(m.vol20, 1) + "%")}${cell("ATR(14)", m.atr == null ? "—" : `${fmt(m.atr)}（${fmt(m.atrPct, 1)}%）`)}${cell("布林位置 %b", m.bbB == null ? "—" : fmt(m.bbB, 0))}
        ${cell("布林上軌", fmt(m.bbU))}${cell("20 日高（壓力）", fmt(m.hi20))}${cell("20 日低（支撐）", fmt(m.lo20))}</div>
      <div class="pi-h">外資持股 ${m.holdDate ? `<span class="pi-note">　${m.holdDate}</span>` : ""}</div>
      <div class="pi-grid">${cell("外資持股比", m.holdPct == null ? "—" : fmt(m.holdPct, 2) + "%")}${cell("近 20 日變化", m.holdChg == null ? "—" : sgn(m.holdChg, 2, " 個百分點"), colorOf(m.holdChg))}</div>
      ${etf ? `<div class="pi-h">基本面</div><div class="pi-note">ETF 沒有營收、EPS、本益比；折溢價與淨值目前沒有資料來源。</div>` : `
      <div class="pi-h">營收（月）${m.revYM ? `<span class="pi-note">　最新 ${m.revYM}</span>` : ""}</div>
      <div class="pi-grid">${cell("單月 YoY", sgn(m.revYoY), colorOf(m.revYoY))}${cell("單月 MoM", sgn(m.revMoM), colorOf(m.revMoM))}${cell("近3月 YoY", sgn(m.rev3YoY), colorOf(m.rev3YoY))}${cell("今年累計 YoY", sgn(m.revCumYoY), colorOf(m.revCumYoY))}</div>
      <div class="pi-h">獲利 ${m.finQ ? `<span class="pi-note">　最新 ${m.finQ}</span>` : ""}</div>
      <div class="pi-grid">${m.epsQs.map(([q, v]) => cell(q + " EPS", fmt(v))).join("")}${cell("近四季 EPS", fmt(m.eps4))}${cell("近四季年增", sgn(m.eps4YoY), colorOf(m.eps4YoY))}
        ${cell("毛利率", m.gm == null ? "—" : fmt(m.gm, 1) + "%")}${cell("去年同季", m.gmYA == null ? "—" : fmt(m.gmYA, 1) + "%")}${cell("營益率", m.om == null ? "—" : fmt(m.om, 1) + "%")}</div>
      <div class="pi-h">評價 ${m.perDate ? `<span class="pi-note">　${m.perDate}</span>` : ""}</div>
      <div class="pi-grid">${cell("本益比", m.perOfficial != null ? fmt(m.perOfficial, 1) + " 倍" : (m.pe == null ? "—" : fmt(m.pe, 1) + " 倍"))}${cell("一年區間位置", m.perPct == null ? "—" : `${fmt(m.perPct, 0)} 百分位`)}${cell("股價淨值比", m.pbr == null ? "—" : fmt(m.pbr, 2))}${cell("殖利率", m.dy == null ? "—" : fmt(m.dy, 2) + "%")}</div>`}
      ${etf ? "" : `<div class="pi-grid">${cell("ROE（估）", m.roe == null ? "—" : fmt(m.roe, 1) + "%")}${cell("每股淨值（估）", fmt(m.bps))}</div><div class="pi-note">ROE（估）＝近四季 EPS ÷ 每股淨值；每股淨值＝股價 ÷ 股價淨值比。</div>`}
      <div class="pi-h">股利</div>
      ${m.divRows.length ? `<div class="pi-grid">${cell("近 12 個月現金股利", fmt(m.cash12, 2) + " 元")}${cell("現金殖利率（自算）", m.divYield12 == null ? "—" : fmt(m.divYield12, 2) + "%")}${cell("連續配息", m.divYears ? m.divYears + " 年" : "—")}</div>
        <div class="pi-note">${m.divRows.slice().reverse().map(x => `${esc(x.y)}：現金 ${fmt(x.cash, 2)}${x.stock ? `、股票 ${fmt(x.stock, 2)}` : ""}${x.ex ? `（除息 ${x.ex}）` : ""}`).join("<br>")}</div>` : `<div class="pi-note">${m.deep ? "無股利資料" : "讀取中…"}</div>`}
      ${loading}
      <div style="display:flex;gap:8px;margin-top:12px;"><button type="button" class="pi-btn" id="piAskOne" style="flex:1;background:#10251f;border-color:#5eead4;color:#d9fff0;">🐿 請 Teddy 分析這檔</button></div>
      <div class="pi-note" style="margin-top:8px;">指標都是標準公式由程式計算：RSI(14)、KD(9,3,3)、MACD(12,26,9)、乖離＝(價÷均線−1)。量比＝今日量÷前5日均量，盤中依開盤時間估算。Teddy 只解釋，不替你下買賣決定。</div>`;
  }
  function openSheet(html) { const s = $("piSheet"); s.innerHTML = html; s.style.display = "block"; }
  function closeSheet() { $("piSheet").style.display = "none"; }

  function cloudHtml() {
    return `<div class="pi-h">☁ 雲端同步</div><div class="pi-note">${IS_OWNER ? "你的自選群組會自動同步給家人（家人只能看，不能改）。持股、分析紀錄只存在你自己的備份裡。" : "共用群組由孫爸維護，會自動更新；你自己建的群組、持股、紀錄只存在你自己的備份裡。"}<br>狀態：${esc(cloudState || "尚未同步")}</div>
      <div class="pi-note" style="margin-top:6px;">個人備份碼（換手機時在新手機輸入，就能找回持股與紀錄；不要給別人）：</div>
      <input id="piCloudKey" value="${esc(cfg.cloudKey)}" style="width:100%;box-sizing:border-box;letter-spacing:2px;font-weight:800">`;
  }
  function editHtml() {
    const g = cfg.groups[cfg.active];
    if (isLocked(g)) return `<div style="display:flex;justify-content:space-between;align-items:center;"><b style="font-size:17px;">🔒 ${esc(g.name)}</b><button type="button" class="pi-btn" id="piSheetClose">完成</button></div>
      <div class="pi-note" style="margin:8px 0;">這組由孫爸維護，會自動同步更新，這裡不能修改。想看其他股票，可以建立自己的群組。</div>
      <button type="button" class="pi-btn" id="piGNew">＋ 建立我的群組</button>${cloudHtml()}`;
    return `<div style="display:flex;justify-content:space-between;align-items:center;"><b style="font-size:17px;">✎ 編輯自選</b><button type="button" class="pi-btn" id="piSheetClose">完成</button></div>
      <div class="pi-h">群組名稱</div>
      <div style="display:flex;gap:6px;"><input id="piGName" value="${esc(g.name)}" style="flex:1"><button type="button" class="pi-btn" id="piGNew">＋新群組</button><button type="button" class="pi-x" id="piGDel">刪群組</button></div>
      <div class="pi-h">新增（名稱或代號，可一次貼多個，用空白或逗號分隔）</div>
      <div style="display:flex;gap:6px;"><input id="piAdd" placeholder="例：南亞科 或 2408" style="flex:1"><button type="button" class="pi-btn" id="piAddBtn">加入</button></div>
      <div class="pi-h">目前 ${g.items.length} 檔（找不到的可直接改成代號）</div>
      ${groupItems(g).map(({ it, r }, i) => `<div class="pi-edit-row"><span>${esc(it.name)} <small style="color:${r ? "#7a8a83" : "#ff8a8a"}">${r ? r.code + (r.fuzzy ? "？" + esc(r.fuzzy) : "") : "找不到"}</small></span>
        <input data-code="${i}" placeholder="代號" value="${esc(it.code || "")}" style="width:78px"><button type="button" class="pi-x" data-del="${i}">×</button></div>`).join("")}
      ${cloudHtml()}
      <div class="pi-h">FinMind Token（選填）</div>
      <div class="pi-note">沒有也能用；自選股多時建議到 FinMind 免費註冊取得 token，每小時可讀的次數較多。只存在這支手機。</div>
      <input id="piToken" value="${esc(cfg.token || "")}" placeholder="貼上 token" style="width:100%;margin-top:6px;box-sizing:border-box">`;
  }
  function bindEdit() {
    const g = cfg.groups[cfg.active];
    const ck = $("piCloudKey"); if (ck) ck.onchange = () => { const v = ck.value.trim().toUpperCase().replace(/[^0-9A-Z]/g, ""); if (v.length >= 6 && v !== cfg.cloudKey) { cfg.cloudKey = v; cfg.privAt = 0; save(LS_CFG, cfg); pullCloud().then(() => { openSheet(editHtml()); bindEdit(); }); } };
    if (isLocked(g)) {
      $("piGNew").onclick = () => { cfg.groups.push({ name: "我的群組" + (cfg.groups.filter(x => !x.shared).length + 1), items: [] }); cfg.active = cfg.groups.length - 1; saveCfg(); fillGroups(); openSheet(editHtml()); bindEdit(); render(); };
      $("piSheetClose").onclick = closeSheet; return;
    }
    $("piGName").onchange = e => { g.name = e.target.value.trim() || g.name; saveShared(); fillGroups(); };
    $("piGNew").onclick = () => { cfg.groups.push({ name: IS_OWNER ? "新群組" + (cfg.groups.length + 1) : "我的群組" + (cfg.groups.filter(x => !x.shared).length + 1), items: [] }); cfg.active = cfg.groups.length - 1; saveShared(); fillGroups(); openSheet(editHtml()); bindEdit(); render(); };
    $("piGDel").onclick = () => { if (cfg.groups.length <= 1 || !confirm(`刪除群組「${g.name}」？`)) return; cfg.groups.splice(cfg.active, 1); cfg.active = 0; saveShared(); fillGroups(); openSheet(editHtml()); bindEdit(); render(); };
    $("piAddBtn").onclick = () => {
      const parts = $("piAdd").value.split(/[\s,，、]+/).map(s => s.trim()).filter(Boolean);
      for (const p of parts) g.items.push(/^[0-9]{4,6}[A-Z]?$/i.test(p) ? { name: (cache.info?.byCode?.[p.toUpperCase()] || [p])[0], code: p.toUpperCase() } : { name: p });
      saveShared(); openSheet(editHtml()); bindEdit(); render(); refresh(true);
    };
    root.querySelectorAll("[data-del]").forEach(b => b.onclick = () => { g.items.splice(+b.dataset.del, 1); saveShared(); openSheet(editHtml()); bindEdit(); render(); });
    root.querySelectorAll("[data-code]").forEach(inp => inp.onchange = () => { const v = inp.value.trim().toUpperCase(); const it = g.items[+inp.dataset.code]; if (v) it.code = v; else delete it.code; saveShared(); render(); refresh(true); });
    $("piToken").onchange = e => { cfg.token = e.target.value.trim(); saveCfg(); };
    $("piSheetClose").onclick = closeSheet;
  }

  let pendingRefresh = false;
  async function refresh(full) {
    if (busy) { pendingRefresh = true; return; } busy = true; lastErr = "";
    try {
      progress = "讀取代號對照…"; render();
      try { await ensureInfo(); } catch (e) { lastErr = "代號對照：" + e.message; }
      const list = groupItems(cfg.groups[cfg.active]);
      loadMarket().then(renderMarket).catch(() => {});
      progress = "讀取即時行情…"; render();
      try { await loadRealtime(list); } catch (e) { lastErr = "即時行情：" + e.message; }
      progress = ""; render();
      if (full !== false) await loadDetails(list, (d, n) => { progress = d < n ? `補充均價／法人／EPS ${d}/${n}` : ""; render(); });
    } finally { busy = false; progress = ""; render(); if (pendingRefresh) { pendingRefresh = false; refresh(); } }
  }
  function startPoll() { stopPoll(); pollTimer = setInterval(() => { if (root.style.display === "flex" && isMarketTime() && !document.hidden && !busy) { loadRealtime(groupItems(cfg.groups[cfg.active])).then(render).catch(() => {}); api({ type: "rt", ex: "tse_t00.tw|otc_o00.tw" }).then(j => { for (const q of j.quotes || []) cache.mkt["rt_" + q.code] = q; renderMarket(); }).catch(() => {}); } }, 20000); }
  function stopPoll() { if (pollTimer) clearInterval(pollTimer); pollTimer = null; }

  window.teddyInvestOpen = function () { pullCloud(); api({ type: "ver" }).then(render).catch(render); root.style.display = "flex"; fillGroups(); render(); refresh(); startPoll(); };
  function closePanel() { root.style.display = "none"; closeSheet(); stopPoll(); }

  // ---------- 給 Teddy 的資料（程式計算的事實） ----------
  const nz = (v, f) => v == null || !isFinite(v) ? "無資料" : f(v);
  function line(r) {
    const m = metrics(r.code), etf = /^00/.test(r.code);
    const pos = (p, a) => p != null && a != null ? (p >= a ? "站上" : "跌破") : "";
    const L = [];
    L.push(`■ ${r.name}(${r.code}${r.industry ? "，" + r.industry : ""}${etf ? "，ETF" : ""})　資料日 ${m.dataDate || "無資料"}${m.live ? `，即時 ${m.time || ""}` : "（非即時，最近收盤）"}`);
    L.push(`  行情：${nz(m.price, v => fmt(v))}，${m.chg == null ? "漲跌無資料" : `${m.chg > 0 ? "+" : ""}${fmt(m.chg)}（${fmt(m.pct)}%）`}，量 ${nz(m.vol, v => Math.round(v) + "張")}，量比 ${nz(m.volRatio, v => fmt(v, 2) + "倍" + (m.volEstimated ? "（盤中估算）" : ""))}`);
    L.push(`  技術：${m.trend}；5日 ${fmt(m.ma5)}、月線 ${fmt(m.ma20)}（${pos(m.price, m.ma20) || "—"}，乖離 ${sgn(m.bias20)}）、季線 ${fmt(m.ma60)}（${pos(m.price, m.ma60) || "—"}，乖離 ${sgn(m.bias60)}）；RSI14 ${nz(m.rsi14, v => fmt(v, 1))}；KD ${m.K == null ? "無資料" : fmt(m.K, 0) + "/" + fmt(m.D, 0) + (m.kdCross ? "，" + m.kdCross : "")}；MACD柱 ${m.macd ? sgn(m.macd.hist, 2, "") + (Math.abs(m.macd.hist) > Math.abs(m.macd.prevHist) ? "（擴大）" : "（收斂）") : "無資料"}；52週高 ${fmt(m.hi52)}、低 ${fmt(m.lo52)}，距高點 ${sgn(m.fromHi)}`);
    L.push(`  籌碼（${m.instDate || "無資料"}，張）：外資 今日 ${fmtInt(m.fToday)}、5日 ${fmtInt(m.f5)}、20日 ${fmtInt(m.f20)}${m.fStreak ? `、連${m.fStreak > 0 ? "買" : "賣"}${Math.abs(m.fStreak)}天` : ""}；投信 今日 ${fmtInt(m.tToday)}、5日 ${fmtInt(m.t5)}、20日 ${fmtInt(m.t20)}；自營 今日 ${fmtInt(m.dToday)}；融資5日 ${m.mgChg5 == null ? "無資料" : fmtInt(m.mgChg5)}、券資比 ${nz(m.shortRatio, v => fmt(v, 1) + "%")}`);
    L.push(`  報酬：5日 ${sgn(m.ret5)}、20日 ${sgn(m.ret20)}、60日 ${sgn(m.ret60)}、今年 ${sgn(m.ytd)}；相對加權指數 20日 ${sgn(m.rel20)}、60日 ${sgn(m.rel60)}`);
    L.push(`  波動：20日年化 ${nz(m.vol20, v => fmt(v, 1) + "%")}，ATR14 ${m.atr == null ? "無資料" : fmt(m.atr) + "（" + fmt(m.atrPct, 1) + "%）"}，布林%b ${nz(m.bbB, v => fmt(v, 0))}（上軌 ${fmt(m.bbU)}、下軌 ${fmt(m.bbL)}）；20日高 ${fmt(m.hi20)}、20日低 ${fmt(m.lo20)}`);
    L.push(`  外資持股比（${m.holdDate || "無資料"}）：${nz(m.holdPct, v => fmt(v, 2) + "%")}，20日變化 ${m.holdChg == null ? "無資料" : sgn(m.holdChg, 2, "個百分點")}`);
    L.push(`  股利：近12個月現金 ${m.cash12 == null ? "無資料" : fmt(m.cash12, 2) + "元"}，自算殖利率 ${nz(m.divYield12, v => fmt(v, 2) + "%")}，連續配息 ${m.divYears == null ? "無資料" : m.divYears + "年"}${m.nextDiv ? `，即將除息 ${m.nextDiv.ex}（現金 ${fmt(m.nextDiv.cash, 2)}元）` : ""}`);
    { const al = alertsOf(m); L.push(`  程式訊號：${al.length ? al.map(x => x.t).join("、") : "無"}`); }
    if (m.pos) L.push(`  使用者持股：${m.pos.shares}股，成本 ${m.pos.cost == null ? "未填" : fmt(m.pos.cost)}${m.pos.pnl != null ? `，未實現損益 ${fmtInt(m.pos.pnl)}元（${sgn(m.pos.pnlPct, 2)}）` : ""}`);
    if (!etf) {
      L.push(`  營收（${m.revYM || "無資料"}）：單月YoY ${sgn(m.revYoY)}、MoM ${sgn(m.revMoM)}、近3月YoY ${sgn(m.rev3YoY)}、累計YoY ${sgn(m.revCumYoY)}`);
      L.push(`  獲利（${m.finQ || "無資料"}）：EPS ${m.epsQs.length ? m.epsQs.map(([q, v]) => q + " " + fmt(v)).join("、") : "無資料"}；近四季 ${fmt(m.eps4)}（年增 ${sgn(m.eps4YoY)}）；毛利率 ${nz(m.gm, v => fmt(v, 1) + "%")}（去年同季 ${nz(m.gmYA, v => fmt(v, 1) + "%")}）、營益率 ${nz(m.om, v => fmt(v, 1) + "%")}（去年同季 ${nz(m.omYA, v => fmt(v, 1) + "%")}）`);
      L.push(`  ROE（估，近四季EPS÷每股淨值）：${nz(m.roe, v => fmt(v, 1) + "%")}`);
      L.push(`  評價（${m.perDate || "無資料"}）：本益比 ${m.perOfficial != null ? fmt(m.perOfficial, 1) + "倍" : (m.pe == null ? "無資料" : fmt(m.pe, 1) + "倍（以近四季EPS估）")}，在近一年 ${nz(m.perPct, v => fmt(v, 0) + "百分位")}；股價淨值比 ${nz(m.pbr, v => fmt(v, 2))}；殖利率 ${nz(m.dy, v => fmt(v, 2) + "%")}`);
    }
    return L.join("\n");
  }
  function shortLine(r) {
    const m = metrics(r.code), al = alertsOf(m);
    return (al.length ? `［訊號：${al.map(x => x.t).join("、")}］` : "") + `・${r.name}(${r.code}) ${nz(m.price, v => fmt(v))} ${m.pct == null ? "" : sgn(m.pct, 2)}｜${m.trend.split("（")[0]}，月線乖離 ${sgn(m.bias20)}，RSI ${nz(m.rsi14, v => fmt(v, 0))}｜外資5日 ${fmtInt(m.f5)}張、投信5日 ${fmtInt(m.t5)}張${/^00/.test(r.code) ? "" : `｜營收YoY ${sgn(m.revYoY)}，本益比 ${m.perOfficial != null ? fmt(m.perOfficial, 1) : (m.pe == null ? "—" : fmt(m.pe, 1))}`}`;
  }
  function groupSummary(list) {
    const ms = list.map(r => ({ r, m: metrics(r.code) })).filter(x => x.m.price != null);
    if (!ms.length) return "";
    const by = (f, n, desc) => ms.filter(x => f(x.m) != null && (desc ? f(x.m) > 0 : f(x.m) < 0)).sort((a, b) => desc ? f(b.m) - f(a.m) : f(a.m) - f(b.m)).slice(0, n).map(x => `${x.r.name} ${f(x.m) > 0 ? "+" : ""}${Math.round(f(x.m) * 100) / 100}`).join("、") || "無";
    const above = ms.filter(x => x.m.ma20 && x.m.price >= x.m.ma20).length;
    const up = ms.filter(x => (x.m.chg || 0) > 0).length, dn = ms.filter(x => (x.m.chg || 0) < 0).length;
    return `【群組統計（程式計算）】共 ${ms.length} 檔：上漲 ${up}、下跌 ${dn}；站上月線 ${above} 檔
・漲幅前3：${by(m => m.pct, 3, true)}　・跌幅前3：${by(m => m.pct, 3, false)}
・外資5日買超前3（張）：${by(m => m.f5, 3, true)}　・外資5日賣超前3：${by(m => m.f5, 3, false)}`;
  }
  function marketText() {
    const k = marketMetrics();
    return `■ 大盤（${k.time ? "即時 " + k.time : "最近收盤"}）：加權指數 ${fmt(k.taiex, 2)}，${sgn(k.taiexChg, 2, "點")}（${sgn(k.taiexPct, 2)}）；櫃買指數 ${k.otc == null ? "無資料" : fmt(k.otc, 2) + "（" + sgn(k.otcPct, 2) + "）"}
  技術：${k.trend}，月線 ${fmt(k.ma20, 0)}、季線 ${fmt(k.ma60, 0)}，RSI14 ${fmt(k.rsi, 1)}，52週高 ${fmt(k.hi52, 0)}（距高點 ${sgn(k.fromHi)}）
  三大法人（${k.instDate || "無資料"}，億元）：外資 ${sgn(k.fNet, 1, "")}、投信 ${sgn(k.tNet, 1, "")}、自營商 ${sgn(k.sNet, 1, "")}；外資 5 日 ${sgn(k.f5, 1, "")}
  融資餘額（${k.mgDate || "無資料"}）：日變化 ${sgn(k.mgPct, 2)}、5日變化 ${sgn(k.mg5Pct, 2)}
  台指期外資淨未平倉（${k.futDate || "無資料"}）：${k.futNet == null ? "無資料" : fmtInt(k.futNet) + "口"}，較前日 ${k.futChg == null ? "無資料" : fmtInt(k.futChg) + "口"}`;
  }
  const isMarketQ = t => /(大盤|加權|指數|盤勢|台股今天|台股現在|櫃買|期貨|未平倉)/.test(t) && !/盤後報告/.test(t);
  const isRecoQ = t => /(推薦|值得關注|可以關注|該關注|關注哪|留意哪|注意哪幾|哪幾檔|哪些股票|有什麼股票|選股|標的)/.test(t);
  const isReportQ = t => /(盤後報告|今日報告|今天報告|每日報告|日報|盤後總結|操作指南|明日操作|明天操作|明天怎麼操作|操作計畫)/.test(t);
  const ANALYST_RULES = `【分析格式：第一行固定寫「重點：」加一句 40 字以內的總結（會被念出來）；接著照順序寫，每一點都要引用上面的數字；不要用 **、#、表格等 Markdown 符號，段落標題直接寫「一、結論」這樣，列點用「・」】
一、結論：一句話；技術面、籌碼面、基本面各標「偏多／中性／偏空」並寫出依據的數字。ETF 只看技術與籌碼。
二、技術面：均線排列與月線方向、乖離、RSI、KD、MACD 柱、量比、52 週位置、布林位置；報酬與相對加權指數的強弱。
三、籌碼面：外資與投信的 5 日／20 日、連續天數、外資持股比變化；融資增減與券資比（融資增加但股價走弱＝籌碼偏亂）。
四、基本面（ETF 略過）：月營收 YoY（單月、近 3 月、累計）、毛利率與營益率和去年同季比、近四季 EPS 年增、本益比在近一年的位置、股價淨值比、殖利率。
（有程式訊號時要提到；有股利資料就補一句殖利率與連續配息。）
五、風險控管參考：用 20 日年化波動與 ATR 說明這檔一般一天會動多少；有使用者持股時，說明目前損益與距成本的位置，並舉出常見的檢視點（例如收盤跌破月線、或從高點回落 2 倍 ATR），講清楚這是方法說明不是買賣建議。
六、接下來觀察：2～3 個具體、可驗證的訊號（例如站回月線某價位、外資轉為買超、下個月營收 YoY 是否維持），以及主要風險。
【嚴格規則】只能用上面資料；寫「無資料」的就說沒有資料，不可自己補。不可編造目標價、法人或券商報告、新聞事件、未公布的財報數字。不預測會漲會跌、不叫使用者買或賣。若同時附有網路消息，只能引用有標明來源的，並在句尾標來源；沒有來源的不要提。指標是統計描述，不是保證，最後一句說明決定在使用者自己。語氣可以溫暖，但內容要像分析師的簡報：短句、有數字、不誇張、不用 Markdown 表格。`;
  function allResolved() {
    const out = [], seen = new Set();
    cfg.groups.forEach(g => groupItems(g).forEach(({ it, r }) => { if (r && !seen.has(r.code)) { seen.add(r.code); out.push({ ...r, group: g.name, alias: it.name }); } }));
    return out;
  }
  let lastHitsGroup = null;
  function investHits(message) {
    const t = String(message || "");
    lastHitsGroup = null;
    if (!cache.info) return [];
    const all = allResolved();
    let hits = all.filter(r => (r.alias && r.alias.length >= 2 && t.includes(r.alias)) || t.includes(r.name) || new RegExp(`(^|\\D)${r.code}(\\D|$)`).test(t));
    const grp = cfg.groups.find(g => { const core = g.name.replace(/^自選\d*|群組?.*$|\d+$/g, ""); return t.includes(g.name) || (core.length >= 2 && t.includes(core)); });
    if (grp && (t.includes(grp.name) || !hits.length) && /(股|組|群|ETF|看|分析|怎樣|如何|重點)/i.test(t)) { hits = groupItems(grp).filter(x => x.r).map(x => x.r); lastHitsGroup = grp.name; }
    if (!hits.length && /(我的股票|自選|持股|觀察的股|澎企|這組|關注的股|今天重點)/.test(t)) { hits = groupItems(cfg.groups[cfg.active]).filter(x => x.r).map(x => x.r); lastHitsGroup = cfg.groups[cfg.active].name; }
    // 7.2.2：不在自選清單的台股／ETF 也能查——要有股票相關字眼，避免一般聊天被誤判
    if (!lastHitsGroup && cache.info?.map && /(股|ETF|分析|外資|投信|法人|EPS|營收|本益比|殖利率|均線|漲|跌|技術面|籌碼|基本面|怎麼看|走勢|股價|比較|看法|值不值得|行情)/i.test(t)) {
      const nt = norm(t), found = [];
      for (const m of t.matchAll(/(?:^|[^0-9A-Za-z])([0-9]{4,6}[A-Z]?)(?![0-9A-Za-z])/g)) { const b = cache.info.byCode[m[1]]; if (b && (b[1] === "twse" || b[1] === "tpex")) found.push({ code: m[1], type: b[1], name: b[0], industry: b[2] || "", pos: m.index, len: m[1].length }); }
      for (const [k, v] of Object.entries(cache.info.map)) {
        if (k.length < 2 || (v[1] !== "twse" && v[1] !== "tpex")) continue;
        const at = nt.indexOf(k); if (at < 0) continue;
        found.push({ code: v[0], type: v[1], name: v[2], industry: (cache.info.byCode[v[0]] || [])[2] || "", pos: at, len: k.length, byName: true });
      }
      // 名稱取最長、不重疊（「統一超」優先於「統一」）
      found.sort((a, b) => b.len - a.len);
      const used = [];
      for (const f of found) {
        if (f.byName && used.some(u => u.byName && f.pos < u.pos + u.len && u.pos < f.pos + f.len)) continue;
        if (used.some(u => u.code === f.code)) continue;
        used.push(f); if (used.length >= 4) break;
      }
      const have = new Set(hits.map(h => h.code));
      hits = hits.concat(used.filter(u => !have.has(u.code)).map(({ code, type, name, industry }) => ({ code, type, name, industry, outside: true })));
    }
    const uniq = []; const s = new Set(); for (const h of hits) if (!s.has(h.code)) { s.add(h.code); uniq.push(h); }
    return uniq.slice(0, 40);
  }
  window.teddyInvestContext = function (message) {
    const uniq = investHits(message);
    if (!uniq.length) return "";
    const when = rtAt ? new Date(rtAt).toLocaleString("zh-TW", { hour12: false }) : "（即時行情未取得，以最近收盤為準）";
    const briefOnly = /重點/.test(String(message)) && !/分析|詳細|完整/.test(String(message));
    const BRIEF_RULES = `【回答方式：只要重點】第一行寫「重點：」一句 40 字內；接著 3～5 句短句，講整體強弱、最強與最弱的檔、法人方向，每句都要有上面的數字。不要分技術／籌碼／基本面長篇，不用 Markdown 符號。只能用上面資料，沒有的說無資料，不編造新聞或目標價，不叫使用者買賣。`;
    const head = `【澎企理財資料｜來源：證交所即時行情、FinMind（日K、三大法人、融資券、月營收、財報、本益比）｜全部由程式計算｜行情時間 ${when}】`;
    if (uniq.length <= 4) return `${head}\n${uniq.map(line).join("\n")}\n${briefOnly ? BRIEF_RULES : ANALYST_RULES}`;
    // 群組：統計＋每檔一行；漲跌最大的前後各 2 檔附完整資料
    const ms = uniq.map(r => ({ r, p: metrics(r.code).pct })).filter(x => x.p != null).sort((a, b) => b.p - a.p);
    const focus = [...ms.slice(0, 2), ...ms.slice(-2)].map(x => x.r).filter((r, i, a) => a.indexOf(r) === i);
    return `${head}\n${lastHitsGroup ? `群組：${lastHitsGroup}\n` : ""}${groupSummary(uniq)}\n【每檔摘要】\n${uniq.map(shortLine).join("\n")}\n【漲跌最大幾檔的完整資料】\n${focus.map(line).join("\n")}\n${briefOnly ? BRIEF_RULES : ANALYST_RULES.replace("一、結論：一句話", "一、結論：先講整個群組的強弱與資金方向，再點名最強與最弱的幾檔")}`;
  };
  // ---------- 7.3.0 全市場三大法人排行（證交所＋櫃買中心，程式排序） ----------
  let rankData = null;
  const cnNum = s => String(s).replace(/([一二兩三四五六七八九]?)十([一二三四五六七八九]?)/g, (m, a, b) => String((a ? "一二三四五六七八九".indexOf(a.replace("兩", "二")) + 1 : 1) * 10 + (b ? "一二三四五六七八九".indexOf(b) + 1 : 0))).replace(/前([一二兩三四五六七八九])(?=名|檔|大|$|\s)/g, (m, a) => "前" + ("一二三四五六七八九".indexOf(a.replace("兩", "二")) + 1));
  function parseRank(t) {
    t = cnNum(String(t || ""));
    if (!/(買超|賣超|買賣超)/.test(t) || !/(前\s*\d+|排行|排名|最多|top\s*\d+|前幾|榜)/i.test(t)) return null;
    const n = Math.max(5, Math.min(50, +((t.match(/(?:前|top)\s*(\d{1,2})/i) || [])[1]) || 20));
    const who = /投信/.test(t) ? "trust" : /自營/.test(t) ? "dealer" : /三大法人|法人合計|合計/.test(t) ? "total" : "foreign";
    const buy = /買超/.test(t), sell = /賣超/.test(t) || /買賣超/.test(t);
    const dir = /買賣超/.test(t) ? "both" : (buy && sell ? "both" : (sell ? "sell" : "buy"));
    const mkt = /上櫃/.test(t) ? "tpex" : (/上市/.test(t) ? "twse" : "all");
    const byAmt = /金額|億/.test(t);
    const etf = /個股|不含\s*ETF|排除\s*ETF|ETF\s*除外/i.test(t) ? "exclude" : (/ETF/i.test(t) ? "only" : "include");
    return { n, who, dir, mkt, byAmt, etf };
  }
  async function loadRank() {
    if (rankData && Date.now() - rankData.ts < 20 * 60e3) return rankData;
    const j = await api({ type: "rank" });
    if (!j || !Array.isArray(j.rows)) throw new Error(j?.error || "讀不到法人排行");
    rankData = { ts: Date.now(), date: j.date, rows: j.rows, tpex: j.tpex, warn: j.warn };
    return rankData;
  }
  const WHO = { foreign: "外資", trust: "投信", dealer: "自營商", total: "三大法人合計" };
  function rankLists(p) {
    const rows = rankData.rows.filter(r => r[p.who] != null && (p.mkt === "all" || r.market === p.mkt) && (p.etf === "include" || (p.etf === "only" ? /^00/.test(r.code) : !/^00/.test(r.code))));
    const val = r => p.byAmt ? (r.close ? r[p.who] * r.close / 1e8 : null) : r[p.who] / 1000;
    const ok = rows.filter(r => val(r) != null);
    const buy = ok.filter(r => val(r) > 0).sort((a, b) => val(b) - val(a)).slice(0, p.n);
    const sell = ok.filter(r => val(r) < 0).sort((a, b) => val(a) - val(b)).slice(0, p.n);
    return { buy, sell, val };
  }
  function rankLine(r, i, val, p) {
    const v = val(r), lots = r[p.who] / 1000;
    const amt = r.close ? r[p.who] * r.close / 1e8 : null;
    return `${i + 1}. ${r.name}(${r.code}${r.market === "tpex" ? "，櫃" : ""}) ${p.byAmt ? `${v > 0 ? "+" : ""}${fmt(v, 2)}億（${fmtInt(lots)}張）` : `${fmtInt(lots)}張${amt != null ? `（約${amt > 0 ? "+" : ""}${fmt(amt, 2)}億）` : ""}`}${r.close ? `　收${fmt(r.close)}` : ""}`;
  }
  function industryTop(list) {
    const c = {};
    list.forEach(r => { const ind = (cache.info?.byCode?.[r.code] || [])[2] || (/^00/.test(r.code) ? "ETF" : "其他"); c[ind] = (c[ind] || 0) + 1; });
    return Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, v]) => `${k} ${v} 檔`).join("、");
  }
  function rankText(p) {
    const { buy, sell, val } = rankLists(p);
    const scope = `${p.mkt === "twse" ? "上市" : p.mkt === "tpex" ? "上櫃" : (rankData.tpex ? "上市＋上櫃" : "上市（上櫃資料未取得）")}${p.etf === "only" ? "・只看 ETF" : p.etf === "exclude" ? "・不含 ETF" : ""}`;
    const head = `${WHO[p.who]}${p.dir === "sell" ? "賣超" : p.dir === "buy" ? "買超" : "買賣超"}前 ${p.n} 名（${scope}｜${rankData.date}｜依${p.byAmt ? "金額（億元，以收盤價估算）" : "張數"}排序）`;
    const parts = [head];
    if (p.dir !== "sell") parts.push(`\n【買超】\n${buy.map((r, i) => rankLine(r, i, val, p)).join("\n") || "無"}`);
    if (p.dir !== "buy") parts.push(`\n【賣超】\n${sell.map((r, i) => rankLine(r, i, val, p)).join("\n") || "無"}`);
    const st = [];
    if (p.dir !== "sell" && buy.length) st.push(`買超名單產業以 ${industryTop(buy)} 最多`);
    if (p.dir !== "buy" && sell.length) st.push(`賣超名單產業以 ${industryTop(sell)} 最多`);
    if (st.length) parts.push(`\n程式統計：${st.join("；")}。`);
    parts.push(`資料來源：證交所、櫃買中心三大法人日報${rankData.warn ? `（${rankData.warn}）` : ""}。金額＝買賣超股數×收盤價，為估算值。`);
    return parts.join("\n");
  }
  window.teddyInvestRankParse = parseRank;
  // 純列表：程式直接回答，不經過 AI（零幻覺）；要「分析／解讀」才交給 Astra
  window.teddyInvestRankLocal = async function (message) {
    const p = parseRank(message);
    if (!p || /(分析|解讀|看法|為什麼|代表什麼|意義|怎麼看)/.test(message)) return "";
    try { await ensureInfo(); } catch (_) {}
    await loadRank();
    return rankText(p);
  };
  window.teddyInvestWants = function (message) { const t = String(message || ""); return !!parseRank(t) || isWeekQ(t) || isRecoQ(t) || isReportQ(t) || isMarketQ(t) || investHits(t).length > 0; };
  // ---------- 8.0 盤後報告（大盤＋自選各組＋訊號＋持股＋外資排行） ----------
  const REPORT_RULES = `【盤後報告格式】第一行「重點：」一句 40 字內。接著：
一、大盤：指數漲跌、趨勢、法人與期貨外資方向、融資變化。
二、資金流向：外資買賣超前幾名集中的產業（只看上面名單）。
三、自選各組：最強與最弱的組，以及組內漲跌最大的檔。
四、訊號與需留意：照「自選訊號」逐條歸納，偏多與偏空分開。
五、持股（有資料才寫）：總損益與變化最大的部位。
六、明日操作計畫（情境式，用上面「明日關鍵價位」）：
 1. 大盤：寫「偏強情境」「偏弱情境」各一條——觸發價位（例如站回某價位／跌破某價位）＋要搭配看的數據（外資現貨、期貨外資未平倉、量能）＋對應的應對方式（偏多應對／保守應對）。附上依 ATR 估的明日正常波動區間。
 2. 相對強勢股：每檔寫觀察價位（守住哪裡算強勢延續、跌破哪裡轉弱）。
 3. 相對弱勢股：每檔寫要站回哪裡才算止跌、跌破哪裡要提高警覺。
 4. 持股（有輸入才寫）：每檔寫目前損益、檢視點價位（收盤跌破支撐或自高點回落 2 倍 ATR），以及部位風險提醒。
 5. 一句話總結明天的應對原則（例如先看哪個數據再決定）。
 措辭用「觀察／應對／檢視點／降低曝險」，不要寫「買進、賣出、加碼、停損價就是…」這類指令；結尾寫「以上是依數據整理的情境，不是買賣建議，請依自己的資金與風險承受度決定」。
【嚴格規則】只能用上面資料，沒有的寫無資料；不可編造新聞、原因、目標價；不預測漲跌、不叫使用者買賣；不用 Markdown 符號，段落直接寫「一、大盤」。`;
  const MARKET_RULES = `【大盤解讀格式】第一行「重點：」一句 40 字內；接著用 4～6 句說明：指數位置與趨勢（均線、RSI、距高點）、三大法人與外資 5 日方向、台指期外資淨未平倉變化、融資變化代表的散戶槓桿；最後一句列出明天要看的 1～2 個數字。只能用上面資料，不編造新聞與原因，不預測漲跌，不用 Markdown 符號。`;
  // ---- 8.2 明日關鍵價位（全部由程式算出，Teddy 只能引用）----
  function planText(all) {
    const k = marketMetrics(), f = v => fmt(v, 0);
    const L = ["【明日關鍵價位（程式計算）】"];
    if (k.taiex != null) {
      L.push(`・加權：收 ${f(k.taiex)}；今日高 ${f(k.dayHi)}／低 ${f(k.dayLo)}；5日線 ${f(k.ma5)}、月線 ${f(k.ma20)}、季線 ${f(k.ma60)}；20日高 ${f(k.hi20)}、20日低 ${f(k.lo20)}；ATR14 ${f(k.atr)} 點 → 明日正常波動約 ${k.atr ? f(k.taiex - k.atr) + "～" + f(k.taiex + k.atr) : "無資料"}`);
      const sup = [k.ma60, k.lo20, k.dayLo].filter(v => v != null && v < k.taiex).sort((a, b) => b - a), res = [k.ma5, k.ma20, k.dayHi, k.hi20].filter(v => v != null && v > k.taiex).sort((a, b) => a - b);
      L.push(`  下方支撐（近→遠）：${sup.map(f).join("、") || "季線、20日低都已在收盤價之上（已跌破）"}；上方壓力（近→遠）：${res.map(f).join("、") || "5日線、月線、20日高都在收盤價之下（已站上）"}`);
    }
    const ms = all.map(r => ({ r, m: metrics(r.code) })).filter(x => x.m.price != null && x.m.ma20);
    const lv = (x) => { const m = x.m, hiRef = m.hi20 != null ? Math.max(m.hi20, m.price) : m.price;
      return `・${x.r.name}(${x.r.code})：收 ${fmt(m.price)}（${sgn(m.pct, 2)}）；月線 ${fmt(m.ma20)}、季線 ${fmt(m.ma60)}；20日高 ${fmt(m.hi20)}、20日低 ${fmt(m.lo20)}；ATR ${fmt(m.atr)}（${fmt(m.atrPct, 1)}%）；自高點回落2ATR＝${m.atr ? fmt(hiRef - 2 * m.atr) : "無資料"}；外資5日 ${fmtInt(m.f5)}張${m.pos ? `；持股 ${m.pos.shares}股、成本 ${m.pos.cost == null ? "未填" : fmt(m.pos.cost)}、損益 ${m.pos.pnlPct == null ? "—" : sgn(m.pos.pnlPct, 2)}` : ""}`; };
    const strong = ms.filter(x => x.m.price >= x.m.ma20 && (x.m.f5 ?? 0) > 0).sort((a, b) => (b.m.rel20 ?? b.m.ret20 ?? 0) - (a.m.rel20 ?? a.m.ret20 ?? 0)).slice(0, 5);
    const weak = ms.filter(x => x.m.price < x.m.ma20 && (x.m.f5 ?? 0) < 0).sort((a, b) => (a.m.rel20 ?? a.m.ret20 ?? 0) - (b.m.rel20 ?? b.m.ret20 ?? 0)).slice(0, 5);
    const held = ms.filter(x => x.m.pos);
    L.push(`【相對強勢（站上月線且外資5日買超）】\n${strong.map(lv).join("\n") || "無"}`);
    L.push(`【相對弱勢（跌破月線且外資5日賣超）】\n${weak.map(lv).join("\n") || "無"}`);
    L.push(`【持股檢視點】\n${held.map(lv).join("\n") || "未輸入持股"}`);
    return L.join("\n");
  }
  let lastCompleteness = "";
  window.teddyInvestTakeCompleteness = () => { const c = lastCompleteness; lastCompleteness = ""; return c; };
  async function buildReport(onProg) {
    const all = allResolved(), list = all.map(r => ({ r }));
    const P = { mkt: "讀取中", rt: "讀取中", rank: "讀取中", det: [0, all.length] };
    const say = () => { try { onProg && onProg(`📋 盤後報告讀取中…\n・大盤：${P.mkt}\n・自選即時行情：${P.rt}\n・外資排行：${P.rank}\n・自選日K／法人／EPS：${P.det[0]}/${P.det[1]} 檔`); } catch (_) {} };
    say();
    const job = (async () => {
      await loadMarket().catch(() => {}); { const st = cache.mkt.status || {}, ok = Object.values(st).filter(Boolean).length; P.mkt = `${ok}/${Object.keys(st).length} 項`; } say();
      try { await loadRealtime(list); P.rt = `${all.filter(r => rt[r.code]).length}/${all.length} 檔`; } catch (e) { P.rt = "失敗"; } say();
      try { await loadRank(); P.rank = "完成"; } catch (_) { P.rank = "失敗"; } say();
      try { await loadDetails(list, (d, n) => { P.det = [d, n]; say(); }); } catch (_) {}
    })();
    const t0 = Date.now();
    await Promise.race([job, new Promise(r => setTimeout(r, 40000))]);
    const timedOut = Date.now() - t0 >= 39500;
    // 完成度（程式計算，附在報告最後）
    const st = cache.mkt.status || {};
    const mk = Object.entries(st).map(([k, v]) => `${k}${v ? "✓" : "✗"}`).join(" ");
    const haveRt = all.filter(r => rt[r.code]?.price != null).length;
    const haveD = all.filter(r => cache.daily[r.code]?.rows?.length).length, haveI = all.filter(r => cache.inst[r.code]?.rows?.length).length;
    const stockN = all.filter(r => !/^00/.test(r.code)).length, haveE = all.filter(r => !/^00/.test(r.code) && cache.eps[r.code]?.q?.length).length;
    const pct = Math.round(((Object.values(st).filter(Boolean).length / Math.max(1, Object.keys(st).length)) + haveRt / Math.max(1, all.length) + haveD / Math.max(1, all.length) + haveI / Math.max(1, all.length) + (rankData ? 1 : 0)) / 5 * 100);
    lastCompleteness = `📊 資料完成度 約 ${pct}%${timedOut ? "（等候 40 秒仍有資料在讀，可稍後再按一次）" : ""}
・大盤：${mk || "無"}
・自選即時行情 ${haveRt}/${all.length}、日K ${haveD}/${all.length}、法人 ${haveI}/${all.length}、EPS ${haveE}/${stockN}（ETF 不計）
・外資排行：${rankData ? "✓ " + rankData.date : "✗"}${lastErr ? `\n・最後一個錯誤：${lastErr}` : ""}`;
    const groups = cfg.groups.map(g => { const ms = groupItems(g).filter(x => x.r).map(x => metrics(x.r.code)).filter(m => m.pct != null); return { name: g.name, n: ms.length, avg: ms.length ? avg(ms.map(m => m.pct)) : null, up: ms.filter(m => m.pct > 0).length, above: ms.filter(m => m.ma20 && m.price >= m.ma20).length }; }).filter(g => g.n).sort((a, b) => b.avg - a.avg);
    const movers = all.map(r => ({ r, m: metrics(r.code) })).filter(x => x.m.pct != null).sort((a, b) => b.m.pct - a.m.pct);
    const alerts = all.map(r => ({ r, al: alertsOf(metrics(r.code)) })).filter(x => x.al.length);
    const port = portOf(all);
    const rk = rankData ? rankText({ n: 10, who: "foreign", dir: "both", mkt: "all", byAmt: true, etf: "exclude" }) : "外資排行：無資料";
    return `【澎企理財 盤後報告資料｜全部由程式從證交所、櫃買中心、FinMind 讀取計算｜${new Date().toLocaleString("zh-TW", { hour12: false })}】
${marketText()}
【自選各組強弱（平均漲跌幅）】
${groups.map(g => `・${g.name}：平均 ${sgn(g.avg, 2)}，上漲 ${g.up}/${g.n}，站上月線 ${g.above}/${g.n}`).join("\n") || "無資料"}
【自選漲幅前5】${movers.filter(x => x.m.pct > 0).slice(0, 5).map(x => `${x.r.name} ${sgn(x.m.pct, 2)}`).join("、") || "無資料"}
【自選跌幅前5】${movers.filter(x => x.m.pct < 0).slice(-5).reverse().map(x => `${x.r.name} ${sgn(x.m.pct, 2)}`).join("、") || "無資料"}
【自選訊號】
${alerts.map(x => `・${x.r.name}(${x.r.code})：${x.al.map(a => a.t).join("、")}`).join("\n") || "無"}
${port ? `【持股總覽】${port.n} 檔，市值 ${Math.round(port.mv).toLocaleString()} 元${port.pnl != null ? `，未實現損益 ${fmtInt(port.pnl)} 元（${sgn(port.pct, 2)}）` : ""}` : "【持股總覽】未輸入持股"}
【外資買賣超前10（依金額，不含ETF）】
${rk}
${planText(all)}
【資料完成度（程式統計）】${lastCompleteness.replace(/\n/g, "；")}
${REPORT_RULES}
（有標 ✗ 或數量不足的部分，請在該段寫「資料未讀到」，不要猜。）`;
  }
  // ---------- 8.5 自選週檢：程式評分（趨勢30＋籌碼30＋動能20＋基本面20）＋每週快照＋變化＋上週成績單 ----------
  cfg.weekly = Array.isArray(cfg.weekly) ? cfg.weekly : [];
  // Firestore 不接受「陣列裡的陣列」：上傳時每檔改成物件，下載再轉回來
  const wkEnc = w => ({ ...w, items: (w.items || []).map(x => Array.isArray(x) ? { c: x[0], n: x[1], s: x[2], t: x[3], p: x[4], f: x[5] ?? null } : x) });
  const wkDec = w => ({ ...w, items: (w.items || []).map(x => Array.isArray(x) ? x : [x.c, x.n, x.s, x.t, x.p, x.f ?? null]) });
  window.__wkEnc = wkEnc; window.__wkDec = wkDec;
  const isoWeek = ds => { const d = new Date(ds + "T12:00:00Z"), day = (d.getUTCDay() + 6) % 7; d.setUTCDate(d.getUTCDate() - day + 3); const y = d.getUTCFullYear(), f = new Date(Date.UTC(y, 0, 4)); return `${y}-W${String(1 + Math.round(((d - f) / 864e5 - 3 + ((f.getUTCDay() + 6) % 7)) / 7)).padStart(2, "0")}`; };
  const TIER = { 2: "強勢", 1: "中性", 0: "偏弱" }, tierOf = s => s >= 70 ? 2 : s >= 45 ? 1 : 0, tierColor = t => t === 2 ? "#ff7a7a" : t === 0 ? "#6fe06f" : "#f5c542";
  function weekScore(code) {
    const m = metrics(code), etf = /^00/.test(code);
    if (m.price == null || !m.ma20 || !m.ma60 || !m.ma20prev) return null;
    const P = { trend: 0, chip: 0, mom: 0, fund: 0, pen: 0 }, why = [], warn = [];
    if (m.price > m.ma20) P.trend += 10; if (m.ma20 > m.ma60) P.trend += 10; if (m.ma20 > m.ma20prev) P.trend += 10;
    const inst5 = m.f5 == null && m.t5 == null ? null : (m.f5 ?? 0) + (m.t5 ?? 0), ratio = inst5 != null && m.avg5v ? inst5 / (m.avg5v * 5) * 100 : null;
    if (inst5 != null) { if (inst5 > 0) P.chip += 10; if (m.fStreak >= 3) P.chip += 10; else if (m.fStreak >= 1) P.chip += 5; if (ratio != null) { if (ratio >= 5) P.chip += 10; else if (ratio >= 2) P.chip += 5; } }
    if (m.rsi14 != null) { if (m.rsi14 >= 50 && m.rsi14 < 70) P.mom += 8; else if ((m.rsi14 >= 40 && m.rsi14 < 50) || (m.rsi14 >= 70 && m.rsi14 < 80)) P.mom += 4; }
    if (m.macd) { if (m.macd.hist > 0) P.mom += 6; else if (m.macd.hist > m.macd.prevHist) P.mom += 3; }
    if (m.K != null && m.D != null && m.K > m.D) P.mom += 6;
    const hasFund = !etf && (m.revYoY != null || m.eps4 != null);
    if (hasFund) { if (m.revYoY != null && m.revYoY > 0) P.fund += 8; if (m.eps4 != null && m.eps4 > 0) P.fund += 6; if (m.eps4YoY != null && m.eps4YoY > 0) P.fund += 6; }
    if (m.rsi14 != null && m.rsi14 >= 80) { P.pen -= 10; warn.push(`RSI ${fmt(m.rsi14, 0)} 過熱`); }
    if (m.bias20 != null && m.bias20 > 10) { P.pen -= 10; warn.push(`離月線 +${fmt(m.bias20, 1)}%`); }
    if (m.newLo52) { P.pen -= 5; warn.push("創 52 週新低"); }
    const max = hasFund ? 100 : 80, base = P.trend + P.chip + P.mom + P.fund;
    const score = Math.max(0, Math.min(100, Math.round(base / max * 100) + P.pen));
    // 程式算的觀察價位
    const below = [m.ma20, m.lo20, m.ma60].filter(v => v != null && v < m.price).sort((a, b) => b - a);
    const support = below[0] ?? null, fail = m.ma60 != null && m.price > m.ma60 ? m.ma60 : (m.lo20 != null && m.lo20 < m.price ? m.lo20 : null);
    const res = m.hi20 != null && m.hi20 > m.price ? m.hi20 : null;
    const t = tierOf(score);
    if (m.price > m.ma20 && m.ma20 > m.ma60) why.push("站上月線且月線在季線上"); else if (m.price < m.ma20 && m.ma20 < m.ma60) why.push("月線、季線之下");
    if (inst5 != null && inst5 > 0) why.push(`法人5日買超 ${fmtInt(inst5)} 張`); else if (inst5 != null && inst5 < 0) why.push(`法人5日賣超 ${fmtInt(inst5)} 張`);
    if (hasFund && m.revYoY != null) why.push(`月營收 YoY ${sgn(m.revYoY)}`);
    let note;
    if (t === 2) note = fail != null && support != null && Math.abs(fail - support) < 1e-6 ? `強勢延續觀察：守住 ${fmt(support)} 視為延續，收盤跌破即轉弱` : `強勢延續觀察：守住 ${fmt(support)} 視為延續${fail ? `；收盤跌破 ${fmt(fail)} 轉弱` : ""}`;
    else if (t === 1) note = `等待方向：${res ? `站上 ${fmt(res)}（20日高）轉強` : "已在 20 日高附近"}${fail ? `／跌破 ${fmt(fail)} 轉弱` : ""}`;
    else note = `偏弱：站回月線 ${fmt(m.ma20)} 才算止跌${m.lo20 ? `；再破 20 日低 ${fmt(m.lo20)} 要提高警覺` : ""}`;
    if (warn.length) note += `（${warn.join("、")}，留意拉回）`;
    return { code, score, tier: t, P, hasFund, price: m.price, support, fail, res, ma20: m.ma20, why, warn, note, f5: m.f5, ret5: m.ret5, rel20: m.rel20, date: m.dataDate };
  }
  let weekJob = null, weekLast = null;
  async function buildWeekly(onProg) {
    if (weekJob) return weekJob;
    weekJob = (async () => {
      try { await ensureInfo(); } catch (_) {}
      const all = allResolved(), list = all.map(r => ({ r }));
      const say = s => { try { onProg && onProg(s); } catch (_) {} };
      say(`📅 自選週檢：讀取 ${all.length} 檔…`);
      await Promise.all([loadBench().catch(() => {}), loadRealtime(list).catch(() => {})]);
      await loadDetails(list, (d, n) => say(`📅 自選週檢：日K／法人／EPS ${d}/${n}`)).catch(() => {});
      const stocks = all.filter(r => !/^00/.test(r.code)).map(r => r.code);
      let i = 0, done = 0;
      const w = async () => { while (i < stocks.length) { const c = stocks[i++]; try { await loadRev(c); } catch (e) { lastErr = "月營收：" + e.message; } done++; say(`📅 自選週檢：月營收 ${done}/${stocks.length}`); } };
      await Promise.all([w(), w(), w()]); saveCache();
      const rows = all.map(r => { const s = weekScore(r.code); return s ? { ...s, name: r.name, group: r.group } : null; }).filter(Boolean).sort((a, b) => b.score - a.score);
      const missing = all.filter(r => !rows.some(x => x.code === r.code)).map(r => r.name);
      const dataDate = rows.map(x => x.date).filter(Boolean).sort().pop() || ymd(tpNow());
      const wk = isoWeek(dataDate), k = marketMetrics();
      const snap = { wk, d: dataDate, at: Date.now(), taiex: k.taiex ?? null, items: rows.map(x => [x.code, x.name, x.score, x.tier, x.price, x.fail ?? null]) };
      cfg.weekly = [snap].concat((cfg.weekly || []).filter(s => s.wk !== wk)).sort((a, b) => a.wk < b.wk ? 1 : -1).slice(0, 10);
      saveCfg();
      const prev = cfg.weekly.find(s => s.wk < wk) || null;
      const pmap = prev ? Object.fromEntries(prev.items.map(x => [x[0], { name: x[1], score: x[2], tier: x[3], price: x[4], fail: x[5] }])) : {};
      rows.forEach(x => { const p = pmap[x.code]; x.prev = p || null; x.d = p ? x.score - p.score : null; x.wkRet = p ? pctOf(x.price, p.price) : null; x.brokeFail = !!(p && p.fail && x.price < p.fail); });
      // 上週成績單：上週分數前 10 與全部，到現在的漲跌，對照加權
      let card = null;
      if (prev) {
        const cur = Object.fromEntries(rows.map(x => [x.code, x.price]));
        const top = prev.items.slice(0, 10).filter(x => cur[x[0]] != null && x[4]).map(x => ({ name: x[1], r: pctOf(cur[x[0]], x[4]) }));
        const allR = prev.items.filter(x => cur[x[0]] != null && x[4]).map(x => pctOf(cur[x[0]], x[4]));
        const strong = prev.items.filter(x => x[3] === 2 && cur[x[0]] != null && x[4]).map(x => pctOf(cur[x[0]], x[4]));
        card = { wk: prev.wk, d: prev.d, top, topAvg: top.length ? avg(top.map(x => x.r)) : null, strongAvg: strong.length ? avg(strong) : null, strongN: strong.length, allAvg: allR.length ? avg(allR) : null, mkt: prev.taiex && k.taiex ? pctOf(k.taiex, prev.taiex) : null, win: top.filter(x => x.r > 0).length };
      }
      weekLast = { wk, d: dataDate, rows, prev, card, missing, total: all.length };
      return weekLast;
    })().finally(() => { weekJob = null; });
    return weekJob;
  }
  function weekGroups(W) {
    const R = W.rows;
    return {
      top: R.filter(x => x.tier >= 1).slice(0, 10),
      up: R.filter(x => x.prev && (x.d >= 15 || x.tier > x.prev.tier)).sort((a, b) => b.d - a.d).slice(0, 8),
      down: R.filter(x => x.prev && (x.d <= -15 || x.tier < x.prev.tier || x.brokeFail)).sort((a, b) => a.d - b.d).slice(0, 8),
      weak: R.filter(x => x.tier === 0 && !(x.prev && (x.d <= -15 || x.tier < x.prev.tier || x.brokeFail))).slice(-8).reverse(),
      hot: R.filter(x => x.warn.length)
    };
  }
  const dTxt = x => x.d == null ? "新" : (x.d > 0 ? "+" : "") + x.d;
  function weekText(W) {
    const G = weekGroups(W), ind = c => (cache.info?.byCode?.[c] || [])[2] || (/^00/.test(c) ? "ETF" : "");
    const L = x => `・${x.name}(${x.code}${ind(x.code) ? "，" + ind(x.code) : ""})：${x.score} 分（${TIER[x.tier]}，較上週 ${dTxt(x)}）｜趨勢${x.P.trend}/30 籌碼${x.P.chip}/30 動能${x.P.mom}/20 ${x.hasFund ? `基本面${x.P.fund}/20` : "基本面不計"}${x.P.pen ? ` 扣${-x.P.pen}` : ""}｜收 ${fmt(x.price)}${x.wkRet != null ? `，週漲跌 ${sgn(x.wkRet, 2)}` : ""}｜${x.why.join("、")}｜${x.note}`;
    const c = W.card;
    return `【澎企理財資料｜自選週檢 ${W.wk}（資料至 ${W.d} 收盤）｜全部由程式計算｜自選 ${W.total} 檔，可評分 ${W.rows.length} 檔】
評分方法：趨勢30（站上月線、月線在季線上、月線上彎）＋籌碼30（外資＋投信5日買超、外資連買天數、買超佔成交量比）＋動能20（RSI 50～70、MACD柱、K>D）＋基本面20（月營收YoY、近四季EPS與年增；ETF不計，按80分換算）；RSI≥80或離月線>10%各扣10分。70分以上＝強勢、45～69＝中性、44以下＝偏弱。
【本週觀察名單（45 分以上取前10；不足10檔就照實列，不硬湊）】
${G.top.map(L).join("\n") || "本週沒有 45 分以上的自選股"}
【較上週轉強】
${W.prev ? (G.up.map(L).join("\n") || "無") : "第一次週檢，下週起才有比較"}
【較上週轉弱（含跌破上週失效價）】
${W.prev ? (G.down.map(x => L(x) + (x.brokeFail ? `｜已跌破上週失效價 ${fmt(x.prev.fail)}` : "")).join("\n") || "無") : "第一次週檢，下週起才有比較"}
【偏弱名單】
${G.weak.map(L).join("\n") || "無"}
【上週成績單】
${c ? `上週（${c.wk}，${c.d}）分數前10：平均 ${sgn(c.topAvg, 2)}，上漲 ${c.win}/${c.top.length} 檔；上週強勢 ${c.strongN} 檔平均 ${sgn(c.strongAvg, 2)}；自選全部平均 ${sgn(c.allAvg, 2)}；同期加權 ${sgn(c.mkt, 2)}` : "還沒有上週紀錄"}
${W.missing.length ? `【資料不足未評分】${W.missing.join("、")}` : ""}
${marketText()}
【回答規則】第一行「重點：」一句 40 字內。接著依序：一、本週觀察名單（只照上面列的，不足10檔就說只有幾檔夠格；每檔一句：分數、最主要的加分原因、觀察價位，照上面的「觀察」文字）；二、本週變化（轉強、轉弱各點名，說明是哪一項分數變了）；三、需要留意（過熱、跌破失效價、偏弱名單）；四、上週成績單一句（照實說，好壞都說）；五、一句總結下週先看什麼。名單、分數、價位只能照上面，不可增減股票或改數字，不編造新聞與原因；措辭用「觀察／轉強／轉弱／檢視點」，不要寫買進、賣出、加碼、停損；最後一句說明這是依數據篩出的觀察名單，不是買賣建議。不用 Markdown 符號。`;
  }
  function weekHtml(W, busyMsg) {
    const head = `<div style="display:flex;justify-content:space-between;align-items:center;gap:6px;"><b style="font-size:17px;">📅 自選週檢${W ? ` ${W.wk.slice(5)}` : ""}</b><div style="display:flex;gap:6px;"><button type="button" class="pi-btn" id="piWkRe">重算</button><button type="button" class="pi-btn" id="piSheetClose">✕</button></div></div>`;
    if (!W) return `${head}<div class="pi-note" style="margin-top:10px;white-space:pre-line">${esc(busyMsg || "計算中…")}</div>`;
    const G = weekGroups(W);
    const row = x => `<div class="pi-edit-row" style="display:block;border-left:4px solid ${tierColor(x.tier)};padding-left:8px;" data-wkcode="${x.code}">
      <div style="display:flex;justify-content:space-between;"><b>${esc(x.name)} <small style="color:#7a8a83">${x.code}</small></b><b style="color:${tierColor(x.tier)}">${x.score} <small>${TIER[x.tier]}${x.d != null ? `｜${dTxt(x)}` : ""}</small></b></div>
      <div class="pi-note">趨勢 ${x.P.trend}/30・籌碼 ${x.P.chip}/30・動能 ${x.P.mom}/20・${x.hasFund ? `基本面 ${x.P.fund}/20` : "基本面不計"}${x.P.pen ? `・扣 ${-x.P.pen}` : ""}　收 ${fmt(x.price)}${x.wkRet != null ? ` <span style="color:${colorOf(x.wkRet)}">${sgn(x.wkRet, 2)}</span>` : ""}</div>
      <div style="font-size:13px;margin-top:2px;">${esc(x.note)}${x.brokeFail ? `<span style="color:#6fe06f">（已跌破上週失效價 ${fmt(x.prev.fail)}）</span>` : ""}</div></div>`;
    const sec = (t, arr, empty) => `<div class="pi-h">${t}</div>${arr.length ? arr.map(row).join("") : `<div class="pi-note">${empty}</div>`}`;
    const c = W.card;
    return `${head}
      <div class="pi-note" style="margin:6px 0;">資料至 ${W.d} 收盤｜自選 ${W.total} 檔，評分 ${W.rows.length} 檔。分數＝趨勢30＋籌碼30＋動能20＋基本面20（ETF 按 80 分換算），過熱扣分。70↑強勢、45～69 中性、44↓偏弱。</div>
      <div class="pi-h">📋 上週成績單</div><div class="pi-note">${c ? `上週（${c.wk.slice(5)}）前10 平均 <b style="color:${colorOf(c.topAvg)}">${sgn(c.topAvg, 2)}</b>，上漲 ${c.win}/${c.top.length}；自選全部 ${sgn(c.allAvg, 2)}；同期加權 <b style="color:${colorOf(c.mkt)}">${sgn(c.mkt, 2)}</b>` : "第一次週檢。下週同一時間再看，就會出現上週名單的實際成績。"}</div>
      ${sec(`🔴 本週觀察名單（45 分以上前 10，共 ${G.top.length} 檔）`, G.top, "本週沒有 45 分以上的自選股")}
      ${W.prev ? sec("⬆ 較上週轉強", G.up, "無明顯轉強") + sec("⬇ 較上週轉弱", G.down, "無明顯轉弱") : ""}
      ${sec("🟢 偏弱（上面已列的不重複）", G.weak, "無")}
      ${W.missing.length ? `<div class="pi-note" style="margin-top:8px;">資料不足未評分：${esc(W.missing.join("、"))}</div>` : ""}
      <button type="button" class="pi-btn" id="piWkAsk" style="width:100%;margin-top:12px;background:#10251f;border-color:#5eead4;color:#d9fff0;">🐿 請 Teddy 說明這週變化</button>
      <div class="pi-note" style="margin-top:8px;">分數與價位全部由程式依證交所／FinMind 資料計算；是依數據篩出的觀察名單，不是買賣建議。每次計算都會存成當週快照，下週自動對照。</div>`;
  }
  const isWeekQ = t => /週檢|週報|自選週|每週(評分|變化|整理|名單)/.test(t) || (/(本週|這週|這禮拜|下週|下禮拜|每週|一週)/.test(t) && /(評分|變化|名單|觀察|強弱|建議|推薦|排名|檢查|總結|整理|怎麼看|重點|關注|哪幾檔|\d+\s*檔|十檔)/.test(t));
  window.teddyInvestWeekly = async onProg => weekText(await buildWeekly(onProg));
  // ---------- 8.0 分析紀錄：記下當時價格，之後可以回頭對照 ----------
  let lastQueryCodes = [];
  window.teddyInvestLogAnalysis = function (q, reply) {
    try {
      const items = lastQueryCodes.slice(0, 40).map(x => ({ code: x.code, name: x.name, p: metrics(x.code).price })).filter(x => x.p != null);
      const brief = (String(reply).match(/重點[:：]\s*([^\n]{2,90})/) || [])[1] || String(reply).replace(/\s+/g, " ").slice(0, 80);
      cfg.log.unshift({ t: Date.now(), d: ymd(tpNow()), q: String(q).slice(0, 80), brief, items, mkt: marketMetrics().taiex });
      cfg.log = cfg.log.slice(0, 80); saveCfg();
    } catch (_) {}
  };
  function logHtml() {
    const k = marketMetrics();
    const rows = cfg.log.map((e, i) => {
      const its = e.items.slice(0, 8).map(x => { const now = metrics(x.code).price, ch = pctOf(now, x.p); return `${esc(x.name)} ${fmt(x.p)}→${now == null ? "—" : fmt(now)} <b style="color:${colorOf(ch)}">${sgn(ch)}</b>`; }).join("、");
      return `<div class="pi-edit-row" style="display:block"><div style="font-size:12px;color:#7a8a83;">${e.d}　${esc(e.q)}${e.mkt && k.taiex ? `　加權 ${sgn(pctOf(k.taiex, e.mkt))}` : ""}</div><div style="font-size:13px;margin:3px 0;">${esc(e.brief)}</div><div class="pi-note">${its || "（無個股）"}</div></div>`;
    }).join("");
    return `<div style="display:flex;justify-content:space-between;align-items:center;"><b style="font-size:17px;">🗂 分析紀錄</b><div style="display:flex;gap:6px;"><button type="button" class="pi-btn" id="piLogUpd">更新現價</button><button type="button" class="pi-btn" id="piSheetClose">✕</button></div></div>
      <div class="pi-note" style="margin:6px 0;">每次 Teddy 分析都記下當時價格；這裡對照到現在的漲跌，讓你檢查她的判斷，不是績效保證。</div>${rows || '<div class="pi-note">還沒有紀錄。</div>'}${cfg.log.length ? '<button type="button" class="pi-x" id="piLogClr" style="margin-top:10px">清除紀錄</button>' : ""}`;
  }
  window.teddyInvestHasData = () => !!cache.info;
  // 問到自選股時先補最新資料（單檔讀完整深入資料；群組最多等 25 秒），再組成給 Teddy 的資料。
  window.teddyInvestQuery = async function (message) {
    try { await ensureInfo(); } catch (_) {}
    const tq = String(message || "");
    if (isWeekQ(tq)) {
      const W = await Promise.race([buildWeekly(window.__teddyInvestProgress), new Promise(r => setTimeout(() => r(null), 90000))]);
      if (!W) return "【澎企理財】自選週檢資料還在讀取（自選股多、超過 90 秒），請照實告訴使用者稍後到澎企理財按「📅 週檢」再看，不要自己列名單。";
      lastQueryCodes = W.rows.slice(0, 10).map(x => ({ code: x.code, name: x.name }));
      return weekText(W);
    }
    if (isRecoQ(tq) && !investHits(tq).length) {
      lastQueryCodes = [];
      const all = allResolved(), list = all.map(r => ({ r }));
      await Promise.race([(async () => { try { await loadRank(); } catch (_) {} try { await loadRealtime(list); } catch (_) {} try { await loadDetails(list); } catch (_) {} })(), new Promise(r => setTimeout(r, 25000))]);
      const ind = c => (cache.info?.byCode?.[c] || [])[2] || (/^00/.test(c) ? "ETF" : "未分類");
      let rk = "外資排行：無資料";
      if (rankData) { const { buy } = rankLists({ n: 15, who: "foreign", dir: "buy", mkt: "all", byAmt: true, etf: "exclude" }); rk = buy.map((r, i) => `${i + 1}. ${r.name}(${r.code}，${ind(r.code)}) 外資買超約 ${fmt(r.foreign * (r.close || 0) / 1e8, 2)} 億（${fmtInt(r.foreign / 1000)}張）`).join("\n"); }
      const ms = all.map(r => ({ r, m: metrics(r.code) })).filter(x => x.m.price != null && x.m.ma20);
      const strong = ms.filter(x => x.m.price >= x.m.ma20 && (x.m.f5 ?? 0) > 0).sort((a, b) => (b.m.rel20 ?? b.m.ret20 ?? 0) - (a.m.rel20 ?? a.m.ret20 ?? 0)).slice(0, 8);
      return `【澎企理財資料｜觀察名單（程式依條件篩選）｜${rankData ? rankData.date : ""}】
【A. 全市場外資買超金額前15（不含ETF）】
${rk}
【B. 自選中相對強勢（站上月線＋外資5日買超，依20日相對大盤排序）】
${strong.map(x => `・${x.r.name}(${x.r.code}，${ind(x.r.code)})：收 ${fmt(x.m.price)}、月線 ${fmt(x.m.ma20)}、20日相對大盤 ${sgn(x.m.rel20)}、外資5日 ${fmtInt(x.m.f5)}張`).join("\n") || "無"}
${marketText()}
【回答規則】使用者在問可以關注哪些股票。只能從 A、B 名單挑，股票名稱與產業照上面寫，不可自己補其他股票或改產業；先說篩選條件（外資買超金額、站上月線等），再依使用者問的方向挑 3～5 檔並各說一句理由（引用數字）；最後一定要說：這是依今天數據篩出的觀察名單，不是買進建議，崩盤日要特別注意波動與部位大小。第一行寫「重點：」一句 40 字內。不用 Markdown 符號。`;
    }
    if (isReportQ(tq)) { lastQueryCodes = []; return await buildReport(window.__teddyInvestProgress); }
    if (isMarketQ(tq) && !investHits(tq).length && !parseRank(tq)) {
      lastQueryCodes = [];
      await Promise.race([loadMarket().catch(() => {}), new Promise(r => setTimeout(r, 15000))]);
      return `【澎企理財資料｜大盤｜程式從證交所與 FinMind 讀取計算】\n${marketText()}\n${MARKET_RULES}`;
    }
    const rp = parseRank(message);
    if (rp) {
      try { await loadRank(); } catch (e) { return `【澎企理財】法人排行讀取失敗：${e.message}。請照實告訴使用者讀不到，不要自己列名單。`; }
      return `【澎企理財資料｜三大法人排行，程式從證交所／櫃買中心讀取並排序】\n${rankText(rp)}\n【規則】名單、張數、金額照上面原樣，不可增刪或改數字。可以解讀資金集中在哪些產業、買賣超是否集中少數權值股，但不可編造原因或新聞；沒有資料的就說沒有。不預測漲跌、不叫使用者買賣。第一行寫「重點：」一句 40 字內總結。不用 Markdown 符號。`;
    }
    const hits = investHits(message);
    if (!hits.length) return "";
    lastQueryCodes = hits.map(r => ({ code: r.code, name: r.name }));
    const list = hits.map(r => ({ r }));
    const job = (async () => {
      try { await loadRealtime(list); } catch (_) {}
      try { await loadDetails(list); } catch (_) {}
      try { await loadDeep(hits.length <= 4 ? hits.map(r => r.code) : (() => { const ms = hits.map(r => ({ r, p: metrics(r.code).pct })).filter(x => x.p != null).sort((a, b) => b.p - a.p); return [...ms.slice(0, 2), ...ms.slice(-2)].map(x => x.r.code); })()); } catch (_) {}
    })();
    await Promise.race([job, new Promise(r => setTimeout(r, hits.length <= 4 ? 20000 : 25000))]);
    try { if (root.style.display === "flex") render(); } catch (_) {}
    return window.teddyInvestContext(message);
  };

  function askTeddy(text) {
    const sendBtn = document.getElementById("teddyChatSend");
    if (sendBtn && sendBtn.disabled) { $("piStatus").textContent = "⏳ 上一題 Teddy 還在分析，等她回答完再按"; return; }
    closePanel();
    try { if (typeof window.setUiMode === "function" && window.TEDDY_APP_MODE === "greenhouse") window.setUiMode("general"); } catch (_) {}
    const tp = document.getElementById("teddyPanel"); if (tp && getComputedStyle(tp).display === "none") document.getElementById("teddyIsland")?.click();
    const inp = document.getElementById("teddyChatInput"), btn = document.getElementById("teddyChatSend");
    if (!inp || !btn) return;
    inp.value = text; btn.click();
  }

  // ---------- 事件 ----------
  $("piBack").onclick = closePanel;
  $("piRefresh").onclick = () => { const g = cfg.groups[cfg.active]; groupItems(g).forEach(({ r }) => { if (r) { delete cache.daily[r.code]; delete cache.inst[r.code]; delete cache.mg[r.code]; delete cache.per[r.code]; } }); refresh(true); };
  $("piGroup").onchange = e => { cfg.active = +e.target.value; saveCfg(); closeSheet(); rt = {}; render(); refresh(); };
  $("piEdit").onclick = () => { openSheet(editHtml()); bindEdit(); };
  $("piBody").onclick = e => {
    const tr = e.target.closest("tr"); if (!tr) return;
    const g = cfg.groups[cfg.active], it = g.items[+tr.dataset.idx], r = resolve(it);
    if (!r) { openSheet(editHtml()); bindEdit(); return; }
    const show = () => {
      openSheet(detailHtml(it, r)); $("piSheet").dataset.code = r.code; renderChart(r);
      $("piSheetClose").onclick = closeSheet;
      $("piAskOne").onclick = () => askTeddy(`分析 ${r.name}（${r.code}）`);
      $("piPosSave").onclick = () => {
        const c = parseFloat($("piPosCost").value), sh = parseInt($("piPosSh").value, 10);
        if (sh > 0) cfg.pos[r.code] = { cost: c > 0 ? c : null, shares: sh }; else delete cfg.pos[r.code];
        saveCfg(); const st = $("piSheet").scrollTop; show(); $("piSheet").scrollTop = st; render();
      };
    };
    show();
    loadDeep([r.code]).then(() => { if ($("piSheet").style.display === "block" && $("piSheet").dataset.code === r.code) { const st = $("piSheet").scrollTop; show(); $("piSheet").scrollTop = st; } render(); });
  };
  $("piAskGroup").onclick = () => askTeddy(`分析「${cfg.groups[cfg.active].name}」這組`);
  $("piStatus").style.cursor = "pointer";
  $("piStatus").onclick = () => { if (!Object.keys(errs).length) return; openSheet(errHtml()); $("piSheet").dataset.code = "__err"; $("piSheetClose").onclick = closeSheet; };
  $("piReport").onclick = () => askTeddy("今天盤後報告");
  $("piMkt").onclick = () => {
    const show = () => { openSheet(marketHtml()); $("piSheet").dataset.code = "__mkt"; $("piSheetClose").onclick = closeSheet; $("piAskMkt").onclick = () => askTeddy("今天大盤怎麼看"); };
    show(); loadMarket().then(() => { if ($("piSheet").style.display === "block" && $("piSheet").dataset.code === "__mkt") show(); renderMarket(); });
  };
  $("piLog").onclick = () => {
    const show = () => { openSheet(logHtml()); $("piSheet").dataset.code = "__log"; $("piSheetClose").onclick = closeSheet;
      $("piLogUpd").onclick = async () => { const codes = [...new Set(cfg.log.flatMap(e => e.items.map(x => x.code)))]; const list = codes.map(c => ({ r: { code: c, type: cache.info?.byCode?.[c]?.[1] || "twse" } })); try { await loadRealtime(list); } catch (_) {} try { await loadMarket(); } catch (_) {} show(); };
      const clr = $("piLogClr"); if (clr) clr.onclick = () => { if (confirm("清除全部分析紀錄？")) { cfg.log = []; saveCfg(); show(); } }; };
    show();
  };
  $("piAskAll").onclick = () => askTeddy(`「${cfg.groups[cfg.active].name}」今天重點`);
  $("piWeek").onclick = () => {
    const open = (W, msg) => {
      openSheet(weekHtml(W, msg)); $("piSheet").dataset.code = "__week"; $("piSheetClose").onclick = closeSheet;
      $("piWkRe").onclick = () => run();
      const a = $("piWkAsk"); if (a) a.onclick = () => askTeddy("自選週檢：說明這週變化與觀察名單");
    };
    const run = () => {
      open(null, "計算中…");
      buildWeekly(m => { if ($("piSheet").style.display === "block" && $("piSheet").dataset.code === "__week") open(null, m); })
        .then(W => { if ($("piSheet").style.display === "block" && $("piSheet").dataset.code === "__week") open(W); render(); })
        .catch(e => open(null, "週檢失敗：" + e.message));
    };
    if (weekLast && Date.now() - (cfg.weekly[0]?.at || 0) < 3 * 3600e3) open(weekLast); else run();
  };

  // 一般模式的入口按鈕
  const entry = document.getElementById("btnPongchiInvest");
  if (entry) entry.onclick = () => window.teddyInvestOpen();
  // 測試用
  window.__pi = { weekScore, buildWeekly, weekText, isWeekQ, isoWeek, alertsOf, marketMetrics, buildReport, metrics, resolve, cfg: () => cfg, cache: () => cache, setRt: (o) => { rt = o; rtAt = new Date().toISOString(); }, stale, render };
})();

