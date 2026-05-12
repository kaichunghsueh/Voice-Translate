# Voice-TW · A/B & Telemetry KQL

App Insights: `appi-voicetw-westus3` (AppId `2f64358a-6a2f-4337-868c-82f403efa5c9`)
Resource group: `rg-voicetw-westus3` · Subscription `2e9633af-16cb-405f-a090-5d095059d8a6`

Portal Logs blade:
https://portal.azure.com/#@16b3c013-d300-468d-ac64-7eda0820b6d3/resource/subscriptions/2e9633af-16cb-405f-a090-5d095059d8a6/resourceGroups/rg-voicetw-westus3/providers/Microsoft.Insights/components/appi-voicetw-westus3/logs

> 事件名稱:`tts_generate`、`tts_error`、`tts_ab_vote`
> 注意:App Insights ingestion 大約有 1–3 分鐘延遲,剛產生的資料請稍等。

## 1) A/B 勝出分佈(誰贏比較多)
```kusto
customEvents
| where timestamp > ago(7d)
| where name == "tts_ab_vote"
| extend experimentId = tostring(customDimensions.experimentId),
         winner       = tostring(customDimensions.winner),
         variantA     = tostring(customDimensions.variantA),
         variantB     = tostring(customDimensions.variantB)
| summarize votes = count() by experimentId, winner
| order by experimentId asc, votes desc
```

## 2) 各語音的 TTS 延遲 p50 / p95
```kusto
customEvents
| where timestamp > ago(7d)
| where name == "tts_generate"
| extend voice    = tostring(customDimensions.voice),
         variant  = tostring(customDimensions.variant),
         duration = toint(customDimensions.durationMs)
| summarize calls=count(),
            p50=percentile(duration, 50),
            p95=percentile(duration, 95),
            avgMs=avg(duration)
        by voice, variant
| order by calls desc
```

## 3) 不支援語音 / Fallback 比率
```kusto
customEvents
| where timestamp > ago(7d)
| where name == "tts_generate"
| extend voiceRequested = tostring(customDimensions.voiceRequested),
         voiceUsed      = tostring(customDimensions.voice),
         fellBack       = tostring(customDimensions.fellBack)
| summarize total=count(),
            fallbacks=countif(fellBack == "true")
        by voiceRequested, voiceUsed
| extend fallbackRate = round(100.0 * fallbacks / total, 1)
| order by total desc
```

## 4) 錯誤率與訊息分佈
```kusto
customEvents
| where timestamp > ago(7d)
| where name == "tts_error"
| extend voice   = tostring(customDimensions.voice),
         message = tostring(customDimensions.message),
         status  = tostring(customDimensions.status)
| summarize errors=count() by voice, status, message
| order by errors desc
```

## 5) 每小時呼叫量(找尖峰)
```kusto
customEvents
| where timestamp > ago(7d)
| where name == "tts_generate"
| summarize calls=count() by bin(timestamp, 1h)
| render timechart
```

## 6) A/B 結論信賴度(簡易雙比例檢定觀感版)
```kusto
customEvents
| where timestamp > ago(30d)
| where name == "tts_ab_vote"
| extend experimentId=tostring(customDimensions.experimentId),
         winner=tostring(customDimensions.winner)
| summarize
    aWins  = countif(winner == "A"),
    bWins  = countif(winner == "B"),
    ties   = countif(winner == "tie"),
    total  = count()
  by experimentId
| extend aPct = round(100.0*aWins/total,1),
         bPct = round(100.0*bWins/total,1),
         tiePct = round(100.0*ties/total,1)
```
