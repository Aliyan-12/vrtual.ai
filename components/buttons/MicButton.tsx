"use client";
import { useMicrophone } from "@/lib/hooks/useMicrophone";

export default function MicButton() {
  const {
    connect,
    startRecording,
    stopRecording,
    connected,
    recording,
  } = useMicrophone();

  async function handleMicClick() {
    if (!connected) await connect();
    if (recording) stopRecording();
    else startRecording();
  }

  return (
    <button
      onClick={handleMicClick}
      type="button"
      className={`h-10 w-10 rounded-full text-xl ring-1 ring-[var(--primary)]
        ${recording ? "bg-red-500 text-white animate-pulse" : "bg-[var(--primary-light)]"}
      `}
      title="Toggle microphone"
    >
      🎙️
    </button>
  );
}