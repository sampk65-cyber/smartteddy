// Smart Teddy 7.2.0「澎企理財」資料轉接（Vercel Serverless Function）
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
  "TaiwanStockMarginPurchaseShortSale"
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

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "x-finmind-token, content-type");
  if (req.method === "OPTIONS") return res.status(204).end();
  const q = req.query || {};
  try {
    if (q.type === "rt") {
      const ex = String(q.ex || "").split("|").map(s => s.trim()).filter(s => /^(tse|otc)_[0-9A-Z]{4,6}\.tw$/i.test(s)).slice(0, 200);
      if (!ex.length) return res.status(400).json({ ok: false, error: "沒有代號" });
      let quotes = [], warn = null;
      try { quotes = await misQuotes(ex); } catch (e) { warn = "MIS：" + e.message; }
      const got = new Set(quotes.filter(x => x.price != null).map(x => x.code));
      const missing = ex.map(s => s.split("_")[1].replace(/\.tw$/i, "")).filter(c => !got.has(c));
      if (missing.length) {
        const mk = Object.fromEntries(ex.map(s => [s.split("_")[1].replace(/\.tw$/i, ""), s.startsWith("otc") ? "TWO" : "TW"]));
        const y = await yahooQuotes([...new Set(missing)].map(c => `${c}.${mk[c]}`));
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
      return res.status(200).json({ ok: d.status === 200 || Array.isArray(d.data), msg: d.msg, data: d.data || [] });
    }
    return res.status(400).json({ ok: false, error: "type 必須是 rt 或 fm" });
  } catch (e) {
    return res.status(502).json({ ok: false, error: String(e && e.message || e) });
  }
}
