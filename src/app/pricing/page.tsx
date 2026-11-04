import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { MarketingShell } from '@/components/site/MarketingShell';
import { PricingTable } from '@/components/site/PricingTable';
import { SITE } from '@/lib/site-config';
import { FREE_TRIAL_SUMMARY, TOP_UP_PACKS } from '@/lib/site-plans';
import { ADDON_CREDIT_COSTS, VISUAL_TIERS } from '@/lib/billing';

const title = 'Pricing | Tillercast';
const description =
  'Simple Tillercast plans from $24/month billed annually. Credits cover script-to-video generation, narration, captions and rendering, with automatic credit refunds on failed renders.';

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: `${SITE.url}/pricing` },
  openGraph: { title, description, url: `${SITE.url}/pricing`, siteName: SITE.name, type: 'website' },
  twitter: { card: 'summary_large_image', title, description },
};

// Comparison rows reflect PLANS in src/lib/billing.ts.
const COMPARE: { label: string; starter: string; creator: string; pro: string }[] = [
  { label: 'Credits per month', starter: '500', creator: '1,200', pro: '3,000' },
  { label: 'Connected channels', starter: '1', creator: '2', pro: '5' },
  { label: 'Max export resolution', starter: '1080p', creator: '1080p', pro: '4K' },
  { label: 'Watermark on exports', starter: 'No', creator: 'No', pro: 'No' },
  { label: 'Stock footage and AI motion stills', starter: 'Included', creator: 'Included', pro: 'Included' },
  { label: 'Cinema AI Lite clips (Veo 3.1 Lite)', starter: 'Not included', creator: 'Included', pro: 'Included' },
  { label: 'Cinema AI Fast and Director tiers', starter: 'Not included', creator: 'Not included', pro: 'Included' },
  { label: 'Standard narration voices', starter: 'Included', creator: 'Included', pro: 'Included' },
  { label: 'ElevenLabs narrator voices', starter: 'Not included', creator: 'Included', pro: 'Included' },
  { label: 'Voice cloning', starter: 'Not included', creator: 'Not included', pro: 'Included' },
  { label: 'Scene editor (re-voice, swap, undo)', starter: 'Not included', creator: 'Included', pro: 'Included' },
  { label: 'Competitor Outlier Spy', starter: 'Not included', creator: 'Not included', pro: 'Included' },
  { label: 'Publishing platforms', starter: 'YouTube or TikTok*', creator: 'YouTube + TikTok*', pro: 'YouTube, TikTok*, Instagram*, Facebook*' },
  { label: 'Priority render queue', starter: 'Standard', creator: 'Standard', pro: 'Priority' },
  { label: 'Automatic credit refund on failed renders', starter: 'Yes', creator: 'Yes', pro: 'Yes' },
];

const FAQS = [
  {
    q: 'What is a credit?',
    a: 'Credits pay for the AI work behind a video: visuals per scene, premium voices and thumbnails. Script writing and standard voices cost no credits. The calculator above shows typical totals.',
  },
  {
    q: 'What does the free trial include?',
    a: FREE_TRIAL_SUMMARY,
  },
  {
    q: 'What happens if a render fails?',
    a: 'If a render fails on our side, the credits for that video are returned to your balance automatically. See the refund policy for how subscription refunds work.',
  },
  {
    q: 'Can I cancel any time?',
    a: 'Yes. You can cancel from your account settings and keep access until the end of the period you have paid for. Details are in the refund policy.',
  },
  {
    q: 'Do unused credits roll over?',
    a: 'Monthly plan credits renew each period. Top-up packs are separate and stay on your account for up to 365 days.',
  },
  {
    q: 'Why do some platforms have an asterisk?',
    a: 'TikTok, Instagram and Facebook publishing depend on each platform approving our app. Where publishing is not yet available you can always download your video and upload it yourself.',
  },
  {
    q: 'Which payment methods do you accept?',
    a: 'Payments are processed by our payment provider. Available methods are shown at checkout.',
  },
];

const EXAMPLE_SCENES = 7; // roughly a 45-second Short
const baseExtras = ADDON_CREDIT_COSTS.THUMBNAIL;
const EXAMPLES = [
  { label: 'Stock footage, standard voice', plan: 'Starter and up', credits: EXAMPLE_SCENES * VISUAL_TIERS.stock.creditsPerScene + baseExtras },
  { label: 'AI motion stills, ElevenLabs voice', plan: 'Creator and up', credits: EXAMPLE_SCENES * VISUAL_TIERS.flash_motion.creditsPerScene + ADDON_CREDIT_COSTS.ELEVENLABS_VOICE + baseExtras },
  { label: 'Cinema AI Lite clips, ElevenLabs voice', plan: 'Creator and up', credits: EXAMPLE_SCENES * VISUAL_TIERS.cinema_ai_lite.creditsPerScene + ADDON_CREDIT_COSTS.ELEVENLABS_VOICE + baseExtras },
  { label: 'Cinema AI Fast clips, ElevenLabs voice', plan: 'Pro', credits: EXAMPLE_SCENES * VISUAL_TIERS.cinema_ai_fast.creditsPerScene + ADDON_CREDIT_COSTS.ELEVENLABS_VOICE + baseExtras },
];

export default function PricingPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQS.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };

  return (
    <MarketingShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <section className="bg-[radial-gradient(100%_100%_at_50%_0%,#F5F3FF_0%,#FAF7FF_45%,#FFFFFF_100%)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-16 pb-14">
          <div className="text-center max-w-2xl mx-auto">
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-950">Simple pricing for every channel size</h1>
            <p className="mt-4 text-base sm:text-lg text-slate-600">
              Pay for the videos you make. Start free, upgrade when you are posting regularly, cancel any time.
            </p>
          </div>
          <div className="mt-10">
            <PricingTable />
          </div>
          <p className="mt-6 text-center text-xs text-slate-500">
            * TikTok, Instagram and Facebook publishing depend on platform app approval and may not be available on every account yet.
          </p>
        </div>
      </section>

      {/* Free trial */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <div className="p-6 sm:p-8 rounded-3xl bg-white border border-purple-100 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900">Try it before you pay</h2>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">{FREE_TRIAL_SUMMARY}</p>
          </div>
          <Link href="/signup" className="shrink-0 px-6 py-3 rounded-2xl text-sm font-extrabold bg-gradient-to-r from-purple-600 to-pink-500 text-white shadow-md shadow-purple-200">
            Start free
          </Link>
        </div>
      </section>

      {/* Comparison */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-14">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 text-center">Compare plans</h2>
        <div className="mt-8 overflow-x-auto bg-white rounded-3xl border border-purple-100 shadow-sm">
          <table className="w-full min-w-[640px] text-left text-sm border-collapse">
            <thead>
              <tr className="bg-purple-50/60 border-b border-purple-100">
                <th scope="col" className="p-4 font-bold text-slate-700">Feature</th>
                <th scope="col" className="p-4 font-bold text-slate-700">Starter</th>
                <th scope="col" className="p-4 font-extrabold text-purple-700">Creator</th>
                <th scope="col" className="p-4 font-bold text-slate-700">Pro</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-purple-50">
              {COMPARE.map((r) => (
                <tr key={r.label}>
                  <th scope="row" className="p-4 font-semibold text-slate-800">{r.label}</th>
                  <td className="p-4 text-slate-600">{r.starter}</td>
                  <td className="p-4 text-slate-600 bg-purple-50/20">{r.creator}</td>
                  <td className="p-4 text-slate-600">{r.pro}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Credit explainer */}
      <section className="bg-purple-50/40 border-y border-purple-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-14">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 text-center">What does a video cost?</h2>
          <p className="mt-3 text-sm sm:text-base text-slate-600 text-center max-w-2xl mx-auto">
            Visuals are charged per scene, plus a small add-on for premium voices and the thumbnail. Script writing and standard voices are free. Example below: a Short of about 45 seconds with {EXAMPLE_SCENES} scenes.
          </p>
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {EXAMPLES.map((e) => (
              <div key={e.label} className="p-5 rounded-2xl bg-white border border-purple-100 flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-bold text-slate-900">{e.label}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{e.plan}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-2xl font-black text-purple-700">{e.credits}</div>
                  <div className="text-[11px] font-semibold text-slate-500">credits</div>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-slate-500 text-center">
            Per scene: stock {VISUAL_TIERS.stock.creditsPerScene}, AI motion still {VISUAL_TIERS.flash_motion.creditsPerScene}, Cinema AI Lite {VISUAL_TIERS.cinema_ai_lite.creditsPerScene}, Cinema AI Fast {VISUAL_TIERS.cinema_ai_fast.creditsPerScene}, Director {VISUAL_TIERS.hollywood_director.creditsPerScene}. ElevenLabs voice +{ADDON_CREDIT_COSTS.ELEVENLABS_VOICE}, thumbnail +{ADDON_CREDIT_COSTS.THUMBNAIL}. Previews cost half the scene rate. The final total is shown before you render.
          </p>
        </div>
      </section>

      {/* Top-ups */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-14">
        <h2 className="text-2xl font-extrabold text-slate-900 text-center">Need more credits?</h2>
        <p className="mt-2 text-sm text-slate-600 text-center">Subscribers can add top-up packs at any time. Pack credits stay valid for up to 365 days.</p>
        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
          {TOP_UP_PACKS.map((t) => (
            <div key={t.credits} className="p-5 rounded-2xl bg-white border border-purple-100 text-center">
              <div className="text-2xl font-black text-slate-950">{t.credits.toLocaleString()}</div>
              <div className="text-xs font-semibold text-slate-500">credits</div>
              <div className="mt-3 text-lg font-extrabold text-purple-700">${t.price}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 pb-16">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 text-center">Pricing FAQ</h2>
        <div className="mt-8 space-y-3">
          {FAQS.map((f) => (
            <details key={f.q} className="group p-5 rounded-2xl bg-white border border-purple-100 shadow-sm">
              <summary className="cursor-pointer list-none flex items-center justify-between gap-4 text-sm font-bold text-slate-900">
                {f.q}
                <span className="text-purple-600 group-open:rotate-45 transition-transform text-lg leading-none" aria-hidden="true">+</span>
              </summary>
              <p className="mt-3 text-sm text-slate-600 leading-relaxed">
                {f.a}{' '}
                {(f.q.includes('fails') || f.q.includes('cancel')) && (
                  <Link href="/refund" className="text-purple-700 font-semibold underline">Read the refund policy</Link>
                )}
              </p>
            </details>
          ))}
        </div>
      </section>
    </MarketingShell>
  );
}
