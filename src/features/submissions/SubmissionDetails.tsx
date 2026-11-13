"use client";

import { Download, ExternalLink, FileText, Mail, Phone, Trash2 } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Badge, ErrorState, SkeletonList } from "@/components/ui/Feedback";
import { Field, Textarea } from "@/components/ui/Form";
import { ConfirmDialog, Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/features/auth/AuthProvider";
import { useQuery } from "@/hooks/useQuery";
import { cn } from "@/lib/cn";
import { formatBytes, formatDate, formatDateTime } from "@/lib/format";
import type { SubmissionDetail, SubmissionStatus } from "@/lib/types";
import { notifySubmissionsChanged, STATUS_LABELS, STATUS_TONES, SUBMISSION_STATUSES, submissionsApi, TYPE_LABELS, TYPE_TONES } from "./api";

/** Everything a visitor sent in one form, with the team's follow-up: status, internal note, CV, deletion. */
export function SubmissionDetails({ id, onClose, onChanged }: { id: string | null; onClose: () => void; onChanged: () => void }) {
  return (
    <Modal open={id !== null} onClose={onClose} title="Détail de la demande" size="lg">
      {id && <Details key={id} id={id} onClose={onClose} onChanged={onChanged} />}
    </Modal>
  );
}

function Rows({ title, rows }: { title: string; rows: [label: string, value: ReactNode][] }) {
  const filled = rows.filter(([, value]) => value !== "" && value !== false && value !== null && value !== undefined);
  if (!filled.length) return null;
  return (
    <section>
      <h3 className="mb-2.5 text-xs font-bold uppercase tracking-[0.06em] text-muted">{title}</h3>
      <dl className="grid gap-x-6 gap-y-2.5 text-[14.5px] sm:grid-cols-2">
        {filled.map(([label, value]) => (
          <div key={label} className="min-w-0">
            <dt className="text-[13px] text-muted">{label}</dt>
            <dd className="break-words font-medium text-navy">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function Message({ title, text }: { title: string; text: string }) {
  if (!text) return null;
  return (
    <section>
      <h3 className="mb-2.5 text-xs font-bold uppercase tracking-[0.06em] text-muted">{title}</h3>
      <p className="whitespace-pre-wrap break-words rounded-2xl bg-mist px-4 py-3.5 text-[15px] leading-relaxed text-navy">{text}</p>
    </section>
  );
}

/** `2013-02-21` → `21 févr. 2013`, without shifting the day across time zones. */
const birthdate = (iso: string) => (/^\d{4}-\d{2}-\d{2}$/.test(iso) ? formatDate(`${iso}T12:00:00`) : iso);

function TypeSpecific({ s }: { s: SubmissionDetail }) {
  if (s.type === "contact") {
    return (
      <>
        <Rows
          title="Demande"
          rows={[
            ["Sujet", s.data.topic],
            ["Classe actuelle de l'enfant", s.data.grade],
          ]}
        />
        <Message title="Message" text={s.data.message} />
      </>
    );
  }
  if (s.type === "admission") {
    const { parent, student } = s.data;
    return (
      <>
        <Rows
          title="Parent ou responsable légal"
          rows={[
            ["Prénom", parent.firstName],
            ["Nom", parent.lastName],
            ["Adresse", parent.address],
          ]}
        />
        <Rows
          title="Élève"
          rows={[
            ["Prénom", student.firstName],
            ["Nom", student.lastName],
            ["Genre", student.gender],
            ["Nationalité", student.nationality],
            ["Date de naissance", birthdate(student.birthdate)],
            ["Lieu de naissance", student.birthplace],
            ["Niveau", student.level],
            ["Classe", student.grade],
            ["Téléphone de l'élève", student.phone && <a href={`tel:${student.phone.replace(/[^\d+]/g, "")}`} className="text-brand-deep hover:underline">{student.phone}</a>],
            ["École précédente", s.data.previousSchool],
          ]}
        />
      </>
    );
  }
  return (
    <>
      <Rows
        title="Candidature"
        rows={[
          ["Poste souhaité", s.data.role],
          [
            "Profil en ligne",
            // Only http(s) links are stored, but this one comes from a stranger: never trust it blindly.
            /^https?:\/\//i.test(s.data.link) && (
              <a href={s.data.link} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1.5 text-brand-deep hover:underline">
                <span className="break-all">{s.data.link}</span>
                <ExternalLink size={13} className="shrink-0" aria-hidden />
              </a>
            ),
          ],
        ]}
      />
      <Message title="Message du candidat" text={s.data.message} />
    </>
  );
}

function Details({ id, onClose, onChanged }: { id: string; onClose: () => void; onChanged: () => void }) {
  const toast = useToast();
  const { can } = useAuth();
  const { data, error, loading, reload, setData } = useQuery((signal) => submissionsApi.get(id, signal), [id]);
  // null = not edited yet: the field shows the saved note.
  const [noteEdit, setNote] = useState<string | null>(null);
  const [savingNote, setSavingNote] = useState(false);
  const [changingTo, setChangingTo] = useState<SubmissionStatus | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (loading) return <SkeletonList rows={5} />;
  if (error || !data) return <ErrorState message={error ?? "Demande introuvable"} onRetry={reload} />;

  const manage = can("submissions:manage");
  const note = noteEdit ?? data.note;

  async function setStatus(status: SubmissionStatus) {
    if (status === data?.status) return;
    setChangingTo(status);
    try {
      setData(await submissionsApi.update(id, { status }));
      toast.success(`Demande marquée « ${STATUS_LABELS[status].toLowerCase()} »`);
      onChanged();
      notifySubmissionsChanged();
    } catch (err) {
      toast.fromError(err);
    } finally {
      setChangingTo(null);
    }
  }

  async function saveNote() {
    setSavingNote(true);
    try {
      setData(await submissionsApi.update(id, { note }));
      setNote(null);
      toast.success("Note enregistrée");
      onChanged();
    } catch (err) {
      toast.fromError(err);
    } finally {
      setSavingNote(false);
    }
  }

  async function remove() {
    setDeleting(true);
    try {
      await submissionsApi.remove(id);
      toast.success("Demande supprimée");
      onChanged();
      notifySubmissionsChanged();
      onClose();
    } catch (err) {
      toast.fromError(err);
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <Badge tone={TYPE_TONES[data.type]}>{TYPE_LABELS[data.type]}</Badge>
        {data.suspect && (
          <span title="Le champ anti-robot du formulaire était rempli : envoi automatique possible.">
            <Badge tone="warning">À vérifier</Badge>
          </span>
        )}
        <Badge tone={STATUS_TONES[data.status]} dot>
          {STATUS_LABELS[data.status]}
        </Badge>
        <span className="font-mono text-[13px] font-semibold tracking-[0.04em] text-navy">{data.reference}</span>
        <span className="text-[13px] text-muted">Reçue le {formatDateTime(data.createdAt)}</span>
      </div>

      <section className="rounded-2xl border border-line p-4">
        <p className="text-lg font-semibold tracking-[-0.02em] text-navy">{data.name}</p>
        <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1.5 text-[14.5px]">
          <a href={`mailto:${data.email}`} className="inline-flex min-w-0 items-center gap-2 font-medium text-brand-deep hover:underline">
            <Mail size={15} className="shrink-0" aria-hidden />
            <span className="break-all">{data.email}</span>
          </a>
          <a href={`tel:${data.phone.replace(/[^\d+]/g, "")}`} className="inline-flex items-center gap-2 font-medium text-brand-deep hover:underline">
            <Phone size={15} className="shrink-0" aria-hidden />
            {data.phone}
          </a>
        </div>
      </section>

      <TypeSpecific s={data} />

      {data.cv && (
        <section>
          <h3 className="mb-2.5 text-xs font-bold uppercase tracking-[0.06em] text-muted">CV</h3>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line p-4">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-sky text-brand-deep">
                <FileText size={18} aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[14.5px] font-semibold text-navy">{data.cv.originalName}</span>
                <span className="block text-[13px] text-muted">
                  {data.cv.mimeType === "application/pdf" ? "PDF" : "Word (.docx)"} · {formatBytes(data.cv.size)}
                </span>
              </span>
            </div>
            <ButtonLink href={submissionsApi.cvUrl(data.id)} download variant="line" size="sm" icon={<Download size={15} aria-hidden />}>
              Télécharger le CV
            </ButtonLink>
          </div>
        </section>
      )}

      <section className="space-y-5 border-t border-line pt-5">
        <div>
          <h3 id="submission-status" className="mb-2.5 text-xs font-bold uppercase tracking-[0.06em] text-muted">
            Suivi
          </h3>
          <div role="group" aria-labelledby="submission-status" className="flex flex-wrap gap-2">
            {SUBMISSION_STATUSES.map((status) => {
              const current = data.status === status;
              return (
                <Button
                  key={status}
                  size="sm"
                  variant={current ? "primary" : "line"}
                  aria-pressed={current}
                  disabled={!manage || (changingTo !== null && changingTo !== status)}
                  loading={changingTo === status}
                  className={cn(current && "pointer-events-none")}
                  onClick={() => void setStatus(status)}
                >
                  {STATUS_LABELS[status]}
                </Button>
              );
            })}
          </div>
          {data.statusUpdatedAt && (
            <p className="mt-2 text-[13px] text-muted">
              Statut modifié le {formatDateTime(data.statusUpdatedAt)}
              {data.updatedByName && ` par ${data.updatedByName}`}
            </p>
          )}
        </div>

        <Field label="Note interne" htmlFor="submission-note" help="Visible uniquement par l'équipe : suite donnée, date de rappel, décision…">
          <Textarea id="submission-note" value={note} minRows={3} maxLength={2000} disabled={!manage} onChange={(e) => setNote(e.target.value)} />
        </Field>

        {manage && (
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <Button size="sm" disabled={note === data.note} loading={savingNote} onClick={() => void saveNote()}>
              Enregistrer la note
            </Button>
            <Button variant="danger" size="sm" icon={<Trash2 size={15} aria-hidden />} onClick={() => setConfirmDelete(true)}>
              Supprimer
            </Button>
          </div>
        )}
      </section>

      <ConfirmDialog
        open={confirmDelete}
        title="Supprimer cette demande ?"
        loading={deleting}
        onConfirm={() => void remove()}
        onClose={() => setConfirmDelete(false)}
        message={
          <>
            La demande <strong>{data.reference}</strong> de <strong>{data.name}</strong>
            {data.cv ? ", son CV" : ""} et sa note interne seront définitivement supprimés.
          </>
        }
      />
    </div>
  );
}
