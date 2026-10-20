import React from 'react';
import Link from 'next/link';
import { Metadata } from 'next';
import { getAllBlogPosts, getFeaturedBlogPost } from '@/lib/blog/posts';

export const metadata: Metadata = {
  title: 'AUTORA Blog — AI Video Automation, YouTube Growth & Faceless Channels',
  description: 'Master AI video creation, YouTube Shorts automation, high-CPM faceless channel growth, and generative AI content workflows with AUTORA.',
  keywords: [
    'AI Video Automation',
    'YouTube Shorts Automation',
    'Faceless YouTube Channels',
    'AI Video Generator',
    'YouTube Growth Guide',
    'High CPM Niches',
    'AUTORA Blog',
  ],
  openGraph: {
    title: 'AUTORA Blog — AI Video Automation & YouTube Growth',
    description: 'Master AI video creation, YouTube Shorts automation, and faceless channel growth.',
    url: 'https://autora.live/blog',
    siteName: 'AUTORA.LIVE',
    type: 'website',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80',
        width: 1200,
        height: 630,
        alt: 'AUTORA Blog',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AUTORA Blog — AI Video Automation & YouTube Growth',
    description: 'Master AI video creation, YouTube Shorts automation, and faceless channel growth.',
    images: ['https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80'],
  },
  alternates: {
    canonical: 'https://autora.live/blog',
  },
};

export default function BlogIndexPage() {
  const posts = getAllBlogPosts();
  const featuredPost = getFeaturedBlogPost();
  const regularPosts = posts.filter((p) => p.slug !== featuredPost.slug);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: 'AUTORA Blog — AI Video Automation & YouTube Growth',
    url: 'https://autora.live/blog',
    description: 'Master AI video creation, YouTube Shorts automation, and faceless channel growth.',
    publisher: {
      '@type': 'Organization',
      name: 'AUTORA.LIVE',
      logo: {
        '@type': 'ImageObject',
        url: 'https://autora.live/icon.svg',
      },
    },
    blogPost: posts.map((post) => ({
      '@type': 'BlogPosting',
      headline: post.title,
      description: post.excerpt,
      url: `https://autora.live/blog/${post.slug}`,
      datePublished: post.publishDate,
      author: {
        '@type': 'Person',
        name: post.author.name,
      },
    })),
  };

  return (
    <div style={{ background: '#09090b', color: '#f4f4f5', minHeight: '100vh', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Structured Data for Google */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Header / Navigation */}
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background: 'rgba(9, 9, 11, 0.85)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
      }}>
        <div style={{ maxWidth: '1240px', margin: '0 auto', padding: '0 24px', height: '68px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', color: '#fff' }}>
            <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 16px rgba(168, 85, 247, 0.4)' }}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polygon points="10 8 16 12 10 16 10 8" fill="currentColor"></polygon>
              </svg>
            </div>
            <span style={{ fontSize: '20px', fontWeight: 800, letterSpacing: '-0.02em', color: '#ffffff' }}>
              Auto<span style={{ background: 'linear-gradient(135deg, #a855f7, #ec4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>RA</span>
            </span>
          </Link>

          <nav style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <Link href="/" style={{ color: '#a1a1aa', textDecoration: 'none', fontSize: '14px', fontWeight: 500 }}>Home</Link>
            <Link href="/blog" style={{ color: '#ffffff', textDecoration: 'none', fontSize: '14px', fontWeight: 600 }}>Blog</Link>
            <Link href="/templates" style={{ color: '#a1a1aa', textDecoration: 'none', fontSize: '14px', fontWeight: 500 }}>Templates</Link>
            <Link href="/pricing" style={{ color: '#a1a1aa', textDecoration: 'none', fontSize: '14px', fontWeight: 500 }}>Pricing</Link>
            <Link href="/signup" style={{ background: '#ffffff', color: '#09090b', padding: '8px 18px', borderRadius: '20px', fontSize: '13px', fontWeight: 700, textDecoration: 'none' }}>
              Start Free ➔
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Container */}
      <main style={{ maxWidth: '1240px', margin: '0 auto', padding: '48px 24px 80px' }}>
        
        {/* Blog Hero Section */}
        <div style={{ textAlign: 'center', maxWidth: '800px', margin: '0 auto 56px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 14px', borderRadius: '9999px', background: 'rgba(168, 85, 247, 0.12)', border: '1px solid rgba(168, 85, 247, 0.3)', color: '#c084fc', fontSize: '13px', fontWeight: 600, marginBottom: '20px' }}>
            ✨ AUTORA Content Lab & SEO Hub
          </div>
          <h1 style={{ fontSize: 'clamp(2.2rem, 5vw, 3.4rem)', fontWeight: 800, lineHeight: 1.15, letterSpacing: '-0.03em', marginBottom: '20px', color: '#ffffff' }}>
            AI Video Automation & <span style={{ background: 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>YouTube Growth</span>
          </h1>
          <p style={{ fontSize: '17px', color: '#a1a1aa', lineHeight: 1.6, margin: 0 }}>
            Master faceless YouTube channels, generative video AI, high-CPM niches, and automated daily publishing strategies.
          </p>
        </div>

        {/* Featured Post Card */}
        {featuredPost && (
          <div style={{ marginBottom: '64px' }}>
            <Link href={`/blog/${featuredPost.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
              <div style={{
                position: 'relative',
                borderRadius: '24px',
                overflow: 'hidden',
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                gap: '0',
                transition: 'all 0.3s ease',
              }}>
                <div style={{ position: 'relative', minHeight: '340px', overflow: 'hidden' }}>
                  <img
                    src={featuredPost.coverImage}
                    alt={featuredPost.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                  <div style={{ position: 'absolute', top: '20px', left: '20px', background: featuredPost.gradient, color: '#fff', fontSize: '12px', fontWeight: 700, padding: '4px 12px', borderRadius: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Featured Guide
                  </div>
                </div>

                <div style={{ padding: '40px 36px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', fontSize: '13px', color: '#a1a1aa' }}>
                    <span style={{ color: '#c084fc', fontWeight: 600 }}>{featuredPost.category}</span>
                    <span>•</span>
                    <span>{featuredPost.readTime}</span>
                    <span>•</span>
                    <span>{featuredPost.publishDate}</span>
                  </div>

                  <h2 style={{ fontSize: '26px', fontWeight: 800, color: '#ffffff', lineHeight: 1.3, marginBottom: '16px', letterSpacing: '-0.02em' }}>
                    {featuredPost.title}
                  </h2>

                  <p style={{ fontSize: '15px', color: '#a1a1aa', lineHeight: 1.6, marginBottom: '24px' }}>
                    {featuredPost.excerpt}
                  </p>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '20px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <img src={featuredPost.author.avatar} alt={featuredPost.author.name} style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }} />
                      <div>
                        <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#fff' }}>{featuredPost.author.name}</div>
                        <div style={{ fontSize: '12px', color: '#71717a' }}>{featuredPost.author.role}</div>
                      </div>
                    </div>

                    <span style={{ color: '#c084fc', fontWeight: 700, fontSize: '14px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      Read Article ➔
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          </div>
        )}

        {/* Section Heading */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
          <h3 style={{ fontSize: '22px', fontWeight: 700, color: '#ffffff', margin: 0 }}>
            Latest Articles & Tutorials
          </h3>
          <span style={{ fontSize: '14px', color: '#71717a' }}>
            Showing {regularPosts.length} posts
          </span>
        </div>

        {/* Blog Post Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '28px', marginBottom: '80px' }}>
          {regularPosts.map((post) => (
            <Link key={post.slug} href={`/blog/${post.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
              <div style={{
                borderRadius: '20px',
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                transition: 'transform 0.2s ease, border-color 0.2s ease',
              }}>
                <div style={{ position: 'relative', height: '200px', overflow: 'hidden' }}>
                  <img src={post.coverImage} alt={post.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  <div style={{ position: 'absolute', top: '14px', left: '14px', background: 'rgba(9, 9, 11, 0.85)', backdropFilter: 'blur(8px)', color: '#c084fc', fontSize: '11.5px', fontWeight: 700, padding: '4px 10px', borderRadius: '8px', border: '1px solid rgba(192, 132, 252, 0.3)' }}>
                    {post.category}
                  </div>
                </div>

                <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
                  <div style={{ fontSize: '12px', color: '#71717a', marginBottom: '12px', display: 'flex', gap: '8px' }}>
                    <span>{post.publishDate}</span>
                    <span>•</span>
                    <span>{post.readTime}</span>
                  </div>

                  <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#ffffff', lineHeight: 1.4, marginBottom: '12px', letterSpacing: '-0.01em' }}>
                    {post.title}
                  </h3>

                  <p style={{ fontSize: '14px', color: '#a1a1aa', lineHeight: 1.6, marginBottom: '20px', flexGrow: 1 }}>
                    {post.excerpt}
                  </p>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '16px', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <img src={post.author.avatar} alt={post.author.name} style={{ width: '26px', height: '26px', borderRadius: '50%', objectFit: 'cover' }} />
                      <span style={{ fontSize: '12.5px', color: '#d4d4d8', fontWeight: 500 }}>{post.author.name}</span>
                    </div>

                    <span style={{ color: '#c084fc', fontSize: '13px', fontWeight: 600 }}>Read ➔</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* High-Converting Bottom CTA Box */}
        <div style={{
          borderRadius: '28px',
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(168, 85, 247, 0.15) 100%)',
          border: '1px solid rgba(168, 85, 247, 0.3)',
          padding: '56px 36px',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <h2 style={{ fontSize: '32px', fontWeight: 800, color: '#ffffff', marginBottom: '16px', letterSpacing: '-0.02em' }}>
            Ready to Automate Your YouTube Channel?
          </h2>
          <p style={{ fontSize: '16px', color: '#a1a1aa', maxWidth: '600px', margin: '0 auto 32px', lineHeight: 1.6 }}>
            Join thousands of creators using AUTORA to generate 30 days of high-retention AI videos, voiceovers, and photorealistic visuals on autopilot.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <Link href="/signup" style={{
              background: '#ffffff',
              color: '#09090b',
              padding: '14px 32px',
              borderRadius: '24px',
              fontSize: '15px',
              fontWeight: 700,
              textDecoration: 'none',
              boxShadow: '0 0 32px rgba(255, 255, 255, 0.25)'
            }}>
              Start Free Trial ➔
            </Link>
            <Link href="/templates" style={{
              background: 'rgba(255, 255, 255, 0.05)',
              color: '#ffffff',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              padding: '14px 28px',
              borderRadius: '24px',
              fontSize: '15px',
              fontWeight: 600,
              textDecoration: 'none'
            }}>
              Explore Video Templates
            </Link>
          </div>
        </div>

      </main>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', padding: '36px 24px', textAlign: 'center', color: '#71717a', fontSize: '14px' }}>
        <p style={{ margin: 0 }}>© 2026 AUTORA.LIVE — All Rights Reserved. Empowering AI Content Creators Worldwide.</p>
      </footer>
    </div>
  );
}
