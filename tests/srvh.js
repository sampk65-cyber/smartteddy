// 測試用靜態伺服器：從 repo 根目錄提供檔案（去掉 ?v=），找不到才回 index.html；/api/ 一律回空的
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const types = { '.html': 'text/html', '.js': 'application/javascript', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png' };
module.exports = (q, r) => {
  let p = decodeURIComponent(q.url.split('?')[0]); if (p === '/' || p === '') p = '/index.html';
  if (p.startsWith('/api/')) { r.statusCode = 404; return r.end('{}'); }
  const f = path.join(ROOT, p);
  if (f.startsWith(ROOT) && fs.existsSync(f) && fs.statSync(f).isFile()) { r.setHeader('content-type', types[path.extname(f)] || 'application/octet-stream'); return r.end(fs.readFileSync(f)); }
  r.setHeader('content-type', 'text/html'); r.end(fs.readFileSync(path.join(ROOT, 'index.html')));
};
