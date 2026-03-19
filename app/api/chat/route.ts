import { UIMessage } from 'ai';
import { ChatService } from '@/lib/ai/chatService';
import { convertTextToSpeech } from '@/lib/utils/helper';
import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/utils/prisma";

export async function POST(req: Request) {
  const { messages, sessionId }: { messages: UIMessage[]; sessionId?: string } = await req.json();

  const authSession = await getServerSession(authOptions);
  const userId = authSession?.user?.id;

  // If authenticated with a sessionId, save the user message
  if (userId && sessionId) {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.role === "user") {
      const content = lastMessage.parts
        ?.filter((p: any) => p.type === "text")
        .map((p: any) => p.text)
        .join("") || "";

      if (content) {
        await prisma.message.create({
          data: { sessionId, role: "user", content },
        });

        // Update session title from first user message
        const chatSession = await prisma.chatSession.findUnique({ where: { id: sessionId } });
        if (chatSession?.title === "New Chat") {
          const title = content.length > 60 ? content.substring(0, 60) + "..." : content;
          await prisma.chatSession.update({
            where: { id: sessionId },
            data: { title },
          });
        }
      }
    }
  }

  // Load previously shared videos, feedback stats, and voice history for this session
  let sharedVideos: string[] = [];
  let feedbackSummary = "";
  let voiceHistory = "";
  if (userId && sessionId) {
    const sessionMessages = await prisma.message.findMany({
      where: { sessionId },
      select: { role: true, content: true, videoIds: true, feedback: true, likedVideoIds: true, dislikedVideoIds: true },
      orderBy: { createdAt: "asc" },
    });
    const allVideoIds = sessionMessages.flatMap(m => m.videoIds).filter(Boolean);
    if (allVideoIds.length > 0) {
      const videos = await prisma.video.findMany({
        where: { id: { in: allVideoIds } },
        select: { youtubeId: true, title: true },
      });
      sharedVideos = videos.map(v => `${v.title} (${v.youtubeId})`);
    }

    // Build feedback summary for model context
    const msgLikes = sessionMessages.filter(m => m.feedback === "liked").length;
    const msgDislikes = sessionMessages.filter(m => m.feedback === "disliked").length;
    const vidLikes = sessionMessages.reduce((sum, m) => sum + m.likedVideoIds.length, 0);
    const vidDislikes = sessionMessages.reduce((sum, m) => sum + m.dislikedVideoIds.length, 0);

    if (msgLikes + msgDislikes + vidLikes + vidDislikes > 0) {
      feedbackSummary = `\nUser feedback in this session: ${msgLikes} liked responses, ${msgDislikes} disliked responses, ${vidLikes} liked videos, ${vidDislikes} disliked videos. Adjust accordingly.\n`;
    }

    // Build voice history context — DB messages that aren't in the useChat messages array
    // (voice transcripts saved to DB won't be in the client-side messages)
    const dbMessages = sessionMessages
      .filter(m => m.content !== "[video recommendation]" && m.content !== "[voice video recommendation]")
      .slice(-20);
    if (dbMessages.length > 0) {
      voiceHistory = dbMessages
        .map(m => `${m.role === "user" ? "User" : "You (Dr. Erik)"}: ${m.content}`)
        .join("\n");
    }
  }

  const result = await ChatService.stream(messages, { sessionId, userId, sharedVideos, feedbackSummary, voiceHistory });

  // Collect text from ALL steps (multi-step tool use means text before + after tool call)
  const steps = await result.steps;
  const fullText = steps.map(s => s.text).filter(Boolean).join("\n\n");
  const videoIds = ChatService.lastSavedVideoIds;
  const hasContent = !!fullText;
  const hasVideos = videoIds.length > 0;

  // Save assistant message if there's text OR videos
  if (userId && sessionId && (hasContent || hasVideos)) {
    await prisma.message.create({
      data: {
        sessionId,
        role: "assistant",
        content: fullText || "[video recommendation]",
        videoIds: videoIds,
      },
    });
  }

  if (hasContent) {
    try {
      const response = await convertTextToSpeech(fullText);
      if (response?.filename && response?.mimeType) {
        (await cookies()).set("audio_file", `${response.filename}.${response.mimeType}`, {
          path: "/",
          httpOnly: false,
          maxAge: 3600,
        });
      }
    } catch (err) {
      console.error("TTS failed, continuing without audio:", err);
    }
  }

  return result.toUIMessageStreamResponse();
}
