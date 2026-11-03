'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { PRIMARY_NAV, USE_CASE_LINKS } from '@/lib/site-config';

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [useCasesOpen, setUseCasesOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-md border-b border-purple-100">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-8 py-3">
        <Link href="/" className="flex items-center gap-2.5" aria-label="Tillercast home">
          <span className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center text-white shadow-md shadow-purple-200">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <polygon points="8 5 19 12 8 19 8 5" />
            </svg>
          </span>
          <span className="text-xl font-extrabold tracking-tight text-slate-900">
            Tiller<span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-500">cast</span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-1 text-sm font-semibold text-slate-600" aria-label="Primary">
          <div className="relative" onMouseLeave={() => setUseCasesOpen(false)}>
            <button
              type="button"
              onMouseEnter={() => setUseCasesOpen(true)}
              onClick={() => setUseCasesOpen((v) => !v)}
              aria-expanded={useCasesOpen}
              className="px-3 py-2 rounded-full hover:text-purple-700 hover:bg-purple-50 transition-colors"
            >
              Use cases <span aria-hidden="true">▾</span>
            </button>
            {useCasesOpen && (
              <div className="absolute left-0 top-full pt-2 w-80">
                <div className="bg-white border border-purple-100 rounded-2xl shadow-xl p-2">
                  {USE_CASE_LINKS.map((l) => (
                    <Link
                      key={l.href}
                      href={l.href}
                      onClick={() => setUseCasesOpen(false)}
                      className="block px-3 py-2.5 rounded-xl hover:bg-purple-50"
                    >
                      <div className="text-sm font-bold text-slate-900">{l.label}</div>
                      <div className="text-xs font-medium text-slate-500">{l.description}</div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
          {PRIMARY_NAV.map((l) => (
            <Link key={l.href} href={l.href} className="px-3 py-2 rounded-full hover:text-purple-700 hover:bg-purple-50 transition-colors">
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link href="/login" className="hidden sm:inline-block text-sm font-bold text-slate-600 hover:text-purple-700 px-3 py-2">
            Log in
          </Link>
          <Link
            href="/signup"
            className="px-4 py-2 rounded-2xl text-sm font-bold bg-gradient-to-r from-purple-600 to-pink-500 text-white shadow-md shadow-purple-200 hover:shadow-lg transition-shadow"
          >
            Start free
          </Link>
          <button
            type="button"
            className="md:hidden ml-1 p-2 rounded-lg text-slate-700 hover:bg-purple-50"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              {open ? <path d="M18 6L6 18M6 6l12 12" /> : <path d="M3 6h18M3 12h18M3 18h18" />}
            </svg>
          </button>
        </div>
      </div>

      {open && (
        <nav className="md:hidden border-t border-purple-100 bg-white px-4 py-3 space-y-1" aria-label="Mobile">
          <div className="px-2 pt-1 pb-1 text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Use cases</div>
          {USE_CASE_LINKS.map((l) => (
            <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="block px-2 py-2 rounded-lg text-sm font-semibold text-slate-700 hover:bg-purple-50">
              {l.label}
            </Link>
          ))}
          <div className="h-px bg-purple-100 my-2" />
          {PRIMARY_NAV.map((l) => (
            <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="block px-2 py-2 rounded-lg text-sm font-semibold text-slate-700 hover:bg-purple-50">
              {l.label}
            </Link>
          ))}
          <Link href="/login" onClick={() => setOpen(false)} className="block px-2 py-2 rounded-lg text-sm font-semibold text-slate-700 hover:bg-purple-50">
            Log in
          </Link>
        </nav>
      )}
    </header>
  );
}
