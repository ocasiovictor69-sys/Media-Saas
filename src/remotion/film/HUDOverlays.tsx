/**
 * HUDOverlays.tsx -- Heads-up display elements:
 * - Roman numeral module badge (driven by Hyperframe badge config)
 * - Animated progress bar (driven by Hyperframe progress_bar config)
 */
import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';

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

interface HUDProps {
  moduleIndex: number;
  totalModules: number;
  moduleStartFrame: number;
  moduleDuration: number;
}

export const HUDOverlays: React.FC<HUDProps> = ({
  moduleIndex,
  totalModules,
  moduleDuration,
}) => {
  const frame = useCurrentFrame();

  // Load hyperframe configuration for this specific module
  const hf = hyperframesMap[moduleIndex] || hf1;
  const overlays = hf.overlays || {};
  const badge = overlays.module_badge || {};
  const pBar = overlays.progress_bar || {};

  // Animated progress bar width over this single module's duration
  const progressWidth = interpolate(
    frame,
    [0, moduleDuration],
    [0, 100],
    { extrapolateRight: 'clamp' }
  );

  return (
    <>
      {/* Module badge driven by Hyperframe config */}
      <div
        style={{
          position: 'absolute',
          top: badge.position?.y !== undefined ? (typeof badge.position.y === 'number' ? `${badge.position.y * 100}%` : badge.position.y) : 24,
          left: badge.position?.x !== undefined ? (typeof badge.position.x === 'number' ? `${badge.position.x * 100}%` : badge.position.x) : 32,
          fontSize: '28px',
          fontWeight: 700,
          fontFamily: 'Georgia, serif',
          color: pBar.color || '#e94560',
          opacity: badge.opacity ?? 0.3,
          zIndex: 100,
        }}
      >
        {badge.text || moduleIndex}
      </div>

      {/* Progress bar driven by Hyperframe config */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          width: '100%',
          height: pBar.height || 3,
          background: 'rgba(255,255,255,0.1)',
          zIndex: 100,
        }}
      >
        <div
          style={{
            width: `${progressWidth}%`,
            height: '100%',
            background: pBar.color || '#e94560',
          }}
        />
      </div>
    </>
  );
};
