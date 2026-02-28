"use client";

function playClickSound() {
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
}

type MicButtonProps = {
  recording: boolean;
  onToggle: () => void;
};

export default function MicButton({ recording, onToggle }: MicButtonProps) {
  function handleClick() {
    playClickSound();
    onToggle();
  }

  return (
    <button
      onClick={handleClick}
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
