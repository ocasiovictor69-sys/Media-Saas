/**
 * FilmSplicer.tsx -- Full 7-module widescreen cinematic composition for
 * "How AI Saved My Life" (TomorrowNow AI Parent Brand)
 *
 * Layers per module:
 *   1. Runway Gen-4.5 B-roll backdrop (full-frame)
 *   2. Cinematic letterbox bars
 *   3. Module badge (Roman numeral)
 *   4. Progress bar along bottom edge
 *   5. Crossfade transitions between modules
 *
 * Total estimated duration: ~256 seconds (4min 16sec) at 30fps
 */
import React from 'react';
import {
  AbsoluteFill,
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { ModuleSequence } from './ModuleSequence';
import { CrossfadeTransition } from './Transitions';
import { HUDOverlays } from './HUDOverlays';
import timeline from '../../timeline/story.timeline.json';

export const WIDTH = 1920;
export const HEIGHT = 1080;
export const FPS = 30;

// Derive module timeline data
interface ModuleInfo {
  id: number;
  title: string;
  durationFrames: number;
  startFrame: number;
  videoPath: string;
}

export const modules: ModuleInfo[] = timeline.modules.map((m: any, idx: number) => {
  const prevFrames = timeline.modules
    .slice(0, idx)
    .reduce((sum: number, pm: any) => sum + pm.estimated_duration_sec * FPS, 0);
  return {
    id: m.id,
    title: m.title,
    durationFrames: Math.ceil(m.estimated_duration_sec * FPS),
    startFrame: prevFrames,
    videoPath: m.assets.video_path,
  };
});

const totalFrames = modules.reduce((sum, m) => sum + m.durationFrames, 0);
const TRANSITION_DURATION = Math.ceil(1.5 * FPS); // 1.5sec crossfade

export const FilmSplicer: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{ background: '#000' }}>
      {modules.map((mod, idx) => {
        const isLast = idx === modules.length - 1;
        const nextDur = !isLast ? TRANSITION_DURATION : 0;

        return (
          <Sequence
            key={mod.id}
            name={mod.title}
            from={mod.startFrame}
            durationInFrames={mod.durationFrames + nextDur}
          >
            <CrossfadeTransition
              fadeOut={!isLast}
              fadeIn={idx > 0}
              transitionDuration={TRANSITION_DURATION}
            >
              <ModuleSequence
                module={mod}
                moduleIndex={idx + 1}
                totalModules={modules.length}
              />
            </CrossfadeTransition>

            {/* HUD overlays on top of each module */}
            <HUDOverlays
              moduleIndex={idx + 1}
              totalModules={modules.length}
              moduleStartFrame={mod.startFrame}
              moduleDuration={mod.durationFrames}
            />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

export const totalDurationFrames = totalFrames;
