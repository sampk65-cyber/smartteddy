// Smart Teddy 回歸測試：每支測試的輸出和 golden/ 裡的標準答案比對。
// 用法（在 tests 資料夾）：node run-all.js            全部跑
//                          node run-all.js wk fbt     只跑指定的
//                          node run-all.js --update   把目前輸出存成新的標準答案（確認新行為正確後才用）
const { spawnSync } = require('child_process'), fs = require('fs'), path = require('path');
const ALL = ['rbrun', 'lt', 'imgt', 'deep', 'pit', 'pit2', 'pit3', 'pit4', 'pit5', 'pit6', 'pit8', 'pit9', 'pit10', 'pit11', 'pit12', 'pit13', 'sync', 'wk', 'pwa', 'inst', 'chip', 'obs2', 'sum', 'sum2', 'sum3', 'fbt', 'self', 'doct', 'ldoc', 'lgeo', 'wx'];
const args = process.argv.slice(2), update = args.includes('--update'), pick = args.filter(a => !a.startsWith('--'));
const tests = pick.length ? pick : ALL;
// 把每次都會變的東西（時間、毫秒、隨機碼、版本號）換成固定字，才能比對
const norm = s => s.replace(/\x1b\[[0-9;]*m/g, '')
  .split('\n').filter(l => !/agent-proxy|connect_rejected|^\s*$/.test(l)).join('\n')
  .replace(/\d{4}[\/-]\d{1,2}[\/-]\d{1,2}/g, 'DATE').replace(/\d{1,2}:\d{2}(:\d{2})?/g, 'TIME')
  .replace(/\d+ms/g, 'Nms').replace(/\b1[6-9]\d{11}\b/g, 'TS').replace(/p_[A-Z0-9]{8}/g, 'p_KEY')
  .replace(/\b\d+\.\d+\.\d+\b/g, 'VER').replace(/W\d{2}/g, 'Wnn');
spawnSync('node', ['gencopies.js'], { cwd: __dirname, stdio: 'inherit' });
let pass = 0, fail = 0, fresh = 0;
for (const t of tests) {
  const t0 = Date.now();
  const r = spawnSync('node', [t + '.js'], { cwd: __dirname, encoding: 'utf8', timeout: 180000 });
  const out = norm((r.stdout || '') + (r.stderr || '')), gf = path.join(__dirname, 'golden', t + '.out');
  const sec = ((Date.now() - t0) / 1000).toFixed(0) + 's';
  if (update || !fs.existsSync(gf)) { fs.writeFileSync(gf, out); fresh++; console.log(`📝 ${t}（${sec}）已存成標準答案`); continue; }
  const want = fs.readFileSync(gf, 'utf8');
  if (out === want) { pass++; console.log(`✅ ${t}（${sec}）`); }
  else {
    fail++; console.log(`❌ ${t}（${sec}）輸出和標準答案不同：`);
    const a = want.split('\n'), b = out.split('\n');
    for (let i = 0, shown = 0; i < Math.max(a.length, b.length) && shown < 6; i++) if (a[i] !== b[i]) { console.log(`   第${i + 1}行\n   標準：${(a[i] ?? '（無）').slice(0, 160)}\n   這次：${(b[i] ?? '（無）').slice(0, 160)}`); shown++; }
  }
}
console.log(`\n結果：通過 ${pass}、不同 ${fail}${fresh ? `、新存 ${fresh}` : ''}（共 ${tests.length}）`);
process.exit(fail ? 1 : 0);
