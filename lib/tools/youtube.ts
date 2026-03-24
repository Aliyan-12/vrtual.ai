import fetch from "node-fetch";

interface YouTubeSearchResponse {
  items: YouTubeSearchItem[];
}

interface YouTubeSearchItem {
  id: {
    videoId: string;
  };
  snippet: {
    title: string;
    description: string;
    thumbnails: {
      medium: {
        url: string;
      };
    };
  };
}

export interface VideoDetails {
  description: string;
  category: string;
  tags: string[];
}

// YouTube category IDs to names
const CATEGORY_MAP: Record<string, string> = {
  "1": "Film & Animation", "2": "Autos & Vehicles", "10": "Music",
  "15": "Pets & Animals", "17": "Sports", "19": "Travel & Events",
  "20": "Gaming", "22": "People & Blogs", "23": "Comedy",
  "24": "Entertainment", "25": "News & Politics", "26": "Howto & Style",
  "27": "Education", "28": "Science & Technology", "29": "Nonprofits & Activism",
};

export async function searchYouTube(query: string, maxResults = 4) {
  const url = new URL("https://www.googleapis.com/youtube/v3/search");

  url.searchParams.set("part", "snippet");
  url.searchParams.set("q", query);
  url.searchParams.set("type", "video");
  url.searchParams.set("maxResults", maxResults.toString());
  url.searchParams.set("channelId", process.env.CHANNEL_ID!);
  url.searchParams.set("key", process.env.YOUTUBE_API_KEY!);

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
      part: "snippet",
      id: videoId,
      key: process.env.YOUTUBE_API_KEY!,
    })
  );

  const json = await res.json() as any;
  const snippet = json.items?.[0]?.snippet;

  return {
    description: snippet?.description ?? "",
    category: CATEGORY_MAP[snippet?.categoryId] ?? "Unknown",
    tags: snippet?.tags ?? [],
  };
}
