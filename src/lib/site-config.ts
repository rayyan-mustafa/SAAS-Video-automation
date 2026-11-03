/**
 * Single source of truth for public-site identity, contact details and navigation.
 *
 * IMPORTANT before submitting to YouTube / TikTok / Meta app review:
 *  - Set NEXT_PUBLIC_SUPPORT_EMAIL to a mailbox you actually monitor (reviewers email it).
 *  - Set NEXT_PUBLIC_COMPANY_NAME / NEXT_PUBLIC_COMPANY_ADDRESS to the real operating entity.
 * Everything on the legal pages reads from here so you only change it in one place.
 */

export const SITE = {
  name: 'Tillercast',
  tagline: 'AI video automation, from idea to published video',
  /** Canonical production origin. Used for canonical URLs, sitemap and Open Graph. */
  url: 'https://tillercast.live',
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'support@tillercast.live',
  privacyEmail: process.env.NEXT_PUBLIC_PRIVACY_EMAIL || process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'privacy@tillercast.live',
  companyName: process.env.NEXT_PUBLIC_COMPANY_NAME || 'Tillercast',
  companyAddress: process.env.NEXT_PUBLIC_COMPANY_ADDRESS || '',
  /** Bump when legal copy changes materially. */
  legalLastUpdated: 'November 3, 2026',
} as const;

export interface NavLink {
  label: string;
  href: string;
  description?: string;
}

export const USE_CASE_LINKS: NavLink[] = [
  { label: 'Script to Video', href: '/use-cases/script-to-video', description: 'Paste a script, get a narrated, captioned video.' },
  { label: 'Article to Video', href: '/use-cases/article-to-video', description: 'Turn a blog post or URL into a summary video.' },
  { label: 'Faceless YouTube Channels', href: '/use-cases/faceless-youtube-channels', description: 'Run a channel without filming or editing.' },
  { label: 'YouTube Shorts Automation', href: '/use-cases/youtube-shorts-automation', description: 'Plan and publish Shorts on a schedule.' },
  { label: 'TikTok & Instagram Reels', href: '/use-cases/tiktok-instagram-reels', description: 'Vertical videos for every short-form platform.' },
];

export const PRIMARY_NAV: NavLink[] = [
  { label: 'Features', href: '/#features' },
  { label: 'Templates', href: '/templates' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'Blog', href: '/blog' },
];

export const FOOTER_COLUMNS: { title: string; links: NavLink[] }[] = [
  {
    title: 'Product',
    links: [
      { label: 'How it works', href: '/#how-it-works' },
      { label: 'Features', href: '/#features' },
      { label: 'Templates', href: '/templates' },
      { label: 'Pricing', href: '/pricing' },
      { label: 'Sign up free', href: '/signup' },
      { label: 'Log in', href: '/login' },
    ],
  },
  {
    title: 'Use cases',
    links: USE_CASE_LINKS.map(({ label, href }) => ({ label, href })),
  },
  {
    title: 'Resources',
    links: [
      { label: 'Blog', href: '/blog' },
      { label: 'Video templates', href: '/templates' },
      { label: 'YouTube hook generator', href: '/tools/youtube-hook-generator' },
      { label: 'Contact support', href: '/contact' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About', href: '/about' },
      { label: 'Contact', href: '/contact' },
      { label: 'Refund policy', href: '/refund' },
      { label: 'Data deletion', href: '/data-deletion' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Terms of Service', href: '/terms' },
      { label: 'Cookie Policy', href: '/cookies' },
      { label: 'Acceptable Use', href: '/terms#acceptable-use' },
    ],
  },
];

/**
 * Paths that are fully public marketing / legal pages (no auth, no dashboard shell).
 * Used by middleware.ts (auth bypass) and AppShell.tsx (standalone rendering).
 * Exact matches OR prefix matches (path === p || path.startsWith(p + '/')).
 */
export const PUBLIC_MARKETING_PATHS: string[] = [
  '/pricing',
  '/about',
  '/contact',
  '/privacy',
  '/terms',
  '/refund',
  '/cookies',
  '/data-deletion',
  '/use-cases',
];

export function isPublicMarketingPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return PUBLIC_MARKETING_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'));
}
