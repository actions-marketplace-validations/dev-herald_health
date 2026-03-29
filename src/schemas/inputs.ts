import { z } from 'zod';
import { pathsFromMultiline } from '../multiline-paths';

const nonEmpty = z.string().min(1);

export const actionInputsSchema = z
  .object({
    apiKey: nonEmpty,
    knipReportPath: z.string().optional(),
    knipReportPathsRaw: z.string().optional(),
    apiUrl: z
      .string()
      .min(1)
      .url({ message: 'api-url must be a valid URL' })
      .refine((u) => u.startsWith('https://'), 'api-url must use HTTPS'),
    repositoryFullName: z.string().optional(),
    commitSha: z.string().optional(),
    workflowRunUrl: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    const single = data.knipReportPath?.trim() ?? '';
    const multi = pathsFromMultiline(data.knipReportPathsRaw ?? '');

    const hasSingle = single.length > 0;
    const hasMulti = multi.length > 0;

    if (hasSingle && hasMulti) {
      ctx.addIssue({
        code: 'custom',
        message:
          'Provide exactly one of knip-report-path or knip-report-paths, not both.',
        path: ['knipReportPath'],
      });
    } else if (!hasSingle && !hasMulti) {
      ctx.addIssue({
        code: 'custom',
        message:
          'Provide knip-report-path (single file) or knip-report-paths (one path per line).',
        path: ['knipReportPath'],
      });
    }
  });

export type ActionInputsValidated = z.infer<typeof actionInputsSchema>;
