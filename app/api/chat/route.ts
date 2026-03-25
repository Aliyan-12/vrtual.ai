import { UIMessage } from 'ai';
import { ChatService } from '@/lib/ai/chatService';
import { convertTextToSpeech } from '@/lib/utils/helper';
import { cookies } from "next/headers";

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = await ChatService.stream(messages);

  await result.steps.then(async (steps) => {
    try {
      const fullText = steps.map(s => s.text).filter(Boolean).join("\n\n");
      if (!fullText) return;

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
