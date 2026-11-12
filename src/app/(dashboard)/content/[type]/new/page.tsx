"use client";

import { useParams } from "next/navigation";
import { ErrorState, SkeletonList } from "@/components/ui/Feedback";
import { RequirePermission } from "@/features/auth/Guard";
import { contentTypesApi } from "@/features/content/api";
import { EntryEditor } from "@/features/content/EntryEditor";
import { useQuery } from "@/hooks/useQuery";

export default function NewEntryPage() {
  const { type: typeKey } = useParams<{ type: string }>();
  const type = useQuery((signal) => contentTypesApi.get(typeKey, signal), [typeKey]);
  return (
    <RequirePermission permissions={["content:write", "content:publish"]}>
      {type.loading ? (
        <SkeletonList rows={6} className="h-16" />
      ) : type.error || !type.data ? (
        <ErrorState message={type.error ?? "Type de contenu introuvable"} onRetry={type.reload} />
      ) : (
        <EntryEditor type={type.data} entry={null} onChange={() => undefined} />
      )}
    </RequirePermission>
  );
}
