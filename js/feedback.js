/* Smart Teddy 8.7.0 · js/feedback.js：回饋紀錄（答對／答錯），給孫爸與 Claude 檢討用
   載入順序：js/core.js → js/greenhouse.js → js/live.js → js/invest.js → js/feedback.js
   來源：一般聊天 👍／👎 按鈕、打字「答對了／答錯了，應該是…」、語音（teddy_feedback 工具）、溫室模式原有的答對答錯。
   儲存：本機（最多 500 筆）＋ Teddy 自己的 Firebase（teddy_memory 文件的 feedbackLog，最多 200 筆精簡版）。絕不寫進完全體。
   匯出：「📤 回饋紀錄」或打字「匯出回饋」→ 下載 teddy-feedback-日期.md，把檔案傳給 Claude 即可。 */
(() => {
  "use strict";
  const KEY = "teddy_feedback_v1" + (window.TEDDY_KEY_SUFFIX || "");
  const MAX_LOCAL = 500, MAX_CLOUD = 200;
  const ver = () => (typeof TEDDY_VERSION !== "undefined" ? TEDDY_VERSION : "Smart Teddy");
  const now = () => Date.now();
  const clip = (s, n) => { s = String(s || "").replace(/\s+\n/g, "\n").trim(); return s.length > n ? s.slice(0, n) + "…" : s; };
  const load = () => { try { const v = JSON.parse(localStorage.getItem(KEY) || "null"); if (v && Array.isArray(v.items)) return v; } catch (_) {} return { items: [], updatedAt: 0 }; };
  let fb = load(), lastTurn = null, cloudT = null;

  function save() {
    fb.updatedAt = now();
    if (fb.items.length > MAX_LOCAL) fb.items = fb.items.slice(-MAX_LOCAL);
    try { localStorage.setItem(KEY, JSON.stringify(fb)); } catch (_) { fb.items = fb.items.slice(-200); try { localStorage.setItem(KEY, JSON.stringify(fb)); } catch (_) {} }
    clearTimeout(cloudT); cloudT = setTimeout(pushCloud, 2000);
  }
  function db() { try { return typeof teddyEnsureFirebase === "function" && teddyEnsureFirebase() && window.firebase?.firestore ? firebase.firestore() : null; } catch (_) { return null; } }
  function docId() { try { return typeof teddyGetMemoryDocId === "function" ? teddyGetMemoryDocId() : null; } catch (_) { return null; } }
  async function pushCloud() {
    const d = db(), id = docId(); if (!d || !id) return;
    const items = fb.items.slice(-MAX_CLOUD).map(x => ({ ...x, q: clip(x.q, 200), a: clip(x.a, 400), correction: clip(x.correction, 200) }));
    try { await d.collection("teddy_memory").doc(id).set({ feedbackLog: { items, updatedAt: fb.updatedAt } }, { merge: true }); } catch (e) { console.warn("回饋紀錄雲端同步失敗", e.message); }
  }
  async function pullCloud() {
    const d = db(), id = docId(); if (!d || !id) return;
    try {
      const doc = await d.collection("teddy_memory").doc(id).get();
      const c = doc.exists ? (doc.data() || {}).feedbackLog : null;
      if (!c || !Array.isArray(c.items)) return;
      const have = new Set(fb.items.map(x => x.id)); let added = 0;
      for (const x of c.items) if (x && x.id && !have.has(x.id)) { fb.items.push(x); added++; }
      if (added) { fb.items.sort((a, b) => a.at - b.at); try { localStorage.setItem(KEY, JSON.stringify(fb)); } catch (_) {} }
    } catch (_) {}
  }

  function modelOf(provider) {
    try {
      if (provider === "anthropic") return window.__teddyLastClaudeModel || "claude-sonnet-5-5";
      if (provider === "openai") return typeof teddyDeepOpenAIModel === "function" ? teddyDeepOpenAIModel() : "gpt-6.1-sol";
      if (provider === "gemini") return "gemini-3.6-flash";
      if (provider === "grok") return window.TEDDY_GROK_ACTIVE_MODEL || "grok-4.6";
    } catch (_) {}
    return provider || "";
  }
  // 記下「這一題」，之後的答對／答錯都對到它
  function turn(t) {
    const x = { id: now().toString(36) + Math.random().toString(36).slice(2, 6), at: now(), version: ver(), entry: window.TEDDY_ENTRY_ID || "owner", ...t };
    if (x.provider && !x.model) x.model = modelOf(x.provider);
    lastTurn = x; return x;
  }
  function record(t, verdict, correction, via) {
    if (!t) return null;
    const item = { id: t.id || (now().toString(36) + Math.random().toString(36).slice(2, 6)), at: t.at || now(), fbAt: now(), version: t.version || ver(), entry: t.entry || window.TEDDY_ENTRY_ID || "owner",
      mode: t.mode || "一般", q: clip(t.q, 1200), a: clip(t.a, 1500), provider: t.provider || "", model: t.model || "", deep: !!t.deep, deepReason: t.deepReason || "",
      ghEntry: t.ghEntry || "", canonical: t.canonical || "", verdict, correction: clip(correction, 400), via: via || "" };
    fb.items = fb.items.filter(x => x.id !== item.id); fb.items.push(item); save();
    return item;
  }

  // 一般聊天：每則回答下面的 👍／👎
  function attach(div, t) {
    if (!div || !t || !t.a) return;
    const tt = turn(t);
    const row = document.createElement("div");
    row.className = "teddy-fb-row";
    row.style.cssText = "display:flex;gap:6px;align-items:center;margin:4px 0 2px;font-size:12px;color:#6b7a74;";
    const mk = (label, title) => { const b = document.createElement("button"); b.type = "button"; b.textContent = label; b.title = title; b.style.cssText = "background:none;border:1px solid #2a3532;color:#8a9a92;border-radius:6px;padding:1px 8px;font-size:12px;cursor:pointer;"; return b; };
    const up = mk("👍", "答對了"), down = mk("👎", "答錯了"), note = document.createElement("span");
    const done = (txt) => { up.disabled = down.disabled = true; up.style.opacity = down.style.opacity = ".45"; note.textContent = txt; };
    up.onclick = () => { record(tt, "對", "", "按鈕"); done("已記錄：答對 ✓"); };
    down.onclick = () => {
      const c = prompt("哪裡不對？正確應該是什麼？（可以空白）", "");
      if (c === null) return;
      record(tt, "錯", c, "按鈕"); done("已記錄：答錯" + (c ? "（含更正）" : ""));
    };
    row.append(up, down, note); div.appendChild(row);
  }

  // 打字回饋：「答對了」「答錯了，應該是…」「不對，…」；「匯出回饋」
  function typed(text) {
    const s = String(text || "").trim().replace(/[。！!～~]+$/, "");
    if (/^(?:匯出|導出|下載)(?:回饋|回饋紀錄|答對答錯|學習紀錄)(?:給\s*claude)?$/i.test(s)) { exportMd(true); return "好，回饋紀錄已經匯出成檔案（teddy-feedback-日期.md），把它傳給 Claude 就可以。"; }
    let verdict = null, corr = "";
    if (/^(?:答對了?|答得對|正確|沒錯|就是這個|答得好|這次對了)$/.test(s)) verdict = "對";
    else { const m = s.match(/^(?:答錯了?|錯了|不對|不正確|答得不對)(?:[，,。：:\s]+(.*))?$/); if (m) { verdict = "錯"; corr = m[1] || ""; } }
    if (!verdict) return null;
    if (!lastTurn || now() - lastTurn.at > 30 * 60 * 1000) return "我找不到剛才那一題（超過 30 分鐘或還沒回答過），這句回饋先不記。";
    record(lastTurn, verdict, corr, "打字");
    return verdict === "對" ? "好，記下來了：這題答對 ✓" : (corr ? "收到，記為答錯，也記下你的更正了。我會照你說的修正。" : "收到，記為答錯。可以再說一下哪裡不對嗎？例如「答錯了，應該是…」");
  }

  // 語音：teddy_feedback 工具呼叫
  function fromVoice(verdict, correction) {
    let q = "", a = "";
    try {
      const h = (typeof teddyHistory !== "undefined" ? teddyHistory : []).slice(-12);
      for (let i = h.length - 1; i >= 0; i--) { if (h[i].role !== "user" && !a) a = h[i].text; else if (h[i].role === "user" && a && !/答(?:對|錯)|不對|錯了/.test(h[i].text)) { q = h[i].text; break; } }
    } catch (_) {}
    const base = lastTurn && now() - lastTurn.at < 10 * 60 * 1000 && (!a || lastTurn.a === a) ? lastTurn : turn({ mode: "語音", q, a, provider: "gemini-live", model: "gemini-3.1-flash-live" });
    record(base, verdict === "對" ? "對" : "錯", correction || "", "語音");
    return true;
  }

  // ---- 匯出給 Claude 讀的 Markdown ----
  const fmtT = ms => { try { return new Date(ms).toLocaleString("zh-TW", { hour12: false, timeZone: "Asia/Taipei" }); } catch (_) { return String(ms); } };
  function buildMd() {
    const it = fb.items.slice().sort((a, b) => b.at - a.at);
    const ok = it.filter(x => x.verdict === "對"), bad = it.filter(x => x.verdict === "錯");
    const tally = (key) => { const m = {}; it.forEach(x => { const k = x[key] || "（未知）"; m[k] = m[k] || [0, 0]; m[k][x.verdict === "對" ? 0 : 1]++; }); return Object.entries(m).map(([k, [o, b]]) => `${k} 對${o}／錯${b}`).join("、") || "無"; };
    const L = [];
    L.push("# Teddy 回饋紀錄（給 Claude）", "");
    L.push(`- 匯出時間：${fmtT(now())}`, `- 版本：${ver()}`, `- 入口：${window.TEDDY_ENTRY_LABEL || window.TEDDY_ENTRY_ID || "主人版"}`, `- 筆數：${it.length}（答對 ${ok.length}、答錯 ${bad.length}）`, "");
    L.push("## 摘要", `- 依模式：${tally("mode")}`, `- 依模型：${tally("model")}`, `- 依版本：${tally("version")}`, "");
    L.push("## 答錯清單（最新在前）", "");
    if (!bad.length) L.push("（目前沒有答錯紀錄）", "");
    bad.forEach((x, i) => {
      L.push(`### ${i + 1}. ${fmtT(x.at)}｜${x.mode}${x.ghEntry ? "・" + x.ghEntry : ""}｜${x.model || x.provider || "—"}${x.deep ? "（深度：" + (x.deepReason || "是") + "）" : ""}｜${x.version}｜回饋方式：${x.via}`);
      L.push(`- 問：${String(x.q).replace(/\n/g, " ")}`);
      if (x.canonical && x.canonical !== x.q) L.push(`- Teddy 理解成：${x.canonical}`);
      L.push(`- 答：${String(x.a).replace(/\n+/g, " ／ ")}`);
      L.push(`- 孫爸的更正：${x.correction || "（沒有寫）"}`, "");
    });
    try {
      if (typeof ghLearn !== "undefined" && ghLearn && Array.isArray(ghLearn.log)) {
        const miss = ghLearn.log.filter(l => l.result !== "答").slice(-30).reverse();
        L.push("## 溫室：沒答出來的問題（最近 30 題）", "");
        L.push(miss.length ? miss.map(l => `- ${fmtT(l.at)}｜「${l.q}」${l.entry ? "（入口 " + l.entry + "）" : ""}`).join("\n") : "（沒有）", "");
        const learned = ghLearn.examples.filter(e => e.ok).length;
        L.push(`## 溫室：已學會的問法 ${learned} 種；最近 ${ghLearn.log.length} 題的來源：${(() => { const m = {}; ghLearn.log.forEach(l => m[l.source] = (m[l.source] || 0) + 1); return Object.entries(m).map(([k, n]) => k + " " + n).join("、") || "無"; })()}`, "");
      }
    } catch (_) {}
    L.push("## 答對清單（簡列，最新 50 筆）", "");
    L.push(ok.slice(0, 50).map(x => `- ${fmtT(x.at)}｜${x.mode}｜${x.model || x.provider || "—"}｜${clip(String(x.q).replace(/\n/g, " "), 80)}`).join("\n") || "（沒有）", "");
    L.push("## 原始資料（JSON，給程式讀）", "", "```json", JSON.stringify(it.slice(0, 300), null, 1), "```", "");
    return L.join("\n");
  }
  function exportMd(download) {
    const md = buildMd();
    if (download) {
      try {
        const d = new Date(), p = n => String(n).padStart(2, "0");
        const name = `teddy-feedback-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}.md`;
        const url = URL.createObjectURL(new Blob([md], { type: "text/markdown;charset=utf-8" }));
        const a = document.createElement("a"); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 5000);
      } catch (e) { console.warn("匯出失敗", e); }
    }
    return md;
  }

  window.teddyFbTurn = turn;
  window.teddyFbAttach = attach;
  window.teddyFbTyped = typed;
  window.teddyFbRecord = (t, verdict, correction, via) => record(t, verdict, correction, via);
  window.teddyFbVoice = fromVoice;
  window.teddyFbExport = exportMd;
  window.teddyFbAll = () => fb.items.slice();

  const btn = document.getElementById("teddyFeedbackExport");
  if (btn) btn.onclick = () => { exportMd(true); btn.textContent = "📤 已匯出"; setTimeout(() => { btn.textContent = "📤 回饋紀錄"; }, 2500); };
  setTimeout(() => { pullCloud(); }, 1500);
})();
