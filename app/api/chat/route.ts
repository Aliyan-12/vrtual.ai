import { UIMessage } from 'ai';
import { ChatService } from '@/lib/ai/chatService';
import { convertTextToSpeech } from '@/lib/utils/helper';
import { cookies } from "next/headers";
import { getMongoClient } from "@/lib/db/mongo";

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  try {
    await getMongoClient();
  } catch {}

  const result = await ChatService.stream(messages);

  await result.text.then(async (fullText: string) => {
    try {
      const response = await convertTextToSpeech(fullText);
      if (response?.filename && response?.mimeType) {
        (await cookies()).set("audio_file", `${response.filename}.${response.mimeType}`, {
          path: "/chat",
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
