import fs from "fs";
import path from "path";

type AssetCheck = {
  name: string;
  path: string;
};

const assets: AssetCheck[] = [
  { name: "Timeline JSON", path: "timeline/story.timeline.json" },
  { name: "Master Avatar Reference", path: "assets/avatar-video/avatar_reference.mp4" },

  // Runway modules (1-7)
  { name: "Module 1 Runway Backdrop", path: "assets/runway/module1.mp4" },
  { name: "Module 2 Runway Backdrop", path: "assets/runway/module2.mp4" },
  { name: "Module 3 Runway Backdrop", path: "assets/runway/module3.mp4" },
  { name: "Module 4 Runway Backdrop", path: "assets/runway/module4.mp4" },
  { name: "Module 5 Runway Backdrop", path: "assets/runway/module5.mp4" },
  { name: "Module 6 Runway Backdrop", path: "assets/runway/module6.mp4" },
  { name: "Module 7 Runway Backdrop", path: "assets/runway/module7.mp4" },

  // HyperFrames configs (1-7)
  { name: "Module 1 HyperFrame Config", path: "assets/hyperframes/module1.json" },
  { name: "Module 2 HyperFrame Config", path: "assets/hyperframes/module2.json" },
  { name: "Module 3 HyperFrame Config", path: "assets/hyperframes/module3.json" },
  { name: "Module 4 HyperFrame Config", path: "assets/hyperframes/module4.json" },
  { name: "Module 5 HyperFrame Config", path: "assets/hyperframes/module5.json" },
  { name: "Module 6 HyperFrame Config", path: "assets/hyperframes/module6.json" },
  { name: "Module 7 HyperFrame Config", path: "assets/hyperframes/module7.json" },

  // Voiceover audio files (1-7)
  { name: "Voiceover Audio Module 1", path: "assets/audio/voiceover_mod1.wav" },
  { name: "Voiceover Audio Module 2", path: "assets/audio/voiceover_mod2.wav" },
  { name: "Voiceover Audio Module 3", path: "assets/audio/voiceover_mod3.wav" },
  { name: "Voiceover Audio Module 4", path: "assets/audio/voiceover_mod4.wav" },
  { name: "Voiceover Audio Module 5", path: "assets/audio/voiceover_mod5.wav" },
  { name: "Voiceover Audio Module 6", path: "assets/audio/voiceover_mod6.wav" },
  { name: "Voiceover Audio Module 7", path: "assets/audio/voiceover_mod7.wav" },
];

export function validateAssets() {
  console.log("\n🔎 VALIDATING ASSETS...\n");

  let missing: string[] = [];

  for (const asset of assets) {
    const exists = fs.existsSync(path.resolve(asset.path));

    if (!exists) {
      console.error(`❌ MISSING: ${asset.name} -> ${asset.path}`);
      missing.push(asset.name);
    } else {
      console.log(`✅ OK: ${asset.name}`);
    }
  }

  if (missing.length > 0) {
    console.error("\n🚨 BUILD ABORTED: Missing assets detected.\n");
    process.exit(1);
  }

  console.log("\n✅ ALL ASSETS VALIDATED\n");
}
