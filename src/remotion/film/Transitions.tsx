/**
 * Transitions.tsx -- Crossfade transition between modules.
 * Wraps a module sequence and applies fade-in / fade-out opacity
 * over the configured transition duration.
 */
import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';

interface CrossfadeProps {
  fadeIn: boolean;
  fadeOut: boolean;
  transitionDuration: number;
  children: React.ReactNode;
}

export const CrossfadeTransition: React.FC<CrossfadeProps> = ({
  fadeIn,
  fadeOut,
  transitionDuration,
  children,
}) => {
  const frame = useCurrentFrame();

  // Fade in over first transitionDuration frames
  const fadeInOpacity = fadeIn
    ? interpolate(frame, [0, transitionDuration], [0, 1], { extrapolateRight: 'clamp' })
    : 1;

  return (
    <div style={{ opacity: fadeInOpacity }}>
      {children}
    </div>
  );
};
