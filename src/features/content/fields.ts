import type { ContentObject, ContentValue, FieldDef, FieldIssue, FieldType } from "@/lib/types";

export const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  text: "Texte court",
  textarea: "Texte long",
  richtext: "Texte avec mise en valeur",
  image: "Image",
  url: "Lien",
  youtube: "Vidéo YouTube (lien)",
  number: "Nombre",
  boolean: "Oui / Non",
  select: "Liste de choix",
  date: "Date",
  group: "Groupe de champs",
  list: "Liste répétable",
};

/** Same empty values as the API produces, so a new item never differs from a saved one. */
export function emptyValue(field: FieldDef): ContentValue {
  switch (field.type) {
    case "boolean":
      return false;
    case "number":
      return null;
    case "list":
      return [];
    case "group":
      return emptyContent(field.fields ?? []);
    default:
      return "";
  }
}

export function emptyContent(fields: FieldDef[]): ContentObject {
  return Object.fromEntries(fields.map((f) => [f.name, emptyValue(f)]));
}

/**
 * Fits a stored value to the current field definitions (missing keys get empty values),
 * so the form is always fully controlled even if the structure changed since the last save.
 */
export function conform(field: FieldDef, value: ContentValue | undefined): ContentValue {
  if (value === undefined || value === null) return emptyValue(field);
  if (field.type === "group") {
    const obj = typeof value === "object" && !Array.isArray(value) ? value : {};
    return Object.fromEntries((field.fields ?? []).map((f) => [f.name, conform(f, obj[f.name])]));
  }
  if (field.type === "list") {
    const item = field.item;
    return Array.isArray(value) && item ? value.map((v) => conform(item, v)) : [];
  }
  return value;
}

export function conformContent(fields: FieldDef[], value: ContentObject | null | undefined): ContentObject {
  return Object.fromEntries(fields.map((f) => [f.name, conform(f, value?.[f.name])]));
}

/** A short human label for a list item: its first non-empty text. */
export function summarize(value: ContentValue, field?: FieldDef): string {
  if (typeof value === "string") return value.replace(/\*/g, "").trim();
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.length ? `${value.length} élément${value.length > 1 ? "s" : ""}` : "";
  if (value && typeof value === "object") {
    const order = field?.fields?.map((f) => f.name) ?? Object.keys(value);
    const preferred = ["title", "label", "name", "heading", "q", "question", "role", "value", ...order];
    for (const key of preferred) {
      const v = value[key];
      if (typeof v === "string" && v.trim() && !/^(\/|https?:)/.test(v)) return v.replace(/\*/g, "").trim();
    }
    for (const key of order) {
      const text = summarize(value[key] ?? null);
      if (text) return text;
    }
  }
  return "";
}

/** Indexes API issues by path ("items[0].title") for display under the right field. */
export function issuesByPath(issues: FieldIssue[]): Map<string, string> {
  return new Map(issues.map((i) => [i.path, i.message]));
}

/** True when any issue sits at or below `path` (used to flag collapsed groups and list items). */
export function hasIssueUnder(issues: Map<string, string>, path: string): boolean {
  for (const key of issues.keys()) {
    if (key === path || key.startsWith(`${path}.`) || key.startsWith(`${path}[`)) return true;
  }
  return false;
}

const SAFE_LINK = /^(\/(?!\/)|#|https?:\/\/|mailto:|tel:)/i;

/** True for the link of a YouTube video (watch, youtu.be, shorts, embed, live). Mirrors the API. */
export function isYoutubeLink(link: string): boolean {
  try {
    const url = new URL(link.trim());
    if (!/^https?:$/.test(url.protocol)) return false;
    const host = url.hostname.replace(/^(www|m|music)\./, "");
    let id = "";
    if (host === "youtu.be") id = url.pathname.split("/")[1] ?? "";
    else if (host === "youtube.com" || host === "youtube-nocookie.com") {
      const fromPath = url.pathname.match(/^\/(?:shorts|embed|live|v)\/([^/]+)/);
      id = fromPath ? fromPath[1] : (url.searchParams.get("v") ?? "");
    }
    return /^[\w-]{11}$/.test(id);
  } catch {
    return false;
  }
}

/** Client-side checks mirroring the API's sanitiser, for immediate feedback. */
export function validateContent(fields: FieldDef[], value: ContentObject, prefix = ""): FieldIssue[] {
  const issues: FieldIssue[] = [];
  const visit = (field: FieldDef, v: ContentValue | undefined, path: string) => {
    const empty = v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0);
    if (field.required && empty) issues.push({ path, message: `« ${field.label} » est obligatoire` });
    if (empty) return;
    if (field.type === "url" && typeof v === "string" && !SAFE_LINK.test(v)) {
      issues.push({ path, message: "Lien invalide : utilisez /page, https://…, mailto: ou tel:" });
    }
    if (field.type === "youtube" && typeof v === "string" && !isYoutubeLink(v)) {
      issues.push({ path, message: "Collez le lien d'une vidéo YouTube, par exemple https://www.youtube.com/watch?v=…" });
    }
    if (field.type === "group" && typeof v === "object" && !Array.isArray(v)) {
      for (const f of field.fields ?? []) visit(f, v[f.name], `${path}.${f.name}`);
    }
    if (field.type === "list" && Array.isArray(v) && field.item) {
      const item = field.item;
      v.forEach((entry, i) => visit(item, entry, `${path}[${i}]`));
    }
  };
  for (const f of fields) visit(f, value[f.name], prefix ? `${prefix}.${f.name}` : f.name);
  return issues;
}

export function sameContent(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}
