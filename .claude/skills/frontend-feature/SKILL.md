---
name: frontend-feature
description: Scaffold a new feature module (or add components/hooks/services to an existing one) in the SeatBook Next.js frontend, following the project's established conventions (feature folders, axios services, hooks, types). Use when asked to "add a new feature", "create a new page/section", "add a service for X", or "scaffold the X module" in frontend/.
---

# Frontend Feature Scaffolding

This skill generates new feature code for `frontend/src/features/<feature>/` that matches
the existing structure of this codebase (see `frontend/AGENTS.md` for the full conventions —
read it first if not already in context).

## When invoked

1. Read `frontend/AGENTS.md` for the authoritative rules (routing, state, styling, API calls).
2. Determine the feature name (kebab/lowercase folder, e.g. `amenities`, `book`, `users`).
3. Look at an existing similar feature (e.g. `frontend/src/features/amenities/`) as a live
   reference for naming and style before generating new files.
4. Create only the subfolders actually needed (`components/`, `hooks/`, `services/`, `types/`,
   and `utils/`/`schemas/`/`context/` only if the feature needs them).

## File templates

### `features/<feature>/types/<feature>.types.ts`
Plain exported interfaces. Mirror backend response shapes exactly (snake_case field names,
matching the FastAPI schema). Include:
- The core entity interface
- A paginated `<Feature>Response` (`items`, `total`, `page`, `limit`, `total_pages`, plus any
  summary stat fields the list page needs)
- `Create<Entity>Payload` / `Update<Entity>Payload` for mutations
- A `<Feature>FormData` type if there's a create/edit form

### `features/<feature>/services/<feature>Service.ts`
```ts
import { axiosInstance } from "@/lib/http/axios";
import { <Entity>Response, Create<Entity>Payload, Update<Entity>Payload } from "../types/<feature>.types";

export const <feature>Service = {
  // GET <ENTITIES>
  async get<Entities>(params?: { page?: number; limit?: number; search?: string; status?: string }): Promise<<Entity>Response> {
    const { data } = await axiosInstance.get("/<endpoint>", { params });
    return data;
  },

  // CREATE <ENTITY>
  async create<Entity>(payload: Create<Entity>Payload): Promise<<Entity>> {
    const { data } = await axiosInstance.post("/<endpoint>", payload);
    return data;
  },

  // UPDATE <ENTITY>
  async update<Entity>(id: string, payload: Update<Entity>Payload): Promise<<Entity>> {
    const { data } = await axiosInstance.patch(`/<endpoint>/${id}`, payload);
    return data;
  },
};
```
Rules:
- Always go through `axiosInstance` from `@/lib/http/axios` — never `axios` directly, never a new instance.
- One object per file, methods grouped with `// UPPERCASE COMMENT` section headers like the example above.
- Endpoint paths match the backend route prefixes (check `backend/api/routes/` if unsure).

### `features/<feature>/hooks/use<Feature>.ts`
List/data-fetching hook pattern:
```ts
import { useCallback, useEffect, useState } from "react";
import { <feature>Service } from "../services/<feature>Service";
import { <Entity>Response } from "../types/<feature>.types";

export const use<Feature> = () => {
  const [data, setData] = useState<<Entity>Response | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const limit = 50;

  const fetch<Feature> = useCallback(async () => {
    try {
      setLoading(true);
      const response = await <feature>Service.get<Entities>({ page, limit, search: search || undefined });
      setData(response);
    } catch (error) {
      console.error("Error fetching <feature>", error);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { fetch<Feature>(); }, [fetch<Feature>]);

  return { data, loading, search, setSearch, page, setPage, fetch<Feature> };
};
```
For form hooks, follow `useAmenityForm.ts` / `useEditAmenity.ts`: manage `formData` state,
`handleChange(field, value)`, `errorMessage`, `loading`, and an async `handleSubmit()` that
returns the new ID (or `null`/`false` on failure) so the calling component can navigate.

### `features/<feature>/components/<Component>.tsx`
- `"use client"` directive at the top for any component using hooks/state/router.
- Prefetch the list route on mount and on hover for back/cancel buttons:
  `useEffect(() => { router.prefetch("/admin/<feature>"); }, [router]);`
- Tailwind utility classes inline. A one-off class string used only inside this single component
  (e.g. `inputClass`/`selectClass`/`labelClass` on a form) may stay as a local `const xClass = "..."`
  at the top of the component (see `AmenityForm.tsx`). Anything else — see the constants rule below.
- Section comments in JSX (`{/* HEADER */}`, `{/* FORM CARD */}`) to mark visual blocks.
- Reuse `components/ui/*` (shadcn primitives) and theme tokens (`bg-sidebar`, etc.) per AGENTS.md
  — don't hardcode colors for theme-related elements.
- Error display: a red banner block (`bg-red-50 border border-red-200 text-red-700 ...`).

### `features/<feature>/utils/constants.ts`
All constants for a feature live here — never inline/hardcoded inside a component. This includes:
- Status/enum → style maps (e.g. a `Record<Status, string>` of badge classes).
- Status/enum → label maps (e.g. `GUEST_TYPE_LABELS`).
- Dropdown/select option lists (e.g. `STATUS_OPTIONS`, `GUEST_TYPE_OPTIONS`).
- Table header arrays, stat-card config arrays (icon + label + color groupings), and similar
  static config objects, even when they hold references to icon components (`lucide-react` icon
  refs are just object references, not JSX, so they're fine in a plain `.ts` file).

Rules:
- One canonical definition per constant — if two components in the same feature need the same
  status→style map, it belongs in `utils/constants.ts`, imported by both. Never redefine/copy the
  same map into multiple components (this was a real bug source: `BookingDetailsPanel.tsx` and
  `BookingsTable.tsx` used to each keep their own copy of the same status-style map and would
  silently drift out of sync).
- If the feature already has a single established utils file (e.g. `<feature>.utils.ts`) instead
  of a dedicated `constants.ts`, add constants there rather than creating a second utils file —
  see `frontend/src/features/security/utils/security.utils.ts` for that pattern, or
  `frontend/src/features/bookings/utils/constants.ts` for the dedicated-file pattern.
- Derive option lists from label maps instead of hand-duplicating them (e.g. build
  `GUEST_TYPE_OPTIONS` from `Object.entries(GUEST_TYPE_LABELS)`), so the two can't drift apart.
- The exception is a Tailwind class string that is purely local render styling, used only inside
  one component, and not derived from domain/status data — that may stay a local `const` per the
  component rule above.

## Pages (`src/app/`)
- New routes go under the relevant route group: `(main)` for authenticated pages, `(auth)` for
  login/SSO. Reuse `app/(main)/layout.tsx` — don't create a new layout.
- A page component must be thin — never put page logic/state/JSX directly in `src/app/`. Instead:
  1. Build the whole page as a component in `features/<feature>/components/<Feature>Page.tsx`
     (default export, `"use client"` if it uses hooks/state/router), owning all of that page's
     `useState`/`useEffect`/data-fetching and JSX.
  2. The route file at `app/.../page.tsx` only imports it and renders it — nothing else:
     ```tsx
     import <Feature>Page from "@/features/<feature>/components/<Feature>Page";

     export default function Page() {
       return <<Feature>Page />;
     }
     ```
  See `app/(main)/security/dashboard/page.tsx` → `SecurityDashboardPage` and
  `app/(main)/admin/bookings/page.tsx` → `AdminBookingsPage` as the reference pattern.
- Any constant defined at the page level (status→param maps, page-size lists, etc.) follows the
  same rule as component constants — it belongs in `features/<feature>/utils/constants.ts`, not
  declared inline in the page component.
- Wrap any `useSearchParams()` usage in `<Suspense>`.

## Sidebar navigation (`components/layout/AppSidebar.tsx`)
The sidebar's `ROUTE_MAP` and nav configs (`MAIN_NAV`, `ADMIN_MANAGE_NAV`, `FRONT_OFFICE_VISITOR_NAV`,
etc.) are **not** guaranteed to only list routes that exist under `src/app/`. Some entries were added
ahead of the page being built and are marked `disabled: true` on the `NavItem` so `NavSection` renders
them visible-but-unclickable ("Soon" badge, no `onClick`/prefetch) instead of navigating to a 404.

- **Adding a new page for an existing nav item**: after creating `src/app/.../page.tsx` for a route
  already in `ROUTE_MAP`, check whether its `NavItem` has `disabled: true` — if so, remove that flag
  now that the page exists. Grep the item's `id` in `AppSidebar.tsx` to find it.
- **Adding a brand-new nav item before its page exists**: add the `ROUTE_MAP` entry and `NavItem` as
  usual, but set `disabled: true` on the item so it doesn't 404 when clicked. Don't skip adding the
  nav entry just because the page isn't built yet — the point of this flag is "visible, not broken."
- **Never** silently ship a nav item pointing at a route with no `page.tsx` and no `disabled: true` —
  that's exactly the bug this flag exists to prevent (clicking it lands on Next's not-found page).
- This is a per-route flag, not per-role — the same disabled item may appear in multiple role sections
  (e.g. `notifications` shows up in both `PERSONAL_NAV` and `ADMIN_OPERATIONS_NAV`); update every
  occurrence of the `id`, not just the first one you find.

## State
- Local UI state → `useState` in the component or hook.
- Don't introduce a new Zustand store or Context unless the data must persist across route
  navigation or be shared/invalidated from another page — see AGENTS.md.

## After generating
- Cross-check the new types/payloads against the actual backend schema in
  `backend/schemas/` and the route in `backend/api/routes/` to make sure field names match.
- Run `npm run lint` in `frontend/` to catch convention issues.
