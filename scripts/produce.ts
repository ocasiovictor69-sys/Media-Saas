import { VideoOrchestrator } from '../src/lib/video/orchestrator';
import fs from 'fs';

async function run() {
  const orchestrator = new VideoOrchestrator();
  const result = await orchestrator.initiate('TN_FILM_001', {
    title: "The World I Left",
    narrator: "Victor Ocasio",
    modules: 7
  });
  
  console.log('--- PRODUCTION RESULT ---');
  console.log(JSON.stringify(result, null, 2));
  fs.writeFileSync('production-log.json', JSON.stringify(result, null, 2));
}

run().catch(console.error);
