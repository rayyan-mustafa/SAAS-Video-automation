import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { MarketingShell } from '@/components/site/MarketingShell';
import { SITE } from '@/lib/site-config';

export const metadata: Metadata = {
  title: 'Contact | Tillercast',
  description: 'Contact Tillercast support for help with your account, billing, publishing or privacy requests.',
  alternates: { canonical: `${SITE.url}/contact` },
};

export default function ContactPage() {
  return (
    <MarketingShell>
      <div className="bg-gradient-to-b from-purple-50/70 to-white border-b border-purple-100">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-14 pb-10">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-950">Contact us</h1>
          <p className="mt-4 text-lg text-slate-700 leading-relaxed">We read every message and reply by email.</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 grid gap-5 sm:grid-cols-2">
        <div className="p-6 rounded-2xl border border-purple-100 bg-white shadow-sm">
          <h2 className="text-lg font-bold text-slate-950">Support</h2>
          <p className="mt-2 text-sm text-slate-600 leading-relaxed">Account, billing, rendering or publishing questions.</p>
          <a className="mt-4 inline-block text-sm font-bold text-purple-700 underline" href={`mailto:${SITE.supportEmail}`}>
            {SITE.supportEmail}
          </a>
          {/* OWNER: confirm response time */}
          <p className="mt-3 text-xs text-slate-500">We aim to reply within 2 business days.</p>
        </div>

        <div className="p-6 rounded-2xl border border-purple-100 bg-white shadow-sm">
          <h2 className="text-lg font-bold text-slate-950">Privacy and data requests</h2>
          <p className="mt-2 text-sm text-slate-600 leading-relaxed">Access, export or deletion of your data.</p>
          <a className="mt-4 inline-block text-sm font-bold text-purple-700 underline" href={`mailto:${SITE.privacyEmail}`}>
            {SITE.privacyEmail}
          </a>
          <p className="mt-3 text-xs text-slate-500">
            See <Link className="underline" href="/data-deletion">data deletion instructions</Link> and our{' '}
            <Link className="underline" href="/privacy">Privacy Policy</Link>.
          </p>
        </div>

        <div className="sm:col-span-2 p-6 rounded-2xl bg-slate-50 border border-slate-200 text-sm text-slate-600 leading-relaxed">
          <p>
            Include the email address of your account and, for billing questions, the date of the charge. Never send your password or full
            card number.
          </p>
          <p className="mt-2">
            {SITE.companyName}
            {SITE.companyAddress ? ` · ${SITE.companyAddress}` : ''}
          </p>
        </div>
      </div>
    </MarketingShell>
  );
}
