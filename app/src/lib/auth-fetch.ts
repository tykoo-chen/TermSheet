/**
 * Auth-aware fetch wrapper with automatic token refresh on 401.
 *
 * Flow:
 * 1. Get current access token from Supabase session
 * 2. Make the request with Bearer token
 * 3. If 401 → refresh session once → retry with new token
 * 4. If still 401 → throw (user must re-login)
 */
import { supabase } from "./supabase";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function getAccessToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

async function refreshAndGetToken(): Promise<string | null> {
  const { data: { session }, error } = await supabase.auth.refreshSession();
  if (error || !session) return null;
  return session.access_token;
}

/**
 * Authenticated fetch to the backend API.
 * Automatically adds Authorization header and retries once on 401.
 */
export async function authFetch(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const url = `${API_BASE}${path}`;

  // First attempt with current token
  let token = await getAccessToken();
  if (!token) {
    // Try refreshing before giving up
    token = await refreshAndGetToken();
    if (!token) throw new Error("Not authenticated");
  }

  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${token}`);
  if (init?.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  let res = await fetch(url, { ...init, headers });

  // If 401 (expired token), refresh once and retry
  if (res.status === 401) {
    const newToken = await refreshAndGetToken();
    if (!newToken) throw new Error("Session expired — please log in again");

    headers.set("Authorization", `Bearer ${newToken}`);
    res = await fetch(url, { ...init, headers });
  }

  return res;
}
