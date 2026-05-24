const STORAGE_KEY = "ion:artifact-recents";

export type ArtifactRecents = Record<string, number>;

function readRecents(): ArtifactRecents {
  if (typeof window === "undefined") return {};

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as ArtifactRecents;
  } catch {
    return {};
  }
}

function writeRecents(recents: ArtifactRecents) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(recents));
}

export function getArtifactRecents(): ArtifactRecents {
  return readRecents();
}

export function touchArtifactRecent(artifactId: string) {
  const recents = readRecents();
  recents[artifactId] = Date.now();
  writeRecents(recents);
}

export function sortArtifactsByRecent<
  T extends { id: string; updatedAt: string },
>(artifacts: T[], recents: ArtifactRecents = getArtifactRecents()): T[] {
  return [...artifacts].sort((left, right) => {
    const leftOpened = recents[left.id] ?? 0;
    const rightOpened = recents[right.id] ?? 0;

    if (leftOpened !== rightOpened) {
      return rightOpened - leftOpened;
    }

    return (
      new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
    );
  });
}
