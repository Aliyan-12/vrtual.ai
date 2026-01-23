'use client';
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useChat } from '@ai-sdk/react';
import { extractMessage } from '@/lib/utils/helper';

const ReactPlayer = dynamic(() => import("react-player"), { ssr: false });

type Message = {
  role: "system" | "user" | "assistant";
  content: string;
  videos?: string[];
};

type Video = {
  id: string;
  url: string;
  title?: string;
  description?: string;
};

export default function Chat() {
  // const [messages, setMessages] = useState<Message[]>([
  //   { role: "system", content: "Welcome. Share how you’re feeling today." },
  // ]);
  const { messages, sendMessage } = useChat();
  const [text, setText] = useState("");
  const [videos, setVideos] = useState<Video[]>([]);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const collected: Video[] = [];

    messages.forEach(message => {
      message.parts.forEach(part => {
        if (
          part.type === 'tool-fetchVideos' &&
          Array.isArray(part.output)
        ) {
          collected.push(...part.output);
        }
      });
    });

    const uniqueVideos = Array.from(
      new Map(collected.map(v => [v.id, v])).values()
    );

    setVideos(collected);
    console.log(videos);
  }, [messages]);

  function send() {
    const t = text.trim();
    if (!t) return;
    sendMessage({ text: t });
    // const userMsg: Message = { role: "user", content: t };
    // const assistantMsg: Message = {
    //   role: "assistant",
    //   content:
    //     "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Tell me more about how that feels.",
    //   videos: [
    //     "https://www.youtube.com/watch?v=ysz5S6PUM-U",
    //     "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    //   ],
    // };
    // setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setText("");
  }

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[var(--primary-light)] via-[var(--white)] to-[var(--white)] text-[var(--text-dark)]">
      <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-4 sm:px-6 py-6 sm:py-8">
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto pb-20"
        >
          {/* {messages.map(message => (
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
                    if (
                      part.text.includes('fetchVideos') ||
                      part.text.includes('function=') ||
                      part.text.includes('help you find')
                    ) {
                      return null;
                    }

                    return (
                      <div
                        key={`${message.id}-${i}`}
                        dangerouslySetInnerHTML={{ __html: extractMessage(part.text), }}
                      />
                    );
                  }

                  return null;
                })}
              </div>
            </div>
          ))} */}
          {/* {videos.length > 0 && (
            <div className="mt-6 space-y-4">
              {videos.map((video, i) => (
                <div
                  key={video.id ?? i}
                  className="overflow-hidden rounded-xl bg-white ring-1 ring-black/10"
                >
                  <ReactPlayer
                    src={video.url}
                    width="100%"
                    height="200px"
                    controls
                  />

                  {video.title && (
                    <div className="px-3 py-2 text-sm text-[var(--text-muted)]">
                      {video.title}
                    </div>
                  )}

                  {video.description && (
                    <div className="px-3 pb-3 text-xs text-[var(--text-muted)]">
                      {video.description}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )} */}
          {messages.map(message => (
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
                  // console.log(message, part);
                  if (part.type === 'text') {
                    return <div key={`${message.id}-${i}`} dangerouslySetInnerHTML={{ __html: part.text }} />;
                  }
                  if (part.type === 'tool-fetchVideos' && Array.isArray(part.output)) {
                    return part.output?.map((video: { url: string; title?: string; selectedSection?: {startSeconds: number, reason: string}; startUrl?: string }, j: number) => {
                      const videoSrc = video.selectedSection
                          ? video.startUrl
                          : video.url;
                      return (
                        <div key={`${message.id}-${i}-${j}`} className="my-3 overflow-hidden rounded-xl">
                          <ReactPlayer src={videoSrc} width="100%" height="200px" controls 
                          config={{
                            youtube: {
                              start: video.selectedSection?.startSeconds ?? 0
                            }
                          }}/>
                          <div className="mt-1 text-sm text-[var(--text-muted)]">{video.title}</div>
                        </div>
                      );
                    });
                  }
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="sticky bottom-0">
          <div className=" pb-4 pt-2">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send();
              }}
              className="flex items-end gap-3"
            >
              <button
                type="button"
                className="h-10 w-10 rounded-full bg-[var(--primary-light)] text-xl ring-1 ring-[var(--primary)]"
                title="Toggle microphone"
              >
                🎙️
              </button>
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
