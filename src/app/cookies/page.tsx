import React from 'react';
import type { Metadata } from 'next';
import { LegalLayout, type LegalSection } from '@/components/site/LegalLayout';
import { SITE } from '@/lib/site-config';

export const metadata: Metadata = {
  title: 'Cookie Policy | Tillercast',
  description: 'Tillercast uses only essential cookies to keep you signed in. No advertising cookies.',
  alternates: { canonical: `${SITE.url}/cookies` },
};

const sections: LegalSection[] = [
  {
    id: 'what-we-use',
    title: 'Cookies we use',
    body: (
      <>
        <p>{SITE.name} uses only strictly necessary cookies:</p>
        <ul>
          <li>
            <code>auth_session_token</code>: keeps you signed in to your account. It is an HTTP session cookie set when you log in and
            cleared when you log out.
          </li>
          <li>
            <code>admin_session_token</code>: used only by {SITE.name} administrators to access the admin area. Ordinary visitors and
            customers never receive it.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: 'no-ads',
    title: 'No advertising or tracking cookies',
    body: (
      <p>
        We do not set advertising cookies or sell data to advertisers. If we add analytics in the future, we will update this page and, where
        required, ask for your consent first.
      </p>
    ),
  },
  {
    id: 'local-storage',
    title: 'Local storage',
    body: (
      <p>
        Your browser may store small preferences needed to run the app interface. These stay on your device and are not used for advertising.
      </p>
    ),
  },
  {
    id: 'control',
    title: 'Your choices',
    body: (
      <p>
        You can block or delete cookies in your browser settings, but you will not be able to stay signed in without the session cookie. Third
        parties you connect (for example Google, TikTok or Meta) set their own cookies on their own sites under their own policies.
      </p>
    ),
  },
  {
    id: 'contact',
    title: 'Contact',
    body: (
      <p>
        Questions: <a href={`mailto:${SITE.privacyEmail}`}>{SITE.privacyEmail}</a>. See also our <a href="/privacy">Privacy Policy</a>.
      </p>
    ),
  },
];

export default function CookiesPage() {
  return <LegalLayout title="Cookie Policy" sections={sections} />;
}
