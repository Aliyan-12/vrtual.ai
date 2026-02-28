import { generateObject } from "ai";
import { google } from "@ai-sdk/google";
import { z } from "zod";

export async function GET() {
  const { object } = await generateObject({
    model: google("gemini-2.5-flash"),
    temperature: 1.2,
    schema: z.object({
      suggestions: z
        .array(z.string().describe("A first-person mood sentence under 15 words"))
        .length(4),
    }),
    prompt: `Generate exactly 4 short mood-based conversation starters for an emotional support chatbot. Each should be a first-person sentence describing how the user might be feeling right now. Keep each under 15 words. Make them diverse — cover boredom, stress, sadness, and loneliness.`,
  });

  return Response.json(object.suggestions);
}
