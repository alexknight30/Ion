export function formatThoughtTimestamp(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  const datePart = date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const timePart = date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });

  return `${datePart} - ${timePart}`;
}

export function formatThoughtDayHeader(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function getThoughtDayKey(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export function wasThoughtEdited(note: {
  createdAt: string;
  updatedAt: string;
}) {
  return (
    new Date(note.updatedAt).getTime() >
    new Date(note.createdAt).getTime() + 1000
  );
}
