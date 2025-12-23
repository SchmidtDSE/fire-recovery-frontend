# fire-recovery-frontend

[![Tests](https://github.com/SchmidtDSE/fire-recovery-frontend/actions/workflows/test.yml/badge.svg)](https://github.com/SchmidtDSE/fire-recovery-frontend/actions/workflows/test.yml)
[![Deploy](https://github.com/SchmidtDSE/fire-recovery-frontend/actions/workflows/deploy.yml/badge.svg)](https://github.com/SchmidtDSE/fire-recovery-frontend/actions/workflows/deploy.yml)

Front end and visualization code for DSE fire recovery project

## Development

### Prerequisites
- Node.js ≥20.0.0
- pnpm ≥8.0.0

### Setup
```bash
pnpm install
```

### Development Server
```bash
pnpm dev
```

### Testing
```bash
# Run tests once
pnpm test

# Watch mode (re-runs on file changes)
pnpm test:watch

# Interactive UI
pnpm test:ui

# With coverage report
pnpm test:coverage
```

See [tests/README.md](tests/README.md) for detailed testing guide.

### Type Checking
```bash
pnpm type-check
```

### Build
```bash
pnpm build
```

### API Type Generation
```bash
# Generate from dev backend
pnpm codegen:dev

# Generate from local backend
pnpm codegen:local
```

## Project Structure

```
src/
├── js/
│   ├── shared/
│   │   ├── api/         # API clients (TypeScript)
│   │   └── utils/       # Utility functions
│   ├── core/            # State management
│   └── features/        # Feature modules
└── types/               # TypeScript definitions

tests/
├── js/                  # Mirrors src/js/ structure
├── setup.ts             # Global test setup
└── test-utils.ts        # Shared test utilities
```

## Notes

- scriptVegModelURL.js file loads from URL while scriptVegModel.js loads from a locally saved COG file.

