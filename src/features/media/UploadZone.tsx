"use client";

import { UploadCloud } from "lucide-react";
import { useRef, useState, type DragEvent } from "react";
import { Spinner } from "@/components/ui/Feedback";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";
import { formatBytes } from "@/lib/format";
import type { Media, MediaRule } from "@/lib/types";
import { mediaApi } from "./api";

/** Client-side check against the API's rules, to fail fast before uploading. The API re-checks everything. */
export function checkFiles(files: File[], rules: MediaRule[], accept?: "image" | "video"): { ok: File[]; problems: string[] } {
  const ok: File[] = [];
  const problems: string[] = [];
  for (const file of files) {
    const rule = rules.find((r) => r.mime === file.type);
    if (!rule || (accept && rule.kind !== accept)) problems.push(`« ${file.name} » : type de fichier non autorisé`);
    else if (file.size > rule.maxBytes) problems.push(`« ${file.name} » : trop volumineux (max ${formatBytes(rule.maxBytes)})`);
    else ok.push(file);
  }
  return { ok, problems };
}

export function UploadZone({
  rules,
  folder,
  onUploaded,
  compact = false,
  accept,
}: {
  rules: MediaRule[];
  folder: string;
  onUploaded: (media: Media[]) => void;
  compact?: boolean;
  accept?: "image" | "video";
}) {
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);

  const allowed = rules.filter((r) => !accept || r.kind === accept);
  const limitKind = accept ?? "image";
  const maxSize = Math.max(0, ...rules.filter((r) => r.kind === limitKind).map((r) => r.maxBytes));

  async function send(list: FileList | File[]) {
    const files = Array.from(list).slice(0, 10);
    if (!files.length || busy) return;
    const { ok, problems } = checkFiles(files, rules, accept);
    problems.forEach((p) => toast.error(p));
    if (!ok.length) return;
    setBusy(true);
    try {
      const media = await mediaApi.upload(ok, folder);
      toast.success(media.length > 1 ? `${media.length} fichiers importés` : "Fichier importé");
      onUploaded(media);
    } catch (err) {
      toast.fromError(err);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  function onDrop(event: DragEvent) {
    event.preventDefault();
    setOver(false);
    void send(event.dataTransfer.files);
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={onDrop}
      className={cn(
        "rounded-2xl border-2 border-dashed text-center transition-colors",
        compact ? "px-4 py-5" : "px-6 py-9",
        over ? "border-brand bg-brand/5" : "border-line-strong bg-white",
      )}
    >
      <input
        ref={input}
        type="file"
        multiple
        accept={allowed.map((r) => r.mime).join(",")}
        className="sr-only"
        id="media-upload-input"
        onChange={(e) => e.target.files && void send(e.target.files)}
      />
      {busy ? (
        <div className="flex items-center justify-center gap-3 py-2 text-sm font-semibold text-navy" role="status">
          <Spinner /> Import en cours…
        </div>
      ) : (
        <>
          {!compact && (
            <div className="mx-auto mb-3 grid size-12 place-items-center rounded-full bg-sky text-brand-deep">
              <UploadCloud size={22} aria-hidden />
            </div>
          )}
          <p className="text-[15px] font-semibold text-navy">
            Glissez vos fichiers ici ou{" "}
            <label htmlFor="media-upload-input" className="text-brand-deep underline underline-offset-4 hover:text-brand">
              parcourez votre ordinateur
            </label>
          </p>
          <p className="mt-1 text-[13px] text-muted">
            {[...new Set(allowed.map((r) => r.ext.toUpperCase()))].join(", ")}
            {maxSize > 0 && ` · ${limitKind === "video" ? "vidéos" : "images"} jusqu'à ${formatBytes(maxSize)}`} · 10 fichiers par envoi
          </p>
        </>
      )}
    </div>
  );
}
