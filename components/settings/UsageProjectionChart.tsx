import { formatUsd, type TokenUsageStats } from "@/lib/usage";

const DAYS_IN_MONTH = 30;
const CLAUDE_PRO_MONTHLY_USD = 20;

const CHART_WIDTH = 640;
const CHART_HEIGHT = 220;
const PADDING = { top: 20, right: 20, bottom: 36, left: 52 };

function formatAxisUsd(value: number) {
  if (value >= 10) {
    return `$${value.toFixed(0)}`;
  }
  if (value >= 1) {
    return `$${value.toFixed(1)}`;
  }
  if (value === 0) {
    return "$0";
  }
  return `$${value.toFixed(2)}`;
}

export function UsageProjectionChart({ stats }: { stats: TokenUsageStats }) {
  const plotWidth = CHART_WIDTH - PADDING.left - PADDING.right;
  const plotHeight = CHART_HEIGHT - PADDING.top - PADDING.bottom;
  const monthlyProjection = stats.projectedMonthlyPriceUsd;
  const yMax = Math.max(CLAUDE_PRO_MONTHLY_USD, monthlyProjection * 1.12, 1);

  const dayToX = (day: number) =>
    PADDING.left + ((day - 1) / (DAYS_IN_MONTH - 1)) * plotWidth;
  const usdToY = (usd: number) =>
    PADDING.top + plotHeight - (usd / yMax) * plotHeight;

  const proLineY = usdToY(CLAUDE_PRO_MONTHLY_USD);
  const trajectoryStart = { x: dayToX(1), y: usdToY(0) };
  const trajectoryEnd = {
    x: dayToX(DAYS_IN_MONTH),
    y: usdToY(monthlyProjection),
  };

  const yTicks = [0, yMax * 0.5, yMax].map((value) => ({
    value,
    y: usdToY(value),
    label: formatAxisUsd(value),
  }));

  const xTickDays = [1, 15, DAYS_IN_MONTH];

  return (
    <div className="mt-2 border-t border-[var(--color-border-subtle)] pt-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[13px] font-medium tracking-[-0.01em] text-[var(--color-bone)]">
          Monthly spend projection
        </p>
        <div className="flex flex-wrap items-center gap-4 text-[11px] text-[var(--color-pumice)]">
          <span className="inline-flex items-center gap-2">
            <span
              className="inline-block h-0 w-5 border-t-2 border-dotted border-[#ff9500]"
              aria-hidden
            />
            Claude Pro ($20/mo)
          </span>
          <span className="inline-flex items-center gap-2">
            <span
              className="inline-block h-0 w-5 border-t-2 border-dotted border-[var(--color-glacier)]"
              aria-hidden
            />
            Projected usage
          </span>
        </div>
      </div>

      <svg
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        className="h-[220px] w-full"
        role="img"
        aria-label="Monthly spend projection chart comparing Claude Pro subscription cost to projected API usage"
      >
        {yTicks.map(({ value, y, label }) => (
          <g key={`y-${value}`}>
            <line
              x1={PADDING.left}
              y1={y}
              x2={CHART_WIDTH - PADDING.right}
              y2={y}
              stroke="var(--color-border-subtle)"
              strokeWidth={1}
            />
            <text
              x={PADDING.left - 10}
              y={y + 4}
              textAnchor="end"
              className="fill-[var(--color-pumice)] text-[10px]"
            >
              {label}
            </text>
          </g>
        ))}

        <line
          x1={PADDING.left}
          y1={PADDING.top + plotHeight}
          x2={CHART_WIDTH - PADDING.right}
          y2={PADDING.top + plotHeight}
          stroke="var(--color-frost)"
          strokeWidth={1}
        />
        <line
          x1={PADDING.left}
          y1={PADDING.top}
          x2={PADDING.left}
          y2={PADDING.top + plotHeight}
          stroke="var(--color-frost)"
          strokeWidth={1}
        />

        {xTickDays.map((day) => (
          <text
            key={`x-${day}`}
            x={dayToX(day)}
            y={CHART_HEIGHT - 12}
            textAnchor="middle"
            className="fill-[var(--color-pumice)] text-[10px]"
          >
            {day}
          </text>
        ))}

        <text
          x={16}
          y={PADDING.top + plotHeight / 2}
          textAnchor="middle"
          transform={`rotate(-90 16 ${PADDING.top + plotHeight / 2})`}
          className="fill-[var(--color-pumice)] text-[10px]"
        >
          Cost
        </text>
        <text
          x={PADDING.left + plotWidth / 2}
          y={CHART_HEIGHT - 2}
          textAnchor="middle"
          className="fill-[var(--color-pumice)] text-[10px]"
        >
          Day of month
        </text>

        <line
          x1={PADDING.left}
          y1={proLineY}
          x2={CHART_WIDTH - PADDING.right}
          y2={proLineY}
          stroke="#ff9500"
          strokeWidth={1.5}
          strokeDasharray="5 4"
        />

        <line
          x1={trajectoryStart.x}
          y1={trajectoryStart.y}
          x2={trajectoryEnd.x}
          y2={trajectoryEnd.y}
          stroke="var(--color-glacier)"
          strokeWidth={1.5}
          strokeDasharray="5 4"
        />

        <circle
          cx={trajectoryEnd.x}
          cy={trajectoryEnd.y}
          r={3}
          fill="var(--color-glacier)"
        />
      </svg>

      <p className="mt-1 text-[11px] text-[var(--color-pumice)]">
        Projected month-end spend: {formatUsd(monthlyProjection)} at current daily
        rate ({formatUsd(stats.avgDailyPriceUsd)}/day).
      </p>
    </div>
  );
}
