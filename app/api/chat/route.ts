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

  // Load previously shared videos for this session (from message videoIds)
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

  const result = await ChatService.stream(messages, { sessionId, userId, sharedVideos });

  await result.text.then(async (fullText: string) => {
    // Save assistant message to DB if authenticated, with videoIds
    if (userId && sessionId && fullText) {
      const videoIds = ChatService.lastSavedVideoIds;
      await prisma.message.create({
        data: {
          sessionId,
          role: "assistant",
          content: fullText,
          videoIds: videoIds,
        },
      });
    }

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
  });

  return result.toUIMessageStreamResponse();
}
