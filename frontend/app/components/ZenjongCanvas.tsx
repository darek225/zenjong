import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { PostProcessingEffects } from "../../src/components/3d/PostProcessingEffects";
import { useEffect, useRef, useState, useCallback } from "react";
import { ACESFilmicToneMapping } from "three";
import * as THREE from "three";
import MahjongTile from "./MahjongTile";
import ProceduralRoom from "./environments/ProceduralRoom";
import MatchReaction from "./MatchReaction";
import type { SolitaireTile } from "../../lib/solitaire";
import AmbientParticles from "./environments/AmbientParticles";
import BrazierFlames from "./environments/BrazierFlames";
import SpotlightBeams from "./environments/SpotlightBeams";
import { ENVIRONMENTS, MapTheme } from "../../lib/environments";
import { getTileType, sortTileIds } from "../../lib/networkState";

interface ZenjongCanvasProps {
  board?: SolitaireTile[];
  freeIds?: Set<string>;
  reaction?: SolitaireTile[];
  revision?: number;
  paused?: boolean;
  backColor?: string;
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
  ISO_3D: { position: [0, 15, 12], fov: 45 },
  LOW_ARCADE: { position: [0, 6, 14], fov: 50 },
};

/**
 * Touch gesture handler with:
 * - Two-finger pan (translate camera horizontally)
 * - Pinch-to-zoom (scale camera distance)
 * - Double-tap reset (quickly tap twice to reset camera)
 * - Ghost click prevention (block single-finger taps during pan/zoom gestures)
 */
/**
 * WebGL context loss recovery handler.
 * Listens for `webglcontextlost` and `webglcontextrestored` events
 * on the canvas element and triggers a re-render to prevent white-screen crashes.
 */
function WebGLContextLossHandler({ onChange }: { onChange: (lost: boolean) => void }) {
  const { gl, get, setFrameloop, invalidate } = useThree();

  useEffect(() => {
    const canvas = gl.domElement;
    let previousFrameloop = get().frameloop;

    const handleContextLost = (e: Event) => {
      e.preventDefault();
      if (get().frameloop !== "never") previousFrameloop = get().frameloop;
      setFrameloop("never");
      onChange(true);
    };

    const handleContextRestored = () => {
      setFrameloop(previousFrameloop);
      onChange(false);
      invalidate();
    };

    canvas.addEventListener("webglcontextlost", handleContextLost);
    canvas.addEventListener("webglcontextrestored", handleContextRestored);

    return () => {
      canvas.removeEventListener("webglcontextlost", handleContextLost);
      canvas.removeEventListener("webglcontextrestored", handleContextRestored);
    };
  }, [gl, get, setFrameloop, invalidate, onChange]);

  return null;
}

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
      camera.position.set(0, 15, 12);
      camera.lookAt(0, 0, 0);
      camera.fov = 45;
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
      if (e.target instanceof HTMLElement &&
        (e.target.isContentEditable || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName))) return;
      if (e.key === "1") onCameraPresetChange?.("TOP_DOWN");
      if (e.key === "2") onCameraPresetChange?.("ISO_3D");
      if (e.key === "3") onCameraPresetChange?.("LOW_ARCADE");
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onCameraPresetChange]);
  return null;
}

function CameraRig({ preset }: { preset: string }) {
  const { camera, size } = useThree();
  useEffect(() => {
    if (!(camera instanceof THREE.PerspectiveCamera)) return;
    const config = CAMERA_PRESETS[preset] ?? CAMERA_PRESETS.ISO_3D;
    camera.position.set(...config.position);
    camera.fov = config.fov;
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  }, [camera, preset]);
  useEffect(() => {
    if (!(camera instanceof THREE.PerspectiveCamera)) return;
    // Preserve the specified pose/FOV while fitting a full rack on portrait screens.
    camera.zoom = Math.min(1, size.width / Math.max(1, size.height) / 1.25);
    camera.updateProjectionMatrix();
  }, [camera, size.width, size.height]);
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
  board, freeIds, reaction = [], revision = 0, paused = false, backColor,
  children, myTiles, discardPile, selectedTiles,
  onTileClick, onTileHover, isMyTurn, discardTile,
  selectedMapId, isDualCamera, currentCameraPreset, onCameraPresetChange, triggerShake,
}: ZenjongCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isClient, setIsClient] = useState(false);
  const [contextLost, setContextLost] = useState(false);
  const validTiles = sortTileIds(myTiles ?? []);
  const validDiscards = (discardPile ?? []).filter(id => typeof id === "string" && getTileType(id));
  useEffect(() => { setIsClient(true); }, []);

  const theme: MapTheme | undefined = ENVIRONMENTS.find(
    (env) => env.id === selectedMapId
  );

  const preset = currentCameraPreset ?? (isDualCamera ? "TOP_DOWN" : "ISO_3D");
  const cameraConfig = CAMERA_PRESETS[preset] ?? CAMERA_PRESETS.ISO_3D;

  if (!isClient) {
    return <div className="w-full h-full relative" />;
  }

  return (
    <div className="w-full h-full relative">
      <Canvas
        ref={canvasRef}
        camera={cameraConfig}
        onCreated={({ gl, camera }) => {
          camera.lookAt(0, 0, 0);
          gl.setClearColor(
            theme ? parseInt(theme.palette.background.slice(1), 16) : 0x1a1a1a
          );
          gl.shadowMap.enabled = true;
          gl.shadowMap.type = THREE.PCFSoftShadowMap;
          gl.toneMapping = ACESFilmicToneMapping;
          gl.toneMappingExposure = 1;
        }}
        gl={{ antialias: true }}
        dpr={[1, 2]}
        shadows={{ type: THREE.PCFSoftShadowMap }}
      >
        <WebGLContextLossHandler onChange={setContextLost} />
        <CameraPresetHandler onCameraPresetChange={onCameraPresetChange} />
        <CameraRig preset={preset} />
        {triggerShake && triggerShake > 0 && <ShakeEffect intensity={triggerShake} />}

        <ambientLight intensity={0.45} />
        <hemisphereLight args={["#e6eee8", "#24312a", 0.35]} />
        <directionalLight position={[4, 12, 6]} intensity={1.1} castShadow shadow-mapSize={[2048, 2048]} shadow-camera-near={0.5} shadow-camera-far={50} shadow-camera-top={10} shadow-camera-bottom={-10} shadow-camera-left={-10} shadow-camera-right={10} shadow-bias={-0.0001} shadow-normalBias={0.025} shadow-radius={3} />

        <ProceduralRoom theme={theme ?? ENVIRONMENTS[0]} />

        <mesh position={[0, -0.2, 0]} receiveShadow>
          <boxGeometry args={[14, 0.4, 10]} />
          <meshStandardMaterial color="#1b4d2e" roughness={0.95} metalness={0} />
        </mesh>

        {theme && theme.hasFlames && (
          <>
            <BrazierFlames position={[-8, 0, -4]} size={0.4} color={theme.palette.accent} />
            <BrazierFlames position={[8, 0, -4]} size={0.4} color={theme.palette.accent} />
          </>
        )}

        {theme && theme.hasSpotlights && (
          <>
            <SpotlightBeams position={[-2, 5, -2]} height={6} angle={0.4} color="#fff176" />
            <SpotlightBeams position={[2, 5, -2]} height={6} angle={0.4} color="#fff176" />
          </>
        )}

        {theme && <AmbientParticles color={theme.palette.accent} count={40} radius={10} speed={0.15} size={0.04} />}

        {board?.map(tile => <MahjongTile key={tile.id}
          position={[tile.x * 0.88, 0.25 + tile.layer * 0.52, tile.z * 1.16]}
          rotation={[-Math.PI / 2, 0, 0]} tileId={tile.id} tileType={tile.face}
          selected={selectedTiles.includes(tile.id)} backColor={backColor}
          blocked={paused || !freeIds?.has(tile.id)} onClick={onTileClick} />)}
        {board && <MatchReaction key={revision} tiles={reaction} />}
        {!board && validTiles.map((tileId, index) => {
          const x = (index - (validTiles.length - 1) / 2) * 0.88;
          const isSelected = selectedTiles.includes(tileId);
          return (
            <MahjongTile key={`${tileId}-${index}`} position={[x, 0.62, 4]} rotation={[-Math.PI / 8, 0, 0]} tileId={tileId} tileType={getTileType(tileId)} selected={isSelected}
              onClick={() => { if (isMyTurn && isSelected) discardTile(tileId); else onTileClick(tileId); }}
              onHover={onTileHover} />
          );
        })}

        {validDiscards.map((tileId, index) => {
          // Twelve columns, five rows per tier keep even a long round on the felt.
          const x = ((index % 12) - 5.5) * 0.88;
          const z = (Math.floor(index / 12) % 5 - 2) * 1.18 - 0.5;
          const y = 0.25 + Math.floor(index / 60) * 0.5;
          return (
            <MahjongTile key={`discard-${tileId}-${index}`} position={[x, y, z]} rotation={[-Math.PI / 2, 0, 0]} tileId={tileId} tileType={getTileType(tileId)} />
          );
        })}

        {children}
        <OrbitControls makeDefault target={[0, 0, 0]} enableZoom enablePan={false}
          enableRotate={!isDualCamera} minDistance={12} maxDistance={35}
          minPolarAngle={0.01} maxPolarAngle={Math.PI / 2.5} />

        <PostProcessingEffects />
      </Canvas>
      {contextLost && (
        <div role="status" className="absolute inset-0 z-50 flex items-center justify-center bg-black/85 text-white">
          Graphics interrupted. Waiting for WebGL to recover.
        </div>
      )}
    </div>
  );
}

