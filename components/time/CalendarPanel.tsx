"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Surface } from "@/components/ui/Surface";
import { Label } from "@/components/ui/Label";
import { cn } from "@/lib/cn";
import {
  getMonthCells,
  getMonthLabel,
  isSameDay,
  shiftMonth,
  WEEKDAY_LABELS,
} from "@/lib/calendar";

interface CalendarPanelProps {
  index?: number;
  className?: string;
}

export function CalendarPanel({ index = 0, className }: CalendarPanelProps) {
  const today = useMemo(() => new Date(), []);
  const [visibleMonth, setVisibleMonth] = useState(() => ({
    year: today.getFullYear(),
    month: today.getMonth(),
  }));
  const [selectedDate, setSelectedDate] = useState(() => ({
    year: today.getFullYear(),
    month: today.getMonth(),
    day: today.getDate(),
  }));

  const cells = useMemo(
    () => getMonthCells(visibleMonth.year, visibleMonth.month),
    [visibleMonth.month, visibleMonth.year]
  );

  const monthLabel = getMonthLabel(visibleMonth.year, visibleMonth.month);

  function goToPreviousMonth() {
    setVisibleMonth((current) => shiftMonth(current.year, current.month, -1));
  }

  function goToNextMonth() {
    setVisibleMonth((current) => shiftMonth(current.year, current.month, 1));
  }

  return (
    <Surface index={index} className={cn("flex shrink-0 flex-col", className)}>
      <Label>Calendar</Label>

      <div className="mt-5 flex flex-col">
        <div className="mb-4 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={goToPreviousMonth}
            aria-label="Previous month"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] text-[var(--color-pumice)] transition-colors duration-200 hover:bg-[var(--color-ash)] hover:text-[var(--color-bone)]"
          >
            <ChevronLeft size={16} strokeWidth={1.5} />
          </button>

          <span className="min-w-0 truncate text-[15px] font-medium tracking-[-0.02em] text-[var(--color-bone)]">
            {monthLabel}
          </span>

          <button
            type="button"
            onClick={goToNextMonth}
            aria-label="Next month"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] text-[var(--color-pumice)] transition-colors duration-200 hover:bg-[var(--color-ash)] hover:text-[var(--color-bone)]"
          >
            <ChevronRight size={16} strokeWidth={1.5} />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-y-1">
          {WEEKDAY_LABELS.map((label) => (
            <span
              key={label}
              className="pb-2 text-center text-[11px] font-medium tracking-[-0.01em] text-[var(--color-pumice)]"
            >
              {label}
            </span>
          ))}

          {cells.map((day, index) => {
            if (day === null) {
              return <span key={`empty-${index}`} aria-hidden className="h-9" />;
            }

            const isToday = isSameDay(
              today,
              visibleMonth.year,
              visibleMonth.month,
              day
            );
            const isSelected =
              selectedDate.year === visibleMonth.year &&
              selectedDate.month === visibleMonth.month &&
              selectedDate.day === day;

            return (
              <button
                key={`${visibleMonth.year}-${visibleMonth.month}-${day}`}
                type="button"
                onClick={() =>
                  setSelectedDate({
                    year: visibleMonth.year,
                    month: visibleMonth.month,
                    day,
                  })
                }
                className={cn(
                  "mx-auto flex h-9 w-9 items-center justify-center rounded-full text-[13px] tracking-[-0.01em] transition-[background-color,color,box-shadow] duration-200",
                  isSelected
                    ? "bg-[var(--color-ash)] text-[var(--color-glacier)]"
                    : isToday
                      ? "text-[var(--color-glacier)] ring-1 ring-[var(--color-border-active)]"
                      : "text-[var(--color-bone)] hover:bg-[var(--color-ash)]"
                )}
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>
    </Surface>
  );
}
