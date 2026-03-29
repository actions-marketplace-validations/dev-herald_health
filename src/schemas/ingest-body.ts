import { z } from 'zod';

export const knipSignalsSchema = z
  .object({
    unusedFiles: z.number().int().min(0),
    unusedDependencies: z.number().int().min(0),
  })
  .passthrough();

export const healthSignalsSchema = z
  .object({
    knip: knipSignalsSchema,
  })
  .passthrough();

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
