# Cookbook

## Knip

Store your Dev Herald API key as a repo secret (for example `DEV_HERALD_KEY`), then in your workflow:

```yaml
      - name: Run Knip (JSON report)
        run: pnpm exec knip --reporter json --no-exit-code > knip-results.json

      - name: Upload health data to Dev Herald
        uses: dev-herald/health@v1
        with:
          api-key: ${{ secrets.DEV_HERALD_KEY }}
          knip-report-path: knip-results.json
          workflow-run-url: ${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}
```

On that same `with:` block you can add **`lockfile-path`** and **`cve-detail`** (see below) if you also want the CVE signal from a lockfile.

## CVE checks

The action reads a lockfile under the repo root by default (`pnpm-lock.yaml`, `yarn.lock`, `package-lock.json`, `bun.lock` in that order). **OSV/CVE runs only for pnpm and npm lockfiles**; yarn or bun is skipped with a workflow warning.

- **`lockfile-path`** — optional. Set to a specific file (for example in a monorepo). Omit or leave empty for auto-detect.
- **`cve-detail`** — optional. `'true'` fetches per-issue detail from OSV for a severity breakdown (slower). Default `'false'` is totals only.

You need **at least one** of a Knip report or a lockfile the CVE path can use. CVE-only example:

```yaml
      - uses: actions/checkout@v4

      - name: Upload health data to Dev Herald
        uses: dev-herald/health@v1
        with:
          api-key: ${{ secrets.DEV_HERALD_KEY }}
          workflow-run-url: ${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}
          lockfile-path: ${{ github.workspace }}/package-lock.json
          cve-detail: 'false'
```

Drop `lockfile-path` when auto-detect is enough. For Knip + CVE, keep `knip-report-path` and add these two keys on the same step.

See [README.md](README.md) for all inputs and outputs.
