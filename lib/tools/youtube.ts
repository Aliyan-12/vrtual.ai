import fetch from "node-fetch";
import type { VideoDetails, YouTubeSearchResponse } from "@/types";

// Classify videos into channel-specific categories based on content signals
function classifyVideo(title: string, description: string, tags: string[], duration?: string): string {
  const t = title.toLowerCase();
  const d = description.toLowerCase();
  const allTags = tags.map(tag => tag.toLowerCase()).join(" ");
  const text = `${t} ${d} ${allTags}`;

  // Shorts: YouTube Shorts are typically under 60 seconds
  if (t.includes("#short") || t.includes("#shorts") || d.includes("#shorts")) return "Shorts";
  if (duration) {
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (match) {
      const totalSecs = (parseInt(match[1] || "0") * 3600) + (parseInt(match[2] || "0") * 60) + parseInt(match[3] || "0");
      if (totalSecs <= 60) return "Shorts";
    }
  }

  // Song: music-related content
  if (text.includes("song") || text.includes("music video") || text.includes("lyric") ||
      text.includes("duet") || text.includes("orchestral") || text.includes("r&b") ||
      text.includes("country rock") || text.includes("acoustic")) return "Song";

  // Podcast: interview/episode format
  if (text.includes("podcast") || text.includes("episode") || text.includes(" ep ") ||
      text.includes(" ep.") || text.includes("on the brink") || text.includes("interview") ||
      text.includes("guest") || text.includes("season") || /s\d+\s*ep?\s*\d+/i.test(t)) return "Podcast";

  // Guidance: how-to, advice, tips
  if (text.includes("how to") || text.includes("tips") || text.includes("advice") ||
      text.includes("guide") || text.includes("steps") || text.includes("strategy") ||
      text.includes("overcome") || text.includes("manage") || text.includes("cope")) return "Guidance";

  // Education: everything else analytical/educational
  return "Education";
}

export async function searchYouTube(query: string, maxResults = 4) {
  const url = new URL("https://www.googleapis.com/youtube/v3/search");

  url.searchParams.set("part", "snippet");
  url.searchParams.set("q", query);
  url.searchParams.set("type", "video");
  url.searchParams.set("maxResults", maxResults.toString());
  url.searchParams.set("channelId", process.env.CHANNEL_ID!);
  url.searchParams.set("key", process.env.YOUTUBE_API_KEY!);
  url.searchParams.set("publishedAfter", "2024-09-01T00:00:00Z");

  const res = await fetch(url.toString());
  if(!res.ok) {
    throw new Error("YouTube API request failed");
  }

  const data = (await res.json()) as YouTubeSearchResponse

  return data.items.map((item: any) => ({
    title: item.snippet.title,
    description: item.snippet.description,
    id: item.id.videoId,
    thumbnail: item.snippet.thumbnails.medium.url,
    url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
  }));
}

export async function fetchFullDescription(videoId: string): Promise<string> {
  const details = await fetchVideoDetails(videoId);
  return details.description;
}

export async function fetchVideoDetails(videoId: string): Promise<VideoDetails> {
  const res = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?` +
    new URLSearchParams({
      part: "snippet,contentDetails",
      id: videoId,
      key: process.env.YOUTUBE_API_KEY!,
    })
  );

  const json = await res.json() as any;
  const item = json.items?.[0];
  const snippet = item?.snippet;
  const duration = item?.contentDetails?.duration;
  const title = snippet?.title ?? "";
  const description = snippet?.description ?? "";
  const tags = snippet?.tags ?? [];

  return {
    description,
    category: classifyVideo(title, description, tags, duration),
    tags,
  };
}
