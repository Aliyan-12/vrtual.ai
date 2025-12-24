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

export async function searchYouTube(query: string) {
  const url = new URL("https://www.googleapis.com/youtube/v3/search");

  url.searchParams.set("part", "snippet");
  url.searchParams.set("q", query);
  url.searchParams.set("type", "video");
  url.searchParams.set("maxResults", "5");
  url.searchParams.set("key", process.env.YOUTUBE_API_KEY!);

  const res = await fetch(url.toString());
  if(!res.ok) {
    throw new Error("YouTube API request failed");
  }

  const data = (await res.json()) as YouTubeSearchResponse

  return data.items.map((item: any) => ({
    title: item.snippet.title,
    description: item.snippet.description,
    videoId: item.id.videoId,
    thumbnail: item.snippet.thumbnails.medium.url,
    url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
  }));
}
