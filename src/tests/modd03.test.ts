import { execute, DistributionInputs } from '../modules/modd03-distribution/index';

describe('MOD-D03: Distribution', () => {
  test('SUCCESS: Distributes content and updates graph memory', async () => {
    const db: any = {};
    const services: any = {
      memory: { mapRelationships: jest.fn().mockResolvedValue({ ok: true }) },
      social: { distribute: jest.fn().mockResolvedValue({ success: true, links: ['http://fb.com/vid', 'http://ig.com/vid'] }) }
    };

    const inputs: DistributionInputs = {
      content_url: 'http://output.com/final.mp4',
      platforms: ['facebook', 'instagram'],
      lead_id: 'l-123'
    };

    const result = await execute(inputs, db, services);

    expect(result.success).toBe(true);
    expect(result.links).toHaveLength(2);
    expect(services.social.distribute).toHaveBeenCalled();
    expect(services.memory.mapRelationships).toHaveBeenCalledWith(expect.objectContaining({
      event: 'CONTENT_DISTRIBUTED'
    }));
  });
});
