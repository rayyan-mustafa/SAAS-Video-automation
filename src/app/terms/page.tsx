import React from 'react';
import type { Metadata } from 'next';
import { LegalLayout, type LegalSection } from '@/components/site/LegalLayout';
import { SITE } from '@/lib/site-config';

export const metadata: Metadata = {
  title: 'Terms of Service | Tillercast',
  description: 'The terms that govern your use of Tillercast, including acceptable use, credits, billing and the free trial.',
  alternates: { canonical: `${SITE.url}/terms` },
};

const sections: LegalSection[] = [
  {
    id: 'agreement',
    title: 'Agreement',
    body: (
      <p>
        These Terms govern your access to and use of {SITE.name} ({SITE.url}), operated by {SITE.companyName}. By creating an account or
        using the service you agree to these Terms and our <a href="/privacy">Privacy Policy</a>. If you do not agree, do not use the
        service.
      </p>
    ),
  },
  {
    id: 'service',
    title: 'The service',
    body: (
      <p>
        {SITE.name} helps you generate scripts, voiceovers, visuals, captions and rendered videos with AI, and publish or schedule them to
        social channels that you connect. AI output can be inaccurate or unexpected; you are responsible for reviewing it before you
        publish.
      </p>
    ),
  },
  {
    id: 'accounts',
    title: 'Accounts',
    body: (
      <p>
        You must provide accurate information, keep your credentials secure and be responsible for activity under your account. You must be
        at least 16 years old (or the age of digital consent in your country). Tell us promptly if you suspect unauthorised use.
      </p>
    ),
  },
  {
    id: 'acceptable-use',
    title: 'Acceptable use',
    body: (
      <>
        <p>You agree not to use {SITE.name} to create, upload or publish content that:</p>
        <ul>
          <li>infringes copyright, trademarks, privacy or other rights of anyone;</li>
          <li>is deceptive, impersonates a real person or organisation, or presents synthetic media as real in a misleading way;</li>
          <li>is spam, bulk low-value repetitive content, or manipulates engagement or views;</li>
          <li>is unlawful, hateful, harassing, sexually exploitative, or promotes violence or self-harm;</li>
          <li>clones or imitates a voice without the explicit consent of the person whose voice it is.</li>
        </ul>
        <p>You also agree to:</p>
        <ul>
          <li>
            follow the terms and policies of every platform you publish to, including the{' '}
            <a href="https://www.youtube.com/t/terms" target="_blank" rel="noopener noreferrer">
              YouTube Terms of Service
            </a>
            , TikTok&rsquo;s terms and Meta&rsquo;s terms and platform policies;
          </li>
          <li>disclose AI-generated or synthetic content where a platform or law requires it;</li>
          <li>not attempt to disrupt, reverse engineer or overload the service, or bypass credit or plan limits.</li>
        </ul>
        <p>
          You are solely responsible for the content you create and publish with {SITE.name}. We may remove content or suspend accounts that
          violate these rules.
        </p>
      </>
    ),
  },
  {
    id: 'free-trial',
    title: 'Free trial',
    body: (
      <p>
        New accounts can generate one free trial video. Trial exports carry a {SITE.name} watermark. Further generation, watermark-free
        exports and the features of paid plans require a paid plan or credits. We may change or end the free trial at any time.
      </p>
    ),
  },
  {
    id: 'credits-billing',
    title: 'Credits and billing',
    body: (
      <>
        <p>
          Paid plans include a monthly allowance of credits. Different generation options (for example AI video clips or premium voices)
          use different amounts of credits, and the estimated cost is shown before you generate. Additional credit packs may be purchased.
          Credits have no cash value and are not transferable.
        </p>
        <p>
          Prices are shown on our <a href="/pricing">pricing page</a>. Payments are processed by our payment providers (Stripe and/or
          Polar). Subscriptions renew automatically each billing period until cancelled. You authorise us to charge the payment method you
          provide.
        </p>
      </>
    ),
  },
  {
    id: 'cancellation',
    title: 'Cancellation and refunds',
    body: (
      <p>
        You can cancel your subscription at any time; it stays active until the end of the paid period. Credits are automatically refunded
        when a render fails; see our <a href="/refund">Refund Policy</a> for details, including how subscription fees are handled.
      </p>
    ),
  },
  {
    id: 'ownership',
    title: 'Your content and ownership',
    body: (
      <>
        <p>
          You keep your rights in the prompts, scripts and materials you provide. Subject to these Terms and to the terms of the third-party
          models and media we use, you may use the videos you generate, including commercially on paid plans. You grant us a limited licence
          to host, process and display your content solely to operate the service for you.
        </p>
        <p>
          Because AI output may resemble existing material, we do not guarantee that it is free from third-party rights. The {SITE.name}
          name, logo and software remain our property.
        </p>
      </>
    ),
  },
  {
    id: 'third-party',
    title: 'Third-party services',
    body: (
      <p>
        The service relies on third parties (AI model providers, voice providers, stock media, payment processors and the social platforms
        you connect). Their availability and terms are outside our control, and platforms may reject, restrict or remove content or change
        their APIs at any time.
      </p>
    ),
  },
  {
    id: 'disclaimers',
    title: 'Disclaimers',
    body: (
      <p>
        The service is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo; without warranties of any kind to the extent permitted by
        law. We do not promise any particular views, revenue, monetisation approval or platform outcome.
      </p>
    ),
  },
  {
    id: 'liability',
    title: 'Limitation of liability',
    body: (
      <p>
        To the extent permitted by law, {SITE.companyName} will not be liable for indirect, incidental, special or consequential damages, or
        for lost profits, revenue or data, and our total liability for any claim is limited to the amount you paid us in the 12 months
        before the claim. Nothing in these Terms limits liability that cannot be limited by law.
      </p>
    ),
  },
  {
    id: 'termination',
    title: 'Suspension and termination',
    body: (
      <p>
        You may stop using the service and delete your account at any time (see <a href="/data-deletion">data deletion</a>). We may suspend
        or terminate access if you breach these Terms, create risk or legal exposure, or fail to pay.
      </p>
    ),
  },
  {
    id: 'law',
    title: 'Governing law',
    body: (
      <p>
        These Terms are governed by the laws applicable to {SITE.companyName}&rsquo;s place of establishment, without regard to conflict of
        law rules, and subject to any mandatory consumer rights in your country of residence.
      </p>
    ),
  },
  {
    id: 'changes',
    title: 'Changes to these Terms',
    body: (
      <p>
        We may update these Terms. If changes are material we will update the date above and, where appropriate, notify you. Continued use
        after changes take effect means you accept them.
      </p>
    ),
  },
  {
    id: 'contact',
    title: 'Contact',
    body: (
      <p>
        Questions about these Terms: <a href={`mailto:${SITE.supportEmail}`}>{SITE.supportEmail}</a>.
      </p>
    ),
  },
];

export default function TermsPage() {
  return <LegalLayout title="Terms of Service" sections={sections} />;
}
