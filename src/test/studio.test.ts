import { describe, expect, it } from 'vitest';
import { exportRecordingAsCypress, exportRecordingAsPlaywright } from '@/lib/studio';

describe('studio recording exporters', () => {
  it('builds playwright script from recorded events', () => {
    const script = exportRecordingAsPlaywright([
      { type: 'click', selector: '#login', value: '', x: 0, y: 0, timestamp: 1 },
      { type: 'input', selector: 'input[name="email"]', value: 'dev@example.com', x: 0, y: 0, timestamp: 2 },
    ]);

    expect(script).toContain('page.click');
    expect(script).toContain('page.fill');
  });

  it('builds cypress script from recorded events', () => {
    const script = exportRecordingAsCypress([
      { type: 'click', selector: '.cta', value: '', x: 0, y: 0, timestamp: 1 },
    ]);

    expect(script).toContain('cy.get');
    expect(script).toContain('.click()');
  });
});
