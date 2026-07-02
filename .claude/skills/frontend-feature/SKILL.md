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
- Tailwind utility classes inline; define repeated class strings as local `const xClass = "..."`
  at the top of the component (see `AmenityForm.tsx` for `inputClass`/`selectClass`/`labelClass`).
- Section comments in JSX (`{/* HEADER */}`, `{/* FORM CARD */}`) to mark visual blocks.
- Reuse `components/ui/*` (shadcn primitives) and theme tokens (`bg-sidebar`, etc.) per AGENTS.md
  — don't hardcode colors for theme-related elements.
- Error display: a red banner block (`bg-red-50 border border-red-200 text-red-700 ...`).

## Pages (`src/app/`)
- New routes go under the relevant route group: `(main)` for authenticated pages, `(auth)` for
  login/SSO. Reuse `app/(main)/layout.tsx` — don't create a new layout.
- A page component should be thin: import the feature component(s) and render them.
- Wrap any `useSearchParams()` usage in `<Suspense>`.

## State
- Local UI state → `useState` in the component or hook.
- Don't introduce a new Zustand store or Context unless the data must persist across route
  navigation or be shared/invalidated from another page — see AGENTS.md.

## After generating
- Cross-check the new types/payloads against the actual backend schema in
  `backend/schemas/` and the route in `backend/api/routes/` to make sure field names match.
- Run `npm run lint` in `frontend/` to catch convention issues.
