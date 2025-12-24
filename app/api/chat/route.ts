import { streamText, UIMessage, convertToModelMessages } from 'ai';
import { EmotionGuideAgent } from '@/lib/ai/agent';
import { ChatService } from '@/lib/ai/chatService';
import { groq } from '@ai-sdk/groq';
import 'dotenv/config';

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  // streamText({
  //   model: groq("llama-3.1-8b-instant"),
  //   messages: convertToModelMessages(messages),
  // });
  const result = await ChatService.stream(messages);

  // const result = EmotionGuideAgent.stream({
  //   prompt: 'I am subject to tension and anxiety due to my loss of job and financial issues. Can u motivate me?'
  // });

  return result.toUIMessageStreamResponse();
}
