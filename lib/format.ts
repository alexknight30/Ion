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
