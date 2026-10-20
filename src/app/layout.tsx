import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AppShell } from '@/components/AppShell';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#07080b',
};

export const metadata: Metadata = {
  title: 'AUTORA — AI Video Automation',
  description:
    'Create ready-to-publish videos with AI-powered scripts, voiceovers, visuals and captions using AUTORA.',
  keywords: [
    'AUTORA',
    'AI Video Automation',
    'AI Video Generator',
    'YouTube Automation',
    'Neural Voiceover',
    'Video Studio',
    'Content Calendar',
    'autora.live',
  ],
  authors: [{ name: 'AUTORA Team' }],
  metadataBase: new URL('https://autora.live'),
  alternates: {
    canonical: 'https://autora.live',
  },
  openGraph: {
    title: 'AUTORA — AI Video Automation',
    description:
      'Turn your ideas into ready-to-publish videos with AI-powered scripting, voiceovers, visuals, captions, and rendering.',
    type: 'website',
    url: 'https://autora.live',
    siteName: 'AUTORA',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AUTORA — AI Video Automation',
    description:
      'Turn your ideas into ready-to-publish videos with AI-powered scripting, voiceovers, visuals, captions, and rendering.',
  },
  other: {
    'fameswap-verification': 'RHGxQyVs29q0GKUj2KPw8BseWbVDXKvn',
  },
  verification: {
    google: 'google036228914f703f9d',
  },
  icons: {
    icon: '/favicon.ico',
  },
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { ToastProvider } from '@/components/Toast';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="fameswap-verification" content="RHGxQyVs29q0GKUj2KPw8BseWbVDXKvn" />
      </head>
      <body>
        <ToastProvider>
          <AppShell>{children}</AppShell>
        </ToastProvider>
      </body>
    </html>
  );
}
