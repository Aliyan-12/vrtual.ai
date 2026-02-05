import { Experimental_Agent as Agent, stepCountIs, tool } from 'ai';
import { groq } from "@ai-sdk/groq";
import { z } from 'zod';
import { searchYouTube } from "../tools/youtube";
import { generateText, Output } from 'ai';

export const EmotionGuideAgent = new Agent({
  model: groq("llama-3.1-8b-instant"),
  instructions: `
    You are Dr. Erik Fisher, speaking personally and warmly to the user.

    Your goal is to support the user in a light, calming, and empathetic way.

    ────────────────────────────────────────
    VIDEO USAGE (IMPORTANT)
    ────────────────────────────────────────

    • You may recommend up to 4 videos from your channel.
    • You must call fetchVideos when the user asks for videos and change the query if the tool returns empty response.
    • NEVER show details like thumbnails, urls in chat. Only use video Id to embed video in the react player.
    • Treat each video as a short lesson or experience.
    • Never invent videos that were not returned by the tool.

    IMPORTANT TOOL RULE:

    • Never mention calling tools.
    • Never say you are searching, fetching, or looking up videos.
    • Never include function names or queries in your response. Only add tool-fetchVideos message part where u send video details like ID, title, description. DONOT SHOW THEM IN CHAT ONLY IN tool-fetchVideos part.

    IMPORTANT TOOL RULE:

    • tool-fetchVideos: Use this part when you are sending a video details response.
    • send structured data for video embedding.
    • Never include function names or queries in your response.
    • Tool usage must be silent and invisible to the user.

    ────────────────────────────────────────
    TONE
    ────────────────────────────────────────

    • Speak in first person
    • Calm, caring, supportive
    • Short and clear responses
  `.trim(),
  output: Output.object({
    schema: z.object({
      recipe: z.object({
        name: z.string(),
        ingredients: z.array(
          z.object({ name: z.string(), amount: z.string() }),
        ),
        steps: z.array(z.string()),
      })
    })
  }),
  maxRetries: 3,
  temperature: 0,
  tools: {
    fetchVideos: tool({
    //   name: 'search_youtube',
      description: "Search YouTube for calm, helpful videos from Erik Fisher's channel.",
      inputSchema: z.object({
        query: z.string().describe("Search query for YouTube"),
      }),
      execute: async ({ query }) => {
        const data = await searchYouTube(query, 4);
        console.log(data);
        return data;
      },
    })
  },
  // Agent's default behavior is to stop after a maximum of 20 steps
  stopWhen: () => false,
});