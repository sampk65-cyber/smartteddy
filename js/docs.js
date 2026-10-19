/* Smart Teddy 8.8.0 · js/docs.js：文件記憶（附上的 PDF／Word／Excel／PowerPoint 全文另外保存）
   載入順序：js/core.js → js/greenhouse.js → js/live.js → js/invest.js → js/feedback.js → js/docs.js
   為什麼：以前整份文件塞進對話紀錄，之後每句話都重送全文（又貴又慢），語音也只看得到前 700 字。
   現在：對話紀錄只留一行標記；打字追問「這份簡報…」時才把全文交給 AI；語音用 read_document 工具讀，
        要寫報告時 think_with_astra 會自動附上全文。保存最近一份文件 24 小時（本機），不上傳雲端。 */
(() => {
  "use strict";
  const KEY = "teddy_doc_last_v1" + (window.TEDDY_KEY_SUFFIX || "");
  const KEEP_MS = 24 * 3600 * 1000, BLOCK_MAX = 180000, READ_MAX = 40000;
  let cur = null;
  try { const v = JSON.parse(localStorage.getItem(KEY) || "null"); if (v && v.text && Date.now() - v.at < KEEP_MS) cur = v; } catch (_) {}

  const pagesOf = t => { const m = String(t).match(/【(?:投影片|第)\s*(\d+)\s*(?:頁)?】/g); return m ? m.length : 0; };
  function save(att) {
    if (!att || att.kind !== "text" || !att.text) return null;
    cur = { name: String(att.name || "文件"), format: att.format || "文件", text: String(att.text), at: Date.now() };
    cur.chars = cur.text.length; cur.pages = pagesOf(cur.text);
    try { localStorage.setItem(KEY, JSON.stringify(cur)); } catch (_) { /* 太大存不下就只留在記憶體 */ }
    return cur;
  }
  function current() { if (cur && Date.now() - cur.at > KEEP_MS) cur = null; return cur; }
  const sizeTxt = d => `${d.pages ? d.pages + " 頁｜" : ""}${d.chars.toLocaleString()} 字`;
  function marker(d) { d = d || current(); return d ? `【附件：${d.name}｜${d.format}｜${sizeTxt(d)}，全文已存入文件記憶】` : ""; }
  function block(d) {
    d = d || current(); if (!d) return "";
    const body = d.text.length > BLOCK_MAX ? d.text.slice(0, BLOCK_MAX) + "\n…（文件太長，後面省略）" : d.text;
    return `【文件記憶：${d.name}｜${d.format}｜${sizeTxt(d)}｜以下是全文，回答要以全文為準，引用時標頁碼】\n${body}\n【文件全文結束】`;
  }
  // 使用者是不是在說這份文件
  const REFER = /這份|那份|這個檔|那個檔|檔案|附件|簡報|投影片|\bppt\b|pptx|\bpdf\b|文件|講稿|報告稿|做成報告|寫成報告|整理成報告|上台報告|口頭報告|第\s*[0-9一二三四五六七八九十]+\s*(?:頁|張)|剛剛(?:傳|上傳|給你|附)|上面那|逐頁|每一頁|摘要|重點整理/i;
  function refers(text) { return !!current() && REFER.test(String(text || "")); }

  // 語音用：讀全部或指定頁（例如 "3-7"、"5"）
  function read(pages) {
    const d = current();
    if (!d) return { ok: false, error: "目前沒有附上的文件。請使用者先按 📎 附上檔案。" };
    let text = d.text, range = "全部";
    const m = String(pages || "").match(/(\d+)\s*(?:[-~～到至]\s*(\d+))?/);
    if (m && d.pages) {
      const a = +m[1], b = m[2] ? +m[2] : a;
      const parts = d.text.split(/(?=【(?:投影片|第)\s*\d+\s*(?:頁)?】)/).filter(s => { const n = +(s.match(/【(?:投影片|第)\s*(\d+)/) || [])[1]; return n >= a && n <= b; });
      if (parts.length) { text = parts.join("\n"); range = a === b ? `第 ${a} 頁` : `第 ${a}～${b} 頁`; }
    }
    const cut = text.length > READ_MAX;
    return { ok: true, name: d.name, format: d.format, pages: d.pages || null, range, text: cut ? text.slice(0, READ_MAX) : text,
      note: cut ? `內容太長，只回傳前 ${READ_MAX.toLocaleString()} 字；可以指定頁數再讀（例如 pages:"10-20"）` : "" };
  }
  // 打字指令
  function typed(text) {
    const s = String(text || "").trim();
    if (/^(?:清除|刪除|忘掉|忘記)(?:這份|剛剛的|附上的)?(?:文件|檔案|簡報|附件)(?:記憶)?$/.test(s)) { cur = null; try { localStorage.removeItem(KEY); } catch (_) {} return "好，剛才的文件我已經清掉了。"; }
    return null;
  }

  window.teddyDocSave = save;
  window.teddyDocCurrent = current;
  window.teddyDocMarker = marker;
  window.teddyDocBlock = block;
  window.teddyDocRefers = refers;
  window.teddyDocRead = read;
  window.teddyDocTyped = typed;
})();
