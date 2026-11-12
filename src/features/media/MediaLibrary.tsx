"use client";

import { Check, ImageOff, Search } from "lucide-react";
import { useState } from "react";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/Feedback";
import { Input, Select } from "@/components/ui/Form";
import { Pager } from "@/components/ui/Table";
import { useAuth } from "@/features/auth/AuthProvider";
import { useDebounced } from "@/hooks/useDebounced";
import { useQuery } from "@/hooks/useQuery";
import { cn } from "@/lib/cn";
import { formatBytes } from "@/lib/format";
import type { Media, MediaKind } from "@/lib/types";
import { mediaApi } from "./api";
import { MediaDetails } from "./MediaDetails";
import { MediaThumb } from "./MediaThumb";
import { UploadZone } from "./UploadZone";

const KIND_LABELS: Record<MediaKind, string> = { image: "Images", video: "Vidéos", document: "Documents" };

/**
 * The media library, used as a page (browse, upload, manage) and inside the picker
 * (`onSelect` set: clicking a file chooses it instead of opening its details).
 */
export function MediaLibrary({ onSelect, selectedUrl, only }: { onSelect?: (media: Media) => void; selectedUrl?: string; only?: "image" | "video" }) {
  const { can } = useAuth();
  const [search, setSearch] = useState("");
  const [kind, setKind] = useState<MediaKind | "">(only ?? "");
  const [folder, setFolder] = useState("");
  const [page, setPage] = useState(1);
  const [detailsId, setDetailsId] = useState<string | null>(null);
  const debouncedSearch = useDebounced(search);
  const limit = onSelect ? 24 : 36;

  const rules = useQuery((signal) => mediaApi.rules(signal), []);
  const list = useQuery((signal) => mediaApi.list({ search: debouncedSearch, kind, folder, page, limit }, signal), [debouncedSearch, kind, folder, page, limit]);

  const items = list.data?.data ?? [];
  const meta = list.data?.meta;
  const folders = meta?.folders ?? [];
  const filtered = Boolean(debouncedSearch || folder || (kind && !only));

  function resetPage<T>(setter: (value: T) => void) {
    return (value: T) => {
      setter(value);
      setPage(1);
    };
  }

  return (
    <div className="space-y-5">
      {can("media:write") && rules.data && (
        <UploadZone
          rules={rules.data}
          folder={folder}
          accept={only}
          compact={Boolean(onSelect)}
          onUploaded={(media) => {
            if (onSelect && media.length === 1 && media[0]) onSelect(media[0]);
            else void list.reload();
          }}
        />
      )}

      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" aria-hidden />
          <Input type="search" value={search} onChange={(e) => resetPage(setSearch)(e.target.value)} placeholder="Rechercher un fichier…" aria-label="Rechercher un fichier" className="pl-10" />
        </div>
        {!only && (
          <Select value={kind} onChange={(e) => resetPage(setKind)(e.target.value as MediaKind | "")} aria-label="Type de fichier" className="w-auto! min-w-[150px]">
            <option value="">Tous les types</option>
            {(Object.keys(KIND_LABELS) as MediaKind[]).map((k) => (
              <option key={k} value={k}>
                {KIND_LABELS[k]}
              </option>
            ))}
          </Select>
        )}
        <Select value={folder} onChange={(e) => resetPage(setFolder)(e.target.value)} aria-label="Dossier" className="w-auto! min-w-[170px]">
          <option value="">Tous les dossiers</option>
          {folders.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </Select>
      </div>

      {list.loading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6" role="status" aria-label="Chargement">
          {Array.from({ length: 12 }, (_, i) => (
            <Skeleton key={i} className="aspect-square" />
          ))}
        </div>
      ) : list.error ? (
        <ErrorState message={list.error} onRetry={list.reload} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<ImageOff size={24} aria-hidden />}
          title={filtered ? "Aucun média ne correspond" : "La médiathèque est vide"}
          text={filtered ? "Modifiez votre recherche ou vos filtres." : "Importez vos premières images pour les utiliser dans les contenus."}
        />
      ) : (
        <>
          <ul className={cn("grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4", onSelect ? "lg:grid-cols-5" : "xl:grid-cols-6", list.refreshing && "opacity-60")}>
            {items.map((m) => {
              const selected = selectedUrl === m.url;
              return (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => (onSelect ? onSelect(m) : setDetailsId(m.id))}
                    aria-pressed={onSelect ? selected : undefined}
                    className={cn(
                      "group relative block w-full overflow-hidden rounded-2xl border bg-white text-left transition hover:-translate-y-0.5 hover:shadow-[0_14px_30px_-18px_rgba(11,51,70,.5)]",
                      selected ? "border-brand ring-4 ring-brand/20" : "border-line hover:border-brand",
                    )}
                  >
                    <MediaThumb url={m.url} kind={m.kind} alt={m.alt} contain={m.mimeType !== "image/jpeg"} className="aspect-square w-full" />
                    {selected && (
                      <span className="absolute right-2 top-2 grid size-6 place-items-center rounded-full bg-brand text-white">
                        <Check size={14} strokeWidth={3} aria-hidden />
                      </span>
                    )}
                    <span className="block px-3 py-2">
                      <span className="block truncate text-[13px] font-semibold text-navy">{m.originalName}</span>
                      <span className="block truncate text-xs text-muted">
                        {formatBytes(m.size)}
                        {m.folder && ` · ${m.folder}`}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          {meta && <Pager page={meta.page} pages={meta.pages} total={meta.total} onPage={setPage} />}
        </>
      )}

      {!onSelect && <MediaDetails id={detailsId} rules={rules.data ?? []} onClose={() => setDetailsId(null)} onChanged={() => void list.reload()} />}
    </div>
  );
}
