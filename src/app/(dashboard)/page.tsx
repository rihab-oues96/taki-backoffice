"use client";

import Link from "next/link";
import { ArrowRight, EyeOff, FileText, Images, Inbox, Layers, PencilLine, Rows3, Users, type LucideIcon } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState, ErrorState, Skeleton, StatusBadges } from "@/components/ui/Feedback";
import { Card, Eyebrow, PageHeader } from "@/components/ui/Layout";
import { useAuth } from "@/features/auth/AuthProvider";
import { pagesApi } from "@/features/content/api";
import { useQuery } from "@/hooks/useQuery";
import { api } from "@/lib/api";
import { ACTION_LABELS, formatBytes, TARGET_LABELS, timeAgo } from "@/lib/format";
import type { Activity, DashboardData } from "@/lib/types";

function Stat({ icon: Icon, label, value, hint, href }: { icon: LucideIcon; label: string; value: number | string; hint?: string; href: string }) {
  return (
    <Link href={href} className="group block">
      <Card className="h-full p-5 transition group-hover:-translate-y-0.5 group-hover:border-brand group-hover:shadow-[0_18px_36px_-22px_rgba(11,51,70,.5)]">
        <div className="flex items-center justify-between">
          <span className="grid size-10 place-items-center rounded-full bg-sky text-brand-deep">
            <Icon size={18} aria-hidden />
          </span>
          <ArrowRight size={16} className="text-line-strong transition group-hover:translate-x-0.5 group-hover:text-brand" aria-hidden />
        </div>
        <p className="mt-4 text-[34px] font-semibold leading-none tracking-[-0.04em] text-navy">{value}</p>
        <p className="mt-1.5 text-sm font-semibold text-ink-soft">{label}</p>
        {hint && <p className="mt-0.5 text-[13px] text-muted">{hint}</p>}
      </Card>
    </Link>
  );
}

function activityHref(a: Activity): string | null {
  if (a.action === "delete") return null;
  if (a.targetType === "section") return a.action === "reorder" ? `/pages/${a.context}` : `/sections/${a.targetId}`;
  if (a.targetType === "entry") return a.action === "reorder" ? `/content/${a.context}` : `/content/${a.context}/${a.targetId}`;
  if (a.targetType === "contentType") return `/content/${a.targetId}`;
  if (a.targetType === "media") return "/media";
  if (a.targetType === "submission") return "/submissions";
  return "/users";
}

export default function DashboardPage() {
  const { user, can } = useAuth();
  const dashboard = useQuery((signal) => api.get<DashboardData>("/dashboard", undefined, signal), []);
  const pages = useQuery((signal) => pagesApi.list(signal), []);
  const d = dashboard.data;

  return (
    <>
      <PageHeader
        eyebrow="Tableau de bord"
        title={<>Bonjour {user.name.split(" ")[0]}, <em>bienvenue</em>.</>}
        description="Vue d'ensemble du contenu du site, des dernières modifications et accès rapide aux sections les plus utilisées."
        actions={
          <ButtonLink href="/pages" size="sm" icon={<PencilLine size={15} aria-hidden />}>
            Modifier le site
          </ButtonLink>
        }
      />

      {dashboard.loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" role="status" aria-label="Chargement">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-[150px]" />
          ))}
        </div>
      ) : dashboard.error || !d ? (
        <ErrorState message={dashboard.error ?? "Données indisponibles"} onRetry={dashboard.reload} />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Stat icon={FileText} label="Pages gérées" value={d.stats.pages} hint={`${d.stats.sections} sections`} href="/pages" />
            <Stat icon={Layers} label="Contenus" value={d.stats.entries} hint={`${d.contentTypes.length} types de contenu`} href="/content" />
            <Stat icon={Images} label="Médias" value={d.stats.media} hint={formatBytes(d.stats.mediaBytes)} href="/media" />
            {d.stats.users !== null ? (
              <Stat icon={Users} label="Utilisateurs actifs" value={d.stats.users} href="/users" />
            ) : (
              <Stat icon={Rows3} label="Sections" value={d.stats.sections} hint="sur l'ensemble des pages" href="/pages" />
            )}
          </div>

          {(d.stats.drafts > 0 || d.stats.hiddenSections + d.stats.hiddenEntries > 0 || (d.stats.pendingSubmissions ?? 0) > 0) && (
            <div className="mt-4 flex flex-wrap gap-3">
              {d.stats.pendingSubmissions !== null && d.stats.pendingSubmissions > 0 && (
                <Link href="/submissions" className="inline-flex items-center gap-2 rounded-full bg-brand/10 px-4 py-2 text-[13.5px] font-semibold text-brand-deep transition hover:bg-brand hover:text-white">
                  <Inbox size={15} aria-hidden />
                  {d.stats.pendingSubmissions} demande{d.stats.pendingSubmissions > 1 ? "s" : ""} reçue{d.stats.pendingSubmissions > 1 ? "s" : ""} en attente
                </Link>
              )}
              {d.stats.drafts > 0 && (
                <p className="inline-flex items-center gap-2 rounded-full bg-sun/20 px-4 py-2 text-[13.5px] font-semibold text-[#6b5200]">
                  <PencilLine size={15} aria-hidden />
                  {d.stats.drafts} brouillon{d.stats.drafts > 1 ? "s" : ""} en attente de publication
                </p>
              )}
              {d.stats.hiddenSections + d.stats.hiddenEntries > 0 && (
                <p className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-[13.5px] font-semibold text-ink-soft ring-1 ring-line">
                  <EyeOff size={15} aria-hidden />
                  {d.stats.hiddenSections} section{d.stats.hiddenSections > 1 ? "s" : ""} et {d.stats.hiddenEntries} contenu{d.stats.hiddenEntries > 1 ? "s" : ""} masqués
                </p>
              )}
            </div>
          )}

          <div className="mt-8 grid gap-6 xl:grid-cols-[1.25fr_1fr]">
            <div className="space-y-6">
              <Card className="p-6">
                <Eyebrow>Accès rapide</Eyebrow>
                <h2 className="mt-2 text-xl font-semibold tracking-[-0.025em] text-navy">Pages du site</h2>
                {pages.loading ? (
                  <Skeleton className="mt-4 h-24" />
                ) : (
                  <ul className="mt-4 flex flex-wrap gap-2">
                    {(pages.data ?? []).map((p) => (
                      <li key={p.key}>
                        <Link href={`/pages/${p.key}`} className="inline-flex h-10 items-center gap-2 rounded-full border-[1.5px] border-line-strong bg-white px-4 text-[13.5px] font-semibold text-navy transition hover:border-brand hover:bg-brand hover:text-white">
                          {p.label}
                          {p.drafts > 0 && <span className="size-2 rounded-full bg-sun" aria-label="brouillons en attente" />}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
                <h2 className="mt-7 text-xl font-semibold tracking-[-0.025em] text-navy">Contenus</h2>
                <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                  {d.contentTypes.map((t) => (
                    <li key={t.key}>
                      <Link href={`/content/${t.key}`} className="flex items-center justify-between gap-3 rounded-xl border border-line px-4 py-3 text-[14.5px] font-semibold text-navy transition hover:border-brand hover:bg-sky">
                        {t.label}
                        <span className="rounded-full bg-mist px-2.5 py-0.5 text-xs font-bold text-muted">{t.total}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </Card>

              <Card className="p-6">
                <Eyebrow>Dernières mises à jour</Eyebrow>
                <h2 className="mt-2 text-xl font-semibold tracking-[-0.025em] text-navy">Contenus modifiés récemment</h2>
                {d.recent.length === 0 ? (
                  <p className="mt-4 text-[15px] text-muted">Aucune modification pour le moment.</p>
                ) : (
                  <ul className="mt-3 divide-y divide-line">
                    {d.recent.map((r) => (
                      <li key={`${r.kind}-${r.id}`}>
                        <Link href={r.kind === "section" ? `/sections/${r.id}` : `/content/${r.context}/${r.id}`} className="group flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-3">
                          <span className="min-w-0">
                            <span className="block truncate font-semibold text-navy group-hover:text-brand-deep">{r.label || "Sans titre"}</span>
                            <span className="block text-[13px] text-muted">
                              {r.kind === "section" ? "Section" : "Contenu"} · {r.context} · {timeAgo(r.updatedAt)}
                              {r.updatedByName && ` · ${r.updatedByName}`}
                            </span>
                          </span>
                          <StatusBadges visible={r.visible} hasDraft={r.hasDraft} />
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>

            {can("activity:read") && (
              <Card className="self-start p-6">
                <Eyebrow>Activité</Eyebrow>
                <h2 className="mt-2 text-xl font-semibold tracking-[-0.025em] text-navy">Journal de l’équipe</h2>
                {d.activity.length === 0 ? (
                  <div className="mt-4">
                    <EmptyState title="Aucune activité" text="Les modifications de l'équipe apparaîtront ici." />
                  </div>
                ) : (
                  <ol className="mt-4 space-y-4">
                    {d.activity.map((a) => {
                      const href = activityHref(a);
                      return (
                        <li key={a.id} className="flex gap-3">
                          <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-sky text-xs font-bold text-brand-deep" aria-hidden>
                            {a.userName.slice(0, 1).toUpperCase()}
                          </span>
                          <p className="min-w-0 text-[14px] leading-snug text-ink-soft">
                            <strong className="font-semibold text-navy">{a.userName}</strong> {ACTION_LABELS[a.action]} {TARGET_LABELS[a.targetType]}{" "}
                            {href ? (
                              <Link href={href} className="font-semibold text-brand-deep hover:underline">
                                {a.label}
                              </Link>
                            ) : (
                              <span className="font-semibold text-navy">{a.label}</span>
                            )}
                            <span className="block text-[12.5px] text-muted">{timeAgo(a.createdAt)}</span>
                          </p>
                        </li>
                      );
                    })}
                  </ol>
                )}
              </Card>
            )}
          </div>
        </>
      )}
    </>
  );
}
