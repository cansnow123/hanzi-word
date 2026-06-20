"use client";

import { useEffect } from "react";
import type { PropsWithChildren, ReactNode } from "react";

type ModalProps = PropsWithChildren<{
  open: boolean;
  title: string;
  subtitle?: string;
  footer?: ReactNode;
  onClose: () => void;
}>;

export function Modal({ open, title, subtitle, footer, onClose, children }: ModalProps) {
  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 px-3 py-3 backdrop-blur-sm sm:px-4 sm:py-6 sm:items-center"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className="card-surface flex max-h-[calc(100vh-1.5rem)] w-full max-w-2xl flex-col overflow-hidden rounded-[28px] border border-white/70 shadow-[0_28px_90px_rgba(31,41,55,0.18)] sm:max-h-[min(88vh,880px)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-amber-100/80 bg-[rgba(255,252,246,0.95)] px-5 py-4 backdrop-blur-md sm:px-6 sm:py-5">
          <div className="min-w-0">
            <h2 className="text-2xl font-semibold text-slate-800">{title}</h2>
            {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-full border border-amber-200 bg-white/80 px-3 py-1 text-sm text-slate-500 transition hover:border-amber-300 hover:text-slate-700"
          >
            关闭
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          {children}
        </div>
        {footer ? (
          <div className="border-t border-amber-100/80 bg-[rgba(255,252,246,0.95)] px-5 py-4 backdrop-blur-md sm:px-6">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
