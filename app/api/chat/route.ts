import { streamText, UIMessage, convertToModelMessages } from 'ai';
import 'dotenv/config';

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: "moonshotai/kimi-k2",
    messages: convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse();
}
