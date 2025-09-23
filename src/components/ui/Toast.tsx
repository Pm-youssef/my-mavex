"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, XCircle, Info, AlertTriangle, X } from "lucide-react";

export type ToastVariant = "success" | "error" | "info" | "warning";

export type ToastPayload = {
  id?: string;
  title?: string;
  description?: string;
  variant?: ToastVariant;
  durationMs?: number;
};

export function toast(payload: ToastPayload) {
  if (typeof window === "undefined") return;
  const detail = {
    id: payload.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: payload.title || "",
    description: payload.description || "",
    variant: (payload.variant || "info") as ToastVariant,
    durationMs: typeof payload.durationMs === "number" ? payload.durationMs : 3500,
  } as Required<ToastPayload>;
  window.dispatchEvent(new CustomEvent("app:toast", { detail }));
}

export const toastSuccess = (p: Omit<ToastPayload, "variant">) => toast({ ...p, variant: "success" });
export const toastError = (p: Omit<ToastPayload, "variant">) => toast({ ...p, variant: "error" });
export const toastInfo = (p: Omit<ToastPayload, "variant">) => toast({ ...p, variant: "info" });
export const toastWarning = (p: Omit<ToastPayload, "variant">) => toast({ ...p, variant: "warning" });

type ToastItem = Required<ToastPayload> & { createdAt: number };

export default function ToastContainer() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    const onToast = (e: Event) => {
      const anyEvt = e as CustomEvent<Required<ToastPayload>>;
      const t = anyEvt.detail;
      setItems((prev) => {
        // prevent exact duplicates shown back-to-back
        const last = prev[prev.length - 1];
        if (last && last.title === t.title && last.description === t.description && last.variant === t.variant) {
          return prev;
        }
        return [...prev, { ...t, createdAt: Date.now() }];
      });
    };
    window.addEventListener("app:toast", onToast as EventListener);
    return () => window.removeEventListener("app:toast", onToast as EventListener);
  }, []);

  // Auto-remove timers
  useEffect(() => {
    if (items.length === 0) return;
    const timers = items.map((t) =>
      setTimeout(() => {
        setItems((prev) => prev.filter((x) => x.id !== t.id));
      }, t.durationMs)
    );
    return () => timers.forEach(clearTimeout);
  }, [items]);

  const styles = useMemo(() => ({
    success: {
      ring: "border-emerald-300/70 dark:border-emerald-900/50",
      accent: "from-emerald-100/70 to-emerald-50/40 dark:from-emerald-900/30 dark:to-emerald-800/20",
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" aria-hidden />,
    },
    error: {
      ring: "border-rose-300/70 dark:border-rose-900/50",
      accent: "from-rose-100/70 to-rose-50/40 dark:from-rose-900/30 dark:to-rose-800/20",
      icon: <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400" aria-hidden />,
    },
    warning: {
      ring: "border-amber-300/70 dark:border-amber-900/50",
      accent: "from-amber-100/70 to-amber-50/40 dark:from-amber-900/30 dark:to-amber-800/20",
      icon: <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" aria-hidden />,
    },
    info: {
      ring: "border-sky-300/70 dark:border-sky-900/50",
      accent: "from-sky-100/70 to-sky-50/40 dark:from-sky-900/30 dark:to-sky-800/20",
      icon: <Info className="w-5 h-5 text-sky-600 dark:text-sky-400" aria-hidden />,
    },
  }), []);

  if (items.length === 0) return null;

  return (
    <div className="fixed z-[1000] top-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-sm space-y-3 flex flex-col items-stretch sm:items-end">
      {items.map((t) => {
        const s = styles[t.variant];
        const ariaLive = t.variant === "error" || t.variant === "warning" ? "assertive" : "polite";
        return (
          <div
            key={t.id}
            role="status"
            aria-live={ariaLive}
            className={
              `group relative overflow-hidden rounded-2xl border backdrop-blur shadow-lg transition-all duration-300 w-full sm:w-auto ` +
              `bg-white/80 dark:bg-slate-900/80 ${s.ring} ` +
              `motion-safe:animate-in motion-safe:slide-in-from-bottom-2 motion-safe:fade-in-0 ` +
              `hover:shadow-2xl`
            }
          >
            {/* Accent gradient */}
            <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${s.accent}`} />
            <div className="relative z-10 flex items-start gap-3 px-4 py-3">
              <div className="mt-0.5">{s.icon}</div>
              <div className="flex-1">
                {t.title && (
                  <div className="text-sm font-extrabold tracking-tight text-[#0c1420] dark:text-white">{t.title}</div>
                )}
                {t.description && (
                  <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{t.description}</div>
                )}
              </div>
              <button
                onClick={() => setItems((prev) => prev.filter((x) => x.id !== t.id))}
                className="inline-flex p-1 rounded-full text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white transition-colors"
                aria-label="إغلاق التنبيه"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
