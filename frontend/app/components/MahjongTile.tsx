"use client";

import { useState, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Mesh, MeshStandardMaterial, BoxGeometry } from "three";
import { TileType, generateTileTexture, getTileBackTexture } from "../../lib/tileTextures";

interface MahjongTileProps {
  position: [number, number, number];
  rotation: [number, number, number];
  tileId: string;
  tileType?: TileType;
  faceUp?: boolean;
  onClick?: (tileId: string) => void;
  onHover?: (tileId: string, isHovering: boolean) => void;
}


export default function MahjongTile({
  position,
  rotation,
  tileId,
  tileType = "DOT_1",
  faceUp = true,
  onClick,
  onHover,
}: MahjongTileProps) {
  const meshRef = useRef<Mesh>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isClicked, setIsClicked] = useState(false);
  const previousHoverState = useRef(false);
  const baseY = position[1];
  const liftOffset = useRef(0);

  // Animation effect for hover and click states
  useFrame(() => {
    if (meshRef.current) {
      // Smooth vertical lift animation on hover
      const targetY = isHovered ? baseY + 0.3 : baseY;
      const targetScale = isHovered ? 1.15 : 1.0;
      const targetZ = isClicked ? 0.15 : 0.1;

      // Smooth interpolation for vertical lift
      const currentY = meshRef.current.position.y;
      meshRef.current.position.y = currentY + (targetY - currentY) * 0.15;

      // Smooth interpolation for scale
      meshRef.current.scale.x += (targetScale - meshRef.current.scale.x) * 0.15;
      meshRef.current.scale.y += (targetScale - meshRef.current.scale.y) * 0.15;
      meshRef.current.scale.z += (targetScale - meshRef.current.scale.z) * 0.15;

      // Smooth interpolation for depth on click
      meshRef.current.scale.z += (targetZ - meshRef.current.scale.z) * 0.15;

      // Subtle rotation on hover for 3D depth
      if (isHovered) {
        meshRef.current.rotation.x += (0.1 - meshRef.current.rotation.x) * 0.1;
      } else {
        meshRef.current.rotation.x += (0 - meshRef.current.rotation.x) * 0.1;
      }

      // Update hover state callback
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

  // Build materials array with texture on front face (+Z)
  const frontMaterial = new MeshStandardMaterial({
    map: faceUp ? generateTileTexture(tileType) : getTileBackTexture(),
    roughness: 0.45,
    metalness: 0.05,
  });

  const sideMaterial = new MeshStandardMaterial({
    color: faceUp ? "#fdf6e3" : "#1f6e3a",
    roughness: 0.6,
    metalness: 0.1,
  });
// BoxGeometry face order: [+X, -X, +Y, -Y, +Z, -Z]
  // +Z is the front face that shows the front face that shows the tile texture
  return (
    <mesh
      ref={meshRef}
      position={position}
      rotation={rotation}
      onClick={handleClick}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    >
      <boxGeometry args={[1, 1.5, 0.1]} />
      {/* +X (right side) */}
      <primitive attach="material-0" object={sideMaterial} />
      {/* -X (left side) */}
      <primitive attach="material-1" object={sideMaterial} />
      {/* +Y (top) */}
      <primitive attach="material-2" object={sideMaterial} />
      {/* -Y (bottom) */}
      <primitive attach="material-3" object={sideMaterial} />
      {/* +Z (front face — shows tile texture) */}
      <primitive attach="material-4" object={frontMaterial} />
      {/* -Z (back) */}
      <primitive attach="material-5" object={sideMaterial} />
    </mesh>
  );
}