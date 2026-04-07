import { z } from 'zod';

export const osvBatchQueryItemSchema = z
  .object({
    package: z.object({
      name: z.string(),
      ecosystem: z.string().optional(),
      purl: z.string().optional(),
    }),
    version: z.string().optional(),
    commit: z.string().optional(),
    page_token: z.string().optional(),
  })
  .passthrough();

export const osvQueryBatchResponseSchema = z.object({
  results: z.array(
    z
      .object({
        vulns: z.array(z.object({ id: z.string(), modified: z.string().optional() })).optional(),
        next_page_token: z.string().optional(),
      })
      .passthrough()
  ),
});

export const osvVulnSeveritySchema = z
  .object({
    type: z.string().optional(),
    score: z.string().optional(),
  })
  .passthrough();

export const osvVulnDetailSchema = z
  .object({
    id: z.string(),
    summary: z.string().optional(),
    details: z.string().optional(),
    severity: z.array(osvVulnSeveritySchema).optional(),
    database_specific: z.record(z.string(), z.any()).optional(),
  })
  .passthrough();

export type OsvQueryBatchResponse = z.infer<typeof osvQueryBatchResponseSchema>;
