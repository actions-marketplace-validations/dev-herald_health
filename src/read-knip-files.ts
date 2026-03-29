import * as fs from 'fs';
import { knipReportSchema, type KnipReport } from './schemas/knip-report';

export function readAndValidateKnipReport(path: string): KnipReport {
  let rawText: string;
  try {
    rawText = fs.readFileSync(path, 'utf8');
  } catch (e) {
    const err = e as NodeJS.ErrnoException;
    throw new Error(`Could not read knip report at ${path}: ${err.message}`);
  }

  let raw: unknown;
  try {
    raw = JSON.parse(rawText) as unknown;
  } catch {
    throw new Error(`Invalid JSON in knip report: ${path}`);
  }

  const parsed = knipReportSchema.safeParse(raw);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Knip report failed schema validation (${path}): ${msg}`);
  }
  return parsed.data;
}
