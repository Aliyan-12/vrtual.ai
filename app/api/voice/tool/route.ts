import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { searchAndEnrichVideos } from "@/lib/tools/videoSearch";
import { prisma } from "@/lib/utils/prisma";

export async function POST(req: Request) {
  const { query, userContext, sessionId } = await req.json();

  const authSession = await getServerSession(authOptions);
  const userId = authSession?.user?.id;

  // Load previously shared videos to avoid duplicates
  let sharedVideos: string[] = [];
  if (userId && sessionId) {
    const sessionMessages = await prisma.message.findMany({
      where: { sessionId },
      select: { videoIds: true },
    });
    const allVideoIds = sessionMessages.flatMap(m => m.videoIds).filter(Boolean);
    if (allVideoIds.length > 0) {
      const videos = await prisma.video.findMany({
        where: { id: { in: allVideoIds } },
        select: { youtubeId: true, title: true },
      });
      sharedVideos = videos.map(v => `${v.title} (${v.youtubeId})`);
    }
  }

  const result = await searchAndEnrichVideos({
    query,
    userContext,
    sessionId,
    userId,
    sharedVideos,
  });

  if (result.noResults) {
    return Response.json({
      videos: [],
      savedVideoIds: [],
      noResults: true,
      message: `Sorry, I couldn't find any videos relevant to you on my channel. If you want, I can find videos related to: ${result.suggestedTopic}`,
      suggestedTopic: result.suggestedTopic,
    });
  }

  return Response.json({ videos: result.videos, savedVideoIds: result.savedVideoIds });
}
