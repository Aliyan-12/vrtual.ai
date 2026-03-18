import {
  streamText,
  UIMessage,
  convertToModelMessages,
  tool
} from "ai";
import { z } from 'zod';
import { google } from "@ai-sdk/google";
import { SYSTEM_PROMPT, FETCH_VIDEOS_DESCRIPTION } from './systemPrompt';
import { searchAndEnrichVideos } from '@/lib/tools/videoSearch';

interface StreamContext {
  sessionId?: string;
  userId?: string;
  sharedVideos?: string[];
  feedbackSummary?: string;
}

export class ChatService {
    static lastSavedVideoIds: string[] = [];

    static async stream(messages: UIMessage[], context: StreamContext = {}) {
        const { sessionId, userId, sharedVideos = [], feedbackSummary = "" } = context;
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
        if (feedbackSummary) {
            systemPrompt += feedbackSummary;
        }

        return streamText({
          model: google("gemini-2.5-flash"),
          temperature: 0,
          system: systemPrompt,
          tools: {
            fetchVideos: tool({
              description: FETCH_VIDEOS_DESCRIPTION,
              inputSchema: z.object({
                query: z.string().describe("Search query for Erik Fisher channel according to user's mood."),
                userContext: z.string().describe("User's emotional context based on conversation so far"),
              }),
              execute: async ({ query, userContext }) => {
                const result = await searchAndEnrichVideos({
                  query,
                  userContext,
                  sessionId,
                  userId,
                  sharedVideos,
                });

                ChatService.lastSavedVideoIds.push(...result.savedVideoIds);

                if (result.noResults) {
                  return {
                    noResults: true,
                    message: `Sorry, I couldn't find any videos relevant to you on my channel. If you want, I can find videos related to: ${result.suggestedTopic}`,
                    suggestedTopic: result.suggestedTopic,
                  };
                }

                return result.videos;
              },
            }),
          },
          messages: modelMessages,
          maxRetries: 3
        });
    }
}
