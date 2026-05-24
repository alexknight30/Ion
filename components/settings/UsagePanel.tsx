"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { fieldLabelClassName, inputClassName } from "@/lib/form-styles";
import {
  EMPTY_USAGE_STATS,
  fetchUsageStats,
  formatTokenCount,
  formatUsd,
  type TokenUsageStats,
} from "@/lib/usage";
import { SettingsSection } from "./SettingsSection";

const USAGE_FIELDS = [
  {
    id: "usage-avg-daily-input",
    label: "Avg daily token burn — input",
    format: (stats: TokenUsageStats) =>
      formatTokenCount(stats.avgDailyInputTokens),
  },
  {
    id: "usage-avg-daily-output",
    label: "Avg daily token burn — output",
    format: (stats: TokenUsageStats) =>
      formatTokenCount(stats.avgDailyOutputTokens),
  },
  {
    id: "usage-avg-daily-total",
    label: "Avg daily token burn — total",
    format: (stats: TokenUsageStats) =>
      formatTokenCount(stats.avgDailyTotalTokens),
  },
  {
    id: "usage-avg-daily-price",
    label: "Avg daily token price — total",
    format: (stats: TokenUsageStats) => formatUsd(stats.avgDailyPriceUsd),
  },
  {
    id: "usage-projected-monthly-tokens",
    label: "Projected monthly token burn — total",
    format: (stats: TokenUsageStats) =>
      formatTokenCount(stats.projectedMonthlyTotalTokens),
  },
  {
    id: "usage-projected-monthly-price",
    label: "Projected monthly price",
    format: (stats: TokenUsageStats) =>
      formatUsd(stats.projectedMonthlyPriceUsd),
  },
] as const;

function ReadOnlyField({
  id,
  label,
  value,
}: {
  id: string;
  label: string;
  value: string;
}) {
  return (
    <div>
      <label htmlFor={id} className={fieldLabelClassName}>
        {label}
      </label>
      <output
        id={id}
        className={cn(
          inputClassName,
          "block cursor-default bg-[var(--color-ash)] text-[var(--color-steam)]"
        )}
      >
        {value}
      </output>
    </div>
  );
}

export function UsagePanel() {
  const [stats, setStats] = useState<TokenUsageStats>(EMPTY_USAGE_STATS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUsageStats()
      .then(setStats)
      .catch(() => {
        setError("Could not load usage stats.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return (
    <SettingsSection label="Usage" index={2}>
      {error ? (
        <p className="mb-4 text-[13px] text-[var(--color-ember)]">{error}</p>
      ) : null}

      {loading ? (
        <p className="text-[13px] text-[var(--color-pumice)]">Loading…</p>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {USAGE_FIELDS.map(({ id, label, format }) => (
            <ReadOnlyField
              key={id}
              id={id}
              label={label}
              value={format(stats)}
            />
          ))}
        </div>
      )}
    </SettingsSection>
  );
}
