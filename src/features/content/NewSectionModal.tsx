"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Form";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import type { FieldDef, Section } from "@/lib/types";
import { sectionsApi } from "./api";
import { slugify } from "./fields";
import { newField, StructureBuilder, structureProblems } from "./StructureBuilder";

/** Creates a new (hidden, empty) section on a page. Reserved to users who may change the structure. */
export function NewSectionModal({ page, open, onClose, onCreated }: { page: string; open: boolean; onClose: () => void; onCreated: (section: Section) => void }) {
  return (
    <Modal open={open} onClose={onClose} title="Nouvelle section" size="lg" description="La section est créée masquée et vide. Elle s'affichera sur le site une fois prise en charge par la page.">
      {open && <Body page={page} onClose={onClose} onCreated={onCreated} />}
    </Modal>
  );
}

function Body({ page, onClose, onCreated }: { page: string; onClose: () => void; onCreated: (section: Section) => void }) {
  const toast = useToast();
  const [label, setLabel] = useState("");
  const [key, setKey] = useState("");
  const [keyTouched, setKeyTouched] = useState(false);
  const [description, setDescription] = useState("");
  const [fields, setFields] = useState<FieldDef[]>([newField()]);
  const [saving, setSaving] = useState(false);

  const keyValid = /^[a-z][a-z0-9-]{1,59}$/.test(key);
  const problems = structureProblems(fields);
  const ready = label.trim().length > 0 && keyValid && problems.length === 0 && fields.length > 0;

  async function create() {
    setSaving(true);
    try {
      const section = await sectionsApi.create({ page, key, label: label.trim(), description: description.trim(), fields });
      toast.success("Section créée");
      onCreated(section);
    } catch (err) {
      toast.fromError(err);
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nom de la section" htmlFor="ns-label" required>
          <Input
            id="ns-label"
            value={label}
            autoFocus
            onChange={(e) => {
              setLabel(e.target.value);
              if (!keyTouched) setKey(slugify(e.target.value));
            }}
            placeholder="Ex. Bandeau d'annonce"
          />
        </Field>
        <Field label="Identifiant technique" htmlFor="ns-key" required error={key && !keyValid ? "Minuscules, chiffres et tirets ; commence par une lettre" : undefined} help="Utilisé par le site pour retrouver la section.">
          <Input
            id="ns-key"
            value={key}
            className="font-mono text-[13.5px]"
            onChange={(e) => {
              setKey(e.target.value);
              setKeyTouched(true);
            }}
          />
        </Field>
      </div>
      <Field label="Description" htmlFor="ns-desc" help="Aide les éditeurs à comprendre où cette section apparaît.">
        <Input id="ns-desc" value={description} maxLength={300} onChange={(e) => setDescription(e.target.value)} />
      </Field>
      <div>
        <p className="mb-2 text-[13.5px] font-semibold text-navy">Champs de la section</p>
        <StructureBuilder fields={fields} onChange={setFields} />
        {problems.length > 0 && label && (
          <ul className="mt-2 list-disc space-y-0.5 pl-5 text-[13px] font-medium text-danger">
            {problems.slice(0, 5).map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        )}
      </div>
      <div className="flex justify-end gap-2.5 border-t border-line pt-4">
        <Button variant="line" size="sm" onClick={onClose} disabled={saving}>
          Annuler
        </Button>
        <Button size="sm" onClick={() => void create()} loading={saving} disabled={!ready}>
          Créer la section
        </Button>
      </div>
    </div>
  );
}
