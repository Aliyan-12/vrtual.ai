'use client';
import { useEffect, useRef } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import * as THREE from "three";
import gsap from "gsap";

export default function AvatarModel({
  mood,
  cursorRef,
}: {
  mood: "calm" | "anxious" | "overwhelmed";
  cursorRef: React.MutableRefObject<{ x: number; y: number }>;
}) {
  const group = useRef<THREE.Group | null>(null);
  const obj = useLoader(OBJLoader, "/3d-model/base.obj");
  const diffuse = useLoader(THREE.TextureLoader, "/3d-model/texture_diffuse.png");
  const normal = useLoader(THREE.TextureLoader, "/3d-model/texture_normal.png");
  const roughness = useLoader(THREE.TextureLoader, "/3d-model/texture_roughness.png");
  const metalness = useLoader(THREE.TextureLoader, "/3d-model/texture_metallic.png");
  // Optional additional maps are available but not required here

  useEffect(() => {
    const material = new THREE.MeshStandardMaterial({
      map: diffuse,
      normalMap: normal,
      roughnessMap: roughness,
      metalnessMap: metalness,
      metalness: 1.0,
      roughness: 1.0,
      emissive: new THREE.Color("#000000"),
      emissiveIntensity: 0,
    });
    obj.traverse((child: any) => {
      if (child.isMesh) {
        child.material = material;
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    // Center and scale the model
    const box = new THREE.Box3().setFromObject(obj);
    const size = new THREE.Vector3();
    box.getSize(size);
    const center = new THREE.Vector3();
    box.getCenter(center);
    obj.position.sub(center);
    const maxAxis = Math.max(size.x, size.y, size.z);
    const targetSize = 2.2;
    const scale = targetSize / (maxAxis || 1);
    if (group.current) {
      group.current.scale.set(scale, scale, scale);
      group.current.position.set(0, 0, 0);
    }
  }, [obj, diffuse, normal, roughness, metalness]);

  useEffect(() => {
    if (!group.current) return;

    const tl = gsap.timeline({ repeat: -1, yoyo: true });
    tl.to(group.current.scale, { x: 1.04, y: 1.04, z: 1.04, duration: 2.2, ease: "sine.inOut" });
    
    return () => {
      tl.kill();
    };
  }, []);

  useEffect(() => {
    // Mood no longer tints the model; we keep real texture colors.
    // Background aurora handles mood visuals.
  }, [mood]);

  useFrame(() => {
    if (!group.current) return;
    const tx = cursorRef.current.x * 0.6;
    const ty = cursorRef.current.y * 0.4;
    group.current.rotation.y = THREE.MathUtils.lerp(group.current.rotation.y, tx * 0.5, 0.08);
    group.current.rotation.x = THREE.MathUtils.lerp(group.current.rotation.x, ty * 0.3, 0.08);
    group.current.position.x = THREE.MathUtils.lerp(group.current.position.x, tx * 0.5, 0.06);
    group.current.position.y = THREE.MathUtils.lerp(group.current.position.y, ty * 0.3, 0.06);
  });

  return (
    <group ref={group} position={[0, 0, 0]} scale={[1, 1, 1]}>
      <primitive object={obj} />
    </group>
  );
}
