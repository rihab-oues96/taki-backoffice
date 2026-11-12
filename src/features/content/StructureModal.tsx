"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import type { FieldDef } from "@/lib/types";
import { StructureBuilder, structureProblems } from "./StructureBuilder";

/** Lets a super administrator change the fields of an existing section or content type. */
export function StructureModal({
  open,
  title,
  fields,
  onSave,
  onClose,
}: {
  open: boolean;
  title: string;
  fields: FieldDef[];
  onSave: (fields: FieldDef[]) => Promise<void>;
  onClose: () => void;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="lg" description="Les champs supprimés perdent leur contenu ; les nouveaux champs démarrent vides.">
      {open && <Body fields={fields} onSave={onSave} onClose={onClose} />}
    </Modal>
  );
}

function Body({ fields, onSave, onClose }: { fields: FieldDef[]; onSave: (fields: FieldDef[]) => Promise<void>; onClose: () => void }) {
  const toast = useToast();
  const [draft, setDraft] = useState<FieldDef[]>(() => JSON.parse(JSON.stringify(fields)) as FieldDef[]);
  const [saving, setSaving] = useState(false);
  const problems = structureProblems(draft);

  async function save() {
    if (problems.length || !draft.length) return;
    setSaving(true);
    try {
      await onSave(draft);
      toast.success("Structure mise à jour");
      onClose();
    } catch (err) {
      toast.fromError(err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="rounded-xl bg-sun/15 px-4 py-3 text-[13.5px] leading-snug text-[#6b5200]">
        Le site lit ces champs par leur <strong>nom technique</strong>. Renommer ou supprimer un champ utilisé par une page existante peut la laisser vide à cet
        endroit : à faire avec l’équipe technique.
      </p>
      <StructureBuilder fields={draft} onChange={setDraft} />
      {problems.length > 0 && (
        <ul className="list-disc space-y-0.5 pl-5 text-[13px] font-medium text-danger">
          {problems.slice(0, 6).map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      )}
      <div className="flex justify-end gap-2.5 border-t border-line pt-4">
        <Button variant="line" size="sm" onClick={onClose} disabled={saving}>
          Annuler
        </Button>
        <Button size="sm" onClick={() => void save()} loading={saving} disabled={problems.length > 0 || draft.length === 0}>
          Enregistrer la structure
        </Button>
      </div>
    </div>
  );
}
