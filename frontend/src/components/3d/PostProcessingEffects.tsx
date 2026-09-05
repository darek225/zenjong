import { EffectComposer } from "@react-three/postprocessing";
import { Bloom, Vignette, ChromaticAberration } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import { Vector2 } from "three";
import { useMemo } from "react";

export interface PostProcessingConfig {
  bloomIntensity: number;
  vignetteDarkness: number;
  vignetteOffset: number;
  chromaticAberration: number;
  enabled: boolean;
}

export const DEFAULT_POST_PROCESSING: PostProcessingConfig = {
  bloomIntensity: 0.3,
  vignetteDarkness: 0.3,
  vignetteOffset: 0.3,
  chromaticAberration: 0.0005,
  enabled: true,
};

export function PostProcessingEffects(props: { config?: PostProcessingConfig; enabled?: boolean }) {
  const cfg = { ...DEFAULT_POST_PROCESSING, ...props.config,
    enabled: props.enabled ?? props.config?.enabled ?? DEFAULT_POST_PROCESSING.enabled };
  const offset = useMemo(
    () => new Vector2(cfg.chromaticAberration, cfg.chromaticAberration),
    [cfg.chromaticAberration]
  );

  if (!cfg.enabled) return null;

  return (
    <EffectComposer multisampling={4}>
      <Bloom
        intensity={cfg.bloomIntensity}
        blendFunction={BlendFunction.ADD}
        luminanceThreshold={0.85}
        luminanceSmoothing={0.9}
        mipmapBlur
      />
      <Vignette
        offset={cfg.vignetteOffset}
        darkness={cfg.vignetteDarkness}
      />
      <ChromaticAberration
        offset={offset}
        radialModulation={false}
        modulationOffset={0}
      />
    </EffectComposer>
  );
}