// 估算 Azure Speech Neural TTS 每段語音的概略費用 (TWD)
// 預設依 Azure 官方公告價: Neural Standard ≈ USD 16 / 1,000,000 chars
// 匯率預設 USD→TWD ≈ 32 (可透過環境變數覆寫)
// 注意:此為估算用,實際帳單以 Azure 對帳單為準。

const USD_PER_MILLION_CHARS = Number(
  process.env.NEXT_PUBLIC_TTS_USD_PER_M_CHARS ?? '16'
);
const USD_TO_TWD = Number(process.env.NEXT_PUBLIC_USD_TO_TWD ?? '32');

export function estimateCostTwd(textLength: number): number {
  if (!textLength || textLength <= 0) return 0;
  const usd = (textLength / 1_000_000) * USD_PER_MILLION_CHARS;
  return usd * USD_TO_TWD;
}

export function formatTwd(twd: number): string {
  if (twd <= 0) return 'NT$0';
  if (twd < 0.01) return '<NT$0.01';
  if (twd < 1) return `≈ NT$${twd.toFixed(3)}`;
  return `≈ NT$${twd.toFixed(2)}`;
}

export function costLabel(textLength: number): string {
  return formatTwd(estimateCostTwd(textLength));
}
