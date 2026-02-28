import { useState, useRef } from "react";
import { GoogleGenAI, Modality, Session } from "@google/genai";

export function useMicrophone() {
  const [session, setSession] = useState<Session | null>(null);
  const [connected, setConnected] = useState(false);
  const [recording, setRecording] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);

  const ai = new GoogleGenAI({
    apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY!,
  });

  async function connect() {
    if (session) return session;

    const s = await ai.live.connect({
      model: "gemini-live-2.5-flash-preview",
      config: {
        responseModalities: [Modality.AUDIO],
        outputAudioTranscription: {},
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: "Zephyr" }
          }
        }
      },
      callbacks: {
        onopen: () => {
          setConnected(true);
          console.log("🔗 Live session opened");
        },
        onmessage: (msg) => {
          if (msg.serverContent?.modelTurn?.parts?.length) {
            msg.serverContent.modelTurn.parts.forEach((part) => {
              if (part.inlineData?.data) {
                const base64Audio = part.inlineData.data;
                const audioBlob = new Blob(
                  [Uint8Array.from(atob(base64Audio), c => c.charCodeAt(0))],
                  { type: "audio/wav" }
                );
                const url = URL.createObjectURL(audioBlob);
                new Audio(url).play();
              }
            });
          }

          if (msg.serverContent?.outputTranscription) {
            console.log("📝 Transcription:", msg.serverContent.outputTranscription.text);
          }
        },
        onerror: (err) => {
          console.error("❌ Live session error:", err);
        },
        onclose: () => {
          setConnected(false);
          console.log("🔌 Live session closed");
          stopRecording(); // Ensure recorder stops if session closes
        }
      }
    });

    setSession(s);
    return s;
  }

  async function startRecording() {
    const s = session || await connect();

    if (!s) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      recorderRef.current = recorder;

      recorder.ondataavailable = async (e) => {
        if (!e.data.size) return;

        if (!connected || !session) return; // ✅ Only send if session is open

        const buf = await e.data.arrayBuffer();
        const bytes = new Uint8Array(buf);
        const base64 = btoa(String.fromCharCode(...bytes));

        session.sendRealtimeInput({
          media: {
            data: base64,
            mimeType: "audio/pcm;rate=16000"
          }
        });
      };

      recorder.start(150);
      setRecording(true);
    } catch (err) {
      console.error("🎤 Mic error:", err);
    }
  }

  function stopRecording() {
    setRecording(false);

    // Stop MediaRecorder if running
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
      recorderRef.current = null;
    }

    // Send session turn complete
    // if (session && connected) {
    //   session.sendTurnComplete();
    // }
  }

  function sendText(text: string) {
    if (!session || !connected) return;
    session.sendClientContent({
      turns: text,
      turnComplete: true
    });
  }

  return { connect, startRecording, stopRecording, sendText, recording, connected };
}