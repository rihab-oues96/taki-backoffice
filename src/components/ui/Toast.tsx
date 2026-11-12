"use client";

import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { errorMessage } from "@/lib/api";
import { cn } from "@/lib/cn";

type Tone = "success" | "error" | "info";
interface ToastItem {
  id: number;
  tone: Tone;
  message: string;
}

interface ToastApi {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  /** Shows the message carried by an API error (or a generic one). */
  fromError: (err: unknown) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const ICONS = { success: CheckCircle2, error: AlertTriangle, info: Info };
const STYLES: Record<Tone, string> = {
  success: "border-success/25 text-success",
  error: "border-danger/30 text-danger",
  info: "border-brand/30 text-brand-deep",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => setToasts((list) => list.filter((t) => t.id !== id)), []);

  const push = useCallback(
    (tone: Tone, message: string) => {
      const id = nextId.current++;
      setToasts((list) => [...list.slice(-3), { id, tone, message }]);
      setTimeout(() => dismiss(id), tone === "error" ? 7000 : 4000);
    },
    [dismiss],
  );

  const value = useMemo<ToastApi>(
    () => ({
      success: (m) => push("success", m),
      error: (m) => push("error", m),
      info: (m) => push("info", m),
      fromError: (err) => push("error", errorMessage(err)),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4 sm:inset-x-auto sm:right-5 sm:bottom-5 sm:items-end" aria-live="polite">
        {toasts.map((t) => {
          const Icon = ICONS[t.tone];
          return (
            <div
              key={t.id}
              role={t.tone === "error" ? "alert" : "status"}
              className={cn(
                "pointer-events-auto flex w-full max-w-sm animate-pop-in items-start gap-3 rounded-2xl border bg-white px-4 py-3.5 shadow-[0_18px_40px_-18px_rgba(11,51,70,.45)]",
                STYLES[t.tone],
              )}
            >
              <Icon size={19} className="mt-0.5 shrink-0" aria-hidden />
              <p className="flex-1 text-sm font-semibold leading-snug text-navy">{t.message}</p>
              <button type="button" onClick={() => dismiss(t.id)} aria-label="Fermer la notification" className="rounded-full p-0.5 text-muted hover:text-navy">
                <X size={15} aria-hidden />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}
