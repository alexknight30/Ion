export interface TokenUsageStats {
  avgDailyInputTokens: number;
  avgDailyOutputTokens: number;
  avgDailyTotalTokens: number;
  avgDailyPriceUsd: number;
  projectedMonthlyTotalTokens: number;
  projectedMonthlyPriceUsd: number;
}

const DAYS_IN_MONTH = 30;

export function buildUsageStats(daily: {
  inputTokens: number;
  outputTokens: number;
  priceUsd: number;
}): TokenUsageStats {
  const avgDailyTotalTokens = daily.inputTokens + daily.outputTokens;

  return {
    avgDailyInputTokens: daily.inputTokens,
    avgDailyOutputTokens: daily.outputTokens,
    avgDailyTotalTokens,
    avgDailyPriceUsd: daily.priceUsd,
    projectedMonthlyTotalTokens: avgDailyTotalTokens * DAYS_IN_MONTH,
    projectedMonthlyPriceUsd: daily.priceUsd * DAYS_IN_MONTH,
  };
}

export const EMPTY_USAGE_STATS = buildUsageStats({
  inputTokens: 0,
  outputTokens: 0,
  priceUsd: 0,
});

export function formatTokenCount(value: number) {
  return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

export function formatUsd(value: number) {
  return value.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export async function fetchUsageStats(): Promise<TokenUsageStats> {
  const response = await fetch("/api/usage");
  if (!response.ok) {
    throw new Error("Failed to load usage stats");
  }
  return response.json();
}
