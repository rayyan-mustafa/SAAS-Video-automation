import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { MarketingShell } from '@/components/site/MarketingShell';
import { SITE } from '@/lib/site-config';

export const metadata: Metadata = {
  title: 'About Tillercast',
  description: 'Tillercast is an AI video creation and publishing tool for creators who want to go from idea to published video without a timeline editor.',
  alternates: { canonical: `${SITE.url}/about` },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: SITE.name,
  url: SITE.url,
  email: SITE.supportEmail,
  description: SITE.tagline,
};

export default function AboutPage() {
  return (
    <MarketingShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="bg-gradient-to-b from-purple-50/70 to-white border-b border-purple-100">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-14 pb-10">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-950">About {SITE.name}</h1>
          <p className="mt-4 text-lg text-slate-700 leading-relaxed">{SITE.tagline}.</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-10 text-[15px] leading-7 text-slate-700">
        <section>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-950">What we build</h2>
          <p className="mt-3">
            {SITE.name} is an AI video creation and publishing tool. You describe a topic or paste a script; the app drafts a scene-by-scene
            plan, generates narration, visuals and captions, and renders a finished video you can review, edit and download. If you connect
            your own channels, you can also publish or schedule it from the same place.
          </p>
        </section>

        <section>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-950">How we think about publishing</h2>
          <ul className="mt-3 list-disc pl-6 space-y-1.5">
            <li>You only publish to channels that you own and connect yourself, through each platform&rsquo;s official consent screen.</li>
            <li>Nothing is posted without your approval or a schedule you set.</li>
            <li>You can disconnect any platform at any time, and delete your account whenever you want.</li>
            <li>If a render fails on our side, the credits are returned automatically.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-950">Responsible AI content</h2>
          <p className="mt-3">
            AI-generated video comes with responsibilities. Our <Link className="text-purple-700 underline" href="/terms#acceptable-use">acceptable use rules</Link>{' '}
            prohibit deceptive or infringing content and voice cloning without consent, and ask creators to follow each platform&rsquo;s
            disclosure rules for synthetic media.
          </p>
        </section>

        <section>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-950">Get in touch</h2>
          <p className="mt-3">
            Questions, feedback or partnership ideas: <a className="text-purple-700 underline" href={`mailto:${SITE.supportEmail}`}>{SITE.supportEmail}</a> or
            visit our <Link className="text-purple-700 underline" href="/contact">contact page</Link>.
          </p>
          <p className="mt-3 text-sm text-slate-500">
            {SITE.companyName}
            {SITE.companyAddress ? ` · ${SITE.companyAddress}` : ''}
          </p>
        </section>

        <div className="pt-2">
          <Link
            href="/signup"
            className="inline-block px-6 py-3 rounded-2xl text-sm font-bold bg-gradient-to-r from-purple-600 to-pink-500 text-white shadow-md shadow-purple-200"
          >
            Try {SITE.name} free
          </Link>
        </div>
      </div>
    </MarketingShell>
  );
}
