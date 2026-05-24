export function parsePinnedIdList(value: string | null | undefined): string[] {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [];

    return [
      ...new Set(
        parsed
          .filter((entry): entry is string => typeof entry === "string")
          .map((entry) => entry.trim())
          .filter(Boolean)
      ),
    ];
  } catch {
    return [];
  }
}

export function serializePinnedIdList(ids: string[]): string {
  return JSON.stringify([...new Set(ids)]);
}
