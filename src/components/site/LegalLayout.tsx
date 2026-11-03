import React from 'react';
import { MarketingShell } from './MarketingShell';
import { SITE } from '@/lib/site-config';

export interface LegalSection {
  id: string;
  title: string;
  body: React.ReactNode;
}

interface LegalLayoutProps {
  title: string;
  intro?: React.ReactNode;
  sections: LegalSection[];
  showUpdated?: boolean;
}

/** Shared prose layout for legal / policy pages: title, last-updated, table of contents, sections. */
export function LegalLayout({ title, intro, sections, showUpdated = true }: LegalLayoutProps) {
  return (
    <MarketingShell>
      <div className="bg-gradient-to-b from-purple-50/70 to-white border-b border-purple-100">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-14 pb-10">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-950">{title}</h1>
          {showUpdated && (
            <p className="mt-3 text-sm font-medium text-slate-500">Last updated: {SITE.legalLastUpdated}</p>
          )}
          {intro && <div className="mt-5 text-base text-slate-700 leading-relaxed space-y-3">{intro}</div>}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <nav aria-label="Table of contents" className="mb-10 p-5 rounded-2xl bg-slate-50 border border-slate-200">
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Contents</h2>
          <ol className="mt-3 space-y-1.5 text-sm list-decimal list-inside text-slate-700">
            {sections.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="text-purple-700 hover:underline">
                  {s.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="space-y-10">
          {sections.map((s) => (
            <section key={s.id} id={s.id} className="scroll-mt-24">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-950 tracking-tight">{s.title}</h2>
              <div className="mt-3 text-[15px] leading-7 text-slate-700 space-y-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-1.5 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:space-y-1.5 [&_a]:text-purple-700 [&_a]:underline [&_strong]:text-slate-900">
                {s.body}
              </div>
            </section>
          ))}
        </div>
      </div>
    </MarketingShell>
  );
}
