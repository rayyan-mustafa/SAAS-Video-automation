import React from 'react';
import Link from 'next/link';

export function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle?: string; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[radial-gradient(100%_100%_at_50%_0%,#F5F3FF_0%,#FAF7FF_45%,#FFFFFF_100%)] flex flex-col items-center justify-center px-4 py-10 font-sans text-slate-900">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <Link href="/" className="inline-flex items-center gap-2.5" aria-label="Tillercast home">
            <span className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center text-white shadow-md shadow-purple-200">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><polygon points="8 5 19 12 8 19 8 5" /></svg>
            </span>
            <span className="text-2xl font-extrabold tracking-tight">Tiller<span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-500">cast</span></span>
          </Link>
          <h1 className="mt-6 text-2xl font-extrabold tracking-tight">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
        </div>
        <div className="bg-white border border-purple-100 rounded-3xl shadow-xl shadow-purple-900/5 p-6 sm:p-8">{children}</div>
        {footer && <div className="mt-5 text-center text-sm text-slate-500">{footer}</div>}
        <p className="mt-8 text-center text-xs text-slate-400">
          <Link href="/terms" className="hover:text-slate-600 underline">Terms</Link> · <Link href="/privacy" className="hover:text-slate-600 underline">Privacy</Link> · <Link href="/contact" className="hover:text-slate-600 underline">Contact</Link>
        </p>
      </div>
    </div>
  );
}

export function AuthError({ children }: { children: React.ReactNode }) {
  return <div role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{children}</div>;
}

export const authInputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-purple-400 focus:ring-4 focus:ring-purple-100';
export const authButtonClass =
  'w-full rounded-xl bg-gradient-to-r from-purple-600 to-pink-500 px-4 py-3 text-sm font-bold text-white shadow-md shadow-purple-200 hover:shadow-lg transition-shadow disabled:opacity-60 disabled:cursor-not-allowed';
