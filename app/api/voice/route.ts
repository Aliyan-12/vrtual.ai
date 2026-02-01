import { NextResponse } from "next/server";
import { experimental_generateSpeech, speechModel } from "ai";
import { google } from "@ai-sdk/google";

export async function POST(req: Request) {
  const { text } = await req.json();

  const model = speechModel({
    provider: google,
    modelId: "models/gemini-2.0-flash-tts",
  });

  const result = await experimental_generateSpeech({
    model,
    voice: "Studio",
    text,
  });

  return NextResponse.json({ audio: result.audio.base64, mime: result.audio.mediaType });
}
