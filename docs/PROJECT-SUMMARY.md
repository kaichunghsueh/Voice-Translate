# Voice-TW · 中文(台灣)文字轉語音 · 上線總結

## 🌐 Production URL
**https://ca-voicetw-web.yellowtree-b5a598c2.westus3.azurecontainerapps.io**

## ✅ 6 Stages 全部完成

| Stage | 內容 | 狀態 |
|---|---|---|
| 1 · 計畫 | 架構 / Bicep / 預算 / Voice 白名單 | ✅ |
| 2 · Provision | Bicep 部署 11 資源到 `rg-voicetw-westus3` | ✅ |
| 3 · Backend | `/api/tts`, `/api/health`, `/api/voices`, AAD-only, 5000 字上限,10/60s rate limit,Voice 白名單 + fallback,App Insights tracking | ✅ |
| 4 · Frontend | Next.js 14 App Router + Tailwind + framer-motion + wavesurfer.js,深色/淺色,Single 模式 | ✅ |
| 4.5 · Code Review | 6 個安全 Header(CSP / HSTS 2 年 / X-Frame DENY 等),lazy env getters,*.mp3 gitignore | ✅ |
| 5 · Deploy | Dockerfile multi-stage + ACR build,Container App `ca-voicetw-web` min=1 max=5 0.5vCPU/1Gi | ✅ |
| 6 · A/B Test | `ABCompare` 元件 + `/api/ab/vote`,投票寫入 App Insights,KQL 報表 | ✅ |

## 📦 主要 Azure 資源(`rg-voicetw-westus3` / westus3)

- `ca-voicetw-web` — Container App(revision `0000002`,100% traffic,Healthy)
- `cae-voicetw-westus3` — Container Apps Environment
- `crvoicetwwestus3sor5` — Azure Container Registry
- `ai-voicetw-westus3` — Azure AI Services(Speech zh-TW)
- `appi-voicetw-westus3` — Application Insights(AppId `2f64358a-6a2f-4337-868c-82f403efa5c9`)
- `log-voicetw-westus3` — Log Analytics Workspace
- `kv-voicetw-westus3` — Key Vault
- `id-voicetw-westus3` — User Assigned Managed Identity (`be87aad6-22a0-4f5a-a1f0-8c26098bf4b5`)
- Budget `bg-voicetw-100usd` — $100/月,80% / 100% email 警示

## 🎙️ 已上線語音(zh-TW)
- `zh-TW-HsiaoChenNeural`(女・預設)
- `zh-TW-HsiaoYuNeural`(女)
- `zh-TW-YunJheNeural`(男)

> 已驗證 DragonHD 系列**不支援** zh-TW,後端會自動 fallback 到 HsiaoChen。

## 🔐 安全性
- 後端走 AAD(UAMI),**沒有任何 API key 寫死**
- CSP / HSTS 63072000 / X-Frame DENY / X-Content nosniff / Referrer-Policy / Permissions-Policy 全開
- 5000 字輸入上限 + per-IP rate limit 10/60s + voice 白名單
- HTTPS only(Container Apps 預設)

## 📊 觀測 & A/B 報表
KQL 全部已寫在 [`docs/analytics-kql.md`](analytics-kql.md)。

Portal Logs 直達:
https://portal.azure.com/#@16b3c013-d300-468d-ac64-7eda0820b6d3/resource/subscriptions/2e9633af-16cb-405f-a090-5d095059d8a6/resourceGroups/rg-voicetw-westus3/providers/Microsoft.Insights/components/appi-voicetw-westus3/logs

剛剛已自動灌入 6 筆種子投票(A×3 / B×2 / tie×1),約 1–3 分鐘 ingestion 後 KQL 1)應該會看到 `voice-tw-v1` 的勝出分佈。

## 💸 成本控制
- Container App scale 1–5(最低保 1 個常駐避免冷啟)
- ACR 用 Basic SKU
- AI Services Standard,實際只用 zh-TW Neural TTS(計費以字元計)
- 月預算 100 USD 警示已上

## 🚀 下一步建議(Optional Roadmap)
1. **Custom domain + cert** — 綁自家網域到 Container App
2. **Redis-backed rate limit** — 目前是 in-memory,scale > 1 後限額會偏寬鬆;接 Azure Cache for Redis 可全 instance 共享
3. **Voice preview 短片** — 在 UI 加上每個語音的 3 秒試聽,使用者選擇前先聽
4. **SSML 進階模式** — 暴露 `<break>` / `<prosody>` / `<emphasis>` 編輯器
5. **Multi-region active/passive** — Front Door + 第二個 region(eastasia)做 DR
6. **WAF / Private Endpoint** — 加 Front Door + WAF,AI Services 走 Private Endpoint
7. **使用者帳號 + 配額** — Entra ID 登入,每用戶月配額
8. **離線批次** — 上傳 .txt → 排程 → 結果寄 email / 寫 Blob

---

> 整個服務從零到上線、Bicep / 程式碼 / Docker build / 部署 / A/B / 監控全部由 agent 自跑完成,符合「你不要叫我跑.你跑」需求 ✅
