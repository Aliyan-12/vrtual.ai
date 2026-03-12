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
import { getDb } from "@/lib/db/mongo";

type Section = { time: string; seconds: number; label?: string };
type VideoSuggestion = {
  source: "chat" | "voice";
  context: string;
  emotionDescription: string;
  reason?: string;
  startSeconds?: number;
  startUrl?: string;
  embedUrl?: string;
  suggestedAt: Date;
};
type VideoDoc = {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  url: string;
  sections: Section[];
  createdAt?: Date;
  updatedAt?: Date;
  suggestions?: VideoSuggestion[];
};

export class ChatService {
    static async stream(messages: UIMessage[]) {
        const modelMessages = await convertToModelMessages(messages);
        return streamText({
          model: google("gemini-2.5-flash"),
          temperature: 0,
          system: SYSTEM_PROMPT,
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

                const enriched = [];

                for (const video of videos) {
                  const fullDescription = await fetchFullDescription(video.id);
                  const sections = extractTimestamps(fullDescription);

                  if (!sections.length) {
                    enriched.push(video);
                    try {
                      const db = await getDb();
                      const col = db.collection<VideoDoc>("videos");
                      await col.updateOne(
                        { id: video.id },
                        {
                          $set: {
                            id: video.id,
                            title: video.title,
                            description: fullDescription || video.description,
                            thumbnail: video.thumbnail,
                            url: video.url,
                            sections,
                            updatedAt: new Date(),
                          },
                          $setOnInsert: { createdAt: new Date() },
                          $push: {
                            suggestions: {
                              source: "chat",
                              context: userContext,
                              emotionDescription: userContext,
                              suggestedAt: new Date(),
                            },
                          },
                        },
                        { upsert: true }
                      );
                    } catch (err) {
                      console.error("Mongo save (chat, no-sections) failed", { id: video.id, err });
                    }
                    continue;
                  }

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

                  const startSeconds = JSON.parse(output.text).startSeconds;

                  const suggestion = {
                    source: "chat",
                    context: userContext,
                    emotionDescription: userContext,
                    reason: JSON.parse(output.text).reason,
                    startSeconds,
                    startUrl: `${video.url}&t=${startSeconds}s`,
                    embedUrl: `https://www.youtube.com/embed/${video.id}?start=${startSeconds}`,
                    suggestedAt: new Date(),
                  } as VideoSuggestion;

                  enriched.push({
                    ...video,
                    selectedSection: JSON.parse(output.text),
                    startUrl: suggestion.startUrl,
                    embedUrl: suggestion.embedUrl,
                  });

                  try {
                    const db = await getDb();
                    const col = db.collection<VideoDoc>("videos");
                    await col.updateOne(
                      { id: video.id },
                      {
                        $set: {
                          id: video.id,
                          title: video.title,
                          description: fullDescription || video.description,
                          thumbnail: video.thumbnail,
                          url: video.url,
                          sections,
                          updatedAt: new Date(),
                        },
                        $setOnInsert: { createdAt: new Date() },
                        $push: { suggestions: suggestion },
                      },
                      { upsert: true }
                    );
                  } catch (err) {
                    console.error("Mongo save (chat, with-section) failed", { id: video.id, err });
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
