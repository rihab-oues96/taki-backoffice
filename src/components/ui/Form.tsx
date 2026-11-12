"use client";

import { useEffect, useId, useRef, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

const CONTROL =
  "w-full rounded-xl border border-line-strong bg-white px-3.5 text-[15px] text-navy placeholder:text-muted/60 transition focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/15 disabled:bg-mist disabled:text-muted";

export function Field({
  label,
  help,
  error,
  required,
  htmlFor,
  children,
  className,
}: {
  label?: string;
  help?: string;
  error?: string;
  required?: boolean;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      {label && (
        <label htmlFor={htmlFor} className="mb-1.5 block text-[13.5px] font-semibold text-navy">
          {label}
          {required && <span className="ml-0.5 text-danger" aria-hidden>*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p role="alert" className="mt-1.5 text-[13px] font-medium text-danger">
          {error}
        </p>
      ) : help ? (
        <p className="mt-1.5 text-[13px] leading-snug text-muted">{help}</p>
      ) : null}
    </div>
  );
}

export function Input({ className, invalid, ...rest }: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return <input className={cn(CONTROL, "h-11", invalid && "border-danger focus:border-danger focus:ring-danger/15", className)} aria-invalid={invalid || undefined} {...rest} />;
}

/** Textarea that grows with its content. */
export function Textarea({
  className,
  invalid,
  minRows = 2,
  value,
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean; minRows?: number }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight + 2}px`;
  }, [value]);
  return (
    <textarea
      ref={ref}
      rows={minRows}
      value={value}
      className={cn(CONTROL, "resize-none py-2.5 leading-relaxed", invalid && "border-danger focus:border-danger focus:ring-danger/15", className)}
      aria-invalid={invalid || undefined}
      {...rest}
    />
  );
}

export function Select({ className, invalid, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }) {
  return (
    <select className={cn(CONTROL, "h-11 appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2216%22 height=%2216%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%235d6f7c%22 stroke-width=%222.5%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22><path d=%22m6 9 6 6 6-6%22/></svg>')] bg-[length:16px] bg-[right_0.9rem_center] bg-no-repeat pr-10", invalid && "border-danger", className)} {...rest}>
      {children}
    </select>
  );
}

export function Switch({
  checked,
  onChange,
  label,
  disabled,
  size = "md",
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Visible text, or an aria-label when `hideLabel` style is wanted: pass it through `label` and wrap yourself. */
  label: string;
  disabled?: boolean;
  size?: "md" | "sm";
}) {
  const id = useId();
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative shrink-0 rounded-full transition-colors disabled:opacity-50",
        size === "md" ? "h-6 w-11" : "h-5 w-9",
        checked ? "bg-brand" : "bg-line-strong",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 left-0.5 rounded-full bg-white shadow transition-transform",
          size === "md" ? "size-5" : "size-4",
          checked && (size === "md" ? "translate-x-5" : "translate-x-4"),
        )}
      />
    </button>
  );
}
