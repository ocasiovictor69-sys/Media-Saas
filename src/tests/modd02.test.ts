import { execute, PostProductionInputs } from '../lib/engine/modules/modd02-post-production/index';

describe('MOD-D02: Post-Production', () => {
  test('SUCCESS: Renders video and updates memory context', async () => {
    const db: any = {};
    const services: any = {
      memory: { captureContext: jest.fn().mockResolvedValue({ ok: true }) },
      production: { renderPostProduction: jest.fn().mockResolvedValue({ outputUrl: 'http://output.com/final.mp4' }) }
    };

    const inputs: PostProductionInputs = {
      manifest: {
        lead_id: 'l-123',
        script: 'Hey there!',
        bg_url: 'http://assets.com/bg.mp4'
      }
    };

    const result = await execute(inputs, db, services);

    expect(result.success).toBe(true);
    expect(result.output_url).toBe('http://output.com/final.mp4');
    expect(services.production.renderPostProduction).toHaveBeenCalled();
    expect(services.memory.captureContext).toHaveBeenCalledWith(expect.objectContaining({
      type: 'video_render_completed'
    }));
  });
});
