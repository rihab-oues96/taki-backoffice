"use client";

import Link from "next/link";
import { Copy, RefreshCw, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Badge, ErrorState, SkeletonList } from "@/components/ui/Feedback";
import { Field, Input } from "@/components/ui/Form";
import { ConfirmDialog, Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/features/auth/AuthProvider";
import { useQuery } from "@/hooks/useQuery";
import { formatBytes, formatDateTime, siteUrl } from "@/lib/format";
import type { MediaRule } from "@/lib/types";
import { mediaApi } from "./api";
import { MediaThumb } from "./MediaThumb";
import { checkFiles } from "./UploadZone";

/** Details of one media: preview, editable alt text and folder, where it is used, replace and delete. */
export function MediaDetails({ id, rules, onClose, onChanged }: { id: string | null; rules: MediaRule[]; onClose: () => void; onChanged: () => void }) {
  return (
    <Modal open={id !== null} onClose={onClose} title="Détails du média" size="lg">
      {id && <Details key={id} id={id} rules={rules} onClose={onClose} onChanged={onChanged} />}
    </Modal>
  );
}

function Details({ id, rules, onClose, onChanged }: { id: string; rules: MediaRule[]; onClose: () => void; onChanged: () => void }) {
  const toast = useToast();
  const { can } = useAuth();
  const { data, error, loading, reload, setData } = useQuery((signal) => mediaApi.get(id, signal), [id]);
  // null = not edited yet: the field shows the saved value.
  const [altEdit, setAlt] = useState<string | null>(null);
  const [folderEdit, setFolder] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [replacing, setReplacing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  if (loading) return <SkeletonList rows={4} />;
  if (error || !data) return <ErrorState message={error ?? "Média introuvable"} onRetry={reload} />;

  const alt = altEdit ?? data.alt;
  const folder = folderEdit ?? data.folder;
  const canWrite = can("media:write");
  const dirty = alt !== data.alt || folder !== data.folder;

  async function save() {
    setSaving(true);
    try {
      const updated = await mediaApi.update(id, { alt, folder });
      setData((current) => (current ? { ...current, ...updated } : current));
      setAlt(null);
      setFolder(null);
      toast.success("Média mis à jour");
      onChanged();
    } catch (err) {
      toast.fromError(err);
    } finally {
      setSaving(false);
    }
  }

  async function replace(file: File) {
    const { ok, problems } = checkFiles([file], rules);
    problems.forEach((p) => toast.error(p));
    if (!ok.length) return;
    setReplacing(true);
    try {
      const result = await mediaApi.replace(id, file);
      toast.success(
        result.updatedReferences > 0
          ? `Fichier remplacé. ${result.updatedReferences} contenu(s) mis à jour automatiquement.`
          : "Fichier remplacé",
      );
      await reload();
      onChanged();
    } catch (err) {
      toast.fromError(err);
    } finally {
      setReplacing(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  async function remove() {
    setDeleting(true);
    try {
      await mediaApi.remove(id, true);
      toast.success("Média supprimé");
      onChanged();
      onClose();
    } catch (err) {
      toast.fromError(err);
      setDeleting(false);
    }
  }

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_1.1fr]">
      <div>
        <MediaThumb url={data.url} kind={data.kind} alt={data.alt} contain className="aspect-square w-full rounded-2xl border border-line" />
        <dl className="mt-4 space-y-1.5 text-[13.5px]">
          {[
            ["Fichier", data.originalName],
            ["Type", data.mimeType],
            ["Poids", formatBytes(data.size)],
            ["Ajouté", `${formatDateTime(data.createdAt)}${data.uploadedByName ? ` · ${data.uploadedByName}` : ""}`],
          ].map(([k, v]) => (
            <div key={k} className="flex gap-3">
              <dt className="w-16 shrink-0 text-muted">{k}</dt>
              <dd className="min-w-0 break-words font-medium text-navy">{v}</dd>
            </div>
          ))}
        </dl>
        {data.storage === "site" && (
          <p className="mt-3 rounded-xl bg-sky px-3 py-2 text-[13px] leading-snug text-ink-soft">
            Ce fichier est livré avec le site web. Le remplacer enregistre une nouvelle version et met à jour les contenus qui l’utilisent.
          </p>
        )}
      </div>

      <div className="space-y-5">
        {data.kind === "video" && (
          <Field label="Adresse du média" help="À coller dans un champ vidéo pour utiliser cette vidéo.">
            <div className="flex gap-2">
              <Input readOnly value={siteUrl(data.url)} onFocus={(e) => e.currentTarget.select()} className="font-mono text-[13px]" />
              <Button
                variant="line"
                size="sm"
                className="h-11"
                icon={<Copy size={15} aria-hidden />}
                onClick={() => {
                  void navigator.clipboard.writeText(siteUrl(data.url)).then(() => toast.info("Adresse copiée"));
                }}
              >
                Copier
              </Button>
            </div>
          </Field>
        )}
        <Field label="Texte alternatif" htmlFor="media-alt" help="Décrit l'image pour les lecteurs d'écran et les moteurs de recherche.">
          <Input id="media-alt" value={alt} disabled={!canWrite} maxLength={300} onChange={(e) => setAlt(e.target.value)} />
        </Field>
        <Field label="Dossier" htmlFor="media-folder" help="Pour classer la médiathèque (lettres, chiffres, espaces, tirets).">
          <Input id="media-folder" value={folder} disabled={!canWrite} maxLength={80} onChange={(e) => setFolder(e.target.value)} />
        </Field>
        {canWrite && (
          <Button size="sm" disabled={!dirty} loading={saving} onClick={() => void save()}>
            Enregistrer
          </Button>
        )}

        <div>
          <p className="mb-2 text-[13.5px] font-semibold text-navy">
            Utilisation <Badge tone={data.usage.length ? "brand" : "neutral"}>{data.usage.length}</Badge>
          </p>
          {data.usage.length === 0 ? (
            <p className="text-[13.5px] text-muted">Ce média n’est utilisé dans aucun contenu.</p>
          ) : (
            <ul className="max-h-36 space-y-1 overflow-y-auto text-[13.5px]">
              {data.usage.map((u) => (
                <li key={`${u.kind}-${u.id}`}>
                  <Link href={u.kind === "section" ? `/sections/${u.id}` : `/content/${u.context}/${u.id}`} className="font-medium text-brand-deep hover:underline">
                    {u.label || "Sans titre"}
                  </Link>
                  <span className="text-muted"> · {u.kind === "section" ? `page ${u.context}` : u.context}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex flex-wrap gap-2.5 border-t border-line pt-5">
          {canWrite && (
            <>
              <input ref={fileInput} type="file" className="sr-only" accept={rules.map((r) => r.mime).join(",")} onChange={(e) => e.target.files?.[0] && void replace(e.target.files[0])} />
              <Button variant="line" size="sm" loading={replacing} icon={<RefreshCw size={15} aria-hidden />} onClick={() => fileInput.current?.click()}>
                Remplacer le fichier
              </Button>
            </>
          )}
          {can("media:delete") && (
            <Button variant="danger" size="sm" icon={<Trash2 size={15} aria-hidden />} onClick={() => setConfirmDelete(true)}>
              Supprimer
            </Button>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Supprimer ce média ?"
        loading={deleting}
        onConfirm={() => void remove()}
        onClose={() => setConfirmDelete(false)}
        message={
          data.usage.length > 0 ? (
            <>
              <strong className="text-danger">Attention :</strong> ce média est utilisé dans {data.usage.length} contenu(s). Après suppression, l’image
              n’apparaîtra plus à ces endroits. Remplacez-le plutôt si vous souhaitez simplement changer le fichier.
            </>
          ) : (
            "Ce média sera définitivement supprimé de la médiathèque."
          )
        }
      />
    </div>
  );
}
