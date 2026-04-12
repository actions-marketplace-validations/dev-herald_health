import { z } from 'zod';

export const unusedCodeSchema = z.object({
  unusedDepsList: z.array(z.string()),
  unusedFilesList: z.array(z.string()),
  unusedTypeExportsList: z.array(z.string()),
});

export const cveSeverityBucketsSchema = z.object({
  critical: z.number().int().min(0),
  high: z.number().int().min(0),
  medium: z.number().int().min(0),
  low: z.number().int().min(0),
  unknown: z.number().int().min(0),
});

/** Aggregate counts: only non-zero buckets need to be present. */
export const cveEnvSeverityPartialSchema = cveSeverityBucketsSchema.partial();

/** Matches Dev Herald ingest: CVSS-aligned medium (not npm's "moderate"); unknown = unclassified. */
export const cveVulnSeverityLabelSchema = z.enum(['critical', 'high', 'medium', 'low', 'unknown']);

export const cveVulnerabilitySchema = z.object({
  id: z.string().min(1),
  severity: cveVulnSeverityLabelSchema.optional(),
  description: z.string().optional(),
});

export const cvePackageSchema = z.object({
  name: z.string().min(1),
  version: z.string().min(1),
  vulnerabilities: z.array(cveVulnerabilitySchema),
});

export const cveEnvSignalSchema = z.object({
  totalVulnerabilities: z.number().int().min(0),
  severity: cveEnvSeverityPartialSchema.optional(),
  packages: z.array(cvePackageSchema),
});

export const cveSignalsSchema = z
  .object({
    lockfileType: z.string().min(1),
    prod: cveEnvSignalSchema,
    dev: cveEnvSignalSchema,
  })
  .passthrough();

export const bundleRouteSchema = z.object({
  path: z.string().min(1),
  totalBytes: z.number().int().min(0),
  uncompressedBytes: z.number().int().min(0).optional(),
  compressedBytes: z.number().int().min(0).optional(),
  moduleCount: z.number().int().min(0).optional(),
});

export const bundleSignalSchema = z.object({
  totalBytes: z.number().int().min(0),
  jsBytes: z.number().int().min(0),
  cssBytes: z.number().int().min(0),
  routes: z.array(bundleRouteSchema),
});

export type BundleRoute = z.infer<typeof bundleRouteSchema>;
export type BundleSignal = z.infer<typeof bundleSignalSchema>;

export const healthSignalsSchema = z
  .object({
    unusedCode: unusedCodeSchema.optional(),
    cve: cveSignalsSchema.optional(),
    bundle: bundleSignalSchema.optional(),
  })
  .passthrough()
  .refine((s) => s.unusedCode !== undefined || s.cve !== undefined || s.bundle !== undefined, {
    message: 'signals must include at least one of unusedCode (Knip), cve, or bundle',
  });

export const healthIngestRequestSchema = z
  .object({
    timestamp: z
      .string()
      .min(1)
      .refine((s) => !Number.isNaN(Date.parse(s)), 'Invalid ISO timestamp'),
    signals: healthSignalsSchema,
    schemaVersion: z.number().int().positive().optional(),
    repositoryFullName: z.string().min(1).optional(),
    commitSha: z.string().min(1).optional(),
    workflowRunUrl: z.string().min(1).optional(),
  })
  .passthrough();

export type HealthIngestRequest = z.infer<typeof healthIngestRequestSchema>;
