"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Switch } from "@/components/ui/Form";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/features/auth/AuthProvider";
import { ApiError } from "@/lib/api";
import { ROLE_DESCRIPTIONS, ROLE_LABELS } from "@/lib/format";
import type { Role, User } from "@/lib/types";
import { hasErrors, isEmail, PASSWORD_HINT, passwordProblem, type Errors } from "@/lib/validation";
import { usersApi } from "./api";

interface Values {
  name: string;
  email: string;
  role: Role;
  active: boolean;
  password: string;
}

/** Create a user, or edit one (`user` set). Password is only asked at creation. */
export function UserFormModal({ open, user, onClose, onSaved }: { open: boolean; user: User | null; onClose: () => void; onSaved: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title={user ? "Modifier l'utilisateur" : "Nouvel utilisateur"}>
      {open && <UserForm key={user?.id ?? "new"} user={user} onClose={onClose} onSaved={onSaved} />}
    </Modal>
  );
}

function UserForm({ user, onClose, onSaved }: { user: User | null; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const { user: me } = useAuth();
  const [values, setValues] = useState<Values>({ name: user?.name ?? "", email: user?.email ?? "", role: user?.role ?? "marketing", active: user?.active ?? true, password: "" });
  const [errors, setErrors] = useState<Errors<Values>>({});
  const [saving, setSaving] = useState(false);

  // Only a super admin may grant the super admin role (the API enforces it too).
  const roles = (Object.keys(ROLE_LABELS) as Role[]).filter((r) => r !== "super_admin" || me.role === "super_admin");
  const isSelf = user?.id === me.id;
  const set = <K extends keyof Values>(key: K, value: Values[K]) => setValues((v) => ({ ...v, [key]: value }));

  async function submit(event: FormEvent) {
    event.preventDefault();
    const next: Errors<Values> = {};
    if (values.name.trim().length < 2) next.name = "Saisissez un nom";
    if (!isEmail(values.email)) next.email = "Adresse e-mail invalide";
    if (!user) next.password = passwordProblem(values.password) ?? undefined;
    setErrors(next);
    if (hasErrors(next)) return;

    setSaving(true);
    try {
      if (user) {
        await usersApi.update(user.id, {
          name: values.name.trim(),
          email: values.email.trim(),
          ...(isSelf ? {} : { role: values.role, active: values.active }),
        });
        toast.success("Utilisateur mis à jour");
      } else {
        await usersApi.create({ ...values, name: values.name.trim(), email: values.email.trim() });
        toast.success("Utilisateur créé. Transmettez-lui son mot de passe de façon sécurisée.");
      }
      onSaved();
      onClose();
    } catch (err) {
      if (err instanceof ApiError && err.issues.length) {
        setErrors(Object.fromEntries(err.issues.map((i) => [i.path, i.message])) as Errors<Values>);
      }
      toast.fromError(err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <Field label="Nom complet" htmlFor="u-name" error={errors.name} required>
        <Input id="u-name" value={values.name} invalid={Boolean(errors.name)} autoFocus onChange={(e) => set("name", e.target.value)} />
      </Field>
      <Field label="Adresse e-mail" htmlFor="u-email" error={errors.email} required>
        <Input id="u-email" type="email" autoComplete="off" value={values.email} invalid={Boolean(errors.email)} onChange={(e) => set("email", e.target.value)} />
      </Field>
      <Field label="Rôle" htmlFor="u-role" help={isSelf ? "Vous ne pouvez pas modifier votre propre rôle." : ROLE_DESCRIPTIONS[values.role]}>
        <Select id="u-role" value={values.role} disabled={isSelf} onChange={(e) => set("role", e.target.value as Role)}>
          {roles.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r]}
            </option>
          ))}
        </Select>
      </Field>
      {!user && (
        <Field label="Mot de passe initial" htmlFor="u-password" error={errors.password} help={PASSWORD_HINT} required>
          <Input id="u-password" type="text" autoComplete="new-password" value={values.password} invalid={Boolean(errors.password)} className="font-mono" onChange={(e) => set("password", e.target.value)} />
        </Field>
      )}
      {!isSelf && (
        <div className="flex items-center justify-between gap-4 rounded-xl border border-line px-4 py-3">
          <div>
            <p className="text-[13.5px] font-semibold text-navy">Compte actif</p>
            <p className="text-[13px] text-muted">Un compte désactivé ne peut plus se connecter.</p>
          </div>
          <Switch checked={values.active} onChange={(v) => set("active", v)} label="Compte actif" />
        </div>
      )}
      <div className="flex justify-end gap-2.5 border-t border-line pt-4">
        <Button variant="line" size="sm" onClick={onClose} disabled={saving}>
          Annuler
        </Button>
        <Button type="submit" size="sm" loading={saving}>
          {user ? "Enregistrer" : "Créer l'utilisateur"}
        </Button>
      </div>
    </form>
  );
}

export function ResetPasswordModal({ user, onClose }: { user: User | null; onClose: () => void }) {
  return (
    <Modal open={user !== null} onClose={onClose} title="Réinitialiser le mot de passe" size="sm" description={user ? `${user.name} sera déconnecté(e) de toutes ses sessions.` : undefined}>
      {user && <ResetForm key={user.id} user={user} onClose={onClose} />}
    </Modal>
  );
}

function ResetForm({ user, onClose }: { user: User; onClose: () => void }) {
  const toast = useToast();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const problem = passwordProblem(password);
    setError(problem);
    if (problem) return;
    setSaving(true);
    try {
      await usersApi.resetPassword(user.id, password);
      toast.success("Mot de passe réinitialisé");
      onClose();
    } catch (err) {
      toast.fromError(err);
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <Field label="Nouveau mot de passe" htmlFor="r-password" error={error ?? undefined} help={PASSWORD_HINT}>
        <Input id="r-password" type="text" autoComplete="new-password" autoFocus value={password} invalid={Boolean(error)} className="font-mono" onChange={(e) => setPassword(e.target.value)} />
      </Field>
      <div className="flex justify-end gap-2.5">
        <Button variant="line" size="sm" onClick={onClose} disabled={saving}>
          Annuler
        </Button>
        <Button type="submit" size="sm" loading={saving}>
          Réinitialiser
        </Button>
      </div>
    </form>
  );
}
