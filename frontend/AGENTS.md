# Project conventions — SeatBook frontend

Next.js 15 (App Router) + TypeScript + Tailwind v4 + shadcn/ui + Zustand.

## Routing & layouts
- File-based routing under `src/app/`. Route groups `(auth)` and `(main)` organize routes without affecting the URL.
- Only two layouts exist: `app/layout.tsx` (root: HTML shell, global providers) and `app/(main)/layout.tsx` (sidebar shell for all authenticated pages). Don't add a new layout unless a new group of routes needs a fundamentally different shell.
- `src/middleware.ts` handles auth/role redirects via the `access_token` cookie (decoded with `jwt-decode` for routing hints only — the backend independently verifies the signature). Don't duplicate redirect logic in components.
- Any page using `useSearchParams()` must wrap its content in `<Suspense>` (required by `next build`, not enforced in dev).

## Folder structure
- `features/<feature>/` — domain code: `components/`, `hooks/`, `services/`, `types/`. Colocate anything specific to one feature here, including feature-specific layout/presentational components (e.g. `features/auth/components/AuthLayout.tsx`).
- `components/ui/` — generic shadcn/ui primitives, no business logic.
- `components/layout/` — shared app-wide layout pieces (e.g. `AppSidebar`).
- `lib/` — generic, reusable, no domain knowledge (e.g. `lib/utils.ts` `cn()`, `lib/http/axios.ts` shared API client). If a hook/util could be copy-pasted into an unrelated project unchanged, it belongs here or in top-level `hooks/`.
- `hooks/` — top-level generic hooks only (e.g. `useIsMobile`). Domain-specific hooks go in `features/*/hooks/`.

## State management
- Local component state → `useState`.
- App-wide identity/session → `AuthContext` (`features/auth/context/AuthContext.tsx`). Don't add new global Contexts for feature data.
- Cross-route shared state or caches → Zustand (`store/seatStore.ts`, `store/useLayoutsStore.ts`). Only use a new Zustand store if state must survive navigation between routes or be invalidated from a different page than where it was set.

## API calls
- Always use `axiosInstance` from `lib/http/axios.ts` — it handles cookies (`withCredentials`), automatic 401 refresh/retry, and dispatches `auth:refresh-start`/`auth:refresh-end` events consumed by `AuthContext`. Never create a separate axios instance.
- Each feature's API calls live in `features/<feature>/services/*.service.ts`.

## Styling
- Tailwind v4. Theme tokens (colors, sidebar vars, etc.) are defined in `app/globals.css` under `:root`/`.dark` and exposed as `--color-*` tokens — use `bg-sidebar`, `text-sidebar-foreground`, etc. rather than hardcoding colors for anything theme-related.
- Use `cn()` from `lib/utils.ts` for conditional class merging.

## General
- This is a normal, current Next.js 15 project — no special/forked APIs. Follow standard Next.js App Router and React documentation.
