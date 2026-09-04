"use client";

import * as THREE from "three";
import { useMemo } from "react";
import { MapTheme } from "../../../lib/environments";

interface EnvironmentStageProps {
  theme: MapTheme;
}

export default function EnvironmentStage({ theme }: EnvironmentStageProps) {
  const { palette, tableType, sunPosition, sunColor, sunIntensity } = theme;

  return (
    <>
      <color attach="background" args={[palette.background]} />
      <ambientLight color={palette.primary} intensity={0.3} />
      <directionalLight
        position={sunPosition}
        color={sunColor}
        intensity={sunIntensity}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />

      {tableType === "pagoda" && (
        <mesh position={[0, -0.6, 0]} rotation={[-Math.PI / 2, 0, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[1.5, 1.5, 0.1, 16]} />
          <meshStandardMaterial color={palette.table} roughness={0.6} metalness={0.2} />
        </mesh>
      )}

      {tableType === "stump" && (
        <mesh position={[0, -0.6, 0]} rotation={[-Math.PI / 2, 0, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[1.2, 1.2, 0.2, 8]} />
          <meshStandardMaterial color={palette.table} roughness={0.7} metalness={0.1} />
        </mesh>
      )}

      {tableType === "altar" && (
        <mesh position={[0, -0.5, 0]} rotation={[-Math.PI / 2, 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[2, 2, 0.15]} />
          <meshStandardMaterial color={palette.table} roughness={0.5} metalness={0.3} />
        </mesh>
      )}

      {tableType === "parlor" && (
        <mesh position={[0, -0.5, 0]} rotation={[-Math.PI / 2, 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[2.5, 1.5, 0.2]} />
          <meshStandardMaterial color={palette.table} roughness={0.4} metalness={0.4} />
        </mesh>
      )}

      {theme.hasProps && tableType !== "parlor" && (
        <>
          <mesh position={[-1.5, -0.4, 1]} castShadow receiveShadow>
            <boxGeometry args={[0.5, 0.5, 0.3]} />
            <meshStandardMaterial color={palette.secondary} roughness={0.6} />
          </mesh>
          <mesh position={[1.5, -0.4, 1]} rotation={[0, Math.PI, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.5, 0.5, 0.3]} />
            <meshStandardMaterial color={palette.secondary} roughness={0.6} />
          </mesh>
        </>
      )}

      <mesh position={[0, 0.5, 0]} rotation={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color={palette.background} roughness={1} />
      </mesh>
    </>
  );
}