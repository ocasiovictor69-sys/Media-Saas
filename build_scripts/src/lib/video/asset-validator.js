"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateAssets = validateAssets;
var fs_1 = __importDefault(require("fs"));
var path_1 = __importDefault(require("path"));
var assets = [
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
function validateAssets() {
    console.log("\n🔎 VALIDATING ASSETS...\n");
    var missing = [];
    for (var _i = 0, assets_1 = assets; _i < assets_1.length; _i++) {
        var asset = assets_1[_i];
        var exists = fs_1.default.existsSync(path_1.default.resolve(asset.path));
        if (!exists) {
            console.error("\u274C MISSING: ".concat(asset.name, " -> ").concat(asset.path));
            missing.push(asset.name);
        }
        else {
            console.log("\u2705 OK: ".concat(asset.name));
        }
    }
    if (missing.length > 0) {
        console.error("\n🚨 BUILD ABORTED: Missing assets detected.\n");
        process.exit(1);
    }
    console.log("\n✅ ALL ASSETS VALIDATED\n");
}
