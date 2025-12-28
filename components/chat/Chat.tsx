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
    <div className="min-h-screen bg-gradient-to-br from-black via-zinc-900 to-black text-zinc-50">
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
                  : "mb-4 text-center text-xs text-zinc-400"
              }
            >
              <div
                className={
                  message.role === "user"
                    ? "inline-block max-w-[72ch] rounded-2xl bg-cyan-500/15 px-4 py-2 text-zinc-50"
                    : message.role === "assistant"
                    ? "inline-block max-w-[72ch] rounded-2xl bg-white/5 px-4 py-2 text-zinc-100"
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
                        <ReactPlayer
                          src={video.url}
                          width="100%"
                          height="200px"
                          controls
                        />
                        <div className="mt-1 text-sm text-zinc-200">{video.title}</div>
                      </div>
                    ));
                  }
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="sticky bottom-0">
          <div className="bg-gradient-to-t from-black/70 to-transparent pb-4 pt-2">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send();
              }}
              className="flex items-center gap-2"
            >
              <button
                type="button"
                className="h-10 w-10 rounded-full bg-white/10 text-xl backdrop-blur"
                title="Toggle microphone"
              >
                🎙️
              </button>
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Type a message"
                className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-400"
              />
              <button
                type="submit"
                className="rounded-xl bg-cyan-500/80 px-4 py-2 text-sm text-black hover:bg-cyan-400"
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
