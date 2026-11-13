import type { FieldDef } from "@/lib/types";

/** Page key of the sections shared by the whole website (menu, footer, contact details…). */
export const SHARED_PAGE = "global";

/**
 * Where a shared section, or a few of its fields, is edited in the backoffice.
 * The content stays stored in the shared section: only the place it is reached from changes.
 */
export interface SharedPart {
  /** Last segment of the editor address: /sections/{id}/{part}. */
  id: string;
  /** Key of the shared section holding the content. */
  section: string;
  label: string;
  description: string;
  /** Top-level fields edited here; the whole section when neither `fields` nor `rest` is set. */
  fields?: string[];
  /** Takes every field the other parts of the section do not claim. */
  rest?: boolean;
  host: { page: string } | { contentType: string };
}

export const SHARED_PARTS: SharedPart[] = [
  {
    id: "identite",
    section: "site",
    label: "Identité et référencement",
    description: "Nom de l'école, adresse du site et référencement par défaut.",
    rest: true,
    host: { page: SHARED_PAGE },
  },
  {
    id: "reseaux-sociaux",
    section: "site",
    label: "Réseaux sociaux",
    description: "Liens Facebook, Instagram, YouTube et LinkedIn affichés dans le pied de page et sur plusieurs pages.",
    fields: ["social"],
    host: { page: SHARED_PAGE },
  },
  {
    id: "coordonnees",
    section: "site",
    label: "Coordonnées de l'école",
    description: "Téléphone, e-mail, adresse et carte. Reprises dans le pied de page et partout où l'école donne ses coordonnées.",
    fields: ["phone", "phoneHref", "email", "address", "mapQuery"],
    host: { page: "contact" },
  },
  {
    id: "portails",
    section: "site",
    label: "Liens de pré-inscription et portails",
    description: "Lien de pré-inscription, portail élèves et portail parents utilisés par les boutons du site.",
    fields: ["preRegistration", "studentPortal", "parentPortal"],
    host: { page: "admission" },
  },
  {
    id: "titre",
    section: "faq",
    label: "Titre du bloc de questions",
    description: "Surtitre et titre affichés au-dessus des questions, sur toutes les pages qui les présentent.",
    host: { contentType: "faq" },
  },
];

export const partsOfSection = (section: string) => SHARED_PARTS.filter((p) => p.section === section);

export const findPart = (section: string, id: string) => SHARED_PARTS.find((p) => p.section === section && p.id === id);

export const partsOnPage = (page: string) => SHARED_PARTS.filter((p) => "page" in p.host && p.host.page === page);

export const partsOnContentType = (type: string) => SHARED_PARTS.filter((p) => "contentType" in p.host && p.host.contentType === type);

/** The fields of the section that this part edits. */
export function partFields(part: SharedPart, fields: FieldDef[]): FieldDef[] {
  if (part.fields) return fields.filter((f) => part.fields?.includes(f.name));
  if (!part.rest) return fields;
  const claimed = new Set(partsOfSection(part.section).flatMap((p) => p.fields ?? []));
  return fields.filter((f) => !claimed.has(f.name));
}
