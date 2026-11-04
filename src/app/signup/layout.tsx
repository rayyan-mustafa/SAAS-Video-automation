import type { Metadata } from 'next';
import { SITE } from '@/lib/site-config';

export const metadata: Metadata = {
  title: 'Sign up free | Tillercast',
  description: 'Create a Tillercast account and generate a free trial video. No credit card required.',
  alternates: { canonical: `${SITE.url}/signup` },
  robots: { index: true, follow: true },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
