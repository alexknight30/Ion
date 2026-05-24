import { db } from "@/lib/db";
import { buildUsageStats, type TokenUsageStats } from "@/lib/usage";

const LOOKBACK_DAYS = 30;

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getLookbackStartDate() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (LOOKBACK_DAYS - 1));
  return toDateKey(start);
}

export async function getUsageStats(): Promise<TokenUsageStats> {
  const startDate = getLookbackStartDate();
  const logs = await db.tokenUsageLog.findMany({
    where: { date: { gte: startDate } },
    select: {
      date: true,
      inputTokens: true,
      outputTokens: true,
      priceUsd: true,
    },
  });

  const totals = logs.reduce(
    (acc, log) => {
      acc.inputTokens += log.inputTokens;
      acc.outputTokens += log.outputTokens;
      acc.priceUsd += log.priceUsd;
      acc.activeDays.add(log.date);
      return acc;
    },
    {
      inputTokens: 0,
      outputTokens: 0,
      priceUsd: 0,
      activeDays: new Set<string>(),
    }
  );

  const daysWithActivity = Math.max(totals.activeDays.size, 1);

  return buildUsageStats({
    inputTokens: totals.inputTokens / daysWithActivity,
    outputTokens: totals.outputTokens / daysWithActivity,
    priceUsd: totals.priceUsd / daysWithActivity,
  });
}

export async function logTokenUsage(params: {
  date: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  priceUsd: number;
}) {
  await db.tokenUsageLog.create({
    data: {
      date: params.date,
      model: params.model,
      inputTokens: params.inputTokens,
      outputTokens: params.outputTokens,
      priceUsd: params.priceUsd,
    },
  });
}
