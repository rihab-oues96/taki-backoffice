"use client";

import { PageHeader } from "@/components/ui/Layout";
import { RequirePermission } from "@/features/auth/Guard";
import { MediaLibrary } from "@/features/media/MediaLibrary";

export default function MediaPage() {
  return (
    <RequirePermission permissions={["media:read"]}>
      <PageHeader
        eyebrow="Médiathèque"
        title={<>Images et <em>médias</em></>}
        description="Importez, classez et remplacez les fichiers utilisés sur le site. Cliquez sur un média pour voir où il est utilisé."
      />
      <MediaLibrary />
    </RequirePermission>
  );
}
