"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface BrazierFlamesProps {
  position?: [number, number, number];
  color?: string;
  size?: number;
}

export default function BrazierFlames({
  position = [0, 0, 0],
  color = "#9c27b0",
  size = 0.5,
}: BrazierFlamesProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const time = useRef(0);

  useFrame((_, delta) => {
    time.current += delta;
    if (meshRef.current) {
      const pulse = 0.7 + Math.sin(time.current * 8) * 0.3;
      meshRef.current.scale.set(
        size * pulse,
        size * (1.2 + Math.sin(time.current * 12) * 0.2),
        size * pulse
      );
      (meshRef.current.material as THREE.MeshBasicMaterial).opacity =
        0.6 + Math.sin(time.current * 6) * 0.2;
    }
  });

  return (
    <mesh position={position} ref={meshRef}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={0.7}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}