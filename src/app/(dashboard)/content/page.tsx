"use client";

import Link from "next/link";
import { ChevronRight, Layers } from "lucide-react";
import { Badge, EmptyState, ErrorState, SkeletonList } from "@/components/ui/Feedback";
import { Card, PageHeader } from "@/components/ui/Layout";
import { RequirePermission } from "@/features/auth/Guard";
import { contentTypesApi } from "@/features/content/api";
import { useQuery } from "@/hooks/useQuery";

export default function ContentTypesPage() {
  const { data, error, loading, reload } = useQuery((signal) => contentTypesApi.list(signal), []);
  return (
    <RequirePermission permissions={["content:read"]}>
      <PageHeader
        eyebrow="Contenu du site"
        title={<>Contenus <em>répétables</em></>}
        description="Articles, actualités, témoignages, questions fréquentes, équipe, politiques, vidéos : les listes que vous pouvez enrichir, réordonner et masquer."
      />
      {loading ? (
        <SkeletonList rows={6} className="h-24" />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : !data?.length ? (
        <EmptyState icon={<Layers size={24} aria-hidden />} title="Aucun type de contenu" text="Lancez le script d'initialisation (npm run seed) pour importer le contenu du site." />
      ) : (
        <Card className="overflow-hidden">
          <ul className="divide-y divide-line">
            {data.map((type) => (
              <li key={type.key}>
                <Link href={`/content/${type.key}`} className="group flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-mist">
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-[15.5px] font-semibold tracking-[-0.01em] text-navy">{type.label}</h2>
                    {type.description && <p className="mt-0.5 truncate text-[13px] text-muted">{type.description}</p>}
                  </div>
                  <Badge tone="brand">
                    {type.count ?? 0} élément{(type.count ?? 0) > 1 ? "s" : ""}
                  </Badge>
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
