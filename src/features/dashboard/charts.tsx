"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";

export interface Series {
  label: string;
  color: string;
}

export interface Column {
  key: string;
  /** Short text under the axis. */
  label: string;
  /** Heading of the tooltip. */
  title: string;
  /** One value per series, in the order of `series`. */
  values: number[];
}

const sum = (values: number[]) => values.reduce((n, v) => n + v, 0);
export const formatNumber = (n: number) => n.toLocaleString("fr-FR");

/** A round maximum and about four ticks, whole numbers only (these charts count things). */
function scale(highest: number): { max: number; ticks: number[] } {
  const rough = Math.max(highest, 1) / 4;
  const pow = 10 ** Math.floor(Math.log10(rough));
  const step = Math.max(1, [1, 2, 5, 10].map((m) => m * pow).find((s) => s >= rough) ?? 10 * pow);
  const max = Math.max(Math.ceil(highest / step), 2) * step;
  return { max, ticks: Array.from({ length: Math.round(max / step) + 1 }, (_, i) => i * step) };
}

/** Columns over time, stacked when there are several series. Hover or focus a column for its figures. */
export function ColumnChart({ columns, series, height = 200, label }: { columns: Column[]; series: Series[]; height?: number; label: string }) {
  const [active, setActive] = useState<number | null>(null);
  const { max, ticks } = scale(Math.max(0, ...columns.map((c) => sum(c.values))));
  const every = Math.max(1, Math.ceil(columns.length / 8));
  const current = active !== null ? columns[active] : undefined;
  const axis = `${String(formatNumber(max)).length + 1}ch`;

  return (
    <figure aria-label={label}>
      <div className="flex text-[11.5px] tabular-nums text-muted">
        <div className="relative shrink-0" style={{ height, width: axis }} aria-hidden>
          {ticks.map((t) => (
            <span key={t} className="absolute right-2 translate-y-1/2 leading-none" style={{ bottom: `${(t / max) * 100}%` }}>
              {formatNumber(t)}
            </span>
          ))}
        </div>
        <div className="relative min-w-0 flex-1" style={{ height }} onMouseLeave={() => setActive(null)}>
          {ticks.map((t) => (
            <span key={t} className={cn("absolute inset-x-0 border-t", t === 0 ? "border-line-strong" : "border-line")} style={{ bottom: `${(t / max) * 100}%` }} aria-hidden />
          ))}
          <div className="absolute inset-0 flex items-end">
            {columns.map((c, i) => {
              const total = sum(c.values);
              const top = c.values.findLastIndex((v) => v > 0);
              return (
                <div
                  key={c.key}
                  tabIndex={0}
                  aria-label={`${c.title} : ${series.map((s, k) => `${c.values[k]} ${s.label}`).join(", ")}`}
                  onMouseEnter={() => setActive(i)}
                  onFocus={() => setActive(i)}
                  onBlur={() => setActive(null)}
                  className={cn("flex h-full min-w-0 flex-1 items-end justify-center rounded-t-md outline-offset-0", active === i && "bg-mist")}
                >
                  <div className="flex w-[70%] max-w-6 flex-col-reverse gap-0.5" style={{ height: `${(total / max) * 100}%` }}>
                    {c.values.map((v, k) =>
                      v > 0 ? (
                        <span
                          key={series[k].label}
                          className={cn("block min-h-0.5 w-full", k === top && "rounded-t-[4px]")}
                          style={{ flexGrow: v, flexBasis: 0, background: series[k].color }}
                        />
                      ) : null,
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {current && active !== null && (
            <div
              role="status"
              className={cn(
                "pointer-events-none absolute top-1 z-10 min-w-[150px] rounded-xl border border-line bg-white px-3 py-2 text-[12.5px] text-ink-soft shadow-[0_12px_28px_-14px_rgba(11,51,70,.45)]",
                active < columns.length / 2 ? "translate-x-3" : "-translate-x-[calc(100%+12px)]",
              )}
              style={{ left: `${((active + 0.5) / columns.length) * 100}%` }}
            >
              <p className="mb-1 whitespace-nowrap font-semibold text-navy">{current.title}</p>
              {series.map((s, k) => (
                <p key={s.label} className="flex items-center justify-between gap-4 whitespace-nowrap">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="size-2 rounded-sm" style={{ background: s.color }} aria-hidden />
                    {s.label}
                  </span>
                  <strong className="font-semibold text-navy">{formatNumber(current.values[k])}</strong>
                </p>
              ))}
              {series.length > 1 && (
                <p className="mt-1 flex justify-between gap-4 border-t border-line pt-1">
                  Total <strong className="font-semibold text-navy">{formatNumber(sum(current.values))}</strong>
                </p>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="mt-1.5 flex text-[11.5px] text-muted" style={{ paddingLeft: axis }} aria-hidden>
        {columns.map((c, i) => (
          <span key={c.key} className="flex min-w-0 flex-1 justify-center">
            {(columns.length - 1 - i) % every === 0 && <span className="whitespace-nowrap">{c.label}</span>}
          </span>
        ))}
      </div>
    </figure>
  );
}

/** A small trend line for a KPI tile: shape only, the figures are next to it. */
export function Sparkline({ values, color, className }: { values: number[]; color: string; className?: string }) {
  if (values.length < 2) return null;
  const max = Math.max(...values, 1);
  const points = values.map((v, i) => `${(i / (values.length - 1)) * 100},${26 - (v / max) * 24}`);
  return (
    <svg viewBox="0 0 100 28" preserveAspectRatio="none" className={cn("h-7 w-full", className)} aria-hidden>
      <polygon points={`0,28 ${points.join(" ")} 100,28`} fill={color} opacity={0.1} />
      <polyline points={points.join(" ")} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/** One whole split into parts (e.g. the submissions of a form by status). */
export function SegmentBar({ parts, className }: { parts: { label: string; value: number; color: string }[]; className?: string }) {
  const shown = parts.filter((p) => p.value > 0);
  return (
    <div
      role="img"
      aria-label={parts.map((p) => `${p.label} : ${p.value}`).join(", ")}
      className={cn("flex h-2 gap-0.5 overflow-hidden rounded-full", shown.length === 0 && "bg-mist", className)}
    >
      {shown.map((p) => (
        <span key={p.label} title={`${p.label} : ${formatNumber(p.value)}`} className="min-w-1" style={{ flexGrow: p.value, flexBasis: 0, background: p.color }} />
      ))}
    </div>
  );
}

/** Horizontal bar of a ranked list, on a light track. */
export function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  return (
    <span className="block h-2 overflow-hidden rounded-full bg-mist" aria-hidden>
      <span className="block h-full rounded-full" style={{ width: `${max > 0 ? (value / max) * 100 : 0}%`, background: color }} />
    </span>
  );
}
