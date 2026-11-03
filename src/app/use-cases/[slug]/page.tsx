import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { MarketingShell } from '@/components/site/MarketingShell';
import { SITE } from '@/lib/site-config';
import { USE_CASES, getUseCase, type FeatureIcon } from '@/lib/use-cases';

type Props = { params: { slug: string } };

export function generateStaticParams() {
  return USE_CASES.map((u) => ({ slug: u.slug }));
}

export function generateMetadata({ params }: Props): Metadata {
  const uc = getUseCase(params.slug);
  if (!uc) return {};
  const url = `${SITE.url}/use-cases/${uc.slug}`;
  return {
    title: uc.metaTitle,
    description: uc.metaDescription,
    alternates: { canonical: url },
    openGraph: { title: uc.metaTitle, description: uc.metaDescription, url, siteName: SITE.name, type: 'website' },
    twitter: { card: 'summary_large_image', title: uc.metaTitle, description: uc.metaDescription },
  };
}

const ICON_PATHS: Record<FeatureIcon, React.ReactNode> = {
  script: <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9zM14 3v6h6M8 13h8M8 17h5" />,
  scenes: <path d="M3 5h18v14H3zM3 9h18M8 5v4M13 5v4M18 5v4" />,
  voice: <path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3zM5 11a7 7 0 0 0 14 0M12 18v3" />,
  captions: <path d="M3 5h18v14H3zM7 11h4M7 15h2M13 11h4M12 15h5" />,
  refund: <path d="M3 12a9 9 0 1 0 3-6.7M3 4v5h5M12 8v5l3 2" />,
  calendar: <path d="M3 5h18v16H3zM3 10h18M8 3v4M16 3v4" />,
  spy: <path d="M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM21 21l-5-5" />,
  publish: <path d="M12 16V4M7 9l5-5 5 5M4 20h16" />,
  ratio: <path d="M7 3h10a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />,
  hook: <path d="M12 3v10a4 4 0 1 1-4-4M12 3l-3 3M12 3l3 3" />,
};

function Icon({ name }: { name: FeatureIcon }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICON_PATHS[name]}
    </svg>
  );
}

export default function UseCasePage({ params }: Props) {
  const uc = getUseCase(params.slug);
  if (!uc) notFound();

  const related = USE_CASES.filter((u) => u.slug !== uc.slug).slice(0, 3);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: uc.faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };

  return (
    <MarketingShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Hero */}
      <section className="bg-[radial-gradient(100%_100%_at_50%_0%,#F5F3FF_0%,#FAF7FF_45%,#FFFFFF_100%)]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-16 pb-14 text-center">
          <p className="inline-block px-3 py-1 rounded-full bg-purple-50 border border-purple-200 text-purple-700 text-xs font-bold uppercase tracking-wider">
            {uc.title}
          </p>
          <h1 className="mt-4 text-3xl sm:text-5xl font-black tracking-tight text-slate-950 leading-[1.1]">{uc.h1}</h1>
          <p className="mt-5 text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">{uc.subhead}</p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/signup" className="w-full sm:w-auto px-6 py-3 rounded-2xl text-sm font-extrabold bg-gradient-to-r from-purple-600 to-pink-500 text-white shadow-md shadow-purple-200 hover:shadow-lg transition-shadow">
              Start free
            </Link>
            <Link href="/pricing" className="w-full sm:w-auto px-6 py-3 rounded-2xl text-sm font-bold bg-white text-purple-700 border border-purple-200 hover:bg-purple-50">
              See pricing
            </Link>
          </div>
          <p className="mt-3 text-xs text-slate-500">No credit card required to start.</p>
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-14">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 text-center">How it works</h2>
        <ol className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-5">
          {uc.steps.map((s, i) => (
            <li key={s.title} className="p-6 rounded-3xl bg-white border border-purple-100 shadow-sm">
              <span className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center text-sm font-black">{i + 1}</span>
              <h3 className="mt-4 text-lg font-bold text-slate-900">{s.title}</h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Features */}
      <section className="bg-purple-50/40 border-y border-purple-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 text-center">What you get</h2>
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {uc.features.map((f) => (
              <div key={f.title} className="p-6 rounded-3xl bg-white border border-purple-100 shadow-sm">
                <span className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center">
                  <Icon name={f.icon} />
                </span>
                <h3 className="mt-4 text-base font-bold text-slate-900">{f.title}</h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Audience */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 py-14">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 text-center">Who it&apos;s for</h2>
        <ul className="mt-8 space-y-3">
          {uc.audience.map((a) => (
            <li key={a} className="flex items-start gap-3 p-4 rounded-2xl bg-white border border-purple-100">
              <svg className="mt-0.5 shrink-0 text-purple-600" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12l5 5 9-10" />
              </svg>
              <span className="text-sm font-medium text-slate-700">{a}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 pb-14">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 text-center">Frequently asked questions</h2>
        <div className="mt-8 space-y-3">
          {uc.faqs.map((f) => (
            <details key={f.q} className="group p-5 rounded-2xl bg-white border border-purple-100 shadow-sm">
              <summary className="cursor-pointer list-none flex items-center justify-between gap-4 text-sm font-bold text-slate-900">
                {f.q}
                <span className="text-purple-600 group-open:rotate-45 transition-transform text-lg leading-none" aria-hidden="true">+</span>
              </summary>
              <p className="mt-3 text-sm text-slate-600 leading-relaxed">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Related */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-14">
        <h2 className="text-xl font-extrabold text-slate-900">Related use cases</h2>
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {related.map((r) => (
            <Link key={r.slug} href={`/use-cases/${r.slug}`} className="p-5 rounded-2xl bg-white border border-purple-100 hover:border-purple-300 hover:shadow-md transition-all">
              <div className="text-sm font-bold text-slate-900">{r.title}</div>
              <div className="mt-1 text-xs text-slate-500 leading-relaxed">{r.metaDescription.slice(0, 90).trim()}…</div>
              <span className="mt-3 inline-block text-xs font-bold text-purple-600">Learn more →</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-gradient-to-r from-purple-700 via-indigo-700 to-pink-600">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-14 text-center text-white">
          <h2 className="text-2xl sm:text-3xl font-extrabold">Make your first video today</h2>
          <p className="mt-3 text-sm sm:text-base text-purple-100">Create a free account, generate a trial video and see the result before you pay.</p>
          <Link href="/signup" className="mt-6 inline-block px-7 py-3 rounded-2xl bg-white text-purple-700 text-sm font-extrabold shadow-lg hover:bg-purple-50">
            Start free
          </Link>
        </div>
      </section>
    </MarketingShell>
  );
}
