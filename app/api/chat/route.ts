import { streamText, UIMessage, convertToModelMessages } from 'ai';
import { EmotionGuideAgent } from '@/lib/ai/agent';
import { ChatService } from '@/lib/ai/chatService';
import { groq } from '@ai-sdk/groq';
import 'dotenv/config';
import { convertTextToSpeech } from '@/lib/utils/helper';
import path from 'path';

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  // streamText({
  //   model: groq("llama-3.1-8b-instant"),
  //   messages: convertToModelMessages(messages),
  // });
  const result = await ChatService.stream(messages);
  // const streamResponse = result.toUIMessageStreamResponse();
  
  // await result.text.then(async (fullText: string) => {
  //   const response = await convertTextToSpeech(fullText);

  //   console.log(response);
  //   streamResponse.headers.set("x-audio-file", response?.filepath);
  //   streamResponse.headers.set("x-audio-mime", response?.mimeType);
  // });

  return result.toUIMessageStreamResponse();
  // const result = EmotionGuideAgent.stream({
  //   prompt: 'I am subject to tension and anxiety due to my loss of job and financial issues. Can u motivate me?'
  // });

  // return Response.json(result.content);
  // return result.toUIMessageStreamResponse();
}
