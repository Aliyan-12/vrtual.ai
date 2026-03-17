import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/utils/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const chatSession = await prisma.chatSession.findFirst({
    where: { id: sessionId, userId: session.user.id },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!chatSession) {
    return new Response("Not found", { status: 404 });
  }

  // Collect all video IDs from messages and fetch them
  const allVideoIds = chatSession.messages.flatMap(m => m.videoIds);
  let videosMap: Record<string, any> = {};
  if (allVideoIds.length > 0) {
    const videos = await prisma.video.findMany({
      where: { id: { in: [...new Set(allVideoIds)] } },
    });
    videosMap = Object.fromEntries(videos.map(v => [v.id, v]));
  }

  return Response.json({
    ...chatSession,
    videos: videosMap,
  });
}
