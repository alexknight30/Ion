"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
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
import { UsageProjectionChart } from "./UsageProjectionChart";

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

interface UsagePanelProps {
  isActive?: boolean;
}

export function UsagePanel({ isActive = true }: UsagePanelProps) {
  const [stats, setStats] = useState<TokenUsageStats>(EMPTY_USAGE_STATS);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedOnce = useRef(false);

  const loadStats = useCallback(async (background = false) => {
    if (background) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const data = await fetchUsageStats();
      setStats(data);
      hasLoadedOnce.current = true;
    } catch {
      setError("Could not load usage stats.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!isActive) return;

    if (!hasLoadedOnce.current) {
      void loadStats(false);
      return;
    }

    void loadStats(true);
  }, [isActive, loadStats]);

  return (
    <SettingsSection
      label="Usage"
      index={2}
      status={refreshing ? "Refreshing…" : undefined}
      headerAction={
        <button
          type="button"
          onClick={() => {
            void loadStats(true);
          }}
          disabled={loading || refreshing}
          aria-label="Refresh usage stats"
          className="flex h-7 w-7 items-center justify-center rounded-[6px] text-[var(--color-pumice)] transition-colors duration-200 hover:bg-[var(--color-ash)] hover:text-[var(--color-steam)] disabled:opacity-50"
        >
          <RefreshCw
            size={14}
            strokeWidth={1.5}
            className={refreshing ? "animate-spin" : undefined}
          />
        </button>
      }
    >
      {error ? (
        <p className="mb-4 text-[13px] text-[var(--color-ember)]">{error}</p>
      ) : null}

      {loading ? (
        <p className="text-[13px] text-[var(--color-pumice)]">Loading…</p>
      ) : (
        <>
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
          <UsageProjectionChart stats={stats} />
        </>
      )}
    </SettingsSection>
  );
}
