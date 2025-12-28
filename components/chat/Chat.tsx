'use client';
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useChat } from '@ai-sdk/react';

const ReactPlayer = dynamic(() => import("react-player"), { ssr: false });

type Message = {
  role: "system" | "user" | "assistant";
  content: string;
  videos?: string[];
};

export default function Chat() {
  // const [messages, setMessages] = useState<Message[]>([
  //   { role: "system", content: "Welcome. Share how you’re feeling today." },
  // ]);
  const { messages, sendMessage } = useChat();
  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);

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
                  if (part.type === 'text') {
                    return <div key={`${message.id}-${i}`} dangerouslySetInnerHTML={{ __html: part.text }} />;
                  }
                  if (part.type === 'tool-fetchVideos' && Array.isArray(part.output)) {
                    return part.output?.map((video: { url: string; title?: string }, j: number) => (
                      <div key={`${message.id}-${i}-${j}`} className="my-3 overflow-hidden rounded-xl">
                        <ReactPlayer url={video.url} width="100%" height="200px" controls />
                        <div className="mt-1 text-sm text-[var(--text-muted)]">{video.title}</div>
                      </div>
                    ));
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
