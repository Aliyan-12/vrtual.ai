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
import { searchYouTube, fetchFullDescription } from '../tools/youtube';
import { extractTimestamps } from '../tools/timestamp';

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

              You should try to provide emotionally relevant timestamp for each video to the user using the tool.

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
              Video Timestamp Selection Rules
              ────────────────────────────────────────
              • Video descriptions may contain timestamps in format: 0:00 Introduction.
              • Video timestamps are pre-defined in description. You must only reference the provided timestamp.
              • Never guess timestamps yourself. Each video must have one selected timestamp.
              
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
                userContext: z.string().describe("User's context"),
              }),
              execute: async ({ query, userContext }) => {
                let videos = await searchYouTube(query);
                // let videos = await getVideos(query);

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

                // console.log("Videos: ", videos);
                
                const enriched = [];
                // const enriched = (videos);getEnrichedVideos

                for (const video of videos) {
                  const fullDescription = await fetchFullDescription(video.videoId);
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

                  // console.log(JSON.parse(output.text));
                  const startSeconds = JSON.parse(output.text).startSeconds;

                  enriched.push({
                    ...video,
                    selectedSection: JSON.parse(output.text),
                    startUrl: `${video.url}&t=${startSeconds}s`,
                    embedUrl: `https://www.youtube.com/embed/${video.videoId}?start=${startSeconds}`,
                  });
                }

                console.log("Final enriched videos:", enriched);
                return enriched;
              },
            }),
            // forwardVideos: tool({
            // //   name: 'forward_video',
            //   description: "Select the most emotionally relevant timestamp from each video description.",
            //   inputSchema: z.object({
            //     userContext: z.string(),
            //     videos: z.array(
            //       z.object({
            //         id: z.string(),
            //         title: z.string().optional(),
            //         description: z.string().optional(),
            //         url: z.string(),
            //       })
            //     ),
            //   }),
            //   execute: async ({ userContext, videos }) => {
            //       console.log("forwarding: ", userContext, videos);
            //       const enriched = [];

            //       for (const video of videos) {
            //         const sections = extractTimestamps(video.description);

            //         if (sections.length === 0) {
            //           enriched.push(video);
            //           continue;
            //         }

            //         // Let Gemini decide WHICH section fits best
                    

            //         // const selected = JSON.parse(output);

            //         enriched.push({
            //           ...video,
            //           selectedSection: output.content,
            //         });
            //       }

            //       console.log("Enriched: ", enriched);
            //       return enriched;
            //     },
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
