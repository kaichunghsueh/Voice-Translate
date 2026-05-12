# Voice-TW · 中文(台灣)文字轉語音

> Next.js 14 + Azure AI Speech 打造的 zh-TW 神經網路語音合成服務,部署在 Azure Container Apps。
> Live demo: <https://ca-voicetw-web.yellowtree-b5a598c2.westus3.azurecontainerapps.io>

![status](https://img.shields.io/badge/status-live-22c55e) ![region](https://img.shields.io/badge/region-westus3-2563eb) ![runtime](https://img.shields.io/badge/Next.js-14.2-black) ![tts](https://img.shields.io/badge/Azure-AI%20Speech-0078d4)

---

## ✨ 功能

- **3 種 zh-TW 神經網路語音** — 曉臻(自然/新聞)、曉雨(年輕/輕快)、雲哲(沉穩/播報)
- **單一模式** — 選語音、調語速(0.5–2.0x)/ 音調(±50%),生成 MP3
- **A/B 對比模式** — 同一段文字用兩種設定並排合成,選出偏好的一邊,投票寫入 App Insights
- **生成過程進度條** — 階段文字 + 計時 + shimmer 動畫
- **片段列表** — 每次生成都會加入清單,可獨立播放、下載、刪除
- **複製 SSML** — 一鍵複製目前語音/語速/音調的 SSML
- **歷史紀錄** — 文字輸入歷史(localStorage)
- **暗/亮主題切換**

## 🏗️ 架構

```
┌──────────────────────┐     HTTPS     ┌──────────────────────────────┐
│  Browser (Next.js)   │ ───────────▶  │  Container App ca-voicetw-web │
│  - Single / A/B UI   │               │   Next.js standalone server    │
└──────────────────────┘               └────────────┬─────────────────┘
                                                    │ AAD (UAMI)
                                       ┌────────────▼─────────────────┐
                                       │ Azure AI Services (Speech)   │
                                       │   zh-TW Neural Voices         │
                                       └────────────┬─────────────────┘
                                                    │
                                       ┌────────────▼─────────────────┐
                                       │ Application Insights          │
                                       │  tts_generate / tts_ab_vote   │
                                       └──────────────────────────────┘
```

- **無 API key 寫死** — Container App 用 User-Assigned Managed Identity 取 AAD token,以 `aad#<resourceId>#<token>` 格式餵 Speech SDK
- **安全 Header 全開** — CSP / HSTS 2 年 / X-Frame DENY / X-Content nosniff / Referrer-Policy / Permissions-Policy
- **後端護欄** — 5000 字輸入上限、per-IP rate limit 10 req/60s、voice 白名單 + fallback
- **觀測** — `@azure/monitor-opentelemetry`,events `tts_generate`、`tts_error`、`tts_ab_vote`

## 📁 專案結構

```
.
├── app/
│   ├── api/
│   │   ├── tts/route.ts        # 合成 endpoint (AAD-only, 護欄)
│   │   ├── ab/vote/route.ts    # A/B 投票 endpoint
│   │   ├── voices/route.ts     # 語音清單
│   │   └── health/route.ts     # /api/health
│   └── page.tsx                # 主頁(Single + A/B)
├── components/
│   ├── ABCompare.tsx           # A/B 對比面板
│   ├── ClipPlayer.tsx          # 原生 audio + 進度條
│   ├── GeneratingPanel.tsx     # 合成中進度動畫
│   ├── HistoryDrawer.tsx       # 歷史側欄
│   ├── ParamPanel.tsx          # 語速/音調
│   ├── VoicePicker.tsx
│   ├── TextInputArea.tsx
│   ├── ThemeToggle.tsx
│   └── ui/                     # button, card …
├── lib/
│   ├── env.ts                  # lazy env getters
│   ├── voices.ts               # zh-TW 白名單
│   ├── history.ts              # localStorage
│   ├── telemetry.ts            # App Insights
│   └── ratelimit.ts            # in-memory token bucket
├── infra/                      # Bicep
├── docs/
│   ├── analytics-kql.md        # 6 條 KQL 報表
│   └── PROJECT-SUMMARY.md      # 上線總結
├── Dockerfile                  # multi-stage node:20-alpine
├── azure.yaml                  # azd service mapping
└── next.config.mjs             # standalone + security headers
```

## 🚀 本機跑

```powershell
# 1) 安裝
npm install

# 2) 設定 .env.local(實際走 UAMI 不需要 key)
$env:AZURE_AISERVICES_ENDPOINT = "https://<your-ai>.cognitiveservices.azure.com/"
$env:AZURE_SPEECH_REGION       = "westus3"
$env:AZURE_CLIENT_ID           = "<UAMI clientId,或 az login 拿到的>"
$env:APPLICATIONINSIGHTS_CONNECTION_STRING = "InstrumentationKey=..."

# 3) 起 dev server
npm run dev

# http://localhost:3000
```

> 第一次合成需先 `az login`(本機開發)或在 Azure 上用 Managed Identity 才能拿到 AAD token。

## ☁️ 部署到 Azure

> 完整佈署手冊(含手動 CLI、滾動更新、回滾、CI/CD、疑難排解):**[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)**

### 用 azd(一鍵)

```powershell
azd auth login
azd up
```

### 手動 ACR + Container App

```powershell
# 1) Build & push
$tag = "v$(Get-Date -Format yyyyMMddHHmmss)"
az acr build -r crvoicetwwestus3sor5 -t "voicetw-web:$tag" -t "voicetw-web:latest" -f Dockerfile .

# 2) Roll forward
az containerapp update -g rg-voicetw-westus3 -n ca-voicetw-web `
  --image crvoicetwwestus3sor5.azurecr.io/voicetw-web:$tag
```

## 📊 觀測 / A/B 分析

KQL 範例都在 [`docs/analytics-kql.md`](docs/analytics-kql.md)。最常用的兩條:

```kusto
// A/B 勝出分佈
customEvents
| where name == "tts_ab_vote"
| summarize votes = count() by tostring(customDimensions.experimentId), tostring(customDimensions.winner)

// 各語音 p50/p95 延遲
customEvents
| where name == "tts_generate"
| extend voice = tostring(customDimensions.voice), d = toint(customDimensions.durationMs)
| summarize calls=count(), p50=percentile(d,50), p95=percentile(d,95) by voice
```

## 🔌 API 速查

| Method | Path | 說明 |
|---|---|---|
| `POST` | `/api/tts` | Body: `{ text, voice, rate, pitch, variant?, experimentId? }` → MP3 binary |
| `POST` | `/api/ab/vote` | Body: `{ experimentId, winner: 'A'\|'B'\|'tie', variantA, variantB, textLength }` |
| `GET` | `/api/voices` | 回傳 zh-TW 可用語音 |
| `GET` | `/api/health` | health probe |

## 🔒 安全與限制

- 輸入上限 **5000 字**
- Rate limit **10 req / 60s / IP**(in-memory,multi-replica 想精確要接 Redis)
- 只允許 zh-TW 白名單 voice(其他 fallback 到 `HsiaoChenNeural`)
- 後端用 AAD,不接受前端傳 API key
- CSP 預設 `connect-src 'self'`、`frame-ancestors 'none'`

## 🛣️ Roadmap

- [ ] Redis-backed rate limit
- [ ] Voice preview 短片(每個語音 3 秒試聽)
- [ ] SSML 進階編輯器(`<break>` / `<prosody>` / `<emphasis>`)
- [ ] Custom domain + WAF
- [ ] Multi-region active/passive
- [ ] Entra ID 登入 + 月配額

## 📜 License

MIT
