import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import React from 'react';

export const MainVideo: React.FC<{ title: string; narrator: string }> = ({ title, narrator }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entrance = spring({
    frame,
    fps,
    config: { damping: 12 },
  });

  const opacity = entrance;
  const scale = entrance;

  return (
    <AbsoluteFill style={{
      justifyContent: 'center',
      alignItems: 'center',
      background: 'linear-gradient(to right, #09090b, #111827, #1e1b4b)',
      fontFamily: 'system-ui, sans-serif',
      color: 'white',
    }}>
      <div style={{
        textAlign: 'center',
        transform: `scale(${scale})`,
        opacity,
      }}>
        <h1 style={{
          fontSize: 72,
          fontWeight: 900,
          letterSpacing: '-0.025em',
          marginBottom: 20,
          background: 'linear-gradient(to right, #818cf8, #a78bfa, #c084fc)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>
          {title}
        </h1>
        <p style={{
          fontSize: 32,
          color: '#9ca3af',
          fontWeight: 500,
        }}>
          Narrated by: <span style={{ color: '#c084fc', fontWeight: 700 }}>{narrator}</span>
        </p>
      </div>
    </AbsoluteFill>
  );
};
