import { Composition } from 'remotion';
import { MainVideo } from './MainVideo';
import React from 'react';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="MediaComposite"
        component={MainVideo}
        durationInFrames={150} // 5 seconds at 30 fps
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          title: "TomorrowNow AI",
          narrator: "Victor Ocasio"
        }}
      />
    </>
  );
};
