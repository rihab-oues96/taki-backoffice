import { FileText, Images, Inbox, LayoutDashboard, Layers, Settings2, UserCog, Users, type LucideIcon } from "lucide-react";
import type { Permission } from "@/lib/types";

export interface NavEntry {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Hidden unless the user has all of these. */
  permissions: Permission[];
  /** Also active on these path prefixes. */
  match?: string[];
  /** Nested sublinks loaded from the API and listed under this entry. */
  children?: "pages" | "contentTypes";
  /** Shows a counter next to the label (number of submissions still pending). */
  badge?: "submissions";
}

export interface SubLink {
  label: string;
  href: string;
}

export const NAV_GROUPS: { title: string; items: NavEntry[] }[] = [
  {
    title: "Général",
    items: [{ label: "Tableau de bord", href: "/", icon: LayoutDashboard, permissions: [] }],
  },
  {
    title: "Contenu du site",
    items: [
      { label: "Pages", href: "/pages", icon: FileText, permissions: ["content:read"], match: ["/sections"], children: "pages" },
      { label: "Contenus", href: "/content", icon: Layers, permissions: ["content:read"], children: "contentTypes" },
      { label: "Bibliothèque", href: "/media", icon: Images, permissions: ["media:read"] },
    ],
  },
  {
    title: "Formulaires du site",
    items: [{ label: "Demandes reçues", href: "/submissions", icon: Inbox, permissions: ["submissions:read"], badge: "submissions" }],
  },
  {
    title: "Administration",
    items: [
      { label: "Utilisateurs", href: "/users", icon: Users, permissions: ["users:read"] },
      { label: "Réglages du site", href: "/pages/global", icon: Settings2, permissions: ["settings:manage"] },
      { label: "Mon compte", href: "/account", icon: UserCog, permissions: [] },
    ],
  },
];
