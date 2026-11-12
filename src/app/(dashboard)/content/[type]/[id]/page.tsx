"use client";

import { useParams } from "next/navigation";
import { ErrorState, SkeletonList } from "@/components/ui/Feedback";
import { RequirePermission } from "@/features/auth/Guard";
import { contentTypesApi, entriesApi } from "@/features/content/api";
import { EntryEditor } from "@/features/content/EntryEditor";
import { useQuery } from "@/hooks/useQuery";

export default function EditEntryPage() {
  const { type: typeKey, id } = useParams<{ type: string; id: string }>();
  const type = useQuery((signal) => contentTypesApi.get(typeKey, signal), [typeKey]);
  const entry = useQuery((signal) => entriesApi.get(id, signal), [id]);
  return (
    <RequirePermission permissions={["content:read"]}>
      {type.loading || entry.loading ? (
        <SkeletonList rows={6} className="h-16" />
      ) : type.error || entry.error || !type.data || !entry.data ? (
        <ErrorState message={type.error ?? entry.error ?? "Contenu introuvable"} onRetry={() => void Promise.all([type.reload(), entry.reload()])} />
      ) : (
        <EntryEditor type={type.data} entry={entry.data} onChange={entry.setData} />
      )}
    </RequirePermission>
  );
}
