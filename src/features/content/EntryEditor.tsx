"use client";

import { useRouter } from "next/navigation";
import { ExternalLink, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Field, Input, Switch } from "@/components/ui/Form";
import { Card, PageHeader } from "@/components/ui/Layout";
import { ConfirmDialog } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/features/auth/AuthProvider";
import { siteUrl } from "@/lib/format";
import type { ContentType, Entry } from "@/lib/types";
import { entriesApi } from "./api";
import { ContentEditor } from "./ContentEditor";
import { emptyContent } from "./fields";

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** Create or edit one entry of a content type. `entry` is null while creating. */
export function EntryEditor({ type, entry, onChange }: { type: ContentType; entry: Entry | null; onChange: (entry: Entry) => void }) {
  const router = useRouter();
  const toast = useToast();
  const { can } = useAuth();
  const [slug, setSlug] = useState(entry?.slug ?? "");
  const [savingMeta, setSavingMeta] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const listHref = `/content/${type.key}`;
  const publicPath = entry?.slug && type.previewPath ? type.previewPath.replace(":slug", entry.slug) : "";

  async function create(data: Entry["data"], visible: boolean) {
    const created = await entriesApi.create({ type: type.key, data, visible, ...(type.hasSlug && slug ? { slug } : {}) });
    router.replace(`/content/${type.key}/${created.id}`);
  }

  async function updateMeta(input: { visible?: boolean; slug?: string }, success: string) {
    if (!entry) return;
    setSavingMeta(true);
    try {
      const updated = await entriesApi.update(entry.id, input);
      onChange(updated);
      setSlug(updated.slug ?? "");
      toast.success(success);
    } catch (err) {
      toast.fromError(err);
    } finally {
      setSavingMeta(false);
    }
  }

  async function remove() {
    if (!entry) return;
    setDeleting(true);
    try {
      await entriesApi.remove(entry.id);
      toast.success("Contenu supprimé");
      router.replace(listHref);
    } catch (err) {
      toast.fromError(err);
      setDeleting(false);
    }
  }

  const slugInvalid = slug !== "" && !SLUG.test(slug);

  return (
    <>
      <PageHeader
        crumbs={[{ label: "Contenus", href: "/content" }, { label: type.label, href: listHref }, { label: entry ? entry.title || "Sans titre" : "Nouveau" }]}
        title={entry ? entry.title || "Sans titre" : `Nouveau : ${type.singular.toLowerCase()}`}
        actions={
          <>
            {publicPath && entry?.visible && (
              <ButtonLink href={siteUrl(publicPath)} external variant="ghost" size="sm" icon={<ExternalLink size={15} aria-hidden />}>
                Voir sur le site
              </ButtonLink>
            )}
            {entry && can("content:delete") && (
              <Button variant="danger" size="sm" icon={<Trash2 size={15} aria-hidden />} onClick={() => setConfirmDelete(true)}>
                Supprimer
              </Button>
            )}
          </>
        }
      />

      <ContentEditor
        key={entry?.id ?? "new"}
        fields={type.fields}
        document={
          entry
            ? { published: entry.data, draft: entry.draft, draftUpdatedAt: entry.draftUpdatedAt, publishedAt: entry.publishedAt, updatedByName: entry.updatedByName }
            : { published: emptyContent(type.fields), draft: null, draftUpdatedAt: null, publishedAt: null, updatedByName: "" }
        }
        previewPath={entry ? publicPath : undefined}
        // A new entry does not exist yet: "draft" creates it hidden, "publish" creates it visible.
        onSaveDraft={async (data) => (entry ? onChange(await entriesApi.saveDraft(entry.id, data)) : create(data, false))}
        onPublish={async (data) => (entry ? onChange(await entriesApi.publish(entry.id, data)) : create(data, true))}
        onDiscard={async () => {
          if (entry) onChange(await entriesApi.discardDraft(entry.id));
        }}
        aside={
          <>
            {entry && (
              <Card className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-[15px] font-bold text-navy">Visibilité</h2>
                    <p className="mt-1 text-[13px] leading-snug text-muted">{entry.visible ? "Affiché sur le site." : "Masqué : les visiteurs ne le voient pas."}</p>
                  </div>
                  <Switch
                    checked={entry.visible}
                    disabled={savingMeta || !can("content:publish")}
                    onChange={(visible) => void updateMeta({ visible }, visible ? "Visible sur le site" : "Masqué sur le site")}
                    label="Afficher sur le site"
                  />
                </div>
              </Card>
            )}
            {type.hasSlug && (
              <Card className="p-5">
                <Field
                  label="Identifiant d'URL"
                  htmlFor="entry-slug"
                  error={slugInvalid ? "Minuscules, chiffres et tirets uniquement" : undefined}
                  help={entry ? `Adresse : ${type.previewPath.replace(":slug", slug || "…")}. La modifier casse les anciens liens.` : "Laissez vide pour le générer à partir du titre."}
                >
                  <Input id="entry-slug" value={slug} disabled={!can("content:publish")} invalid={slugInvalid} className="font-mono text-[13.5px]" onChange={(e) => setSlug(e.target.value)} />
                </Field>
                {entry && can("content:publish") && (
                  <Button variant="line" size="sm" className="mt-3" loading={savingMeta} disabled={slugInvalid || !slug || slug === entry.slug} onClick={() => void updateMeta({ slug }, "Adresse mise à jour")}>
                    Mettre à jour l’adresse
                  </Button>
                )}
              </Card>
            )}
            {!entry && (
              <Card className="p-5 text-[13px] leading-snug text-muted">
                <strong className="text-navy">Publier</strong> crée l’élément et l’affiche sur le site. <strong className="text-navy">Enregistrer le brouillon</strong> le crée masqué, pour le terminer plus tard.
              </Card>
            )}
          </>
        }
      />

      <ConfirmDialog
        open={confirmDelete}
        title="Supprimer ce contenu ?"
        loading={deleting}
        onConfirm={() => void remove()}
        onClose={() => setConfirmDelete(false)}
        message="Ce contenu sera définitivement supprimé et disparaîtra du site. Pour le retirer temporairement, masquez-le plutôt."
      />
    </>
  );
}
