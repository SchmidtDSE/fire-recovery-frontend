# Testing Guide

## Running Tests

```bash
# Run all tests once
pnpm test

# Watch mode (re-run on changes)
pnpm test:watch

# Web UI (interactive)
pnpm test:ui

# With coverage report
pnpm test:coverage

# CI mode (with JUnit output)
pnpm test:ci
```

## Test Organization

Tests are organized in a separate `tests/` directory that mirrors the `src/` structure:

```
tests/
├── setup.ts              # Global test setup
├── test-utils.ts         # Shared test utilities
├── README.md             # This file
└── js/                   # Mirrors src/js/ structure
    ├── shared/
    │   ├── api/
    │   │   └── api-client.test.ts
    │   └── utils/
    │       └── date-utils.test.js
    └── features/
        └── fire/
            └── fire-presenter.test.js

src/
└── js/                   # Source code
    ├── shared/
    │   ├── api/
    │   │   └── api-client.ts
    │   └── utils/
    │       └── date-utils.js
    └── features/
        └── fire/
            └── fire-presenter.js
```

**Note:** Tests are kept separate from source code in the `tests/` directory. This provides a clean separation between production code and test code.

### Importing Source Files

Since tests are in a separate directory, use the `@` path alias to import source files:

```typescript
// ✅ Good: Import directly with full file extension
import { ApiClient } from '@/js/shared/api/api-client.ts'
import { formatDate } from '@/js/shared/utils/date-utils.js'

// ❌ Avoid: Barrel exports (index.ts) - may have CDN dependencies
import { ApiClient } from '@/js/shared/api'  // This imports index.ts which has issues

// ❌ Avoid: Relative paths from tests to src
import { ApiClient } from '../../../../src/js/shared/api/api-client.ts'
```

**Important:** Always include the full file extension (`.ts` or `.js`) when importing from source files. The `@` alias points to the `src/` directory and is configured in `vitest.config.ts`.

**Note:** TypeScript may show red squiggles on imports in test files, but this is expected - vitest has its own module resolution that works correctly at runtime.

## Writing Tests

### Test Structure

```typescript
import { describe, it, expect } from 'vitest'

describe('ComponentName', () => {
  describe('methodName', () => {
    it('should do something specific', () => {
      // Arrange
      const input = 'test'

      // Act
      const result = someFunction(input)

      // Assert
      expect(result).toBe('expected')
    })
  })
})
```

### Mocking HTTP Requests with MSW v2

Use MSW v2 for API mocking with native fetch support:

```typescript
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'

// Create mock server
const server = setupServer()

beforeEach(() => {
  server.listen({ onUnhandledRequest: 'error' })
})

afterEach(() => {
  server.resetHandlers()
  server.close()
})

it('should fetch data', async () => {
  server.use(
    http.get('http://localhost:8000/api/endpoint', () => {
      return HttpResponse.json({ data: 'mock' })
    })
  )

  // Test code that makes HTTP request
})
```

#### MSW v2 Key Features

**GET requests:**
```typescript
http.get('http://localhost:8000/api/users/:id', ({ params }) => {
  return HttpResponse.json({ id: params.id, name: 'Test User' })
})
```

**POST requests:**
```typescript
http.post('http://localhost:8000/api/users', async ({ request }) => {
  const body = await request.json()
  return HttpResponse.json({ id: '123', ...body })
})
```

**Error responses:**
```typescript
http.get('http://localhost:8000/api/error', () => {
  return HttpResponse.json(
    { detail: 'Not found' },
    { status: 404 }
  )
})
```

**Query parameters:**
```typescript
http.get('http://localhost:8000/api/search', ({ request }) => {
  const url = new URL(request.url)
  const query = url.searchParams.get('q')
  return HttpResponse.json({ results: [`Found: ${query}`] })
})
```

**Headers:**
```typescript
http.get('http://localhost:8000/api/protected', ({ request }) => {
  const auth = request.headers.get('authorization')
  if (!auth) {
    return HttpResponse.json(
      { detail: 'Unauthorized' },
      { status: 401 }
    )
  }
  return HttpResponse.json({ data: 'protected' })
})
```

### Mocking Functions

```typescript
import { vi } from 'vitest'

// Create mock function
const mockFn = vi.fn()

// Set return values
mockFn.mockReturnValue('mocked')
mockFn.mockResolvedValue('async mocked')

// Assertions
expect(mockFn).toHaveBeenCalledWith('arg')
expect(mockFn).toHaveBeenCalledTimes(1)
```

### Mocking Modules

```typescript
import { vi } from 'vitest'

// Mock entire module
vi.mock('./my-module', () => ({
  default: {
    someFunction: vi.fn().mockReturnValue('mocked')
  }
}))

// Spy on module function
import * as myModule from './my-module'
vi.spyOn(myModule, 'someFunction').mockReturnValue('mocked')
```

## Test Utilities

See `tests/test-utils.ts` for shared helpers:

- `createMockPolygon()` - Create test GeoJSON polygons
- `createMockFeature()` - Create test GeoJSON features
- `createMockApiResponse()` - Create mock fetch responses
- `waitFor()` - Wait for async operations
- `flushPromises()` - Flush pending promises
- `mockApiBaseUrl()` - Mock API base URL

### Example Usage

```typescript
import { createMockFeature, waitFor } from '../../../tests/test-utils'

it('should process GeoJSON feature', async () => {
  const feature = createMockFeature({ name: 'Test Fire' })
  const result = await processFeature(feature)

  await waitFor(100) // Wait for async operations

  expect(result).toBeDefined()
})
```

## Coverage Reports

After running `pnpm test:coverage`, open `coverage/index.html` in a browser to view detailed coverage report.

### Coverage Thresholds

Current thresholds (lenient for legacy code):
- Statements: 60%
- Branches: 50%
- Functions: 60%
- Lines: 60%

New code should aim for higher coverage (90%+).

## CI Integration

In CI pipelines, use:

```bash
pnpm test:ci
```

This generates both console output and JUnit XML (`test-results.xml`) for CI systems.

## Testing Best Practices

### 1. Test Pure Functions First

Pure functions (utilities, helpers) are the easiest to test:

```typescript
// Good - pure function
export function add(a: number, b: number): number {
  return a + b
}

// Test is straightforward
it('should add two numbers', () => {
  expect(add(2, 3)).toBe(5)
})
```

### 2. Use Descriptive Test Names

```typescript
// Bad
it('works', () => { ... })

// Good
it('should return formatted date in MM/DD/YY format', () => { ... })
```

### 3. Follow AAA Pattern

```typescript
it('should calculate area', () => {
  // Arrange
  const width = 10
  const height = 20

  // Act
  const result = calculateArea(width, height)

  // Assert
  expect(result).toBe(200)
})
```

### 4. Test Edge Cases

```typescript
describe('divide', () => {
  it('should divide two numbers', () => {
    expect(divide(10, 2)).toBe(5)
  })

  it('should throw error when dividing by zero', () => {
    expect(() => divide(10, 0)).toThrow('Cannot divide by zero')
  })

  it('should handle negative numbers', () => {
    expect(divide(-10, 2)).toBe(-5)
  })
})
```

### 5. Keep Tests Independent

```typescript
// Bad - tests depend on each other
let sharedState

it('first test', () => {
  sharedState = 'modified'
})

it('second test', () => {
  expect(sharedState).toBe('modified') // Brittle!
})

// Good - each test is independent
it('first test', () => {
  const state = 'initial'
  // Test with local state
})

it('second test', () => {
  const state = 'initial'
  // Test with fresh state
})
```

### 6. Mock External Dependencies

```typescript
// Mock API calls
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'

const server = setupServer()

beforeEach(() => server.listen())
afterEach(() => server.close())

it('should fetch user data', async () => {
  server.use(
    http.get('http://localhost:8000/api/users/1', () => {
      return HttpResponse.json({ id: 1, name: 'Test' })
    })
  )

  const user = await fetchUser(1)
  expect(user.name).toBe('Test')
})
```

## Troubleshooting

### Tests Not Running

1. Check that test files match the pattern: `*.test.{js,ts}` or `*.spec.{js,ts}`
2. Verify files are not in excluded directories (node_modules, dist, etc.)
3. Run `pnpm test --reporter=verbose` for detailed output

### Import Errors

1. Verify path aliases are configured correctly in `vitest.config.ts`
2. Check that `@/` resolves to `./src`
3. Use relative paths if absolute paths fail

### MSW Not Working

1. Ensure you're using MSW v2 syntax (`http` and `HttpResponse` from 'msw')
2. Check that handlers are registered before tests run
3. Verify base URLs match exactly in handlers
4. Use `onUnhandledRequest: 'error'` to catch missing handlers

### Coverage Issues

1. Check coverage exclusions in `vitest.config.ts`
2. Verify test files are excluded from coverage
3. Run `pnpm test:coverage -- --reporter=verbose` for detailed info

## Known Limitations

### CDN Dependencies

Some files cannot be tested yet due to CDN imports:
- `src/js/core/state-manager.js` - imports d3-dispatch from CDN
- Files that import state-manager

**Workaround:** Mock these modules in tests or wait for CDN to pnpm migration.

### Browser APIs

Some browser APIs may not be available in tests:
- `FileReader`, `Blob`, etc. are available via happy-dom
- Complex APIs may need manual mocking in `tests/setup.ts`

## Next Steps

After setup:

1. Write tests for new code as it's developed
2. Add tests for existing code during refactoring
3. Increase coverage thresholds gradually
4. Consider integration tests with Playwright
5. Add visual regression tests if needed

## References

- [Vitest Documentation](https://vitest.dev/)
- [MSW v2 Documentation](https://mswjs.io/)
- [happy-dom Documentation](https://github.com/capricorn86/happy-dom)
