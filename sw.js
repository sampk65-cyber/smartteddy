/* Smart Teddy 8.7.0 · Service Worker
   原則：永遠先拿網路上的最新版（network-first）；只有離線或網路失敗時才用手機裡的備份。
   不碰 /api/、不碰其他網站（Firebase、Gemini、OpenAI、Claude、證交所…）、不碰非 GET 請求。 */
const CACHE = "teddy-shell-v8.7.0";
const SHELL = ["/", "/js/core.js", "/js/greenhouse.js", "/js/live.js", "/js/invest.js", "/js/feedback.js", "/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png"];
self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(SHELL.map(u => c.add(new Request(u, { cache: "reload" })).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith("teddy-shell-") && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;
  const key = req.mode === "navigate" ? "/" : url.pathname;   // 三個入口共用同一份頁面；js 的 ?v= 不影響備份
  e.respondWith((async () => {
    try {
      const res = await fetch(req, { cache: "no-cache" });
      if (res && res.ok && res.type === "basic") { const c = await caches.open(CACHE); c.put(key, res.clone()).catch(() => {}); }
      return res;
    } catch (err) {
      const hit = await caches.match(key);
      if (hit) return hit;
      if (req.mode === "navigate") return new Response("<meta charset=utf-8><body style='background:#0a0e0d;color:#e8eeea;font:16px sans-serif;padding:24px'>🐿 目前沒有網路，Teddy 需要連線才能使用。恢復連線後重新開啟即可。</body>", { headers: { "content-type": "text/html; charset=utf-8" } });
      throw err;
    }
  })());
});
