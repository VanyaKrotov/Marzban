# MarzbanNext Dashboard

The dashboard is the React frontend embedded into the MarzbanNext backend.

## Requirements

- Node.js `20.19.0` or newer.
- npm.
- A running MarzbanNext backend for API integration.

## Stack

- React 18 and TypeScript.
- Vite 8.
- Tailwind CSS 4.
- shadcn and Radix UI as the primary component system.
- TanStack Query for server state and mutations.
- Axios clients from `src/service/http.ts`.
- react-hook-form with Zod validation.
- Monaco Editor for Xray JSON.
- Recharts for statistics.
- i18next for localization.

Do not add Chakra UI or native fetch calls. New UI primitives should be added
through shadcn and all destructive confirmations should use `AlertDialog`.

## Install

From `app/dashboard`:

```bash
cp example.env .env
npm ci
```

On PowerShell:

```powershell
Copy-Item example.env .env
npm ci
```

Configure the backend API in `.env`:

```env
VITE_BASE_API=http://127.0.0.1:8000/api/
```

For a same-origin deployment, use:

```env
VITE_BASE_API=/api/
```

## Commands

```bash
npm run dev
npm run build
npm run preview
npm run ui:info
```

The development server listens on port `3000`. The production build performs
TypeScript checking before Vite compilation.

## Add a UI component

Use the repository wrapper instead of calling a remote registry preset directly:

```bash
npm run ui:add -- button
npm run ui:add -- alert-dialog
```

The wrapper keeps generated components compatible with the local shadcn
configuration and import aliases. The `@/*` alias maps to `src/*`.

## Application pages

| Route | Feature |
| --- | --- |
| `/` | Users table, URL filters, create/edit dialog and usage actions |
| `/nodes` | Node connection, editing and certificate management |
| `/hosts` | Host CRUD, copying, enabling and drag-and-drop ordering |
| `/inbounds` | Managed inbound JSON and node assignment |
| `/outbounds` | Managed outbound JSON and node assignment |
| `/routing` | Routing rule JSON, assignments and ordering |
| `/config` | Complete Xray JSON configuration |
| `/logs` | Runtime node logs over WebSocket |
| `/stats` | Traffic and user charts |
| `/login` | Administrator authentication |

The application also links to same-origin `/docs`.

## Data and forms

- Keep endpoint functions in the relevant service module.
- Use TanStack Query hooks close to the page or feature that consumes them.
- Use `useMutation` for writes and invalidate only affected query keys.
- Use the shared authenticated `api` or unauthenticated `publicApi` Axios client.
- Keep filter state that must survive reloads in URL query parameters.
- Use react-hook-form `Controller` for controlled fields.
- Keep schemas and reusable form helpers in the feature-local `lib` directory.
- Split large dialogs into local `components`, `lib`, and query modules.

Objects sourced from `XRAY_JSON` have read-only JSON content and cannot be
deleted. Their metadata, enabled state and node assignments can still be edited.

## JSON editor

The shared Monaco editor accepts an optional JSON schema. Feature-specific
schemas currently cover:

- complete Xray configuration;
- inbound configuration;
- outbound configuration;
- routing rules with inbound tag completion.

Schema descriptions are written in English. Keep the schema optional so the
editor remains reusable.

## Styling and localization

- Prefer Tailwind utility classes and existing design tokens.
- Support both light and dark themes.
- Use Lucide icons.
- Put all user-facing strings in i18next resources.
- Use `Tooltip`, `Popover`, `Empty`, `Dialog`, `Tabs` and other shared UI
  components instead of feature-specific replacements.
- Verify desktop and mobile layouts.

## Verification

Before submitting dashboard changes:

```bash
npm run build
```

For visual changes, also open the affected page against a running backend and
verify loading, empty, error and populated states.
