import { useMemo, forwardRef, useImperativeHandle, useRef } from "react";
import {
  EffectComposer,
  Bloom,
  ToneMapping,
} from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";

const Effects = forwardRef((props, ref) => {
  // effect configuration
  const effectConfig = useMemo(
    () => ({
      // ToneMapping settings
      toneMapping: {
        blendFunction: BlendFunction.AVERAGE,
        adaptive: true,
        resolution: 256,
        middleGrey: 0.9,
        maxLuminance: 16.0,
        averageLuminance: 1.0,
        adaptationRate: 3.0,
      },
      // Bloom settings
      bloom: {
        intensity: 0.1,
        radius: 0.5,
        mipmapBlur: true,
      },
    }),
    []
  );

  return (
    <EffectComposer disableNormalPass multisampling={0}>
      <ToneMapping
        blendFunction={effectConfig.toneMapping.blendFunction}
        adaptive={effectConfig.toneMapping.adaptive}
        resolution={effectConfig.toneMapping.resolution}
        middleGrey={effectConfig.toneMapping.middleGrey}
        maxLuminance={effectConfig.toneMapping.maxLuminance}
        averageLuminance={effectConfig.toneMapping.averageLuminance}
        adaptationRate={effectConfig.toneMapping.adaptationRate}
      />
      <></>
      <Bloom
        intensity={effectConfig.bloom.intensity}
        radius={effectConfig.bloom.radius}
        mipmapBlur={effectConfig.bloom.mipmapBlur}
      />
    </EffectComposer>
  );
});

export default Effects;
