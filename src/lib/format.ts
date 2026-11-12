import type { ActivityAction, ActivityTarget, Role } from "./types";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://taki-ib.vercel.app").replace(/\/$/, "");

export const siteUrl = (path = "/") => `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;

/**
 * URL to display a media value stored in content: uploads are served through this app,
 * `/media/...` and `/brand/...` files ship with the public website.
 */
export function mediaSrc(url: string): string {
  if (!url) return "";
  if (/^https?:\/\//.test(url) || url.startsWith("/uploads/")) return url;
  return siteUrl(url);
}

const dateTime = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" });
const dateOnly = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" });
const relative = new Intl.RelativeTimeFormat("fr-FR", { numeric: "auto" });

export function formatDateTime(value: string | null | undefined): string {
  return value ? dateTime.format(new Date(value)) : "—";
}

export function formatDate(value: string | null | undefined): string {
  return value ? dateOnly.format(new Date(value)) : "—";
}

export function timeAgo(value: string | null | undefined): string {
  if (!value) return "—";
  const seconds = Math.round((new Date(value).getTime() - Date.now()) / 1000);
  const abs = Math.abs(seconds);
  if (abs < 60) return "à l'instant";
  if (abs < 3600) return relative.format(Math.round(seconds / 60), "minute");
  if (abs < 86400) return relative.format(Math.round(seconds / 3600), "hour");
  if (abs < 86400 * 30) return relative.format(Math.round(seconds / 86400), "day");
  return formatDate(value);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 / 1024).toFixed(1)} Mo`;
  return `${(bytes / 1024 ** 3).toFixed(2)} Go`;
}

/** Removes the editor's emphasis markers for plain display. */
export const plain = (text: string) => text.replace(/\*/g, "");

export const ROLE_LABELS: Record<Role, string> = {
  super_admin: "Super administrateur",
  admin: "Administrateur",
  marketing: "Marketing",
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  super_admin: "Accès complet, y compris la structure des contenus et les comptes super administrateurs.",
  admin: "Gère le contenu, les médias, les utilisateurs et les réglages du site.",
  marketing: "Gère le contenu, les médias et les sections des pages, sans accès aux réglages sensibles ni aux utilisateurs.",
};

export const ACTION_LABELS: Record<ActivityAction, string> = {
  create: "a créé",
  update: "a modifié",
  publish: "a publié",
  delete: "a supprimé",
  show: "a affiché",
  hide: "a masqué",
  upload: "a importé",
  reorder: "a réordonné",
};

export const TARGET_LABELS: Record<ActivityTarget, string> = {
  section: "la section",
  entry: "le contenu",
  media: "le média",
  user: "l'utilisateur",
  contentType: "le type de contenu",
  submission: "la demande",
};
