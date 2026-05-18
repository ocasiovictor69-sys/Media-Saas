/**
 * splice_film.ts -- Full 7-module widescreen cinematic render.
 *
 * Registers the FilmComposition composition from Root.tsx
 * and renders to assets/output/TN_FILM_FULL.mp4.
 *
 * Uses local Chrome for headless rendering (bypasses headless shell download).
 */
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import path from 'path';
import fs from 'fs';

async function run() {
  console.log('========================================');
  console.log('TOMORROWNOW AI -- FULL FILM RENDERER');
  console.log('Composition: FilmComposition (7 modules)');
  console.log('========================================\n');

  const entryPoint = path.resolve('./src/remotion/index.ts');
  const outputLocation = path.resolve('./assets/output/TN_FILM_FULL.mp4');
  const outputDir = path.dirname(outputLocation);

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Step 1: Bundle
  console.log('[1/4] Bundling Remotion composition...');
  const bundleLocation = await bundle({
    entryPoint,
    publicDir: path.resolve('./public'),
  });
  console.log(`  Bundle: ${bundleLocation}\n`);

  // Step 2: Detect Chrome
  const browserExecutable =
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const hasLocalChrome = fs.existsSync(browserExecutable);
  if (hasLocalChrome) {
    console.log(`[2/4] Local Chrome detected at: ${browserExecutable}\n`);
  } else {
    console.log('[2/4] No local Chrome -- will use default headless shell\n');
  }

  // Step 3: Select FilmComposition
  console.log('[3/4] Selecting FilmComposition...');
  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: 'FilmComposition',
    browserExecutable: hasLocalChrome ? browserExecutable : undefined,
  });
  console.log(
    `  Composition: ${composition.id}`,
    `(FPS: ${composition.fps}`,
    `Duration: ${composition.durationInFrames} frames`,
    `-- ${((composition.durationInFrames / composition.fps) / 60).toFixed(1)} minutes)`,
    `Resolution: ${composition.width}x${composition.height})\n`
  );

  // Step 4: Render
  console.log('[4/4] Rendering to MP4...');
  console.log(`  Output: ${outputLocation}\n`);

  await renderMedia({
    composition,
    serveUrl: bundleLocation,
    codec: 'h264',
    outputLocation,
    browserExecutable: hasLocalChrome ? browserExecutable : undefined,
  });

  const size = fs.statSync(outputLocation).size;
  console.log('\n========================================');
  console.log('RENDER COMPLETE');
  console.log(`  File: ${outputLocation}`);
  console.log(`  Size: ${(size / 1024 / 1024).toFixed(1)} MB`);
  console.log('========================================\n');
}

run().catch((err) => {
  console.error('Film render failed:', err);
  process.exit(1);
});
