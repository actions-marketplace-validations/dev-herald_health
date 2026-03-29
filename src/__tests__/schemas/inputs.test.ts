import { describe, expect, it } from 'vitest';
import { actionInputsSchema } from '../../schemas/inputs';

const base = {
  apiKey: 'k',
  apiUrl: 'https://dev-herald.com/api/v1/health/ingest',
};

describe('actionInputsSchema', () => {
  it('accepts single knip path only', () => {
    const r = actionInputsSchema.safeParse({
      ...base,
      knipReportPath: 'knip.json',
    });
    expect(r.success).toBe(true);
  });

  it('accepts multiline knip paths only', () => {
    const r = actionInputsSchema.safeParse({
      ...base,
      knipReportPathsRaw: 'a.json\nb.json',
    });
    expect(r.success).toBe(true);
  });

  it('rejects both single and multi', () => {
    const r = actionInputsSchema.safeParse({
      ...base,
      knipReportPath: 'x.json',
      knipReportPathsRaw: 'a.json',
    });
    expect(r.success).toBe(false);
  });

  it('rejects neither', () => {
    const r = actionInputsSchema.safeParse({
      ...base,
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
