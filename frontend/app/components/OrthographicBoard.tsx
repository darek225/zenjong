"use client";

import { useRef, useEffect } from "react";
import * as THREE from "three";
import { useStore } from "@react-three/drei";

interface OrthographicBoardProps {
  tiles: string[];
  selectedTile: string | null;
  onSelectTile: (tileId: string) => void;
}

export default function OrthographicBoard({ tiles, selectedTile, onSelectTile }: OrthographicBoardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    if (!canvasRef.current) return;
    
    // Orthographic camera for top-down view
    const camera = new THREE.OrthographicCamera(-10, 10, 10, -10, 0.1, 100);
    camera.position.set(0, 8, 0);
    camera.lookAt(0, 0, 0);
    
    // Light for top-down view
    const light = new THREE.DirectionalLight(0xffffff, 0.8);
    light.position.set(5, 10, 5);
    canvasRef.current?.getContext("webgl")?.scene?.add(light);

    if (!isMounted.current) return;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Render tiles in orthographic view
  const tilesData = tiles.map((tileId, index) => {
    const x = (index - (tiles.length - 1) / 2) * 1.1;
    const geometry = new THREE.BoxGeometry(1, 1.5, 0.1);
    const textureId = tileId.split("_")[1] || "1";
    const colors = ["#e53935", "#1e88e5", "#43a047", "#f9a825", "#ab47bc"];
    const color = colors[parseInt(textureId) % 5];
    
    const material = new THREE.MeshStandardMaterial({
      color: selectedTile === tileId ? "#fff3e0" : color,
      flatShading: true,
    });
    
    return new THREE.Mesh(geometry, material);
  });

  useEffect(() => {
    tilesData.forEach((tile, i) => {
      const x = (i - (tiles.length - 1) / 2) * 1.1;
      tile.position.set(x, 0.75, 0);
    });
  }, [tilesData]);

  return (
    <>
      <mesh>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#1a1a1a" transparent opacity={0.8} />
      </mesh>
    </>
  );
}