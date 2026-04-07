"use client";

import { forwardRef } from "react";
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

const baseControlClass =
  "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400";

interface FieldShellProps {
  label: string;
  htmlFor?: string;
  error?: string;
  helperText?: string;
  readOnly?: boolean;
  children: ReactNode;
}

export function FieldShell({ label, htmlFor, error, helperText, readOnly = false, children }: FieldShellProps) {
  return (
    <label htmlFor={htmlFor} className="block space-y-2 text-sm">
      <span className="inline-flex items-center gap-2 font-semibold text-slate-700">
        {label}
        {readOnly ? <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-500">Read only</span> : null}
      </span>
      {children}
      {error ? <p className="text-xs font-medium text-rose-600">{error}</p> : null}
      {!error && helperText ? <p className="text-xs text-slate-500">{helperText}</p> : null}
    </label>
  );
}

export const ProfileTextInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function ProfileTextInput(
  { className = "", ...props },
  ref
) {
  return <input ref={ref} className={`${baseControlClass} ${className}`.trim()} {...props} />;
});

export const ProfileTextarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function ProfileTextarea(
  { className = "", ...props },
  ref
) {
  return <textarea ref={ref} className={`${baseControlClass} min-h-[140px] resize-y ${className}`.trim()} {...props} />;
});

export const ProfileSelect = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function ProfileSelect(
  { className = "", ...props },
  ref
) {
  return <select ref={ref} className={`${baseControlClass} ${className}`.trim()} {...props} />;
});
