import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/utils/prisma";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { sessionId, messageId, type, feedback, youtubeId, content } = await req.json();

  if (!sessionId || !messageId || !feedback || !["liked", "disliked"].includes(feedback)) {
    return new Response("Invalid request", { status: 400 });
  }

  // Verify session ownership
  const chatSession = await prisma.chatSession.findFirst({
    where: { id: sessionId, userId: session.user.id },
  });
  if (!chatSession) {
    return new Response("Session not found", { status: 404 });
  }

  // Try to find message by ID first
  let message = await prisma.message.findFirst({
    where: { id: messageId, sessionId },
  });

  // Fallback: client-side useChat IDs don't match DB IDs for new messages.
  // Look up by content + role instead.
  if (!message && content) {
    message = await prisma.message.findFirst({
      where: { sessionId, role: "assistant", content },
      orderBy: { createdAt: "desc" },
    });
  }

  // Last resort: find the most recent unrated assistant message
  if (!message) {
    message = await prisma.message.findFirst({
      where: { sessionId, role: "assistant", feedback: null },
      orderBy: { createdAt: "desc" },
    });
  }

  if (!message) {
    return new Response("Message not found", { status: 404 });
  }

  const dbMessageId = message.id;

  // Message feedback
  if (type === "message") {
    if (message.feedback) {
      return Response.json({ error: "Already rated" }, { status: 409 });
    }

    const updated = await prisma.message.update({
      where: { id: dbMessageId },
      data: { feedback },
    });
    return Response.json(updated);
  }

  // Video feedback
  if (type === "video" && youtubeId) {
    if (message.likedVideoIds.includes(youtubeId) || message.dislikedVideoIds.includes(youtubeId)) {
      return Response.json({ error: "Already rated" }, { status: 409 });
    }

    const field = feedback === "liked" ? "likedVideoIds" : "dislikedVideoIds";
    const countField = feedback === "liked" ? "userLikeCount" : "userDislikeCount";

    await prisma.$transaction([
      prisma.message.update({
        where: { id: dbMessageId },
        data: { [field]: { push: youtubeId } },
      }),
      prisma.video.update({
        where: { youtubeId },
        data: { [countField]: { increment: 1 } },
      }),
    ]);

    return Response.json({ success: true });
  }

  return new Response("Invalid type", { status: 400 });
}
