'use client';
import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import dynamic from "next/dynamic";
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useMicrophone, VoiceVideo, ConnectionStatus } from '@/lib/hooks/useMicrophone';
import MicButton from '@/components/buttons/MicButton';
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

const ReactPlayer = dynamic(() => import("react-player"), { ssr: false });

const THINKING_WORDS = [
  "listening", "feeling", "reflecting", "understanding",
  "empathizing", "connecting", "processing", "sensing",
  "considering", "absorbing", "analyzing", "composing",
];

const MOOD_ICONS = ["\u{1F4AC}", "\u{1FA79}", "\u{1F30A}", "\u{1F91D}"];
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

type RestoredVideo = {
  id: string;
  url: string;
  title?: string;
  description?: string;
  thumbnail?: string;
  embedUrl?: string;
  selectedSection?: { startSeconds: number; reason: string };
};

// "liked" | "disliked" | null
type FeedbackState = "liked" | "disliked" | null;

interface ChatProps {
  sessionId?: string;
}

export default function Chat({ sessionId }: ChatProps) {
  const { data: authSession, status: authStatus } = useSession();
  const router = useRouter();
  const isAuthenticated = authStatus === "authenticated" && !!authSession?.user;
  const authLoading = authStatus === "loading";
  const [loadedMessages, setLoadedMessages] = useState<any[] | null>(null);
  const [loadedMessageVideos, setLoadedMessageVideos] = useState<Record<string, RestoredVideo[]>>({});
  const [loadingHistory, setLoadingHistory] = useState(!!sessionId);
  const [initialFeedback, setInitialFeedback] = useState<{
    messages: Record<string, FeedbackState>;
    videos: Record<string, FeedbackState>; // key: "messageId:youtubeId"
  }>({ messages: {}, videos: {} });

  useEffect(() => {
    if (authLoading) return;

    if (sessionId && !isAuthenticated) {
      router.replace("/chat");
      return;
    }

    if (!sessionId || !isAuthenticated) {
      setLoadingHistory(false);
      return;
    }

    fetch(`/api/sessions/${sessionId}`)
      .then(res => {
        if (!res.ok) {
          router.replace("/chat");
          return null;
        }
        return res.json();
      })
      .then(data => {
        if (data?.messages?.length) {
          const videosMap = data.videos || {};
          const msgVideos: Record<string, RestoredVideo[]> = {};
          const msgFeedback: Record<string, FeedbackState> = {};
          const vidFeedback: Record<string, FeedbackState> = {};

          const msgs = data.messages.map((m: any) => {
            // Load message feedback
            if (m.feedback) {
              msgFeedback[m.id] = m.feedback;
            }

            // Load video feedback
            if (m.likedVideoIds?.length) {
              for (const vid of m.likedVideoIds) {
                vidFeedback[`${m.id}:${vid}`] = "liked";
              }
            }
            if (m.dislikedVideoIds?.length) {
              for (const vid of m.dislikedVideoIds) {
                vidFeedback[`${m.id}:${vid}`] = "disliked";
              }
            }

            // Build video lookup for this message
            if (m.role === "assistant" && m.videoIds?.length > 0) {
              const vids = m.videoIds
                .map((vid: string) => videosMap[vid])
                .filter(Boolean)
                .map((v: any) => ({
                  id: v.youtubeId,
                  url: v.url,
                  title: v.title,
                  description: v.description,
                  thumbnail: v.thumbnail,
                  embedUrl: v.embedUrl,
                  selectedSection: v.startSeconds != null
                    ? { startSeconds: v.startSeconds, reason: v.selectedSectionReason }
                    : undefined,
                }));
              if (vids.length > 0) {
                msgVideos[m.id] = vids;
              }
            }

            return {
              id: m.id,
              role: m.role,
              content: m.content,
              parts: [{ type: "text" as const, text: m.content }],
            };
          });

          setInitialFeedback({ messages: msgFeedback, videos: vidFeedback });
          setLoadedMessageVideos(msgVideos);
          setLoadedMessages(msgs);
        } else {
          setLoadedMessages([]);
        }
        setLoadingHistory(false);
      })
      .catch(() => {
        setLoadingHistory(false);
        setLoadedMessages([]);
      });
  }, [sessionId, isAuthenticated, authLoading, router]);

  if (authLoading || loadingHistory) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[var(--primary-light)] via-[var(--white)] to-[var(--white)] flex items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent" />
          Loading chat...
        </div>
      </div>
    );
  }

  return (
    <ChatInner
      sessionId={isAuthenticated ? sessionId : undefined}
      initialMessages={loadedMessages ?? undefined}
      messageVideos={loadedMessageVideos}
      initialFeedback={initialFeedback}
      isAuthenticated={isAuthenticated}
      router={router}
    />
  );
}

function ThumbUpIcon({ filled }: { filled: boolean }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.633 10.25c.806 0 1.533-.446 2.031-1.08a9.041 9.041 0 0 1 2.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 0 0 .322-1.672V2.75a.75.75 0 0 1 .75-.75 2.25 2.25 0 0 1 2.25 2.25c0 1.152-.26 2.243-.723 3.218-.266.558.107 1.282.725 1.282m0 0h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 0 1-2.649 7.521c-.388.482-.987.729-1.605.729H13.48c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 0 0-1.423-.23H3.75" />
    </svg>
  );
}

function ThumbDownIcon({ filled }: { filled: boolean }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.367 13.75c-.806 0-1.533.446-2.031 1.08a9.041 9.041 0 0 1-2.861 2.4c-.723.384-1.35.956-1.653 1.715a4.498 4.498 0 0 0-.322 1.672v.633a.75.75 0 0 1-.75.75 2.25 2.25 0 0 1-2.25-2.25c0-1.152.26-2.243.723-3.218.266-.558-.107-1.282-.725-1.282m0 0H4.372c-1.026 0-1.945-.694-2.054-1.715A12.134 12.134 0 0 1 2.25 12c0-2.848.992-5.464 2.649-7.521C5.287 3.997 5.886 3.75 6.504 3.75h4.271c.483 0 .964.078 1.423.23l3.114 1.04a4.501 4.501 0 0 0 1.423.23h2.515" />
    </svg>
  );
}

function ChatInner({
  sessionId,
  initialMessages,
  messageVideos,
  initialFeedback,
  isAuthenticated,
  router,
}: {
  sessionId?: string;
  initialMessages?: any[];
  messageVideos: Record<string, RestoredVideo[]>;
  initialFeedback: { messages: Record<string, FeedbackState>; videos: Record<string, FeedbackState> };
  isAuthenticated: boolean;
  router: ReturnType<typeof useRouter>;
}) {
  const transport = useMemo(() => {
    return new DefaultChatTransport({
      api: '/api/chat',
      body: sessionId ? { sessionId } : undefined,
    });
  }, [sessionId]);

  const { messages, sendMessage, status } = useChat({
    ...(initialMessages?.length ? { messages: initialMessages } : {}),
    transport,
    onFinish: async () => {
      try {
        const cookieValue = document.cookie
          .split("; ")
          .find(row => row.startsWith("audio_file="))
          ?.split("=")[1];

        if (cookieValue) {
          const decoded = decodeURIComponent(cookieValue);
          const audio = new Audio(`/generated/${decoded}`);
          audio.play().catch(() => {});
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
    transcriptMessageIds,
    videos: voiceVideos,
  } = useMicrophone(sessionId);

  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(true);
  const [thinkingWord, setThinkingWord] = useState(THINKING_WORDS[0]);

  // Feedback state
  const [messageFeedback, setMessageFeedback] = useState<Record<string, FeedbackState>>(initialFeedback.messages);
  const [videoFeedback, setVideoFeedback] = useState<Record<string, FeedbackState>>(initialFeedback.videos);

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

  const isThinking = status === "submitted" || status === "streaming";
  const isBusy = status !== "ready";

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

  const submitMessageFeedback = useCallback(async (messageId: string, feedback: "liked" | "disliked", content?: string) => {
    if (!sessionId || messageFeedback[messageId]) return;

    setMessageFeedback(prev => ({ ...prev, [messageId]: feedback }));

    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, messageId, type: "message", feedback, content }),
      });
      if (!res.ok) {
        console.error("Feedback save failed:", res.status, await res.text());
        setMessageFeedback(prev => ({ ...prev, [messageId]: null }));
      }
    } catch (e) {
      console.error("Feedback network error:", e);
      setMessageFeedback(prev => ({ ...prev, [messageId]: null }));
    }
  }, [sessionId, messageFeedback]);

  const submitVideoFeedback = useCallback(async (messageId: string, youtubeId: string, feedback: "liked" | "disliked", content?: string) => {
    const key = `${messageId}:${youtubeId}`;
    if (!sessionId || videoFeedback[key]) return;

    setVideoFeedback(prev => ({ ...prev, [key]: feedback }));

    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, messageId, type: "video", feedback, youtubeId, content }),
      });
      if (!res.ok) {
        console.error("Video feedback save failed:", res.status, await res.text());
        setVideoFeedback(prev => ({ ...prev, [key]: null }));
      }
    } catch (e) {
      console.error("Video feedback network error:", e);
      setVideoFeedback(prev => ({ ...prev, [key]: null }));
    }
  }, [sessionId, videoFeedback]);

  async function send(override?: string) {
    const t = (override || text).trim();
    if (!t || isBusy) return;

    if (isAuthenticated && !sessionId) {
      try {
        const res = await fetch("/api/sessions", { method: "POST" });
        const data = await res.json();
        if (data.id) {
          sessionStorage.setItem("pendingMessage", t);
          router.push(`/chat/${data.id}`);
          return;
        }
      } catch (err) {
        console.error("Failed to create session:", err);
      }
    }

    sendMessage({ text: t });
    setText("");
  }

  useEffect(() => {
    if (!sessionId) return;
    const pending = sessionStorage.getItem("pendingMessage");
    if (pending) {
      sessionStorage.removeItem("pendingMessage");
      sendMessage({ text: pending });
    }
  }, [sessionId]);

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

  function renderFeedbackButtons(messageId: string, type: "message" | "video", youtubeId?: string, content?: string) {
    const key = type === "video" ? `${messageId}:${youtubeId}` : messageId;
    const currentFeedback = type === "video" ? videoFeedback[key] : messageFeedback[key];
    const isLocked = !!currentFeedback;

    const handleFeedback = (feedback: "liked" | "disliked") => {
      if (isLocked || !sessionId) return;
      if (type === "video" && youtubeId) {
        submitVideoFeedback(messageId, youtubeId, feedback, content);
      } else {
        submitMessageFeedback(messageId, feedback, content);
      }
    };

    return (
      <div className="flex items-center gap-1">
        <button
          onClick={() => handleFeedback("liked")}
          disabled={isLocked}
          className={`flex items-center justify-center w-7 h-7 rounded-full border transition-all duration-200 ${
            currentFeedback === "liked"
              ? "bg-emerald-50 border-emerald-300 text-emerald-600"
              : isLocked
                ? "bg-gray-50 border-gray-200 text-gray-300 cursor-not-allowed"
                : "bg-white border-black/10 text-[var(--text-muted)] hover:border-emerald-300 hover:text-emerald-500 cursor-pointer"
          }`}
        >
          <ThumbUpIcon filled={currentFeedback === "liked"} />
        </button>
        <button
          onClick={() => handleFeedback("disliked")}
          disabled={isLocked}
          className={`flex items-center justify-center w-7 h-7 rounded-full border transition-all duration-200 ${
            currentFeedback === "disliked"
              ? "bg-red-50 border-red-300 text-red-500"
              : isLocked
                ? "bg-gray-50 border-gray-200 text-gray-300 cursor-not-allowed"
                : "bg-white border-black/10 text-[var(--text-muted)] hover:border-red-300 hover:text-red-400 cursor-pointer"
          }`}
        >
          <ThumbDownIcon filled={currentFeedback === "disliked"} />
        </button>
      </div>
    );
  }

  function renderTextMessage(message: typeof messages[number]) {
    const restoredVideos = messageVideos[message.id];

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
                return renderVideoEmbed(message.id, video);
              });
            }
          })}

          {restoredVideos?.map((video) => {
            return renderVideoEmbed(message.id, video);
          })}
        </div>

        {/* Message feedback buttons for assistant messages */}
        {message.role === "assistant" && sessionId && (
          <div className="mt-1.5 flex items-center gap-1">
            {renderFeedbackButtons(message.id, "message", undefined,
              message.parts.filter(p => p.type === "text").map(p => (p as any).text).join("")
            )}
          </div>
        )}
      </div>
    );
  }

  function renderTranscript(idx: number) {
    const t = transcripts[idx];
    if (!t) return null;
    const dbMessageId = transcriptMessageIds[idx];
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

        {t.role === "assistant" && sessionId && dbMessageId && (
          <div className="mt-1.5 flex items-center gap-1">
            {renderFeedbackButtons(dbMessageId, "message", undefined, t.text)}
          </div>
        )}
      </div>
    );
  }

  function findVideoMessageId(videoTimelineIdx: number): string | undefined {
    // Walk backwards through timeline to find the nearest assistant transcript with a DB message ID
    const currentPos = timeline.findIndex(
      (item, i) => item.type === "video" && (item as any).idx === videoTimelineIdx
    );
    if (currentPos < 0) return undefined;
    for (let i = currentPos - 1; i >= 0; i--) {
      const item = timeline[i];
      if (item.type === "transcript") {
        const t = transcripts[item.idx];
        if (t?.role === "assistant" && transcriptMessageIds[item.idx]) {
          return transcriptMessageIds[item.idx];
        }
      }
    }
    return undefined;
  }

  function renderVoiceVideo(idx: number) {
    const video = voiceVideos[idx];
    if (!video) return null;
    const dbMessageId = findVideoMessageId(idx);
    return (
      <div key={`voice-${video.id}-${idx}`} className="mb-3">
        <div className="inline-block max-w-[72ch] rounded-2xl bg-[var(--white)] px-4 py-2 ring-1 ring-black/10">
          {dbMessageId && sessionId
            ? renderVideoEmbed(dbMessageId, video)
            : renderVideoEmbedSimple(video)
          }
        </div>
      </div>
    );
  }

  function renderVideoEmbedSimple(video: { id: string, url: string, title?: string, embedUrl?: string }) {
    return (
      <div key={`simple-${video.id}`} className="my-3">
        <div className="overflow-hidden rounded-xl">
          {video.embedUrl ? (
            <iframe width="100%" height="200px" src={video.embedUrl} />
          ) : (
            <ReactPlayer src={video.url} width="100%" height="200px" controls />
          )}
          <div className="mt-1 text-sm text-[var(--text-muted)]">{video.title}</div>
        </div>
      </div>
    );
  }

  function renderVideoEmbed(messageId: string, video: { id: string, url: string, title?: string, embedUrl?: string }) {
    return (
      <div key={`${messageId}-${video.id}`} className="my-3">
        <div className="overflow-hidden rounded-xl">
          {video.embedUrl ? (
            <iframe width="100%" height="200px" src={video.embedUrl} />
          ) : (
            <ReactPlayer src={video.url} width="100%" height="200px" controls />
          )}
          <div className="mt-1 flex items-center justify-between">
            <div className="text-sm text-[var(--text-muted)]">{video.title}</div>
            {sessionId && renderFeedbackButtons(messageId, "video", video.id)}
          </div>
        </div>
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
              {!isAuthenticated && (
                <p className="text-xs text-[var(--text-muted)] mb-4">
                  <a href="/login" className="text-[var(--primary)] hover:underline">Sign in</a> to save your conversations.
                </p>
              )}
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
                        disabled={isBusy}
                        className={`flex items-start gap-3 rounded-2xl border bg-gradient-to-br ${style.color} ${style.border} px-4 py-4 text-left text-sm text-[var(--text-dark)] transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-pointer ${isBusy ? "opacity-50 cursor-not-allowed" : ""}`}
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
                disabled={isBusy}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                placeholder={isBusy ? "waiting for response..." : "how are you feeling?"}
                rows={1}
                className={`flex-1 min-h-12 max-h-36 resize-none rounded-2xl border border-black/10 bg-[var(--white)] px-4 py-3 text-sm text-[var(--text-dark)] outline-none placeholder:text-[var(--text-muted)] shadow-sm focus:ring-2 focus:ring-[var(--primary)] ${isBusy ? "opacity-50 cursor-not-allowed" : ""}`}
              />
              <button
                type="submit"
                disabled={isBusy}
                className={`rounded-xl bg-[var(--primary)] px-4 py-2 text-sm text-white hover:bg-[var(--primary-hover)] ${isBusy ? "opacity-50 cursor-not-allowed" : ""}`}
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
