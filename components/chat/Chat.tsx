'use client';
import Container from "@/components/Container";
import Link from "next/link";
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
      <Container className="py-16">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <div className="text-sm tracking-[0.2em] text-zinc-400">Conversation</div>
            <h1 className="mt-1 text-3xl font-semibold">Chat with Your Avatar</h1>
            <p className="mt-2 text-zinc-300">Voice and text conversation. Dummy responses with media for now.</p>
          </div>
          <Link
            href="/"
            className="rounded-full bg-white/10 px-4 py-2 text-sm backdrop-blur ring-1 ring-white/25 hover:bg-white/14"
          >
            Back to Home
          </Link>
        </div>

        <div className="grid gap-6 sm:grid-cols-[1fr_340px]">
          <div className="rounded-2xl bg-white/8 p-4 backdrop-blur ring-1 ring-white/25">
            <div ref={scrollRef} className="mb-4 h-[48vh] overflow-y-auto rounded-lg bg-white/4 p-4 ring-1 ring-white/15">
              {messages.map(message => (
                <div
                  key={message.id}
                  className={
                    message.role === "user"
                      ? "mb-3 text-right"
                      : message.role === "assistant"
                      ? "mb-3"
                      : "mb-3 text-center text-xs text-zinc-400"
                  }
                >
                  <div
                    className={
                      message.role === "user"
                        ? "inline-block max-w-[72ch] rounded-2xl bg-cyan-400/30 px-4 py-2 text-zinc-50 ring-1 ring-white/20"
                        : message.role === "assistant"
                        ? "inline-block max-w-[72ch] rounded-2xl bg-white/8 px-4 py-2 text-zinc-100 backdrop-blur ring-1 ring-white/20"
                        : ""
                    }
                  >
                    {message.parts.map((part, i) => {
                      console.log("Rendering part:", message);
                      // switch (part.type) {
                      //   case 'text':
                      //     return <div key={`${message.id}-${i}`} dangerouslySetInnerHTML={{ __html: part.text }}/>;
                      //   case 'tool-output-available':
                      //     return (
                      //     <div key={`${message.id}-${i}`} className="overflow-hidden rounded-xl ring-1 ring-white/15">
                      //       <ReactPlayer oEmbedUrl={part.url} width="100%" height="180px" controls />
                      //     </div>
                      //     );
                      // }
                      if (part.type === 'text') {
                        return <div key={`${message.id}-${i}`} dangerouslySetInnerHTML={{ __html: part.text }} />;
                      }

                      // Render video parts (tool results)
                      if (part.type === 'tool-fetchVideos') {
                        return part.output?.map((video: any, j: number) => (
                          <div key={`${message.id}-${i}-${j}`} className="overflow-hidden rounded-xl ring-1 ring-white/15 my-2">
                            <ReactPlayer
                              url={video.url}
                              width="100%"
                              height="180px"
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
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="h-10 w-10 rounded-full bg-white/10 text-xl backdrop-blur ring-1 ring-white/25"
                title="Toggle microphone"
              >
                🎙️
              </button>
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Type a message"
                className="flex-1 rounded-full bg-white/8 px-4 py-2 text-sm text-zinc-100 outline-none backdrop-blur ring-1 ring-white/25 placeholder:text-zinc-400"
              />
              <button
                type="button"
                onClick={send}
                className="rounded-full bg-cyan-500/80 px-4 py-2 text-sm text-black ring-1 ring-white/20 hover:bg-cyan-400"
              >
                Send
              </button>
            </div>
          </div>

          <div className="rounded-2xl bg-white/8 p-4 backdrop-blur ring-1 ring-white/25">
            <div className="text-sm font-medium">Session</div>
            <div className="mt-2 text-sm text-zinc-300">
              Use voice or text to share what you’re feeling. The avatar will respond with guidance and links.
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs">Podcast</span>
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs">Blogs</span>
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs">Episodes</span>
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
}
