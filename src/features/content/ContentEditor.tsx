"use client";

import { Eye, RotateCcw, Save, Send } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Feedback";
import { Card } from "@/components/ui/Layout";
import { ConfirmDialog } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/features/auth/AuthProvider";
import { useUnsavedWarning } from "@/hooks/useUnsavedWarning";
import { ApiError } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import type { ContentObject, FieldDef, FieldIssue } from "@/lib/types";
import { previewApi } from "./api";
import { FieldsForm } from "./FieldEditor";
import { conformContent, issuesByPath, sameContent, validateContent } from "./fields";

export interface EditorDocument {
  /** What the website shows today. */
  published: ContentObject;
  /** Saved but unpublished edits, if any. */
  draft: ContentObject | null;
  draftUpdatedAt: string | null;
  publishedAt: string | null;
  updatedByName: string;
}

/**
 * Editing workflow shared by sections and entries:
 * edit → "Enregistrer le brouillon" (nothing changes on the site) → "Aperçu" → "Publier".
 */
export function ContentEditor({
  fields,
  document,
  previewPath,
  onSaveDraft,
  onPublish,
  onDiscard,
  aside,
  readOnly = false,
}: {
  fields: FieldDef[];
  document: EditorDocument;
  /** Website path opened by the preview button; no preview when empty. */
  previewPath?: string;
  onSaveDraft: (content: ContentObject) => Promise<void>;
  onPublish: (content: ContentObject) => Promise<void>;
  onDiscard: () => Promise<void>;
  aside?: ReactNode;
  readOnly?: boolean;
}) {
  const toast = useToast();
  const { can } = useAuth();
  const saved = useMemo(() => conformContent(fields, document.draft ?? document.published), [fields, document.draft, document.published]);
  const [value, setValue] = useState<ContentObject>(saved);
  const [base, setBase] = useState(saved);
  const [issues, setIssues] = useState<FieldIssue[]>([]);
  const [busy, setBusy] = useState<"draft" | "publish" | "preview" | "discard" | null>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  // The server copy changed (after a save, publish or discard): restart from it.
  if (!sameContent(base, saved)) {
    setBase(saved);
    setValue(saved);
    setIssues([]);
  }

  const dirty = !sameContent(value, saved);
  const hasDraft = document.draft !== null;
  const canWrite = !readOnly && can("content:write");
  const canPublish = !readOnly && can("content:publish");
  useUnsavedWarning(dirty);

  function check(): boolean {
    const found = validateContent(fields, value);
    setIssues(found);
    if (found.length) toast.error(`${found.length} champ(s) à corriger avant d'enregistrer.`);
    return found.length === 0;
  }

  async function run(kind: NonNullable<typeof busy>, action: () => Promise<void>, success?: string) {
    setBusy(kind);
    try {
      await action();
      setIssues([]);
      if (success) toast.success(success);
    } catch (err) {
      if (err instanceof ApiError && err.issues.length) setIssues(err.issues);
      toast.fromError(err);
    } finally {
      setBusy(null);
    }
  }

  const saveDraft = () => check() && run("draft", () => onSaveDraft(value), "Brouillon enregistré. Le site n'a pas changé.");
  const publish = () => check() && run("publish", () => onPublish(value), "Publié. Le site est à jour.");

  async function preview() {
    if (!previewPath) return;
    if (dirty && !check()) return;
    // Open the tab during the click, otherwise browsers block it as a pop-up.
    const tab = window.open("", "_blank");
    await run("preview", async () => {
      if (dirty) await onSaveDraft(value);
      const { url } = await previewApi.link(previewPath);
      if (tab) tab.location.href = url;
      else window.location.href = url;
    });
  }

  const issueMap = useMemo(() => issuesByPath(issues), [issues]);

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
      <Card className="p-5 sm:p-7">
        {fields.length === 0 ? (
          <p className="text-muted">Cette section n’a aucun champ.</p>
        ) : (
          <FieldsForm fields={fields} value={value} onChange={setValue} issues={issueMap} disabled={!canWrite || busy !== null} />
        )}
      </Card>

      <div className="space-y-4 xl:sticky xl:top-6">
        <Card className="p-5">
          <h2 className="text-[15px] font-bold text-navy">Publication</h2>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {dirty && <Badge tone="danger">Modifications non enregistrées</Badge>}
            {hasDraft && <Badge tone="warning">Brouillon en attente</Badge>}
            {!dirty && !hasDraft && <Badge tone="success">À jour avec le site</Badge>}
          </div>
          <dl className="mt-4 space-y-1.5 text-[13px] text-muted">
            <div className="flex justify-between gap-3">
              <dt>Dernière publication</dt>
              <dd className="text-right font-medium text-navy">{formatDateTime(document.publishedAt)}</dd>
            </div>
            {hasDraft && (
              <div className="flex justify-between gap-3">
                <dt>Brouillon</dt>
                <dd className="text-right font-medium text-navy">{formatDateTime(document.draftUpdatedAt)}</dd>
              </div>
            )}
            {document.updatedByName && (
              <div className="flex justify-between gap-3">
                <dt>Par</dt>
                <dd className="text-right font-medium text-navy">{document.updatedByName}</dd>
              </div>
            )}
          </dl>

          <div className="mt-5 grid gap-2.5">
            {canPublish && (
              <Button onClick={() => void publish()} loading={busy === "publish"} disabled={busy !== null || (!dirty && !hasDraft)} icon={<Send size={15} aria-hidden />}>
                Publier
              </Button>
            )}
            {canWrite && (
              <Button variant="line" onClick={() => void saveDraft()} loading={busy === "draft"} disabled={busy !== null || !dirty} icon={<Save size={15} aria-hidden />}>
                Enregistrer le brouillon
              </Button>
            )}
            {previewPath && (
              <Button variant="line" onClick={() => void preview()} loading={busy === "preview"} disabled={busy !== null || (!canWrite && !hasDraft)} icon={<Eye size={15} aria-hidden />}>
                Aperçu sur le site
              </Button>
            )}
            {canWrite && (dirty || hasDraft) && (
              <Button variant="ghost" size="sm" onClick={() => setConfirmDiscard(true)} disabled={busy !== null} icon={<RotateCcw size={14} aria-hidden />}>
                Annuler les modifications
              </Button>
            )}
          </div>
          {!canWrite && <p className="mt-4 text-[13px] text-muted">Vous pouvez consulter ce contenu, mais pas le modifier.</p>}
        </Card>
        {aside}
      </div>

      <ConfirmDialog
        open={confirmDiscard}
        title="Annuler les modifications ?"
        confirmLabel="Revenir à la version publiée"
        loading={busy === "discard"}
        onClose={() => setConfirmDiscard(false)}
        onConfirm={() =>
          void (async () => {
            if (hasDraft) await run("discard", onDiscard, "Brouillon supprimé.");
            else setValue(saved);
            setConfirmDiscard(false);
          })()
        }
        message="Vos modifications non publiées seront perdues et le formulaire reviendra à la version actuellement en ligne."
      />
    </div>
  );
}
