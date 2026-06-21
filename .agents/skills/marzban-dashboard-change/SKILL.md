---
name: marzban-dashboard-change
description: Implement MarzbanNext dashboard features and fixes using React 18, TypeScript, Tailwind CSS, shadcn as the primary UI library, Zustand, TanStack Query, react-hook-form, Zod, i18next, and the shared Axios clients. Use for components, dialogs, forms, dashboard state, API calls, types, styling, routing, or translations under `app/dashboard`.
---

# MarzbanNext Dashboard Change

## Follow the existing frontend shape

Read `app/dashboard/package.json`, the nearest component, its Zustand context, relevant types, and `src/service/http.ts`.

- Treat shadcn as the dashboard's primary UI component library. Use Tailwind CSS and shadcn primitives from `src/components/ui` for all new UI.
- Reuse an existing shadcn primitive before creating another component with the same purpose.
- When a required primitive is missing, add it from shadcn with `npm.cmd run ui:add -- <component...>` from `app/dashboard`. The wrapper uses the configured GitHub registry mirror and writes generated primitives to `src/components/ui`.
- Preserve the shared `@/*` aliases and the settings in `app/dashboard/components.json`.
- Build feature-specific compositions around shadcn primitives next to the owning feature. Create a custom primitive only when shadcn has no suitable component or the project requires genuinely different behavior.
- Do not introduce Chakra UI or extend `src/components/ui/legacy.tsx`. When touching legacy UI, migrate the affected surface to shadcn when the scope permits.
- Use the shadcn `AlertDialog` primitive for every user confirmation before destructive, irreversible, or consequential actions. Do not use browser `confirm()`, a regular `Dialog`, or a custom modal for confirmations.
- Use the Axios instances from `service/http.ts`: `api` supplies `VITE_BASE_API` and bearer authentication, while `publicApi` is reserved for unauthenticated requests such as login.
- Axios response interceptors return response data directly. Handle server errors through `error.response.data`, not legacy `_data` fields.
- Keep shared dashboard state in the appropriate Zustand context.
- Use TanStack Query and query invalidation where the neighboring feature already uses query keys.
- Use `react-hook-form` for all user-editable forms, including small dialog forms. Prefer `Controller` for shadcn/custom controlled inputs and add Zod when validation or transformation is non-trivial. Preserve API units and transformations such as bytes versus GB and timestamps versus dates.
- Keep dialog shells lightweight. Put queries, mutations, forms, local data state, and expensive derived values in a separate content component rendered inside `DialogContent` or `AlertDialogContent`. This ensures the data-owning component mounts only while the dialog is open and stops polling or other lifecycle work when it closes.

## Keep API and UI contracts synchronized

1. Update types in `src/types/` or the owning context.
2. Add the API call to the owning Zustand action or React Query flow.
3. Implement the component with loading, success, validation, and server-error states.
4. Invalidate or refetch all affected data after mutations.
5. Add the component to `Dashboard.tsx` or the router only when it is a new mounted surface.

Do not mutate caller-owned query objects. Build a sanitized copy before removing empty values.

## Handle localization

- Use `useTranslation()` for user-visible text.
- Add every new key to all locale files in `app/dashboard/public/statics/locales/`: `en.json`, `fa.json`, `ru.json`, and `zh.json`.
- Keep interpolation keys identical across locales.
- Do not edit locale copies under `app/dashboard/build/`; they are generated.

## Respect generated output

- Edit only source files under `app/dashboard/src/` and public assets under `app/dashboard/public/`.
- Do not hand-edit `app/dashboard/build/`.
- Build with `npm.cmd run build -- --outDir build --assetsDir statics` when generated dashboard output is part of the requested change.
- Avoid committing unrelated bundle hash churn unless the task or repository workflow requires rebuilt assets.

## Verify

- Run `npm.cmd run build` from `app/dashboard`; this executes TypeScript compilation and Vite build.
- Exercise create/edit/delete flows, unauthorized responses, server validation errors, loading states, and mobile layout.
- Check light and dark modes for styling changes.
- Verify every new translation key exists in all four source locale files.
- Inspect `git diff --check` and ensure generated files changed only intentionally.
