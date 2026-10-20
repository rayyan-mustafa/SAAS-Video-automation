import React from 'react';
import Link from 'next/link';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Free YouTube & Social Video Tools — AutoRA',
  description: 'Free creator tools for YouTube automation, viral hook generation, title CTR analysis, and faceless channel scaling.',
};

export default function FreeToolsIndexPage() {
  const tools = [
    {
      title: 'Viral YouTube & TikTok Hook Generator',
      slug: '/tools/youtube-hook-generator',
      badge: 'Most Popular',
      badgeColor: '#00f0ff',
      description: 'Generate retention hooks based on 5 psychological narrative frameworks that bypass YouTube 2026 algorithmic filters.',
      icon: '🎣',
    },
    {
      title: 'Faceless Channel Idea & Niche Explorer',
      slug: '/blog/google-veo-3-vs-sora-ai-video-generator-comparison-2026',
      badge: 'High CPM',
      badgeColor: '#10b981',
      description: 'Analyze top-performing RPM niches (Finance, Tech, Stoicism, AI) with calculated audience size and average RPM.',
      icon: '💎',
    },
    {
      title: 'YouTube 2026 Monetization Rules Checker',
      slug: '/blog/youtube-monetization-rules-2026-for-ai-generated-channels',
      badge: 'Compliance',
      badgeColor: '#c084fc',
      description: 'Verify if your AI video workflows meet AdSense Partner Program criteria and avoid Reused Content flags.',
      icon: '🛡️',
    },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#09090b', color: '#f4f4f5', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background: 'rgba(9, 9, 11, 0.85)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none', color: '#fff' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'linear-gradient(135deg, #00f0ff, #7000ff)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
              ▶
            </div>
            <span style={{ fontSize: '18px', fontWeight: 800, letterSpacing: '-0.02em' }}>
              Auto<span style={{ color: '#00f0ff' }}>RA</span>
            </span>
          </Link>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <Link href="/" style={{ color: '#a1a1aa', textDecoration: 'none', fontSize: '14px', fontWeight: 500 }}>
              Home
            </Link>
            <Link href="/blog" style={{ color: '#a1a1aa', textDecoration: 'none', fontSize: '14px', fontWeight: 500 }}>
              Blog
            </Link>
            <Link href="/signup" style={{
              background: '#00f0ff',
              color: '#000',
              padding: '8px 18px',
              borderRadius: '20px',
              fontSize: '13px',
              fontWeight: 700,
              textDecoration: 'none',
            }}>
              Try Free Studio ➔
            </Link>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: '960px', margin: '0 auto', padding: '60px 24px 80px' }}>
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#00f0ff', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Free Creator Tools
          </span>
          <h1 style={{ fontSize: 'clamp(32px, 5vw, 44px)', fontWeight: 800, margin: '12px 0 16px', letterSpacing: '-0.02em' }}>
            Level Up Your Social Video Content
          </h1>
          <p style={{ color: '#a1a1aa', fontSize: '16px', maxWidth: '580px', margin: '0 auto' }}>
            Free browser tools built for YouTube automation channels, TikTok creators, and Instagram Reels marketers.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '60px' }}>
          {tools.map((t, idx) => (
            <Link
              key={idx}
              href={t.slug}
              style={{
                textDecoration: 'none',
                background: '#121215',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '14px',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                transition: 'transform 0.2s, border-color 0.2s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <span style={{ fontSize: '32px' }}>{t.icon}</span>
                <span style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '12px',
                  background: `${t.badgeColor}15`,
                  color: t.badgeColor,
                  border: `1px solid ${t.badgeColor}30`
                }}>
                  {t.badge}
                </span>
              </div>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#fff', marginBottom: '8px' }}>
                {t.title}
              </h2>
              <p style={{ color: '#a1a1aa', fontSize: '13.5px', lineHeight: 1.6, margin: '0 0 20px', flex: 1 }}>
                {t.description}
              </p>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#00f0ff', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                Use Tool Free ➔
              </span>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
