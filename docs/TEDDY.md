# Smart Teddy 說明書（給孫爸，也給下一個接手的 AI）

> 改 Teddy 之前，請先讀完這份。改完一定要跑 `tests/`，並在 `CHANGELOG.md` 記下改了什麼。
> 這份說明書描述的是 **8.7.1** 的狀態。

---

## 一、Teddy 是什麼

- **TEDDY（碰氣）**：孫爸（PKSUN，完全體帳號 A01）的松鼠助理，形象來自他養的赤腹松鼠 Teddy。
- 網址：<https://smartteddy.vercel.app>（GitHub：`sampk65-cyber/smartteddy`，Vercel 自動部署）。
- 三個入口，同一份程式：

| 入口 | 網址 | 對象 | 能做什麼 |
|---|---|---|---|
| 主人版 | `/` | 孫爸 | 全部功能 |
| 家人版 | `/?app=family` | 家人 | 聊天、澎企理財（共用自選唯讀）。**沒有任何溫室／完全體資料** |
| 溫室助理 | `/?app=farm` | 員工 | 只有溫室；要用自己的人員編號登入 |

- 可以安裝成 App（PWA）：三個入口各自一個 App（Teddy／Teddy 家人／Teddy 溫室）。

---

## 一之一、Teddy 怎麼知道自己會什麼（加新功能時一定要改）

- `js/core.js` 的 `teddySelfKnowledge()` 是 Teddy 的「我的本事」清單，依入口（主人／家人／溫室助理）產生，會放進文字聊天、即時語音、溫室模式的人格設定。
- `TEDDY_RECENT_UPDATES` 是「最近更新」，Teddy 被問到升級了什麼時照這裡說。
- `teddySelfKnowledgeBrief()` 是使用者問「你會什麼」時直接回答的短版。
- **每加一個使用者看得到的功能，就要同時更新這三個地方**，否則 Teddy 會不認得自己的新功能（8.7.0 以前就發生過：她看到「澎企理財」反問使用者那是什麼）。

## 二、不可違反的原則

1. **完全體是唯一的資料來源，Teddy 是嘴巴。** 溫室數字一律從完全體 V5.1（Firebase `figapi-d24dc`）讀取，由程式計算；AI 只負責聽懂問題和把結果講成人話，不准自己算或補數字。
2. **程式算數字，AI 只解釋。** 澎企理財的行情、指標、評分、排行全部由程式計算；AI 不可以增減股票、改數字、編造新聞或目標價。
3. **寫入完全體只能走安全交易：復述 → 使用者確認 → 寫入**（和完全體同一套）。Teddy 永遠不讀、不存密碼；主人的工作階段不保存密碼。
4. **權限**：員工權限依完全體「功能表 2」；家人版看不到任何溫室資料；表十只有 A／B；**產能資料保密**。
5. **澎企理財只讀**：不碰帳戶、不下單、不叫使用者買或賣。只有使用者主動問推薦時，才能從程式篩出的觀察名單裡挑，並說明「不是買賣建議」。
6. FinMind token 只存在使用者自己的手機，不上傳雲端；個人備份碼不分享。
7. Teddy 自己的記憶、學習、回饋紀錄只存在 Teddy 自己的 Firebase（`smart-teddy-df0fc`），**絕不寫進完全體**。

---

## 三、檔案地圖

```
index.html               畫面、樣式、小段設定程式（入口判斷、App 化、Service Worker 註冊）
js/core.js               核心：對話、記憶、路由、深度思考引擎、語音輸出、工作指派、AI 觀測站
js/greenhouse.js         溫室模式：完全體 V5.1 資料閘門、功能表、十表引擎、答對答錯學習
js/live.js               即時語音（Gemini Live）與語音工具
js/invest.js             澎企理財：自選股、指標、盤後報告、週檢、雲端同步
js/feedback.js           回饋紀錄（答對／答錯）與匯出
api/stock.js             Vercel 伺服器函式：證交所、FinMind、Yahoo 資料轉接（只讀）
sw.js                    Service Worker：永遠先拿網路最新版，離線才用備份；不碰 /api/ 與其他網站
manifest*.webmanifest    三個入口各自的 App 設定
icons/                   App 圖示
docs/                    說明文件（不部署）
tests/                   回歸測試（不部署）
```

**載入順序很重要**：`core → greenhouse → live → invest → feedback`，都是一般 `<script>`，共用同一個全域範圍。
- `core.js` 載入時**不能直接呼叫** `greenhouse.js` 以後的函式；要用的地方都要先檢查 `typeof X === "function"`。
- 新功能優先放在獨立檔案，透過 `window.teddyXxx` 互相呼叫（像 `invest.js`、`feedback.js`）。
- 改了哪個 js，就把 `index.html` 裡那個檔案的 `?v=` 版本號一起改，避免手機用到舊暫存。

---

## 四、AI 模型分工（8.7.0）

| 用途 | 模型 | 說明 |
|---|---|---|
| 一般聊天 | Gemini 3.6 Flash | 便宜、快 |
| 即時語音 | Gemini 3.1 Flash Live（預設） | 3.8 只在手動選「實驗」時用；溫室曾因 3.8 答非所問、聲音不對而改回 3.1 |
| 深度思考 | 自動：有 Claude 金鑰 → Claude Sonnet 5.5，否則 GPT-6.1 Sol | 可手動選 Opus 5.5 或 Astra（Astra 太貴，不建議）。OpenAI 失敗退回 gpt-5.6-sol；Claude 失敗且有 OpenAI 金鑰時退回 Sol |
| 觀測站（五家比較） | GPT-6.1 Sol、Claude Sonnet 5.5、Grok 4.6/4.7、Gemini 3.6 Flash、DeepSeek v4 flash | 每家最多等 90 秒；總結先用深度引擎，失敗才用 Grok |

**什麼時候交給深度思考**：`core.js` 的 `teddyDeepJudge()`。只有使用者明說要深入分析、寫程式除錯、盤後報告／大盤解讀／週檢，或同時有兩個以上推理訊號（比較、取捨、規劃、推估、找原因、多個問題、內容很長）才交出去；聊天、常識、單純查資料都留給 Gemini。

---

## 五、資料與雲端

| 資料 | 位置 | 規則 |
|---|---|---|
| 完全體 V5.1 主資料 | Firebase `figapi-d24dc`，集合 `kv` | Teddy 只讀；寫入走安全交易；匿名登入 |
| Teddy 記憶、溫室學習、回饋紀錄 | Firebase `smart-teddy-df0fc`，`teddy_memory/{裝置ID__版本}` | 欄位：記憶層、`ghLearning`、`feedbackLog` |
| 澎企理財共用自選 | `teddy_invest/shared_watchlist` | 只有孫爸寫；家人唯讀（由 App 控制） |
| 澎企理財個人資料 | `teddy_invest/p_{備份碼}` | 持股、分析紀錄、週檢快照、家人自己的群組 |

Firestore 不接受「陣列裡的陣列」：要存表格型資料時，每一列要用物件（見 `invest.js` 的 `wkEnc／wkDec`）。

`smart-teddy-df0fc` 目前的 Firestore 規則（改規則時要保留前三段）：

```
match /teddy_memory/{deviceId}/{document=**} { allow read, write: if true; }
match /teddy_config/{document=**} { allow read, write: if true; }
match /teddy_access/{document=**} { allow read, write: if true; }
match /teddy_invest/{docId} {
  allow read: if docId == "shared_watchlist" || docId.matches("p_[A-Z0-9]+");
  allow write: if (docId == "shared_watchlist" || docId.matches("p_[A-Z0-9]+"))
               && request.resource.size() < 200000;
}
```

---

## 六、澎企理財重點

- 資料：證交所 MIS 即時行情（失敗改 Yahoo）、FinMind（日K、三大法人、財報、本益比、月營收、融資券、外資持股、股利、大盤法人、期貨）。Vercel 環境變數 `FINMIND_TOKEN` 可提高額度。
- 指標（程式計算、已和 Python 對過）：RSI14（Wilder）、KD(9,3,3)、MACD(12,26,9)、MA5/20/60、乖離、量比、ATR14、布林(20,2)、52 週高低、相對大盤報酬、年化波動、ROE 估算。
- 🔔 訊號：`alertsOf()` 固定門檻（偏多紅／偏空綠／注意黃）。
- 盤後報告：含資料完成度與「明日關鍵價位」（程式算），AI 只能引用。
- 週檢：趨勢 30＋籌碼 30＋動能 20＋基本面 20（ETF 按 80 分換算），過熱扣分；每週快照、轉強轉弱、上週成績單。觀察名單只取 45 分以上，不足 10 檔就照實列。
- 台股顏色：漲紅、跌綠。

---

## 七、回饋紀錄（答對／答錯）

- 一般聊天：每則回答下面有 👍／👎；👎 會問「哪裡不對」。
- 打字：「答對了」「答錯了，應該是…」「不對，…」——這些話不會送給 AI。
- 語音：說「答錯了／不對，應該是…」，Gemini Live 會呼叫 `teddy_feedback` 記下來。
- 溫室：原本的答對答錯學習照舊，同時記進回饋紀錄。
- **匯出給 Claude**：Teddy 設定（⚙️）裡的「📤 回饋紀錄」，或打字「匯出回饋」，會下載 `teddy-feedback-日期.md`。

**接手的 AI 讀到這份檔案時，請這樣處理：**
1. 先看「答錯清單」，把每一題分類：路由錯（該查的地方查錯）、資料錯（數字不對）、理解錯（問句沒聽懂）、表達錯（答案對但講法不好）、模型能力不足。
2. 能用規則修的就改程式（例如加問法、修路由）；同一種錯誤出現兩次以上，一定要修。
3. 每修一題，就在 `tests/` 加一個能重現的測試，避免以後再犯。
4. 「溫室：沒答出來的問題」也要逐一看，判斷是缺功能還是缺問法。
5. 在 `CHANGELOG.md` 記錄這次依回饋修了哪些題。

---

## 八、怎麼測試

```bash
cd tests
npm install            # 第一次：安裝 playwright（需要 Chromium）
node run-all.js        # 全部跑，和 golden/ 的標準答案比對
node run-all.js wk fbt # 只跑指定的
node run-all.js --update  # 確認新行為是對的之後，才更新標準答案
```

- 測試前會自動用 `js/` 目前的程式產生副本（`gencopies.js`），不會測到舊程式。
- 測試只用模擬資料，不會連到真正的 AI、證交所或 Firebase。
- 重要測試：`rbrun`（170 題路由，不能有任何一題被誤當工作指派）、`lt`／`imgt`（語音與照片）、`pit*`（澎企理財）、`sync`（雲端同步）、`wk`（週檢）、`pwa`（三個入口、App、離線）、`obs2`／`sum*`（觀測站）、`fbt`（回饋紀錄）、`self`（Teddy 認得自己三大功能）。

---

## 九、更新流程（孫爸用 GitHub 網頁上傳）

1. AI 改完程式 → 跑測試 → 只交付有改的檔案，並說明每個檔案放哪裡。
2. 在 GitHub 網頁上傳覆蓋（js 檔要進到 `js` 資料夾再上傳）。
3. 等 Vercel 部署約 1 分鐘，打開 App 確認版本號（Teddy 頭像下方）。
4. 出問題：Vercel → Deployments → 選前一版 → Promote，一分鐘內退回。

版本號規則：大功能升第二碼（8.6 → 8.7），修正升第三碼（8.7.0 → 8.7.1）。`index.html` 與 `core.js` 的版本號要一致（畫面上顯示的是 `core.js` 的 `TEDDY_VERSION`）。

---

## 十、已知限制與待辦

- 金鑰存在各自手機的瀏覽器；分享給家人時金鑰要在他們手機上輸入。未來可改成金鑰放 Vercel 伺服器並設用量上限。
- 主動通知（收盤訊號、週檢、雨天提醒、早報）尚未做：需要 Firebase 推播＋排程，評分程式要搬一份到伺服器。
- 澎企理財真實資料待驗證：月營收、融資券、股利、外資持股（FinMind 免費等級可能不給）、櫃買排行。
- 機器人身體（ESP32＋伺服馬達＋手機）：零件到了再做接線、韌體與「連接身體」功能。
