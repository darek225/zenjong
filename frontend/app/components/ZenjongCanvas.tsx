import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { OrbitControls, ContactShadows } from "@react-three/drei";
import { PostProcessingEffects } from "../../src/components/3d/PostProcessingEffects";
import { useEffect, useRef, useState } from "react";
import { ACESFilmicToneMapping } from "three";
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
  currentCameraPreset?: string;
  onCameraPresetChange?: (preset: string) => void;
  triggerShake?: number;
}

const CAMERA_PRESETS: Record<string, { position: [number, number, number]; fov: number }> = {
  TOP_DOWN: { position: [0, 24, 0.1], fov: 50 },
  ISO_3D: { position: [12, 14, 16], fov: 50 },
  LOW_ARCADE: { position: [0, 6, 14], fov: 50 },
};

function TouchGestureHandler() {
  const { gl, camera } = useThree();
  const lastTapTime = useRef(0);
  const pinchStartDist = useRef(0);

  useEffect(() => {
    const canvas = gl.domElement;
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        pinchStartDist.current = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
      } else if (e.touches.length === 1) {
        const now = Date.now();
        if (now - lastTapTime.current < 300) {
          camera.position.set(0, 16, 18);
          camera.lookAt(0, 0, 0);
          lastTapTime.current = 0;
        } else {
          lastTapTime.current = now;
        }
      }
    };
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        const currentDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        camera.position.multiplyScalar(currentDist / pinchStartDist.current);
        pinchStartDist.current = currentDist;
      }
    };
    canvas.addEventListener("touchstart", handleTouchStart, { passive: false });
    canvas.addEventListener("touchmove", handleTouchMove, { passive: false });
    return () => {
      canvas.removeEventListener("touchstart", handleTouchStart);
      canvas.removeEventListener("touchmove", handleTouchMove);
    };
  }, [gl, camera]);
  return null;
}

function CameraPresetHandler({ onCameraPresetChange }: { onCameraPresetChange?: (preset: string) => void }) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "1") onCameraPresetChange?.("TOP_DOWN");
      if (e.key === "2") onCameraPresetChange?.("ISO_3D");
      if (e.key === "3") onCameraPresetChange?.("LOW_ARCADE");
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onCameraPresetChange]);
  return null;
}

function ShakeEffect({ intensity }: { intensity: number }) {
  const { camera } = useThree();
  const shakeVec = useRef(new THREE.Vector3());
  useFrame(() => {
    if (intensity > 0.01) {
      shakeVec.current.set((Math.random() - 0.5) * intensity, (Math.random() - 0.5) * intensity, 0);
      camera.position.add(shakeVec.current);
    }
  });
  return null;
}

export default function ZenjongCanvas({
  children, myTiles, discardPile, selectedTiles,
  onTileClick, onTileHover, isMyTurn, discardTile,
  selectedMapId, isDualCamera, currentCameraPreset, onCameraPresetChange, triggerShake,
}: ZenjongCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isClient, setIsClient] = useState(false);
  useEffect(() => { setIsClient(true); }, []);

  const theme: MapTheme | undefined = ENVIRONMENTS.find(
    (env) => env.id === selectedMapId
  );

  const cameraConfig = currentCameraPreset
    ? CAMERA_PRESETS[currentCameraPreset] || { position: [0, 16, 18], fov: 50 }
    : isDualCamera
    ? { position: [0, 10, 0], left: -10, right: 10, top: 10, bottom: -10, near: 0.1, far: 100 }
    : { position: [0, 5, 8], fov: 50 };

  if (!isClient) {
    return <div style={{ width: "100%", height: "600px" }} />;
  }

  return (
    <Canvas
      ref={canvasRef}
      style={{ width: "100%", height: "600px" }}
      camera={cameraConfig as any}
      onCreated={({ gl }) => {
        gl.setClearColor(
          theme ? parseInt(theme.palette.background.slice(1), 16) : 0x1a1a1a
        );
        gl.shadowMap.enabled = true;
        gl.shadowMap.type = THREE.PCFSoftShadowMap;
        gl.toneMapping = ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.2;
      }}
      gl={{ antialias: true }}
      dpr={[1, 2]}
      shadows={{ type: THREE.PCFSoftShadowMap }}
    >
      <CameraPresetHandler onCameraPresetChange={onCameraPresetChange} />
      <TouchGestureHandler />
      {triggerShake && triggerShake > 0 && <ShakeEffect intensity={triggerShake} />}

      <ambientLight intensity={0.3} />
      <directionalLight position={[0, 12, 0]} intensity={1.8} castShadow shadow-map-size-width={2048} shadow-map-size-height={2048} shadow-camera-near={0.5} shadow-camera-far={50} shadow-camera-top={10} shadow-camera-bottom={-10} shadow-camera-left={-10} shadow-camera-right={10} shadow-bias={-0.0001} />
      <directionalLight position={[5, 8, 5]} intensity={0.6} />
      <directionalLight position={[-3, 6, -3]} intensity={0.4} color="#ffd700" />

      {theme && <EnvironmentStage theme={theme} />}

      <ContactShadows position={[0, -1.2, 0]} opacity={0.6} scale={20} blur={2} far={4} resolution={256} color="#000000" />

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

      {theme && <AmbientParticles color={theme.palette.accent} count={150} radius={8} speed={0.3} size={0.1} />}

      {myTiles.map((tileId, index) => {
        const x = (index - (myTiles.length - 1) / 2) * 1.2;
        const isSelected = selectedTiles.includes(tileId);
        return (
          <MahjongTile key={tileId} position={[x, -2, 2]} rotation={[0, 0, 0]} tileId={tileId} selected={isSelected}
            onClick={() => { if (isMyTurn) discardTile(tileId); else onTileClick(tileId); }}
            onHover={onTileHover} />
        );
      })}

      {discardPile.map((tileId, index) => {
        const x = (index - (discardPile.length - 1) / 2) * 0.8;
        return (
          <MahjongTile key={`discard-${tileId}-${index}`} position={[x, 0, -4]} rotation={[0, 0, 0]} tileId={tileId}
            selected={selectedTiles.includes(tileId)} onClick={() => onTileClick(tileId)} onHover={onTileHover} />
        );
      })}

      {!isDualCamera && <OrbitControls enableZoom={true} enablePan={true} />}

      <PostProcessingEffects />
    </Canvas>
  );
}

