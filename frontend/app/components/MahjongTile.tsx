"use client";

import { useState, useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { Group, MathUtils } from "three";
import { Edges } from "@react-three/drei";
import * as THREE from "three";
import { TileType, generateTileTexture, getTileBackTexture } from "../../lib/tileTextures";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

interface MahjongTileProps {
  position: [number, number, number];
  rotation: [number, number, number];
  tileId: string;
  tileType?: TileType;
  faceUp?: boolean;
  selected?: boolean;
  backColor?: string;
  tileSet?: string;
  blocked?: boolean;
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
  backColor = "#1f6e3a",
  tileSet = "default-jade",
  blocked = false,
  onClick,
  onHover,
}: MahjongTileProps) {
  const meshRef = useRef<Group>(null);
  const [isHovered, setIsHovered] = useState(false);
  const previousHoverState = useRef(false);

  // Memoize geometry and materials to avoid re-instantiation every frame
  // Chunky beveled 3D box geometry with chamfered edges
  // RoundedBox retains six material groups, valid face UVs and full tile depth.
  const geometry = useMemo(
    () => new RoundedBoxGeometry(0.8, 1.1, 0.5, 2, 0.04),
    []
  );

  // Front face material with high-contrast texture and gold emissive on selection
  const tilePalette = tileSet === "default-obsidian"
    ? { face: "#f3ead7", ink: "#d7a84d", edge: backColor }
    : tileSet === "cyberpunk-neon"
      ? { face: "#dffaff", ink: "#16d7e8", edge: "#172b4a" }
      : tileSet === "carved-walnut"
        ? { face: "#f1dfbf", ink: "#6d351f", edge: "#5a2d1a" }
        : tileSet === "frosted-glass"
          ? { face: "#eafaff", ink: "#75b8d1", edge: "#5d8393" }
          : { face: "#ffffff", ink: "#ffffff", edge: backColor };
  const frontMaterial = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        map: faceUp ? generateTileTexture(tileType) : getTileBackTexture(),
        color: faceUp ? tilePalette.face : tilePalette.edge,
        roughness: 0.5,
        metalness: 0,
        clearcoat: 0.3,
        clearcoatRoughness: 0.2,
        emissive: selected
          ? new THREE.Color(0xffd700)
          : new THREE.Color(0x000000),
        emissiveIntensity: selected ? 0.08 : 0.0,
      }),
    [tileType, faceUp, selected, backColor, tileSet, tilePalette.face, tilePalette.edge]
  );

  // Side material with ivory tone and gold edge glow
  const sideMaterial = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        map: getTileBackTexture(),
        color: tilePalette.edge,
        roughness: 0.55,
        metalness: 0,
        clearcoat: 0.3,
        clearcoatRoughness: 0.2,
        emissive: selected
          ? new THREE.Color(0xffd700)
          : new THREE.Color(0x000000),
        emissiveIntensity: selected ? 0.35 : 0.0,
      }),
    [backColor, selected, tileSet, tilePalette.edge]
  );

  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => frontMaterial.dispose(), [frontMaterial]);
  useEffect(() => () => sideMaterial.dispose(), [sideMaterial]);

  // Animation effect for hover and click states - reuses Three.js vectors
  useFrame((_, delta) => {
    if (!meshRef.current) return;

    // World-Y lift preserves the caller's rotation and never flattens the tile.
    const targetY = selected && !blocked ? 0.3 : isHovered && !blocked ? 0.08 : 0;
    meshRef.current.position.y = MathUtils.damp(meshRef.current.position.y, targetY, 14, delta);

    // Hover state change callback (only fires on transitions)
    if (isHovered !== previousHoverState.current) {
      previousHoverState.current = isHovered;
      onHover?.(tileId, isHovered);
    }
  });

  const handleClick = () => {
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
    <group position={position}>
    <group ref={meshRef}>
    <mesh
      rotation={rotation}
      castShadow
      receiveShadow
      onClick={onClick ? (event) => {
        event.stopPropagation();
        if (!blocked && event.delta <= 5) handleClick();
      } : undefined}
      onPointerOver={onClick ? (event) => {
        event.stopPropagation();
        if (!blocked) handlePointerOver();
      } : undefined}
      onPointerOut={onClick ? handlePointerOut : undefined}
    >
      <primitive attach="geometry" object={geometry} />
      <meshStandardMaterial
        attach="material-0"
        color={tilePalette.face}
        roughness={0.6}
        metalness={0.1}
        emissive={selected ? new THREE.Color(0xffd700) : new THREE.Color(0x000000)}
        emissiveIntensity={selected ? 0.3 : 0.0}
      />
      <meshStandardMaterial
        attach="material-1"
        color={tilePalette.face}
        roughness={0.6}
        metalness={0.1}
        emissive={selected ? new THREE.Color(0xffd700) : new THREE.Color(0x000000)}
        emissiveIntensity={selected ? 0.3 : 0.0}
      />
      <meshStandardMaterial
        attach="material-2"
        color={tilePalette.face}
        roughness={0.6}
        metalness={0.1}
        emissive={selected ? new THREE.Color(0xffd700) : new THREE.Color(0x000000)}
        emissiveIntensity={selected ? 0.3 : 0.0}
      />
      <meshStandardMaterial
        attach="material-3"
        color={tilePalette.face}
        roughness={0.6}
        metalness={0.1}
        emissive={selected ? new THREE.Color(0xffd700) : new THREE.Color(0x000000)}
        emissiveIntensity={selected ? 0.3 : 0.0}
      />
      <primitive attach="material-4" object={frontMaterial} />
      <primitive attach="material-5" object={sideMaterial} />
      {selected && !blocked && <Edges scale={1.015} threshold={35} color={tilePalette.ink === "#ffffff" ? "#ffe6a0" : tilePalette.ink} raycast={() => null} />}
    </mesh>
    </group>
    </group>
  );
}
