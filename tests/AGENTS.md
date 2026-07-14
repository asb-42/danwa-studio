# DOX: tests/

## Purpose

Test suites for Danwa Studio: Vitest unit tests for stores and modules.

## Ownership

- **Store Tests**: `stores.test.js` — store unit tests
- **Module Tests**: `lib/modules/` — module-specific tests
- **Stubs**: `_stubs/` — test stubs and mocks
- **Setup**: `setup.js` — test setup and configuration

## Local Contracts

- Tests use Vitest framework
- Stubs provide mock data for testing
- Setup runs before all tests

## Work Guidance

- Add tests for new features and bug fixes
- Follow existing test patterns
- Keep tests independent and fast

## Verification

- Run `npm run test` to execute all tests

## Child DOX Index

| Child | Purpose |
|-------|---------|
| `tests/lib/` | Library unit tests |
| `tests/_stubs/` | Test stubs and mocks |
