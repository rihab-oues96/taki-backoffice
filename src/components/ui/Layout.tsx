import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("rounded-2xl border border-line bg-white", className)}>{children}</div>;
}

/** The website's eyebrow: small caps label with the yellow dash. */
export function Eyebrow({ children, light = false }: { children: ReactNode; light?: boolean }) {
  return (
    <p className={cn("inline-flex items-center gap-2.5 text-[12.5px] font-semibold uppercase tracking-[0.08em]", light ? "text-brand-light" : "text-muted")}>
      <span className="h-1 w-[22px] rounded bg-sun" aria-hidden />
      {children}
    </p>
  );
}

export interface Crumb {
  label: string;
  href?: string;
}

export function PageHeader({
  eyebrow,
  title,
  description,
  crumbs,
  actions,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  crumbs?: Crumb[];
  actions?: ReactNode;
}) {
  return (
    <header className="mb-7">
      {crumbs && crumbs.length > 0 && (
        <nav aria-label="Fil d'Ariane" className="mb-3 flex flex-wrap items-center gap-1 text-[13px] text-muted">
          {crumbs.map((c, i) => (
            <span key={`${c.label}-${i}`} className="inline-flex items-center gap-1">
              {i > 0 && <ChevronRight size={13} aria-hidden />}
              {c.href ? (
                <Link href={c.href} className="font-medium hover:text-brand-deep">
                  {c.label}
                </Link>
              ) : (
                <span className="font-semibold text-navy">{c.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          {eyebrow && (
            <div className="mb-2">
              <Eyebrow>{eyebrow}</Eyebrow>
            </div>
          )}
          <h1 className="text-[clamp(26px,2.6vw,36px)] font-semibold leading-[1.1] tracking-[-0.035em] text-navy [&_em]:not-italic [&_em]:text-brand">
            {title}
          </h1>
          {description && <p className="mt-2 max-w-2xl text-[15.5px] leading-relaxed text-muted">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2.5">{actions}</div>}
      </div>
    </header>
  );
}
