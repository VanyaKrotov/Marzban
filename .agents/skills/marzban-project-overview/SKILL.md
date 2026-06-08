---
name: marzban-project-overview
description: Orient work in the Marzban repository and explain its architecture, runtime flow, code conventions, ownership boundaries, and verification strategy. Use when starting an unfamiliar Marzban task, locating where a change belongs, reviewing cross-cutting behavior, or deciding which backend, dashboard, CLI, database, job, subscription, or Xray modules must change.
---

# Marzban Project Overview

## Establish context

Read `README.md`, `CONTRIBUTING.md`, and the nearest files to the requested behavior before editing. Treat this repository as a coupled proxy-management application, not as a generic CRUD service.

Map the relevant flow:

1. `main.py` starts Uvicorn and enforces the SSL/local-bind policy.
2. `app/__init__.py` creates FastAPI, CORS, the APScheduler instance, exception handling, and imports routers, jobs, dashboard, and Telegram startup side effects.
3. `app/routers/` owns HTTP transport, authentication dependencies, response models, status codes, logging, reports, and background side effects.
4. `app/models/` contains Pydantic v2 request/response models, enums, validation, and computed API fields.
5. `app/db/models.py` contains SQLAlchemy 2 declarative models; `app/db/crud.py` contains database operations and commits.
6. `app/db/migrations/versions/` contains Alembic migrations for SQLite and MySQL/MariaDB compatibility.
7. `app/xray/` owns Xray config parsing, process lifecycle, node lifecycle, and runtime user synchronization.
8. `app/jobs/` is imported dynamically; module import registers startup hooks and scheduler jobs.
9. `app/subscription/` and `app/templates/` generate client-specific subscriptions and share links.
10. `app/dashboard/src/` is React 18 + TypeScript + Chakra UI. Zustand contexts own much of the client state; `service/http.ts` wraps `ofetch`.
11. `cli/` is a Typer CLI using the same DB and CRUD layer.
12. `xray_api/proto/` is generated protobuf code. Do not hand-edit it.

## Preserve project behavior

- Keep Python changes compatible with the existing synchronous FastAPI and SQLAlchemy style.
- Keep lines within 120 characters and format touched Python files with `autopep8 <file> --max-line-length 120` when available.
- Follow local naming and import patterns instead of introducing a new architecture during a feature change.
- Preserve `BackgroundTasks`, report/webhook calls, logger calls, and Xray synchronization when changing user, node, host, or core behavior.
- Avoid circular imports. Use local imports and `TYPE_CHECKING` where existing module initialization makes top-level imports unsafe.
- Remember that `app/jobs/__init__.py` imports every non-private `.py` file dynamically.
- Do not change the Uvicorn worker count: scheduler and Xray state are process-local.
- Do not manually edit `app/dashboard/build/`; rebuild it only when the task requires generated assets.
- Update all locale JSON files under `app/dashboard/public/statics/locales/` for new user-facing strings.
- Keep secrets and deployment-specific paths in environment configuration, not source literals.

## Verify proportionally

The repository has no meaningful automated test suite. Compensate with focused checks:

- Inspect `git diff --check` and the exact diff.
- Compile or import only the affected Python modules when the Xray binary and environment allow it.
- For database changes, validate the Alembic revision graph and both upgrade and downgrade logic.
- For dashboard changes, run `npm.cmd run build` from `app/dashboard`.
- For Xray changes, exercise config parsing with representative protocol and transport variants without starting production processes.
- State clearly when a check cannot run because Python dependencies, the Xray executable, or a database service is unavailable.

## Choose a specialized skill

Use `$marzban-add-endpoint` for REST API work, `$marzban-update-db` for schema changes, `$marzban-dashboard-change` for React work, `$marzban-xray-change` for core/config/node/gRPC work, and `$marzban-refactoring` for behavior-preserving restructuring.
