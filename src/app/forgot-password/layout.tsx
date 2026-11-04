import type { Metadata } from 'next';
import { SITE } from '@/lib/site-config';

export const metadata: Metadata = {
  title: 'Reset your password | Tillercast',
  description: 'Request a password reset link for your Tillercast account.',
  alternates: { canonical: `${SITE.url}/forgot-password` },
  robots: { index: false, follow: true },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
