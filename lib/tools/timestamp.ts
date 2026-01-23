export function extractTimestamps(description?: string) {
  if (!description) return [];

  const lines = description.split("\n");
  // const regex = /(\d{1,2}:\d{2})(?:\s*-?\s*)(.+)?/g;
  const chapterRegex = /^\s*(\d{1,2}:\d{2})\s*\|\s*(.+)$/;
  const sections: { time: string; seconds: number; label?: string }[] = [];

  for (const line of lines) {
    const match = line.match(chapterRegex);
    if (!match) continue;

    const [, time, label] = match;
    const [minutes, seconds] = time.split(":").map(Number);

    sections.push({
      time,
      seconds: minutes * 60 + seconds,
      label: label.trim(),
    });
  }
  // let match;
  // while ((match = regex.exec(description)) !== null) {
  //   const [_, time, label] = match;
  //   const [m, s] = time.split(":").map(Number);

  //   sections.push({
  //     time,
  //     seconds: m * 60 + s,
  //     label: label?.trim(),
  //   });
  // }

  return sections;
}