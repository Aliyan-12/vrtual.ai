import { useState, useRef, useCallback } from "react";
import { GoogleGenAI, Modality, Session } from "@google/genai";

// AudioWorklet processor code — captures raw 16-bit PCM at 16kHz mono
const PCM_WORKLET_CODE = `
class PcmProcessor extends AudioWorkletProcessor {
  process(inputs) {
    const input = inputs[0];
    if (input.length > 0) {
      const float32 = input[0]; // mono channel
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

  const sessionRef = useRef<Session | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Playback: queue PCM chunks and play via AudioContext
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

    // Convert 16-bit LE PCM to Float32
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

    // Schedule chunks back-to-back for gapless playback
    const now = ctx.currentTime;
    const startTime = Math.max(now, playbackTimeRef.current);
    source.start(startTime);
    playbackTimeRef.current = startTime + audioBuffer.duration;
  }

  const connect = useCallback(async () => {
    if (sessionRef.current) return sessionRef.current;

    const ai = new GoogleGenAI({
      apiKey: process.env.NEXT_PUBLIC_GOOGLE_GENERATIVE_AI_API_KEY!,
    });

    const session = await ai.live.connect({
      model: "gemini-2.5-flash-native-audio-preview-12-2025",
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: "Zephyr" },
          },
        },
      },
      callbacks: {
        onopen: () => {
          setConnected(true);
          console.log("Live session opened");
        },
        onmessage: (msg: any) => {
          // Handle audio response chunks
          if (msg.serverContent?.modelTurn?.parts) {
            for (const part of msg.serverContent.modelTurn.parts) {
              if (part.inlineData?.data) {
                playPcmChunk(part.inlineData.data);
              }
            }
          }

          if (msg.serverContent?.interrupted) {
            // Model was interrupted, reset playback queue
            playbackTimeRef.current = 0;
          }
        },
        onerror: (err: any) => {
          console.error("Live session error:", err.message || err);
        },
        onclose: (e: any) => {
          console.log("Live session closed:", e?.reason || "");
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

      // Create AudioContext at 16kHz for mic capture
      const audioCtx = new AudioContext({ sampleRate: 16000 });
      audioCtxRef.current = audioCtx;

      // Register the PCM worklet processor
      const blob = new Blob([PCM_WORKLET_CODE], { type: "application/javascript" });
      const workletUrl = URL.createObjectURL(blob);
      await audioCtx.audioWorklet.addModule(workletUrl);
      URL.revokeObjectURL(workletUrl);

      // Connect mic -> worklet
      const source = audioCtx.createMediaStreamSource(micStream);
      sourceRef.current = source;

      const workletNode = new AudioWorkletNode(audioCtx, "pcm-processor");
      workletNodeRef.current = workletNode;

      workletNode.port.onmessage = (e: MessageEvent) => {
        const pcmBuffer: ArrayBuffer = e.data;
        const bytes = new Uint8Array(pcmBuffer);

        // Convert to base64
        let binary = "";
        for (let i = 0; i < bytes.length; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        const base64 = btoa(binary);

        // Send raw PCM to Gemini Live API
        session.sendRealtimeInput({
          audio: {
            data: base64,
            mimeType: "audio/pcm;rate=16000",
          },
        });
      };

      source.connect(workletNode);
      workletNode.connect(audioCtx.destination); // needed to keep worklet running

      setRecording(true);
    } catch (err) {
      console.error("Mic error:", err);
    }
  }

  function stopRecording() {
    // Disconnect worklet
    if (workletNodeRef.current) {
      workletNodeRef.current.disconnect();
      workletNodeRef.current = null;
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }

    // Stop mic tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    // Close capture AudioContext
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

  return { connect, startRecording, stopRecording, disconnect, recording, connected };
}
