/** Types shared with the CMS API (backoffice-back). */

export type Role = "super_admin" | "admin" | "marketing";

export type Permission =
  | "content:read"
  | "content:write"
  | "content:publish"
  | "content:delete"
  | "content:structure"
  | "media:read"
  | "media:write"
  | "media:delete"
  | "users:read"
  | "users:manage"
  | "settings:manage"
  | "activity:read"
  | "submissions:read"
  | "submissions:manage";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SessionUser extends User {
  permissions: Permission[];
}

export type FieldType =
  | "text"
  | "textarea"
  | "richtext"
  | "image"
  | "url"
  | "youtube"
  | "number"
  | "boolean"
  | "select"
  | "date"
  | "group"
  | "list";

export interface FieldDef {
  name: string;
  label: string;
  type: FieldType;
  help?: string;
  required?: boolean;
  options?: { value: string; label: string }[];
  fields?: FieldDef[];
  item?: FieldDef;
}

export type ContentValue = string | number | boolean | null | ContentValue[] | { [key: string]: ContentValue };
export type ContentObject = { [key: string]: ContentValue };

export interface PageSummary {
  key: string;
  label: string;
  path: string;
  description: string;
  sections: number;
  hidden: number;
  drafts: number;
  updatedAt: string | null;
}

export interface SectionSummary {
  id: string;
  page: string;
  key: string;
  label: string;
  description: string;
  order: number;
  visible: boolean;
  restricted: boolean;
  hasDraft: boolean;
  draftUpdatedAt: string | null;
  publishedAt: string | null;
  updatedAt: string;
  updatedByName: string;
}

export interface Section extends SectionSummary {
  fields: FieldDef[];
  content: ContentObject;
  draft: ContentObject | null;
}

export interface ContentType {
  key: string;
  label: string;
  singular: string;
  description: string;
  fields: FieldDef[];
  titleField: string;
  subtitleField: string;
  imageField: string;
  hasSlug: boolean;
  previewPath: string;
  count?: number;
}

export interface Entry {
  id: string;
  type: string;
  slug: string | null;
  title: string;
  order: number;
  visible: boolean;
  hasDraft: boolean;
  draftUpdatedAt: string | null;
  publishedAt: string | null;
  updatedAt: string;
  updatedByName: string;
  data: ContentObject;
  draft: ContentObject | null;
}

export type MediaKind = "image" | "video" | "document";

export interface Media {
  id: string;
  url: string;
  storage: "upload" | "site";
  filename: string;
  originalName: string;
  mimeType: string;
  kind: MediaKind;
  size: number;
  alt: string;
  folder: string;
  uploadedByName: string;
  createdAt: string;
  updatedAt: string;
}

export interface MediaUsage {
  kind: "section" | "entry";
  id: string;
  label: string;
  context: string;
}

export interface MediaRule {
  mime: string;
  ext: string;
  kind: MediaKind;
  maxBytes: number;
}

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export type ActivityAction = "create" | "update" | "publish" | "delete" | "show" | "hide" | "upload" | "reorder";
export type ActivityTarget = "section" | "entry" | "media" | "user" | "contentType" | "submission";

export interface Activity {
  id: string;
  userName: string;
  action: ActivityAction;
  targetType: ActivityTarget;
  targetId: string;
  label: string;
  context: string;
  createdAt: string;
}

export interface DashboardData {
  stats: {
    pages: number;
    sections: number;
    hiddenSections: number;
    entries: number;
    hiddenEntries: number;
    drafts: number;
    media: number;
    mediaBytes: number;
    sectionDrafts: number;
    users: number | null;
  };
  contentTypes: { key: string; label: string; total: number; hidden: number; drafts: number }[];
  mediaKinds: { kind: MediaKind; count: number; size: number }[];
  /** Figures of the forms inbox; null when the role cannot see the submissions. */
  submissions: SubmissionStats | null;
  /** Figures of the team's activity over 30 days; null when the role cannot see the journal. */
  activityStats: {
    total: number;
    days: { date: string; total: number }[];
    byAction: { action: ActivityAction; total: number }[];
    byUser: { userName: string; total: number }[];
  } | null;
  recent: {
    kind: "section" | "entry";
    id: string;
    label: string;
    context: string;
    visible: boolean;
    hasDraft: boolean;
    updatedAt: string;
    updatedByName: string;
  }[];
  activity: Activity[];
  siteUrl: string;
}

export interface FieldIssue {
  path: string;
  message: string;
}

/* ------------------------------------------------------------------ */
/* Form submissions from the website                                   */
/* ------------------------------------------------------------------ */

export type SubmissionType = "contact" | "admission" | "job";
export type SubmissionStatus = "pending" | "reviewed" | "handled";

export interface SubmissionItem {
  id: string;
  type: SubmissionType;
  /** Short code given to the visitor in the confirmation message. */
  reference: string;
  status: SubmissionStatus;
  name: string;
  email: string;
  phone: string;
  /** The topic, the pupil or the position applied for. */
  subject: string;
  hasCv: boolean;
  hasNote: boolean;
  createdAt: string;
}

export interface ContactData {
  grade: string;
  topic: string;
  message: string;
}

export interface AdmissionData {
  parent: { firstName: string; lastName: string; address: string };
  student: {
    firstName: string;
    lastName: string;
    gender: string;
    nationality: string;
    /** ISO date, `YYYY-MM-DD`. */
    birthdate: string;
    birthplace: string;
    level: string;
    grade: string;
    phone: string;
  };
  previousSchool: string;
}

export interface JobData {
  role: string;
  link: string;
  message: string;
}

export type SubmissionDetail = Omit<SubmissionItem, "type"> & {
  /** Internal note of the team, never shown to the visitor. */
  note: string;
  statusUpdatedAt: string | null;
  updatedByName: string;
  cv: { originalName: string; mimeType: string; size: number } | null;
} & ({ type: "contact"; data: ContactData } | { type: "admission"; data: AdmissionData } | { type: "job"; data: JobData });

export type SubmissionCounts = Record<SubmissionType, Record<SubmissionStatus, number>>;

export interface SubmissionStats {
  counts: SubmissionCounts;
  /** Forms received per day (`YYYY-MM-DD`, school's timezone), oldest first, over the last 180 days. */
  days: ({ date: string } & Record<SubmissionType, number>)[];
  /** Average hours between reception and « Traitée »; null when nothing was handled yet. */
  handling: { hours: number | null; sample: number; byType: Record<SubmissionType, number | null> };
  oldestPendingAt: string | null;
  latest: Pick<SubmissionItem, "id" | "type" | "reference" | "name" | "subject" | "status" | "createdAt">[];
}

