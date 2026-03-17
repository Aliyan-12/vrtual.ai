import {
  streamText,
  generateText,
  UIMessage,
  convertToModelMessages,
  Output,
  tool
} from "ai";
import { z } from 'zod';
import { google } from "@ai-sdk/google";
import { searchYouTube, fetchFullDescription } from '../tools/youtube';
import { extractTimestamps } from '../tools/timestamp';
import { SYSTEM_PROMPT, FETCH_VIDEOS_DESCRIPTION } from './systemPrompt';
import { prisma } from '@/lib/utils/prisma';

interface StreamContext {
  sessionId?: string;
  userId?: string;
  sharedVideos?: string[];
}

export class ChatService {
    // Collect video IDs saved during this stream so the chat route can attach them to the assistant message
    static lastSavedVideoIds: string[] = [];

    static async stream(messages: UIMessage[], context: StreamContext = {}) {
        const { sessionId, userId, sharedVideos = [] } = context;
        const modelMessages = await convertToModelMessages(messages);
        ChatService.lastSavedVideoIds = [];

        let systemPrompt = SYSTEM_PROMPT;
        if (sharedVideos.length > 0) {
            systemPrompt += `\n\n────────────────────────────────────────
ALREADY SHARED VIDEOS (DO NOT RECOMMEND AGAIN)
────────────────────────────────────────
${sharedVideos.map(v => `• ${v}`).join('\n')}
`;
        }

        return streamText({
          model: google("gemini-2.5-flash"),
          temperature: 0,
          system: systemPrompt,
          tools: {
            fetchVideos: tool({
              description: FETCH_VIDEOS_DESCRIPTION,
              inputSchema: z.object({
                query: z.string().describe("Search query for Erik Fisher channel"),
                userContext: z.string().describe("User's emotional context based on conversation so far"),
              }),
              execute: async ({ query, userContext }) => {
                let videos = await searchYouTube(query);

                if (videos.length === 0) {
                  const fallbackQueries = [
                    `${query} life reuse or compost By Dr Erik Fisher AKA DR E`,
                    `${query} love lessons By Dr Erik Fisher AKA DR E`,
                    `${query} Emotions Aren't Random — They're a Formula By Dr Erik Fisher AKA DR E`
                  ];
                  for (const q of fallbackQueries) {
                    videos = await searchYouTube(q, 1);
                    if (videos.length > 0) break;
                  }
                }

                if (videos.length === 0) {
                  videos = await searchYouTube("life lessons");
                }

                // Filter out already shared videos
                if (sharedVideos.length > 0) {
                  const sharedIds = sharedVideos.map(v => {
                    const match = v.match(/\(([^)]+)\)$/);
                    return match ? match[1] : '';
                  });
                  videos = videos.filter((v: any) => !sharedIds.includes(v.id));
                }

                const enriched = [];

                for (const video of videos) {
                  const fullDescription = await fetchFullDescription(video.id);
                  const sections = extractTimestamps(fullDescription);

                  let enrichedVideo: any = { ...video };
                  let startSeconds: number | undefined;
                  let sectionReason: string | undefined;

                  if (sections.length) {
                    const output = await generateText({
                        model: google("gemini-2.5-flash"),
                        temperature: 0,
                        experimental_output: Output.object({
                          schema: z.object({
                            startSeconds: z.number().describe('The timestamp selected in seconds.'),
                            reason: z.string().describe('Short Reason for selecting this timestamp.')
                          })
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

                  // Save video globally to DB if authenticated
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
                      ChatService.lastSavedVideoIds.push(saved.id);
                    } catch (e) { /* ignore */ }
                  }
                }

                return enriched;
              },
            }),
          },
          messages: modelMessages,
          maxRetries: 3
        });
    }
}
