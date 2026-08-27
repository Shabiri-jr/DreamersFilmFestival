# Code Conventions

## Naming

- TypeScript files use lowercase descriptive names and feature folders.
- Functions and variables use `camelCase`; exported constants use `SCREAMING_SNAKE_CASE`.
- PostgreSQL identifiers use `snake_case`; enum values are lowercase snake case.
- Domain types are immutable `Readonly` objects where practical.

## Organization

- Server-only modules begin with `import "server-only"`.
- Browser-safe and privileged configuration are kept in separate modules.
- Imports use the `@/` alias for `src`.
- SQL groups enums, tables, indexes, functions/triggers, grants, RLS, storage, and seed data.

## Type Safety and Errors

- TypeScript strict mode is enabled.
- Required environment values fail closed with explicit errors.
- SQL uses constraints and exceptions for invalid financial/security transitions.

## Documentation

Architecture decisions and feature state live under `.specs`. Comments explain security boundaries and non-obvious database behavior rather than restating code.

