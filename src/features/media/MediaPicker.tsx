"use client";

import { Modal } from "@/components/ui/Modal";
import type { Media } from "@/lib/types";
import { MediaLibrary } from "./MediaLibrary";

/** Modal used by image fields: choose an existing image or upload a new one. */
export function MediaPicker({ open, selectedUrl, onSelect, onClose }: { open: boolean; selectedUrl?: string; onSelect: (media: Media) => void; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title="Choisir une image" description="Cliquez sur une image pour la sélectionner, ou importez-en une nouvelle." size="xl">
      {open && <MediaLibrary only="image" selectedUrl={selectedUrl} onSelect={onSelect} />}
    </Modal>
  );
}
