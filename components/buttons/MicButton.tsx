"use client";

import type { ConnectionStatus } from "@/types";

function playClickSound() {
  try {
    const ctx = new AudioContext();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(880, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.1);
  } catch {
  }
}

type MicButtonProps = {
  recording: boolean;
  connectionStatus: ConnectionStatus;
  onToggle: () => void;
};

export default function MicButton({ recording, connectionStatus, onToggle }: MicButtonProps) {
  const isLoading = connectionStatus === "connecting" || connectionStatus === "reconnecting";

  function handleClick() {
    if (isLoading) return;
    playClickSound();
    onToggle();
  }

  return (
    <button
      onClick={handleClick}
      type="button"
      disabled={isLoading}
      className={`h-10 w-10 rounded-full text-xl ring-1 ring-[var(--primary)] transition-all duration-200
        ${isLoading ? "bg-amber-100 cursor-wait opacity-70" : ""}
        ${recording ? "bg-red-500 text-white animate-pulse" : ""}
        ${!recording && !isLoading ? "bg-[var(--primary-light)]" : ""}
      `}
      title={isLoading ? "Connecting..." : recording ? "Stop recording" : "Start recording"}
    >
      {isLoading ? (
        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-amber-600 border-t-transparent" />
      ) : (
        "🎙️"
      )}
    </button>
  );
}
