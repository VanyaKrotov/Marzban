---
name: marzban-dashboard-change
description: Implement Marzban dashboard features and fixes using React 18, TypeScript, Chakra UI, Zustand, React Query, react-hook-form, Zod, i18next, and the shared ofetch client. Use for components, dialogs, forms, dashboard state, API calls, types, styling, routing, or translations under `app/dashboard`.
---

# Marzban Dashboard Change

## Follow the existing frontend shape

Read `app/dashboard/package.json`, the nearest component, its Zustand context, relevant types, and `src/service/http.ts`.

- Use Chakra UI components and responsive props for layout and styling.
- Use existing local components such as `Input`, `Icon`, `RadioGroup`, and modal patterns before adding wrappers.
- Use `fetch` from `service/http.ts`; it supplies `VITE_BASE_API` and bearer authentication.
- Keep shared dashboard state in the appropriate Zustand context.
- Use React Query and query invalidation where the neighboring feature already uses query keys.
- Use `react-hook-form` and Zod for substantial forms; preserve API units and transformations such as bytes versus GB and timestamps versus dates.

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
- Check light and dark modes for Chakra changes.
- Verify every new translation key exists in all four source locale files.
- Inspect `git diff --check` and ensure generated files changed only intentionally.
