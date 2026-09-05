import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { OrbitControls, ContactShadows } from "@react-three/drei";
import { PostProcessingEffects } from "../../src/components/3d/PostProcessingEffects";
import { useEffect, useRef, useState, useCallback } from "react";
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

/**
 * Touch gesture handler with:
 * - Two-finger pan (translate camera horizontally)
 * - Pinch-to-zoom (scale camera distance)
 * - Double-tap reset (quickly tap twice to reset camera)
 * - Ghost click prevention (block single-finger taps during pan/zoom gestures)
 */
function TouchGestureHandler() {
  const { gl, camera } = useThree();

  // Gesture state
  const touchState = useRef({
    lastTapTime: 0,
    pinchStartDist: 0,
    pinchStartZoom: 1,
    panStartMidX: 0,
    panStartMidY: 0,
    isGesturing: false,
    pointerDownPos: { x: 0, y: 0 },
    pointerMoved: false,
  });

  // Reusable vectors to avoid GC pressure in the touch loop
  const tempVec = useRef(new THREE.Vector3());
  const tempVec2 = useRef(new THREE.Vector3());

  const resetCamera = useCallback(() => {
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.position.set(0, 16, 18);
      camera.lookAt(0, 0, 0);
      camera.fov = 50;
      camera.updateProjectionMatrix();
    }
  }, [camera]);

  useEffect(() => {
    const canvas = gl.domElement;
    const state = touchState.current;

    const handleTouchStart = (e: TouchEvent) => {
      // Block default browser behaviors (scroll/zoom/etc.) so OrbitControls stays in sync
      e.preventDefault();

      const touchCount = e.touches.length;

      if (touchCount === 1) {
        // Track starting position for tap detection and ghost-click prevention
        const touch = e.touches[0];
        state.pointerDownPos = { x: touch.clientX, y: touch.clientY };
        state.pointerMoved = false;

        // Double-tap detection (within 300 ms)
        const now = Date.now();
        if (now - state.lastTapTime < 300) {
          resetCamera();
          state.lastTapTime = 0;
        } else {
          state.lastTapTime = now;
        }
      } else if (touchCount === 2) {
        // Two-finger gesture: lock out OrbitControls and remember start state
        state.isGesturing = true;

        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        state.pinchStartDist = Math.hypot(dx, dy);
        state.pinchStartZoom = camera.position.length();

        state.panStartMidX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        state.panStartMidY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();

      const touchCount = e.touches.length;

      if (touchCount === 1 && state.isGesturing) {
        // Single-finger continuation of a previous two-finger gesture — pan
        const touch = e.touches[0];
        const deltaX = (touch.clientX - state.panStartMidX) * 0.05;
        const deltaY = (touch.clientY - state.panStartMidY) * 0.05;

        camera.getWorldDirection(tempVec.current);
        tempVec2.current.set(tempVec.current.x, 0, tempVec.current.z).normalize();

        camera.position.addScaledVector(tempVec2.current, -deltaX);
        camera.position.y += deltaY;

        state.panStartMidX = touch.clientX;
        state.panStartMidY = touch.clientY;
        state.pointerMoved = true;
      } else if (touchCount === 2) {
        state.isGesturing = true;
        state.pointerMoved = true;

        // Pinch-to-zoom
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const currentDist = Math.hypot(dx, dy);
        const pinchScale = state.pinchStartDist / currentDist;

        const newDist = state.pinchStartZoom * pinchScale;
        const clampedDist = Math.max(5, Math.min(50, newDist));
        const currentLen = camera.position.length();
        const scale = clampedDist / currentLen;
        camera.position.multiplyScalar(scale);

        // Two-finger pan
        const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        const panDeltaX = (midX - state.panStartMidX) * 0.03;
        const panDeltaY = (midY - state.panStartMidY) * 0.03;

        camera.getWorldDirection(tempVec.current);
        tempVec2.current.set(tempVec.current.x, 0, tempVec.current.z).normalize();
        camera.position.addScaledVector(tempVec2.current, -panDeltaX);
        camera.position.y += panDeltaY;

        state.panStartMidX = midX;
        state.panStartMidY = midY;
        state.pinchStartDist = currentDist;
        state.pinchStartZoom = camera.position.length();
      } else if (touchCount === 1 && !state.isGesturing) {
        // Track single-finger movement so we can mark the gesture as a drag
        // and prevent the resulting tap from being treated as a tile click.
        const touch = e.touches[0];
        const moveX = Math.abs(touch.clientX - state.pointerDownPos.x);
        const moveY = Math.abs(touch.clientY - state.pointerDownPos.y);
        if (moveX > 10 || moveY > 10) {
          state.pointerMoved = true;
        }
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.touches.length === 0) {
        state.isGesturing = false;
        state.pointerMoved = false;
      }
    };

    const handleContextMenu = (e: Event) => {
      e.preventDefault();
    };

    canvas.addEventListener("touchstart", handleTouchStart, { passive: false });
    canvas.addEventListener("touchmove", handleTouchMove, { passive: false });
    canvas.addEventListener("touchend", handleTouchEnd, { passive: false });
    canvas.addEventListener("touchcancel", handleTouchEnd, { passive: false });
    canvas.addEventListener("contextmenu", handleContextMenu);

    return () => {
      canvas.removeEventListener("touchstart", handleTouchStart);
      canvas.removeEventListener("touchmove", handleTouchMove);
      canvas.removeEventListener("touchend", handleTouchEnd);
      canvas.removeEventListener("touchcancel", handleTouchEnd);
      canvas.removeEventListener("contextmenu", handleContextMenu);
    };
  }, [gl, camera, resetCamera]);

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

