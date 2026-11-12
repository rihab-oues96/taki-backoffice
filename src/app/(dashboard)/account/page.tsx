"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Feedback";
import { Field, Input } from "@/components/ui/Form";
import { Card, PageHeader } from "@/components/ui/Layout";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/features/auth/AuthProvider";
import { accountApi } from "@/features/users/api";
import { ROLE_DESCRIPTIONS, ROLE_LABELS } from "@/lib/format";
import { PASSWORD_HINT, passwordProblem } from "@/lib/validation";

export default function AccountPage() {
  const toast = useToast();
  const { user, refresh } = useAuth();
  const [name, setName] = useState(user.name);
  const [savingName, setSavingName] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<{ current?: string; next?: string; confirm?: string }>({});
  const [savingPassword, setSavingPassword] = useState(false);

  async function saveName(event: FormEvent) {
    event.preventDefault();
    if (name.trim().length < 2) return;
    setSavingName(true);
    try {
      await accountApi.updateProfile(name.trim());
      await refresh();
      toast.success("Profil mis à jour");
    } catch (err) {
      toast.fromError(err);
    } finally {
      setSavingName(false);
    }
  }

  async function savePassword(event: FormEvent) {
    event.preventDefault();
    const found = {
      current: current ? undefined : "Saisissez votre mot de passe actuel",
      next: passwordProblem(next) ?? undefined,
      confirm: confirm === next ? undefined : "Les deux mots de passe ne correspondent pas",
    };
    setErrors(found);
    if (found.current || found.next || found.confirm) return;
    setSavingPassword(true);
    try {
      await accountApi.changePassword(current, next);
      setCurrent("");
      setNext("");
      setConfirm("");
      toast.success("Mot de passe modifié. Vos autres sessions ont été déconnectées.");
    } catch (err) {
      toast.fromError(err);
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <>
      <PageHeader eyebrow="Mon compte" title={<>Profil et <em>sécurité</em></>} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h2 className="text-lg font-semibold tracking-[-0.02em] text-navy">Profil</h2>
          <form onSubmit={saveName} className="mt-5 space-y-5">
            <Field label="Nom complet" htmlFor="a-name">
              <Input id="a-name" value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field label="Adresse e-mail" htmlFor="a-email" help="Seul un administrateur peut la modifier.">
              <Input id="a-email" value={user.email} disabled readOnly />
            </Field>
            <div>
              <p className="mb-1.5 text-[13.5px] font-semibold text-navy">Rôle</p>
              <Badge tone="brand">{ROLE_LABELS[user.role]}</Badge>
              <p className="mt-2 text-[13px] leading-snug text-muted">{ROLE_DESCRIPTIONS[user.role]}</p>
            </div>
            <Button type="submit" size="sm" loading={savingName} disabled={name.trim() === user.name || name.trim().length < 2}>
              Enregistrer
            </Button>
          </form>
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-semibold tracking-[-0.02em] text-navy">Mot de passe</h2>
          <form onSubmit={savePassword} noValidate className="mt-5 space-y-5">
            <Field label="Mot de passe actuel" htmlFor="a-current" error={errors.current}>
              <Input id="a-current" type="password" autoComplete="current-password" value={current} invalid={Boolean(errors.current)} onChange={(e) => setCurrent(e.target.value)} />
            </Field>
            <Field label="Nouveau mot de passe" htmlFor="a-next" error={errors.next} help={PASSWORD_HINT}>
              <Input id="a-next" type="password" autoComplete="new-password" value={next} invalid={Boolean(errors.next)} onChange={(e) => setNext(e.target.value)} />
            </Field>
            <Field label="Confirmer le nouveau mot de passe" htmlFor="a-confirm" error={errors.confirm}>
              <Input id="a-confirm" type="password" autoComplete="new-password" value={confirm} invalid={Boolean(errors.confirm)} onChange={(e) => setConfirm(e.target.value)} />
            </Field>
            <Button type="submit" size="sm" loading={savingPassword}>
              Changer le mot de passe
            </Button>
          </form>
        </Card>
      </div>
    </>
  );
}
