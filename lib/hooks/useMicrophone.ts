import { useState, useRef, useCallback } from "react";
import { GoogleGenAI, Modality, Session, Type } from "@google/genai";
import { SYSTEM_PROMPT, FETCH_VIDEOS_DESCRIPTION } from "@/lib/ai/systemPrompt";

const HISTORY_SEPARATOR = "────────────────────────────────────────";

// How long after the last audio chunk to keep the mic muted (ms).
// Must be long enough for speaker reverb to fade before mic reopens.
const MIC_UNMUTE_DELAY = 1200;

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

export type ConnectionStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "error";

const MAX_RECONNECT_ATTEMPTS = 3;
const RECONNECT_DELAY = 1500;

export function useMicrophone(sessionId?: string) {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("disconnected");
  const [recording, setRecording] = useState(false);
  const [transcripts, setTranscripts] = useState<VoiceTranscript[]>([]);
  const [videos, setVideos] = useState<VoiceVideo[]>([]);
  const [statusMessage, setStatusMessage] = useState("");

  const sessionRef = useRef<Session | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const playbackCtxRef = useRef<AudioContext | null>(null);
  const playbackTimeRef = useRef(0);
  const connectingRef = useRef(false);
  const wasRecordingRef = useRef(false);
  const reconnectAttemptsRef = useRef(0);
  const intentionalCloseRef = useRef(false);
  const pendingTranscriptRef = useRef<VoiceTranscript | null>(null);
  const pendingVideoIdsRef = useRef<string[]>([]);
  const [transcriptMessageIds, setTranscriptMessageIds] = useState<Record<number, string>>({});
  const transcriptSaveIndexRef = useRef(0);

  // Echo suppression: mute mic while model is speaking
  const modelSpeakingRef = useRef(false);
  const unmuteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Track active playback sources so we can stop them on interruption
  const activeSourcesRef = useRef<AudioBufferSourceNode[]>([]);

  function showStatus(msg: string, duration = 3000) {
    setStatusMessage(msg);
    if (duration > 0) {
      setTimeout(() => setStatusMessage(""), duration);
    }
  }

  function getPlaybackCtx() {
    if (!playbackCtxRef.current || playbackCtxRef.current.state === "closed") {
      playbackCtxRef.current = new AudioContext({ sampleRate: 24000 });
    }
    if (playbackCtxRef.current.state === "suspended") {
      playbackCtxRef.current.resume();
    }
    return playbackCtxRef.current;
  }

  function stopAllPlayback() {
    for (const src of activeSourcesRef.current) {
      try { src.stop(); } catch { /* already stopped */ }
    }
    activeSourcesRef.current = [];
    playbackTimeRef.current = 0;
    modelSpeakingRef.current = false;
    if (unmuteTimerRef.current) {
      clearTimeout(unmuteTimerRef.current);
      unmuteTimerRef.current = null;
    }
  }

  function playPcmChunk(base64Data: string) {
    // Mark model as speaking — this mutes mic input
    modelSpeakingRef.current = true;
    if (unmuteTimerRef.current) {
      clearTimeout(unmuteTimerRef.current);
    }

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

    // Track active source for interruption
    activeSourcesRef.current.push(source);
    source.onended = () => {
      activeSourcesRef.current = activeSourcesRef.current.filter(s => s !== source);
    };

    // Schedule unmute after playback finishes + delay
    const playbackEndMs = (playbackTimeRef.current - now) * 1000 + MIC_UNMUTE_DELAY;
    unmuteTimerRef.current = setTimeout(() => {
      modelSpeakingRef.current = false;
      unmuteTimerRef.current = null;
    }, playbackEndMs);
  }

  async function saveTranscriptToDB(role: "user" | "assistant", content: string, transcriptIdx: number, videoIds?: string[]) {
    if (!sessionId) return;
    const hasContent = !!content.trim();
    const hasVideos = videoIds && videoIds.length > 0;
    if (!hasContent && !hasVideos) return;
    try {
      const res = await fetch(`/api/sessions/${sessionId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role,
          content: content.trim() || "[video recommendation]",
          ...(hasVideos ? { videoIds } : {}),
        }),
      });
      if (res.ok) {
        const saved = await res.json();
        if (saved?.id) {
          setTranscriptMessageIds(prev => ({ ...prev, [transcriptIdx]: saved.id }));
        }
      }
    } catch (e) {
      console.error("Failed to save voice transcript:", e);
    }
  }

  function flushPendingTranscript() {
    const pending = pendingTranscriptRef.current;
    const videoIds = pending?.role === "assistant" ? pendingVideoIdsRef.current.splice(0) : undefined;
    const hasContent = pending && pending.text.trim();
    const hasVideos = videoIds && videoIds.length > 0;

    if (pending && (hasContent || hasVideos)) {
      const idx = transcriptSaveIndexRef.current;
      transcriptSaveIndexRef.current++;
      saveTranscriptToDB(pending.role, pending.text, idx, videoIds);
    }
    pendingTranscriptRef.current = null;
  }

  function appendTranscript(role: "user" | "assistant", text: string) {
    // When role changes, the previous transcript is complete — save it
    if (pendingTranscriptRef.current && pendingTranscriptRef.current.role !== role) {
      flushPendingTranscript();
      pendingTranscriptRef.current = { role, text };
    } else if (pendingTranscriptRef.current) {
      pendingTranscriptRef.current.text += text;
    } else {
      pendingTranscriptRef.current = { role, text };
    }

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
              ...(sessionId ? { sessionId } : {}),
            }),
          });
          const result = await res.json();

          if (result.noResults) {
            responses.push({
              id: call.id,
              name: call.name,
              response: { noResults: true, message: result.message, suggestedTopic: result.suggestedTopic },
            });
          } else {
            const videos = result.videos || [];
            setVideos(prev => [...prev, ...videos]);

            if (result.savedVideoIds?.length) {
              pendingVideoIdsRef.current.push(...result.savedVideoIds);
            }

            responses.push({
              id: call.id,
              name: call.name,
              response: { result: videos },
            });
          }
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
      try {
        session.sendToolResponse({ functionResponses: responses });
      } catch {
      }
    }
  }

  function cleanupMic() {
    if (workletNodeRef.current) {
      workletNodeRef.current.port.onmessage = null;
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
    if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
  }

  async function attemptReconnect() {
    if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
      showStatus("Connection lost. Please try again.", 5000);
      setConnectionStatus("error");
      setRecording(false);
      cleanupMic();
      reconnectAttemptsRef.current = 0;
      return;
    }

    reconnectAttemptsRef.current += 1;
    const attempt = reconnectAttemptsRef.current;
    setConnectionStatus("reconnecting");
    showStatus(`Reconnecting... (${attempt}/${MAX_RECONNECT_ATTEMPTS})`, 0);

    await new Promise(r => setTimeout(r, RECONNECT_DELAY));

    sessionRef.current = null;
    connectingRef.current = false;
    const session = await createSession();
    if (session && wasRecordingRef.current) {
      reconnectAttemptsRef.current = 0;
      showStatus("Reconnected", 2000);
      await setupMicStream(session);
    }
  }

  async function createSession(): Promise<Session | null> {
    if (sessionRef.current) return sessionRef.current;
    if (connectingRef.current) return null;
    connectingRef.current = true;

    try {
      const ai = new GoogleGenAI({
        apiKey: process.env.NEXT_PUBLIC_GOOGLE_GENERATIVE_AI_API_KEY!,
      });

      // Fetch recent conversation history for context
      let systemInstructionWithHistory = SYSTEM_PROMPT;
      if (sessionId) {
        try {
          const historyRes = await fetch(`/api/sessions/${sessionId}`);
          if (historyRes.ok) {
            const historyData = await historyRes.json();
            if (historyData?.messages?.length) {
              const recentMessages = historyData.messages
                .filter((m: any) => m.content !== "[voice video recommendation]" && m.content !== "[video recommendation]")
                .slice(-20);
              if (recentMessages.length > 0) {
                const sharedVideos: string[] = [];
                if (historyData.videos) {
                  const allVideoIds = historyData.messages.flatMap((m: any) => m.videoIds || []);
                  for (const vid of allVideoIds) {
                    const v = historyData.videos[vid];
                    if (v) sharedVideos.push(`${v.title} (${v.youtubeId})`);
                  }
                }

                systemInstructionWithHistory += `\n\n${HISTORY_SEPARATOR}\nRECENT CONVERSATION HISTORY\n${HISTORY_SEPARATOR}\n` +
                  recentMessages.map((m: any) => `${m.role === "user" ? "User" : "You (Dr. Erik)"}: ${m.content}`).join("\n") +
                  `\n${HISTORY_SEPARATOR}\nContinue the conversation naturally based on this history. The user may reference things discussed before. Do NOT re-greet the user if you already have conversation history.\n`;

                if (sharedVideos.length > 0) {
                  systemInstructionWithHistory += `\nAlready shared videos (do NOT recommend again):\n${sharedVideos.map(v => `- ${v}`).join("\n")}\n`;
                }

                // Add feedback stats
                if (historyData.feedbackStats) {
                  const fs = historyData.feedbackStats;
                  if (fs.messageLikes + fs.messageDislikes + fs.videoLikes + fs.videoDislikes > 0) {
                    systemInstructionWithHistory += `\nUser feedback in this session: ${fs.messageLikes} liked responses, ${fs.messageDislikes} disliked responses, ${fs.videoLikes} liked videos, ${fs.videoDislikes} disliked videos. Adjust accordingly.\n`;
                  }
                }
              }
            }
          }
        } catch (e) {
          console.error("Failed to fetch history for voice context:", e);
        }
      }

      const session = await ai.live.connect({
        model: "gemini-2.5-flash-native-audio-preview-12-2025",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: "Charon" },
            },
          },
          systemInstruction: systemInstructionWithHistory,
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
            setConnectionStatus("connected");
            reconnectAttemptsRef.current = 0;
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

            // Model was interrupted by user — stop all queued audio immediately
            if (msg.serverContent?.interrupted) {
              stopAllPlayback();
            }

            if (msg.toolCall?.functionCalls && sessionRef.current) {
              handleToolCall(sessionRef.current, msg.toolCall.functionCalls);
            }
          },
          onerror: (err: any) => {
            console.error("Live session error:", err.message || err);
          },
          onclose: () => {
            flushPendingTranscript();
            sessionRef.current = null;
            cleanupMic();
            stopAllPlayback();

            if (intentionalCloseRef.current) {
              intentionalCloseRef.current = false;
              setConnectionStatus("disconnected");
              setRecording(false);
              showStatus("Voice disconnected", 2000);
              return;
            }

            if (wasRecordingRef.current) {
              attemptReconnect();
            } else {
              setConnectionStatus("disconnected");
              setRecording(false);
              showStatus("Voice session ended", 3000);
            }
          },
        },
      });

      sessionRef.current = session;
      return session;
    } catch (err) {
      console.error("Failed to connect:", err);
      showStatus("Failed to connect. Check your connection.", 4000);
      setConnectionStatus("error");
      return null;
    } finally {
      connectingRef.current = false;
    }
  }

  async function setupMicStream(session: Session) {
    try {
      const micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = micStream;

      const audioCtx = new AudioContext({ sampleRate: 16000 });
      if (audioCtx.state === "suspended") {
        await audioCtx.resume();
      }
      audioCtxRef.current = audioCtx;

      const actualRate = audioCtx.sampleRate;

      try {
        await audioCtx.audioWorklet.addModule("/pcm-processor.js");
        const workletNode = new AudioWorkletNode(audioCtx, "pcm-processor");
        workletNodeRef.current = workletNode;

        workletNode.port.onmessage = (e: MessageEvent) => {
          if (!sessionRef.current) return;
          // Skip sending mic data while model is speaking (echo suppression)
          if (modelSpeakingRef.current) return;
          const pcmBuffer: ArrayBuffer = e.data;
          sendPcmData(pcmBuffer, actualRate);
        };

        const source = audioCtx.createMediaStreamSource(micStream);
        sourceRef.current = source;
        source.connect(workletNode);
        workletNode.connect(audioCtx.destination);
      } catch {
        const source = audioCtx.createMediaStreamSource(micStream);
        sourceRef.current = source;
        const scriptNode = audioCtx.createScriptProcessor(4096, 1, 1);
        scriptNode.onaudioprocess = (e: AudioProcessingEvent) => {
          if (!sessionRef.current) return;
          // Skip sending mic data while model is speaking (echo suppression)
          if (modelSpeakingRef.current) return;
          const float32 = e.inputBuffer.getChannelData(0);
          const int16 = new Int16Array(float32.length);
          for (let i = 0; i < float32.length; i++) {
            const s = Math.max(-1, Math.min(1, float32[i]));
            int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
          }
          sendPcmData(int16.buffer, actualRate);
        };
        source.connect(scriptNode);
        scriptNode.connect(audioCtx.destination);
        (workletNodeRef as any).current = scriptNode;
      }

      setRecording(true);
      wasRecordingRef.current = true;
    } catch (err) {
      console.error("Mic error:", err);
      showStatus("Microphone access denied", 3000);
    }
  }

  function sendPcmData(pcmBuffer: ArrayBuffer, sampleRate: number) {
    if (!sessionRef.current) return;
    const bytes = new Uint8Array(pcmBuffer);

    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);

    try {
      sessionRef.current.sendRealtimeInput({
        audio: {
          data: base64,
          mimeType: `audio/pcm;rate=${sampleRate}`,
        },
      });
    } catch {
    }
  }

  const connect = useCallback(async () => {
    setConnectionStatus("connecting");
    showStatus("Connecting to voice...", 0);
    const session = await createSession();
    if (session) {
      showStatus("Voice connected", 2000);
    }
    return session;
  }, []);

  async function startRecording() {
    // Always create a fresh session so it picks up the latest DB context
    // (e.g. text messages sent since the last voice session)
    if (sessionRef.current) {
      try { sessionRef.current.close(); } catch {}
      sessionRef.current = null;
      connectingRef.current = false;
      cleanupMic();
      stopAllPlayback();
    }

    setConnectionStatus("connecting");
    showStatus("Connecting to voice...", 0);
    const session = await createSession();
    if (!session) return;

    showStatus("Voice connected", 2000);
    await setupMicStream(session);
  }

  function stopRecording() {
    wasRecordingRef.current = false;
    cleanupMic();
    setRecording(false);
  }

  function disconnect() {
    flushPendingTranscript();
    wasRecordingRef.current = false;
    intentionalCloseRef.current = true;
    stopRecording();
    stopAllPlayback();
    if (sessionRef.current) {
      try {
        sessionRef.current.close();
      } catch {
      }
      sessionRef.current = null;
    }
    setConnectionStatus("disconnected");
    if (playbackCtxRef.current && playbackCtxRef.current.state !== "closed") {
      playbackCtxRef.current.close();
      playbackCtxRef.current = null;
    }
    playbackTimeRef.current = 0;
  }

  return {
    connect,
    startRecording,
    stopRecording,
    disconnect,
    recording,
    connected: connectionStatus === "connected",
    connectionStatus,
    statusMessage,
    transcripts,
    transcriptMessageIds,
    videos,
  };
}
