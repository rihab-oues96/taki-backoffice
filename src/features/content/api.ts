import { api } from "@/lib/api";
import type { ContentObject, ContentType, Entry, FieldDef, PageMeta, PageSummary, Section, SectionSummary } from "@/lib/types";

export const pagesApi = {
  list: (signal?: AbortSignal) => api.get<PageSummary[]>("/pages", undefined, signal),
};

export const sectionsApi = {
  list: (page: string, signal?: AbortSignal) => api.get<SectionSummary[]>("/sections", { page }, signal),
  get: (id: string, signal?: AbortSignal) => api.get<Section>(`/sections/${id}`, undefined, signal),
  create: (input: { page: string; key: string; label: string; description: string; fields: FieldDef[] }) => api.post<Section>("/sections", input),
  update: (id: string, input: Partial<{ label: string; description: string; visible: boolean; fields: FieldDef[] }>) => api.patch<Section>(`/sections/${id}`, input),
  saveDraft: (id: string, content: ContentObject) => api.put<Section>(`/sections/${id}/draft`, { content }),
  discardDraft: (id: string) => api.delete<Section>(`/sections/${id}/draft`),
  publish: (id: string, content?: ContentObject) => api.post<Section>(`/sections/${id}/publish`, content ? { content } : {}),
  remove: (id: string) => api.delete<{ id: string }>(`/sections/${id}`),
  reorder: (page: string, ids: string[]) => api.post<SectionSummary[]>("/sections/reorder", { page, ids }),
};

export interface EntriesQuery {
  type: string;
  search?: string;
  status?: "visible" | "hidden" | "draft" | "";
  page?: number;
  limit?: number;
}

export type ContentTypeInput = Omit<ContentType, "count">;

export const contentTypesApi = {
  list: (signal?: AbortSignal) => api.get<ContentType[]>("/content-types", undefined, signal),
  get: (key: string, signal?: AbortSignal) => api.get<ContentType>(`/content-types/${key}`, undefined, signal),
  create: (input: ContentTypeInput) => api.post<ContentType>("/content-types", input),
  update: (key: string, input: Partial<Omit<ContentTypeInput, "key">>) => api.patch<ContentType>(`/content-types/${key}`, input),
};

export const entriesApi = {
  list: (query: EntriesQuery, signal?: AbortSignal) => api.list<Entry[], PageMeta>("/entries", { ...query }, signal),
  get: (id: string, signal?: AbortSignal) => api.get<Entry>(`/entries/${id}`, undefined, signal),
  create: (input: { type: string; data: ContentObject; slug?: string; visible: boolean }) => api.post<Entry>("/entries", input),
  update: (id: string, input: { visible?: boolean; slug?: string }) => api.patch<Entry>(`/entries/${id}`, input),
  saveDraft: (id: string, data: ContentObject) => api.put<Entry>(`/entries/${id}/draft`, { data }),
  discardDraft: (id: string) => api.delete<Entry>(`/entries/${id}/draft`),
  publish: (id: string, data?: ContentObject) => api.post<Entry>(`/entries/${id}/publish`, data ? { data } : {}),
  remove: (id: string) => api.delete<{ id: string }>(`/entries/${id}`),
  reorder: (type: string, ids: string[]) => api.post<{ reordered: number }>("/entries/reorder", { type, ids }),
};

export const previewApi = {
  /** Short-lived link that opens the website with unpublished drafts visible. */
  link: (path: string) => api.post<{ url: string }>("/dashboard/preview-link", { path }),
};
