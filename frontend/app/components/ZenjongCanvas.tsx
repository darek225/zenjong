"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import MahjongTile from "./MahjongTile";
import EnvironmentStage from "./environments/EnvironmentStage";
import AmbientParticles from "./environments/AmbientParticles";
import BrazierFlames from "./environments/BrazierFlames";
import SpotlightBeams from "./environments/SpotlightBeams";
import { ENVIRONMENTS, MapTheme } from "../../lib/environments";

interface ZenjongCanvasProps {
  children?: React.ReactNode;
  myTiles: string[];
  discardPile: string[];
  selectedTiles: string[];
  onTileClick: (tileId: string) => void;
  onTileHover: (tileId: string, isHovering: boolean) => void;
  isMyTurn: boolean;
  discardTile: (tileId: string) => void;
  selectedMapId: string;
  isDualCamera: boolean;
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
  selectedMapId,
  isDualCamera,
}: ZenjongCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return <div style={{ width: "100%", height: "600px" }} />;
  }

  const theme: MapTheme | undefined = ENVIRONMENTS.find(
    (env) => env.id === selectedMapId
  );

  const camera = isDualCamera
    ? { position: [0, 10, 0], left: -10, right: 10, top: 10, bottom: -10, near: 0.1, far: 100 }
    : { position: [0, 5, 8], fov: 50 };

  return (
    <Canvas
      ref={canvasRef}
      style={{ width: "100%", height: "600px" }}
      camera={camera as any}
      onCreated={({ gl }) => {
        gl.setClearColor(
          theme
            ? parseInt(theme.palette.background.slice(1), 16)
            : 0x1a1a1a
        );
      }}
      gl={{ antialias: true }}
      dpr={[1, 2]}
      shadows
    >
      {theme && <EnvironmentStage theme={theme} />}

      {theme && theme.hasFlames && (
        <>
          <BrazierFlames position={[-1, -0.2, 0.8]} size={0.4} color={theme.palette.accent} />
          <BrazierFlames position={[1, -0.2, 0.8]} size={0.4} color={theme.palette.accent} />
          <BrazierFlames position={[-1, -0.2, -0.8]} size={0.4} color={theme.palette.accent} />
          <BrazierFlames position={[1, -0.2, -0.8]} size={0.4} color={theme.palette.accent} />
        </>
      )}

      {theme && theme.hasSpotlights && (
        <>
          <SpotlightBeams position={[-2, 5, -2]} height={6} angle={0.4} color="#fff176" />
          <SpotlightBeams position={[2, 5, -2]} height={6} angle={0.4} color="#fff176" />
        </>
      )}

      {theme && (
        <AmbientParticles color={theme.palette.accent} count={150} radius={8} speed={0.3} size={0.1} />
      )}

      {myTiles.map((tileId, index) => {
        const x = (index - (myTiles.length - 1) / 2) * 1.2;
        const isSelected = selectedTiles.includes(tileId);
        return (
          <MahjongTile
            key={tileId}
            position={[x, -2, 2]}
            rotation={[0, 0, 0]}
            tileId={tileId}
            selected={isSelected}
            onClick={() => {
              if (isMyTurn) discardTile(tileId);
              else onTileClick(tileId);
            }}
            onHover={onTileHover}
          />
        );
      })}

      {discardPile.map((tileId, index) => {
        const x = (index - (discardPile.length - 1) / 2) * 0.8;
        return (
          <MahjongTile
            key={`discard-${tileId}-${index}`}
            position={[x, 0, -4]}
            rotation={[0, 0, 0]}
            tileId={tileId}
            selected={selectedTiles.includes(tileId)}
            onClick={() => onTileClick(tileId)}
            onHover={onTileHover}
          />
        );
      })}

      {!isDualCamera && <OrbitControls enableZoom={true} enablePan={true} />}
    </Canvas>
  );
}