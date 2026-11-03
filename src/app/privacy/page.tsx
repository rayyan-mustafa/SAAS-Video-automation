import React from 'react';
import type { Metadata } from 'next';
import { LegalLayout, type LegalSection } from '@/components/site/LegalLayout';
import { SITE } from '@/lib/site-config';

export const metadata: Metadata = {
  title: 'Privacy Policy | Tillercast',
  description:
    'How Tillercast collects, uses and protects your data, including how we use Google / YouTube API Services, TikTok and Meta platform data.',
  alternates: { canonical: `${SITE.url}/privacy` },
};

const sections: LegalSection[] = [
  {
    id: 'who-we-are',
    title: 'Who we are',
    body: (
      <>
        <p>
          {SITE.companyName} (&ldquo;{SITE.name}&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;) operates the website at {SITE.url} and the {SITE.name} AI
          video creation and publishing service. This policy explains what personal data we collect, why, who we share it with, and the
          choices you have.
        </p>
        <p>
          Contact for privacy questions: <a href={`mailto:${SITE.privacyEmail}`}>{SITE.privacyEmail}</a>
          {SITE.companyAddress ? <> · {SITE.companyAddress}</> : null}.
        </p>
      </>
    ),
  },
  {
    id: 'data-we-collect',
    title: 'Data we collect',
    body: (
      <>
        <ul>
          <li>
            <strong>Account data:</strong> your name, email address and a password hash (passwords are hashed with scrypt; we never store
            your password in plain text).
          </li>
          <li>
            <strong>Session data:</strong> sign-in sessions, and the IP address and browser user-agent associated with a session, used for
            security and to let you review and revoke sessions.
          </li>
          <li>
            <strong>Content you create:</strong> topics, prompts, scripts, scene plans, generated audio, images, video clips, subtitles,
            thumbnails and the final videos produced in your projects, plus channel preferences you set.
          </li>
          <li>
            <strong>Voice samples (optional):</strong> if you use voice cloning, the audio recording you upload and the resulting cloned
            voice profile. You must only upload your own voice or a voice you have explicit permission to clone.
          </li>
          <li>
            <strong>Usage and billing records:</strong> your plan, credit balance, credit ledger entries, purchases and refunds. Payments
            are processed by our payment providers (Stripe and/or Polar); we do not receive or store your full card number.
          </li>
          <li>
            <strong>Connected platform data:</strong> if you connect YouTube, TikTok, Instagram or Facebook, the account identifiers and
            access tokens needed to publish for you. See the platform-specific sections below.
          </li>
          <li>
            <strong>Technical data:</strong> basic server logs (such as request time, URL and error information) needed to run and secure
            the service.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: 'how-we-use-data',
    title: 'How we use your data',
    body: (
      <>
        <ul>
          <li>To create your account, authenticate you and keep the service secure.</li>
          <li>To generate scripts, voiceovers, visuals, captions and rendered videos that you request.</li>
          <li>To publish or schedule videos to channels you have connected, only when you approve or schedule them.</li>
          <li>To operate credits, subscriptions, refunds and customer support.</li>
          <li>To detect abuse, enforce our Terms and comply with legal obligations.</li>
        </ul>
        <p>We do not sell your personal data and we do not use it for third-party advertising.</p>
      </>
    ),
  },
  {
    id: 'google-youtube',
    title: 'Google & YouTube API Services',
    body: (
      <>
        <p>
          {SITE.name} uses YouTube API Services (the YouTube Data API v3) so that you can connect your own YouTube channel. By connecting
          a channel you agree to be bound by the{' '}
          <a href="https://www.youtube.com/t/terms" target="_blank" rel="noopener noreferrer">
            YouTube Terms of Service
          </a>{' '}
          and you acknowledge the{' '}
          <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">
            Google Privacy Policy
          </a>
          .
        </p>
        <p>When you connect YouTube, we request these Google OAuth scopes:</p>
        <ul>
          <li>
            <code>youtube.upload</code>: to upload and schedule videos on your channel that you have created and approved in {SITE.name}.
          </li>
          <li>
            <code>youtube.readonly</code>: to read your channel name and identifier, and basic channel and video statistics, so we can show
            your channel analytics.
          </li>
          <li>
            <code>userinfo.email</code>: to identify which Google account you connected.
          </li>
        </ul>
        <p>
          We use this Google user data only to provide these user-facing features. Our use and transfer to any other app of information
          received from Google APIs will adhere to the{' '}
          <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer">
            Google API Services User Data Policy
          </a>
          , including the Limited Use requirements. In particular, we do not sell Google user data, do not use it for advertising, do not
          transfer it to third parties except as necessary to provide the service or to comply with law, and do not use it to develop or
          train generalized AI or machine-learning models.
        </p>
        <p>
          OAuth access and refresh tokens are encrypted at rest (AES-256-GCM) before they are stored. You can disconnect YouTube at any time
          from <strong>Settings → Publishing</strong> in {SITE.name}, and you can also revoke our access from your{' '}
          <a href="https://security.google.com/settings/security/permissions" target="_blank" rel="noopener noreferrer">
            Google security settings
          </a>
          . Disconnecting stops any further access; see our <a href="/data-deletion">data deletion page</a> for how stored data is removed.
        </p>
      </>
    ),
  },
  {
    id: 'tiktok',
    title: 'TikTok',
    body: (
      <>
        <p>
          If you choose to connect a TikTok account, we use TikTok&rsquo;s official Content Posting API to send videos you have created in{' '}
          {SITE.name} to your own TikTok account. Connection is started by you and authorised on TikTok&rsquo;s own consent screen.
        </p>
        <p>
          We store the account identifier and access tokens needed to post on your behalf, and the posting status of videos you send. We
          do not sell this data and do not use it to train AI models. You can disconnect from <strong>Settings → Publishing</strong> and
          revoke access in TikTok under your app permissions settings. Posting is subject to TikTok&rsquo;s terms, and TikTok may limit
          posts (for example, to private visibility) for apps that have not completed TikTok&rsquo;s audit.
        </p>
      </>
    ),
  },
  {
    id: 'meta',
    title: 'Instagram & Facebook (Meta)',
    body: (
      <>
        <p>
          If you choose to connect an Instagram professional account or a Facebook Page, we use Meta&rsquo;s Graph API to publish Reels or
          videos that you have created in {SITE.name} to the account or Page you select. Connection is started by you and authorised on
          Meta&rsquo;s own consent screen.
        </p>
        <p>
          We store the account or Page identifier and access token needed to publish and the status of publishing requests. We do not sell
          this data, do not use it for advertising and do not use it to train AI models. You can disconnect from{' '}
          <strong>Settings → Publishing</strong> and remove our access in your Facebook / Instagram settings under Business Integrations.
        </p>
      </>
    ),
  },
  {
    id: 'ai-processors',
    title: 'Service providers (subprocessors)',
    body: (
      <>
        <p>
          We use third-party providers to operate the service. Depending on the features you use and how the service is configured, content
          you submit (for example a script or prompt) may be sent to:
        </p>
        <ul>
          <li>Hosting and storage: Netlify (hosting) and Cloudflare (Workers AI image generation, R2 object storage).</li>
          <li>AI text generation: OpenRouter (DeepSeek and other models), Google Gemini, OpenAI.</li>
          <li>AI video / image generation: Cloudflare Workers AI, fal.ai, Luma, Runway and similar video model providers.</li>
          <li>Voice: ElevenLabs (narration and, if you use it, voice cloning) and neural text-to-speech providers.</li>
          <li>Stock media: Pexels and Pixabay (search queries only).</li>
          <li>Payments: Stripe and Polar.</li>
          <li>Publishing destinations you connect: Google / YouTube, TikTok, Meta.</li>
        </ul>
        <p>
          These providers process data only to deliver their service to us and under their own terms and privacy policies. We do not
          authorise them to use your content for advertising.
        </p>
      </>
    ),
  },
  {
    id: 'cookies',
    title: 'Cookies and local storage',
    body: (
      <p>
        We use a strictly necessary session cookie (<code>auth_session_token</code>) to keep you signed in. We do not use advertising
        cookies. See our <a href="/cookies">Cookie Policy</a> for details.
      </p>
    ),
  },
  {
    id: 'retention',
    title: 'Retention',
    body: (
      <p>
        We keep account data and your content while your account is active. When you delete your account we remove it as described on our{' '}
        <a href="/data-deletion">data deletion page</a>. Some records (for example billing and tax records, or security logs) may be kept for
        as long as the law requires or for a limited period for fraud prevention and backups.
      </p>
    ),
  },
  {
    id: 'your-rights',
    title: 'Your rights',
    body: (
      <>
        <p>
          Depending on where you live (for example under the GDPR or CCPA), you may have the right to access, correct, export or delete your
          personal data, to object to or restrict certain processing, and to withdraw consent. You can edit your profile and delete your
          account in <strong>Settings</strong>. For any other request, email{' '}
          <a href={`mailto:${SITE.privacyEmail}`}>{SITE.privacyEmail}</a> from the address on your account. You also have the right to
          complain to your local data-protection authority.
        </p>
      </>
    ),
  },
  {
    id: 'security',
    title: 'Security',
    body: (
      <p>
        We use measures such as hashed passwords, encrypted platform tokens, access checks on every project, and HTTPS. No system is
        perfectly secure, so we cannot guarantee absolute security. If you believe your account has been compromised, contact us right away.
      </p>
    ),
  },
  {
    id: 'international',
    title: 'International transfers',
    body: (
      <p>
        Our providers operate in several countries, so your data may be processed outside the country where you live. Where required, we
        rely on appropriate safeguards such as standard contractual clauses.
      </p>
    ),
  },
  {
    id: 'children',
    title: 'Children',
    body: (
      <p>
        {SITE.name} is not directed to children and is not intended for anyone under 16 (or the minimum age of digital consent in your
        country, if higher). We do not knowingly collect data from children; if you believe a child has given us data, contact us and we
        will delete it.
      </p>
    ),
  },
  {
    id: 'changes',
    title: 'Changes to this policy',
    body: (
      <p>
        We may update this policy. If we make material changes we will update the date above and, where appropriate, notify you by email or
        in the app.
      </p>
    ),
  },
  {
    id: 'contact',
    title: 'Contact us',
    body: (
      <p>
        Questions about this policy: <a href={`mailto:${SITE.privacyEmail}`}>{SITE.privacyEmail}</a>.
      </p>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <LegalLayout
      title="Privacy Policy"
      intro={
        <p>
          We built {SITE.name} so you can create and publish videos to your own channels. This policy describes what data that involves and
          how it is handled.
        </p>
      }
      sections={sections}
    />
  );
}
