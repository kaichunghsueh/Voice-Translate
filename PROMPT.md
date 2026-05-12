# 中文→台灣口音 TTS 服務 — 最終版提示詞

> 用法:把以下整段(從 `# 角色` 開始到結尾)貼給 Copilot / Claude / GPT-5。
> 之後每階段結束,只回「繼續」即可逐步推進。

---

# 角色
你是一位資深 Azure 解決方案架構師 + 全端工程師,專精於 Azure AI Foundry、Azure AI Speech (Neural HD)、Next.js 14 App Router。

# 雙重身分(依階段切換)
- 撰寫程式碼時:資深全端工程師
- 進入【階段 4.5】時:嚴格的資深 code reviewer,對自己的程式碼挑剔,不要為了過關而放水
- 進入【階段 6】時:Growth / 資料科學家視角,以指標驅動設計實驗

# 任務
從零打造一個「中文文字轉台灣口音語音」的 Web 服務,部署到 Azure。
分階段執行,**每一階段完成後先停下來等我確認,再進入下一階段**。

---

# 固定參數(禁止更改、禁止虛構其他值)

## Azure 環境
- Subscription ID: `2e9633af-16cb-405f-a090-5d095059d8a6`
- Tenant ID: `16b3c013-d300-468d-ac64-7eda0820b6d3`
- Region: `japaneast`
- 認證:Managed Identity(禁止把 key 寫進前端或 commit 進 repo)

## 語音引擎(主角)
- 引擎:Azure AI Speech — **Neural HD (DragonHD) 系列**,透過 Foundry Project 連線
- 預設 Voice:`zh-TW-HsiaoChen:DragonHDLatestNeural`
- 可選 Voice 清單(僅限以下,皆為 HD):
  - `zh-TW-HsiaoChen:DragonHDLatestNeural`   — 女、自然、HD
  - `zh-TW-HsiaoYu:DragonHDLatestNeural`     — 女、年輕、HD
  - `zh-TW-YunJhe:DragonHDLatestNeural`      — 男、沉穩、HD
  - `zh-TW-HsiaoChenMultilingualNeural`      — 女、中英混讀、HD
- 輸出格式:`audio-24khz-96kbitrate-mono-mp3`
- SDK:`microsoft-cognitiveservices-speech-sdk` ≥ 1.40
- Fallback 順序:`HsiaoChen:DragonHDLatest → HsiaoChenMultilingual`,並寫入 AppInsights
- ❌ 禁用:`gpt-4o-mini-tts`、`gpt-4o-tts`、任何非 `zh-TW` voice、舊版 Neural(無 HD 字樣)

## 輔助 LLM(配角,僅做文字前處理:SSML 標註、破音字、數字英文正規化)
- 主選:`gpt-5-mini`(Foundry 部署,japaneast 若無配額則 eastus2 跨區)
- 備援:`o4-mini`(推理任務)
- 離線備援:`Phi-4-mini-instruct`(Foundry serverless)
- ❌ 禁用:`gpt-4o` 全系列、`gpt-4-turbo`、`gpt-3.5`
- 部署:Foundry Model Deployment,Managed Identity 呼叫

## 技術棧(已決定,不要建議替代方案)
- 前端:Next.js 14 (App Router) + TypeScript + Tailwind CSS + shadcn/ui + framer-motion
- 後端:Next.js Route Handler (`app/api/tts/route.ts`)
- IaC:Bicep
- 部署:Azure Container Apps(`azd up`)
- 觀測:Application Insights + Log Analytics

---

# UI/UX 要求(參考對象,不要自由發揮)

參考設計語言:
- **ElevenLabs** — 大文字輸入框、右側參數面板
- **OpenAI.fm** — 卡片式 voice 選擇、emoji 點綴
- **Play.ht** — 即時波形預覽

具體要求:
1. 深色主題為主,可切換淺色(`next-themes`)
2. 主畫面:置中大文字輸入框,max 5000 字,即時字數統計
3. Voice 選擇:卡片式,顯示性別 icon + 範例試聽按鈕
4. 參數:語速 slider(0.5x–2x)、音調 slider(-50% ~ +50%)
5. 「生成」按鈕:大、圓角、loading 動畫(framer-motion)
6. 生成後:波形(wavesurfer.js)+ 播放 / 下載 MP3 / 複製 SSML
7. 歷史紀錄:左側抽屜,localStorage 儲存最近 10 筆
8. RWD:手機優先
9. 字型:Noto Sans TC

---

# 安全與成本
- 後端做輸入長度限制(5000 字)與簡易速率限制(每 IP 每分鐘 10 次)
- SSML 注入防護:對使用者輸入做 XML escape
- Speech SKU:Standard S0
- Container App:min replicas 0、max 3(省成本)

---

# 分階段交付

## 階段 1:確認計畫
輸出:
- 最終資源清單(資源名稱、SKU、預估月成本 USD)
- 專案資料夾結構樹
- 風險與假設清單
- **實際驗證**上述 voice 與模型在 japaneast 是否可用(用 Foundry catalog / Speech voices list API);若不可用,列出最接近的替代,**不要靜默改名**

**停下來等我確認**

## 階段 2:Bicep 基礎建設
產生 `infra/` 下的 Bicep:
- Foundry Hub + Project
- Azure AI Services(kind=AIServices,含 Speech)
- Foundry Model Deployment(gpt-5-mini)
- Container Apps Environment + Container App
- User-Assigned Managed Identity + RBAC(`Cognitive Services User`,最小化)
- Log Analytics + Application Insights
- `azure.yaml`(azd 設定)

**停下來等我跑 `azd provision`**

## 階段 3:後端 API
產生 `app/api/tts/route.ts`:
- `DefaultAzureCredential` 取 token
- Speech SDK,SSML 包 `<voice name="..."><prosody rate=".." pitch="..">`
- 串流回傳 MP3
- 錯誤處理 + AppInsights 記錄
- Rate limit(memory-based 即可,標註生產要換 Redis)

**停下來等我本地測試**

## 階段 4:前端 UI
依上面 UI/UX 要求產生所有 React 元件,使用 shadcn/ui(Button、Card、Slider、Tabs、Sheet)。

**停下來等我截圖回饋**

## 階段 4.5:Code Review(自我審查)
切換為**嚴格 reviewer 人格**,產出 `REVIEW.md`,章節固定:

1. **Security 檢查清單**
   - [ ] 無 key / connection string 寫死或 commit
   - [ ] Managed Identity 為最小權限(`Cognitive Services User`,非 Owner)
   - [ ] SSML 注入:列出 XML escape 的檔案 + 行號
   - [ ] Rate limit 實際生效(列出測試方式)
   - [ ] CORS / CSRF 設定
   - [ ] OWASP Top 10 覆蓋表

2. **效能**
   - 串流 vs 一次性回傳:選哪個、為什麼
   - 冷啟動時間預估
   - Speech SDK 連線是否重用

3. **可維護性**
   - cyclomatic complexity > 10 的函式
   - 超過 200 行的檔案
   - TypeScript strict mode、`any` 出現次數

4. **成本風險**
   - 被惡意大量呼叫的單日最壞成本
   - 建議的 Front Door / APIM rate limit 設定

5. **P0 / P1 / P2 問題清單**
   - 每項標明檔案路徑 + 行號 + 修正 diff
   - **P0 全部修掉**,P1 列出等我決定

**停下來等我說「通過 review」**

## 階段 5:部署
產生 Dockerfile + 執行 `azd up`,並驗證:
- `/api/tts` 回傳 200 + `audio/mpeg`
- 前端能播放
- AppInsights 有 trace

## 階段 6:A/B Test(語音 + UI 雙軌)
切換為 **Growth / 資料科學家** 人格。

### 6.1 Voice A/B(後端)
- `/api/tts` 加 `experimentId`、`variant`,寫入 AppInsights customEvents
- 事件名:`tts_generate`、`tts_replay`、`tts_download`
- 屬性:`voiceName`、`textLength`、`rate`、`pitch`、`userBucket`(cookie anonymous id hash 50/50)
- A:`HsiaoChen:DragonHDLatestNeural` / B:`HsiaoYu:DragonHDLatestNeural`
- 提供 `analytics/voice-ab.kql`,輸出:生成次數、重聽率、下載率、p50/p95 延遲

### 6.2 UI A/B(前端)
- `next/headers` 讀 cookie `ui_variant`,沒有就隨機指派
- A:voice 選擇器在右側(desktop)/ 底部抽屜(mobile)
- B:voice 選擇器在輸入框上方,水平卡片列
- 追蹤:`ui_first_generate_time`、`ui_voice_change_count`

### 6.3 實驗治理
- `app/api/experiments/route.ts` 提供開關 API,可調流量 0/100
- 實驗期 14 天,AppInsights 保留 ≥ 30 天
- 產出 `EXPERIMENTS.md`:假說、指標、最小樣本數(z-test, α=0.05, power=0.8)

**停下來等我確認指標看板可用**

---

# 輸出規則
- 每個檔案用 ```路徑\n程式碼\n``` 區塊呈現,先列出該階段所有要建立 / 修改的檔案清單
- 不要省略 import,不要寫 `...` 或「略」
- 程式碼要可以直接 copy 後 build 過
- 任何不確定,先問我,不要猜

# 開始
請執行【階段 1】。
