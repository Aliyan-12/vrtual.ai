'use client';
import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import gsap from "gsap";
import Link from "next/link";
import AvatarModel from "@/components/hero/AvatarModel";

const moodColors: Record<string, string> = {
  calm: "#67e8f9",
  anxious: "#a78bfa",
  overwhelmed: "#f472b6",
};


function ParticleField({ cursorRef }: { cursorRef: React.MutableRefObject<{ x: number; y: number }> }) {
  const group = useRef<THREE.Group | null>(null);
  const positions = useMemo(() => {
    const count = 600;
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = 6 * Math.random();
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      arr[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      arr[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      arr[i * 3 + 2] = r * Math.cos(phi);
    }
    return arr;
  }, []);
  useFrame(() => {
    if (!group.current) return;
    group.current.rotation.y += 0.0008;
    const c = cursorRef.current;
    group.current.position.x = c.x * 0.2;
    group.current.position.y = c.y * 0.1;
  });
  return (
    <group ref={group}>
      <points>
        <bufferGeometry>
          {positions && (
            <bufferAttribute attach="attributes-position" args={[positions, 3]} />
          )}
        </bufferGeometry>
        <pointsMaterial size={0.02} color="#94a3b8" opacity={0.5} transparent />
      </points>
    </group>
  );
}

export default function Hero() {
  const [mood, setMood] = useState<"calm" | "anxious" | "overwhelmed">("calm");
  const cursor = useRef({ x: 0, y: 0 });
  const cursorDot = useRef<HTMLDivElement | null>(null);
  const bgAurora = useRef<HTMLDivElement | null>(null);
  const cyanRef = useRef<HTMLDivElement | null>(null);
  const violetRef = useRef<HTMLDivElement | null>(null);
  const pinkRef = useRef<HTMLDivElement | null>(null);
  const micRef = useRef<HTMLButtonElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const audioCtx = useRef<AudioContext | null>(null);
  const gain = useRef<GainNode | null>(null);

  useEffect(() => {
    if (!micRef.current) return;
    gsap.to(micRef.current, { boxShadow: "0 0 40px 10px rgba(103,232,249,0.35)", repeat: -1, duration: 2, yoyo: true });
  }, []);

  function ensureAudio() {
    if (audioCtx.current) return;
    const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return;
    audioCtx.current = new Ctx();
    // const osc = audioCtx.current.createOscillator();
    // gain.current = audioCtx.current.createGain();
    // osc.type = "sine";
    // osc.frequency.value = 140;
    // gain.current.gain.value = 0.0008;
    // osc.connect(gain.current);
    // gain.current.connect(audioCtx.current.destination);
    // osc.start();s
    // gsap.to(gain.current.gain, { value: 0.0016, duration: 2.4, repeat: -1, yoyo: true, ease: "sine.inOut" });
  }

  function onMove(e: React.MouseEvent<HTMLDivElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 2 - 1;
    const y = -(((e.clientY - r.top) / r.height) * 2 - 1);
    cursor.current.x = x;
    cursor.current.y = y;
    if (cursorDot.current) {
      cursorDot.current.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
    }
    if (bgAurora.current) {
      gsap.to(bgAurora.current, { x: x * 20, y: y * 20, duration: 0.6, ease: "sine.out" });
    }
  }

  function onMicHover() {
    ensureAudio();
    if (!micRef.current) return;
    gsap.to(micRef.current, { scale: 1.08, duration: 0.3, ease: "sine.out" });
  }

  function onMicLeave() {
    if (!micRef.current) return;
    gsap.to(micRef.current, { scale: 1, duration: 0.3, ease: "sine.out" });
  }

  function onFocusInput() {
    ensureAudio();
    if (!inputRef.current) return;
    gsap.to(inputRef.current, { maxWidth: "36rem", duration: 0.3, ease: "sine.out" });
  }

  function onBlurInput() {
    if (!inputRef.current) return;
    gsap.to(inputRef.current, { maxWidth: "28rem", duration: 0.3, ease: "sine.out" });
  }

  useEffect(() => {
    const refs = [
      { ref: cyanRef, active: mood === "calm" },
      { ref: violetRef, active: mood === "anxious" },
      { ref: pinkRef, active: mood === "overwhelmed" },
    ];
    refs.forEach(({ ref, active }) => {
      if (!ref.current) return;
      gsap.to(ref.current, {
        opacity: active ? 0.28 : 0.16,
        duration: 0.6,
        ease: "sine.out",
      });
    });
  }, [mood]);

  return (
    <section className="relative min-h-[80vh] sm:h-screen overflow-hidden bg-gradient-to-br from-[var(--primary-light)] via-[var(--white)] to-[var(--white)] text-[var(--text-dark)] sm:cursor-none">
      <div ref={bgAurora} className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--primary-light)] via-[var(--white)] to-[var(--white)]" />
        <div ref={cyanRef} className="absolute -top-40 left-1/3 h-[60vh] w-[60vw] rounded-full bg-[var(--accent)] blur-3xl opacity-20" />
        <div ref={violetRef} className="absolute top-1/2 -left-20 h-[50vh] w-[50vw] rounded-full bg-[var(--secondary)] blur-3xl opacity-20" />
        <div ref={pinkRef} className="absolute bottom-0 right-0 h-[55vh] w-[55vw] rounded-full bg-[var(--pink)] blur-3xl opacity-20" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.04),rgba(0,0,0,0)_60%)]" />
      </div>

      <div className="absolute inset-0">
        <Canvas camera={{ position: [0, 0, 5], fov: 45 }}>
          <ambientLight intensity={0.6} />
          <pointLight position={[5, 5, 5]} intensity={1.2} color="#ffffff" />
          <ParticleField cursorRef={cursor} />
          <AvatarModel mood={mood} cursorRef={cursor} />
        </Canvas>
      </div>

      <div
        className="absolute inset-0 flex flex-col items-center justify-center text-center"
        onMouseMove={onMove}
        onMouseEnter={ensureAudio}
      >
        <div className="select-none text-xs sm:text-sm tracking-[0.2em] text-[var(--text-muted)]">AI Emotional Support</div>
        <h1 className="mt-4 text-3xl sm:text-5xl font-semibold tracking-wide">You don’t have to carry it alone.</h1>
        <p className="mt-4 max-w-2xl px-4 sm:px-0 text-base sm:text-lg text-[var(--text-muted)]">
          An emotionally intelligent AI that listens, understands, and supports you — privately and without judgment.
        </p>

        <div className="mt-8 flex items-center gap-3 sm:gap-4 px-4 sm:px-0">
          <button
            ref={micRef}
            onMouseEnter={onMicHover}
            onMouseLeave={onMicLeave}
            className="relative h-12 w-12 rounded-full bg-[var(--primary-light)] ring-1 ring-[var(--primary)]"
            title="Talk"
          >
            <span className="absolute inset-0 rounded-full ring-2 ring-[var(--primary)]/50" />
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-xl">🎙️</span>
          </button>

          <input
            ref={inputRef}
            onFocus={onFocusInput}
            onBlur={onBlurInput}
            placeholder="Tell me what’s on your mind…"
            className="w-full max-w-[28rem] sm:max-w-[32rem] md:max-w-[36rem] rounded-2xl border border-black/10 bg-[var(--white)] px-4 sm:px-6 py-3 text-[var(--text-dark)] outline-none transition-all placeholder:text-[var(--text-muted)]"
          />
        </div>

        <div className="mt-10 flex gap-3">
          <button
            onMouseEnter={ensureAudio}
            onClick={() => setMood("calm")}
            className="h-8 w-8 rounded-full bg-[var(--secondary)] opacity-60 ring-1 ring-black/10"
            title="Calm"
          />
          <button
            onMouseEnter={ensureAudio}
            onClick={() => setMood("anxious")}
            className="h-8 w-8 rounded-full bg-[var(--accent)] opacity-60 ring-1 ring-black/10"
            title="Anxious"
          />
          <button
            onMouseEnter={ensureAudio}
            onClick={() => setMood("overwhelmed")}
            className="h-8 w-8 rounded-full bg-[var(--pink)] opacity-60 ring-1 ring-black/10"
            title="Overwhelmed"
          />
        </div>

        <Link href="/chat" className="mt-8 text-sm text-[var(--text-muted)] underline-offset-4 hover:text-[var(--text-dark)]">
          Switch to full conversation
        </Link>
      </div>

      <div ref={cursorDot} className="pointer-events-none absolute z-50 hidden sm:block h-4 w-4 -translate-x-2 -translate-y-2 rounded-full bg-[var(--primary)]/80 shadow-[0_0_40px_8px_rgba(77,168,255,0.25)]" />
    </section>
  );
}
