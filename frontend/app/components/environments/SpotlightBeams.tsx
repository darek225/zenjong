"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface SpotlightBeamsProps {
  position?: [number, number, number];
  color?: string;
  height?: number;
  angle?: number;
}

export default function SpotlightBeams({
  position = [0, 5, 0],
  color = "#fff176",
  height = 5,
  angle = 0.3,
}: SpotlightBeamsProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const time = useRef(0);

  useFrame((_, delta) => {
    time.current += delta;
    if (meshRef.current) {
      const flicker = 0.85 + Math.sin(time.current * 10) * 0.15;
      (meshRef.current.material as THREE.MeshBasicMaterial).opacity =
        0.12 * flicker;
    }
  });

  const radius = height * Math.tan(angle);

  return (
    <mesh position={position} ref={meshRef}>
      <coneGeometry args={[radius, height, 16, 1, true]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={0.12}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}