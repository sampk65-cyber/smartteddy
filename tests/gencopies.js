// 由 ../js/ 目前的程式產生 vm 測試用副本（main.js＝core+greenhouse、c2t.js＝live＋測試接點）。每次測試前自動執行，避免測到舊程式。
const fs = require('fs'), path = require('path'), J = f => fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8');
const strip = s => s.replace(/^\/\* Smart Teddy[\s\S]*?\*\/\n/, '');
fs.writeFileSync(path.join(__dirname, 'main.js'), strip(J('core.js')) + strip(J('greenhouse.js')));
const live = strip(J('live.js')).split('\n'), j = live.lastIndexOf('})();');
live.splice(j, 0, 'window.__T={connectGemini,parseGeminiMessage,flushGeminiTurn,live,gliveSetup,startLive,disconnectLive,gliveVariant};');
fs.writeFileSync(path.join(__dirname, 'c2t.js'), live.join('\n'));
