"use client";

import { Eye, EyeOff, LogIn } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Form";
import { api, errorMessage } from "@/lib/api";
import { isEmail, type Errors } from "@/lib/validation";

interface Values {
  email: string;
  password: string;
}

/** Only same-app paths are accepted as a post-login destination. */
function safeNext(next: string | null): string {
  return next && /^\/(?!\/)/.test(next) && !next.startsWith("/login") ? next : "/";
}

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  // Optional local convenience: prefilled from .env.local, empty when the variables are not set.
  const [values, setValues] = useState<Values>({
    email: process.env.NEXT_PUBLIC_LOGIN_EMAIL ?? "",
    password: process.env.NEXT_PUBLIC_LOGIN_PASSWORD ?? "",
  });
  const [errors, setErrors] = useState<Errors<Values>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const next: Errors<Values> = {};
    if (!isEmail(values.email)) next.email = "Saisissez une adresse e-mail valide";
    if (!values.password) next.password = "Saisissez votre mot de passe";
    setErrors(next);
    setFormError(null);
    if (next.email || next.password) return;

    setLoading(true);
    try {
      await api.post("/auth/login", { email: values.email.trim(), password: values.password });
      router.replace(safeNext(params.get("next")));
      router.refresh();
    } catch (err) {
      setFormError(errorMessage(err));
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      {formError && (
        <p role="alert" className="rounded-xl border border-danger/25 bg-danger/5 px-4 py-3 text-sm font-semibold text-danger">
          {formError}
        </p>
      )}
      <Field label="Adresse e-mail" htmlFor="email" error={errors.email}>
        <Input
          id="email"
          type="email"
          autoComplete="username"
          autoFocus
          value={values.email}
          invalid={Boolean(errors.email)}
          onChange={(e) => setValues((v) => ({ ...v, email: e.target.value }))}
          placeholder="prenom.nom@ibtakiacademyschool.com"
        />
      </Field>
      <Field label="Mot de passe" htmlFor="password" error={errors.password}>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            value={values.password}
            invalid={Boolean(errors.password)}
            onChange={(e) => setValues((v) => ({ ...v, password: e.target.value }))}
            className="pr-12"
          />
          <button
            type="button"
            onClick={() => setShowPassword((s) => !s)}
            aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
            className="absolute right-1.5 top-1.5 grid size-8 place-items-center rounded-full text-muted hover:bg-mist hover:text-navy"
          >
            {showPassword ? <EyeOff size={17} aria-hidden /> : <Eye size={17} aria-hidden />}
          </button>
        </div>
      </Field>
      <Button type="submit" loading={loading} icon={<LogIn size={16} aria-hidden />} className="w-full">
        Se connecter
      </Button>
    </form>
  );
}
