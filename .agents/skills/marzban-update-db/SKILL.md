---
name: marzban-update-db
description: Change Marzban SQLAlchemy models, CRUD behavior, Pydantic exposure, and Alembic migrations while preserving SQLite and MySQL/MariaDB compatibility. Use for columns, tables, relationships, indexes, constraints, enums, defaults, data backfills, or migration graph repairs.
---

# Marzban Update Database

## Inspect the full data contract

Read `app/db/models.py`, relevant functions in `app/db/crud.py`, matching Pydantic models in `app/models/`, and recent migrations touching the same table or enum.

Identify every representation of the field:

- SQLAlchemy storage model.
- Pydantic create, modify, partial-modify, and response models.
- CRUD create/update/query paths.
- Router, CLI, jobs, reports, subscriptions, Xray config, and dashboard consumers.

## Change the model and migration together

1. Update `app/db/models.py`.
2. Update CRUD and Pydantic behavior.
3. Generate an Alembic revision when Alembic is installed, or create a revision matching `script.py.mako` and the current head.
4. Review generated SQL manually; never trust autogenerate for enum changes, data transformations, or cross-dialect behavior.
5. Implement a meaningful `downgrade()` unless data loss makes reversal impossible; document that constraint in the migration.

## Respect database compatibility

- The default database is SQLite; production may use MySQL or MariaDB.
- Use `op.batch_alter_table` when SQLite cannot perform the direct alteration.
- Give new non-null columns a migration-safe `server_default` or perform a staged backfill before enforcing non-null.
- Distinguish Python `default` from database `server_default`.
- Treat SQLAlchemy `Enum` changes as data migrations. Inspect existing enum migrations before editing values.
- Preserve collations, column lengths, foreign keys, cascade behavior, and uniqueness semantics.
- Avoid database-specific SQL unless guarded by dialect checks.
- Do not create an extra Alembic head accidentally. Inspect all `revision` and `down_revision` values when the CLI is unavailable.

## Keep behavioral consumers aligned

- Add response fields only when they should be public.
- Use `ConfigDict(from_attributes=True)` for ORM-backed Pydantic responses.
- Preserve optional-field semantics: in modify models, `None` often means no change while `0`, `False`, and empty strings may be valid assignments.
- Update dashboard TypeScript types and forms when an API-visible field changes.
- Update jobs, usage calculations, reports, and Xray config generation when stored values affect runtime state.

## Verify

- Run `alembic heads`, expecting one intended head.
- Test `alembic upgrade head`, then downgrade and re-upgrade on a disposable SQLite database.
- For dialect-sensitive changes, inspect or test MySQL/MariaDB behavior too.
- Confirm old rows migrate correctly and new writes round-trip through ORM and Pydantic models.
- Run `git diff --check`; never use the developer's live database as a migration test target.
