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

    // const encoder = new TextEncoder();
    // const readable = new ReadableStream({
    //   async pull(controller) {
    //     for await (const chunk of stream) {
    //       const part =
    //         chunk?.candidates?.[0]?.content?.parts?.[0]?.inlineData;
    //         console.log(part);
    //       if (part?.data) {
    //         // send as base64 audio
    //         const jsonChunk = JSON.stringify({
    //           audio: part.data,
    //           mime: part.mimeType,
    //         });

    //         controller.enqueue(encoder.encode(jsonChunk + "\n"));
    //       }
    //     }

    //     controller.close();
    //   },
    // });
    // let fileIndex = 0;
    // let fileName = '';
    // let fileExtension: string | null = '';
    // for await (const chunk of stream) {
    //     if (!chunk.candidates || !chunk.candidates[0].content || !chunk.candidates[0].content.parts) {
    //     continue;
    //     }
    //     if (chunk.candidates?.[0]?.content?.parts?.[0]?.inlineData) {
    //     fileName = `ENTER_FILE_NAME_${fileIndex++}`;
    //     const inlineData = chunk.candidates[0].content.parts[0].inlineData;
    //     fileExtension = mime.getExtension(inlineData.mimeType || '');
    //     let buffer = Buffer.from(inlineData.data || '', 'base64');
    //     if (!fileExtension) {
    //         fileExtension = 'wav';
    //         buffer = convertToWav(inlineData.data || '', inlineData.mimeType || '');
    //     }
    //         saveBinaryFile(`${fileName}.${fileExtension}`, buffer);
    //     }
    //     else {
    //         console.log(chunk.text);
    //     }
    // }

    // const result = await experimental_generateSpeech({
    //     model,
    //     voice: "Studio",
    //     text,
    // });
  } catch (e: any) {
    console.error("TTS API ERROR:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
