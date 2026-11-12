"use client";

import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { Button, IconButton } from "@/components/ui/Button";
import { Input, Select, Switch } from "@/components/ui/Form";
import type { FieldDef, FieldType } from "@/lib/types";
import { FIELD_TYPE_LABELS } from "./fields";

const TYPES = Object.keys(FIELD_TYPE_LABELS) as FieldType[];
const NAME = /^[a-zA-Z][a-zA-Z0-9_]{0,59}$/;

function toName(label: string): string {
  const words = label
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9 ]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const camel = words.map((w, i) => (i === 0 ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())).join("");
  return /^[a-zA-Z]/.test(camel) ? camel.slice(0, 60) : camel ? `f${camel}`.slice(0, 60) : "";
}

export function newField(): FieldDef {
  return { name: "", label: "", type: "text" };
}

/** Problems that would make the API reject the structure, in plain words. */
export function structureProblems(fields: FieldDef[], where = ""): string[] {
  const problems: string[] = [];
  const seen = new Set<string>();
  fields.forEach((f, i) => {
    const at = `${where}champ ${i + 1}${f.label ? ` (« ${f.label} »)` : ""}`;
    if (!f.label.trim()) problems.push(`${at} : libellé manquant`);
    if (!NAME.test(f.name)) problems.push(`${at} : nom technique invalide (lettres et chiffres, commence par une lettre)`);
    else if (seen.has(f.name)) problems.push(`${at} : nom technique déjà utilisé`);
    seen.add(f.name);
    if (f.type === "select" && !(f.options ?? []).length) problems.push(`${at} : ajoutez au moins un choix`);
    if (f.type === "group") {
      if (!(f.fields ?? []).length) problems.push(`${at} : ajoutez au moins un champ au groupe`);
      problems.push(...structureProblems(f.fields ?? [], `${f.label || "groupe"} › `));
    }
    if (f.type === "list" && f.item?.type === "group") {
      if (!(f.item.fields ?? []).length) problems.push(`${at} : ajoutez au moins un champ aux éléments de la liste`);
      problems.push(...structureProblems(f.item.fields ?? [], `${f.label || "liste"} › `));
    }
  });
  return problems;
}

function retype(field: FieldDef, type: FieldType): FieldDef {
  const base: FieldDef = { name: field.name, label: field.label, type, help: field.help, required: field.required };
  if (type === "select") base.options = field.options ?? [];
  if (type === "group") base.fields = field.fields ?? [newField()];
  if (type === "list") base.item = field.item ?? { name: "item", label: "Élément", type: "text" };
  return base;
}

/** Editor for field definitions: the structure of a section or of a content type. */
export function StructureBuilder({ fields, onChange, depth = 0 }: { fields: FieldDef[]; onChange: (fields: FieldDef[]) => void; depth?: number }) {
  const set = (index: number, field: FieldDef) => onChange(fields.map((f, i) => (i === index ? field : f)));
  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= fields.length) return;
    const next = [...fields];
    [next[index], next[target]] = [next[target] as FieldDef, next[index] as FieldDef];
    onChange(next);
  };

  return (
    <div className="space-y-3">
      {fields.map((field, index) => {
        const listOfGroups = field.type === "list" && field.item?.type === "group";
        return (
          <div key={index} className={`rounded-xl border border-line p-3 ${depth % 2 ? "bg-mist/60" : "bg-white"}`}>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                value={field.label}
                placeholder="Libellé (ex. Titre)"
                aria-label="Libellé du champ"
                className="h-10 min-w-[150px] flex-1"
                onChange={(e) => {
                  const label = e.target.value;
                  // The technical name follows the label until it is edited by hand.
                  const follows = field.name === "" || field.name === toName(field.label);
                  set(index, { ...field, label, name: follows ? toName(label) : field.name });
                }}
              />
              <Input
                value={field.name}
                placeholder="nomTechnique"
                aria-label="Nom technique"
                className="h-10 w-[150px] font-mono text-[13px]"
                invalid={field.name !== "" && !NAME.test(field.name)}
                onChange={(e) => set(index, { ...field, name: e.target.value })}
              />
              <Select value={field.type} aria-label="Type de champ" className="h-10 w-auto! min-w-[170px]" onChange={(e) => set(index, retype(field, e.target.value as FieldType))}>
                {TYPES.map((t) => (
                  <option key={t} value={t}>
                    {FIELD_TYPE_LABELS[t]}
                  </option>
                ))}
              </Select>
              <div className="flex items-center">
                <IconButton label="Monter" disabled={index === 0} onClick={() => move(index, -1)}>
                  <ArrowUp size={15} aria-hidden />
                </IconButton>
                <IconButton label="Descendre" disabled={index === fields.length - 1} onClick={() => move(index, 1)}>
                  <ArrowDown size={15} aria-hidden />
                </IconButton>
                <IconButton label="Supprimer le champ" tone="danger" onClick={() => onChange(fields.filter((_, i) => i !== index))}>
                  <Trash2 size={15} aria-hidden />
                </IconButton>
              </div>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
              <Input
                value={field.help ?? ""}
                placeholder="Aide affichée sous le champ (facultatif)"
                aria-label="Aide"
                className="h-9 min-w-[200px] flex-1 text-[13.5px]"
                onChange={(e) => set(index, { ...field, help: e.target.value || undefined })}
              />
              {field.type !== "group" && field.type !== "boolean" && (
                <label className="inline-flex items-center gap-2 text-[13px] font-medium text-ink-soft">
                  <Switch size="sm" checked={Boolean(field.required)} onChange={(required) => set(index, { ...field, required: required || undefined })} label="Champ obligatoire" />
                  Obligatoire
                </label>
              )}
            </div>

            {field.type === "select" && (
              <div className="mt-3">
                <p className="mb-1 text-[12.5px] font-semibold text-muted">Choix proposés, un par ligne (valeur | libellé)</p>
                <textarea
                  className="w-full rounded-xl border border-line-strong bg-white px-3 py-2 font-mono text-[13px] focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/15"
                  rows={3}
                  value={(field.options ?? []).map((o) => (o.value === o.label ? o.value : `${o.value} | ${o.label}`)).join("\n")}
                  onChange={(e) =>
                    set(index, {
                      ...field,
                      options: e.target.value
                        .split("\n")
                        .map((line) => {
                          const [value = "", label] = line.split("|").map((s) => s.trim());
                          return { value, label: label || value };
                        })
                        .filter((o) => o.value),
                    })
                  }
                />
              </div>
            )}

            {field.type === "list" && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="text-[13px] font-semibold text-muted">Chaque élément est :</span>
                <Select
                  value={field.item?.type ?? "text"}
                  aria-label="Type des éléments"
                  className="h-9 w-auto! min-w-[190px] text-[13.5px]"
                  onChange={(e) => {
                    const type = e.target.value as FieldType;
                    set(index, { ...field, item: retype({ ...(field.item ?? { name: "item", label: "Élément", type: "text" }), name: "item", label: "Élément" }, type) });
                  }}
                >
                  {TYPES.filter((t) => t !== "list" && t !== "boolean").map((t) => (
                    <option key={t} value={t}>
                      {FIELD_TYPE_LABELS[t]}
                    </option>
                  ))}
                </Select>
              </div>
            )}

            {(field.type === "group" || listOfGroups) && (
              <div className="mt-3 border-l-2 border-brand/30 pl-3">
                <StructureBuilder
                  depth={depth + 1}
                  fields={(field.type === "group" ? field.fields : field.item?.fields) ?? []}
                  onChange={(inner) =>
                    set(index, field.type === "group" ? { ...field, fields: inner } : { ...field, item: { ...(field.item as FieldDef), fields: inner } })
                  }
                />
              </div>
            )}
          </div>
        );
      })}
      <Button variant="line" size="sm" icon={<Plus size={15} aria-hidden />} onClick={() => onChange([...fields, newField()])}>
        Ajouter un champ
      </Button>
    </div>
  );
}
