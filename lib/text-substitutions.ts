const EM_DASH = "—";
const EN_DASH = "–";
const ARROW = "→";

export function applyTextSubstitutions(
  value: string,
  cursor: number
): { value: string; cursor: number } {
  const beforeCursor = value.slice(0, cursor);
  const afterCursor = value.slice(cursor);

  if (beforeCursor.endsWith("-->")) {
    return {
      value: `${beforeCursor.slice(0, -3)}${ARROW}${afterCursor}`,
      cursor: cursor - 2,
    };
  }

  if (beforeCursor.endsWith(`${EM_DASH}>`) || beforeCursor.endsWith(`${EN_DASH}>`)) {
    return {
      value: `${beforeCursor.slice(0, -2)}${ARROW}${afterCursor}`,
      cursor: cursor - 1,
    };
  }

  if (
    beforeCursor.endsWith("--") &&
    !beforeCursor.endsWith("---") &&
    !beforeCursor.endsWith(ARROW)
  ) {
    const prefix = beforeCursor.slice(0, -2);
    const charBefore = prefix.slice(-1);
    if (!charBefore || /\s/.test(charBefore)) {
      return {
        value: `${prefix}${EM_DASH}${afterCursor}`,
        cursor: cursor - 1,
      };
    }
  }

  return { value, cursor };
}

export function handleSmartTextInput(
  element: HTMLTextAreaElement | HTMLInputElement,
  nextValue: string,
  onValueChange: (value: string) => void
) {
  const cursor = element.selectionStart ?? nextValue.length;
  const { value, cursor: nextCursor } = applyTextSubstitutions(nextValue, cursor);

  onValueChange(value);

  requestAnimationFrame(() => {
    element.setSelectionRange(nextCursor, nextCursor);
  });
}
