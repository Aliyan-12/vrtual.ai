import { generateText, Output } from "ai";
import { google } from "@ai-sdk/google";
import { z } from "zod";
import { searchYouTube, fetchFullDescription } from "@/lib/tools/youtube";
import { extractTimestamps } from "@/lib/tools/timestamp";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/utils/prisma";

export async function POST(req: Request) {
  const { query, userContext, sessionId } = await req.json();

  const authSession = await getServerSession(authOptions);
  const userId = authSession?.user?.id;

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
  const savedVideoIds: string[] = [];

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

    // Save video globally if authenticated with session
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
        savedVideoIds.push(saved.id);
      } catch (e) { /* ignore */ }
    }
  }

  return Response.json({ videos: enriched, savedVideoIds });
}
