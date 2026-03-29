import type { KnipAggregates } from './signals/knip';
import { healthIngestRequestSchema, type HealthIngestRequest } from './schemas/ingest-body';

export interface BuildPayloadOptions {
  knip: KnipAggregates;
  repositoryFullName?: string;
  commitSha?: string;
  workflowRunUrl?: string;
  schemaVersion?: number;
}

export function buildHealthIngestPayload(options: BuildPayloadOptions): HealthIngestRequest {
  const body: HealthIngestRequest = {
    timestamp: new Date().toISOString(),
    signals: {
      knip: {
        unusedFiles: options.knip.unusedFiles,
        unusedDependencies: options.knip.unusedDependencies,
      },
    },
    ...(options.schemaVersion !== undefined ? { schemaVersion: options.schemaVersion } : {}),
    ...(options.repositoryFullName ? { repositoryFullName: options.repositoryFullName } : {}),
    ...(options.commitSha ? { commitSha: options.commitSha } : {}),
    ...(options.workflowRunUrl ? { workflowRunUrl: options.workflowRunUrl } : {}),
  };

  const parsed = healthIngestRequestSchema.safeParse(body);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Ingest payload validation failed: ${msg}`);
  }
  return parsed.data;
}
