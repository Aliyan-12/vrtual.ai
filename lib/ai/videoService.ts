import { generateText, Output } from "ai";
import { google } from "@ai-sdk/google";
import { z } from "zod";
import { searchYouTube, fetchVideoDetails } from "@/lib/tools/youtube";
import { extractTimestamps, extractCategory } from "@/lib/tools/extractor";
import type { EnrichedVideo } from "@/types";

const MAX_RETRIES = 3;

// ── Prompt builders ─────────────────────────────────────────
function buildRetryPrompt(originalQuery: string, userContext: string, attempt: number): string {
  return `You are helping search a YouTube channel by Dr. Erik Fisher (psychologist, emotional wellness, songs, personal growth).

The search query "${originalQuery}" returned no results on this channel.
User's request: "${userContext}"
Retry attempt ${attempt} of ${MAX_RETRIES}.

Generate ONE short YouTube search query (2-5 words max) that:
- Preserves the user's intent (if they asked for a song, include "song"; if guidance, use topic keywords)
- Uses simple, broad keywords likely to match video titles on this channel
- Try a different angle than the original query
- Do NOT include the channel name or "Dr Erik Fisher"

Reply with ONLY the search query, nothing else.`;
}

function buildSelectionPrompt(userContext: string, videos: { id: string; title: string; category: string; tags: string[]; description: string }[]): string {
  return `User's emotional context and request:
"${userContext}"

Available videos from Dr. Erik Fisher's channel:
${videos.map((v, i) => `
Video ${i + 1}:
- ID: ${v.id}
- Title: ${v.title}
- Category: ${v.category}
- Tags: ${v.tags.slice(0, 10).join(", ")}
- Description: ${v.description.slice(0, 500)}
`).join("\n")}

SELECTION RULES:
1. If the user asked for a specific type (song, podcast, guidance), ONLY select videos whose Category matches. Do NOT select a "Podcast" or "Education" video when the user asked for a "Song".
2. If no video matches the requested type, return an EMPTY array — do not force an irrelevant match.
3. If the user didn't specify a type, select the 1-2 videos most relevant to their emotional state.
4. Maximum 2 videos. If only 1 is relevant, select only 1.

Return the selected video IDs.`;
}

function buildTimestampPrompt(userContext: string, video: { title: string; category: string; tags: string[]; description: string }, sections: { time: string; seconds: number; label?: string }[]): string {
  return `User emotion/context:
"${userContext}"

Video title: "${video.title}"
Video category: ${video.category}
Video tags: ${video.tags.slice(0, 10).join(", ")}

Video full description:
"${video.description}"

Video sections:
${sections.map(s => `- ${s.time} (${s.seconds}s): ${s.label ?? ""}`).join("\n")}

Choose the ONE section that best matches the user's emotional need. Consider the full description and category to understand the video's content.`;
}

// ── VideoService ────────────────────────────────────────────
export class VideoService {
  /**
   * Searches, filters by relevance, and enriches videos from Dr. Erik Fisher's channel.
   * Used by both text chat (chatService) and voice chat (voice/tool route).
   */
  static async searchAndEnrich(query: string, userContext: string, logPrefix = "[VideoService]"): Promise<EnrichedVideo[]> {
    console.log(`${logPrefix} Original query: "${query}", context: "${userContext}"`);

    // Step 1: Search for 4 videos
    let videos = await searchYouTube(query, 4);
    console.log(`${logPrefix} Initial search returned ${videos.length} videos`);

    if (videos.length === 0) {
      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        const retryQuery = await VideoService.generateRetryQuery(query, userContext, attempt);
        console.log(`${logPrefix} Retry ${attempt}/${MAX_RETRIES} with query: "${retryQuery}"`);
        videos = await searchYouTube(retryQuery, 4);
        console.log(`${logPrefix} Retry returned ${videos.length} videos`);
        if (videos.length > 0) break;
      }
    }

    if (videos.length === 0) {
      console.log(`${logPrefix} No videos found after all retries`);
      return [];
    }

    console.log(`${logPrefix} Videos found:`, videos.map(v => `${v.title} (${v.id})`));

    // Step 2: Fetch full details + extract category from description
    const videosWithDetails = await Promise.all(
      videos.map(async (video) => {
        const details = await fetchVideoDetails(video.id);
        // Use extractCategory which checks for ### Category: marker first, then falls back
        const category = extractCategory(details.description);
        console.log(`${logPrefix} "${video.title}" → category: ${category}`);
        return { ...video, ...details, category };
      })
    );

    // Step 3: AI picks the most relevant 1-2 videos (category-aware)
    const selectionOutput = await generateText({
      model: google("gemini-2.5-flash"),
      experimental_output: Output.object({
        schema: z.object({
          selectedIds: z.array(z.string()).describe("Array of 0-2 video IDs that are most relevant. Empty if none match."),
          reasoning: z.string().describe("Brief explanation of why these were selected or why none matched"),
        }),
      }),
      prompt: buildSelectionPrompt(userContext, videosWithDetails),
    });

    const selection = JSON.parse(selectionOutput.text);
    console.log(`${logPrefix} AI selected ${selection.selectedIds.length} videos: ${selection.reasoning}`);

    if (selection.selectedIds.length === 0) {
      console.log(`${logPrefix} No matching videos for user's request type`);
      return [];
    }

    const selectedVideos = videosWithDetails.filter(v => selection.selectedIds.includes(v.id));

    // Step 4: Enrich selected videos with timestamp sections
    const enriched: EnrichedVideo[] = [];
    for (const video of selectedVideos) {
      const sections = extractTimestamps(video.description);
      console.log(`${logPrefix} Enriching "${video.title}" — ${sections.length} sections, category: ${video.category}`);

      const base: EnrichedVideo = {
        id: video.id,
        title: video.title,
        description: video.description,
        thumbnail: video.thumbnail,
        url: video.url,
        category: video.category,
        tags: video.tags.slice(0, 10),
        fullDescription: video.description,
      };

      if (!sections.length) {
        enriched.push(base);
        continue;
      }

      const output = await generateText({
        model: google("gemini-2.5-flash"),
        experimental_output: Output.object({
          schema: z.object({
            startSeconds: z.number().describe("The timestamp selected in seconds."),
            reason: z.string().describe("Short Reason for selecting this timestamp."),
          }),
        }),
        prompt: buildTimestampPrompt(userContext, video, sections),
      });

      const parsed = JSON.parse(output.text);
      console.log(`${logPrefix} Selected section for "${video.title}": ${parsed.startSeconds}s — ${parsed.reason}`);

      enriched.push({
        ...base,
        selectedSection: parsed,
        startUrl: `${video.url}&t=${parsed.startSeconds}s`,
        embedUrl: `https://www.youtube.com/embed/${video.id}?start=${parsed.startSeconds}`,
      });
    }

    console.log(`${logPrefix} Returning ${enriched.length} enriched videos`);
    return enriched;
  }

  private static async generateRetryQuery(originalQuery: string, userContext: string, attempt: number): Promise<string> {
    try {
      const output = await generateText({
        model: google("gemini-2.5-flash"),
        prompt: buildRetryPrompt(originalQuery, userContext, attempt),
      });
      return output.text.trim();
    } catch {
      return userContext.split(" ").slice(0, 3).join(" ");
    }
  }
}
