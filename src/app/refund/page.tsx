import React from 'react';
import type { Metadata } from 'next';
import { LegalLayout, type LegalSection } from '@/components/site/LegalLayout';
import { SITE } from '@/lib/site-config';

export const metadata: Metadata = {
  title: 'Refund Policy | Tillercast',
  description: 'How Tillercast refunds credits for failed renders and how subscription refunds are handled.',
  alternates: { canonical: `${SITE.url}/refund` },
};

const sections: LegalSection[] = [
  {
    id: 'failed-renders',
    title: 'Automatic credit refunds for failed renders',
    body: (
      <>
        <p>
          If a generation step or a render fails on our side (for example a provider error or a failed FFmpeg composition), the credits
          charged for the failed work are automatically returned to your credit balance. You do not need to request this.
        </p>
        <p>
          If a scene is delivered using a lower-cost option than the one planned, the difference in credits is returned to your balance as
          well.
        </p>
      </>
    ),
  },
  {
    id: 'what-is-not-refunded',
    title: 'What is not refunded automatically',
    body: (
      <ul>
        <li>Videos that rendered successfully but that you do not like, which you can regenerate or edit using credits.</li>
        <li>Credits that expired or were used on completed output.</li>
        <li>Platform decisions after publishing, such as a platform removing or restricting a video.</li>
      </ul>
    ),
  },
  {
    id: 'subscriptions',
    title: 'Subscription fees',
    body: (
      <>
        {/* OWNER: confirm policy */}
        <p>
          Subscription fees and credit-pack purchases are non-refundable except where required by law or where we billed you in error. If
          you were charged incorrectly, contact us within 14 days of the charge at{' '}
          <a href={`mailto:${SITE.supportEmail}`}>{SITE.supportEmail}</a> and we will review it.
        </p>
        <p>
          You can cancel at any time. Cancellation stops future renewals; your plan remains active until the end of the paid period.
        </p>
      </>
    ),
  },
  {
    id: 'how-to-request',
    title: 'How to contact us about billing',
    body: (
      <p>
        Email <a href={`mailto:${SITE.supportEmail}`}>{SITE.supportEmail}</a> from your account email with the date of the charge and a short
        description of the problem. Refunds that are approved are returned to the original payment method through our payment provider.
      </p>
    ),
  },
];

export default function RefundPage() {
  return <LegalLayout title="Refund Policy" sections={sections} />;
}
