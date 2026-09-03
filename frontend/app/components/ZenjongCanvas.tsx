"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import MahjongTile from "./MahjongTile";

interface ZenjongCanvasProps {
  children?: React.ReactNode;
  myTiles: string[];
  discardPile: string[];
  selectedTiles: string[];
  onTileClick: (tileId: string) => void;
  onTileHover: (tileId: string, isHovering: boolean) => void;
  isMyTurn: boolean;
  discardTile: (tileId: string) => void;
}

export default function ZenjongCanvas({
  children,
  myTiles,
  discardPile,
  selectedTiles,
  onTileClick,
  onTileHover,
  isMyTurn,
  discardTile,
}: ZenjongCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return <div style={{ width: '100%', height: '600px' }} />;
  }

  return (
    <Canvas
      ref={canvasRef}
      style={{ width: '100%', height: '600px' }}
      camera={{ position: [0, 0, 10], fov: 75 }}
      onCreated={({ gl }) => {
        gl.setClearColor(0x1a1a1a);
      }}
    >
      {children}
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} />
      <OrbitControls enableZoom={true} enablePan={true} />

      {/* Render player's hand tiles */}
      {myTiles.map((tileId, index) => {
        const x = (index - (myTiles.length - 1) / 2) * 1.2;
        const z = 2;
        const y = -2;
        const rotation = [0, 0, 0] as [number, number, number];
        return (
          <MahjongTile
            key={tileId}
            position={[x, y, z]}
            rotation={rotation}
            tileId={tileId}
            onClick={() => {
              if (isMyTurn) {
                discardTile(tileId);
              } else {
                onTileClick(tileId);
              }
            }}
            onHover={onTileHover}
          />
        );
      })}

      {/* Render discard pile tiles */}
      {discardPile.map((tileId, index) => {
        const x = (index - (discardPile.length - 1) / 2) * 0.8;
        const z = -4;
        const y = 0;
        return (
          <MahjongTile
            key={`discard-${tileId}-${index}`}
            position={[x, y, z]}
            rotation={[0, 0, 0]}
            tileId={tileId}
            onClick={() => onTileClick(tileId)}
            onHover={onTileHover}
          />
        );
      })}
    </Canvas>
  );
}