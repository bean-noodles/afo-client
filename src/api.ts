import type { SessionDetail, SquadDetail, SquadSummary, UploadResult, User } from "./types";

const CONFIGURED_BASE = import.meta.env.VITE_API_BASE_URL as string | undefined;

/**
 * With no VITE_API_BASE_URL the app runs on the bundled sample squad instead
 * of talking to a backend, so the UI stays workable without one running.
 */
export const IS_API_CONFIGURED = Boolean(CONFIGURED_BASE);

const API_BASE = (CONFIGURED_BASE ?? "http://localhost:8000").replace(/\/$/, "");

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, token: string | null, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body?.detail ?? detail;
    } catch {
      // response body wasn't JSON — keep statusText
    }
    throw new ApiError(res.status, detail);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

const jsonHeaders = { "Content-Type": "application/json" };

export function requestMagicLink(email: string) {
  return request<{ message: string }>("/auth/email/request", null, {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify({ email }),
  });
}

export function loginWithGoogle(idToken: string) {
  return request<{ token: string; user: User }>("/auth/google", null, {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify({ id_token: idToken }),
  });
}

export function fetchMe(token: string) {
  return request<User>("/auth/me", token);
}

export function listSquads(token: string) {
  return request<SquadSummary[]>("/squads", token);
}

export function getSquad(token: string, squadId: string) {
  return request<SquadDetail>(`/squads/${squadId}`, token);
}

export function getSession(token: string, squadId: string, executionId: string) {
  return request<SessionDetail>(`/squads/${squadId}/sessions/${encodeURIComponent(executionId)}`, token);
}

export function uploadSquad(token: string, file: File) {
  const form = new FormData();
  form.append("file", file);
  return request<UploadResult>("/squads/upload", token, { method: "POST", body: form });
}

export function deleteSquad(token: string, squadId: string) {
  return request<void>(`/squads/${squadId}`, token, { method: "DELETE" });
}
