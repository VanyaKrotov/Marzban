---
name: marzban-add-endpoint
description: Add or modify Marzban FastAPI REST endpoints, request and response models, authentication dependencies, CRUD calls, reports, logging, and runtime side effects. Use for new `/api` routes, endpoint parameters, response schemas, authorization rules, HTTP errors, or API behavior changes in `app/routers`.
---

# Marzban Add Endpoint

## Trace the domain first

Read the matching files in `app/routers/`, `app/models/`, `app/db/crud.py`, and `app/dependencies.py`. For user, node, host, or core changes, also inspect `app/xray/operations.py`, `app/utils/report.py`, and neighboring endpoints.

## Implement in project order

1. Add or adjust Pydantic v2 models and enums in `app/models/`.
2. Add database behavior to `app/db/crud.py`; keep commits, refreshes, and rollback expectations consistent with neighboring functions.
3. Add reusable lookup or authorization logic to `app/dependencies.py` when it is shared or naturally expressed as `Depends`.
4. Implement the route in the domain router under `app/routers/`.
5. Add a new router module to `app/routers/__init__.py`; existing router modules need no new registration.
6. Update dashboard types/calls or CLI commands only when the API contract is consumed there.

## Follow endpoint conventions

- Use `APIRouter(tags=[...], prefix="/api", responses={401: responses._401})`.
- Keep route functions synchronous unless the underlying operation genuinely requires async behavior.
- Inject `db: Session = Depends(get_db)`.
- Use `Admin.get_current` for authenticated admins and `Admin.check_sudo_admin` for sudo-only operations.
- Enforce resource ownership like `get_validated_user`; non-sudo admins must not access another admin's users.
- Declare `response_model` and shared error response metadata from `app/utils/responses.py`.
- Raise `HTTPException` with established status codes and concise `detail` values.
- Catch `IntegrityError`, call `db.rollback()`, and return `409` for uniqueness conflicts.
- Keep route names unique because `app/__init__.py` converts route names to OpenAPI operation IDs.

## Preserve side effects

After the database mutation, check whether the existing domain requires:

- `BackgroundTasks` for Xray user/node synchronization.
- `report.*` calls for Telegram, Discord, or webhook notifications.
- `logger.info` for operator-visible audit events.
- Xray restart/config regeneration for bulk operations.
- Cache or dashboard query invalidation on the frontend.

Do not move a DB-backed ORM object into a background task unless the neighboring code already relies on it and the needed attributes are loaded. Prefer identifiers or validated response data for new long-lived work.

## Verify

- Confirm the route is included in `app.routes` by import inspection or a focused app import when dependencies allow it.
- Validate request failures, authorization boundaries, success response shape, and duplicate/not-found behavior.
- Check that mutations trigger the same reports and Xray effects as analogous endpoints.
- Run `git diff --check` and format touched Python files to the repository's 120-column convention.
