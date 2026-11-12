import { AlertTriangle, Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Button } from "./Button";

export function Spinner({ className, size = 20 }: { className?: string; size?: number }) {
  return <Loader2 size={size} className={cn("animate-spin text-brand", className)} aria-hidden />;
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton", className)} aria-hidden />;
}

/** Placeholder rows while a list or table loads. */
export function SkeletonList({ rows = 5, className = "h-14" }: { rows?: number; className?: string }) {
  return (
    <div className="space-y-2.5" role="status" aria-label="Chargement">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className={className} />
      ))}
    </div>
  );
}

export function EmptyState({ icon, title, text, action }: { icon?: ReactNode; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-line-strong bg-white px-6 py-14 text-center">
      {icon && <div className="mb-4 grid size-14 place-items-center rounded-full bg-sky text-brand-deep">{icon}</div>}
      <h3 className="text-lg font-semibold tracking-[-0.02em] text-navy">{title}</h3>
      {text && <p className="mt-1.5 max-w-md text-[15px] leading-relaxed text-muted">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center rounded-2xl border border-danger/25 bg-white px-6 py-12 text-center">
      <div className="mb-4 grid size-14 place-items-center rounded-full bg-danger/10 text-danger">
        <AlertTriangle size={24} aria-hidden />
      </div>
      <h3 className="text-lg font-semibold tracking-[-0.02em] text-navy">Impossible de charger ces données</h3>
      <p className="mt-1.5 max-w-md text-[15px] text-muted">{message}</p>
      {onRetry && (
        <Button variant="line" size="sm" className="mt-5" onClick={onRetry}>
          Réessayer
        </Button>
      )}
    </div>
  );
}

type Tone = "neutral" | "success" | "warning" | "danger" | "brand" | "blue" | "violet" | "teal";

const TONES: Record<Tone, string> = {
  neutral: "bg-mist text-ink-soft",
  success: "bg-success/10 text-success",
  warning: "bg-sun/20 text-[#8a6a00]",
  danger: "bg-danger/10 text-danger",
  brand: "bg-brand/10 text-brand-deep",
  // Category colours (kinds of things, not states): kept apart from the status tones above.
  blue: "bg-[#e7edfb] text-[#2f4f9e]",
  violet: "bg-[#f1e9fb] text-[#6a3aa6]",
  teal: "bg-[#def4f0] text-[#0d6b5f]",
};

export function Badge({ tone = "neutral", children, dot = false }: { tone?: Tone; children: ReactNode; dot?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold", TONES[tone])}>
      {dot && <span className="size-1.5 rounded-full bg-current" aria-hidden />}
      {children}
    </span>
  );
}

/** Publication state shared by sections and entries. */
export function StatusBadges({ visible, hasDraft }: { visible: boolean; hasDraft: boolean }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      {visible ? (
        <Badge tone="success" dot>
          En ligne
        </Badge>
      ) : (
        <Badge tone="neutral" dot>
          Masqué
        </Badge>
      )}
      {hasDraft && <Badge tone="warning">Brouillon en attente</Badge>}
    </span>
  );
}
