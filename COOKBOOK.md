# Cookbook

## Knip integration

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

See [README.md](README.md) for all inputs and outputs.
