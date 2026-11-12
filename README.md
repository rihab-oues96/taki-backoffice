# backoffice-front — Backoffice

Next.js 16 (App Router) + TypeScript + Tailwind 4. Same design tokens, font and button language as the public website. The interface is in French, like the site. See the [root README](../README.md) for the overall picture.

```bash
cp .env.example .env.local
npm install
npm run dev        # http://localhost:3001  (needs backoffice-back running)
npm run build && npm start
npm run lint && npm run typecheck
```

| Variable | |
|---|---|
| `API_URL` | CMS API, server-side only. `/api/*` and `/uploads/*` are rewritten to it, so the browser only talks to this app and the session cookie is first-party. |
| `SESSION_COOKIE` | Name of the session cookie (`COOKIE_NAME` of the API). |
| `NEXT_PUBLIC_SITE_URL` | Public website: "view on site" links and previews of the images it ships. |

## Structure

```
src/
  proxy.ts                 redirects to /login when there is no session cookie (the API does the real check)
  app/
    login/                 sign-in
    (dashboard)/           protected area: dashboard, pages, sections/[id], content/[type]/…, media, submissions, users, account
  components/ui/           Button, Form controls, Modal/ConfirmDialog, Toast, Table, Feedback (skeleton, empty, error, badges), Layout
  components/layout/       Shell (sidebar + mobile drawer), navigation definition
  features/
    auth/                  AuthProvider (session + permissions), LoginForm, RequirePermission
    content/               api, FieldEditor (form generated from field definitions), ContentEditor
                           (draft / publish / preview), EntryEditor, StructureBuilder
    media/                 api, MediaLibrary, UploadZone, MediaDetails, MediaPicker
    users/                 api, UserForm
    submissions/           api (+ labels, download links), SubmissionDetails
  hooks/                   useQuery (loading/error/data), useDebounced, useUnsavedWarning
  lib/                     api (the only HTTP client, typed), types (API contract), format, validation
```

## Screens

- **Tableau de bord** — counts, pending drafts, quick access, recently changed content, team activity log.
- **Pages** — each page's sections: edit, hide/show, reorder, delete; new section (super admin).
- **Section / entry editor** — form generated from the field definitions; *Enregistrer le brouillon* (site unchanged) → *Aperçu sur le site* (opens the website in preview mode) → *Publier*.
- **Contenus** — articles, news, videos, testimonials, FAQ, policies: search, filter, reorder, hide, create, delete.
- **Médias** — upload (drag and drop), search, folders, alt text, where a file is used, replace (references follow), delete.
- **Demandes reçues** — what visitors sent through the website's forms (contact, pre-registration, job applications): filter by form, status and date, search, sort, open a submission, follow it up (*En attente* → *Consultée* → *Traitée*, internal note), download a CV, export the current selection as CSV, delete. Super admins and administrators only; the menu shows how many are still pending.
- **Utilisateurs** — create, role, activate/deactivate, reset password, delete.
- **Mon compte** — name and password.

What a user sees follows the permissions returned by `GET /api/auth/me`; the API enforces them regardless.
