"use client";

import { useState, useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Mesh } from "three";
import * as THREE from "three";
import { TileType, generateTileTexture, getTileBackTexture } from "../../lib/tileTextures";
import { createBeveledBox } from "../../lib/beveledBox";

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
  // Chunky beveled 3D box geometry with chamfered edges
  // Tile size per arcade spec: width 1.2, height 1.6, depth 0.5
  const geometry = useMemo(
    () => createBeveledBox(1.2, 1.6, 0.5, 0.07, 1),
    []
  );

  // Front face material with high-contrast texture and gold emissive on selection
  const frontMaterial = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        map: faceUp ? generateTileTexture(tileType) : getTileBackTexture(),
        roughness: 0.25,
        metalness: 0.1,
        clearcoat: 0.3,
        clearcoatRoughness: 0.2,
        emissive: selected
          ? new THREE.Color(0xffd700)
          : new THREE.Color(0x000000),
        emissiveIntensity: selected ? 0.85 : 0.0,
      }),
    [tileType, faceUp, selected]
  );

  // Side material with ivory tone and gold edge glow
  const sideMaterial = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: faceUp ? "#fdf6e3" : "#1f6e3a",
        roughness: 0.25,
        metalness: 0.1,
        clearcoat: 0.3,
        clearcoatRoughness: 0.2,
        emissive: selected
          ? new THREE.Color(0xffd700)
          : new THREE.Color(0x000000),
        emissiveIntensity: selected ? 0.35 : 0.0,
      }),
    [faceUp, selected]
  );

  // Animation effect for hover and click states - reuses Three.js vectors
  useFrame(() => {
    if (!meshRef.current) return;

    const targetY = isHovered ? baseY + 0.35 : baseY;
    const targetScale = isHovered ? 1.12 : 1.0;
    const targetDepth = isClicked ? 0.12 : 0.1;

    // Reuse meshRef properties directly to avoid allocations
    meshRef.current.position.y += (targetY - meshRef.current.position.y) * 0.15;
    meshRef.current.scale.x += (targetScale - meshRef.current.scale.x) * 0.15;
    meshRef.current.scale.y += (targetScale - meshRef.current.scale.y) * 0.15;
    meshRef.current.scale.z += (targetDepth - meshRef.current.scale.z) * 0.15;

    // Smooth rotation animation
    const targetRotX = isHovered ? 0.08 : 0;
    meshRef.current.rotation.x += (targetRotX - meshRef.current.rotation.x) * 0.1;

    // Hover state change callback (only fires on transitions)
    if (isHovered !== previousHoverState.current) {
      previousHoverState.current = isHovered;
      onHover?.(tileId, isHovered);
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
    document.body.style.cursor = "pointer";
  };

  const handlePointerOut = () => {
    setIsHovered(false);
    document.body.style.cursor = "auto";
  };

  return (
    <mesh
      ref={meshRef}
      position={position}
      rotation={rotation}
      castShadow
      receiveShadow
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
        emissiveIntensity={selected ? 0.3 : 0.0}
      />
      <meshStandardMaterial
        attach="material-1"
        color="#fdf6e3"
        roughness={0.6}
        metalness={0.1}
        emissive={selected ? new THREE.Color(0xffd700) : new THREE.Color(0x000000)}
        emissiveIntensity={selected ? 0.3 : 0.0}
      />
      <meshStandardMaterial
        attach="material-2"
        color="#fdf6e3"
        roughness={0.6}
        metalness={0.1}
        emissive={selected ? new THREE.Color(0xffd700) : new THREE.Color(0x000000)}
        emissiveIntensity={selected ? 0.3 : 0.0}
      />
      <meshStandardMaterial
        attach="material-3"
        color="#fdf6e3"
        roughness={0.6}
        metalness={0.1}
        emissive={selected ? new THREE.Color(0xffd700) : new THREE.Color(0x000000)}
        emissiveIntensity={selected ? 0.3 : 0.0}
      />
      <primitive attach="material-4" object={frontMaterial} />
      <primitive attach="material-5" object={sideMaterial} />
    </mesh>
  );
}
