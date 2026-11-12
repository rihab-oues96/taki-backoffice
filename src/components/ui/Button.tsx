import Link from "next/link";
import { Loader2 } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Same button language as the website (CTA guidelines): pills, blue gradient for the
 * main action on light backgrounds, thin outline for secondary actions, blue hover.
 */
type Variant = "primary" | "line" | "ghost" | "danger" | "solid";
type Size = "md" | "sm";

const BASE =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full border-[1.5px] font-bold transition duration-200 disabled:pointer-events-none disabled:opacity-50";

const VARIANTS: Record<Variant, string> = {
  primary:
    "border-transparent bg-linear-to-r from-[#2fa5de] to-[#6ebfe8] text-white shadow-[0_10px_24px_-12px_rgba(47,165,222,.8)] hover:-translate-y-0.5 hover:shadow-[0_16px_30px_-12px_rgba(47,165,222,.95)]",
  line: "border-line-strong bg-white text-navy hover:border-brand hover:bg-brand hover:text-white",
  ghost: "border-transparent bg-transparent text-ink-soft hover:bg-mist hover:text-navy",
  danger: "border-danger/30 bg-white text-danger hover:border-danger hover:bg-danger hover:text-white",
  solid: "border-paper bg-paper text-navy hover:border-brand hover:bg-brand hover:text-white",
};

const SIZES: Record<Size, string> = {
  md: "h-11 px-5 text-sm",
  sm: "h-9 px-3.5 text-[13px]",
};

interface CommonProps {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
  className?: string;
  children?: ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  icon,
  loading = false,
  className,
  children,
  disabled,
  type = "button",
  ...rest
}: CommonProps & { loading?: boolean } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type={type} disabled={disabled || loading} className={cn(BASE, VARIANTS[variant], SIZES[size], className)} {...rest}>
      {loading ? <Loader2 size={16} className="animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  );
}

export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  icon,
  external = false,
  download = false,
  className,
  children,
}: CommonProps & { href: string; external?: boolean; /** The link saves a file served by the API. */ download?: boolean }) {
  const cls = cn(BASE, VARIANTS[variant], SIZES[size], className);
  if (download) {
    return (
      <a href={href} download className={cls}>
        {icon}
        {children}
      </a>
    );
  }
  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>
        {icon}
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={cls}>
      {icon}
      {children}
    </Link>
  );
}

/** Square icon-only button; `label` is required for screen readers and shown as a tooltip. */
export function IconButton({
  label,
  children,
  className,
  tone = "default",
  type = "button",
  ...rest
}: { label: string; tone?: "default" | "danger" } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        "grid size-9 shrink-0 place-items-center rounded-full text-ink-soft transition disabled:pointer-events-none disabled:opacity-35",
        tone === "danger" ? "hover:bg-danger/10 hover:text-danger" : "hover:bg-mist hover:text-brand-deep",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
