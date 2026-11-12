import type { Metadata } from "next";
import Image from "next/image";
import { Suspense } from "react";
import { Eyebrow } from "@/components/ui/Layout";
import { LoginForm } from "@/features/auth/LoginForm";

export const metadata: Metadata = { title: "Connexion" };

export default function LoginPage() {
  return (
    <main className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      {/* Brand panel: the website's dark hero language */}
      <section className="relative isolate hidden overflow-hidden bg-navy-900 p-14 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute -right-40 -top-40 size-[520px] rounded-full bg-brand/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-52 -left-32 size-[460px] rounded-full bg-brand-light/10 blur-3xl" />
        <Image src="/brand/logo.png" alt="Taki Academy International School" width={180} height={72} priority className="relative h-16 w-auto self-start" />
        <div className="relative max-w-lg">
          <Eyebrow light>Backoffice</Eyebrow>
          <h1 className="mt-4 text-[clamp(34px,3.6vw,52px)] font-semibold leading-[1.06] tracking-[-0.035em]">
            Le contenu du site, <em className="not-italic text-brand-light">entre vos mains</em>.
          </h1>
          <p className="mt-5 text-[17px] leading-[1.6] text-white/75">
            Mettez à jour les pages, les actualités et les médias de Taki Academy International School, sans toucher au code.
          </p>
        </div>
        <p className="relative text-sm text-white/50">Accès réservé aux équipes Administration et Marketing.</p>
      </section>

      <section className="flex items-center justify-center bg-white px-6 py-14">
        <div className="w-full max-w-[400px]">
          <Image src="/brand/logo-light.svg" alt="Taki Academy International School" width={180} height={72} priority unoptimized className="mb-10 h-14 w-auto lg:hidden" />
          <Eyebrow>Espace sécurisé</Eyebrow>
          <h2 className="mt-3 text-[32px] font-semibold leading-[1.1] tracking-[-0.035em] text-navy">Connexion</h2>
          <p className="mt-2 mb-8 text-[15.5px] text-muted">Identifiez-vous pour gérer le contenu du site.</p>
          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>
        </div>
      </section>
    </main>
  );
}
