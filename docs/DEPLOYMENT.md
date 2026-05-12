# 佈署手冊 · Voice-TW

完整從零部署 / 維運此專案的手冊。包含 azd 一鍵部署、純 Azure CLI 手動部署、滾動更新、回滾、常見問題排查。

> Live demo: <https://ca-voicetw-web.yellowtree-b5a598c2.westus3.azurecontainerapps.io>
> Source: <https://github.com/kaichunghsueh/Voice-Translate>

---

## 0. 前置需求

| 工具 | 最低版本 | 安裝 |
|---|---|---|
| Azure CLI | 2.60+ | `winget install Microsoft.AzureCLI` |
| Azure Developer CLI (azd) | 1.10+ | `winget install Microsoft.Azd` |
| Node.js | 20.x | `winget install OpenJS.NodeJS.LTS` |
| Git | any | `winget install Git.Git` |
| GitHub CLI(可選) | 2.0+ | `winget install GitHub.cli` |
| PowerShell | 7+ | 內建或 `winget install Microsoft.PowerShell` |

> Docker **不需要安裝在本機**,容器都用 Azure Container Registry 雲端 build。

帳號需要的權限(在目標 Subscription):
- `Owner` 或 `Contributor` + `User Access Administrator`(用來建立 Role Assignment)
- 已註冊 Provider:`Microsoft.App`、`Microsoft.ContainerRegistry`、`Microsoft.CognitiveServices`、`Microsoft.OperationalInsights`、`Microsoft.Insights`、`Microsoft.KeyVault`、`Microsoft.ManagedIdentity`、`Microsoft.Consumption`

```powershell
# 一次註冊全部(沒註冊的話 azd up 會卡)
'Microsoft.App','Microsoft.ContainerRegistry','Microsoft.CognitiveServices',
'Microsoft.OperationalInsights','Microsoft.Insights','Microsoft.KeyVault',
'Microsoft.ManagedIdentity','Microsoft.Consumption' |
  ForEach-Object { az provider register -n $_ }
```

---

## 1. 取得程式碼

```powershell
git clone https://github.com/kaichunghsueh/Voice-Translate.git
cd Voice-Translate
npm install     # 本機開發 / 型別檢查用
```

---

## 2. 路徑 A:azd 一鍵部署(推薦)

```powershell
# 1) 登入
az login
azd auth login

# 2) 建立 azd 環境(會問你 subscription / location / env name)
azd env new voicetw-prod
azd env set AZURE_LOCATION westus3
azd env set AZURE_SUBSCRIPTION_ID 2e9633af-16cb-405f-a090-5d095059d8a6

# 3) 一鍵 provision + build + deploy
azd up
```

`azd up` 會做的事:
1. 跑 `infra/main.bicep` provision 11 個資源到 `rg-voicetw-westus3`
2. 把當前 user / SPN 的 objectId 寫成 `AZURE_PRINCIPAL_ID` → 自動拿 Key Vault & AI Services 權限(本機開發用)
3. 用 ACR 雲端 build Docker image
4. push 到 Container App,等 health probe 通過
5. 印出最終 URL

預期跑 8–12 分鐘。

---

## 3. 路徑 B:手動 Azure CLI 部署

如果你不想用 azd,或要把流程嵌到自家 CI/CD,可以照下面步驟。

### 3.1 Provision 基礎建設(Bicep)

```powershell
$RG = "rg-voicetw-westus3"
$LOC = "westus3"

# 建 resource group
az group create -n $RG -l $LOC

# 部署 Bicep(會建 ACR / AI Services / Container Apps Env / Container App / UAMI / KV / App Insights / Log Analytics / Budget)
az deployment group create `
  -g $RG `
  -f infra/main.bicep `
  --parameters infra/main.bicepparam `
  --parameters principalId=$(az ad signed-in-user show --query id -o tsv)
```

### 3.2 Build & Push Docker image

```powershell
$ACR = "crvoicetwwestus3sor5"   # 從 azd 部署或 az acr list 取得
$tag = "v$(Get-Date -Format yyyyMMddHHmmss)"

az acr build -r $ACR -t "voicetw-web:$tag" -t "voicetw-web:latest" -f Dockerfile .
```

### 3.3 上線到 Container App

```powershell
$APP = "ca-voicetw-web"

az containerapp update -g $RG -n $APP `
  --image "$ACR.azurecr.io/voicetw-web:$tag"

# 印目前 FQDN
az containerapp show -g $RG -n $APP --query properties.configuration.ingress.fqdn -o tsv
```

---

## 4. 滾動更新(日常 release flow)

```powershell
# 1) 改 code → commit → push
git add .; git commit -m "feat: …"; git push

# 2) Build 新 image
$tag = "v$(Get-Date -Format yyyyMMddHHmmss)"
az acr build -r crvoicetwwestus3sor5 -t "voicetw-web:$tag" -f Dockerfile .

# 3) Roll forward
az containerapp update -g rg-voicetw-westus3 -n ca-voicetw-web `
  --image "crvoicetwwestus3sor5.azurecr.io/voicetw-web:$tag"

# 4) 等新 revision Healthy + 100% traffic
do {
  Start-Sleep 8
  $r = az containerapp revision list -g rg-voicetw-westus3 -n ca-voicetw-web `
       --query "[0].{state:properties.runningState, traffic:properties.trafficWeight}" -o json | ConvertFrom-Json
  "$($r.state) traffic=$($r.traffic)"
} while ($r.state -ne 'Running' -or $r.traffic -lt 100)
```

> Container App 預設行為:新 revision 健康後**自動切 100% traffic**,舊的會在沒流量幾分鐘後縮到 0。

### 4.1 漸進式 / 藍綠部署

```powershell
# 部新 revision 但流量先給 0%
az containerapp update -g rg-voicetw-westus3 -n ca-voicetw-web `
  --image "crvoicetwwestus3sor5.azurecr.io/voicetw-web:$tag" `
  --revision-suffix "canary-$tag"

# 切 10% 給 canary
az containerapp ingress traffic set -g rg-voicetw-westus3 -n ca-voicetw-web `
  --revision-weight latest=90 ca-voicetw-web--canary-$tag=10

# 觀察一陣子沒問題,切 100%
az containerapp ingress traffic set -g rg-voicetw-westus3 -n ca-voicetw-web `
  --revision-weight ca-voicetw-web--canary-$tag=100
```

---

## 5. 回滾

```powershell
# 列出 revision
az containerapp revision list -g rg-voicetw-westus3 -n ca-voicetw-web `
  --query "[].{name:name, image:properties.template.containers[0].image, active:properties.active, created:properties.createdTime}" -o table

# 把 traffic 切回上一版
az containerapp ingress traffic set -g rg-voicetw-westus3 -n ca-voicetw-web `
  --revision-weight ca-voicetw-web--0000002=100
```

---

## 6. 設定值與環境變數

| 變數 | 哪裡用 | 取得方式 |
|---|---|---|
| `AZURE_AISERVICES_ENDPOINT` | 後端呼叫 Speech | `az cognitiveservices account show -g rg-voicetw-westus3 -n ai-voicetw-westus3 --query properties.endpoint -o tsv` |
| `AZURE_CLIENT_ID` | UAMI(AAD token) | `az identity show -g rg-voicetw-westus3 -n id-voicetw-westus3 --query clientId -o tsv` |
| `AZURE_SPEECH_REGION` | Speech SDK | `westus3` |
| `APPLICATIONINSIGHTS_CONNECTION_STRING` | telemetry | `az monitor app-insights component show -g rg-voicetw-westus3 -a appi-voicetw-westus3 --query connectionString -o tsv` |
| `TTS_DEFAULT_VOICE` | UI 預設語音 | `zh-TW-HsiaoChenNeural` |

Container App 上的環境變數已由 Bicep 自動注入,**不需手動設定**。本機開發要把上面的值寫進 `.env.local`。

---

## 7. 觀測 / 健康檢查

```powershell
# Liveness
curl https://ca-voicetw-web.yellowtree-b5a598c2.westus3.azurecontainerapps.io/api/health

# 看即時 log stream
az containerapp logs show -g rg-voicetw-westus3 -n ca-voicetw-web --tail 200 --follow

# 看 Container App 系統事件
az containerapp logs show -g rg-voicetw-westus3 -n ca-voicetw-web --type system --tail 50
```

App Insights KQL 報表都在 [`docs/analytics-kql.md`](analytics-kql.md)。

---

## 8. 成本控制

| 項目 | 設定 | 位置 |
|---|---|---|
| 月預算 | 100 USD,80% / 100% email 警示 | `infra/modules/observability.bicep` → `bg-voicetw-100usd` |
| Container App scale | min=1 max=5,0.5 vCPU / 1 Gi | `infra/modules/containerapp.bicep` |
| ACR | Basic SKU | `infra/modules/containerregistry.bicep` |
| Speech | 計費以字元數,輸入 5000 字上限保護 | `app/api/tts/route.ts` |

要調預算就改 `main.bicepparam` 的 `budgetAmount` 然後 `az deployment group create` 重跑(只更新預算,其他資源 idempotent)。

---

## 9. 常見問題排查

### 🔴 `az acr build` 中途 console 崩潰(`UnicodeEncodeError: cp1252`)
Windows 上 az CLI 串流 Next.js build log 含 ▲ 字會炸。**繞過方式**:
```powershell
az acr build -r <acr> -t voicetw-web:$tag --no-wait -f Dockerfile .
# 然後用以下 poll
do { Start-Sleep 15; $s = az acr task show-run -r <acr> --run-id ds<N> --query status -o tsv; $s } while ($s -in 'Queued','Running','Started')
```

### 🔴 Revision 起不來,health probe 一直 fail
1. `az containerapp logs show ... --type system --tail 30` 看是不是 image pull 失敗(ACR 權限)
2. UAMI 必須有 ACR `AcrPull` role(`infra/modules/containerapp.bicep` 已寫,如果手動建要自己加)
3. App log:`az containerapp logs show ... --tail 200 --follow`,通常是缺環境變數 → 看 `lib/env.ts` lazy getter 拋的 error

### 🔴 `/api/tts` 回 500 / `Failed to acquire AAD token`
- UAMI 沒被 Container App 帶上 → `az containerapp identity show -g rg-voicetw-westus3 -n ca-voicetw-web`
- UAMI 沒拿 AI Services `Cognitive Services User` role → `az role assignment create --assignee <uamiClientId> --role "Cognitive Services User" --scope <aiServicesResourceId>`

### 🔴 `/api/tts` 回 400 `voice_not_supported`
- 該 voice 不在 `lib/voices.ts` 白名單;或在白名單但 region 不支援
- 用 `curl https://westus3.tts.speech.microsoft.com/cognitiveservices/voices/list -H "Ocp-Apim-Subscription-Key: <key>"` 確認

### 🔴 Rate limit `429`
in-memory token bucket,**單實例 10 req/60s**。scale > 1 時實際限額 = 10 × 實例數。要精確就接 Redis(`lib/ratelimit.ts` 預留接口)。

### 🔴 部署後找不到 FQDN
```powershell
az containerapp show -g rg-voicetw-westus3 -n ca-voicetw-web --query properties.configuration.ingress.fqdn -o tsv
```

---

## 10. 全部砍掉重練

```powershell
# 砍 resource group(裡面所有資源一起走)
az group delete -n rg-voicetw-westus3 --yes --no-wait

# 砍 azd 環境
azd env delete voicetw-prod --force
```

> ⚠️ 連 App Insights / Log Analytics 歷史 telemetry 一起消失,要保留的話先 export。

---

## 11. CI/CD 範例(GitHub Actions)

```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push: { branches: [main] }
permissions: { id-token: write, contents: read }
jobs:
  build-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: azure/login@v2
        with:
          client-id:       ${{ secrets.AZURE_CLIENT_ID }}
          tenant-id:       ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}
      - name: Build & push
        run: |
          TAG=v$(date +%Y%m%d%H%M%S)
          az acr build -r crvoicetwwestus3sor5 -t voicetw-web:$TAG -t voicetw-web:latest -f Dockerfile .
          az containerapp update -g rg-voicetw-westus3 -n ca-voicetw-web \
            --image crvoicetwwestus3sor5.azurecr.io/voicetw-web:$TAG
```

設定 [Federated Credential](https://learn.microsoft.com/azure/active-directory/workload-identities/workload-identity-federation) 給這個 repo 的 `main` branch,Action 就能無 secret 部署。

---

## 12. 相關文件

- [`README.md`](../README.md) — 功能 / 結構 / 本機跑
- [`docs/analytics-kql.md`](analytics-kql.md) — KQL 報表
- [`docs/PROJECT-SUMMARY.md`](PROJECT-SUMMARY.md) — 上線總結
- [Azure Container Apps 文件](https://learn.microsoft.com/azure/container-apps/)
- [Azure AI Speech 文件](https://learn.microsoft.com/azure/ai-services/speech-service/)
