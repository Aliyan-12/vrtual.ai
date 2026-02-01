import 'dotenv/config';
import { useGeminiVoice } from "@/lib/hooks/useVoiceSocket";

export default function VoiceButton() {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY!;
  const {
    connect,
    startRecording,
    stopRecording,
    connected,
    recording,
  } = useGeminiVoice(apiKey);

  async function handleMicClick() {
    if (!connected) await connect();
    if (!recording) startRecording();
    stopRecording();
  }

  return (
    <button
      onClick={handleMicClick}
      className={`h-10 w-10 rounded-full text-xl ring-1 ring-[var(--primary)] 
        ${recording ? "bg-red-400 animate-pulse" : "bg-[var(--primary-light)]"}`}
    >
      🎙️
    </button>
  );
}
