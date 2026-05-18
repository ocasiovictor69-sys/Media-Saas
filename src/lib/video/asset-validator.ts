import fs from "fs";
import path from "path";

type AssetCheck = {
  name: string;
  path: string;
};

// Source files required to initiate the Runway/FFmpeg/Remotion compilation pipeline
const assets: AssetCheck[] = [
  { name: "Timeline JSON", path: "timeline/story.timeline.json" },
  { name: "Technical teleprompter script", path: "timeline/TELEPROMPTER_SCRIPT.md" },
  { name: "Source Avatar Presenter 1", path: "assets/avatar-video/IMG_0573.MOV" },
  { name: "Source Avatar Presenter 2", path: "assets/avatar-video/IMG_0643_1.MOV" },
  { name: "Source Voiceover Audio 1", path: "assets/audio/New_Recording.m4a" },
  { name: "Source Voiceover Audio 2", path: "assets/audio/New_Recording_3.m4a" },
  { name: "Module 1 Runway Backdrop Visual", path: "assets/runway/module1.png" },
];

export function validateAssets() {
  console.log("\n🔎 VALIDATING CORE SOURCE ASSETS...\n");

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
    console.error("\n🚨 BUILD ABORTED: Missing required source assets.\n");
    process.exit(1);
  }

  console.log("\n✅ ALL CORE SOURCE ASSETS VALIDATED AND SECURED\n");
}
