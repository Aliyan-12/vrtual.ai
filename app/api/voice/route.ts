import { NextResponse } from "next/server";
import 'dotenv/config';
import { VoiceService } from "@/lib/ai/voiceService";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const text = body.text;
    const model = "gemini-2.5-pro-preview-tts";

    const stream = await VoiceService.textToSpeechStream(model, text);
    const { filename, filepath, mimeType } = await VoiceService.saveSpeechToFile(stream);

    return NextResponse.json({
        filepath: filepath,
        filename: filename,
        mimeType: mimeType
    }, {
      status: 200
    });
  } catch (e: any) {
    console.error("TTS API ERROR:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
