import { useRef, useState } from "react";

export function useGeminiVoice(apiKey: string) {
  const wsRef = useRef<WebSocket | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [connected, setConnected] = useState(false);
  const [recording, setRecording] = useState(false);

  async function connect() {
    return new Promise<void>((resolve) => {
      const ws = new WebSocket(
        `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${apiKey}`
      );

      wsRef.current = ws;
      ws.binaryType = "arraybuffer";

      ws.onopen = () => {
        setConnected(true);
        resolve();

        // Send initial config
        ws.send(
          JSON.stringify({
            setup: {
              model: "gemini-2.0-flash-exp",
              audioConfig: { voiceName: "PIXEL" },
              generationConfig: { responseModalities: ["AUDIO"] }
            }
          })
        );
      };

      ws.onmessage = (event) => {
        // Handle AUDIO output chunks from Gemini
        const msg = JSON.parse(event.data);

        if (msg.audio) {
          const audioBytes = Uint8Array.from(atob(msg.audio.chunk), c => c.charCodeAt(0));
          playAudio(audioBytes);
        }
      };
    });
  }

  function playAudio(bytes: BlobPart) {
    const blob = new Blob([bytes], { type: "audio/wav" });
    const url = URL.createObjectURL(blob);

    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.autoplay = true;
    }

    audioRef.current.src = url;
  }

  async function startRecording() {
    if (!navigator.mediaDevices) return;

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        e.data.arrayBuffer().then((buffer) => {
          const bytes = new Uint8Array(buffer);

          wsRef.current?.send(
            JSON.stringify({
              audio: {
                chunk: btoa(String.fromCharCode(...bytes)),
              },
            })
          );
        });
      }
    };

    recorder.start(200); // send audio chunks every 200ms
    setRecording(true);
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    setRecording(false);

    wsRef.current?.send(JSON.stringify({ finished: true }));
  }

  return {
    connect,
    startRecording,
    stopRecording,
    connected,
    recording,
  };
}
