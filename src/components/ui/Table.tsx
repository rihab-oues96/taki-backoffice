import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Horizontally scrollable table inside a card, so it stays usable on small screens. */
export function Table({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("overflow-x-auto rounded-2xl border border-line bg-white", className)}>
      <table className="w-full min-w-[640px] border-collapse text-left text-[14.5px]">{children}</table>
    </div>
  );
}

export function Th({ children, className, sort }: { children?: ReactNode; className?: string; /** Set on a column the table is sorted by. */ sort?: "ascending" | "descending" | "none" }) {
  return (
    <th scope="col" aria-sort={sort} className={cn("border-b border-line bg-mist/60 px-4 py-3 text-xs font-bold uppercase tracking-[0.06em] text-muted first:pl-5 last:pr-5", className)}>
      {children}
    </th>
  );
}

export function Td({ children, className }: { children?: ReactNode; className?: string }) {
  return <td className={cn("border-b border-line px-4 py-3 align-middle first:pl-5 last:pr-5", className)}>{children}</td>;
}

export function Tr({ children, className }: { children: ReactNode; className?: string }) {
  return <tr className={cn("transition-colors hover:bg-sky/60 [&:last-child>td]:border-b-0", className)}>{children}</tr>;
}

export function Pager({ page, pages, total, onPage }: { page: number; pages: number; total: number; onPage: (page: number) => void }) {
  if (pages <= 1) return <p className="mt-3 text-[13px] text-muted">{total} élément{total > 1 ? "s" : ""}</p>;
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-[13.5px] text-muted">
      <span>
        {total} éléments · page {page} sur {pages}
      </span>
      <div className="flex gap-2">
        <button type="button" disabled={page <= 1} onClick={() => onPage(page - 1)} className="h-9 rounded-full border border-line-strong bg-white px-4 font-semibold text-navy hover:border-brand hover:text-brand-deep disabled:opacity-40">
          Précédent
        </button>
        <button type="button" disabled={page >= pages} onClick={() => onPage(page + 1)} className="h-9 rounded-full border border-line-strong bg-white px-4 font-semibold text-navy hover:border-brand hover:text-brand-deep disabled:opacity-40">
          Suivant
        </button>
      </div>
    </div>
  );
}
