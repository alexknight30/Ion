export const WEEKDAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"] as const;

export function getMonthLabel(year: number, month: number) {
  return new Date(year, month, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}

export function getMonthCells(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leadingEmpty = firstDay.getDay();
  const cells: Array<number | null> = [];

  for (let index = 0; index < leadingEmpty; index += 1) {
    cells.push(null);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(day);
  }

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return cells;
}

export function isSameDay(
  left: Date,
  rightYear: number,
  rightMonth: number,
  rightDay: number
) {
  return (
    left.getFullYear() === rightYear &&
    left.getMonth() === rightMonth &&
    left.getDate() === rightDay
  );
}

export function shiftMonth(year: number, month: number, delta: number) {
  const date = new Date(year, month + delta, 1);
  return { year: date.getFullYear(), month: date.getMonth() };
}

export interface CalendarDate {
  year: number;
  month: number;
  day: number;
}

export function toDateKey({ year, month, day }: CalendarDate) {
  const monthPart = String(month + 1).padStart(2, "0");
  const dayPart = String(day).padStart(2, "0");
  return `${year}-${monthPart}-${dayPart}`;
}

export function formatTodoListDate({ year, month, day }: CalendarDate) {
  return new Date(year, month, day).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function getTodayDate(): CalendarDate {
  const today = new Date();
  return {
    year: today.getFullYear(),
    month: today.getMonth(),
    day: today.getDate(),
  };
}

export function shiftDay(date: CalendarDate, delta: number): CalendarDate {
  const next = new Date(date.year, date.month, date.day + delta);
  return {
    year: next.getFullYear(),
    month: next.getMonth(),
    day: next.getDate(),
  };
}

export function formatInboxDayNav({ year, month, day }: CalendarDate) {
  return new Date(year, month, day).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

// Matches CalendarPanel height for a 6-row month (31-day months).
export const CALENDAR_PANEL_HEIGHT_CLASS = "h-[26.375rem]";
