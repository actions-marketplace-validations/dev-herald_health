import type { KnipReport } from '../schemas/knip-report';

export interface KnipAggregates {
  unusedFiles: number;
  unusedDependencies: number;
}

export function mapKnipReportToSignals(report: KnipReport): KnipAggregates {
  const filePaths = new Set<string>();

  if (Array.isArray(report.files)) {
    for (const p of report.files) {
      if (typeof p === 'string' && p.length > 0) {
        filePaths.add(p);
      }
    }
  }

  let unusedDeps = 0;
  for (const issue of report.issues) {
    if (Array.isArray(issue.files)) {
      for (const entry of issue.files) {
        if (entry && typeof entry.name === 'string' && entry.name.length > 0) {
          filePaths.add(entry.name);
        }
      }
    }
    const d = issue.dependencies;
    const dd = issue.devDependencies;
    if (Array.isArray(d)) unusedDeps += d.length;
    if (Array.isArray(dd)) unusedDeps += dd.length;
  }

  return {
    unusedFiles: filePaths.size,
    unusedDependencies: unusedDeps,
  };
}
