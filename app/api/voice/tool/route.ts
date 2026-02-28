import { generateText, Output } from "ai";
import { google } from "@ai-sdk/google";
import { z } from "zod";
import { searchYouTube, fetchFullDescription } from "@/lib/tools/youtube";
import { extractTimestamps } from "@/lib/tools/timestamp";

export async function POST(req: Request) {
  const { query, userContext } = await req.json();

  let videos = await searchYouTube(query);

  if (videos.length === 0) {
    const fallbackQueries = [
      `${query} life reuse or compost By Dr Erik Fisher AKA DR E`,
      `${query} love lessons By Dr Erik Fisher AKA DR E`,
      `${query} Emotions Aren't Random — They're a Formula By Dr Erik Fisher AKA DR E`,
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
        ${sections.map((s) => `- ${s.time} (${s.seconds}s): ${s.label ?? ""}`).join("\n")}

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

  return Response.json(enriched);
}
