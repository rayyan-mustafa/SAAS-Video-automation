import type { Metadata } from 'next';
import { SITE } from '@/lib/site-config';

const title = 'Video Templates | Tillercast';
const description =
  'Browse ready-made AI video templates for YouTube Shorts, faceless channels, explainers and news. Pick a template and start generating in Tillercast.';

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: `${SITE.url}/templates` },
  openGraph: { title, description, url: `${SITE.url}/templates`, siteName: SITE.name, type: 'website' },
};

export default function TemplatesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
