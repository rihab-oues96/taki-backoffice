"use client";

import Link from "next/link";
import { ArrowDownRight, ArrowRight, ArrowUpRight, CheckCircle2, Clock, Eye, FileText, Images, Inbox, Layers, PencilLine, Percent, RefreshCw, Timer, type LucideIcon } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Badge, ErrorState, Skeleton, StatusBadges } from "@/components/ui/Feedback";
import { Card } from "@/components/ui/Layout";
import { useAuth } from "@/features/auth/AuthProvider";
import { Bar, ColumnChart, formatNumber, SegmentBar, Sparkline, type Column } from "@/features/dashboard/charts";
import { STATUS_LABELS, STATUS_TONES, SUBMISSION_STATUSES, SUBMISSION_TYPES, TYPE_LABELS, TYPE_PLURALS, TYPE_TONES } from "@/features/submissions/api";
import { useQuery } from "@/hooks/useQuery";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import { ACTION_LABELS, formatBytes, TARGET_LABELS, timeAgo } from "@/lib/format";
import type { Activity, ActivityAction, DashboardData, MediaKind, SubmissionStats, SubmissionStatus, SubmissionType } from "@/lib/types";

/* Chart colours, checked for colour-blind separation on white. Text never wears them: a mark beside the label does. */
const TYPE_COLORS: Record<SubmissionType, string> = { contact: "#2f55b5", admission: "#b97ae0", job: "#0f9a8a" };
const STATUS_COLORS: Record<SubmissionStatus, string> = { pending: "#c48a00", reviewed: "#2b93c7", handled: "#1a7f52" };
const BRAND = "#1c7fb0";
const NEUTRAL = "#9fb0bb";

const ACTION_NOUNS: Record<ActivityAction, string> = {
  create: "Créations",
  update: "Modifications",
  publish: "Publications",
  delete: "Suppressions",
  show: "Affichages",
  hide: "Masquages",
  upload: "Imports",
  reorder: "Réorganisations",
};
const MEDIA_NOUNS: Record<MediaKind, [one: string, many: string]> = { image: ["image", "images"], video: ["vidéo", "vidéos"], document: ["document", "documents"] };

const RANGES = [
  { key: "7", label: "7 j", days: 7, text: "7 jours" },
  { key: "30", label: "30 j", days: 30, text: "30 jours" },
  { key: "84", label: "12 sem.", days: 84, text: "12 semaines" },
] as const;
type RangeKey = (typeof RANGES)[number]["key"];

const plural = (n: number, one: string, many = `${one}s`) => `${formatNumber(n)} ${n > 1 ? many : one}`;
const percent = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);

function duration(hours: number | null): string {
  if (hours === null) return "—";
  if (hours < 1) return "< 1 h";
  if (hours < 48) return `${Math.round(hours)} h`;
  return `${(hours / 24).toFixed(1).replace(".", ",")} j`;
}

/* Days come as `YYYY-MM-DD`; noon keeps them on the same day whatever the browser's timezone. */
const asDate = (day: string) => new Date(`${day}T12:00:00`);
const shortDay = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" });
const longDay = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" });

function Panel({ title, hint, action, children, className }: { title: string; hint?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <Card className={cn("min-w-0 p-4 sm:p-5", className)}>
      <div className="mb-3.5 flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <h2 className="text-[15.5px] font-semibold tracking-[-0.015em] text-navy">{title}</h2>
          {hint && <p className="mt-0.5 text-[12.5px] leading-snug text-muted">{hint}</p>}
        </div>
        {action}
      </div>
      {children}
    </Card>
  );
}

function MoreLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="inline-flex shrink-0 items-center gap-1 text-[12.5px] font-semibold text-brand-deep hover:underline">
      {children}
      <ArrowRight size={13} aria-hidden />
    </Link>
  );
}

function Kpi({ icon: Icon, label, value, hint, href, children }: { icon: LucideIcon; label: string; value: ReactNode; hint?: ReactNode; href: string; children?: ReactNode }) {
  return (
    <Link href={href} className="group block">
      <Card className="flex h-full flex-col p-4 transition group-hover:border-brand group-hover:shadow-[0_14px_28px_-22px_rgba(11,51,70,.55)]">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[12.5px] font-semibold text-muted">{label}</p>
          <Icon size={16} className="shrink-0 text-line-strong transition group-hover:text-brand" aria-hidden />
        </div>
        <p className="mt-1.5 text-[28px] font-semibold leading-none tracking-[-0.035em] text-navy tabular-nums">{value}</p>
        {hint && <p className="mt-1.5 text-[12.5px] leading-snug text-muted">{hint}</p>}
        {children && <div className="mt-auto pt-2.5">{children}</div>}
      </Card>
    </Link>
  );
}

function Swatch({ color }: { color: string }) {
  return <span className="size-2.5 shrink-0 rounded-[3px]" style={{ background: color }} aria-hidden />;
}

/** Change against the period before; neutral colours, because more forms is neither good nor bad in itself. */
function Delta({ current, previous }: { current: number; previous: number }) {
  if (previous === 0) return null;
  const change = Math.round(((current - previous) / previous) * 100);
  const Icon = change >= 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <span className="inline-flex items-center gap-0.5 rounded-full bg-mist px-1.5 py-0.5 text-[11.5px] font-bold text-ink-soft">
      <Icon size={12} aria-hidden />
      {change > 0 ? "+" : ""}
      {change} %
    </span>
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

/* ------------------------------------------------------------------ */
/* Forms                                                               */
/* ------------------------------------------------------------------ */

function byStatus(s: SubmissionStats): Record<SubmissionStatus, number> {
  return Object.fromEntries(SUBMISSION_STATUSES.map((st) => [st, SUBMISSION_TYPES.reduce((n, t) => n + s.counts[t][st], 0)])) as Record<SubmissionStatus, number>;
}

const dayTotal = (d: SubmissionStats["days"][number]) => SUBMISSION_TYPES.reduce((n, t) => n + d[t], 0);

function FormKpis({ s }: { s: SubmissionStats }) {
  const status = byStatus(s);
  const total = status.pending + status.reviewed + status.handled;
  const last30 = s.days.slice(-30);
  const received30 = last30.reduce((n, d) => n + dayTotal(d), 0);
  const before30 = s.days.slice(-60, -30).reduce((n, d) => n + dayTotal(d), 0);

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 2xl:grid-cols-6">
      <Kpi
        icon={Inbox}
        label="Demandes reçues"
        value={formatNumber(total)}
        href="/submissions"
        hint={
          <span className="inline-flex flex-wrap items-center gap-1.5">
            {formatNumber(received30)} sur 30 jours <Delta current={received30} previous={before30} />
          </span>
        }
      >
        <Sparkline values={last30.map(dayTotal)} color={BRAND} />
      </Kpi>
      <Kpi
        icon={Clock}
        label="En attente"
        value={formatNumber(status.pending)}
        href="/submissions"
        hint={s.oldestPendingAt ? `La plus ancienne : ${timeAgo(s.oldestPendingAt)}` : "Aucune demande à ouvrir"}
      >
        <Bar value={status.pending} max={total} color={STATUS_COLORS.pending} />
      </Kpi>
      <Kpi icon={Eye} label="Consultées" value={formatNumber(status.reviewed)} href="/submissions" hint="Ouvertes, à finaliser">
        <Bar value={status.reviewed} max={total} color={STATUS_COLORS.reviewed} />
      </Kpi>
      <Kpi icon={CheckCircle2} label="Traitées" value={formatNumber(status.handled)} href="/submissions" hint="Réponse apportée">
        <Bar value={status.handled} max={total} color={STATUS_COLORS.handled} />
      </Kpi>
      <Kpi
        icon={Percent}
        label="Taux de traitement"
        value={`${percent(status.handled, total)} %`}
        href="/submissions"
        hint={`${percent(status.reviewed + status.handled, total)} % prises en charge`}
      >
        <SegmentBar parts={SUBMISSION_STATUSES.map((st) => ({ label: STATUS_LABELS[st], value: status[st], color: STATUS_COLORS[st] }))} />
      </Kpi>
      <Kpi
        icon={Timer}
        label="Délai moyen de traitement"
        value={duration(s.handling.hours)}
        href="/submissions"
        hint={s.handling.sample > 0 ? `De la réception à « Traitée », sur ${plural(s.handling.sample, "demande")}` : "Aucune demande traitée pour l'instant"}
      />
    </div>
  );
}

function TrendPanel({ s }: { s: SubmissionStats }) {
  const [rangeKey, setRangeKey] = useState<RangeKey>("30");
  const range = RANGES.find((r) => r.key === rangeKey) ?? RANGES[1];
  const days = s.days.slice(-range.days);
  const received = days.reduce((n, d) => n + dayTotal(d), 0);
  const before = s.days.slice(-2 * range.days, -range.days).reduce((n, d) => n + dayTotal(d), 0);

  // Twelve weeks are shown week by week: 84 daily columns would be too thin to read.
  const size = range.days > 30 ? 7 : 1;
  const columns: Column[] = [];
  for (let i = 0; i < days.length; i += size) {
    const chunk = days.slice(i, i + size);
    const first = asDate(chunk[0].date);
    const last = asDate(chunk[chunk.length - 1].date);
    columns.push({
      key: chunk[0].date,
      label: shortDay.format(first),
      title: size === 1 ? longDay.format(first) : `Du ${shortDay.format(first)} au ${shortDay.format(last)}`,
      values: SUBMISSION_TYPES.map((t) => chunk.reduce((n, d) => n + d[t], 0)),
    });
  }

  return (
    <Panel
      title="Demandes reçues dans le temps"
      className="xl:col-span-2"
      hint={
        <span className="inline-flex flex-wrap items-center gap-1.5">
          {plural(received, "demande")} sur {range.text}, contre {formatNumber(before)} sur la période précédente <Delta current={received} previous={before} />
        </span>
      }
      action={
        <div role="group" aria-label="Période" className="inline-flex rounded-full bg-mist p-0.5">
          {RANGES.map((r) => (
            <button
              key={r.key}
              type="button"
              aria-pressed={r.key === rangeKey}
              onClick={() => setRangeKey(r.key)}
              className={cn("rounded-full px-3 py-1 text-[12.5px] font-semibold transition", r.key === rangeKey ? "bg-white text-navy shadow-sm" : "text-muted hover:text-navy")}
            >
              {r.label}
            </button>
          ))}
        </div>
      }
    >
      <ul className="mb-3 flex flex-wrap gap-x-5 gap-y-1 text-[12.5px] text-ink-soft">
        {SUBMISSION_TYPES.map((t) => (
          <li key={t} className="inline-flex items-center gap-1.5">
            <Swatch color={TYPE_COLORS[t]} />
            {TYPE_PLURALS[t]}
            <strong className="font-semibold text-navy tabular-nums">{formatNumber(days.reduce((n, d) => n + d[t], 0))}</strong>
          </li>
        ))}
      </ul>
      <ColumnChart
        label={`Demandes reçues par ${size === 1 ? "jour" : "semaine"} et par formulaire sur ${range.text}`}
        columns={columns}
        series={SUBMISSION_TYPES.map((t) => ({ label: TYPE_PLURALS[t], color: TYPE_COLORS[t] }))}
        height={286}
      />
    </Panel>
  );
}

function ByFormPanel({ s }: { s: SubmissionStats }) {
  const last30 = s.days.slice(-30);
  return (
    <Panel title="Par formulaire" hint="Volume, suivi et délai de chaque formulaire du site" action={<MoreLink href="/submissions">Ouvrir</MoreLink>}>
      <ul className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-ink-soft">
        {SUBMISSION_STATUSES.map((st) => (
          <li key={st} className="inline-flex items-center gap-1.5">
            <Swatch color={STATUS_COLORS[st]} />
            {STATUS_LABELS[st]}
          </li>
        ))}
      </ul>
      <ul className="divide-y divide-line">
        {SUBMISSION_TYPES.map((t) => {
          const c = s.counts[t];
          const total = c.pending + c.reviewed + c.handled;
          return (
            <li key={t} className="py-3 first:pt-0 last:pb-0">
              <div className="flex items-baseline justify-between gap-3">
                <p className="inline-flex items-center gap-2 text-[14px] font-semibold text-navy">
                  <Swatch color={TYPE_COLORS[t]} />
                  {TYPE_PLURALS[t]}
                </p>
                <p className="text-[18px] font-semibold leading-none tracking-[-0.02em] text-navy tabular-nums">{formatNumber(total)}</p>
              </div>
              <SegmentBar className="mt-2" parts={SUBMISSION_STATUSES.map((st) => ({ label: STATUS_LABELS[st], value: c[st], color: STATUS_COLORS[st] }))} />
              <dl className="mt-2 grid grid-cols-4 gap-2 text-[12px] text-muted">
                {(
                  [
                    ["En attente", formatNumber(c.pending)],
                    ["Traitées", `${percent(c.handled, total)} %`],
                    ["Délai moyen", duration(s.handling.byType[t])],
                    ["30 jours", formatNumber(last30.reduce((n, d) => n + d[t], 0))],
                  ] as const
                ).map(([label, value]) => (
                  <div key={label}>
                    <dt className="truncate">{label}</dt>
                    <dd className="text-[13.5px] font-semibold text-navy tabular-nums">{value}</dd>
                  </div>
                ))}
              </dl>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

function LatestSubmissions({ s }: { s: SubmissionStats }) {
  return (
    <Panel title="Dernières demandes" action={<MoreLink href="/submissions">Tout voir</MoreLink>}>
      {s.latest.length === 0 ? (
        <p className="text-[13.5px] text-muted">Aucune demande reçue pour le moment.</p>
      ) : (
        <ul className="-my-1 divide-y divide-line">
          {s.latest.map((item) => (
            <li key={item.id}>
              <Link href="/submissions" className="group flex items-center justify-between gap-3 py-2">
                <span className="min-w-0">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-[13.5px] font-semibold text-navy group-hover:text-brand-deep">{item.name}</span>
                    <Badge tone={TYPE_TONES[item.type]}>{TYPE_LABELS[item.type]}</Badge>
                  </span>
                  <span className="block truncate text-[12.5px] text-muted">
                    {timeAgo(item.createdAt)}
                    {item.subject && ` · ${item.subject}`}
                  </span>
                </span>
                <Badge tone={STATUS_TONES[item.status]} dot>
                  {STATUS_LABELS[item.status]}
                </Badge>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

/* ------------------------------------------------------------------ */
/* Site content                                                        */
/* ------------------------------------------------------------------ */

function ContentPanel({ d }: { d: DashboardData }) {
  const { stats } = d;
  const items = stats.sections + stats.entries;
  const hidden = stats.hiddenSections + stats.hiddenEntries;
  const largest = Math.max(1, ...d.contentTypes.map((t) => t.total));
  const figures: [label: string, value: string, href: string][] = [
    ["Pages", formatNumber(stats.pages), "/pages"],
    ["Sections", formatNumber(stats.sections), "/pages"],
    ["Contenus", formatNumber(stats.entries), "/content"],
    ["Médias", formatNumber(stats.media), "/media"],
  ];
  if (stats.users !== null) figures.push(["Utilisateurs", formatNumber(stats.users), "/users"]);

  return (
    <Panel title="Contenu du site" hint="Ce qui est en ligne, masqué ou en attente de publication" action={<MoreLink href="/pages">Pages</MoreLink>}>
      <ul className={cn("grid gap-2", figures.length > 4 ? "grid-cols-5" : "grid-cols-4")}>
        {figures.map(([label, value, href]) => (
          <li key={label}>
            <Link href={href} className="block rounded-xl bg-mist px-2 py-2 text-center transition hover:bg-sky hover:ring-1 hover:ring-brand">
              <span className="block text-[19px] font-semibold leading-tight tracking-[-0.02em] text-navy tabular-nums">{value}</span>
              <span className="block truncate text-[11.5px] text-muted">{label}</span>
            </Link>
          </li>
        ))}
      </ul>

      <h3 className="mb-1.5 mt-4 text-[12.5px] font-semibold text-muted">Publication · {plural(items, "élément")}</h3>
      <SegmentBar
        parts={[
          { label: "En ligne", value: items - hidden, color: STATUS_COLORS.handled },
          { label: "Masqués", value: hidden, color: NEUTRAL },
        ]}
      />
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-ink-soft">
        <li className="inline-flex items-center gap-1.5">
          <Swatch color={STATUS_COLORS.handled} />
          En ligne <strong className="font-semibold text-navy tabular-nums">{formatNumber(items - hidden)}</strong>
        </li>
        <li className="inline-flex items-center gap-1.5">
          <Swatch color={NEUTRAL} />
          Masqués <strong className="font-semibold text-navy tabular-nums">{formatNumber(hidden)}</strong>
        </li>
        <li className="inline-flex items-center gap-1.5">
          <PencilLine size={12} className="text-muted" aria-hidden />
          Brouillons en attente <strong className="font-semibold text-navy tabular-nums">{formatNumber(stats.drafts)}</strong>
        </li>
      </ul>

      <h3 className="mb-1 mt-4 text-[12.5px] font-semibold text-muted">Contenus par type</h3>
      <ul>
        {d.contentTypes.map((t) => (
          <li key={t.key}>
            <Link href={`/content/${t.key}`} className="group grid grid-cols-[minmax(0,42%)_1fr_auto] items-center gap-3 py-1 text-[13px]">
              <span className="truncate text-ink-soft group-hover:text-brand-deep">{t.label}</span>
              <Bar value={t.total} max={largest} color={BRAND} />
              <span className="min-w-[2ch] text-right font-semibold text-navy tabular-nums">{formatNumber(t.total)}</span>
            </Link>
          </li>
        ))}
      </ul>

      <p className="mt-3 flex items-start gap-2 border-t border-line pt-3 text-[12.5px] text-muted">
        <Images size={14} className="mt-0.5 shrink-0" aria-hidden />
        <span>
          {d.mediaKinds.length > 0 ? d.mediaKinds.map((m) => plural(m.count, ...MEDIA_NOUNS[m.kind])).join(" · ") : "Aucun média"} · {formatBytes(stats.mediaBytes)} dans la bibliothèque
        </span>
      </p>
    </Panel>
  );
}

function RecentPanel({ d }: { d: DashboardData }) {
  return (
    <Panel title="Contenus modifiés récemment">
      {d.recent.length === 0 ? (
        <p className="text-[13.5px] text-muted">Aucune modification pour le moment.</p>
      ) : (
        <ul className="-my-1 divide-y divide-line">
          {d.recent.slice(0, 6).map((r) => (
            <li key={`${r.kind}-${r.id}`}>
              <Link href={r.kind === "section" ? `/sections/${r.id}` : `/content/${r.context}/${r.id}`} className="group flex items-center justify-between gap-3 py-2">
                <span className="min-w-0">
                  <span className="block truncate text-[13.5px] font-semibold text-navy group-hover:text-brand-deep">{r.label || "Sans titre"}</span>
                  <span className="block truncate text-[12.5px] text-muted">
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
    </Panel>
  );
}

/* ------------------------------------------------------------------ */
/* Team activity                                                       */
/* ------------------------------------------------------------------ */

function ActivityPanel({ d }: { d: DashboardData }) {
  const a = d.activityStats;
  const busiest = Math.max(1, ...(a?.byUser ?? []).map((u) => u.total));
  return (
    <Panel
      title="Activité de l'équipe"
      hint={a ? `${plural(a.total, "action")} sur 30 jours · ${plural(a.byUser.length, "contributeur")}${a.byUser.length === 5 ? " ou plus" : ""}` : undefined}
    >
      {a && a.total > 0 && (
        <>
          <ColumnChart
            label="Actions de l'équipe par jour sur 30 jours"
            columns={a.days.map((day) => ({ key: day.date, label: shortDay.format(asDate(day.date)), title: longDay.format(asDate(day.date)), values: [day.total] }))}
            series={[{ label: "Actions", color: BRAND }]}
            height={104}
          />
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {a.byAction.map((row) => (
              <li key={row.action} className="rounded-full bg-mist px-2.5 py-1 text-[12px] text-ink-soft">
                {ACTION_NOUNS[row.action] ?? row.action} <strong className="font-semibold text-navy tabular-nums">{formatNumber(row.total)}</strong>
              </li>
            ))}
          </ul>
          <ul className="mt-3">
            {a.byUser.map((u) => (
              <li key={u.userName} className="grid grid-cols-[minmax(0,42%)_1fr_auto] items-center gap-3 py-1 text-[13px]">
                <span className="truncate text-ink-soft">{u.userName}</span>
                <Bar value={u.total} max={busiest} color={BRAND} />
                <span className="min-w-[2ch] text-right font-semibold text-navy tabular-nums">{formatNumber(u.total)}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      <h3 className={cn("mb-2 text-[12.5px] font-semibold text-muted", a && a.total > 0 && "mt-4 border-t border-line pt-3")}>Journal</h3>
      {d.activity.length === 0 ? (
        <p className="text-[13.5px] text-muted">Les modifications de l&apos;équipe apparaîtront ici.</p>
      ) : (
        <ol className="space-y-2.5">
          {d.activity.map((entry) => {
            const href = activityHref(entry);
            return (
              <li key={entry.id} className="flex gap-2.5">
                <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-sky text-[11px] font-bold text-brand-deep ring-1 ring-line" aria-hidden>
                  {entry.userName.slice(0, 1).toUpperCase()}
                </span>
                <p className="min-w-0 text-[13px] leading-snug text-ink-soft">
                  <strong className="font-semibold text-navy">{entry.userName}</strong> {ACTION_LABELS[entry.action]} {TARGET_LABELS[entry.targetType]}{" "}
                  {href ? (
                    <Link href={href} className="font-semibold text-brand-deep hover:underline">
                      {entry.label}
                    </Link>
                  ) : (
                    <span className="font-semibold text-navy">{entry.label}</span>
                  )}
                  <span className="text-muted"> · {timeAgo(entry.createdAt)}</span>
                </p>
              </li>
            );
          })}
        </ol>
      )}
    </Panel>
  );
}

/* ------------------------------------------------------------------ */

export default function DashboardPage() {
  const { user, can } = useAuth();
  const dashboard = useQuery((signal) => api.get<DashboardData>("/dashboard", undefined, signal), []);
  const d = dashboard.data;
  const showActivity = can("activity:read");

  return (
    <>
      <header className="mb-4 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <h1 className="text-[clamp(22px,2vw,28px)] font-semibold leading-tight tracking-[-0.03em] text-navy">
            Bonjour {user.name.split(" ")[0]}, <span className="text-brand">bienvenue</span>.
          </h1>
          <p className="mt-0.5 text-[13.5px] text-muted">Formulaires, contenu du site et activité de l&apos;équipe, en un coup d&apos;œil.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="line" size="sm" loading={dashboard.refreshing} onClick={() => void dashboard.reload()} icon={<RefreshCw size={14} aria-hidden />}>
            Actualiser
          </Button>
          <ButtonLink href="/pages" size="sm" icon={<PencilLine size={15} aria-hidden />}>
            Modifier le site
          </ButtonLink>
        </div>
      </header>

      {dashboard.loading ? (
        <div className="space-y-3" role="status" aria-label="Chargement">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 2xl:grid-cols-6">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-[126px]" />
            ))}
          </div>
          <div className="grid gap-3 xl:grid-cols-3">
            <Skeleton className="h-[330px] xl:col-span-2" />
            <Skeleton className="h-[330px]" />
          </div>
        </div>
      ) : dashboard.error || !d ? (
        <ErrorState message={dashboard.error ?? "Données indisponibles"} onRetry={dashboard.reload} />
      ) : (
        <div className="space-y-3">
          {d.submissions ? (
            <>
              <FormKpis s={d.submissions} />
              <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
                <TrendPanel s={d.submissions} />
                <ByFormPanel s={d.submissions} />
              </div>
            </>
          ) : (
            <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
              <Kpi icon={FileText} label="Pages gérées" value={formatNumber(d.stats.pages)} hint={plural(d.stats.sections, "section")} href="/pages" />
              <Kpi icon={Layers} label="Contenus" value={formatNumber(d.stats.entries)} hint={`${plural(d.contentTypes.length, "type")} de contenu`} href="/content" />
              <Kpi icon={Images} label="Médias" value={formatNumber(d.stats.media)} hint={formatBytes(d.stats.mediaBytes)} href="/media" />
              <Kpi icon={PencilLine} label="Brouillons en attente" value={formatNumber(d.stats.drafts)} hint="À publier pour être visibles sur le site" href="/pages" />
            </div>
          )}

          <div className={cn("grid grid-cols-1 items-start gap-3", showActivity ? "xl:grid-cols-3" : "xl:grid-cols-2")}>
            <ContentPanel d={d} />
            <div className="min-w-0 space-y-3">
              {d.submissions && <LatestSubmissions s={d.submissions} />}
              <RecentPanel d={d} />
            </div>
            {showActivity && <ActivityPanel d={d} />}
          </div>
        </div>
      )}
    </>
  );
}
