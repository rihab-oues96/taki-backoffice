import { api } from "@/lib/api";
import type { PageMeta, SubmissionCounts, SubmissionDetail, SubmissionItem, SubmissionStatus, SubmissionType } from "@/lib/types";

export interface SubmissionFilters {
  type?: SubmissionType | "";
  status?: SubmissionStatus | "";
  search?: string;
  /** Received on or after / on or before this day (`YYYY-MM-DD`). */
  from?: string;
  to?: string;
  sort?: "createdAt" | "name";
  order?: "asc" | "desc";
}

export type SubmissionListMeta = PageMeta & { counts: SubmissionCounts };

export const submissionsApi = {
  list: (query: SubmissionFilters & { page?: number; limit?: number }, signal?: AbortSignal) =>
    api.list<SubmissionItem[], SubmissionListMeta>("/submissions", { ...query }, signal),
  counts: (signal?: AbortSignal) => api.get<SubmissionCounts>("/submissions/counts", undefined, signal),
  get: (id: string, signal?: AbortSignal) => api.get<SubmissionDetail>(`/submissions/${id}`, undefined, signal),
  update: (id: string, input: { status?: SubmissionStatus; note?: string }) => api.patch<SubmissionDetail>(`/submissions/${id}`, input),
  remove: (id: string) => api.delete<{ id: string }>(`/submissions/${id}`),
  /** Download links: the browser fetches them itself, with the session cookie. */
  cvUrl: (id: string) => `/api/submissions/${id}/cv`,
  exportUrl: (filters: SubmissionFilters) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(filters)) if (value) params.set(key, value);
    const qs = params.toString();
    return `/api/submissions/export${qs ? `?${qs}` : ""}`;
  },
};

export const TYPE_LABELS: Record<SubmissionType, string> = {
  contact: "Contact",
  admission: "Pré-inscription",
  job: "Candidature",
};

export const TYPE_PLURALS: Record<SubmissionType, string> = {
  contact: "Messages de contact",
  admission: "Pré-inscriptions",
  job: "Candidatures",
};

/** One colour per form, so the kind of a submission is recognised at a glance in the list. */
export const TYPE_TONES: Record<SubmissionType, "blue" | "violet" | "teal"> = {
  contact: "blue",
  admission: "violet",
  job: "teal",
};

export const STATUS_LABELS: Record<SubmissionStatus, string> = {
  pending: "En attente",
  reviewed: "Consultée",
  handled: "Traitée",
};

export const STATUS_TONES: Record<SubmissionStatus, "warning" | "brand" | "success"> = {
  pending: "warning",
  reviewed: "brand",
  handled: "success",
};

export const SUBMISSION_TYPES = Object.keys(TYPE_LABELS) as SubmissionType[];
export const SUBMISSION_STATUSES = Object.keys(STATUS_LABELS) as SubmissionStatus[];

/** Submissions nobody has looked at yet, for one form or for all of them. */
export function pendingTotal(counts: SubmissionCounts, type?: SubmissionType | ""): number {
  return (type ? [type] : SUBMISSION_TYPES).reduce((n, t) => n + (counts[t]?.pending ?? 0), 0);
}

/** Fired on `window` after a submission changed status or was deleted, so the menu counter follows. */
export const SUBMISSIONS_CHANGED = "submissions:changed";
export const notifySubmissionsChanged = () => window.dispatchEvent(new Event(SUBMISSIONS_CHANGED));
