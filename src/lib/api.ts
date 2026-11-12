import type { FieldIssue } from "./types";

/**
 * The only place that talks HTTP. Every call goes to this app's own origin (/api is
 * forwarded to the CMS API by next.config.ts), with the session cookie attached.
 */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }

  /** Field-level problems returned by the API for a 422. */
  get issues(): FieldIssue[] {
    return this.status === 422 && Array.isArray(this.details) ? (this.details as FieldIssue[]) : [];
  }
}

interface Envelope<T, M> {
  success: boolean;
  data: T;
  meta?: M;
  error?: { code: string; message: string; details?: unknown };
}

type Query = Record<string, string | number | boolean | undefined | null>;

function buildUrl(path: string, query?: Query): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== "") params.set(key, String(value));
  }
  const qs = params.toString();
  return `/api${path}${qs ? `?${qs}` : ""}`;
}

/** Called when the API says the session is gone; set by the auth provider. */
let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

async function request<T, M = undefined>(
  method: string,
  path: string,
  options: { query?: Query; body?: unknown; form?: FormData; signal?: AbortSignal } = {},
): Promise<{ data: T; meta: M }> {
  let res: Response;
  try {
    res = await fetch(buildUrl(path, options.query), {
      method,
      credentials: "same-origin",
      headers: options.body !== undefined ? { "content-type": "application/json" } : undefined,
      body: options.form ?? (options.body !== undefined ? JSON.stringify(options.body) : undefined),
      signal: options.signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    throw new ApiError(0, "NETWORK_ERROR", "Connexion au serveur impossible. Vérifiez votre connexion et réessayez.");
  }

  let payload: Envelope<T, M> | null = null;
  try {
    payload = (await res.json()) as Envelope<T, M>;
  } catch {
    /* non-JSON response (proxy error page…) */
  }

  if (!res.ok || !payload?.success) {
    const error = payload?.error;
    if (res.status === 401 && path !== "/auth/login") onUnauthorized?.();
    throw new ApiError(
      res.status,
      error?.code ?? "UNKNOWN",
      error?.message ?? (res.status >= 500 ? "Le serveur est momentanément indisponible." : "La requête a échoué."),
      error?.details,
    );
  }
  return { data: payload.data, meta: payload.meta as M };
}

export const api = {
  get: async <T>(path: string, query?: Query, signal?: AbortSignal) => (await request<T>("GET", path, { query, signal })).data,
  /** GET that also returns the `meta` block (pagination…). */
  list: <T, M>(path: string, query?: Query, signal?: AbortSignal) => request<T, M>("GET", path, { query, signal }),
  post: async <T>(path: string, body?: unknown) => (await request<T>("POST", path, { body: body ?? {} })).data,
  put: async <T>(path: string, body?: unknown) => (await request<T>("PUT", path, { body: body ?? {} })).data,
  patch: async <T>(path: string, body?: unknown) => (await request<T>("PATCH", path, { body: body ?? {} })).data,
  delete: async <T>(path: string, query?: Query) => (await request<T>("DELETE", path, { query })).data,
  upload: async <T>(method: "POST" | "PUT", path: string, form: FormData) => (await request<T>(method, path, { form })).data,
};

export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  return "Une erreur inattendue est survenue.";
}
