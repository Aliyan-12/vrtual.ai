import {
  experimental_generateSpeech,
  SpeechModel
} from "ai";
import { google } from "@ai-sdk/google";

export class VoiceService {
    static async speech(text: any) {
        const model = google.speechModel('gemini-2.0-pro-tts') as SpeechModel;

        // console.log(res.content);
        return experimental_generateSpeech({
          // model: groq("moonshotai/kimi-k2-instruct-0905"),
          model: model,
          voice: "Studio",
          text
        });
    }
}
