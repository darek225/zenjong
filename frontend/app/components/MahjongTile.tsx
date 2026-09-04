"use client";

import { useState, useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Mesh } from "three";
import * as THREE from "three";
import { TileType, generateTileTexture, getTileBackTexture } from "../../lib/tileTextures";

interface MahjongTileProps {
  position: [number, number, number];
  rotation: [number, number, number];
  tileId: string;
  tileType?: TileType;
  faceUp?: boolean;
  selected?: boolean;
  onClick?: (tileId: string) => void;
  onHover?: (tileId: string, isHovering: boolean) => void;
}

export default function MahjongTile({
  position,
  rotation,
  tileId,
  tileType = "DOT_1",
  faceUp = true,
  selected = false,
  onClick,
  onHover,
}: MahjongTileProps) {
  const meshRef = useRef<Mesh>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isClicked, setIsClicked] = useState(false);
  const previousHoverState = useRef(false);
  const baseY = position[1];

  // Memoize geometry and materials to avoid re-instantiation every frame
  const geometry = useMemo(() => new THREE.BoxGeometry(1, 1.5, 0.1), []);

  const frontMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    map: faceUp ? generateTileTexture(tileType) : getTileBackTexture(),
    roughness: 0.45,
    metalness: 0.05,
    emissive: selected ? new THREE.Color(0xffd700) : new THREE.Color(0x000000),
    emissiveIntensity: selected ? 0.6 : 0.0,
  }), [tileType, faceUp, selected]);

  const sideMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: faceUp ? "#fdf6e3" : "#1f6e3a",
    roughness: 0.6,
    metalness: 0.1,
    emissive: selected ? new THREE.Color(0xffd700) : new THREE.Color(0x000000),
    emissiveIntensity: selected ? 0.2 : 0.0,
  }), [faceUp, selected]);

  // Animation effect for hover and click states
  useFrame(() => {
    if (meshRef.current) {
      const targetY = isHovered ? baseY + 0.3 : baseY;
      const targetScale = isHovered ? 1.15 : 1.0;
      const targetDepth = isClicked ? 0.15 : 0.1;

      const currentY = meshRef.current.position.y;
      meshRef.current.position.y = currentY + (targetY - currentY) * 0.15;

      meshRef.current.scale.x += (targetScale - meshRef.current.scale.x) * 0.15;
      meshRef.current.scale.y += (targetScale - meshRef.current.scale.y) * 0.15;
      meshRef.current.scale.z += (targetDepth - meshRef.current.scale.z) * 0.15;

      if (isHovered) {
        meshRef.current.rotation.x += (0.1 - meshRef.current.rotation.x) * 0.1;
      } else {
        meshRef.current.rotation.x += (0 - meshRef.current.rotation.x) * 0.1;
      }

      if (isHovered !== previousHoverState.current) {
        previousHoverState.current = isHovered;
        if (onHover) {
          onHover(tileId, isHovered);
        }
      }
    }
  });

  const handleClick = () => {
    setIsClicked(!isClicked);
    if (onClick) {
      onClick(tileId);
    }
  };

  const handlePointerOver = () => {
    setIsHovered(true);
  };

  const handlePointerOut = () => {
    setIsHovered(false);
  };

  return (
    <mesh
      ref={meshRef}
      position={position}
      rotation={rotation}
      onClick={handleClick}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    >
      <primitive attach="geometry" object={geometry} />
      <meshStandardMaterial
        attach="material-0"
        color="#fdf6e3"
        roughness={0.6}
        metalness={0.1}
        emissive={selected ? new THREE.Color(0xffd700) : new THREE.Color(0x000000)}
        emissiveIntensity={selected ? 0.2 : 0.0}
      />
      <meshStandardMaterial
        attach="material-1"
        color="#fdf6e3"
        roughness={0.6}
        metalness={0.1}
        emissive={selected ? new THREE.Color(0xffd700) : new THREE.Color(0x000000)}
        emissiveIntensity={selected ? 0.2 : 0.0}
      />
      <meshStandardMaterial
        attach="material-2"
        color="#fdf6e3"
        roughness={0.6}
        metalness={0.1}
        emissive={selected ? new THREE.Color(0xffd700) : new THREE.Color(0x000000)}
        emissiveIntensity={selected ? 0.2 : 0.0}
      />
      <meshStandardMaterial
        attach="material-3"
        color="#fdf6e3"
        roughness={0.6}
        metalness={0.1}
        emissive={selected ? new THREE.Color(0xffd700) : new THREE.Color(0x000000)}
        emissiveIntensity={selected ? 0.2 : 0.0}
      />
      <primitive attach="material-4" object={frontMaterial} />
      <primitive attach="material-5" object={sideMaterial} />
    </mesh>
  );
}