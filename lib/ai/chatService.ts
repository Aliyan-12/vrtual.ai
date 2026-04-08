import {
  streamText,
  UIMessage,
  convertToModelMessages,
  tool,
  stepCountIs
} from "ai";
import { z } from 'zod';
import { google } from "@ai-sdk/google";
import { SYSTEM_PROMPT, FETCH_VIDEOS_DESCRIPTION } from '@/lib/utils/prompt';
import { VideoService } from '@/lib/ai/videoService';

export class ChatService {
    static async stream(messages: UIMessage[]) {
        const modelMessages = await convertToModelMessages(messages);
        return streamText({
          model: google("gemini-2.5-flash"),
          system: SYSTEM_PROMPT,
          tools: {
            fetchVideos: tool({
              description: FETCH_VIDEOS_DESCRIPTION,
              inputSchema: z.object({
                query: z.string().describe("Short YouTube search query, 2-5 words max. If user wants a song include 'song'. If podcast include 'podcast'. Examples: 'song love healing', 'overcome anxiety', 'podcast stress'. Do NOT include channel name."),
                userContext: z.string().describe("User's emotional context AND the specific content type they want. MUST include one of: 'wants a song', 'wants a podcast', 'wants guidance/advice', 'wants a short video', or 'wants educational content'. Example: 'User is feeling sad and wants a calming song to lift their mood.'"),
              }),
              execute: async ({ query, userContext }) => {
                return await VideoService.searchAndEnrich(query, userContext, "[fetchVideos]");
              },
            }),
          },
          // Allow multi-step so model calls tool first, sees result, then responds.
          // Prevents "I found a video" when the tool returned nothing.
          stopWhen: stepCountIs(3),
          messages: modelMessages,
          maxRetries: 3
        });
    }
}
