import {
  streamText,
  generateText,
  UIMessage,
  convertToModelMessages,
  Output,
  tool
} from "ai";
import { EmotionGuideAgent } from "./agent";
import { z } from 'zod';
// import { groq } from "@ai-sdk/groq";
import { google } from "@ai-sdk/google";
import { searchYouTube } from '../tools/youtube';

type ChatOptions = {
  stream?: boolean;
};

const ResponseSchema = z.object({
  message: z.string().describe(
    "Warm, empathetic response text to show to the user"
  ),

  videos: z
    .array(
      z.object({
        id: z.string().describe("YouTube video ID"),
        url: z.string().url().describe("YouTube video URL"),
        title: z.string().optional().describe("Short human-friendly title"),
        description: z
          .string()
          .optional()
          .describe("Explains the video theme."),
      })
    )
    .max(4)
    // .optional()
    .describe("List of recommended videos"),
});

export class ChatService {
    static async stream(messages: UIMessage[]) {
        const modelMessages = convertToModelMessages(messages);
        // console.log(res.content);
        return streamText({
          // model: groq("moonshotai/kimi-k2-instruct-0905"),
          model: google("gemini-2.5-flash"),
          temperature: 0,
          system: `
              You are Dr. Erik Fisher, speaking personally and warmly to the user.

              Your goal is to support the user in a light, calming, and empathetic way.

              You should try to provide videos to the user that are relevant using the tool.

              Make sure not to overwhelm the user by multiple different videos at same time. First share 1-2 videos and wait till user says that I liked a video and then asks for more relevant videos. Ask the user about which video he like most so You can remember the preferences/mood/type of user.

              ────────────────────────────────────────
              Rules for Video Suggestions
              ────────────────────────────────────────
              • Always select the video only from channel of @ErikFisherakaDrE.
              • Send structured data for video embedding.
              • If you donot find video for user, You must change the query for the tool and try 3 times.
              • If still you donot find the video, you must return a video related to user's mood searching Erik Fisher youtube channel only.
              • Never return video data from your own.
              
              ────────────────────────────────────────
              TONE
              ────────────────────────────────────────

              • Speak in first person
              • Calm, caring, supportive
              • Short and clear responses
          `,
          tools: {
            fetchVideos: tool({
            //   name: 'search_youtube',
              description: "Search YouTube for calm, helpful videos from Erik Fisher's channel.",
              inputSchema: z.object({
                query: z.string().describe("Search query for Erik Fisher channel"),
              }),
              execute: async ({ query }) => {
                let videos = await searchYouTube(query);

                // If empty, retry with known channel keywords
                if (videos.length === 0) {
                  const fallbackQueries = [
                    `${query} life reuse or compost By Dr Erik Fisher AKA DR E`,
                    `${query} love lessons By Dr Erik Fisher AKA DR E`,
                    `${query} Emotions Aren’t Random — They’re a Formula By Dr Erik Fisher AKA DR E`
                  ];
                  for (const q of fallbackQueries) {
                    videos = await searchYouTube(q, 1);
                    if (videos.length > 0) break;
                  }
                }

                // Final fallback: just get most relevant video from channel
                if (videos.length === 0) {
                  videos = await searchYouTube("life lessons");
                }

                return videos;
                // const data = await searchYouTube(query, 4);
                // console.log(data);
                // return data;
              },
            }),
            // fetchVideos: tool({
            // //   name: 'search_youtube',
            //   description: "Search YouTube for calm, helpful videos from Erik Fisher's channel.",
            //   inputSchema: z.object({
            //     query: z.string().describe("Search query for YouTube"),
            //   }),
            //   execute: async ({ query }) => {
            //     const data = await searchYouTube(query, 4);
            //     console.log(data);
            //     return data;
            //   },
            // })
          },
          // experimental_output: Output.object({
          //   schema: ResponseSchema
          // }),
          messages: modelMessages,
          maxRetries: 3
        });
        // const rawText = extractTextFromStream(res);
        // const formatted = await generateText({
        //   model: groq('moonshotai/kimi-k2-instruct-0905'),
        //   temperature: 0,
        //   experimental_output: Output.object({ schema: ResponseSchema }),
        //   messages: [
        //     { role: 'system', content: 'Format this response properly.' },
        //     { role: 'user', content: rawText },
        //   ],
        // });
        // return formatted;


        // return EmotionGuideAgent.stream({
        //     messages: modelMessages,
        // });
    }
//   async run(
//     messages: UIMessage[],
//     options: ChatOptions = { stream: true }
//   ) {
//     const modelMessages = [
//         { role: "system", content: `
//                             You are an emotionally intelligent AI support agent.

//                             You listen first.
//                             You respond with empathy.
//                             You may search YouTube for helpful videos when they genuinely add value.

//                             When you recommend videos:
//                             - Explain why each video helps
//                             - Prefer calm, evidence-based content
//                             - Never overwhelm the user

//                             Respond in Markdown.`.trim() 
//         },
//         ...convertToModelMessages(messages),
//     ];
}
