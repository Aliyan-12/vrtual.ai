export function extractTimestamps(description?: string) {
  if (!description) return [];

  const lines = description.split("\n");
  const sections: { time: string; seconds: number; label?: string }[] = [];
  const seen = new Set<number>();

  const chapterRegex = /^\s*(\d{1,2}:\d{2}(?::\d{2})?)\s*[-|]?\s*(.+)$/;
  const inlineRegex = /\((\d{1,2}:\d{2}:\d{2})\s+to\s+\d{1,2}:\d{2}:\d{2}\)/g;

  for (const line of lines) {
    const match = line.match(chapterRegex);
    if (match) {
      const [, time, label] = match;
      const secs = parseTimeToSeconds(time);
      if (!seen.has(secs)) {
        seen.add(secs);
        sections.push({ time, seconds: secs, label: label.trim() });
      }
      continue;
    }

    let inlineMatch;
    while ((inlineMatch = inlineRegex.exec(line)) !== null) {
      const time = inlineMatch[1];
      const secs = parseTimeToSeconds(time);
      if (!seen.has(secs)) {
        seen.add(secs);
        const before = line.substring(0, inlineMatch.index).trim();
        const label = before.split(".").pop()?.trim() || before.slice(-80).trim();
        sections.push({ time, seconds: secs, label: label || undefined });
      }
    }
  }

  sections.sort((a, b) => a.seconds - b.seconds);
  return sections;
}

function parseTimeToSeconds(time: string): number {
  const parts = time.split(":").map(Number);
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  return parts[0] * 60 + parts[1];
}

/**
 * Extract category from video description.
 * Looks for: "### Category: Song" or "Category: Podcast, Advice" etc.
 * Returns "Unknown" if no category marker found.
 */
export function extractCategory(description?: string): string {
  if (!description) return "Unknown";

  const match = description.match(/#{0,4}\s*Category:\s*(.+)/i);
  if (match) {
    return match[1].trim().split(",")[0].trim();
  }

  return "Unknown";
}
