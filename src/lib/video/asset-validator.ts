import fs from "fs";
import path from "path";

type AssetCheck = {
  name: string;
  path: string;
};

const assets: AssetCheck[] = [
  { name: "Voiceover Audio", path: "assets/audio/voiceover.wav" },
  { name: "Timeline JSON", path: "timeline/story.timeline.json" },

  // Runway modules
  { name: "Module 1 Runway", path: "assets/runway/module1.mp4" },
  { name: "Module 2 Runway", path: "assets/runway/module2.mp4" },
  { name: "Module 3 Runway", path: "assets/runway/module3.mp4" },
  { name: "Module 4 Runway", path: "assets/runway/module4.mp4" },
  { name: "Module 5 Runway", path: "assets/runway/module5.mp4" },
  { name: "Module 6 Runway", path: "assets/runway/module6.mp4" },
  { name: "Module 7 Runway", path: "assets/runway/module7.mp4" },
  { name: "Module 8 Runway", path: "assets/runway/module8.mp4" },

  // HyperFrames configs
  { name: "Module 1 HyperFrame", path: "assets/hyperframes/module1.json" },
  { name: "Module 2 HyperFrame", path: "assets/hyperframes/module2.json" },
  { name: "Module 3 HyperFrame", path: "assets/hyperframes/module3.json" },
  { name: "Module 4 HyperFrame", path: "assets/hyperframes/module4.json" },
  { name: "Module 5 HyperFrame", path: "assets/hyperframes/module5.json" },
  { name: "Module 6 HyperFrame", path: "assets/hyperframes/module6.json" },
  { name: "Module 7 HyperFrame", path: "assets/hyperframes/module7.json" },
  { name: "Module 8 HyperFrame", path: "assets/hyperframes/module8.json" },
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
