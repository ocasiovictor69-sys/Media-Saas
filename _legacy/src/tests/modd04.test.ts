import { execute, EngagementInputs } from '../lib/engine/modules/modd04-engagement/index';

describe('MOD-D04: Engagement & Loop', () => {
  test('SUCCESS: Processes comments and updates engagement history', async () => {
    const db: any = {};
    const services: any = {
      memory: { mapRelationships: jest.fn().mockResolvedValue({ ok: true }) },
      social: { monitorEngagement: jest.fn().mockResolvedValue({ comments: [{ text: 'Great video!', author: 'user_1' }] }) }
    };

    const inputs: EngagementInputs = {
      channel_id: 'ch-123',
      lead_id: 'l-123'
    };

    const result = await execute(inputs, db, services);

    expect(result.success).toBe(true);
    expect(result.engagement_count).toBe(1);
    expect(services.social.monitorEngagement).toHaveBeenCalled();
    expect(services.memory.mapRelationships).toHaveBeenCalledWith(expect.objectContaining({
      event: 'ENGAGEMENT_PROCESSED'
    }));
  });
});
