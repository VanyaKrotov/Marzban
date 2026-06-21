---
name: marzban-refactoring
description: Refactor MarzbanNext Python or TypeScript code while preserving API contracts, database behavior, scheduler registration, reports, Xray synchronization, dashboard state, and deployment output. Use for extracting helpers, splitting modules, removing duplication, simplifying control flow, renaming internals, or reorganizing code without intended feature changes.
---

# MarzbanNext Refactoring

## Define the behavioral boundary

Before editing, list the observable behavior that must stay stable:

- HTTP paths, methods, operation IDs, status codes, response bodies, and auth rules.
- Database commits, rollbacks, query filters, ordering, eager loading, defaults, and relationships.
- Reports, webhooks, logs, and background task timing.
- Scheduler job registration, intervals, `coalesce`, and `max_instances`.
- Xray main-core and connected-node effects.
- Dashboard requests, state transitions, query invalidation, translations, and build output.
- CLI command names, options, prompts, and exit behavior.

Use `git diff` and nearby call sites to reconstruct behavior where tests are absent.

## Refactor within ownership boundaries

- Keep routers focused on HTTP orchestration and place persistence in `app/db/crud.py`.
- Keep Pydantic validation and serialization in `app/models/`.
- Keep Xray runtime changes in `app/xray/`.
- Keep reusable UI state in the existing Zustand context rather than adding parallel state systems.
- Extract a helper only when it removes meaningful duplication or isolates a complex rule.
- Preserve synchronous versus background execution unless timing is deliberately part of the change.
- Avoid broad formatting or naming churn in unrelated code.

## Avoid initialization regressions

MarzbanNext relies heavily on import side effects:

- `app/__init__.py` imports routers, jobs, dashboard, and Telegram after creating `app`, `scheduler`, and `logger`.
- `app/jobs/__init__.py` dynamically imports every non-private Python module.
- `app/xray/__init__.py` creates process-global core, config, API, node, and host state.

When moving code, verify import order and circular dependencies. Prefer local imports and `TYPE_CHECKING` for type-only references. Do not rename a job module to begin with `_` unless disabling its automatic import is intentional.

## Preserve tricky value semantics

- Do not replace `is not None` checks with truthiness when `0`, `False`, or an empty value is meaningful.
- Preserve timestamp units, UTC behavior, bytes, reset strategies, and status transitions.
- Preserve SQLAlchemy object loading needed by background tasks and Pydantic computed fields.
- Preserve frontend form transformations and API field names.

## Verify by comparison

- Capture representative outputs or control flow before the refactor when practical.
- Run focused import/compile checks and the dashboard build for touched TypeScript.
- Inspect route registration, scheduler jobs, and Xray side effects after moving modules.
- Run `git diff --check` and review the diff specifically for accidental contract changes.
- If test infrastructure is added as part of the refactor, keep it focused on the behavior being protected rather than restructuring production code around the test.
