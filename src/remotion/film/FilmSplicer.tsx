/**
 * FilmSplicer.tsx -- Full 7-module widescreen cinematic composition.
 * Sequentially renders each Runway B-roll with letterbox bars and overlays.
 *
 * Video paths: runway/moduleN.mp4 (served from public/ via staticFile)
 */
import React from 'react';
import { AbsoluteFill, Sequence, useCurrentFrame } from 'remotion';
import { ModuleClip } from './ModuleClip';

export const WIDTH = 1920;
export const HEIGHT = 1080;
export const FPS = 30;

interface ModuleInfo {
  id: number;
  title: string;
  durationSec: number;
  durationFrames: number;
  startFrame: number;
  // Path relative to public/ directory for staticFile()
  videoRelPath: string;
}

const moduleData: { title: string; seconds: number }[] = [
  { title: 'THE WORLD I LEFT', seconds: 24 },
  { title: 'THE OBSOLETE MODEL', seconds: 52 },
  { title: 'STONE AGE & ROCK BOTTOM', seconds: 30 },
  { title: 'THE KEY', seconds: 35 },
  { title: 'THE PRISON OF THE MIND', seconds: 40 },
  { title: 'REINVENTION & CODE', seconds: 30 },
  { title: 'TOMORROWNOW AI', seconds: 45 },
];

export const modules: ModuleInfo[] = moduleData.map((d, idx) => {
  const startFrame = moduleData
    .slice(0, idx)
    .reduce((s, m) => s + m.seconds * FPS, 0);
  return {
    id: idx + 1,
    title: d.title,
    durationSec: d.seconds,
    durationFrames: d.seconds * FPS,
    startFrame,
    videoRelPath: `runway/module${idx + 1}.mp4`,
  };
});

const totalFrames = modules.reduce((s, m) => s + m.durationFrames, 0);

export const FilmSplicer: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: '#000' }}>
      {modules.map((mod, idx) => (
        <Sequence
          key={mod.id}
          name={mod.title}
          from={mod.startFrame}
          durationInFrames={mod.durationFrames}
        >
          <ModuleClip module={mod} moduleIndex={idx + 1} />
        </Sequence>
      ))}
      <GlobalProgressHUD totalModules={modules.length} />
    </AbsoluteFill>
  );
};

export const totalDurationFrames = totalFrames;

/* ---------- Global Progress HUD ---------- */

const romanNumerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];

const GlobalProgressHUD: React.FC<{ totalModules: number }> = ({ totalModules }) => {
  const frame = useCurrentFrame();

  // Find currently active module
  let activeIdx = modules.length - 1;
  for (let i = modules.length - 1; i >= 0; i--) {
    if (frame >= modules[i].startFrame) {
      activeIdx = i;
      break;
    }
  }
  const modIndex = activeIdx + 1;

  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      {/* Module badge top-left */}
      <div
        style={{
          position: 'absolute',
          top: 16,
          left: 24,
          fontFamily: 'Georgia, serif',
          fontSize: 24,
          fontWeight: 700,
          color: '#e94560',
          opacity: 0.45,
          zIndex: 100,
        }}
      >
        {romanNumerals[modIndex - 1] || modIndex}
      </div>

      {/* Progress bar */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          width: '100%',
          height: 3,
          background: 'rgba(255,255,255,0.06)',
          zIndex: 100,
        }}
      >
        <div
          style={{
            width: `${(modIndex / totalModules) * 100}%`,
            height: '100%',
            background: '#e94560',
          }}
        />
      </div>
    </AbsoluteFill>
  );
};
