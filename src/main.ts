import * as core from '@actions/core';
import * as github from '@actions/github';
import { buildHeaders, makeHttpRequest } from './api';
import { buildHealthIngestPayload } from './build-payload';
import { actionInputsSchema } from './schemas/inputs';
import { mergeKnipReports } from './signals/knip-merge';
import { mapKnipReportToSignals } from './signals/knip';
import { pathsFromMultiline } from './multiline-paths';
import { readAndValidateKnipReport } from './read-knip-files';
import type { KnipReport } from './schemas/knip-report';
import type { IngestSuccessData } from './types';

const DEFAULT_API_URL = 'https://dev-herald.com/api/v1/health/ingest';

function optionalString(v: string): string | undefined {
  const t = v.trim();
  return t.length > 0 ? t : undefined;
}

async function run(): Promise<void> {
  try {
    const apiKey = core.getInput('api-key', { required: true });
    const knipReportPath = core.getInput('knip-report-path');
    const knipReportPathsRaw = core.getInput('knip-report-paths');
    const apiUrl = optionalString(core.getInput('api-url')) ?? DEFAULT_API_URL;

    const ctx = github.context;
    const repositoryFullName =
      optionalString(core.getInput('repository-full-name')) ??
      (ctx.repo?.owner && ctx.repo?.repo ? `${ctx.repo.owner}/${ctx.repo.repo}` : undefined);
    const commitSha =
      optionalString(core.getInput('commit-sha')) ??
      (typeof ctx.sha === 'string' && ctx.sha.length > 0 ? ctx.sha : undefined);
    const workflowRunUrl = optionalString(core.getInput('workflow-run-url'));

    const inputsParsed = actionInputsSchema.safeParse({
      apiKey,
      knipReportPath: knipReportPath || undefined,
      knipReportPathsRaw: knipReportPathsRaw || undefined,
      apiUrl,
      repositoryFullName,
      commitSha,
      workflowRunUrl,
    });

    if (!inputsParsed.success) {
      const msg = inputsParsed.error.issues.map((i) => i.message).join('\n');
      throw new Error(msg);
    }

    const v = inputsParsed.data;
    const single = (v.knipReportPath ?? '').trim();
    const multiPaths = pathsFromMultiline(v.knipReportPathsRaw ?? '');

    const reports: KnipReport[] =
      single.length > 0
        ? [readAndValidateKnipReport(single)]
        : multiPaths.map((p) => readAndValidateKnipReport(p));

    const merged = mergeKnipReports(reports);
    const knipAgg = mapKnipReportToSignals(merged);

    const payload = buildHealthIngestPayload({
      knip: knipAgg,
      repositoryFullName: v.repositoryFullName,
      commitSha: v.commitSha,
      workflowRunUrl: v.workflowRunUrl,
    });

    core.info(`Knip aggregates: unusedFiles=${knipAgg.unusedFiles}, unusedDependencies=${knipAgg.unusedDependencies}`);
    core.info(`POST ${v.apiUrl}`);

    const headers = buildHeaders(v.apiKey);
    const response = await makeHttpRequest(v.apiUrl, 'POST', headers, payload as Record<string, unknown>);

    let json: unknown;
    try {
      json = JSON.parse(response.data) as unknown;
    } catch {
      json = null;
    }

    if (response.statusCode < 200 || response.statusCode >= 300) {
      const bodyPreview = response.data.slice(0, 2000);
      throw new Error(`Ingest failed (${response.statusCode}): ${bodyPreview}`);
    }

    const data =
      json &&
      typeof json === 'object' &&
      json !== null &&
      'data' in json &&
      typeof (json as { data: unknown }).data === 'object' &&
      (json as { data: unknown }).data !== null
        ? ((json as { data: IngestSuccessData }).data)
        : null;

    const reportId = data && typeof data.reportId === 'string' ? data.reportId : undefined;
    if (reportId) {
      core.setOutput('report-id', reportId);
    }
    core.setOutput('status', 'created');
    core.info(`Health report created${reportId ? `: ${reportId}` : ''}`);
  } catch (e) {
    core.setOutput('status', 'failed');
    if (e instanceof Error) {
      core.setFailed(e.message);
    } else {
      core.setFailed('Unknown error');
    }
  }
}

void run();
