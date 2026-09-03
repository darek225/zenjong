"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface AmbientParticlesProps {
  color: string;
  count?: number;
  radius?: number;
  speed?: number;
  size?: number;
}

export default function AmbientParticles({
  color,
  count = 120,
  radius = 6,
  speed = 0.5,
  size = 0.08,
}: AmbientParticlesProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const positions = useRef<number[] | null>(null);
  const velocities = useRef<number[] | null>(null);

  if (!positions.current) {
    const pos = new Float32Array(count * 3);
    const vel = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * radius * 2;
      pos[i * 3 + 1] = Math.random() * 4;
      pos[i * 3 + 2] = (Math.random() - 0.5) * radius * 2;
      vel[i * 3] = (Math.random() - 0.5) * 0.02;
      vel[i * 3 + 1] = Math.random() * 0.02 + 0.005;
      vel[i * 3 + 2] = (Math.random() - 0.5) * 0.02;
    }
    positions.current = Array.from(pos);
    velocities.current = Array.from(vel);
  }

  useFrame(() => {
    if (!pointsRef.current) return;
    const posArray = pointsRef.current.geometry.attributes.position.array as Float32Array;
    const velArray = velocities.current!;

    for (let i = 0; i < count; i++) {
      const ix = i * 3;
      const iy = ix + 1;
      const iz = ix + 2;

      posArray[ix] += velArray[ix] * speed;
      posArray[iy] += velArray[iy] * speed;
      posArray[iz] += velArray[iz] * speed;

      // Wrap around when out of bounds
      if (posArray[iy] > 4) {
        posArray[iy] = -2;
        posArray[ix] = (Math.random() - 0.5) * radius * 2;
        posArray[iz] = (Math.random() - 0.5) * radius * 2;
      }
    }
    pointsRef.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={new Float32Array(positions.current!)}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        color={color}
        size={size}
        transparent
        opacity={0.8}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}