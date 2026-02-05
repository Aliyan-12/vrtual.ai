'use client';
import 'dotenv/config';
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useChat } from '@ai-sdk/react';
import { convertTextToSpeech } from '@/lib/utils/helper';

const ReactPlayer = dynamic(() => import("react-player"), { ssr: false });

export default function Chat() {
  const { messages, sendMessage } = useChat({
    onFinish: async (response) => {
      try {
        const fullText = response.message.parts
                      .filter(p => p.type === "text")
                      .map(p => p.text)
                      .join(" ");
        const audioResponse = await fetch(`/api/voice`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: fullText })
        });

        if(!audioResponse.ok) {
          console.error("Voice conversion unknown error:", audioResponse.text());
        }

        const data = await audioResponse.json();
        const audio = new Audio(data.filepath);
        await audio.play();
      } catch (err) {
        console.error("Voice conversion error:", err);
      }
    }
  });
  
  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [loading, setLoading] = useState(false);

  function pcmToWav(pcmData: Uint8Array, sampleRate = 24000, numChannels = 1) {
    const blockAlign = numChannels * 2;
    const byteRate = sampleRate * blockAlign;
    const wavBuffer = new ArrayBuffer(44 + pcmData.length);
    const view = new DataView(wavBuffer);

    // RIFF header
    writeString(view, 0, "RIFF");
    view.setUint32(4, 36 + pcmData.length, true);
    writeString(view, 8, "WAVE");

    // fmt chunk
    writeString(view, 12, "fmt ");
    view.setUint32(16, 16, true); // chunk size
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, 16, true); // 16-bit samples

    // data chunk
    writeString(view, 36, "data");
    view.setUint32(40, pcmData.length, true);

    // PCM samples
    new Uint8Array(wavBuffer, 44).set(pcmData);

    return new Blob([wavBuffer], { type: "audio/wav" });
  }

  function writeString(view: any, offset: any, str: any) {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  }

  function swap16(pcm: any) {
    const out = new Uint8Array(pcm.length);
    for (let i = 0; i < pcm.length; i += 2) {
      out[i] = pcm[i + 1];
      out[i + 1] = pcm[i];
    }
    return out;
  }

  async function speak(text: string) {
    setLoading(true);

    const res = await fetch("/api/voice", {
      method: "POST",
      body: JSON.stringify({ text }),
    });
    
    const data = await res.json();

    console.log(data.filename);

    const audio = new Audio(`/${data.filename}.${data.mimeType}`);
    audio.play();

    const reader = res.body!.getReader();
    // console.log(await reader.read());
    const decoder = new TextDecoder();

    let buffer: Uint8Array[] = [];

    while (true) {
      const { value, done } = await reader.read();
      // console.log(value);
      if (done) break;
    
      // const swapped = swap16(value);  // FIX FOR DISTORTION
      // const wavBlob = pcmToWav(swapped, 24000, 1);
      // const url = URL.createObjectURL(wavBlob);

      // console.log(wavBlob);
      // console.log(url);

      // const audio = new Audio(url);
      // audio.play();
    }

    setLoading(false);
  }

  async function send() {
    const t = text.trim();
    if (!t) return;
    sendMessage({ text: t });
    setText("");
  }

  async function handleSendMessage() {
    if (!text.trim()) return;
    
    setLoading(true);
    
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          messages: [...messages, { role: 'user', content: text }]
        }),
      });
      
      // Get headers from the response
      const audioFile = response.headers.get("x-audio-file");
      const audioMime = response.headers.get("x-audio-mime");
      
      if (audioFile && audioMime) {
        console.log("Headers received:", { audioFile, audioMime });
        
        // Store for later use
        
        // Play the audio if needed
        const audio = new Audio(`/${audioFile}`);
        audio.play();
      }
      
      // Process the stream
      if (!response.body) throw new Error('No response body');
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let content = '';
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data:')) {
            try {
              const data = JSON.parse(line.slice(5));
              if (data.type === 'text-delta') {
                content += data.textDelta;
                // Update UI with streaming text
              }
            } catch (e) {
              // Ignore parse errors
            }
          }
        }
      }    
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setLoading(false);
      setText('');
    }
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
                    return part.output?.map((video: { id: string, url: string, title?: string, description?: string, thumbnail?: string, selectedSection?: { startSeconds: number, reason: string }, startUrl?: string, embedUrl?: string }, j: number) => {
                      return video.embedUrl ? (
                        <div key={`${message.id}-${i}-${j}`} className="my-3 overflow-hidden rounded-xl">
                          <iframe width={'100%'} height={'200px'} src={video.embedUrl} ></iframe>
                          <div key={`${message.id}-${i}-${j}`} className="mt-1 text-sm text-[var(--text-muted)]">{video.title}</div>
                        </div>
                      ) : (
                        <div key={`${message.id}-${i}-${j}`} className="my-3 overflow-hidden rounded-xl">
                          <ReactPlayer src={video.url} width="100%" height="200px" controls />
                          <div key={`${message.id}-${i}-${j}`} className="mt-1 text-sm text-[var(--text-muted)]">{video.title}</div>
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
              {/* <button onClick={async () => {
                  if (!text.trim()) return;

                  const res = await fetch("/api/voice", {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ text }),
                  });

                  const data = await res.json();
                  if (!data) return;

                  const url = URL.createObjectURL(data.audio);
                  const audioPlayer = new Audio(url);
                  audioPlayer.play();
                }}
                type="button"
                className="h-10 w-10 rounded-full bg-[var(--primary-light)] text-xl ring-1 ring-[var(--primary)]"
                title="Toggle microphone"
              >
                🎙️
              </button> */}
              <button onClick={() => {}}
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
