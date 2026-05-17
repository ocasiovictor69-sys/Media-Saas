import { validateAssets } from "./asset-validator";
import { logStep } from "./logger";
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import path from 'path';
import fs from 'fs';

export async function buildFilm(asset_id: string, metadata: any) {
  logStep("STARTING TOMORROWNOW AI PROGRAMMATIC REMOTION ENGINE");

  // 1. HARD VALIDATION GATE
  validateAssets();

  // 2. PATH DEFINITIONS
  const entryPoint = path.resolve('./src/remotion/index.ts');
  const outputLocation = path.resolve(`./assets/output/${asset_id}.mp4`);

  // Ensure output directory exists
  const outputDir = path.dirname(outputLocation);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // 3. REMOTION BUNDLE
  logStep("COMPILING & BUNDLING REMOTION TIMELINE...");
  const bundleLocation = await bundle({
    entryPoint,
  });
  logStep(`Bundle created successfully at: ${bundleLocation}`);

  // Local Chrome detection to bypass downloading headless shells
  const browserExecutable = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  const hasLocalChrome = fs.existsSync(browserExecutable);
  if (hasLocalChrome) {
    logStep(`Detected local Google Chrome at: ${browserExecutable}`);
  }

  // 4. SELECT COMPOSITION
  logStep("SELECTING COMPOSITION 'MediaComposite'...");
  const compositionId = 'MediaComposite';
  const inputProps = {
    title: metadata.title || "The World I Left",
    narrator: metadata.narrator || "Victor Ocasio",
  };

  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: compositionId,
    inputProps,
    browserExecutable: hasLocalChrome ? browserExecutable : undefined,
  });
  logStep(`Composition selected: ${composition.id} (FPS: ${composition.fps}, Duration: ${composition.durationInFrames} frames)`);

  // 5. RENDER MEDIA
  logStep("RENDERING REMOTION OUTPUT TO MP4...");
  await renderMedia({
    composition,
    serveUrl: bundleLocation,
    codec: 'h264',
    outputLocation,
    inputProps,
    browserExecutable: hasLocalChrome ? browserExecutable : undefined,
  });

  logStep(`FILM RENDER COMPLETE: ${outputLocation}`);
  return outputLocation;
}

export class VideoOrchestrator {
  async initiate(asset_id: string, metadata: any) {
    logStep(`Initiating production for: ${asset_id}`);
    
    try {
      const outputFilePath = await buildFilm(asset_id, metadata);
      return {
        success: true,
        id: asset_id,
        status: 'COMPLETE',
        output_url: outputFilePath,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error("Film build failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Pipeline failure",
        timestamp: new Date().toISOString()
      };
    }
  }
}


