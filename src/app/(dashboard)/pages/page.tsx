"use client";

import Link from "next/link";
import { ChevronRight, FileText } from "lucide-react";
import { Badge, EmptyState, ErrorState, SkeletonList } from "@/components/ui/Feedback";
import { Card, PageHeader } from "@/components/ui/Layout";
import { RequirePermission } from "@/features/auth/Guard";
import { pagesApi } from "@/features/content/api";
import { useQuery } from "@/hooks/useQuery";
import { timeAgo } from "@/lib/format";

export default function PagesPage() {
  const { data, error, loading, reload } = useQuery((signal) => pagesApi.list(signal), []);

  return (
    <RequirePermission permissions={["content:read"]}>
      <PageHeader
        eyebrow="Contenu du site"
        title={<>Pages et <em>sections</em></>}
        description="Chaque page du site est découpée en sections (bannière, blocs de texte, appels à l'action…). Choisissez une page ici ou dans le menu pour modifier ses sections."
      />
      {loading ? (
        <SkeletonList rows={6} className="h-24" />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : !data?.length ? (
        <EmptyState icon={<FileText size={24} aria-hidden />} title="Aucune page" text="Lancez le script d'initialisation de la base (npm run seed) pour importer le contenu du site." />
      ) : (
        <Card className="overflow-hidden">
          <ul className="divide-y divide-line">
            {data.map((page) => (
              <li key={page.key}>
                <Link href={`/pages/${page.key}`} className="group flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-mist">
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-[15.5px] font-semibold tracking-[-0.01em] text-navy">{page.label}</h2>
                    <p className="mt-0.5 truncate font-mono text-[12.5px] text-muted">{page.key === "global" ? "toutes les pages" : page.path}</p>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
                    {page.drafts > 0 && <Badge tone="warning">{page.drafts} brouillon{page.drafts > 1 ? "s" : ""}</Badge>}
                    {page.hidden > 0 && <Badge>{page.hidden} masquée{page.hidden > 1 ? "s" : ""}</Badge>}
                    <Badge tone="brand">
                      {page.sections} section{page.sections > 1 ? "s" : ""}
                    </Badge>
                  </div>
                  <span className="hidden w-32 shrink-0 text-right text-xs text-muted md:block">{page.updatedAt ? `Modifié ${timeAgo(page.updatedAt)}` : ""}</span>
                  <ChevronRight size={16} className="shrink-0 text-muted transition group-hover:translate-x-0.5 group-hover:text-brand-deep" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </RequirePermission>
  );
}
