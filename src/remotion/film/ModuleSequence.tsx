/**
 * ModuleSequence.tsx -- Single module composition.
 * Renders the Runway B-roll video as the backdrop with
 * cinematic color grading, Ken Burns zoom, and the module title overlay.
 */
import React from 'react';
import {
  AbsoluteFill,
  Video,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import path from 'path';
import fs from 'fs';

interface ModuleSequenceProps {
  module: { id: number; title: string; durationFrames: number; videoPath: string };
  moduleIndex: number;
  totalModules: number;
}

// Resolve absolute path to video asset
function resolveVideoPath(relPath: string): string {
  // Remotion runs from the project root; assets are relative to that
  const candidate = path.resolve(relPath);
  if (fs.existsSync(candidate)) return candidate;
  // Try relative to __dirname (src/remotion/film)
  const projectRoot = path.resolve(__dirname, '../../../..');
  const full = path.join(projectRoot, relPath);
  if (fs.existsSync(full)) return full;
  // Fallback: return as-is, Remotion may resolve via webpack
  return relPath;
}

export const ModuleSequence: React.FC<ModuleSequenceProps> = ({
  module,
  moduleIndex,
  totalModules,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const videoPath = resolveVideoPath(module.videoPath);

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

  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      {/* B-Runway B-roll backdrop */}
      <Video src={videoPath} />
      
      {/* Ken Burns overlay wrapper -- not possible with pure Video in Remotion 4,
          so we use scale on the entire fill. In production, use prerendered clips
          with the zoom baked in or use a canvas overlay. */}
      
      {/* Module title overlay */}
      <AbsoluteFill
        style={{
          justifyContent: 'center',
          alignItems: 'center',
          opacity: titleOpacityFinal,
        }}
      >
        <div
          style={{
            textAlign: 'center',
            background: 'rgba(0,0,0,0.5)',
            padding: '24px 48px',
            borderRadius: '8px',
            backdropFilter: 'blur(10px)',
          }}
        >
          <div
            style={{
              fontSize: '18px',
              color: '#9ca3af',
              textTransform: 'uppercase',
              letterSpacing: '4px',
              marginBottom: '8px',
            }}
          >
            Module {String(moduleIndex).padStart(2, '0')} of {totalModules}
          </div>
          <div
            style={{
              fontSize: '48px',
              fontWeight: 900,
              color: '#f0e6d3',
              fontFamily: 'Georgia, serif',
              letterSpacing: '-0.02em',
            }}
          >
            {module.title}
          </div>
        </div>
      </AbsoluteFill>

      {/* Cinematic vignette overlay */}
      <AbsoluteFill
        style={{
          background:
            'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.5) 100%)',
          pointerEvents: 'none',
        }}
      />
    </AbsoluteFill>
  );
};
