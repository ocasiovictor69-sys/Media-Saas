/**

 * ModuleClip.tsx -- Single module: Runway B-roll + letterbox bars + title.

 */

import React from 'react';

import {

  AbsoluteFill,

  interpolate,

  spring,

  useCurrentFrame,

  useVideoConfig,

  staticFile,

} from 'remotion';



interface ModuleClipProps {

  module: {

    id: number;

    title: string;

    durationFrames: number;

    videoRelPath: string;

  };

  moduleIndex: number;

}



export const ModuleClip: React.FC<ModuleClipProps> = ({ module, moduleIndex }) => {

  const frame = useCurrentFrame();

  const { fps } = useVideoConfig();



  const romanNumerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];



  // Title fade in

  const titleIn = spring({

    frame,

    fps,

    config: { damping: 10 },

    from: 0,

    to: 1,

  });



  // Title fade out 2 sec before module end

  const fadeStart = module.durationFrames - 2 * fps;

  const titleOpacity =

    frame < fadeStart

      ? titleIn

      : interpolate(frame, [fadeStart, module.durationFrames], [titleIn, 0], {

          extrapolateLeft: 'clamp',

          extrapolateRight: 'clamp',

        });



  // Remotion staticFile resolves from public/

  const videoSrc = staticFile(module.videoRelPath);



  return (

    <AbsoluteFill style={{ background: '#000' }}>

      {/* Runway B-roll -- uses img tag as Remotion-compatible video placeholder.

          For production video, use the Video component with a compatible codec. */}

      <AbsoluteFill>

        <img

          src={videoSrc}

          style={{

            width: '100%',

            height: '100%',

            objectFit: 'cover',

          }}

        />

      </AbsoluteFill>



      {/* Letterbox bars */}

      <div

        style={{

          position: 'absolute',

          top: 0,

          left: 0,

          right: 0,

          height: 56,

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

          height: 56,

          background: '#000',

          zIndex: 10,

        }}

      />



      {/* Title overlay */}

      <AbsoluteFill

        style={{

          justifyContent: 'flex-end',

          alignItems: 'center',

          paddingBottom: 80,

          zIndex: 20,

          opacity: titleOpacity,

        }}

      >

        <div style={{ textAlign: 'center' }}>

          <div

            style={{

              fontSize: 16,

              color: '#9ca3af',

              textTransform: 'uppercase',

              letterSpacing: '4px',

              marginBottom: 6,

            }}

          >

            Part {romanNumerals[moduleIndex - 1]}

          </div>

          <div

            style={{

              fontSize: 40,

              fontWeight: 900,

              color: '#ffffff',

              fontFamily: 'Georgia, serif',

              letterSpacing: '-0.02em',

              textShadow: '0 2px 20px rgba(0,0,0,0.7)',

            }}

          >

            {module.title}

          </div>

        </div>

      </AbsoluteFill>



      {/* Vignette */}

      <AbsoluteFill

        style={{

          background:

            'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.4) 100%)',

          pointerEvents: 'none',

        }}

      />

    </AbsoluteFill>

  );

};

