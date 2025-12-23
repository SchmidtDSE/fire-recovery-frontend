# GitHub Actions Workflows

This directory contains CI/CD workflows for the Fire Recovery Frontend.

## Workflows

### 🧪 test.yml - Test Suite

**Triggers:**
- Push to `main` branch
- Push to `dev` branch
- Pull requests to `main` branch
- Pull requests to `dev` branch

**Jobs:**

1. **test** - Runs unit tests and generates coverage
   - Sets up Node.js 20.x and pnpm
   - Installs dependencies
   - Runs TypeScript type checking (`pnpm type-check`)
   - Runs unit tests (`pnpm test`)
   - Generates coverage report (`pnpm test:coverage`)
   - Uploads coverage to Codecov (requires `CODECOV_TOKEN` secret)
   - Archives coverage artifacts for 7 days
   - Comments PR with coverage summary

2. **lint** - Code quality checks
   - Runs linter if `pnpm lint` script exists
   - Skips gracefully if no linter configured

3. **build** - Build verification
   - Verifies project builds successfully (`pnpm build`)
   - Archives build artifacts for 7 days

4. **test-summary** - Summary report
   - Aggregates results from all jobs
   - Posts summary to GitHub Actions summary
   - Fails if any critical job failed

**Status Badges:**

Add to your README.md:
```markdown
[![Tests](https://github.com/SchmidtDSE/fire-recovery-frontend/actions/workflows/test.yml/badge.svg)](https://github.com/SchmidtDSE/fire-recovery-frontend/actions/workflows/test.yml)
```

---

### 🚀 deploy.yml - Deployment

**Triggers:**
- Push to `main` branch (deploys to production)
- Push to `dev` branch (deploys to development)
- Manual workflow dispatch

**Jobs:**

1. **deploy-frontend** - Deploy static website to Minio
   - Deploys to production bucket (`fire-recovery-web/prod/`) on `main` branch
   - Deploys to development bucket (`fire-recovery-web/dev/`) on `dev` branch
   - Sets no-cache headers on all files

**Required Secrets:**
- `MINIO_ENDPOINT` - Minio server endpoint
- `MINIO_ACCESS_KEY` - Minio access key
- `MINIO_SECRET_KEY` - Minio secret key

---

## Configuration

### Required Secrets

Go to **Settings → Secrets and variables → Actions** and add:

| Secret | Description | Required For |
|--------|-------------|--------------|
| `CODECOV_TOKEN` | Codecov upload token | test.yml (optional) |
| `MINIO_ENDPOINT` | Minio storage endpoint | deploy.yml |
| `MINIO_ACCESS_KEY` | Minio access key | deploy.yml |
| `MINIO_SECRET_KEY` | Minio secret key | deploy.yml |

### Coverage Thresholds

Configured in `vitest.config.ts`:
- Statements: ≥60%
- Branches: ≥50%
- Functions: ≥60%
- Lines: ≥60%

If coverage falls below these thresholds, tests will fail.

---

## Local Testing

To run the same checks locally before pushing:

```bash
# Run all checks
pnpm type-check && pnpm test && pnpm build

# Run with coverage
pnpm test:coverage

# Watch mode (development)
pnpm test:watch
```

---

## Pull Request Workflow

When you open a PR:

1. ✅ **test** job runs automatically
2. 📊 Coverage report is posted as a comment
3. ✅ **lint** and **build** jobs verify code quality
4. 📝 Summary appears in PR checks

**Example PR comment:**
```
## 📊 Test Coverage Report

| Metric | Coverage | Status |
|--------|----------|--------|
| Statements | 85.07% | ✅ |
| Branches | 70.58% | ✅ |
| Functions | 85% | ✅ |
| Lines | 88.88% | ✅ |
```

---

## Troubleshooting

### Tests fail in CI but pass locally

**Possible causes:**
1. Environment differences (Node version, OS)
2. Missing environment variables
3. Flaky tests (timing issues)

**Solutions:**
- Match Node version locally (20.x)
- Check CI logs for specific errors
- Run tests in watch mode to catch flakiness

### Coverage upload fails

**Cause:** Missing or invalid `CODECOV_TOKEN`

**Solution:**
- Get token from [codecov.io](https://codecov.io)
- Add as repository secret
- Or set `fail_ci_if_error: false` (already configured)

### Build fails in CI

**Possible causes:**
1. TypeScript errors
2. Missing dependencies
3. Build configuration issues

**Solutions:**
```bash
# Run locally first
pnpm type-check
pnpm build

# Check for errors
pnpm install --frozen-lockfile
```

---

## Future Enhancements

### Contract Testing (Planned)

Add contract testing workflow:

```yaml
# .github/workflows/contract-tests.yml
name: Contract Tests

on:
  schedule:
    - cron: '0 */6 * * *'  # Every 6 hours
  workflow_dispatch:

jobs:
  contract-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: pnpm test:contract
```

See `.claude/tasks/pending/high_priority/contract-testing-implementation.md` for details.

---

## Workflow Status

| Workflow | Status | Last Run |
|----------|--------|----------|
| test.yml | ✅ Active | - |
| deploy.yml | ✅ Active | - |

---

## Contributing

When adding new workflows:

1. Create workflow in `.github/workflows/`
2. Test locally with [act](https://github.com/nektos/act) if possible
3. Document in this README
4. Add required secrets to repository settings
5. Test on a feature branch first

---

## Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [pnpm Action](https://github.com/pnpm/action-setup)
- [Codecov Action](https://github.com/codecov/codecov-action)
- [Vitest Documentation](https://vitest.dev/)
