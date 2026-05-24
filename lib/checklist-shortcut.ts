export function isChecklistShortcut(event: Pick<KeyboardEvent, "altKey" | "metaKey" | "ctrlKey" | "shiftKey" | "code" | "key">) {
  if (!event.altKey || event.metaKey || event.ctrlKey || event.shiftKey) {
    return false;
  }

  return event.code === "Minus" || event.key === "-" || event.key === "–" || event.key === "—";
}
