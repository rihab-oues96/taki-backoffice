import { api } from "@/lib/api";
import type { Media, MediaKind, MediaRule, MediaUsage, PageMeta } from "@/lib/types";

export interface MediaQuery {
  search?: string;
  kind?: MediaKind | "";
  folder?: string;
  page?: number;
  limit?: number;
}

export type MediaListMeta = PageMeta & { folders: string[] };

export const mediaApi = {
  list: (query: MediaQuery, signal?: AbortSignal) => {
    const { folder, ...rest } = query;
    return api.list<Media[], MediaListMeta>("/media", { ...rest, ...(folder ? { folder } : {}) }, signal);
  },
  rules: (signal?: AbortSignal) => api.get<MediaRule[]>("/media/rules", undefined, signal),
  get: (id: string, signal?: AbortSignal) => api.get<Media & { usage: MediaUsage[] }>(`/media/${id}`, undefined, signal),
  upload: (files: File[], folder: string) => {
    const form = new FormData();
    for (const file of files) form.append("files", file);
    form.append("folder", folder);
    return api.upload<Media[]>("POST", "/media", form);
  },
  update: (id: string, input: { alt?: string; folder?: string }) => api.patch<Media>(`/media/${id}`, input),
  replace: (id: string, file: File) => {
    const form = new FormData();
    form.append("file", file);
    return api.upload<{ media: Media; updatedReferences: number }>("PUT", `/media/${id}/file`, form);
  },
  remove: (id: string, force = false) => api.delete<{ id: string }>(`/media/${id}`, { force }),
};
