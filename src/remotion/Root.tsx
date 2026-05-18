import { Composition } from 'remotion';
import { MainVideo } from './MainVideo';
import { FilmSplicer, totalDurationFrames, WIDTH, HEIGHT, FPS } from './film/FilmSplicer';
import React from 'react';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* Legacy title card -- baseline render */}
      <Composition
        id="MediaComposite"
        component={MainVideo}
        durationInFrames={150}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          title: "TomorrowNow AI",
          narrator: "Victor Ocasio"
        }}
      />

      {/* Full 7-module widescreen cinematic composition */}
      <Composition
        id="FilmComposition"
        component={FilmSplicer}
        durationInFrames={totalDurationFrames}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
    </>
  );
};
