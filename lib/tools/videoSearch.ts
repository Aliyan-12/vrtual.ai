import { generateText, Output } from "ai";
import { google } from "@ai-sdk/google";
import { z } from "zod";
import fetch from "node-fetch";
import { prisma } from "@/lib/utils/prisma";

// ── YouTube API ─────────────────────────────────────────────

interface YouTubeSearchResponse {
  items: YouTubeSearchItem[];
}

interface YouTubeSearchItem {
  id: { videoId: string };
  snippet: {
    title: string;
    description: string;
    thumbnails: { medium: { url: string } };
  };
}

export async function searchYouTube(query: string, maxResults = 4) {
  const url = new URL("https://www.googleapis.com/youtube/v3/search");
  url.searchParams.set("part", "snippet");
  url.searchParams.set("q", query);
  url.searchParams.set("type", "video");
  url.searchParams.set("maxResults", maxResults.toString());
  url.searchParams.set("channelId", process.env.CHANNEL_ID!);
  url.searchParams.set("key", process.env.YOUTUBE_API_KEY!);

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error("YouTube API request failed");
  }

  const data = (await res.json()) as YouTubeSearchResponse;

  return data.items.map((item: any) => ({
    title: item.snippet.title,
    description: item.snippet.description,
    id: item.id.videoId,
    thumbnail: item.snippet.thumbnails.medium.url,
    url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
  }));
}

export async function fetchFullDescription(videoId: string) {
  const res = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?` +
    new URLSearchParams({
      part: "snippet",
      id: videoId,
      key: process.env.YOUTUBE_API_KEY!,
    })
  );

  const json = (await res.json()) as any;
  return json.items?.[0]?.snippet?.description ?? "";
}

// ── Video Search, Enrichment & DB ───────────────────────────

export interface VideoResult {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  url: string;
  selectedSection?: { startSeconds: number; reason: string };
  startUrl?: string;
  embedUrl?: string;
}

interface SearchAndEnrichOptions {
  query: string;
  userContext: string;
  sessionId?: string;
  userId?: string;
  sharedVideos?: string[];
}

interface SearchAndEnrichResult {
  videos: VideoResult[];
  savedVideoIds: string[];
  noResults: boolean;
  suggestedTopic?: string;
}

const MAX_RETRIES = 3;

/**
 * Generate mood-aware retry queries using AI instead of static fallbacks.
 */
async function generateRetryQuery(originalQuery: string, userContext: string, attempt: number): Promise<string> {
  try {
    const output = await generateText({
      model: google("gemini-2.5-flash"),
      temperature: 0.7,
      prompt: `You are helping search a YouTube channel by Dr. Erik Fisher (a psychologist focused on emotions, relationships, and personal growth).

The original search query "${originalQuery}" returned no results.
The user's emotional context: "${userContext}"
This is retry attempt ${attempt} of ${MAX_RETRIES}.

Generate ONE short alternative search query (3-6 words) that:
- Is related to the user's mood/emotional context
- Uses broader or different keywords that Dr. Erik Fisher's channel might cover
- Each retry should try a meaningfully different angle

Reply with ONLY the search query, nothing else.`,
    });
    return output.text.trim();
  } catch {
    return userContext.split(" ").slice(0, 4).join(" ");
  }
}

/**
 * Generate a topic suggestion when no videos are found after all retries.
 */
async function generateTopicSuggestion(userContext: string): Promise<string> {
  try {
    const output = await generateText({
      model: google("gemini-2.5-flash"),
      temperature: 0.7,
      prompt: `You are Dr. Erik Fisher, a psychologist. A user with this emotional context: "${userContext}" asked for video recommendations, but none were found on your channel.

              Suggest ONE specific topic (5-10 words) from your expertise (emotions, relationships, personal growth, stress, anxiety, self-worth, communication) that might help them.

              Reply with ONLY the topic suggestion, nothing else.`,
    });
    return output.text.trim();
  } catch {
    return "managing emotions and building resilience";
  }
}

/**
 * Extract timestamps using description
 */
function extractTimestamps(description?: string) {
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

  return sections;
}

/**
 * Search for videos with AI-powered retries, enrich with timestamps, and save to DB.
 * Shared by both text chat (chatService) and voice chat (voice/tool route).
 */
export async function searchAndEnrichVideos(options: SearchAndEnrichOptions): Promise<SearchAndEnrichResult> {
  const { query, userContext, sessionId, userId, sharedVideos = [] } = options;

  // Search with AI-generated retries
  let videos = await searchYouTube(query);

  if (videos.length === 0) {
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      const retryQuery = await generateRetryQuery(query, userContext, attempt);
      videos = await searchYouTube(retryQuery, 2);
      if (videos.length > 0) break;
    }
  }

  // If still no results, return with a suggestion
  if (videos.length === 0) {
    const suggestedTopic = await generateTopicSuggestion(userContext);
    return { videos: [], savedVideoIds: [], noResults: true, suggestedTopic };
  }

  // Filter out already shared videos
  if (sharedVideos.length > 0) {
    const sharedIds = sharedVideos.map(v => {
      const match = v.match(/\(([^)]+)\)$/);
      return match ? match[1] : "";
    }).filter(Boolean);
    videos = videos.filter((v: any) => !sharedIds.includes(v.id));

    if (videos.length === 0) {
      const suggestedTopic = await generateTopicSuggestion(userContext);
      return { videos: [], savedVideoIds: [], noResults: true, suggestedTopic };
    }
  }

  // Enrich videos with timestamp selection and save to DB
  const enriched: VideoResult[] = [];
  const savedVideoIds: string[] = [];

  for (const video of videos) {
    const fullDescription = await fetchFullDescription(video.id);
    const sections = extractTimestamps(fullDescription);

    let enrichedVideo: VideoResult = { ...video };
    let startSeconds: number | undefined;
    let sectionReason: string | undefined;

    if (sections.length) {
      const output = await generateText({
        model: google("gemini-2.5-flash"),
        temperature: 0,
        experimental_output: Output.object({
          schema: z.object({
            startSeconds: z.number().describe("The timestamp selected in seconds."),
            reason: z.string().describe("Short Reason for selecting this timestamp."),
          }),
        }),
        prompt: `
          User emotion/context:
          "${userContext}"

          Video title:
          "${video.title}"

          Video sections:
          ${sections.map(s => `- ${s.time} (${s.seconds}s): ${s.label ?? ""}`).join("\n")}

          Choose the ONE section that best matches the user's emotional need.
        `,
      });

      const parsed = JSON.parse(output.text);
      startSeconds = parsed.startSeconds;
      sectionReason = parsed.reason;

      enrichedVideo = {
        ...video,
        selectedSection: parsed,
        startUrl: `${video.url}&t=${startSeconds}s`,
        embedUrl: `https://www.youtube.com/embed/${video.id}?start=${startSeconds}`,
      };
    }

    enriched.push(enrichedVideo);

    // Save video to DB if authenticated with session
    if (userId && sessionId) {
      try {
        const saved = await prisma.video.upsert({
          where: { youtubeId: video.id },
          update: {
            sharingContext: query,
            moodContext: userContext,
            ...(startSeconds != null ? { startSeconds, selectedSectionReason: sectionReason || "" } : {}),
            ...(enrichedVideo.embedUrl ? { embedUrl: enrichedVideo.embedUrl } : {}),
          },
          create: {
            youtubeId: video.id,
            title: video.title || "",
            description: video.description || "",
            thumbnail: video.thumbnail || "",
            url: video.url || "",
            embedUrl: enrichedVideo.embedUrl || null,
            startSeconds: startSeconds ?? null,
            selectedSectionReason: sectionReason || null,
            sharingContext: query,
            moodContext: userContext,
          },
        });
        savedVideoIds.push(saved.id);
      } catch { /* ignore */ }
    }
  }

  return { videos: enriched, savedVideoIds, noResults: false };
}
