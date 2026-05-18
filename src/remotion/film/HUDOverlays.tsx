/**
 * HUDOverlays.tsx -- Heads-up display elements:
 * - Roman numeral module badge (top-left)
 * - Animated progress bar (bottom)
 * - Film grain overlay (optional)
 */
import React from 'react';
import { AbsoluteFill } from 'remotion';

interface HUDProps {
  moduleIndex: number;
  totalModules: number;
  moduleStartFrame: number;
  moduleDuration: number;
}

const romanNumerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

export const HUDOverlays: React.FC<HUDProps> = ({
  moduleIndex,
  totalModules,
  moduleDuration,
}) => {
  const overallProgress = moduleIndex / totalModules;

  return (
    <>
      {/* Module badge */}
      <div
        style={{
          position: 'absolute',
          top: 24,
          left: 32,
          fontSize: '28px',
          fontWeight: 700,
          fontFamily: 'Georgia, serif',
          color: '#e94560',
          opacity: 0.6,
          zIndex: 100,
        }}
      >
        {romanNumerals[moduleIndex - 1] || moduleIndex}
      </div>

      {/* Progress bar */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          width: '100%',
          height: 3,
          background: 'rgba(255,255,255,0.1)',
          zIndex: 100,
        }}
      >
        <div
          style={{
            width: `${overallProgress * 100}%`,
            height: '100%',
            background: '#e94560',
            transition: 'width 0.5s ease',
          }}
        />
      </div>
    </>
  );
};
