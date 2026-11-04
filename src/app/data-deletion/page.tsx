import React from 'react';
import type { Metadata } from 'next';
import { LegalLayout, type LegalSection } from '@/components/site/LegalLayout';
import { SITE } from '@/lib/site-config';

export const metadata: Metadata = {
  title: 'Data Deletion Instructions | Tillercast',
  description: 'How to delete your Tillercast account and data, and how to revoke Tillercast access on YouTube, TikTok, Instagram and Facebook.',
  alternates: { canonical: `${SITE.url}/data-deletion` },
};

const sections: LegalSection[] = [
  {
    id: 'delete-in-app',
    title: 'Delete your account in the app',
    body: (
      <>
        <ol>
          <li>Sign in to {SITE.name}.</li>
          <li>
            Open <strong>Settings → Account</strong>.
          </li>
          <li>
            Click <strong>Delete Account</strong>, then confirm with <strong>Yes, Delete My Account</strong>.
          </li>
        </ol>
        <p>
          Deleting your account signs you out of all sessions and removes your account record and the data directly linked to it, such as
          sessions, voice profiles and workspace membership.
        </p>
      </>
    ),
  },
  {
    id: 'what-is-deleted',
    title: 'What is deleted and what may be kept',
    body: (
      <>
        {/* OWNER: confirm the 30-day timeframe. Note: DELETE /api/customer/me removes the users row and cascades only some tables;
            projects, channels and platform connection rows are NOT cascaded by the database, so they are purged in the follow-up
            process described below. */}
        <p>
          After you delete your account, we remove your projects, generated media (audio, images, clips, subtitles, thumbnails and final
          videos), channel settings and stored platform connections and tokens within 30 days. Encrypted backups may keep copies for a short
          additional period until they rotate out.
        </p>
        <p>
          We may keep a limited record of billing transactions and security logs where the law requires it or for fraud prevention. Videos
          you already published to YouTube, TikTok, Instagram or Facebook stay on those platforms; delete them there if you wish.
        </p>
      </>
    ),
  },
  {
    id: 'disconnect',
    title: 'Disconnect a platform without deleting your account',
    body: (
      <ol>
        <li>
          Open <strong>Settings → Publishing</strong> in {SITE.name}.
        </li>
        <li>
          Choose <strong>Disconnect</strong> for the platform. We stop using the connection and remove the stored token.
        </li>
      </ol>
    ),
  },
  {
    id: 'revoke',
    title: 'Revoke access from the platform itself',
    body: (
      <ul>
        <li>
          <strong>YouTube / Google:</strong> open{' '}
          <a href="https://security.google.com/settings/security/permissions" target="_blank" rel="noopener noreferrer">
            Google security settings
          </a>
          , find {SITE.name} and choose <em>Remove access</em>.
        </li>
        <li>
          <strong>TikTok:</strong> in TikTok go to Settings and privacy → Security and permissions → Apps and services (wording may vary),
          select {SITE.name} and remove access.
        </li>
        <li>
          <strong>Instagram / Facebook:</strong> in your Facebook account go to Settings → Business Integrations (or Apps and Websites),
          select {SITE.name} and choose <em>Remove</em>. You can also ask us to delete data we received from Meta using the steps below.
        </li>
      </ul>
    ),
  },
  {
    id: 'email-request',
    title: 'Request deletion by email',
    body: (
      <p>
        Send a request from the email address on your account to <a href={`mailto:${SITE.privacyEmail}`}>{SITE.privacyEmail}</a> with the
        subject &ldquo;Data deletion request&rdquo;. If you connected Instagram or Facebook and no longer have a {SITE.name} account, include the
        name of the account or Page you connected so we can locate the data. We will confirm by email once deletion is complete.
      </p>
    ),
  },
];

export default function DataDeletionPage() {
  return (
    <LegalLayout
      title="Data Deletion Instructions"
      intro={<p>You control your data. These are the ways to delete your {SITE.name} data or end our access to your connected accounts.</p>}
      sections={sections}
    />
  );
}
