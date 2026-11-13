"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, ChevronRight, Inbox, Pencil, Plus, Search, Settings2, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button, ButtonLink, IconButton } from "@/components/ui/Button";
import { Badge, EmptyState, ErrorState, SkeletonList, StatusBadges } from "@/components/ui/Feedback";
import { Input, Select, Switch } from "@/components/ui/Form";
import { Card, PageHeader } from "@/components/ui/Layout";
import { ConfirmDialog } from "@/components/ui/Modal";
import { Pager, Table, Td, Th, Tr } from "@/components/ui/Table";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/features/auth/AuthProvider";
import { RequirePermission } from "@/features/auth/Guard";
import { contentTypesApi, entriesApi, sectionsApi, type EntriesQuery } from "@/features/content/api";
import { partsOnContentType, SHARED_PAGE } from "@/features/content/shared";
import { StructureModal } from "@/features/content/StructureModal";
import { MediaThumb } from "@/features/media/MediaThumb";
import { useDebounced } from "@/hooks/useDebounced";
import { useQuery } from "@/hooks/useQuery";
import { plain, timeAgo } from "@/lib/format";
import type { Entry } from "@/lib/types";

const LIMIT = 50;

export default function EntriesPage() {
  const { type: typeKey } = useParams<{ type: string }>();
  const router = useRouter();
  const toast = useToast();
  const { can } = useAuth();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<EntriesQuery["status"]>("");
  const [page, setPage] = useState(1);
  const [toDelete, setToDelete] = useState<Entry | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [structureOpen, setStructureOpen] = useState(false);
  const debounced = useDebounced(search);

  const type = useQuery((signal) => contentTypesApi.get(typeKey, signal), [typeKey]);
  const list = useQuery((signal) => entriesApi.list({ type: typeKey, search: debounced, status, page, limit: LIMIT }, signal), [typeKey, debounced, status, page]);

  // Shared blocks shown with this list on the website (e.g. the title above the questions).
  const hosted = partsOnContentType(typeKey);
  const needsShared = hosted.length > 0;
  const shared = useQuery(async (signal) => (needsShared ? sectionsApi.list(SHARED_PAGE, signal) : []), [needsShared]);
  const blocks = hosted.flatMap((part) => (shared.data ?? []).filter((s) => s.key === part.section).map((section) => ({ section, part })));

  const items = list.data?.data ?? [];
  const meta = list.data?.meta;
  const filtered = Boolean(debounced || status);
  // Reordering only makes sense on the complete, unfiltered list.
  const canReorder = can("content:publish") && !filtered && (meta?.pages ?? 1) === 1;
  const t = type.data;

  const patch = (id: string, changes: Partial<Entry>) =>
    list.setData((current) => (current ? { ...current, data: current.data.map((e) => (e.id === id ? { ...e, ...changes } : e)) } : current));

  async function toggle(entry: Entry, visible: boolean) {
    patch(entry.id, { visible });
    try {
      await entriesApi.update(entry.id, { visible });
      toast.success(visible ? "Visible sur le site" : "Masqué sur le site");
    } catch (err) {
      patch(entry.id, { visible: !visible });
      toast.fromError(err);
    }
  }

  async function move(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target] as Entry, next[index] as Entry];
    const previous = list.data;
    list.setData((current) => (current ? { ...current, data: next } : current));
    try {
      await entriesApi.reorder(typeKey, next.map((e) => e.id));
    } catch (err) {
      list.setData(() => previous);
      toast.fromError(err);
    }
  }

  async function remove() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await entriesApi.remove(toDelete.id);
      toast.success("Contenu supprimé");
      setToDelete(null);
      await list.reload();
    } catch (err) {
      toast.fromError(err);
    } finally {
      setDeleting(false);
    }
  }

  const text = (entry: Entry, field: string) => {
    const v = entry.data[field];
    return typeof v === "string" ? plain(v) : "";
  };

  return (
    <RequirePermission permissions={["content:read"]}>
      <PageHeader
        crumbs={[{ label: "Contenus", href: "/content" }, { label: t?.label ?? typeKey }]}
        title={t?.label ?? "Contenus"}
        description={t?.description}
        actions={
          <>
            {can("content:structure") && t && (
              <Button variant="line" size="sm" icon={<Settings2 size={15} aria-hidden />} onClick={() => setStructureOpen(true)}>
                Structure
              </Button>
            )}
            {can("content:write", "content:publish") && (
              <ButtonLink href={`/content/${typeKey}/new`} size="sm" icon={<Plus size={15} aria-hidden />}>
                Ajouter
              </ButtonLink>
            )}
          </>
        }
      />

      {blocks.map(({ section, part }) => (
        <Card key={part.id} className="mb-4 transition hover:border-brand/60">
          <Link href={`/sections/${section.id}/${part.id}`} className="group flex items-center gap-4 px-5 py-3.5">
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-[15.5px] font-semibold text-navy group-hover:text-brand-deep">{part.label}</h2>
              <p className="truncate text-[13px] text-muted">{part.description}</p>
            </div>
            {section.hasDraft && <Badge tone="warning">Brouillon en attente</Badge>}
            <ChevronRight size={16} className="shrink-0 text-muted transition group-hover:translate-x-0.5 group-hover:text-brand-deep" aria-hidden />
          </Link>
        </Card>
      ))}

      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" aria-hidden />
          <Input
            type="search"
            value={search}
            placeholder="Rechercher par titre…"
            aria-label="Rechercher"
            className="pl-10"
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <Select
          value={status}
          aria-label="Filtrer par état"
          className="w-auto! min-w-[190px]"
          onChange={(e) => {
            setStatus(e.target.value as EntriesQuery["status"]);
            setPage(1);
          }}
        >
          <option value="">Tous les états</option>
          <option value="visible">En ligne</option>
          <option value="hidden">Masqués</option>
          <option value="draft">Avec brouillon</option>
        </Select>
      </div>

      {list.loading || type.loading ? (
        <SkeletonList rows={7} />
      ) : list.error || type.error ? (
        <ErrorState message={list.error ?? type.error ?? ""} onRetry={() => void Promise.all([list.reload(), type.reload()])} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Inbox size={24} aria-hidden />}
          title={filtered ? "Aucun résultat" : "Rien ici pour le moment"}
          text={filtered ? "Modifiez votre recherche ou le filtre." : `Ajoutez votre premier élément : ${t?.singular.toLowerCase() ?? "contenu"}.`}
          action={
            !filtered &&
            can("content:write", "content:publish") && (
              <ButtonLink href={`/content/${typeKey}/new`} size="sm" icon={<Plus size={15} aria-hidden />}>
                Ajouter
              </ButtonLink>
            )
          }
        />
      ) : (
        <>
          <Table className={list.refreshing ? "opacity-60" : ""}>
            <thead>
              <tr>
                <Th className="w-12">#</Th>
                <Th>{t?.singular ?? "Élément"}</Th>
                <Th>État</Th>
                <Th>Modifié</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {items.map((entry, index) => {
                const image = t?.imageField ? text(entry, t.imageField) : "";
                const subtitle = t?.subtitleField ? text(entry, t.subtitleField) : "";
                return (
                  <Tr key={entry.id}>
                    <Td className="text-[13px] font-semibold text-muted">{(page - 1) * LIMIT + index + 1}</Td>
                    <Td>
                      <Link href={`/content/${typeKey}/${entry.id}`} className="group flex items-center gap-3">
                        {t?.imageField && (image ? <MediaThumb url={image} className="size-11 shrink-0 rounded-lg border border-line" /> : <span className="size-11 shrink-0 rounded-lg border border-dashed border-line-strong bg-mist" />)}
                        <span className="min-w-0">
                          <span className="block max-w-[420px] truncate font-semibold text-navy group-hover:text-brand-deep">{entry.title || "Sans titre"}</span>
                          {subtitle && <span className="block max-w-[420px] truncate text-[13px] text-muted">{subtitle}</span>}
                        </span>
                      </Link>
                    </Td>
                    <Td>
                      <StatusBadges visible={entry.visible} hasDraft={entry.hasDraft} />
                    </Td>
                    <Td className="whitespace-nowrap text-[13px] text-muted">
                      {timeAgo(entry.updatedAt)}
                      {entry.updatedByName && <span className="block">{entry.updatedByName}</span>}
                    </Td>
                    <Td>
                      <div className="flex items-center justify-end gap-0.5">
                        {can("content:publish") && (
                          <span className="mr-1.5 inline-flex">
                            <Switch size="sm" checked={entry.visible} onChange={(v) => void toggle(entry, v)} label={entry.visible ? "Masquer sur le site" : "Afficher sur le site"} />
                          </span>
                        )}
                        {canReorder && (
                          <>
                            <IconButton label="Monter" disabled={index === 0} onClick={() => void move(index, -1)}>
                              <ArrowUp size={15} aria-hidden />
                            </IconButton>
                            <IconButton label="Descendre" disabled={index === items.length - 1} onClick={() => void move(index, 1)}>
                              <ArrowDown size={15} aria-hidden />
                            </IconButton>
                          </>
                        )}
                        <IconButton label={`Modifier ${entry.title}`} onClick={() => router.push(`/content/${typeKey}/${entry.id}`)}>
                          <Pencil size={15} aria-hidden />
                        </IconButton>
                        {can("content:delete") && (
                          <IconButton label={`Supprimer ${entry.title}`} tone="danger" onClick={() => setToDelete(entry)}>
                            <Trash2 size={15} aria-hidden />
                          </IconButton>
                        )}
                      </div>
                    </Td>
                  </Tr>
                );
              })}
            </tbody>
          </Table>
          {meta && <Pager page={meta.page} pages={meta.pages} total={meta.total} onPage={setPage} />}
          <p className="mt-2 text-[13px] text-muted">L’ordre de cette liste est celui du site.{!canReorder && can("content:publish") && " Retirez les filtres pour réordonner."}</p>
        </>
      )}

      <ConfirmDialog
        open={toDelete !== null}
        title="Supprimer ce contenu ?"
        loading={deleting}
        onConfirm={() => void remove()}
        onClose={() => setToDelete(null)}
        message={
          <>
            <strong>« {toDelete?.title || "Sans titre"} »</strong> sera définitivement supprimé et disparaîtra du site. Pour le retirer temporairement, masquez-le plutôt.
          </>
        }
      />
      {t && (
        <StructureModal
          open={structureOpen}
          title={`Structure : ${t.label}`}
          fields={t.fields}
          onClose={() => setStructureOpen(false)}
          onSave={async (fields) => {
            type.setData(await contentTypesApi.update(typeKey, { fields }));
          }}
        />
      )}
    </RequirePermission>
  );
}
