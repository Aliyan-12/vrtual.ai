'use client';
import { useEffect, useRef, useMemo, Suspense } from "react";
import { Canvas, useFrame, useGraph } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { SkeletonUtils } from "three-stdlib";
import * as THREE from "three";

// Oculus viseme IDs mapped to morph target names
const VISEME_MAP: Record<number, string> = {
  0: "viseme_sil",
  1: "viseme_PP",
  2: "viseme_FF",
  3: "viseme_TH",
  4: "viseme_DD",
  5: "viseme_kk",
  6: "viseme_CH",
  7: "viseme_SS",
  8: "viseme_nn",
  9: "viseme_RR",
  10: "viseme_aa",
  11: "viseme_E",
  12: "viseme_I",
  13: "viseme_O",
  14: "viseme_U",
};

const LERP_SPEED = 0.4;
const BLINK_INTERVAL_MIN = 2000;
const BLINK_INTERVAL_MAX = 6000;
const BLINK_DURATION = 150;

interface AvatarProps {
  isSpeaking: boolean;
  isListening: boolean;
  isThinking: boolean;
  audioRef: React.RefObject<HTMLAudioElement | null>;
}

function AvatarModel({ isSpeaking, audioRef }: { isSpeaking: boolean; audioRef: React.RefObject<HTMLAudioElement | null> }) {
  const group = useRef<THREE.Group>(null);
  const { scene } = useGLTF("/3d-avatar/Aurora.glb");
  const clone = useMemo(() => SkeletonUtils.clone(scene), [scene]);
  const { nodes } = useGraph(clone);

  // Refs for morph target meshes
  const headMesh = useRef<THREE.SkinnedMesh | null>(null);
  const teethMesh = useRef<THREE.SkinnedMesh | null>(null);
  const eyeLeftMesh = useRef<THREE.SkinnedMesh | null>(null);
  const eyeRightMesh = useRef<THREE.SkinnedMesh | null>(null);

  // Audio analysis
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataRef = useRef<Uint8Array | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const connectedAudioRef = useRef<HTMLAudioElement | null>(null);

  // Animation state
  const timeRef = useRef(0);
  const currentVisemeRef = useRef<number[]>(new Array(15).fill(0));
  const targetVisemeRef = useRef<number[]>(new Array(15).fill(0));
  const nextBlinkRef = useRef(Date.now() + 3000);
  const blinkProgressRef = useRef(0);

  // Grab mesh references
  useEffect(() => {
    const head = nodes["Wolf3D_Head"] as THREE.SkinnedMesh;
    const teeth = nodes["Wolf3D_Teeth"] as THREE.SkinnedMesh;
    const eyeL = nodes["EyeLeft"] as THREE.SkinnedMesh;
    const eyeR = nodes["EyeRight"] as THREE.SkinnedMesh;

    if (head?.morphTargetDictionary && head?.morphTargetInfluences) headMesh.current = head;
    if (teeth?.morphTargetDictionary && teeth?.morphTargetInfluences) teethMesh.current = teeth;
    if (eyeL?.morphTargetDictionary && eyeL?.morphTargetInfluences) eyeLeftMesh.current = eyeL;
    if (eyeR?.morphTargetDictionary && eyeR?.morphTargetInfluences) eyeRightMesh.current = eyeR;
  }, [nodes]);

  // Connect audio analyser
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || audio === connectedAudioRef.current) return;

    const connectAnalyser = () => {
      try {
        if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
        const ctx = audioCtxRef.current;
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.6;
        analyserRef.current = analyser;
        dataRef.current = new Uint8Array(analyser.frequencyBinCount);

        const source = ctx.createMediaElementSource(audio);
        source.connect(analyser);
        analyser.connect(ctx.destination);
        connectedAudioRef.current = audio;
      } catch { /* already connected */ }
    };

    audio.addEventListener("play", connectAnalyser, { once: true });
    return () => audio.removeEventListener("play", connectAnalyser);
  }, [audioRef.current]);

  // Set morph target on a mesh
  function setMorphTarget(mesh: THREE.SkinnedMesh | null, name: string, value: number) {
    if (!mesh?.morphTargetDictionary || !mesh?.morphTargetInfluences) return;
    const idx = mesh.morphTargetDictionary[name];
    if (idx !== undefined) {
      mesh.morphTargetInfluences[idx] = value;
    }
  }

  // Get audio energy from frequency bands
  function getFrequencyEnergy(): number[] {
    if (!analyserRef.current || !dataRef.current) return new Array(15).fill(0);
    analyserRef.current.getByteFrequencyData(dataRef.current as Uint8Array<ArrayBuffer>);

    const data = dataRef.current;
    const bandSize = Math.floor(data.length / 15);
    const energies: number[] = [];

    for (let i = 0; i < 15; i++) {
      let sum = 0;
      for (let j = i * bandSize; j < (i + 1) * bandSize && j < data.length; j++) {
        sum += data[j];
      }
      energies.push(sum / (bandSize * 255));
    }
    return energies;
  }

  useFrame((_, delta) => {
    if (!group.current) return;
    timeRef.current += delta;
    const t = timeRef.current;

    // ── Viseme lip sync ──
    if (isSpeaking && connectedAudioRef.current) {
      const energies = getFrequencyEnergy();

      // Map frequency bands to viseme targets with weighting
      const newTargets = new Array(15).fill(0);

      // Low frequencies → PP, FF (lip-related)
      newTargets[1] = Math.min(energies[0] * 2, 1); // PP
      newTargets[2] = Math.min(energies[1] * 1.8, 1); // FF

      // Low-mid → TH, DD
      newTargets[3] = Math.min(energies[2] * 1.5, 1); // TH
      newTargets[4] = Math.min(energies[3] * 1.5, 1); // DD

      // Mid → kk, CH, SS
      newTargets[5] = Math.min(energies[4] * 1.3, 1); // kk
      newTargets[6] = Math.min(energies[5] * 1.3, 1); // CH
      newTargets[7] = Math.min(energies[6] * 1.5, 1); // SS

      // Mid-high → nn, RR
      newTargets[8] = Math.min(energies[7] * 1.2, 1); // nn
      newTargets[9] = Math.min(energies[8] * 1.2, 1); // RR

      // Vowels from overall energy
      const overallEnergy = energies.reduce((a, b) => a + b, 0) / energies.length;
      newTargets[10] = Math.min(overallEnergy * 2.5, 1); // aa
      newTargets[11] = Math.min(energies[9] * 2, 1); // E
      newTargets[12] = Math.min(energies[10] * 1.8, 1); // I
      newTargets[13] = Math.min(energies[11] * 2, 1); // O
      newTargets[14] = Math.min(energies[12] * 1.5, 1); // U

      // Find dominant viseme and boost it
      let maxIdx = 0;
      let maxVal = 0;
      for (let i = 1; i < 15; i++) {
        if (newTargets[i] > maxVal) { maxVal = newTargets[i]; maxIdx = i; }
      }
      // Suppress non-dominant visemes for cleaner look
      for (let i = 1; i < 15; i++) {
        if (i !== maxIdx) newTargets[i] *= 0.3;
      }
      newTargets[maxIdx] = Math.min(newTargets[maxIdx] * 1.2, 1);

      targetVisemeRef.current = newTargets;
    } else if (isSpeaking) {
      // Fallback: cycle through visemes when audio not connected
      const cycle = [10, 11, 13, 12, 10, 14, 1, 11]; // aa, E, O, I, aa, U, PP, E
      const idx = cycle[Math.floor(t * 6) % cycle.length];
      const newTargets = new Array(15).fill(0);
      newTargets[idx] = 0.7;
      targetVisemeRef.current = newTargets;
    } else {
      // Return to silence
      targetVisemeRef.current = new Array(15).fill(0);
    }

    // Lerp current visemes toward targets
    for (let i = 0; i < 15; i++) {
      currentVisemeRef.current[i] = THREE.MathUtils.lerp(
        currentVisemeRef.current[i],
        targetVisemeRef.current[i],
        isSpeaking ? LERP_SPEED : 0.15
      );
    }

    // Apply visemes to head and teeth meshes
    for (let i = 0; i < 15; i++) {
      const name = VISEME_MAP[i];
      const value = currentVisemeRef.current[i];
      setMorphTarget(headMesh.current, name, value);
      setMorphTarget(teethMesh.current, name, value);
    }

    // JawOpen driven by overall mouth openness
    const jawValue = Math.max(
      currentVisemeRef.current[10], // aa
      currentVisemeRef.current[13], // O
      currentVisemeRef.current[14], // U
    ) * 0.6;
    setMorphTarget(headMesh.current, "jawOpen", jawValue);
    setMorphTarget(teethMesh.current, "jawOpen", jawValue);

    // ── Eye blinking ──
    const now = Date.now();
    if (now > nextBlinkRef.current) {
      blinkProgressRef.current = 1;
      nextBlinkRef.current = now + BLINK_INTERVAL_MIN + Math.random() * (BLINK_INTERVAL_MAX - BLINK_INTERVAL_MIN);
    }
    if (blinkProgressRef.current > 0) {
      blinkProgressRef.current = Math.max(0, blinkProgressRef.current - delta * (1000 / BLINK_DURATION));
    }
    const blinkValue = blinkProgressRef.current > 0.5 ? (1 - blinkProgressRef.current) * 2 : blinkProgressRef.current * 2;
    setMorphTarget(headMesh.current, "eyeBlinkLeft", blinkValue);
    setMorphTarget(headMesh.current, "eyeBlinkRight", blinkValue);
    setMorphTarget(eyeLeftMesh.current, "eyeBlinkLeft", blinkValue);
    setMorphTarget(eyeRightMesh.current, "eyeBlinkRight", blinkValue);

    // ── Subtle head movement ──
    const breathe = Math.sin(t * 1.2) * 0.003;
    const headNod = isSpeaking ? Math.sin(t * 2) * 0.02 : 0;
    const headSway = Math.sin(t * 0.8) * 0.01;

    group.current.rotation.x = THREE.MathUtils.lerp(group.current.rotation.x, headNod, 0.1);
    group.current.rotation.y = THREE.MathUtils.lerp(group.current.rotation.y, headSway, 0.08);
    group.current.position.y = THREE.MathUtils.lerp(group.current.position.y, breathe * 0.5, 0.1);
  });

  return (
    <group ref={group}>
      <primitive object={clone} />
    </group>
  );
}

// Preload the model
useGLTF.preload("/3d-avatar/Aurora.glb");

export default function ChatAvatar({ isSpeaking, isListening, isThinking, audioRef }: AvatarProps) {
  return (
    <div className="w-full flex flex-col items-center">
      <div className="relative w-full h-[80vh]">
        <Canvas
          camera={{ position: [0, 1.55, 2.2], fov: 30 }}
          gl={{ antialias: true, alpha: true, powerPreference: "default" }}
          style={{ background: "transparent" }}
          frameloop="always"
          onCreated={({ gl, camera }) => {
            gl.domElement.addEventListener("webglcontextlost", (e) => e.preventDefault());
            camera.lookAt(0, 1.2, 0);
          }}
        >
          <ambientLight intensity={0.9} />
          <directionalLight position={[1, 2, 2]} intensity={1.2} />
          <directionalLight position={[-1, 1, 1]} intensity={0.4} />
          <Suspense fallback={null}>
            <AvatarModel isSpeaking={isSpeaking} audioRef={audioRef} />
          </Suspense>
        </Canvas>

        {/* Listening indicator */}
        {isListening && !isSpeaking && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
            {[0, 1, 2].map(i => (
              <span key={i} className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
            ))}
          </div>
        )}
      </div>
      <p className="text-xs text-[var(--text-muted)] mt-1 text-center">
        {isSpeaking ? "Speaking..." : isThinking ? "Thinking..." : isListening ? "Listening..." : "Dr. Erik Fisher"}
      </p>
    </div>
  );
}