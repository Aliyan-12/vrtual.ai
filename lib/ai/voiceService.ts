import { GenerateContentResponse, GoogleGenAI } from "@google/genai";
import mime from 'mime';
import { saveBinaryFile, convertToWav } from "../utils/helper";
import { now } from "next-auth/client/_utils";

export interface WavConversionOptions {
  numChannels : number,
  sampleRate: number,
  bitsPerSample: number
}

export class VoiceService {
    static async textToSpeechStream(model: string, text: string) {
      const ai = new GoogleGenAI({
          apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY!,
      });
      const config = {
          temperature: 1,
          responseModalities: [
              'audio',
          ],
          speechConfig: {
              voiceConfig: {
                  prebuiltVoiceConfig: {
                      voiceName: 'zephyr'
                      // Allowed voice names are: achernar, achird, algenib, algieba, alnilam, aoede, autonoe, callirrhoe, charon, despina, enceladus, erinome, fenrir, gacrux, iapetus, kore, laomedeia, leda, orus, puck, pulcherrima, rasalgethi, sadachbia, sadaltager, schedar, sulafat, umbriel, vindemiatrix, zephyr, zubenelgenubi
                  }
              }
          },
      };
      const contents = [
        {
            role: 'user',
            parts: [{ text }]
        },
      ];

      const stream = await ai.models.generateContentStream({
          model,
          config,
          contents
      });

      return stream;
    }

    static async saveSpeechToFile(stream: AsyncGenerator<GenerateContentResponse, any, any>) {
      let filePath = '';
      let fileName = '';
      let fileExtension: string | null = '';
      for await (const chunk of stream) {
        if (!chunk.candidates || !chunk.candidates[0].content || !chunk.candidates[0].content.parts) {
          continue;
        }
        if (chunk.candidates?.[0]?.content?.parts?.[0]?.inlineData) {
          fileName = `${now()}`;
          const inlineData = chunk.candidates[0].content.parts[0].inlineData;
          fileExtension = mime.getExtension(inlineData.mimeType || '');
          let buffer = Buffer.from(inlineData.data || '', 'base64');
          if (!fileExtension) {
              fileExtension = 'wav';
              buffer = await convertToWav(inlineData.data || '', inlineData.mimeType || '');
          }
          filePath = await saveBinaryFile(`${fileName}.${fileExtension}`, buffer);
        }
        else {
            console.log(chunk.text);
        }
      }
      
      return {filepath: filePath, mimeType: fileExtension};
    }
}
