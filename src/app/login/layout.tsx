import type { Metadata } from 'next';
import { SITE } from '@/lib/site-config';

export const metadata: Metadata = {
  title: 'Log in | Tillercast',
  description: 'Sign in to your Tillercast account.',
  alternates: { canonical: `${SITE.url}/login` },
  robots: { index: true, follow: true },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
