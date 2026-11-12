"use client";

import { useSiteUrl } from "@/hooks/useSiteUrl";
import { useParams } from "next/navigation";
import { ExternalLink, Settings2 } from "lucide-react";
import { useState } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { ErrorState, SkeletonList } from "@/components/ui/Feedback";
import { Switch } from "@/components/ui/Form";
import { Card, PageHeader } from "@/components/ui/Layout";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/features/auth/AuthProvider";
import { RequirePermission } from "@/features/auth/Guard";
import { pagesApi, sectionsApi } from "@/features/content/api";
import { ContentEditor } from "@/features/content/ContentEditor";
import { StructureModal } from "@/features/content/StructureModal";
import { useQuery } from "@/hooks/useQuery";

export default function SectionEditorPage() {
  const { id } = useParams<{ id: string }>();
  const toast = useToast();
  const viewUrl = useSiteUrl();
  const { can } = useAuth();
  const { data: section, error, loading, reload, setData } = useQuery((signal) => sectionsApi.get(id, signal), [id]);
  const pages = useQuery((signal) => pagesApi.list(signal), []);
  const [structureOpen, setStructureOpen] = useState(false);
  const [toggling, setToggling] = useState(false);

  const page = pages.data?.find((p) => p.key === section?.page);
  const isGlobal = section?.page === "global";

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

  return (
    <RequirePermission permissions={["content:read"]}>
      {loading ? (
        <SkeletonList rows={6} className="h-16" />
      ) : error || !section ? (
        <ErrorState message={error ?? "Section introuvable"} onRetry={reload} />
      ) : (
        <>
          <PageHeader
            crumbs={[{ label: "Pages", href: "/pages" }, { label: page?.label ?? section.page, href: `/pages/${section.page}` }, { label: section.label }]}
            title={section.label}
            description={section.description || undefined}
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
            key={section.id}
            fields={section.fields}
            document={{ published: section.content, draft: section.draft, draftUpdatedAt: section.draftUpdatedAt, publishedAt: section.publishedAt, updatedByName: section.updatedByName }}
            previewPath={page?.path ?? "/"}
            onSaveDraft={async (content) => setData(await sectionsApi.saveDraft(id, content))}
            onPublish={async (content) => setData(await sectionsApi.publish(id, content))}
            onDiscard={async () => setData(await sectionsApi.discardDraft(id))}
            aside={
              !isGlobal && (
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
        </>
      )}
    </RequirePermission>
  );
}
