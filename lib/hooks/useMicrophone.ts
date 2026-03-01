import { useState, useRef, useCallback } from "react";
import { GoogleGenAI, Modality, Session, Type } from "@google/genai";
import { SYSTEM_PROMPT, FETCH_VIDEOS_DESCRIPTION } from "@/lib/ai/systemPrompt";

export type VoiceTranscript = {
  role: "user" | "assistant";
  text: string;
};

export type VoiceVideo = {
  id: string;
  url: string;
  title?: string;
  embedUrl?: string;
};

const PCM_WORKLET_CODE = `
class PcmProcessor extends AudioWorkletProcessor {
  process(inputs) {
    const input = inputs[0];
    if (input.length > 0) {
      const float32 = input[0];
      const int16 = new Int16Array(float32.length);
      for (let i = 0; i < float32.length; i++) {
        const s = Math.max(-1, Math.min(1, float32[i]));
        int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
      }
      this.port.postMessage(int16.buffer, [int16.buffer]);
    }
    return true;
  }
}
registerProcessor("pcm-processor", PcmProcessor);
`;

export function useMicrophone() {
  const [connected, setConnected] = useState(false);
  const [recording, setRecording] = useState(false);
  const [transcripts, setTranscripts] = useState<VoiceTranscript[]>([]);
  const [videos, setVideos] = useState<VoiceVideo[]>([]);

  const sessionRef = useRef<Session | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const playbackCtxRef = useRef<AudioContext | null>(null);
  const playbackTimeRef = useRef(0);

  function getPlaybackCtx() {
    if (!playbackCtxRef.current) {
      playbackCtxRef.current = new AudioContext({ sampleRate: 24000 });
    }
    return playbackCtxRef.current;
  }

  function playPcmChunk(base64Data: string) {
    const ctx = getPlaybackCtx();
    const raw = atob(base64Data);
    const bytes = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) {
      bytes[i] = raw.charCodeAt(i);
    }

    const int16 = new Int16Array(bytes.buffer);
    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) {
      float32[i] = int16[i] / 32768;
    }

    const audioBuffer = ctx.createBuffer(1, float32.length, 24000);
    audioBuffer.getChannelData(0).set(float32);

    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);

    const now = ctx.currentTime;
    const startTime = Math.max(now, playbackTimeRef.current);
    source.start(startTime);
    playbackTimeRef.current = startTime + audioBuffer.duration;
  }

  function appendTranscript(role: "user" | "assistant", text: string) {
    setTranscripts(prev => {
      if (prev.length > 0 && prev[prev.length - 1].role === role) {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role,
          text: updated[updated.length - 1].text + text,
        };
        return updated;
      }
      return [...prev, { role, text }];
    });
  }

  async function handleToolCall(session: Session, functionCalls: any[]) {
    const responses = [];

    for (const call of functionCalls) {
      if (call.name === "fetchVideos") {
        try {
          const res = await fetch("/api/voice/tool", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              query: call.args?.query || "",
              userContext: call.args?.userContext || "",
            }),
          });
          const result = await res.json();
          setVideos(prev => [...prev, ...result]);
          responses.push({
            id: call.id,
            name: call.name,
            response: { result },
          });
        } catch {
          responses.push({
            id: call.id,
            name: call.name,
            response: { error: "Failed to fetch videos" },
          });
        }
      }
    }

    if (responses.length > 0) {
      session.sendToolResponse({ functionResponses: responses });
    }
  }

  const connect = useCallback(async () => {
    if (sessionRef.current) return sessionRef.current;

    const ai = new GoogleGenAI({
      apiKey: process.env.NEXT_PUBLIC_GOOGLE_GENERATIVE_AI_API_KEY!,
    });

    const session = await ai.live.connect({
      model: "gemini-2.0-flash-live-001",
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: "Zephyr" },
          },
        },
        systemInstruction: SYSTEM_PROMPT,
        inputAudioTranscription: {},
        outputAudioTranscription: {},
        tools: [{
          functionDeclarations: [{
            name: "fetchVideos",
            description: FETCH_VIDEOS_DESCRIPTION,
            parameters: {
              type: Type.OBJECT,
              properties: {
                query: {
                  type: Type.STRING,
                  description: "Search query for Erik Fisher channel",
                },
                userContext: {
                  type: Type.STRING,
                  description: "User's emotional context based on conversation so far",
                },
              },
              required: ["query", "userContext"],
            },
          }],
        }],
      },
      callbacks: {
        onopen: () => {
          setConnected(true);
        },
        onmessage: (msg: any) => {
          if (msg.serverContent?.modelTurn?.parts) {
            for (const part of msg.serverContent.modelTurn.parts) {
              if (part.inlineData?.data) {
                playPcmChunk(part.inlineData.data);
              }
            }
          }

          if (msg.serverContent?.inputTranscription?.text) {
            appendTranscript("user", msg.serverContent.inputTranscription.text);
          }

          if (msg.serverContent?.outputTranscription?.text) {
            appendTranscript("assistant", msg.serverContent.outputTranscription.text);
          }

          if (msg.serverContent?.interrupted) {
            playbackTimeRef.current = 0;
          }

          if (msg.toolCall?.functionCalls) {
            handleToolCall(sessionRef.current!, msg.toolCall.functionCalls);
          }
        },
        onerror: (err: any) => {
          console.error("Live session error:", err.message || err);
        },
        onclose: () => {
          setConnected(false);
          setRecording(false);
          sessionRef.current = null;
        },
      },
    });

    sessionRef.current = session;
    return session;
  }, []);

  async function startRecording() {
    const session = sessionRef.current || (await connect());
    if (!session) return;

    try {
      const micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      streamRef.current = micStream;

      const audioCtx = new AudioContext({ sampleRate: 16000 });
      audioCtxRef.current = audioCtx;

      const blob = new Blob([PCM_WORKLET_CODE], { type: "application/javascript" });
      const workletUrl = URL.createObjectURL(blob);
      await audioCtx.audioWorklet.addModule(workletUrl);
      URL.revokeObjectURL(workletUrl);

      const source = audioCtx.createMediaStreamSource(micStream);
      sourceRef.current = source;

      const workletNode = new AudioWorkletNode(audioCtx, "pcm-processor");
      workletNodeRef.current = workletNode;

      workletNode.port.onmessage = (e: MessageEvent) => {
        const pcmBuffer: ArrayBuffer = e.data;
        const bytes = new Uint8Array(pcmBuffer);

        let binary = "";
        for (let i = 0; i < bytes.length; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        const base64 = btoa(binary);

        session.sendRealtimeInput({
          audio: {
            data: base64,
            mimeType: "audio/pcm;rate=16000",
          },
        });
      };

      source.connect(workletNode);
      workletNode.connect(audioCtx.destination);

      setRecording(true);
    } catch (err) {
      console.error("Mic error:", err);
    }
  }

  function stopRecording() {
    if (workletNodeRef.current) {
      workletNodeRef.current.disconnect();
      workletNodeRef.current = null;
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    if (audioCtxRef.current) {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
    }

    setRecording(false);
  }

  function disconnect() {
    stopRecording();
    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = null;
    }
    setConnected(false);
  }

  return { connect, startRecording, stopRecording, disconnect, recording, connected, transcripts, videos };
}
