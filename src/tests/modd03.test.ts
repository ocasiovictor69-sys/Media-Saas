import { execute, DistributionInputs } from '../lib/engine/modules/modd03-distribution/index';

describe('MOD-D03: Distribution', () => {
  test('SUCCESS: Distributes content and updates graph memory', async () => {
    process.env.BUFFER_ACCESS_TOKEN = 'test-token';
    process.env.BUFFER_FACEBOOK_CHANNEL_ID = 'fb-id';
    process.env.BUFFER_INSTAGRAM_CHANNEL_ID = 'ig-id';

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ updates: [{ id: 'mock-id' }] })
    });

    const db: any = {};
    const services: any = {
      memory: { mapRelationships: jest.fn().mockResolvedValue({ ok: true }) },
    };

    const inputs: DistributionInputs = {
      content_url: 'http://output.com/final.mp4',
      platforms: ['facebook', 'instagram'],
      lead_id: 'l-123',
      campaign_id: 'c-123',
    };

    const result = await execute(inputs, db, services);

    expect(result.success).toBe(true);
    expect(result.links).toHaveLength(2);
    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(services.memory.mapRelationships).toHaveBeenCalledWith(expect.objectContaining({
      event: 'CONTENT_DISTRIBUTED'
    }));
  });
});
