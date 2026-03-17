import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/utils/prisma";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const chatSession = await prisma.chatSession.findFirst({
    where: { id: sessionId, userId: session.user.id },
  });

  if (!chatSession) {
    return new Response("Session not found", { status: 404 });
  }

  const { video } = await req.json();

  const saved = await prisma.video.upsert({
    where: { youtubeId: video.youtubeId },
    update: {},
    create: {
      youtubeId: video.youtubeId,
      title: video.title || "",
      description: video.description || "",
      thumbnail: video.thumbnail || "",
      url: video.url || "",
      embedUrl: video.embedUrl || null,
      channelTitle: video.channelTitle || "",
      publishedAt: video.publishedAt || null,
      duration: video.duration || null,
      viewCount: video.viewCount || null,
      likeCount: video.likeCount || null,
      startSeconds: video.startSeconds || null,
      selectedSectionReason: video.selectedSectionReason || null,
      sharingContext: video.sharingContext || "",
      moodContext: video.moodContext || "",
    },
  });

  return Response.json(saved);
}
