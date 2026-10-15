// Smart Teddy 8.1.1「澎企理財」資料轉接（Vercel Serverless Function）
// 放在 smartteddy 專案的 api/stock.js，網址：/api/stock
// 只做「讀取」：證交所即時行情（MIS）、FinMind 公開資料、Yahoo 備援。不碰任何帳戶、不下單。
// 選用：在 Vercel → Settings → Environment Variables 設 FINMIND_TOKEN（免費註冊 FinMind 取得），額度較高。

const UA = "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128 Mobile Safari/537.36";
const FM_DATASETS = new Set([
  "TaiwanStockInfo",
  "TaiwanStockPrice",
  "TaiwanStockInstitutionalInvestorsBuySell",
  "TaiwanStockFinancialStatements",
  "TaiwanStockPER",
  "TaiwanStockDividend",
  "TaiwanStockMonthRevenue",
  "TaiwanStockMarginPurchaseShortSale",
  "TaiwanStockShareholding",
  "TaiwanStockTotalInstitutionalInvestors",
  "TaiwanStockTotalMarginPurchaseShortSale",
  "TaiwanFuturesInstitutionalInvestors"
]);

async function getJson(url, headers = {}, ms = 12000) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), ms);
  try {
    const r = await fetch(url, { headers: { "User-Agent": UA, "Accept": "application/json,text/plain,*/*", ...headers }, signal: ac.signal });
    const text = await r.text();
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return JSON.parse(text);
  } finally { clearTimeout(t); }
}

const num = v => { const n = parseFloat(String(v ?? "").replace(/,/g, "")); return Number.isFinite(n) ? n : null; };
const firstQuote = s => { const x = String(s || "").split("_").find(v => v && v !== "-"); return num(x); };

// 證交所 MIS 即時行情：ex 例如 "tse_2330.tw|otc_3105.tw"
async function misQuotes(exList) {
  const out = [];
  for (let i = 0; i < exList.length; i += 40) {
    const ex = exList.slice(i, i + 40).join("|");
    const url = `https://mis.twse.com.tw/stock/api/getStockInfo.jsp?ex_ch=${encodeURIComponent(ex)}&json=1&delay=0&_=${Date.now()}`;
    const d = await getJson(url, { Referer: "https://mis.twse.com.tw/stock/index.jsp" });
    for (const m of d.msgArray || []) {
      const last = num(m.z) ?? firstQuote(m.b) ?? firstQuote(m.a);
      out.push({
        code: m.c, name: m.n, market: m.ex, price: last, lastTrade: num(m.z),
        prev: num(m.y), open: num(m.o), high: num(m.h), low: num(m.l),
        vol: num(m.v), limitUp: num(m.u), limitDown: num(m.w),
        time: m.t || null, date: m.d || null, src: "TWSE MIS"
      });
    }
  }
  return out;
}

// Yahoo 備援（MIS 失敗時）：symbols 例如 "2330.TW,3105.TWO"
async function yahooQuotes(symbols) {
  const out = [];
  const one = async sym => {
    try {
      const d = await getJson(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?range=1d&interval=1d`, {}, 8000);
      const m = d?.chart?.result?.[0]?.meta; if (!m) return;
      out.push({ code: sym.split(".")[0], name: null, price: num(m.regularMarketPrice), prev: num(m.chartPreviousClose ?? m.previousClose),
        high: num(m.regularMarketDayHigh), low: num(m.regularMarketDayLow), vol: m.regularMarketVolume != null ? Math.round(m.regularMarketVolume / 1000) : null,
        time: m.regularMarketTime ? new Date(m.regularMarketTime * 1000).toISOString() : null, src: "Yahoo" });
    } catch (_) {}
  };
  for (let i = 0; i < symbols.length; i += 8) await Promise.all(symbols.slice(i, i + 8).map(one));
  return out;
}


// ---- 三大法人全市場排行：證交所 T86（上市）＋櫃買中心（上櫃）----
const pickIdx = (fields, re) => (fields || []).findIndex(x => re.test(String(x).replace(/\s/g, "")));
async function twseT86(ymd) {
  const d = await getJson(`https://www.twse.com.tw/rwd/zh/fund/T86?date=${ymd}&selectType=ALLBUT0999&response=json`, { Referer: "https://www.twse.com.tw/" }, 15000);
  if (d.stat !== "OK" || !Array.isArray(d.data) || !d.data.length) return null;
  const f = d.fields || [];
  const iF = pickIdx(f, /^外陸資買賣超股數/), iFD = pickIdx(f, /^外資自營商買賣超股數/), iT = pickIdx(f, /^投信買賣超股數/), iD = pickIdx(f, /^自營商買賣超股數$/), iA = pickIdx(f, /三大法人買賣超股數/);
  if (iF < 0 || iA < 0) return null;
  return d.data.map(r => ({ code: String(r[0]).trim(), name: String(r[1]).trim(), market: "twse",
    foreign: (num(r[iF]) || 0) + (iFD >= 0 ? num(r[iFD]) || 0 : 0), trust: iT >= 0 ? num(r[iT]) : null, dealer: iD >= 0 ? num(r[iD]) : null, total: num(r[iA]) }));
}
async function tpexInsti(ymd) {
  const ds = `${ymd.slice(0, 4)}/${ymd.slice(4, 6)}/${ymd.slice(6, 8)}`;
  const d = await getJson(`https://www.tpex.org.tw/www/zh-tw/insti/dailyTrade?type=Daily&sect=EW&date=${encodeURIComponent(ds)}&id=&response=json`, { Referer: "https://www.tpex.org.tw/" }, 15000);
  const t = (d.tables || [])[0]; if (!t || !Array.isArray(t.data) || !t.data.length) return null;
  const f = t.fields || [];
  const iF = pickIdx(f, /外資及陸資.*不含.*買賣超/), iFD = pickIdx(f, /^外資自營商.*買賣超/), iT = pickIdx(f, /^投信.*買賣超/), iD = pickIdx(f, /^自營商-?買賣超/), iA = pickIdx(f, /三大法人.*買賣超/);
  if (iF < 0) return null;
  return t.data.map(r => ({ code: String(r[0]).trim(), name: String(r[1]).trim(), market: "tpex",
    foreign: (num(r[iF]) || 0) + (iFD >= 0 ? num(r[iFD]) || 0 : 0), trust: iT >= 0 ? num(r[iT]) : null, dealer: iD >= 0 ? num(r[iD]) : null, total: iA >= 0 ? num(r[iA]) : null }));
}
async function closesAll() {
  const m = {};
  try { for (const r of await getJson("https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_ALL", {}, 15000)) { const c = num(r.ClosingPrice); if (c) m[String(r.Code).trim()] = c; } } catch (_) {}
  try { for (const r of await getJson("https://www.tpex.org.tw/openapi/v1/tpex_mainboard_daily_close_quotes", {}, 15000)) { const c = num(r.Close); if (c) m[String(r.SecuritiesCompanyCode).trim()] = c; } } catch (_) {}
  return m;
}
async function instiRank() {
  const now = new Date(Date.now() + 8 * 3600e3);
  for (let back = 0; back < 8; back++) {
    const d = new Date(now.getTime() - back * 864e5);
    if (d.getUTCDay() === 0 || d.getUTCDay() === 6) continue;
    const ymd = `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(d.getUTCDate()).padStart(2, "0")}`;
    let tw = null; try { tw = await twseT86(ymd); } catch (_) {}
    if (!tw) continue;
    let tp = null, tpErr = null; try { tp = await tpexInsti(ymd); } catch (e) { tpErr = e.message; }
    const closes = await closesAll();
    const rows = tw.concat(tp || []).map(r => ({ ...r, close: closes[r.code] ?? null }));
    return { date: `${ymd.slice(0, 4)}-${ymd.slice(4, 6)}-${ymd.slice(6, 8)}`, rows, tpex: !!tp, warn: tp ? null : ("上櫃資料未取得" + (tpErr ? "：" + tpErr : "")) };
  }
  throw new Error("近一週都讀不到三大法人資料");
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "x-finmind-token, content-type");
  if (req.method === "OPTIONS") return res.status(204).end();
  const q = req.query || {};
  try {
    if (q.type === "rt") {
      const ex = String(q.ex || "").split("|").map(s => s.trim()).filter(s => /^(tse|otc)_[0-9A-Za-z]{3,6}\.tw$/i.test(s)).slice(0, 200);
      if (!ex.length) return res.status(400).json({ ok: false, error: "沒有代號" });
      let quotes = [], warn = null;
      try { quotes = await misQuotes(ex); } catch (e) { warn = "MIS：" + e.message; }
      const got = new Set(quotes.filter(x => x.price != null).map(x => x.code));
      const missing = ex.map(s => s.split("_")[1].replace(/\.tw$/i, "")).filter(c => !got.has(c));
      if (missing.length) {
        const mk = Object.fromEntries(ex.map(s => [s.split("_")[1].replace(/\.tw$/i, ""), s.startsWith("otc") ? "TWO" : "TW"]));
        const IDX = { t00: "^TWII", o00: "^TWOII" };
        const y = (await yahooQuotes([...new Set(missing)].map(c => IDX[c] || `${c}.${mk[c]}`))).map(q => ({ ...q, code: q.code === "^TWII" ? "t00" : q.code === "^TWOII" ? "o00" : q.code }));
        quotes = quotes.filter(x => x.price != null).concat(y);
      }
      res.setHeader("Cache-Control", "s-maxage=10, stale-while-revalidate=20");
      return res.status(200).json({ ok: true, at: new Date().toISOString(), quotes, warn });
    }
    if (q.type === "fm") {
      const ds = String(q.dataset || "");
      if (!FM_DATASETS.has(ds)) return res.status(400).json({ ok: false, error: "不支援的資料集" });
      const p = new URLSearchParams({ dataset: ds });
      if (q.data_id) p.set("data_id", String(q.data_id).replace(/[^0-9A-Za-z]/g, "").slice(0, 8));
      if (q.start_date) p.set("start_date", String(q.start_date).slice(0, 10));
      if (q.end_date) p.set("end_date", String(q.end_date).slice(0, 10));
      const token = process.env.FINMIND_TOKEN || req.headers["x-finmind-token"] || "";
      const d = await getJson(`https://api.finmindtrade.com/api/v4/data?${p}`, token ? { Authorization: `Bearer ${token}` } : {}, 20000);
      const long = ds === "TaiwanStockInfo" || ds === "TaiwanStockFinancialStatements" || ds === "TaiwanStockDividend";
      res.setHeader("Cache-Control", long ? "s-maxage=43200, stale-while-revalidate=86400" : "s-maxage=1800, stale-while-revalidate=3600");
      const okFm = d.status === 200 || (Array.isArray(d.data) && d.data.length > 0);
      return res.status(200).json({ ok: okFm, error: okFm ? null : `FinMind：${d.msg || "沒有資料"}`, msg: d.msg, data: d.data || [] });
    }
    if (q.type === "ver") return res.status(200).json({ ok: true, ver: "8.1.1" });
    if (q.type === "yh") {
      const sym = String(q.sym || "").replace(/[^0-9A-Za-z.^]/g, "").slice(0, 12);
      const range = /^(1d|5d|1mo|3mo|6mo|1y|2y|5y)$/.test(q.range) ? q.range : "1d";
      const interval = /^(1m|2m|5m|15m|30m|60m|1d|1wk)$/.test(q.interval) ? q.interval : "5m";
      let d = null, lastE = null;
      for (const host of ["query2", "query1"]) {
        try { d = await getJson(`https://${host}.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?range=${range}&interval=${interval}`, { Referer: "https://finance.yahoo.com/" }, 10000); break; }
        catch (e) { lastE = e; }
      }
      if (!d) return res.status(200).json({ ok: false, error: /429/.test(String(lastE?.message)) ? "Yahoo 暫時限制讀取次數（429），稍後再試" : "Yahoo：" + (lastE?.message || "讀不到") });
      const r = d?.chart?.result?.[0];
      if (!r) return res.status(200).json({ ok: false, error: "Yahoo 沒有這檔的走勢資料" });
      const c = r.indicators?.quote?.[0]?.close || [];
      const pts = (r.timestamp || []).map((t, i) => [t, c[i]]).filter(x => x[1] != null);
      res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=120");
      return res.status(200).json({ ok: true, prev: r.meta?.chartPreviousClose ?? r.meta?.previousClose ?? null, pts });
    }
    if (q.type === "rank") {
      const r = await instiRank();
      res.setHeader("Cache-Control", "s-maxage=900, stale-while-revalidate=1800");
      return res.status(200).json({ ok: true, ...r });
    }
    return res.status(400).json({ ok: false, error: "type 必須是 rt、fm、rank、yh 或 ver" });
  } catch (e) {
    return res.status(502).json({ ok: false, error: String(e && e.message || e) });
  }
}
