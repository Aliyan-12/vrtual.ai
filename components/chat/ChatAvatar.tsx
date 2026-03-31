'use client';
import { useEffect, useRef, useMemo, Suspense } from "react";
import { Canvas, useFrame, useGraph } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { SkeletonUtils } from "three-stdlib";
import * as THREE from "three";

const MODEL_PATH = "/3d-avatar/erik_model.glb";

// Oculus viseme IDs → morph target names
const VISEME_MAP: Record<number, string> = {
  0: "viseme_sil", 1: "viseme_PP", 2: "viseme_FF", 3: "viseme_TH",
  4: "viseme_DD", 5: "viseme_kk", 6: "viseme_CH", 7: "viseme_SS",
  8: "viseme_nn", 9: "viseme_RR", 10: "viseme_aa", 11: "viseme_E",
  12: "viseme_I", 13: "viseme_O", 14: "viseme_U",
};

// Meshes that have viseme morph targets
const VISEME_MESHES = ["Head_Mesh", "Teeth_Mesh", "Tongue_Mesh"];
// Meshes that have eye/brow morph targets
const FACE_MESHES = ["Head_Mesh", "Eye_Mesh", "EyeAO_Mesh", "Eyelash_Mesh"];

const LERP = 0.4;
const BONE_LERP = 0.06;

interface AvatarProps {
  isSpeaking: boolean;
  isListening: boolean;
  isThinking: boolean;
  audioRef: React.RefObject<HTMLAudioElement | null>;
}

function AvatarModel({ isSpeaking, isThinking, audioRef }: {
  isSpeaking: boolean; isThinking: boolean; audioRef: React.RefObject<HTMLAudioElement | null>;
}) {
  const group = useRef<THREE.Group>(null);
  const { scene } = useGLTF(MODEL_PATH);
  const clone = useMemo(() => SkeletonUtils.clone(scene), [scene]);
  const { nodes } = useGraph(clone);

  // All meshes with morph targets, keyed by name
  const morphMeshes = useRef<Record<string, THREE.SkinnedMesh>>({});
  // Bones keyed by name
  const bones = useRef<Record<string, THREE.Bone>>({});

  // Audio analysis
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataRef = useRef<Uint8Array | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const connectedAudioRef = useRef<HTMLAudioElement | null>(null);

  // Store default bone rotations from the model
  const defaultRot = useRef<Record<string, THREE.Euler>>({});

  // Animation state
  const tRef = useRef(0);
  const curViseme = useRef(new Array(15).fill(0));
  const tgtViseme = useRef(new Array(15).fill(0));
  const nextBlink = useRef(Date.now() + 2500);
  const blinkProg = useRef(0);
  const eyeTargetX = useRef(0);
  const eyeTargetY = useRef(0);
  const nextGaze = useRef(Date.now() + 1000);

  // Grab all mesh + bone references
  useEffect(() => {
    const meshNames = ["Head_Mesh", "Teeth_Mesh", "Tongue_Mesh", "Eye_Mesh", "EyeAO_Mesh", "Eyelash_Mesh"];
    for (const name of meshNames) {
      const mesh = nodes[name] as THREE.SkinnedMesh;
      if (mesh?.morphTargetDictionary && mesh?.morphTargetInfluences) {
        morphMeshes.current[name] = mesh;
      }
    }

    const boneNames = [
      "Spine", "Spine1", "Spine2", "Neck", "Head",
      "LeftShoulder", "LeftArm", "LeftForeArm", "LeftHand",
      "RightShoulder", "RightArm", "RightForeArm", "RightHand",
      "LeftEye", "RightEye",
    ];
    clone.traverse((child: any) => {
      if (child.isBone && boneNames.includes(child.name)) {
        bones.current[child.name] = child;
        defaultRot.current[child.name] = child.rotation.clone();
      }
    });
  }, [nodes, clone]);

  // Connect audio analyser
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || audio === connectedAudioRef.current) return;
    const connect = () => {
      try {
        if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
        const ctx = audioCtxRef.current;
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.6;
        analyserRef.current = analyser;
        dataRef.current = new Uint8Array(analyser.frequencyBinCount);
        const src = ctx.createMediaElementSource(audio);
        src.connect(analyser);
        analyser.connect(ctx.destination);
        connectedAudioRef.current = audio;
      } catch {}
    };
    audio.addEventListener("play", connect, { once: true });
    return () => audio.removeEventListener("play", connect);
  }, [audioRef.current]);

  // ── Helpers ──

  function setMorph(meshNames: string[], name: string, value: number) {
    for (const mn of meshNames) {
      const mesh = morphMeshes.current[mn];
      if (!mesh?.morphTargetDictionary || !mesh?.morphTargetInfluences) continue;
      const idx = mesh.morphTargetDictionary[name];
      if (idx !== undefined) mesh.morphTargetInfluences[idx] = value;
    }
  }

  function setBone(name: string, x: number, y: number, z: number) {
    const bone = bones.current[name];
    if (bone) bone.rotation.set(x, y, z);
  }

  function lerpBone(name: string, tx: number, ty: number, tz: number, speed = BONE_LERP) {
    const bone = bones.current[name];
    if (!bone) return;
    bone.rotation.x = THREE.MathUtils.lerp(bone.rotation.x, tx, speed);
    bone.rotation.y = THREE.MathUtils.lerp(bone.rotation.y, ty, speed);
    bone.rotation.z = THREE.MathUtils.lerp(bone.rotation.z, tz, speed);
  }

  function getEnergy(): number[] {
    if (!analyserRef.current || !dataRef.current) return new Array(15).fill(0);
    analyserRef.current.getByteFrequencyData(dataRef.current as Uint8Array<ArrayBuffer>);
    const d = dataRef.current;
    const bs = Math.floor(d.length / 15);
    const e: number[] = [];
    for (let i = 0; i < 15; i++) {
      let s = 0;
      for (let j = i * bs; j < (i + 1) * bs && j < d.length; j++) s += d[j];
      e.push(s / (bs * 255));
    }
    return e;
  }

  // ── Main animation loop ──

  useFrame((_, delta) => {
    if (!group.current) return;
    tRef.current += delta;
    const t = tRef.current;
    const now = Date.now();

    // ═══════════════════════════════════
    // LIP SYNC (viseme morph targets)
    // ═══════════════════════════════════
    if (isSpeaking && connectedAudioRef.current) {
      const en = getEnergy();
      const nt = new Array(15).fill(0);
      // Keep values subtle — max 0.6 for natural mouth movement
      nt[1] = Math.min(en[0] * 0.8, 0.5);   // PP
      nt[2] = Math.min(en[1] * 0.7, 0.5);   // FF
      nt[3] = Math.min(en[2] * 0.6, 0.4);   // TH
      nt[4] = Math.min(en[3] * 0.6, 0.4);   // DD
      nt[5] = Math.min(en[4] * 0.5, 0.4);   // kk
      nt[6] = Math.min(en[5] * 0.5, 0.4);   // CH
      nt[7] = Math.min(en[6] * 0.6, 0.4);   // SS
      nt[8] = Math.min(en[7] * 0.5, 0.4);   // nn
      nt[9] = Math.min(en[8] * 0.5, 0.4);   // RR
      const ov = en.reduce((a, b) => a + b, 0) / en.length;
      nt[10] = Math.min(ov * 1.0, 0.6);     // aa
      nt[11] = Math.min(en[9] * 0.8, 0.5);  // E
      nt[12] = Math.min(en[10] * 0.7, 0.5); // I
      nt[13] = Math.min(en[11] * 0.8, 0.5); // O
      nt[14] = Math.min(en[12] * 0.6, 0.5); // U

      // Dominant viseme suppression
      let mi = 0, mv = 0;
      for (let i = 1; i < 15; i++) { if (nt[i] > mv) { mv = nt[i]; mi = i; } }
      for (let i = 1; i < 15; i++) { if (i !== mi) nt[i] *= 0.3; }
      nt[mi] = Math.min(nt[mi], 0.6);
      tgtViseme.current = nt;
    } else if (isSpeaking) {
      // Voice mode fallback
      const c = [10, 11, 13, 12, 10, 14, 1, 11];
      const nt = new Array(15).fill(0);
      nt[c[Math.floor(t * 6) % c.length]] = 0.4;
      tgtViseme.current = nt;
    } else {
      tgtViseme.current = new Array(15).fill(0);
    }

    // Lerp + apply visemes to Head, Teeth, Tongue
    for (let i = 0; i < 15; i++) {
      curViseme.current[i] = THREE.MathUtils.lerp(curViseme.current[i], tgtViseme.current[i], isSpeaking ? LERP : 0.15);
      const name = VISEME_MAP[i];
      setMorph(VISEME_MESHES, name, curViseme.current[i]);
    }

    // jawOpen + mouthOpen driven by vowels — keep subtle
    const jaw = Math.max(curViseme.current[10], curViseme.current[13], curViseme.current[14]) * 0.35;
    setMorph(VISEME_MESHES, "jawOpen", jaw);
    setMorph(VISEME_MESHES, "mouthOpen", jaw * 0.4);

    // Subtle mouth smile while speaking
    if (isSpeaking) {
      const smile = 0.1 + Math.sin(t * 1.5) * 0.05;
      setMorph(["Head_Mesh"], "mouthSmileLeft", smile);
      setMorph(["Head_Mesh"], "mouthSmileRight", smile);
    } else {
      setMorph(["Head_Mesh"], "mouthSmileLeft", THREE.MathUtils.lerp(0.1, 0, 0.05));
      setMorph(["Head_Mesh"], "mouthSmileRight", THREE.MathUtils.lerp(0.1, 0, 0.05));
    }

    // ═══════════════════════════════════
    // EYE BLINKING (all face meshes)
    // ═══════════════════════════════════
    if (now > nextBlink.current) {
      blinkProg.current = 1;
      nextBlink.current = now + 2000 + Math.random() * 4000;
    }
    if (blinkProg.current > 0) blinkProg.current = Math.max(0, blinkProg.current - delta * 7);
    const bv = blinkProg.current > 0.5 ? (1 - blinkProg.current) * 2 : blinkProg.current * 2;
    setMorph(FACE_MESHES, "eyeBlinkLeft", bv);
    setMorph(FACE_MESHES, "eyeBlinkRight", bv);

    // ═══════════════════════════════════
    // EYE GAZE (random micro-saccades)
    // ═══════════════════════════════════
    if (now > nextGaze.current) {
      eyeTargetX.current = (Math.random() - 0.5) * 0.15;
      eyeTargetY.current = (Math.random() - 0.5) * 0.1;
      nextGaze.current = now + 800 + Math.random() * 2000;
    }
    // Apply via eye bones
    const eyeL = bones.current["LeftEye"];
    const eyeR = bones.current["RightEye"];
    if (eyeL) {
      eyeL.rotation.y = THREE.MathUtils.lerp(eyeL.rotation.y, eyeTargetX.current, 0.08);
      eyeL.rotation.x = THREE.MathUtils.lerp(eyeL.rotation.x, eyeTargetY.current, 0.08);
    }
    if (eyeR) {
      eyeR.rotation.y = THREE.MathUtils.lerp(eyeR.rotation.y, eyeTargetX.current, 0.08);
      eyeR.rotation.x = THREE.MathUtils.lerp(eyeR.rotation.x, eyeTargetY.current, 0.08);
    }

    // ═══════════════════════════════════
    // EYEBROW EXPRESSIONS
    // ═══════════════════════════════════
    if (isSpeaking) {
      // Slight brow raise while speaking for expressiveness
      const browUp = 0.15 + Math.sin(t * 2) * 0.08;
      setMorph(FACE_MESHES, "browInnerUp", browUp);
      setMorph(FACE_MESHES, "browOuterUpLeft", browUp * 0.5);
      setMorph(FACE_MESHES, "browOuterUpRight", browUp * 0.5);
    } else if (isThinking) {
      // Furrowed brows while thinking
      setMorph(FACE_MESHES, "browDownLeft", 0.3);
      setMorph(FACE_MESHES, "browDownRight", 0.3);
      setMorph(FACE_MESHES, "browInnerUp", 0.2);
    } else {
      // Relax
      setMorph(FACE_MESHES, "browInnerUp", THREE.MathUtils.lerp(0, 0, 0.05));
      setMorph(FACE_MESHES, "browDownLeft", THREE.MathUtils.lerp(0, 0, 0.05));
      setMorph(FACE_MESHES, "browDownRight", THREE.MathUtils.lerp(0, 0, 0.05));
      setMorph(FACE_MESHES, "browOuterUpLeft", 0);
      setMorph(FACE_MESHES, "browOuterUpRight", 0);
    }

    // ═══════════════════════════════════
    // HEAD + NECK MOVEMENT (bone-based)
    // ═══════════════════════════════════
    const breathe = Math.sin(t * 1.2) * 0.002;
    group.current.position.y = THREE.MathUtils.lerp(group.current.position.y, breathe, 0.1);

    if (isSpeaking) {
      lerpBone("Head", Math.sin(t * 2.2) * 0.04, Math.sin(t * 1.5) * 0.03, Math.sin(t * 1.8) * 0.015, 0.08);
      lerpBone("Neck", Math.sin(t * 1.8) * 0.02, Math.sin(t * 1.2) * 0.02, 0, 0.06);
    } else if (isThinking) {
      lerpBone("Head", 0.08 + Math.sin(t * 0.4) * 0.02, Math.sin(t * 0.5) * 0.04, Math.sin(t * 0.3) * 0.02, 0.04);
      lerpBone("Neck", 0.04, 0, 0, 0.04);
    } else {
      lerpBone("Head", Math.sin(t * 0.6) * 0.01, Math.sin(t * 0.4) * 0.01, 0, 0.04);
      lerpBone("Neck", 0, 0, 0, 0.04);
    }

    // ═══════════════════════════════════
    // ARM / HAND GESTURES (bone-based)
    // ═══════════════════════════════════
    // Helper to get default rotation for a bone
    const def = (name: string) => defaultRot.current[name] || new THREE.Euler(0, 0, 0);

    if (isThinking) {
      // Subtle right hand lift — small offset from default, not a full chin pose
      const rd = def("RightArm");
      lerpBone("RightArm", rd.x - 0.3, rd.y + 0.15, rd.z, 0.03);
      const rfd = def("RightForeArm");
      lerpBone("RightForeArm", rfd.x, rfd.y - 0.5, rfd.z, 0.03);
      // Left stays at default
      const ld = def("LeftArm");
      lerpBone("LeftArm", ld.x, ld.y, ld.z, 0.03);
      const lfd = def("LeftForeArm");
      lerpBone("LeftForeArm", lfd.x, lfd.y, lfd.z, 0.03);
    } else if (isSpeaking) {
      // Subtle gestures: small oscillations from default pose
      const rd = def("RightArm");
      lerpBone("RightArm", rd.x + Math.sin(t * 1.8) * 0.05, rd.y, rd.z + Math.sin(t * 1.5) * 0.06, 0.04);
      const rfd = def("RightForeArm");
      lerpBone("RightForeArm", rfd.x, rfd.y + Math.sin(t * 2.2) * 0.08, rfd.z + Math.sin(t * 2.0) * 0.06, 0.04);

      const ld = def("LeftArm");
      lerpBone("LeftArm", ld.x + Math.sin(t * 1.6) * 0.04, ld.y, ld.z - Math.sin(t * 1.3) * 0.05, 0.04);
      const lfd = def("LeftForeArm");
      lerpBone("LeftForeArm", lfd.x, lfd.y + Math.sin(t * 2.0) * 0.06, lfd.z - Math.sin(t * 1.7) * 0.05, 0.04);

      lerpBone("Spine", def("Spine").x, def("Spine").y + Math.sin(t * 0.7) * 0.008, def("Spine").z, 0.03);
    } else {
      // Idle: return to exact default pose
      for (const name of ["LeftShoulder", "LeftArm", "LeftForeArm", "LeftHand",
                           "RightShoulder", "RightArm", "RightForeArm", "RightHand",
                           "Spine", "Spine1"]) {
        const d = def(name);
        lerpBone(name, d.x, d.y, d.z, 0.03);
      }
    }
  });

  return (
    <group ref={group}>
      <primitive object={clone} />
    </group>
  );
}

useGLTF.preload(MODEL_PATH);

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
            <AvatarModel isSpeaking={isSpeaking} isThinking={isThinking} audioRef={audioRef} />
          </Suspense>
        </Canvas>

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
