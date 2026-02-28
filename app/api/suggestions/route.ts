import { generateText } from "ai";
import { google } from "@ai-sdk/google";

export async function GET() {
  const { text } = await generateText({
    model: google("gemini-2.5-flash"),
    temperature: 1.2,
    prompt: `Generate exactly 4 short mood-based conversation starters for an emotional support chatbot. Each should be a first-person sentence describing how the user might be feeling right now. Keep each under 15 words. Make them diverse — cover boredom, stress, sadness, and loneliness. Return ONLY a JSON array of strings, nothing else.`,
  });

  const suggestions = JSON.parse(text);
  return Response.json(suggestions);
}
