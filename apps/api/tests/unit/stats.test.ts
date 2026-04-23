import { describe, expect, it } from 'vitest';
import { computeStats } from '../../src/modules/campaigns/stats.js';

describe('computeStats', () => {
  it('returns all zeros for an empty campaign (no divide-by-zero)', () => {
    expect(computeStats({ total: 0, sent: 0, failed: 0, opened: 0 })).toEqual({
      total: 0,
      sent: 0,
      failed: 0,
      opened: 0,
      open_rate: 0,
      send_rate: 0,
    });
  });

  it('rounds rates to 4 decimals', () => {
    const result = computeStats({ total: 3, sent: 1, failed: 2, opened: 0 });
    expect(result.send_rate).toBeCloseTo(0.3333, 4);
    expect(result.open_rate).toBe(0);
  });

  it('open_rate uses sent as the denominator, not total', () => {
    // 10 recipients, 5 sent, 0 failed, 5 pending, 3 opened
    // open_rate should be 3/5 = 0.6, not 3/10 = 0.3
    const result = computeStats({ total: 10, sent: 5, failed: 0, opened: 3 });
    expect(result.send_rate).toBe(0.5);
    expect(result.open_rate).toBe(0.6);
  });

  it('when nothing was sent, open_rate is 0 even if opened > 0 (defensive)', () => {
    const result = computeStats({ total: 10, sent: 0, failed: 0, opened: 2 });
    expect(result.open_rate).toBe(0);
  });
});
