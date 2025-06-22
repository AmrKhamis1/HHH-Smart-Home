import { useMemo } from "react";
import { useThree } from "@react-three/fiber";
import {
  EffectComposer,
  Bloom,
  ToneMapping,
} from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";

const Effects = () => {
  const { gl } = useThree();

  const context = gl.getContext?.();
  const isContextLost = !context || context.isContextLost?.();

  const effectConfig = useMemo(
    () => ({
      toneMapping: {
        blendFunction: BlendFunction.AVERAGE,
        adaptive: true,
        resolution: 256,
        middleGrey: 0.9,
        maxLuminance: 16.0,
        averageLuminance: 1.0,
        adaptationRate: 3.0,
      },
      bloom: {
        intensity: 0.1,
        radius: 0.5,
        mipmapBlur: true,
      },
    }),
    []
  );

  if (isContextLost) {
    console.warn("WebGL context is lost, skipping EffectComposer.");
    return null;
  }

  return (
    <EffectComposer disableNormalPass multisampling={0}>
      <ToneMapping {...effectConfig.toneMapping} />
      <Bloom {...effectConfig.bloom} />
    </EffectComposer>
  );
};

export default Effects;
