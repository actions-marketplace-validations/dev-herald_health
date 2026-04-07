# Health reports - Dev Herald GitHub Action

Turn your CI signals into **weekly health reports** for your codebase.

Dev Herald ingests structured data from your workflows (unused code, dependencies, bundle size changes, etc.) and turns it into **clear, trackable insights** - no dashboards to wire up, no scripts to maintain.

---

## Why this exists

CI already knows a lot about your codebase - it just doesn’t communicate it well.

[Dev Herald](https://dev-herald.com) helps you:

- Track **unused code & dependencies**
- Monitor **bundle size changes over time**
- Surface **dependency risks (CVEs)**
- Build a **history of codebase health**, not just point-in-time logs

All from the workflows you already run.

---

## Usage

Create a project API key from [Dev Herald](https://dev-herald.com) and store it as a secret:

```yaml
DEV_HERALD_KEY=your-api-key
```

Then upload any health data from your CI.

Example - Upload a report

```yaml
- name: Upload health data
  uses: dev-herald/health@v1
  with:
    api-key: ${{ secrets.DEV_HERALD_KEY }}
    knip-report-path: results.json
    workflow-run-url: ${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}
```


Example - Generating data (Knip)

You can use tools like Knip to generate signals:

```yml
- name: Run Knip
  run: pnpm exec knip --reporter json --no-exit-code > results.json
```


Then upload the result using the action above.

Knip is just one example - Dev Herald is designed to support multiple signals over time.

---

### Inputs

| Input | Description |
| ----- | ----------- |
| `api-key` | Required. Project API key |
| `knip-report-path` | Path to a Knip JSON report (optional if a supported lockfile is present for CVEs) |
| `lockfile-path` | Optional path to `package-lock.json` or `pnpm-lock.yaml`; otherwise auto-detect under repo root |
| `cve-detail` | If `true`, enrich each vulnerability with OSV severity, description text, and aggregate severity counts (slower). If `false`, still sends vulnerable **package names** and OSV ids only |
| `api-url` | Defaults to Dev Herald ingest API |
| `repository-full-name` | Optional override |
| `commit-sha` | Optional override |
| `workflow-run-url` | Link to CI run |

When CVE scanning runs (npm or pnpm lockfile), the ingest payload includes `signals.cve` with `prod` / `dev` sections: `totalVulnerabilities`, a `packages` list (`name`, `version`, `vulnerabilities[]` with at least `id`), and optionally `severity` summary counts when `cve-detail` is enabled.

### Outputs

| Output | Description |
| ------ | ----------- |
| `report-id` | Dev Herald health report id |
| `status` | created or failed |
