# Repository Guidelines

## Project Structure & Module Organization

This repository is a pnpm workspace for a multi-tenant CRM. Deployable applications belong in `apps/`; shared libraries belong in `packages/`. Database migrations live in `apps/api/db/migrations` and must preserve the composite `(company_id, id)` foreign-key pattern. Architectural decisions and corrections to the source blueprint are documented in `docs/architecture.md`.

Tenant isolation is enforced in PostgreSQL Row-Level Security. Application code must set `app.company_id` inside the same database transaction that executes tenant queries. A frontend-supplied company or role is never an authorization source.

## Build, Test, and Development Commands

- `pnpm dev`: run every workspace development process in parallel.
- `pnpm build`: build all workspace packages in dependency order.
- `pnpm test`: run each package test suite.
- `pnpm lint`: run configured linters across the workspace.
- `pnpm typecheck`: run TypeScript checking across the workspace.
- `docker compose up -d postgres`: start the local PostgreSQL 16 service.

## Coding Style & Naming Conventions

Use TypeScript in strict mode. Database identifiers and migration files use `snake_case`; TypeScript variables use `camelCase`, types and classes use `PascalCase`. API payloads must be validated at the boundary. Monetary values remain decimal strings between PostgreSQL and TypeScript to avoid floating-point loss.

## Testing Guidelines

Security tests must prove cross-tenant reads and writes fail at the database layer. Financial tests cover partial payments, overdue transitions, currency separation and concurrent writes. Run a single package suite with `pnpm --filter <package-name> test` once application packages are present.

## Commit & Pull Request Guidelines

The repository has no commit history yet, so no existing commit convention can be inferred. Keep migrations backward-compatible once deployed and explain schema or authorization changes explicitly in pull requests.

