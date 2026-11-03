import React from 'react';
import Link from 'next/link';
import { FOOTER_COLUMNS, SITE } from '@/lib/site-config';

export function SiteFooter() {
  return (
    <footer className="bg-slate-950 text-slate-300" aria-label="Site footer">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 pt-14 pb-8">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-8">
          <div className="col-span-2">
            <div className="flex items-center gap-2.5">
              <span className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center text-white">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <polygon points="8 5 19 12 8 19 8 5" />
                </svg>
              </span>
              <span className="text-xl font-extrabold tracking-tight text-white">{SITE.name}</span>
            </div>
            <p className="mt-4 text-sm text-slate-400 max-w-xs leading-relaxed">
              {SITE.tagline}. Write a prompt, review the script, and publish to your own channels.
            </p>
            <p className="mt-4 text-sm">
              <a href={`mailto:${SITE.supportEmail}`} className="text-slate-200 hover:text-white underline underline-offset-4">
                {SITE.supportEmail}
              </a>
            </p>
          </div>

          {FOOTER_COLUMNS.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">{col.title}</h2>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.href + l.label}>
                    <Link href={l.href} className="text-sm text-slate-300 hover:text-white">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-12 pt-6 border-t border-slate-800 text-xs text-slate-500 space-y-2 leading-relaxed">
          <p>
            {SITE.name} uses YouTube API Services. By connecting a YouTube channel you agree to be bound by the{' '}
            <a className="underline hover:text-slate-300" href="https://www.youtube.com/t/terms" target="_blank" rel="noopener noreferrer">
              YouTube Terms of Service
            </a>{' '}
            and acknowledge the{' '}
            <a className="underline hover:text-slate-300" href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">
              Google Privacy Policy
            </a>
            . You can revoke access at any time in your{' '}
            <a className="underline hover:text-slate-300" href="https://security.google.com/settings/security/permissions" target="_blank" rel="noopener noreferrer">
              Google security settings
            </a>
            .
          </p>
          <p>
            YouTube, TikTok, Instagram, Facebook and other product names are trademarks of their respective owners. {SITE.name} is
            an independent product and is not affiliated with or endorsed by them.
          </p>
          <p>
            © {new Date().getFullYear()} {SITE.companyName}. All rights reserved.
            {SITE.companyAddress ? ` ${SITE.companyAddress}` : ''}
          </p>
        </div>
      </div>
    </footer>
  );
}
