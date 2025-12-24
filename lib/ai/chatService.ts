import {
  streamText,
  generateText,
  UIMessage,
  convertToModelMessages,
} from "ai";
import { EmotionGuideAgent } from "./agent";

type ChatOptions = {
  stream?: boolean;
};

export class ChatService {
    static async stream(messages: UIMessage[]) {
        const modelMessages = convertToModelMessages(messages);
        return EmotionGuideAgent.stream({
            messages: modelMessages,
        });
    }
//   async run(
//     messages: UIMessage[],
//     options: ChatOptions = { stream: true }
//   ) {
//     const modelMessages = [
//         { role: "system", content: `
//                             You are an emotionally intelligent AI support agent.

//                             You listen first.
//                             You respond with empathy.
//                             You may search YouTube for helpful videos when they genuinely add value.

//                             When you recommend videos:
//                             - Explain why each video helps
//                             - Prefer calm, evidence-based content
//                             - Never overwhelm the user

//                             Respond in Markdown.`.trim() 
//         },
//         ...convertToModelMessages(messages),
//     ];
}
