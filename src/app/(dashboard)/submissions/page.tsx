"use client";

import { ArrowDown, ArrowUp, ArrowUpDown, Download, Eye, FileDown, Inbox, Search, StickyNote, Trash2 } from "lucide-react";
import { useState } from "react";
import { ButtonLink, IconButton } from "@/components/ui/Button";
import { Badge, EmptyState, ErrorState, SkeletonList } from "@/components/ui/Feedback";
import { Input, Select } from "@/components/ui/Form";
import { PageHeader } from "@/components/ui/Layout";
import { ConfirmDialog } from "@/components/ui/Modal";
import { Pager, Table, Td, Th, Tr } from "@/components/ui/Table";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/features/auth/AuthProvider";
import { RequirePermission } from "@/features/auth/Guard";
import {
  notifySubmissionsChanged,
  pendingTotal,
  STATUS_LABELS,
  STATUS_TONES,
  SUBMISSION_STATUSES,
  SUBMISSION_TYPES,
  submissionsApi,
  TYPE_LABELS,
  TYPE_PLURALS,
  TYPE_TONES,
  type SubmissionFilters,
} from "@/features/submissions/api";
import { SubmissionDetails } from "@/features/submissions/SubmissionDetails";
import { useDebounced } from "@/hooks/useDebounced";
import { useQuery } from "@/hooks/useQuery";
import { cn } from "@/lib/cn";
import { formatDateTime, timeAgo } from "@/lib/format";
import type { SubmissionItem, SubmissionStatus, SubmissionType } from "@/lib/types";

type SortKey = NonNullable<SubmissionFilters["sort"]>;
type Order = NonNullable<SubmissionFilters["order"]>;

/** Column header that sorts the table; a second click reverses the order. */
function SortButton({ label, active, order, onClick }: { label: string; active: boolean; order: Order; onClick: () => void }) {
  const Icon = !active ? ArrowUpDown : order === "asc" ? ArrowUp : ArrowDown;
  return (
    <button type="button" onClick={onClick} className={cn("inline-flex items-center gap-1.5 uppercase tracking-[0.06em] hover:text-navy", active && "text-navy")}>
      {label}
      <Icon size={13} aria-hidden />
    </button>
  );
}

export default function SubmissionsPage() {
  const toast = useToast();
  const { can } = useAuth();
  const [type, setType] = useState<SubmissionType | "">("");
  const [status, setStatus] = useState<SubmissionStatus | "">("");
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [sort, setSort] = useState<SortKey>("createdAt");
  const [order, setOrder] = useState<Order>("desc");
  const [page, setPage] = useState(1);
  const [detailsId, setDetailsId] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<SubmissionItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const debouncedSearch = useDebounced(search);

  const filters: SubmissionFilters = { type, status, search: debouncedSearch, from, to, sort, order };
  const list = useQuery((signal) => submissionsApi.list({ ...filters, page, limit: 20 }, signal), [type, status, debouncedSearch, from, to, sort, order, page]);

  const items = list.data?.data ?? [];
  const meta = list.data?.meta;
  const counts = meta?.counts;
  const filtered = Boolean(type || status || debouncedSearch || from || to);
  const manage = can("submissions:manage");

  /** Any change of filter goes back to the first page. */
  function resetPage<T>(setter: (value: T) => void) {
    return (value: T) => {
      setter(value);
      setPage(1);
    };
  }

  function sortBy(key: SortKey) {
    if (sort === key) setOrder(order === "asc" ? "desc" : "asc");
    else {
      setSort(key);
      // Names read best from A to Z, dates from the most recent.
      setOrder(key === "name" ? "asc" : "desc");
    }
    setPage(1);
  }
  const ariaSort = (key: SortKey) => (sort !== key ? "none" : order === "asc" ? "ascending" : "descending");

  async function remove() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await submissionsApi.remove(toDelete.id);
      toast.success("Demande supprimée");
      setToDelete(null);
      notifySubmissionsChanged();
      await list.reload();
    } catch (err) {
      toast.fromError(err);
    } finally {
      setDeleting(false);
    }
  }

  const tabs: { value: SubmissionType | ""; label: string }[] = [{ value: "", label: "Toutes" }, ...SUBMISSION_TYPES.map((t) => ({ value: t, label: TYPE_PLURALS[t] }))];

  return (
    <RequirePermission permissions={["submissions:read"]}>
      <PageHeader
        eyebrow="Formulaires du site"
        title={<>Demandes <em>reçues</em></>}
        description="Messages de contact, pré-inscriptions et candidatures envoyés depuis le site. Ouvrez une demande pour la consulter, suivre son traitement ou télécharger un CV."
        actions={
          <ButtonLink href={submissionsApi.exportUrl(filters)} download variant="line" size="sm" icon={<FileDown size={15} aria-hidden />}>
            Exporter (CSV)
          </ButtonLink>
        }
      />

      <div role="group" aria-label="Filtrer par formulaire" className="mb-4 flex flex-wrap gap-2">
        {tabs.map((tab) => {
          const active = type === tab.value;
          const pending = counts ? pendingTotal(counts, tab.value) : 0;
          return (
            <button
              key={tab.value || "all"}
              type="button"
              aria-pressed={active}
              onClick={() => resetPage(setType)(tab.value)}
              className={cn(
                "inline-flex h-10 items-center gap-2 rounded-full border-[1.5px] px-4 text-[13.5px] font-semibold transition",
                active ? "border-brand bg-brand text-white" : "border-line-strong bg-white text-navy hover:border-brand hover:text-brand-deep",
              )}
            >
              {tab.label}
              {pending > 0 && (
                <span className={cn("rounded-full px-2 py-0.5 text-[11.5px] font-bold leading-none", active ? "bg-white text-brand-deep" : "bg-sun text-navy-900")}>
                  {pending}
                  <span className="sr-only"> en attente</span>
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" aria-hidden />
          <Input
            type="search"
            value={search}
            placeholder="Rechercher par nom, e-mail, téléphone, objet ou référence…"
            aria-label="Rechercher une demande"
            className="pl-10"
            onChange={(e) => resetPage(setSearch)(e.target.value)}
          />
        </div>
        <Select value={status} aria-label="Filtrer par statut" className="w-auto! min-w-[170px]" onChange={(e) => resetPage(setStatus)(e.target.value as SubmissionStatus | "")}>
          <option value="">Tous les statuts</option>
          {SUBMISSION_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </Select>
        <label className="flex items-center gap-2 text-[13.5px] font-semibold text-ink-soft">
          Du
          <Input type="date" value={from} max={to || undefined} className="w-auto!" onChange={(e) => resetPage(setFrom)(e.target.value)} />
        </label>
        <label className="flex items-center gap-2 text-[13.5px] font-semibold text-ink-soft">
          au
          <Input type="date" value={to} min={from || undefined} className="w-auto!" onChange={(e) => resetPage(setTo)(e.target.value)} />
        </label>
      </div>

      {list.loading ? (
        <SkeletonList rows={6} />
      ) : list.error ? (
        <ErrorState message={list.error} onRetry={list.reload} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Inbox size={24} aria-hidden />}
          title={filtered ? "Aucune demande ne correspond" : "Aucune demande reçue pour le moment"}
          text={filtered ? "Modifiez votre recherche ou vos filtres." : "Les formulaires envoyés depuis le site apparaîtront ici."}
        />
      ) : (
        <>
          <Table className={cn(list.refreshing && "opacity-60")}>
            <thead>
              <tr>
                <Th sort={ariaSort("name")}>
                  <SortButton label="Demandeur" active={sort === "name"} order={order} onClick={() => sortBy("name")} />
                </Th>
                <Th>Formulaire</Th>
                <Th>Objet</Th>
                <Th sort={ariaSort("createdAt")}>
                  <SortButton label="Reçue" active={sort === "createdAt"} order={order} onClick={() => sortBy("createdAt")} />
                </Th>
                <Th>Statut</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {items.map((s) => (
                <Tr key={s.id}>
                  <Td>
                    <button type="button" onClick={() => setDetailsId(s.id)} className="block max-w-[260px] text-left">
                      <span className={cn("block truncate text-navy hover:text-brand-deep", s.status === "pending" ? "font-bold" : "font-semibold")}>{s.name}</span>
                      <span className="block truncate text-[13px] text-muted">{s.email}</span>
                    </button>
                  </Td>
                  <Td>
                    <span className="inline-flex flex-wrap items-center gap-1.5">
                      <Badge tone={TYPE_TONES[s.type]}>{TYPE_LABELS[s.type]}</Badge>
                      {s.suspect && (
                        <span title="Le champ anti-robot du formulaire était rempli : envoi automatique possible.">
                          <Badge tone="warning">À vérifier</Badge>
                        </span>
                      )}
                    </span>
                  </Td>
                  <Td>
                    <span className="block max-w-[280px] truncate text-ink-soft" title={s.subject}>
                      {s.subject || "—"}
                    </span>
                    <span className="flex items-center gap-1.5 font-mono text-[12px] text-muted">
                      {s.reference}
                      {s.hasNote && <StickyNote size={12} aria-label="Note interne" />}
                    </span>
                  </Td>
                  <Td className="whitespace-nowrap text-[13px] text-muted">
                    <span title={formatDateTime(s.createdAt)}>{timeAgo(s.createdAt)}</span>
                  </Td>
                  <Td>
                    <Badge tone={STATUS_TONES[s.status]} dot>
                      {STATUS_LABELS[s.status]}
                    </Badge>
                  </Td>
                  <Td>
                    <div className="flex justify-end gap-0.5">
                      <IconButton label={`Ouvrir la demande de ${s.name}`} onClick={() => setDetailsId(s.id)}>
                        <Eye size={15} aria-hidden />
                      </IconButton>
                      {s.hasCv && (
                        <a
                          href={submissionsApi.cvUrl(s.id)}
                          download
                          aria-label={`Télécharger le CV de ${s.name}`}
                          title={`Télécharger le CV de ${s.name}`}
                          className="grid size-9 shrink-0 place-items-center rounded-full text-ink-soft transition hover:bg-mist hover:text-brand-deep"
                        >
                          <Download size={15} aria-hidden />
                        </a>
                      )}
                      {manage && (
                        <IconButton label={`Supprimer la demande de ${s.name}`} tone="danger" onClick={() => setToDelete(s)}>
                          <Trash2 size={15} aria-hidden />
                        </IconButton>
                      )}
                    </div>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
          {meta && <Pager page={meta.page} pages={meta.pages} total={meta.total} onPage={setPage} />}
        </>
      )}

      <SubmissionDetails id={detailsId} onClose={() => setDetailsId(null)} onChanged={() => void list.reload()} />
      <ConfirmDialog
        open={toDelete !== null}
        title="Supprimer cette demande ?"
        loading={deleting}
        onConfirm={() => void remove()}
        onClose={() => setToDelete(null)}
        message={
          <>
            La demande <strong>{toDelete?.reference}</strong> de <strong>{toDelete?.name}</strong>
            {toDelete?.hasCv ? ", son CV" : ""} et sa note interne seront définitivement supprimés.
          </>
        }
      />
    </RequirePermission>
  );
}
