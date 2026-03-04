'use client';
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useChat } from '@ai-sdk/react';
import { useMicrophone, VoiceVideo, ConnectionStatus } from '@/lib/hooks/useMicrophone';
import MicButton from '@/components/buttons/MicButton';

const ReactPlayer = dynamic(() => import("react-player"), { ssr: false });

const THINKING_WORDS = [
  "listening", "feeling", "reflecting", "understanding",
  "empathizing", "connecting", "processing", "sensing",
  "considering", "absorbing", "analyzing", "composing",
];

const MOOD_ICONS = ["💬", "🩹", "🌊", "🤝"];
const MOOD_STYLES = [
  { color: "from-blue-50 to-indigo-50", border: "border-blue-200 hover:border-blue-400" },
  { color: "from-rose-50 to-pink-50", border: "border-rose-200 hover:border-rose-400" },
  { color: "from-amber-50 to-yellow-50", border: "border-amber-200 hover:border-amber-400" },
  { color: "from-emerald-50 to-teal-50", border: "border-emerald-200 hover:border-emerald-400" },
];

type TimelineItem =
  | { type: "message"; id: string }
  | { type: "transcript"; idx: number }
  | { type: "video"; idx: number };

export default function Chat() {
  const { messages, sendMessage, status } = useChat({
    onFinish: async () => {
      try {
        const cookieValue = document.cookie
          .split("; ")
          .find(row => row.startsWith("audio_file="))
          ?.split("=")[1];

        if (cookieValue) {
          const decoded = decodeURIComponent(cookieValue);
          const audio = new Audio(`/generated/${decoded}`);
          audio.play();
        }
      } catch (err) {
        console.error("Voice conversion error:", err);
      }
    }
  });

  const {
    connect,
    startRecording,
    stopRecording,
    connected,
    connectionStatus,
    statusMessage,
    recording,
    transcripts,
    videos: voiceVideos,
  } = useMicrophone();

  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [likedVideos, setLikedVideos] = useState<Set<string>>(new Set());
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(true);
  const [thinkingWord, setThinkingWord] = useState(THINKING_WORDS[0]);

  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const addedMessageIds = useRef(new Set<string>());
  const addedTranscriptCount = useRef(0);
  const addedVideoCount = useRef(0);

  useEffect(() => {
    const newItems: TimelineItem[] = [];

    for (const msg of messages) {
      if (!addedMessageIds.current.has(msg.id)) {
        addedMessageIds.current.add(msg.id);
        newItems.push({ type: "message", id: msg.id });
      }
    }

    for (let i = addedTranscriptCount.current; i < transcripts.length; i++) {
      newItems.push({ type: "transcript", idx: i });
      addedTranscriptCount.current = i + 1;
    }

    for (let i = addedVideoCount.current; i < voiceVideos.length; i++) {
      newItems.push({ type: "video", idx: i });
      addedVideoCount.current = i + 1;
    }

    if (newItems.length > 0) {
      setTimeline(prev => [...prev, ...newItems]);
    }
  }, [messages, transcripts, voiceVideos]);

  const isThinking = status === "submitted" || (status === "streaming" && messages.length > 0 && messages[messages.length - 1].role === "user");

  useEffect(() => {
    if (!isThinking) return;
    let idx = 0;
    const interval = setInterval(() => {
      idx = (idx + 1) % THINKING_WORDS.length;
      setThinkingWord(THINKING_WORDS[idx]);
    }, 1000);
    return () => clearInterval(interval);
  }, [isThinking]);

  useEffect(() => {
    fetch("/api/suggestions")
      .then(res => res.json())
      .then(data => setSuggestions(data))
      .catch(() => setSuggestions([
        "I'm feeling bored and want some good discussions",
        "I'm dealing with health issues and my mood is really low",
        "I feel stressed and anxious about life lately",
        "I just need someone to talk to and feel less alone",
      ]))
      .finally(() => setLoadingSuggestions(false));
  }, []);

  function toggleLike(videoId: string) {
    setLikedVideos(prev => {
      const next = new Set(prev);
      if (next.has(videoId)) next.delete(videoId);
      else next.add(videoId);
      return next;
    });
  }

  function send(override?: string) {
    const t = (override || text).trim();
    if (!t) return;
    sendMessage({ text: t });
    setText("");
  }

  async function handleMicToggle() {
    if (recording) {
      stopRecording();
    } else {
      await startRecording();
    }
  }

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [timeline, isThinking]);

  function renderTextMessage(message: typeof messages[number]) {
    return (
      <div
        key={message.id}
        className={
          message.role === "user"
            ? "mb-4 text-right"
            : message.role === "assistant"
              ? "mb-4"
              : "mb-4 text-center text-xs text-[var(--text-muted)]"
        }
      >
        <div
          className={
            message.role === "user"
              ? "inline-block max-w-[72ch] rounded-2xl bg-[var(--primary-light)] px-4 py-2 text-[var(--text-dark)] ring-1 ring-[var(--primary)]"
              : message.role === "assistant"
                ? "inline-block max-w-[72ch] rounded-2xl bg-[var(--white)] px-4 py-2 text-[var(--text-dark)] ring-1 ring-black/10"
                : ""
          }
        >
          {message.parts.map((part, i) => {
            if (part.type === 'text') {
              return <div key={`${message.id}-${i}`} dangerouslySetInnerHTML={{ __html: part.text }} />;
            }
            if (part.type === 'tool-fetchVideos' && Array.isArray(part.output)) {
              return part.output?.map((video: { id: string, url: string, title?: string, description?: string, thumbnail?: string, selectedSection?: { startSeconds: number, reason: string }, startUrl?: string, embedUrl?: string }, j: number) => {
                const videoKey = `${video.id}-${j}`;
                const liked = likedVideos.has(videoKey);
                return renderVideoEmbed(videoKey, video, liked);
              });
            }
          })}
        </div>
      </div>
    );
  }

  function renderTranscript(idx: number) {
    const t = transcripts[idx];
    if (!t) return null;
    return (
      <div
        key={`transcript-${idx}`}
        className={t.role === "user" ? "mb-3 text-right" : "mb-3"}
      >
        <div
          className={
            t.role === "user"
              ? "inline-block max-w-[72ch] rounded-2xl bg-[var(--primary-light)] px-4 py-2 text-[var(--text-dark)] ring-1 ring-[var(--primary)]"
              : "inline-block max-w-[72ch] rounded-2xl bg-[var(--white)] px-4 py-2 text-[var(--text-dark)] ring-1 ring-black/10"
          }
        >
          <div className="text-[10px] font-medium text-[var(--text-muted)] mb-0.5">
            {t.role === "user" ? "You (voice)" : "Dr. Erik (voice)"}
          </div>
          <div className="text-sm">{t.text}</div>
        </div>
      </div>
    );
  }

  function renderVoiceVideo(idx: number) {
    const video = voiceVideos[idx];
    if (!video) return null;
    const videoKey = `voice-${video.id}-${idx}`;
    const liked = likedVideos.has(videoKey);
    return (
      <div key={videoKey} className="mb-3">
        <div className="inline-block max-w-[72ch] rounded-2xl bg-[var(--white)] px-4 py-2 ring-1 ring-black/10">
          {renderVideoEmbed(videoKey, video, liked)}
        </div>
      </div>
    );
  }

  function renderVideoEmbed(videoKey: string, video: { id: string, url: string, title?: string, embedUrl?: string }, liked: boolean) {
    return (
      <div key={videoKey} className="my-3 flex items-start gap-2">
        <div className="flex-1 overflow-hidden rounded-xl">
          {video.embedUrl ? (
            <iframe width="100%" height="200px" src={video.embedUrl} />
          ) : (
            <ReactPlayer src={video.url} width="100%" height="200px" controls />
          )}
          <div className="mt-1 text-sm text-[var(--text-muted)]">{video.title}</div>
        </div>
        <button
          onClick={() => toggleLike(videoKey)}
          className={`mt-2 shrink-0 flex items-center justify-center w-9 h-9 rounded-full border transition-all duration-200 cursor-pointer ${
            liked
              ? "bg-red-50 border-red-300 text-red-500 scale-110"
              : "bg-white border-black/10 text-[var(--text-muted)] hover:border-red-300 hover:text-red-400"
          }`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill={liked ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth={2}
            className="w-4 h-4"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
            />
          </svg>
        </button>
      </div>
    );
  }

  const hasContent = messages.length > 0 || transcripts.length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[var(--primary-light)] via-[var(--white)] to-[var(--white)] text-[var(--text-dark)]">
      <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-4 sm:px-6 py-6 sm:py-8">
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto pb-20"
        >
          {!hasContent && (
            <div className="flex flex-col items-center justify-center h-full py-16">
              <h2 className="text-2xl font-semibold text-[var(--text-dark)] mb-2">
                Hey, how are you feeling today?
              </h2>
              <p className="text-[var(--text-muted)] mb-8 text-sm">
                Pick something that matches your mood, or type your own message below.
              </p>
              {loadingSuggestions ? (
                <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent" />
                  Generating suggestions...
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
                  {suggestions.map((label, idx) => {
                    const style = MOOD_STYLES[idx % MOOD_STYLES.length];
                    const icon = MOOD_ICONS[idx % MOOD_ICONS.length];
                    return (
                      <button
                        key={idx}
                        onClick={() => send(label)}
                        className={`flex items-start gap-3 rounded-2xl border bg-gradient-to-br ${style.color} ${style.border} px-4 py-4 text-left text-sm text-[var(--text-dark)] transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-pointer`}
                      >
                        <span className="text-xl mt-0.5 shrink-0">{icon}</span>
                        <span className="leading-snug">{label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {timeline.map((item, i) => {
            if (item.type === "message") {
              const message = messages.find(m => m.id === item.id);
              if (!message) return null;
              return renderTextMessage(message);
            }
            if (item.type === "transcript") {
              return renderTranscript(item.idx);
            }
            if (item.type === "video") {
              return renderVoiceVideo(item.idx);
            }
            return null;
          })}

          {isThinking && (
            <div className="mb-4">
              <div className="inline-flex items-center gap-2 rounded-2xl bg-[var(--white)] px-4 py-3 ring-1 ring-black/10">
                <span className="flex gap-1">
                  <span className="h-2 w-2 rounded-full bg-[var(--primary)] animate-bounce [animation-delay:0ms]" />
                  <span className="h-2 w-2 rounded-full bg-[var(--primary)] animate-bounce [animation-delay:150ms]" />
                  <span className="h-2 w-2 rounded-full bg-[var(--primary)] animate-bounce [animation-delay:300ms]" />
                </span>
                <span className="text-sm text-[var(--text-muted)] italic min-w-[90px] transition-all duration-300">
                  {thinkingWord}...
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="sticky bottom-0">
          {statusMessage && (
            <div className={`mb-2 flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-xs font-medium transition-all duration-300 ${
              connectionStatus === "error"
                ? "bg-red-100 text-red-700"
                : connectionStatus === "reconnecting" || connectionStatus === "connecting"
                  ? "bg-amber-100 text-amber-700"
                  : "bg-emerald-100 text-emerald-700"
            }`}>
              {(connectionStatus === "connecting" || connectionStatus === "reconnecting") && (
                <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
              )}
              {connectionStatus === "connected" && (
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
              )}
              {connectionStatus === "error" && (
                <span className="inline-block h-2 w-2 rounded-full bg-red-500" />
              )}
              {statusMessage}
            </div>
          )}
          <div className="pb-4 pt-2">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send();
              }}
              className="flex items-end gap-3"
            >
              <MicButton recording={recording} connectionStatus={connectionStatus} onToggle={handleMicToggle} />
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                placeholder="how are you feeling?"
                rows={1}
                className="flex-1 min-h-12 max-h-36 resize-none rounded-2xl border border-black/10 bg-[var(--white)] px-4 py-3 text-sm text-[var(--text-dark)] outline-none placeholder:text-[var(--text-muted)] shadow-sm focus:ring-2 focus:ring-[var(--primary)]"
              />
              <button
                type="submit"
                className="rounded-xl bg-[var(--primary)] px-4 py-2 text-sm text-white hover:bg-[var(--primary-hover)]"
              >
                Send
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
