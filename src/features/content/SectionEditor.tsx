"use client";

import { useSiteUrl } from "@/hooks/useSiteUrl";
import { ExternalLink, Settings2 } from "lucide-react";
import { useState } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { ErrorState, SkeletonList } from "@/components/ui/Feedback";
import { Switch } from "@/components/ui/Form";
import { useActiveNav } from "@/components/layout/ActiveNav";
import { Card, PageHeader, type Crumb } from "@/components/ui/Layout";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/features/auth/AuthProvider";
import { RequirePermission } from "@/features/auth/Guard";
import { useQuery } from "@/hooks/useQuery";
import type { ContentObject } from "@/lib/types";
import { contentTypesApi, pagesApi, sectionsApi } from "./api";
import { ContentEditor } from "./ContentEditor";
import { findPart, partFields, SHARED_PAGE } from "./shared";
import { StructureModal } from "./StructureModal";

/**
 * Editor of a page section. With `partId`, only the fields of that part of a shared section
 * are edited, from the page or content type the part is attached to (see shared.ts).
 */
export function SectionEditor({ id, partId }: { id: string; partId?: string }) {
  const toast = useToast();
  const viewUrl = useSiteUrl();
  const { can } = useAuth();
  const { data: section, error, loading, reload, setData } = useQuery((signal) => sectionsApi.get(id, signal), [id]);
  const pages = useQuery((signal) => pagesApi.list(signal), []);
  const [structureOpen, setStructureOpen] = useState(false);
  const [toggling, setToggling] = useState(false);

  const isShared = section?.page === SHARED_PAGE;
  const part = section && isShared && partId ? findPart(section.key, partId) : undefined;
  const hostType = part && "contentType" in part.host ? part.host.contentType : "";
  const type = useQuery(async (signal) => (hostType ? contentTypesApi.get(hostType, signal) : null), [hostType]);
  // The page this is edited from: the host of the part, otherwise the page of the section.
  const page = hostType ? undefined : pages.data?.find((p) => p.key === (part && "page" in part.host ? part.host.page : section?.page));

  useActiveNav(hostType ? `/content/${hostType}` : page ? `/pages/${page.key}` : undefined);

  async function toggleVisible(visible: boolean) {
    setToggling(true);
    try {
      setData(await sectionsApi.update(id, { visible }));
      toast.success(visible ? "La section est visible sur le site" : "La section est masquée sur le site");
    } catch (err) {
      toast.fromError(err);
    } finally {
      setToggling(false);
    }
  }

  if (loading) {
    return (
      <RequirePermission permissions={["content:read"]}>
        <SkeletonList rows={6} className="h-16" />
      </RequirePermission>
    );
  }
  if (error || !section || (partId && !part)) {
    return (
      <RequirePermission permissions={["content:read"]}>
        <ErrorState message={error ?? "Section introuvable"} onRetry={reload} />
      </RequirePermission>
    );
  }

  const label = part?.label ?? section.label;
  const crumbs: Crumb[] = hostType
    ? [{ label: "Contenus", href: "/content" }, { label: type.data?.label ?? hostType, href: `/content/${hostType}` }, { label }]
    : [{ label: "Pages", href: "/pages" }, { label: page?.label ?? section.page, href: `/pages/${page?.key ?? section.page}` }, { label }];
  const previewPath = hostType ? type.data?.previewPath || "/" : page?.path ?? "/";
  // A part only sends its own fields: the rest of the section is carried over untouched.
  const whole = (content: ContentObject): ContentObject => (part ? { ...(section.draft ?? section.content), ...content } : content);

  return (
    <RequirePermission permissions={["content:read"]}>
      <PageHeader
        crumbs={crumbs}
        title={label}
        description={part?.description ?? (section.description || undefined)}
        actions={
          <>
            {page && (
              <ButtonLink href={viewUrl(page.path)} external variant="ghost" size="sm" icon={<ExternalLink size={15} aria-hidden />}>
                Voir sur le site
              </ButtonLink>
            )}
            {can("content:structure") && (
              <Button variant="line" size="sm" icon={<Settings2 size={15} aria-hidden />} onClick={() => setStructureOpen(true)}>
                Structure
              </Button>
            )}
          </>
        }
      />
      <ContentEditor
        key={`${section.id}-${part?.id ?? ""}`}
        fields={part ? partFields(part, section.fields) : section.fields}
        document={{ published: section.content, draft: section.draft, draftUpdatedAt: section.draftUpdatedAt, publishedAt: section.publishedAt, updatedByName: section.updatedByName }}
        previewPath={previewPath}
        onSaveDraft={async (content) => setData(await sectionsApi.saveDraft(id, whole(content)))}
        onPublish={async (content) => setData(await sectionsApi.publish(id, whole(content)))}
        onDiscard={async () => setData(await sectionsApi.discardDraft(id))}
        aside={
          isShared ? (
            <Card className="p-5">
              <h2 className="text-[15px] font-bold text-navy">Commun à tout le site</h2>
              <p className="mt-1 text-[13px] leading-snug text-muted">Ce contenu est repris sur plusieurs pages : une modification publiée ici s’applique partout.</p>
            </Card>
          ) : (
            <Card className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-[15px] font-bold text-navy">Visibilité</h2>
                  <p className="mt-1 text-[13px] leading-snug text-muted">
                    {section.visible ? "Cette section est affichée sur le site." : "Cette section est masquée : les visiteurs ne la voient pas."}
                  </p>
                </div>
                <Switch checked={section.visible} disabled={toggling || !can("content:publish")} onChange={(v) => void toggleVisible(v)} label="Afficher sur le site" />
              </div>
            </Card>
          )
        }
      />
      <StructureModal
        open={structureOpen}
        title={`Structure : ${section.label}`}
        fields={section.fields}
        onClose={() => setStructureOpen(false)}
        onSave={async (fields) => setData(await sectionsApi.update(id, { fields }))}
      />
    </RequirePermission>
  );
}
