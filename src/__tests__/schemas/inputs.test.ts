import { describe, expect, it } from 'vitest';
import { actionInputsSchema } from '../../schemas/inputs';

const base = {
  apiKey: 'k',
  apiUrl: 'https://dev-herald.com/api/v1/health/ingest',
};

describe('actionInputsSchema', () => {
  it('accepts knip path', () => {
    const r = actionInputsSchema.safeParse({
      ...base,
      knipReportPath: 'knip.json',
    });
    expect(r.success).toBe(true);
  });

  it('trims knip path', () => {
    const r = actionInputsSchema.safeParse({
      ...base,
      knipReportPath: '  knip.json  ',
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.knipReportPath).toBe('knip.json');
    }
  });

  it('rejects empty knip path', () => {
    const r = actionInputsSchema.safeParse({
      ...base,
      knipReportPath: '',
    });
    expect(r.success).toBe(false);
  });

  it('rejects whitespace-only knip path', () => {
    const r = actionInputsSchema.safeParse({
      ...base,
      knipReportPath: '   ',
    });
    expect(r.success).toBe(false);
  });

  it('rejects non-https api-url', () => {
    const r = actionInputsSchema.safeParse({
      ...base,
      knipReportPath: 'x.json',
      apiUrl: 'http://example.com/api',
    });
    expect(r.success).toBe(false);
  });
});
