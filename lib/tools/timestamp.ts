export function extractTimestamps(description?: string) {
  if (!description) return [];

  const lines = description.split("\n");
  const sections: { time: string; seconds: number; label?: string }[] = [];
  const seen = new Set<number>();

  // Match multiple timestamp formats:
  // "00:00 | Label"          (MM:SS pipe)
  // "00:00 - Label"          (MM:SS dash)
  // "00:00 Label"            (MM:SS space)
  // "0:00:00 | Label"        (H:MM:SS pipe)
  // "00:00:00 Label"         (HH:MM:SS space)
  // "(00:02:17 to 00:03:02)" (inline range — takes the start)
  const chapterRegex = /^\s*(\d{1,2}:\d{2}(?::\d{2})?)\s*[-|]?\s*(.+)$/;
  const inlineRegex = /\((\d{1,2}:\d{2}:\d{2})\s+to\s+\d{1,2}:\d{2}:\d{2}\)/g;

  for (const line of lines) {
    // Try chapter format first
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

    // Try inline timestamps (from description paragraphs)
    let inlineMatch;
    while ((inlineMatch = inlineRegex.exec(line)) !== null) {
      const time = inlineMatch[1];
      const secs = parseTimeToSeconds(time);
      if (!seen.has(secs)) {
        seen.add(secs);
        // Extract surrounding text as label (take text before the parenthesis)
        const before = line.substring(0, inlineMatch.index).trim();
        const label = before.split(".").pop()?.trim() || before.slice(-80).trim();
        sections.push({ time, seconds: secs, label: label || undefined });
      }
    }
  }

  // Sort by time
  sections.sort((a, b) => a.seconds - b.seconds);

  return sections;
}

function parseTimeToSeconds(time: string): number {
  const parts = time.split(":").map(Number);
  if (parts.length === 3) {
    // HH:MM:SS
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  // MM:SS
  return parts[0] * 60 + parts[1];
}
