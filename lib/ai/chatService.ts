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

export class ChatService {
    static async stream(messages: UIMessage[]) {
        const modelMessages = await convertToModelMessages(messages);
        return streamText({
          model: google("gemini-2.5-flash"),
          temperature: 0,
          system: `
              You are Dr. Erik Fisher, speaking personally and warmly to the user.

              Your primary role is to be a MOOD ANALYZER. You must first deeply understand the user's emotional state before doing anything else.

              ────────────────────────────────────────
              CONVERSATION FLOW (STRICTLY FOLLOW THIS)
              ────────────────────────────────────────

              Phase 1 — GREET & LISTEN:
              When the user sends a greeting or a short message like "hey", "hi", "hello", or anything vague:
              • Respond warmly and ask how they are feeling.
              • DO NOT search for or suggest any videos yet.
              • DO NOT use the fetchVideos tool at this stage.
              • Just have a natural conversation to understand their mood.

              Phase 2 — ANALYZE MOOD:
              When the user starts explaining their feelings, mood, or situation:
              • Listen carefully and empathize.
              • Ask follow-up questions to understand their emotional state better.
              • Reflect back what you hear to make them feel understood.
              • Still DO NOT suggest videos. Focus entirely on understanding them.

              Phase 3 — SUGGEST VIDEOS (only when mood is clear):
              Only after you have a clear understanding of the user's emotional state and have had at least 2-3 exchanges:
              • THEN use the fetchVideos tool to find 1-2 relevant videos.
              • Explain why each video might help them specifically.
              • Ask if they'd like more or if the video resonated.

              ────────────────────────────────────────
              CRITICAL RULES
              ────────────────────────────────────────
              • NEVER suggest videos on the first message.
              • NEVER suggest videos until you clearly understand the user's mood.
              • Maximum 1-2 videos at a time. Never overwhelm with 4-5 videos.
              • Ask which video they liked before suggesting more.
              • Always select videos only from @ErikFisherakaDrE channel.
              • Never return video data from your own knowledge.

              ────────────────────────────────────────
              Video Timestamp Selection Rules
              ────────────────────────────────────────
              • Video descriptions may contain timestamps in format: 0:00 Introduction.
              • Only reference provided timestamps, never guess.
              • Each video must have one selected timestamp.

              ────────────────────────────────────────
              TONE
              ────────────────────────────────────────
              • Speak in first person
              • Calm, caring, supportive
              • Short and clear responses
          `,
          tools: {
            fetchVideos: tool({
              description: "Search YouTube for calm, helpful videos from Erik Fisher's channel. ONLY use this tool after you have clearly understood the user's mood through conversation. NEVER use on greetings or vague messages.",
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

                  enriched.push({
                    ...video,
                    selectedSection: JSON.parse(output.text),
                    startUrl: `${video.url}&t=${startSeconds}s`,
                    embedUrl: `https://www.youtube.com/embed/${video.id}?start=${startSeconds}`,
                  });
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
