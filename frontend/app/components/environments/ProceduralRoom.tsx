"use client";

import { useEffect, useMemo } from "react";
import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from "three";
import type { MapTheme } from "../../../lib/environments";

export default function ProceduralRoom({ theme }: { theme: MapTheme }) {
  const neon = theme.id === "cyberpunk";
  const rain = theme.roomKind === "rain_garden";
  const space = theme.roomKind === "space_station";
  const cloud = theme.roomKind === "cloud_temple";
  const gold = theme.roomKind === "golden_parlor";
  const accent = neon ? "#55eaff" : theme.palette.accent;
  const floorTexture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 256;
    const context = canvas.getContext("2d");
    if (context) {
      context.fillStyle = neon ? "#263b48" : "#81563b";
      context.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 128; i++) {
        context.strokeStyle = i % 2 ? "rgba(15,10,5,0.14)" : "rgba(255,223,165,0.12)";
        context.beginPath();
        context.moveTo(0, i * 2);
        context.bezierCurveTo(80, i * 2 + Math.sin(i) * 4, 170, i * 2 - 3, 256, i * 2);
        context.stroke();
      }
      context.strokeStyle = neon ? "#7194a0" : "#392619";
      context.lineWidth = 3;
      context.strokeRect(0, 0, 256, 128);
      context.strokeRect(0, 128, 256, 128);
      context.beginPath(); context.moveTo(128, 128); context.lineTo(128, 256); context.stroke();
    }
    const texture = new CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = RepeatWrapping;
    texture.repeat.set(12, 12);
    texture.colorSpace = SRGBColorSpace;
    return texture;
  }, [neon]);
  useEffect(() => () => floorTexture.dispose(), [floorTexture]);
  const frame = neon ? "#223442" : "#513325";
  return (
    <>
      <color attach="background" args={[neon ? "#173044" : "#625348"]} />
      <fog attach="fog" args={[neon ? "#173044" : "#625348", 35, 85]} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.5, 0]} receiveShadow>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial map={floorTexture} roughness={neon ? 0.55 : 0.88} metalness={neon ? 0.55 : 0} />
      </mesh>
      <mesh position={[0, -0.65, 0]} receiveShadow castShadow>
        {space ? <cylinderGeometry args={[6.8, 7.4, 0.7, 48]} /> : cloud ? <boxGeometry args={[15, 0.7, 11]} /> : <boxGeometry args={[14.5, 0.7, 10.5]} />}
        <meshStandardMaterial color={space ? "#263653" : cloud ? "#68758b" : frame} roughness={0.5} metalness={neon || space ? 0.6 : 0.1} />
      </mesh>
      {[-6, 6].flatMap(x => [-4, 4].map(z => (
        <mesh key={`leg-${x}-${z}`} position={[x, -1.1, z]} castShadow>
          <boxGeometry args={[0.65, 0.8, 0.65]} /><meshStandardMaterial color={frame} />
        </mesh>
      )))}
      {[-11, 11].flatMap(x => [-10, -3, 5].map(z => (
        <group key={`${x}-${z}`} position={[x, -1.5, z]}>
          <mesh position={[0, 3.5, 0]} castShadow>
            <boxGeometry args={[0.65, 7, 0.65]} /><meshStandardMaterial color={frame} roughness={0.6} metalness={neon ? 0.7 : 0} />
          </mesh>
          <mesh position={[0, 0.2, 0]}><boxGeometry args={[1.1, 0.4, 1.1]} /><meshStandardMaterial color={theme.palette.secondary} /></mesh>
          <mesh position={[0, 4.8, 0]}>
            <boxGeometry args={[neon ? 0.75 : 1.1, neon ? 2.4 : 1.3, 0.75]} />
            <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.8} roughness={0.5} />
          </mesh>
          <pointLight position={[0, 4.5, 1]} color={neon ? accent : "#ffd6a0"} intensity={18} distance={15} decay={2} />
        </group>
      )))}
      {rain && <group>
        {[-8, -4, 0, 4, 8].map(x => <group key={`bamboo-${x}`} position={[x, 1.7, -7]}>
          <mesh><cylinderGeometry args={[0.16, 0.22, 6, 8]} /><meshStandardMaterial color="#335b3b" roughness={0.9} /></mesh>
          <mesh position={[0.6, 1.5, 0]} rotation={[0, 0, -0.35]}><coneGeometry args={[0.5, 2.8, 6]} /><meshStandardMaterial color="#4f8d5a" /></mesh>
        </group>)}
        <mesh position={[0, -1.08, -7]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[4, 40]} /><meshStandardMaterial color="#183e4a" metalness={0.3} roughness={0.2} /></mesh>
      </group>}
      {space && <group>
        <mesh position={[0, 3, -13]}><boxGeometry args={[24, 7, 0.3]} /><meshStandardMaterial color="#10192f" emissive="#182d61" emissiveIntensity={0.45} /></mesh>
        {[-9, -6, -3, 0, 3, 6, 9].map(x => <mesh key={`star-${x}`} position={[x, 3 + (x % 3), -12.7]}><sphereGeometry args={[0.08, 8, 8]} /><meshBasicMaterial color="#d5e6ff" /></mesh>)}
        <mesh position={[0, 3.8, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[8, 0.08, 8, 64]} /><meshBasicMaterial color="#55eaff" /></mesh>
      </group>}
      {cloud && <group>
        {[-7, 7].map(x => <group key={`gate-${x}`} position={[x, 2, -9]}><mesh><boxGeometry args={[0.7, 5, 0.7]} /><meshStandardMaterial color="#9f4253" roughness={0.8} /></mesh><mesh position={[0, 2.5, 0]}><boxGeometry args={[3, 0.45, 0.8]} /><meshStandardMaterial color="#b7525d" /></mesh></group>)}
        {[-5, 0, 5].map(x => <mesh key={`cloud-${x}`} position={[x, 3.5, -11]}><sphereGeometry args={[1.3, 12, 8]} /><meshStandardMaterial color="#eef3f0" transparent opacity={0.35} /></mesh>)}
      </group>}
      {gold && <group>
        {[-8, 8].map(x => <group key={`shelf-${x}`} position={[x, 1.5, -8]}><mesh><boxGeometry args={[2.5, 4, 0.5]} /><meshStandardMaterial color="#55351f" roughness={0.45} /></mesh><mesh position={[0, 1.4, 0.3]}><boxGeometry args={[1.8, 0.35, 0.1]} /><meshStandardMaterial color="#c99b43" /></mesh></group>)}
        <pointLight position={[0, 4, -5]} color="#ffd27a" intensity={24} distance={16} />
      </group>}
      <mesh position={[0, 2.5, -12]} receiveShadow>
        <boxGeometry args={[24, 8, 0.4]} /><meshStandardMaterial color={neon ? "#233c50" : "#b8a186"} roughness={0.9} />
      </mesh>
      {[-9, -6, -3, 0, 3, 6, 9].map(x => (
        <group key={x} position={[x, 2.7, -11.7]}>
          <mesh><boxGeometry args={[2.4, 4.6, 0.1]} /><meshStandardMaterial color={neon ? "#113956" : "#e2cc9d"} emissive={accent} emissiveIntensity={neon ? 0.18 : 0.05} /></mesh>
          {[-1, 0, 1].map(offset => <mesh key={offset} position={[offset, 0, 0.1]}><boxGeometry args={[0.06, 4.6, 0.08]} /><meshStandardMaterial color={frame} /></mesh>)}
          {[-1.5, 0, 1.5].map(y => <mesh key={y} position={[0, y, 0.1]}><boxGeometry args={[2.4, 0.07, 0.08]} /><meshStandardMaterial color={frame} /></mesh>)}
        </group>
      ))}
      {[-11, 11].map(x => <mesh key={x} position={[x, 5.5, -2]}><boxGeometry args={[0.8, 0.6, 21]} /><meshStandardMaterial color={frame} /></mesh>)}
      <mesh position={[0, 5.5, -10]}><boxGeometry args={[23, 0.6, 0.8]} /><meshStandardMaterial color={frame} /></mesh>
    </>
  );
}