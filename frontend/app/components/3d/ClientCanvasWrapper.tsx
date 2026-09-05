import React, { useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";

interface ClientCanvasWrapperProps {
  children: React.ReactNode;
  onCreated?: (canvas: HTMLCanvasElement) => void;
  onDestroy?: () => void;
  className?: string;
}

const ClientCanvasWrapper: React.FC<ClientCanvasWrapperProps> = ({
  children,
  onCreated,
  onDestroy,
  className = "",
}) => {
  const [mounted, setMounted] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setMounted(true);
    }
    return () => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      }
      onDestroy?.();
    };
  }, [onDestroy]);

  useEffect(() => {
    if (!mounted || !wrapperRef.current) return;
    const wrapper = wrapperRef.current;
    wrapper.style.minHeight = "500px";
    wrapper.style.minWidth = "400px";
    wrapper.style.position = "relative";
    resizeObserverRef.current = new ResizeObserver(() => {});
    if (resizeObserverRef.current) {
      resizeObserverRef.current.observe(wrapper);
    }
    return () => {
      resizeObserverRef.current?.disconnect();
    };
  }, [mounted]);

  return (
    <div
      className={`w-full h-screen min-h-[500px] relative bg-black/95 ${className}`}
      ref={wrapperRef}
      style={{
        minHeight: "500px",
        minWidth: "400px",
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden"
      }}
    >
      {mounted && (
        <Canvas
          onCreated={({ gl }) => {
            const canvas = gl.domElement;
            if (canvas) {
              if (canvas.width === 0 || canvas.height === 0) {
                gl.setSize(
                  Math.max(canvas.clientWidth, 400),
                  Math.max(canvas.clientHeight, 500)
                );
              }
              onCreated?.(canvas);
            }
          }}
        >
          {children}
        </Canvas>
      )}
      {!mounted && (
        <div
          className="absolute inset-0 flex items-center justify-center text-gray-400"
          style={{ fontSize: "1.5rem" }}
        >
          Initializing WebGL Canvas...
        </div>
      )}
    </div>
  );
};

export default ClientCanvasWrapper;