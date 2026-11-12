"use client";

import { Modal } from "@/components/ui/Modal";
import type { Media } from "@/lib/types";
import { MediaLibrary } from "./MediaLibrary";

const TEXTS = {
  image: { title: "Choisir une image", description: "Cliquez sur une image pour la sélectionner, ou importez-en une nouvelle." },
  video: { title: "Choisir une vidéo", description: "Cliquez sur une vidéo pour la sélectionner, ou importez-en une nouvelle depuis votre ordinateur." },
};

/** Modal used by image and video fields: choose an existing file or upload a new one. */
export function MediaPicker({
  open,
  selectedUrl,
  onSelect,
  onClose,
  kind = "image",
}: {
  open: boolean;
  selectedUrl?: string;
  onSelect: (media: Media) => void;
  onClose: () => void;
  kind?: "image" | "video";
}) {
  return (
    <Modal open={open} onClose={onClose} title={TEXTS[kind].title} description={TEXTS[kind].description} size="xl">
      {open && <MediaLibrary only={kind} selectedUrl={selectedUrl} onSelect={onSelect} />}
    </Modal>
  );
}
