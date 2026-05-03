import { execute, PreProductionInputs } from '../modules/modd01-pre-production/index';

describe('MOD-D01: Pre-Production', () => {
  test('SUCCESS: Generates video manifest and updates working memory', async () => {
    const db: any = {};
    const services: any = {
      memory: { captureContext: jest.fn().mockResolvedValue({ ok: true }) },
      video: { generateAssets: jest.fn().mockResolvedValue({ videoUrl: 'http://assets.com/bg.mp4', thumbnail: 'http://assets.com/thumb.jpg' }) }
    };

    const inputs: PreProductionInputs = {
      lead_id: 'l-123',
      archetype: 'motivated_seller',
      property_details: '3 bed 2 bath in Miami'
    };

    const result = await execute(inputs, db, services);

    expect(result.success).toBe(true);
    expect(result.manifest).toBeDefined();
    expect(result.manifest.script).toContain('motivated_seller');
    expect(services.memory.captureContext).toHaveBeenCalled();
  });
});
