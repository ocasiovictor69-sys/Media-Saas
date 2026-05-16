import { validateAssets } from './src/lib/video/asset-validator.js';

try {
  validateAssets();
  console.log('Test run successful: All gates passed.');
} catch (e) {
  console.error('Test run failed:', e);
}
