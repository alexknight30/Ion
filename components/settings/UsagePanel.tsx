"use client";

import { cn } from "@/lib/cn";
import { fieldLabelClassName, inputClassName } from "@/lib/form-styles";
import {
  EMPTY_USAGE_STATS,
  formatTokenCount,
  formatUsd,
} from "@/lib/usage";
import { SettingsSection } from "./SettingsSection";

const USAGE_FIELDS = [
  {
    id: "usage-avg-daily-input",
    label: "Avg daily token burn — input",
    format: (stats: typeof EMPTY_USAGE_STATS) =>
      formatTokenCount(stats.avgDailyInputTokens),
  },
  {
    id: "usage-avg-daily-output",
    label: "Avg daily token burn — output",
    format: (stats: typeof EMPTY_USAGE_STATS) =>
      formatTokenCount(stats.avgDailyOutputTokens),
  },
  {
    id: "usage-avg-daily-total",
    label: "Avg daily token burn — total",
    format: (stats: typeof EMPTY_USAGE_STATS) =>
      formatTokenCount(stats.avgDailyTotalTokens),
  },
  {
    id: "usage-avg-daily-price",
    label: "Avg daily token price — total",
    format: (stats: typeof EMPTY_USAGE_STATS) =>
      formatUsd(stats.avgDailyPriceUsd),
  },
  {
    id: "usage-projected-monthly-tokens",
    label: "Projected monthly token burn — total",
    format: (stats: typeof EMPTY_USAGE_STATS) =>
      formatTokenCount(stats.projectedMonthlyTotalTokens),
  },
  {
    id: "usage-projected-monthly-price",
    label: "Projected monthly price",
    format: (stats: typeof EMPTY_USAGE_STATS) =>
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
  const stats = EMPTY_USAGE_STATS;

  return (
    <SettingsSection label="Usage" index={2}>
      <div className="grid gap-5 md:grid-cols-2">
        {USAGE_FIELDS.map(({ id, label, format }) => (
          <ReadOnlyField key={id} id={id} label={label} value={format(stats)} />
        ))}
      </div>
    </SettingsSection>
  );
}
