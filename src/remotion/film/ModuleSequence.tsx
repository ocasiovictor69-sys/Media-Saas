/**
 * ModuleSequence.tsx -- Single module composition.
 * Renders the Runway B-roll video as the backdrop with
 * cinematic color grading, Ken Burns zoom, and the module title overlay.
 *
 * Guided by Hyperframe JSON configuration specifications.
 */
import React from 'react';
import {
  AbsoluteFill,
  Video,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  staticFile,
} from 'remotion';

// Import hyperframe JSON configurations for deterministic design
import hf1 from '../../../assets/hyperframes/module1.json';
import hf2 from '../../../assets/hyperframes/module2.json';
import hf3 from '../../../assets/hyperframes/module3.json';
import hf4 from '../../../assets/hyperframes/module4.json';
import hf5 from '../../../assets/hyperframes/module5.json';
import hf6 from '../../../assets/hyperframes/module6.json';
import hf7 from '../../../assets/hyperframes/module7.json';

const hyperframesMap: Record<number, any> = {
  1: hf1,
  2: hf2,
  3: hf3,
  4: hf4,
  5: hf5,
  6: hf6,
  7: hf7,
};

interface ModuleSequenceProps {
  module: { id: number; title: string; durationFrames: number; videoPath: string };
  moduleIndex: number;
  totalModules: number;
}

export const ModuleSequence: React.FC<ModuleSequenceProps> = ({
  module,
  moduleIndex,
  totalModules,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Load hyperframe configuration for this specific module
  const hf = hyperframesMap[module.id] || hf1;
  const cg = hf.color_grading || {};
  const typo = hf.typography || {};
  const comp = hf.composition || {};

  // Resolve static video source mapped to the public directory
  const videoRelPath = module.videoPath.replace('assets/', '');
  const videoSrc = staticFile(videoRelPath);

  // Ken Burns slow zoom: scale 1.0 -> 1.15 over module duration
  const scale = interpolate(
    frame,
    [0, module.durationFrames],
    [1.0, 1.08],
    { extrapolateRight: 'clamp' }
  );

  // Title fade-in at start
  const titleOpacity = spring({
    frame: frame,
    fps,
    config: { damping: 10 },
    from: 0,
    to: 1,
  });

  // Title fade-out starting 2 seconds before module end
  const fadeOutStart = module.durationFrames - 2 * fps;
  const titleOpacityFinal =
    frame > fadeOutStart
      ? interpolate(frame, [fadeOutStart, module.durationFrames], [1, 0], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        })
      : titleOpacity;

  // Cinematic letterbox heights
  const letterboxHeight = comp.letterbox_height || 80;

  return (
    <AbsoluteFill style={{ overflow: 'hidden', background: '#000' }}>
      {/* B-Runway B-roll backdrop with dynamic hardware-accelerated CSS color grading */}
      <AbsoluteFill
        style={{
          transform: `scale(${scale})`,
          filter: `saturate(${cg.saturation ?? 0.6}) contrast(${cg.contrast ?? 1.2})`,
        }}
      >
        <Video 
          src={videoSrc} 
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />
      </AbsoluteFill>

      {/* Cinematic Letterbox Bars */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: letterboxHeight,
          background: '#000',
          zIndex: 10,
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: letterboxHeight,
          background: '#000',
          zIndex: 10,
        }}
      />
      
      {/* Module title overlay */}
      <AbsoluteFill
        style={{
          justifyContent: 'center',
          alignItems: 'center',
          opacity: titleOpacityFinal,
          zIndex: 20,
        }}
      >
        <div
          style={{
            textAlign: 'center',
            background: 'rgba(0,0,0,0.5)',
            padding: '24px 48px',
            borderRadius: '8px',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.05)',
          }}
        >
          <div
            style={{
              fontSize: '18px',
              color: typo.caption_color || '#9ca3af',
              textTransform: 'uppercase',
              letterSpacing: '4px',
              marginBottom: '8px',
            }}
          >
            Module {String(moduleIndex).padStart(2, '0')} of {totalModules}
          </div>
          <div
            style={{
              fontSize: `${typo.title_size ? typo.title_size / 2 : 48}px`,
              fontWeight: 900,
              color: typo.title_color || '#f0e6d3',
              fontFamily: typo.title_font || 'Georgia, serif',
              letterSpacing: '-0.02em',
              textShadow: '0 2px 20px rgba(0,0,0,0.8)',
            }}
          >
            {module.title}
          </div>
        </div>
      </AbsoluteFill>

      {/* Cinematic vignette overlay driven by vignette strength */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,${cg.vignette_strength ?? 0.4}) 100%)`,
          pointerEvents: 'none',
          zIndex: 15,
        }}
      />
    </AbsoluteFill>
  );
};
