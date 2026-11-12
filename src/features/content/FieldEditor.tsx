"use client";

import { ArrowDown, ArrowUp, ChevronDown, Copy, ImagePlus, Plus, Trash2, Upload, X } from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import { Button, IconButton } from "@/components/ui/Button";
import { Field, Input, Select, Switch, Textarea } from "@/components/ui/Form";
import { MediaPicker } from "@/features/media/MediaPicker";
import { MediaThumb } from "@/features/media/MediaThumb";
import { cn } from "@/lib/cn";
import { mediaSrc } from "@/lib/format";
import type { ContentObject, ContentValue, FieldDef } from "@/lib/types";
import { conform, emptyValue, hasIssueUnder, isVideoFile, isYoutubeLink, summarize } from "./fields";

interface EditorProps {
  field: FieldDef;
  value: ContentValue;
  onChange: (value: ContentValue) => void;
  path: string;
  issues: Map<string, string>;
  disabled?: boolean;
  /** Nesting depth, used to soften the styling of inner groups. */
  depth?: number;
}

/** Renders the right control for a field definition; groups and lists recurse. */
export function FieldEditor(props: EditorProps) {
  const { field } = props;
  if (field.type === "group") return <GroupEditor {...props} />;
  if (field.type === "list") return <ListEditor {...props} />;
  return <ScalarEditor {...props} />;
}

/** Renders a set of fields against an object value. */
export function FieldsForm({
  fields,
  value,
  onChange,
  issues,
  disabled,
  path = "",
  depth = 0,
}: {
  fields: FieldDef[];
  value: ContentObject;
  onChange: (value: ContentObject) => void;
  issues: Map<string, string>;
  disabled?: boolean;
  path?: string;
  depth?: number;
}) {
  return (
    <div className="space-y-5">
      {fields.map((field) => (
        <FieldEditor
          key={field.name}
          field={field}
          value={value[field.name] ?? emptyValue(field)}
          onChange={(v) => onChange({ ...value, [field.name]: v })}
          path={path ? `${path}.${field.name}` : field.name}
          issues={issues}
          disabled={disabled}
          depth={depth}
        />
      ))}
    </div>
  );
}

/** `*mot*` → highlighted, `**mot**` → bold: the same light markup the website renders. */
function RichPreview({ text }: { text: string }) {
  if (!/\*[^*]+\*/.test(text)) return null;
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|\n)/g);
  return (
    <p className="mt-2 rounded-xl bg-mist px-3.5 py-2.5 text-[15px] font-semibold leading-snug text-navy" aria-label="Aperçu">
      {parts.map((part, i) => {
        if (part === "\n") return <br key={i} />;
        if (part.startsWith("**") && part.endsWith("**") && part.length > 4) return <strong key={i} className="font-extrabold">{part.slice(2, -2)}</strong>;
        if (part.startsWith("*") && part.endsWith("*") && part.length > 2) return <em key={i} className="not-italic text-brand">{part.slice(1, -1)}</em>;
        return part;
      })}
    </p>
  );
}

function ScalarEditor({ field, value, onChange, path, issues, disabled }: EditorProps) {
  const id = useId();
  const error = issues.get(path);
  const text = typeof value === "string" ? value : "";

  let control: ReactNode;
  switch (field.type) {
    case "boolean":
      return (
        <div className="flex items-start justify-between gap-4 rounded-xl border border-line bg-white px-4 py-3">
          <div>
            <p className="text-[13.5px] font-semibold text-navy">{field.label}</p>
            {field.help && <p className="mt-0.5 text-[13px] text-muted">{field.help}</p>}
          </div>
          <Switch checked={value === true} onChange={onChange} label={field.label} disabled={disabled} />
        </div>
      );
    case "number":
      control = (
        <Input
          id={id}
          type="number"
          inputMode="decimal"
          value={typeof value === "number" ? value : ""}
          disabled={disabled}
          invalid={Boolean(error)}
          onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
          className="max-w-[220px]"
        />
      );
      break;
    case "select":
      control = (
        <Select id={id} value={text} disabled={disabled} invalid={Boolean(error)} onChange={(e) => onChange(e.target.value)} className="max-w-md">
          {!field.options?.some((o) => o.value === "") && <option value="">— Choisir —</option>}
          {field.options?.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      );
      break;
    case "date":
      control = <Input id={id} type="date" value={text.slice(0, 10)} disabled={disabled} invalid={Boolean(error)} onChange={(e) => onChange(e.target.value)} className="max-w-[220px]" />;
      break;
    case "image":
      control = <ImageInput id={id} value={text} onChange={onChange} disabled={disabled} label={field.label} />;
      break;
    case "url":
      control = <Input id={id} type="text" inputMode="url" value={text} disabled={disabled} invalid={Boolean(error)} onChange={(e) => onChange(e.target.value)} placeholder="/page ou https://…" className="font-mono text-[13.5px]" />;
      break;
    case "youtube":
      control = <Input id={id} type="url" inputMode="url" value={text} disabled={disabled} invalid={Boolean(error)} onChange={(e) => onChange(e.target.value.trim())} placeholder="https://www.youtube.com/watch?v=…" className="font-mono text-[13.5px]" />;
      break;
    case "video":
      control = <VideoInput id={id} value={text} onChange={onChange} disabled={disabled} invalid={Boolean(error)} label={field.label} />;
      break;
    case "textarea":
      control = <Textarea id={id} value={text} minRows={3} disabled={disabled} invalid={Boolean(error)} onChange={(e) => onChange(e.target.value)} />;
      break;
    case "richtext":
      control = (
        <>
          <Textarea id={id} value={text} minRows={1} disabled={disabled} invalid={Boolean(error)} onChange={(e) => onChange(e.target.value)} />
          <RichPreview text={text} />
        </>
      );
      break;
    default:
      control = <Input id={id} type="text" value={text} disabled={disabled} invalid={Boolean(error)} onChange={(e) => onChange(e.target.value)} />;
  }

  const help = field.help ?? (field.type === "richtext" ? "Entourez un mot d'astérisques pour le mettre en valeur : *mot*." : undefined);
  return (
    <Field label={field.label} htmlFor={id} help={help} error={error} required={field.required}>
      {control}
    </Field>
  );
}

function ImageInput({ id, value, onChange, disabled, label }: { id: string; value: string; onChange: (v: string) => void; disabled?: boolean; label: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-wrap items-center gap-4 rounded-xl border border-line bg-white p-3">
      {value ? (
        <MediaThumb url={value} alt="" contain className="size-24 shrink-0 rounded-lg border border-line" />
      ) : (
        <div className="grid size-24 shrink-0 place-items-center rounded-lg border border-dashed border-line-strong bg-mist text-muted">
          <ImagePlus size={22} aria-hidden />
        </div>
      )}
      <div className="min-w-0 flex-1 space-y-2">
        <p id={id} className="truncate font-mono text-[12.5px] text-muted" title={value}>
          {value || "Aucune image"}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="line" size="sm" disabled={disabled} onClick={() => setOpen(true)} aria-label={`${value ? "Changer" : "Choisir"} l'image : ${label}`}>
            {value ? "Changer" : "Choisir une image"}
          </Button>
          {value && (
            <Button variant="ghost" size="sm" disabled={disabled} icon={<X size={14} aria-hidden />} onClick={() => onChange("")}>
              Retirer
            </Button>
          )}
        </div>
      </div>
      <MediaPicker
        open={open}
        selectedUrl={value}
        onClose={() => setOpen(false)}
        onSelect={(media) => {
          onChange(media.url);
          setOpen(false);
        }}
      />
    </div>
  );
}

/** A video: paste a YouTube link, or pick / upload a file from the media library. */
function VideoInput({ id, value, onChange, disabled, invalid, label }: { id: string; value: string; onChange: (v: string) => void; disabled?: boolean; invalid?: boolean; label: string }) {
  const [open, setOpen] = useState(false);
  const file = isVideoFile(value);
  const source = file ? "Vidéo importée" : isYoutubeLink(value) ? "Vidéo YouTube" : "";
  return (
    <div className="space-y-2.5 rounded-xl border border-line bg-white p-3">
      <Input
        id={id}
        type="text"
        inputMode="url"
        value={value}
        disabled={disabled}
        invalid={invalid}
        onChange={(e) => onChange(e.target.value.trim())}
        placeholder="https://www.youtube.com/watch?v=…"
        className="font-mono text-[13.5px]"
      />
      {file && (
        <video key={value} src={mediaSrc(value)} controls muted preload="metadata" className="aspect-video w-full max-w-sm rounded-lg border border-line bg-black" />
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="line" size="sm" disabled={disabled} icon={<Upload size={14} aria-hidden />} onClick={() => setOpen(true)} aria-label={`Importer ou choisir une vidéo : ${label}`}>
          {file ? "Changer de vidéo" : "Importer une vidéo"}
        </Button>
        {value && (
          <Button variant="ghost" size="sm" disabled={disabled} icon={<X size={14} aria-hidden />} onClick={() => onChange("")}>
            Retirer
          </Button>
        )}
        {source && <span className="ml-auto rounded-full bg-mist px-2.5 py-1 text-xs font-bold text-muted">{source}</span>}
      </div>
      <MediaPicker
        kind="video"
        open={open}
        selectedUrl={value}
        onClose={() => setOpen(false)}
        onSelect={(media) => {
          onChange(media.url);
          setOpen(false);
        }}
      />
    </div>
  );
}

function GroupEditor({ field, value, onChange, path, issues, disabled, depth = 0 }: EditorProps) {
  const obj = (value && typeof value === "object" && !Array.isArray(value) ? value : {}) as ContentObject;
  return (
    <fieldset className={cn("rounded-2xl border border-line p-4 sm:p-5", depth % 2 === 0 ? "bg-mist/50" : "bg-white")}>
      <legend className="px-2 text-[13.5px] font-bold text-navy">{field.label}</legend>
      {field.help && <p className="-mt-1 mb-4 text-[13px] text-muted">{field.help}</p>}
      <FieldsForm fields={field.fields ?? []} value={obj} onChange={onChange} issues={issues} disabled={disabled} path={path} depth={depth + 1} />
    </fieldset>
  );
}

function ListEditor({ field, value, onChange, path, issues, disabled, depth = 0 }: EditorProps) {
  const items = Array.isArray(value) ? value : [];
  const item = field.item ?? { name: "item", label: "Élément", type: "text" as const };
  const complex = item.type === "group" || item.type === "list";
  // Stable keys so React keeps focus and open state when items move.
  const [keys, setKeys] = useState<number[]>(() => items.map((_, i) => i));
  const [nextKey, setNextKey] = useState(items.length);
  const [open, setOpen] = useState<Set<number>>(new Set());
  const listError = issues.get(path);

  // The value can be replaced from outside (discard draft, reload): keep one key per item.
  if (keys.length !== items.length) {
    const synced = items.map((_, i) => keys[i] ?? nextKey + i);
    setKeys(synced);
    setNextKey(nextKey + items.length);
  }

  const update = (next: ContentValue[], nextKeys: number[]) => {
    setKeys(nextKeys);
    onChange(next);
  };

  function add() {
    const key = nextKey;
    setNextKey(key + 1);
    setOpen((s) => new Set(s).add(key));
    update([...items, emptyValue(item)], [...keys, key]);
  }

  function duplicate(index: number) {
    const key = nextKey;
    setNextKey(key + 1);
    const copy = JSON.parse(JSON.stringify(items[index] ?? emptyValue(item))) as ContentValue;
    update([...items.slice(0, index + 1), copy, ...items.slice(index + 1)], [...keys.slice(0, index + 1), key, ...keys.slice(index + 1)]);
  }

  function remove(index: number) {
    update(items.filter((_, i) => i !== index), keys.filter((_, i) => i !== index));
  }

  function move(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    const nextKeys = [...keys];
    [next[index], next[target]] = [next[target] as ContentValue, next[index] as ContentValue];
    [nextKeys[index], nextKeys[target]] = [nextKeys[target] as number, nextKeys[index] as number];
    update(next, nextKeys);
  }

  const setItem = (index: number, v: ContentValue) => onChange(items.map((current, i) => (i === index ? v : current)));

  const controls = (index: number) => (
    <div className="flex shrink-0 items-center">
      <IconButton label="Monter" disabled={disabled || index === 0} onClick={() => move(index, -1)}>
        <ArrowUp size={15} aria-hidden />
      </IconButton>
      <IconButton label="Descendre" disabled={disabled || index === items.length - 1} onClick={() => move(index, 1)}>
        <ArrowDown size={15} aria-hidden />
      </IconButton>
      {complex && (
        <IconButton label="Dupliquer" disabled={disabled} onClick={() => duplicate(index)}>
          <Copy size={15} aria-hidden />
        </IconButton>
      )}
      <IconButton label="Supprimer l'élément" tone="danger" disabled={disabled} onClick={() => remove(index)}>
        <Trash2 size={15} aria-hidden />
      </IconButton>
    </div>
  );

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-[13.5px] font-semibold text-navy">
          {field.label}
          <span className="ml-2 rounded-full bg-mist px-2 py-0.5 text-xs font-bold text-muted">{items.length}</span>
        </p>
      </div>
      {field.help && <p className="-mt-1 mb-2 text-[13px] text-muted">{field.help}</p>}

      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line-strong bg-white px-4 py-4 text-center text-[13.5px] text-muted">Aucun élément pour le moment.</p>
      ) : complex ? (
        <ul className="space-y-2">
          {items.map((entry, index) => {
            const key = keys[index] ?? index;
            const itemPath = `${path}[${index}]`;
            const invalid = hasIssueUnder(issues, itemPath);
            const isOpen = open.has(key) || invalid;
            const title = summarize(entry, item) || `${item.label} ${index + 1}`;
            return (
              <li key={key} className={cn("rounded-xl border bg-white", invalid ? "border-danger/50" : "border-line")}>
                <div className="flex items-center gap-1 py-1.5 pl-2 pr-1.5">
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() =>
                      setOpen((s) => {
                        const next = new Set(s);
                        if (next.has(key)) next.delete(key);
                        else next.add(key);
                        return next;
                      })
                    }
                    className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg px-2 py-2 text-left hover:bg-mist"
                  >
                    <ChevronDown size={16} className={cn("shrink-0 text-muted transition-transform", isOpen && "rotate-180")} aria-hidden />
                    <span className="grid size-6 shrink-0 place-items-center rounded-full bg-sky text-xs font-bold text-brand-deep">{index + 1}</span>
                    <span className="truncate text-[14.5px] font-semibold text-navy">{title}</span>
                  </button>
                  {controls(index)}
                </div>
                {isOpen && (
                  <div className="border-t border-line p-4">
                    {item.type === "group" ? (
                      <FieldsForm
                        fields={item.fields ?? []}
                        value={conform(item, entry) as ContentObject}
                        onChange={(v) => setItem(index, v)}
                        issues={issues}
                        disabled={disabled}
                        path={itemPath}
                        depth={depth + 1}
                      />
                    ) : (
                      <FieldEditor field={item} value={entry} onChange={(v) => setItem(index, v)} path={itemPath} issues={issues} disabled={disabled} depth={depth + 1} />
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <ul className="space-y-2">
          {items.map((entry, index) => (
            <li key={keys[index] ?? index} className="flex items-start gap-1.5">
              <span className="mt-2.5 grid size-6 shrink-0 place-items-center rounded-full bg-sky text-xs font-bold text-brand-deep">{index + 1}</span>
              <div className="min-w-0 flex-1 [&_label]:sr-only">
                <FieldEditor field={{ ...item, label: `${item.label} ${index + 1}`, help: undefined }} value={entry} onChange={(v) => setItem(index, v)} path={`${path}[${index}]`} issues={issues} disabled={disabled} />
              </div>
              <div className="mt-1">{controls(index)}</div>
            </li>
          ))}
        </ul>
      )}

      {listError && (
        <p role="alert" className="mt-1.5 text-[13px] font-medium text-danger">
          {listError}
        </p>
      )}
      <Button variant="line" size="sm" className="mt-2.5" disabled={disabled} icon={<Plus size={15} aria-hidden />} onClick={add}>
        Ajouter
      </Button>
    </div>
  );
}
