import { cookies } from "next/headers";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

/**
 * Fetch helper for Server Components — forwards the request's cookies
 * (auth tokens) to the backend and always bypasses the fetch cache,
 * since responses are per-user/tenant.
 */
export async function serverFetch<T>(path: string): Promise<T> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map(({ name, value }) => `${name}=${value}`)
    .join("; ");

  const res = await fetch(`${BACKEND_URL}${path}`, {
    headers: cookieHeader ? { Cookie: cookieHeader } : undefined,
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`serverFetch failed: ${path} (${res.status})`);
  }

  return res.json();
}
