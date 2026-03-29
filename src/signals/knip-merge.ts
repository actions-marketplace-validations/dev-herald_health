import type { KnipReport } from '../schemas/knip-report';

export function mergeKnipReports(reports: KnipReport[]): KnipReport {
  if (reports.length === 0) {
    return { issues: [] };
  }
  if (reports.length === 1) {
    return reports[0]!;
  }

  const issues = reports.flatMap((r) => r.issues);
  const merged: KnipReport = { issues };
  const allTopFiles = reports.flatMap((r) => (Array.isArray(r.files) ? r.files : []));
  if (allTopFiles.length > 0) {
    merged.files = [...new Set(allTopFiles)];
  }

  return merged;
}
