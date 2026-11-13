"use client";

import { useSiteUrl } from "@/hooks/useSiteUrl";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, ExternalLink, Eye, Lock, Pencil, Plus, Rows3, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button, ButtonLink, IconButton } from "@/components/ui/Button";
import { Badge, EmptyState, ErrorState, SkeletonList, StatusBadges } from "@/components/ui/Feedback";
import { Switch } from "@/components/ui/Form";
import { Card, PageHeader } from "@/components/ui/Layout";
import { ConfirmDialog } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/features/auth/AuthProvider";
import { RequirePermission } from "@/features/auth/Guard";
import { pagesApi, previewApi, sectionsApi } from "@/features/content/api";
import { NewSectionModal } from "@/features/content/NewSectionModal";
import { partsOfSection, partsOnPage, SHARED_PAGE, type SharedPart } from "@/features/content/shared";
import { useQuery } from "@/hooks/useQuery";
import { timeAgo } from "@/lib/format";
import type { SectionSummary } from "@/lib/types";

export default function PageSectionsPage() {
  const { page: pageKey } = useParams<{ page: string }>();
  const router = useRouter();
  const toast = useToast();
  const viewUrl = useSiteUrl();
  const { can } = useAuth();
  const pages = useQuery((signal) => pagesApi.list(signal), []);
  const sections = useQuery((signal) => sectionsApi.list(pageKey, signal), [pageKey]);
  const [toDelete, setToDelete] = useState<SectionSummary | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const page = pages.data?.find((p) => p.key === pageKey);
  const list = sections.data ?? [];
  const isGlobal = pageKey === SHARED_PAGE;
  // Shared content (contact details, portals…) edited from this page although it is stored with the common elements.
  const hosted = partsOnPage(pageKey);
  const needsShared = hosted.length > 0 && !isGlobal;
  const shared = useQuery(async (signal) => (needsShared ? sectionsApi.list(SHARED_PAGE, signal) : []), [needsShared]);
  const sharedSections = isGlobal ? list : shared.data ?? [];
  const rows: { section: SectionSummary; part?: SharedPart }[] = [
    // A shared section split into parts is listed through its parts, wherever they are attached.
    ...list.filter((s) => !isGlobal || partsOfSection(s.key).length === 0).map((section) => ({ section })),
    ...hosted.flatMap((part) => sharedSections.filter((s) => s.key === part.section).map((section) => ({ section, part }))),
  ];

  async function toggle(section: SectionSummary, visible: boolean) {
    setBusyId(section.id);
    sections.setData((current) => current?.map((s) => (s.id === section.id ? { ...s, visible } : s)));
    try {
      await sectionsApi.update(section.id, { visible });
      toast.success(visible ? `« ${section.label} » est visible sur le site` : `« ${section.label} » est masquée sur le site`);
    } catch (err) {
      sections.setData((current) => current?.map((s) => (s.id === section.id ? { ...s, visible: !visible } : s)));
      toast.fromError(err);
    } finally {
      setBusyId(null);
    }
  }

  async function move(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= list.length) return;
    const next = [...list];
    [next[index], next[target]] = [next[target] as SectionSummary, next[index] as SectionSummary];
    const previous = list;
    sections.setData(next);
    try {
      await sectionsApi.reorder(pageKey, next.map((s) => s.id));
    } catch (err) {
      sections.setData(previous);
      toast.fromError(err);
    }
  }

  async function remove() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await sectionsApi.remove(toDelete.id);
      sections.setData((current) => current?.filter((s) => s.id !== toDelete.id));
      toast.success("Section supprimée");
      setToDelete(null);
    } catch (err) {
      toast.fromError(err);
    } finally {
      setDeleting(false);
    }
  }

  async function preview() {
    const tab = window.open("", "_blank");
    try {
      const { url } = await previewApi.link(page?.path ?? "/");
      if (tab) tab.location.href = url;
    } catch (err) {
      tab?.close();
      toast.fromError(err);
    }
  }

  return (
    <RequirePermission permissions={["content:read"]}>
      <PageHeader
        crumbs={[{ label: "Pages", href: "/pages" }, { label: page?.label ?? pageKey }]}
        title={page?.label ?? "Page"}
        description={page?.description || "Modifiez, masquez ou réordonnez les sections de cette page."}
        actions={
          <>
            {!isGlobal && page && (
              <>
                <ButtonLink href={viewUrl(page.path)} external variant="ghost" size="sm" icon={<ExternalLink size={15} aria-hidden />}>
                  Voir la page
                </ButtonLink>
                {(page.drafts ?? 0) > 0 && (
                  <Button variant="line" size="sm" icon={<Eye size={15} aria-hidden />} onClick={() => void preview()}>
                    Aperçu des brouillons
                  </Button>
                )}
              </>
            )}
            {can("content:structure") && (
              <Button size="sm" icon={<Plus size={15} aria-hidden />} onClick={() => setCreating(true)}>
                Nouvelle section
              </Button>
            )}
          </>
        }
      />

      {sections.loading ? (
        <SkeletonList rows={6} className="h-[76px]" />
      ) : sections.error ? (
        <ErrorState message={sections.error} onRetry={sections.reload} />
      ) : rows.length === 0 ? (
        <EmptyState icon={<Rows3 size={24} aria-hidden />} title="Aucune section" text="Cette page n'a pas encore de section modifiable." />
      ) : (
        <ol className="space-y-2.5">
          {rows.map(({ section, part }, index) => {
            const href = part ? `/sections/${section.id}/${part.id}` : `/sections/${section.id}`;
            const label = part?.label ?? section.label;
            const shownEverywhere = isGlobal || part !== undefined;
            return (
            <li key={`${section.id}-${part?.id ?? ""}`}>
              <Card className="flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3.5 transition hover:border-brand/60 sm:px-5">
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-sky text-[13px] font-bold text-brand-deep">{index + 1}</span>
                <Link href={href} className="group min-w-0 flex-1 basis-[240px]">
                  <p className="flex items-center gap-2 truncate text-[15.5px] font-semibold text-navy group-hover:text-brand-deep">
                    {label}
                    {section.restricted && <Lock size={13} className="shrink-0 text-muted" aria-label="Réservée aux administrateurs" />}
                  </p>
                  <p className="truncate text-[13px] text-muted">
                    {part?.description || section.description || `Modifiée ${timeAgo(section.updatedAt)}${section.updatedByName ? ` par ${section.updatedByName}` : ""}`}
                  </p>
                </Link>
                {part && !isGlobal && <Badge tone="brand">Commun à tout le site</Badge>}
                <StatusBadges visible={section.visible} hasDraft={section.hasDraft} />
                <div className="ml-auto flex items-center gap-1">
                  {can("content:publish") && !shownEverywhere && (
                    <>
                      <Switch size="sm" checked={section.visible} disabled={busyId === section.id} onChange={(v) => void toggle(section, v)} label={section.visible ? "Masquer sur le site" : "Afficher sur le site"} />
                      <IconButton label="Monter" disabled={index === 0} onClick={() => void move(index, -1)} className="ml-1.5">
                        <ArrowUp size={15} aria-hidden />
                      </IconButton>
                      <IconButton label="Descendre" disabled={index === list.length - 1} onClick={() => void move(index, 1)}>
                        <ArrowDown size={15} aria-hidden />
                      </IconButton>
                    </>
                  )}
                  <IconButton label={`Modifier ${label}`} onClick={() => router.push(href)}>
                    <Pencil size={15} aria-hidden />
                  </IconButton>
                  {can("content:structure", "content:delete") && !part && (
                    <IconButton label={`Supprimer ${section.label}`} tone="danger" onClick={() => setToDelete(section)}>
                      <Trash2 size={15} aria-hidden />
                    </IconButton>
                  )}
                </div>
              </Card>
            </li>
            );
          })}
        </ol>
      )}

      {!isGlobal && list.length > 1 && (
        <p className="mt-4 text-[13px] text-muted">
          L’interrupteur masque ou affiche une section sur le site, immédiatement. L’ordre ci-dessus sert à organiser le backoffice ; la mise en page du site reste celle de sa maquette.
        </p>
      )}

      <ConfirmDialog
        open={toDelete !== null}
        title="Supprimer cette section ?"
        loading={deleting}
        onConfirm={() => void remove()}
        onClose={() => setToDelete(null)}
        message={
          <>
            La section <strong>« {toDelete?.label} »</strong> et son contenu seront définitivement supprimés ; elle disparaîtra du site. Pour la retirer temporairement,
            masquez-la plutôt.
          </>
        }
      />
      <NewSectionModal page={pageKey} open={creating} onClose={() => setCreating(false)} onCreated={(s) => router.push(`/sections/${s.id}`)} />
    </RequirePermission>
  );
}
