import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { MarketingShell } from '@/components/site/MarketingShell';
import { SITE } from '@/lib/site-config';
import { USE_CASES } from '@/lib/use-cases';

const title = 'Use cases | Tillercast';
const description =
  'See how creators and teams use Tillercast: script to video, article to video, faceless YouTube channels, Shorts automation and vertical video for TikTok and Reels.';

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: `${SITE.url}/use-cases` },
  openGraph: { title, description, url: `${SITE.url}/use-cases`, siteName: SITE.name, type: 'website' },
};

export default function UseCasesIndex() {
  return (
    <MarketingShell>
      <section className="bg-[radial-gradient(100%_100%_at_50%_0%,#F5F3FF_0%,#FAF7FF_45%,#FFFFFF_100%)]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-16 pb-10 text-center">
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-950">Use cases</h1>
          <p className="mt-4 text-base sm:text-lg text-slate-600 max-w-2xl mx-auto">
            One workflow, from idea to a reviewed video. Pick the way you want to create.
          </p>
        </div>
      </section>
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {USE_CASES.map((u) => (
            <Link key={u.slug} href={`/use-cases/${u.slug}`} className="p-6 rounded-3xl bg-white border border-purple-100 shadow-sm hover:border-purple-300 hover:shadow-md transition-all">
              <h2 className="text-lg font-bold text-slate-900">{u.title}</h2>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">{u.subhead}</p>
              <span className="mt-4 inline-block text-xs font-bold text-purple-600">Learn more →</span>
            </Link>
          ))}
        </div>
      </section>
    </MarketingShell>
  );
}
