import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { getBlogPostBySlug, getAllBlogPosts } from '@/lib/blog/posts';

interface Props {
  params: {
    slug: string;
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = getBlogPostBySlug(params.slug);
  if (!post) {
    return {
      title: 'Article Not Found — AUTORA Blog',
    };
  }

  return {
    title: `${post.seoTitle || post.title} | AUTORA Blog`,
    description: post.seoDescription || post.excerpt,
    keywords: post.tags,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      url: `https://autora.live/blog/${post.slug}`,
      siteName: 'AUTORA.LIVE',
      type: 'article',
      publishedTime: post.publishDate,
      authors: [post.author.name],
      images: [
        {
          url: post.coverImage,
          width: 1200,
          height: 630,
          alt: post.title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.excerpt,
      images: [post.coverImage],
    },
    alternates: {
      canonical: `https://autora.live/blog/${post.slug}`,
    },
  };
}

export default function BlogPostDetailPage({ params }: Props) {
  const post = getBlogPostBySlug(params.slug);

  if (!post) {
    notFound();
  }

  const allPosts = getAllBlogPosts();
  const relatedPosts = allPosts.filter((p) => p.slug !== post.slug).slice(0, 3);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt,
    image: post.coverImage,
    datePublished: post.publishDate,
    author: {
      '@type': 'Person',
      name: post.author.name,
      jobTitle: post.author.role,
    },
    publisher: {
      '@type': 'Organization',
      name: 'AUTORA.LIVE',
      logo: {
        '@type': 'ImageObject',
        url: 'https://autora.live/icon.svg',
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `https://autora.live/blog/${post.slug}`,
    },
  };

  // Convert basic markdown formatting into HTML nodes
  const renderFormattedContent = (content: string) => {
    const lines = content.trim().split('\n');
    const elements: React.ReactNode[] = [];
    let inList = false;
    let listItems: React.ReactNode[] = [];

    const flushList = (keyPrefix: string) => {
      if (inList && listItems.length > 0) {
        elements.push(
          <ul key={`ul-${keyPrefix}`} style={{ paddingLeft: '24px', margin: '0 0 24px', color: '#d4d4d8', lineHeight: 1.7 }}>
            {listItems}
          </ul>
        );
        listItems = [];
        inList = false;
      }
    };

    lines.forEach((line, idx) => {
      const trimmed = line.trim();

      if (!trimmed) {
        flushList(`${idx}`);
        return;
      }

      // H2 Headings
      if (trimmed.startsWith('## ')) {
        flushList(`${idx}`);
        elements.push(
          <h2 key={`h2-${idx}`} style={{ fontSize: '24px', fontWeight: 800, color: '#ffffff', margin: '40px 0 16px', letterSpacing: '-0.02em', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '12px' }}>
            {trimmed.replace('## ', '')}
          </h2>
        );
        return;
      }

      // H3 Headings
      if (trimmed.startsWith('### ')) {
        flushList(`${idx}`);
        elements.push(
          <h3 key={`h3-${idx}`} style={{ fontSize: '19px', fontWeight: 700, color: '#c084fc', margin: '28px 0 12px' }}>
            {trimmed.replace('### ', '')}
          </h3>
        );
        return;
      }

      // Blockquotes
      if (trimmed.startsWith('> ')) {
        flushList(`${idx}`);
        elements.push(
          <blockquote key={`quote-${idx}`} style={{
            margin: '24px 0',
            padding: '16px 20px',
            background: 'rgba(168, 85, 247, 0.08)',
            borderLeft: '4px solid #a855f7',
            borderRadius: '0 12px 12px 0',
            color: '#e4e4e7',
            fontSize: '15.5px',
            fontStyle: 'italic',
            lineHeight: 1.6
          }}>
            {trimmed.replace('> ', '').replace(/\*\*(.*?)\*\*/g, '$1')}
          </blockquote>
        );
        return;
      }

      // Unordered Lists
      if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
        inList = true;
        const itemText = trimmed.replace(/^[\*\-]\s+/, '');
        listItems.push(
          <li key={`li-${idx}`} style={{ marginBottom: '8px' }}>
            {itemText.split(/(\*\*.*?\*\*)/).map((part, pIdx) => {
              if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={pIdx} style={{ color: '#ffffff' }}>{part.slice(2, -2)}</strong>;
              }
              return part;
            })}
          </li>
        );
        return;
      }

      // Code Blocks
      if (trimmed.startsWith('```')) {
        flushList(`${idx}`);
        return;
      }

      // Code Lines
      if (trimmed.includes('const ') || trimmed.includes('// Example')) {
        flushList(`${idx}`);
        elements.push(
          <pre key={`code-${idx}`} style={{ background: '#18181b', border: '1px solid rgba(255,255,255,0.1)', padding: '16px', borderRadius: '12px', overflowX: 'auto', fontSize: '13.5px', color: '#a7f3d0', fontFamily: 'monospace', margin: '20px 0' }}>
            <code>{trimmed}</code>
          </pre>
        );
        return;
      }

      // Regular Paragraphs
      flushList(`${idx}`);
      elements.push(
        <p key={`p-${idx}`} style={{ fontSize: '16.5px', color: '#d4d4d8', lineHeight: 1.75, margin: '0 0 20px' }}>
          {trimmed.split(/(\*\*.*?\*\*|\[.*?\]\(.*?\))/).map((part, pIdx) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return <strong key={pIdx} style={{ color: '#ffffff' }}>{part.slice(2, -2)}</strong>;
            }
            const linkMatch = part.match(/^\[(.*?)\]\((.*?)\)$/);
            if (linkMatch) {
              return <Link key={pIdx} href={linkMatch[2]} style={{ color: '#c084fc', textDecoration: 'underline' }}>{linkMatch[1]}</Link>;
            }
            return part;
          })}
        </p>
      );
    });

    flushList('final');
    return elements;
  };

  return (
    <div style={{ background: '#09090b', color: '#f4f4f5', minHeight: '100vh', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Article Schema for Search Engines */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Navigation Bar */}
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
            <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polygon points="10 8 16 12 10 16 10 8" fill="currentColor"></polygon>
              </svg>
            </div>
            <span style={{ fontSize: '20px', fontWeight: 800, color: '#ffffff' }}>
              Auto<span style={{ background: 'linear-gradient(135deg, #a855f7, #ec4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>RA</span>
            </span>
          </Link>

          <nav style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <Link href="/" style={{ color: '#a1a1aa', textDecoration: 'none', fontSize: '14px', fontWeight: 500 }}>Home</Link>
            <Link href="/blog" style={{ color: '#c084fc', textDecoration: 'none', fontSize: '14px', fontWeight: 600 }}>Blog</Link>
            <Link href="/signup" style={{ background: '#ffffff', color: '#09090b', padding: '8px 18px', borderRadius: '20px', fontSize: '13px', fontWeight: 700, textDecoration: 'none' }}>
              Start Free ➔
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Container */}
      <main style={{ maxWidth: '900px', margin: '0 auto', padding: '40px 24px 80px' }}>
        
        {/* Breadcrumb Navigation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#71717a', marginBottom: '24px' }}>
          <Link href="/" style={{ color: '#a1a1aa', textDecoration: 'none' }}>Home</Link>
          <span>/</span>
          <Link href="/blog" style={{ color: '#a1a1aa', textDecoration: 'none' }}>Blog</Link>
          <span>/</span>
          <span style={{ color: '#c084fc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '300px' }}>{post.title}</span>
        </div>

        {/* Article Category Badge */}
        <div style={{ display: 'inline-block', background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', fontSize: '12.5px', fontWeight: 700, padding: '4px 12px', borderRadius: '12px', border: '1px solid rgba(168, 85, 247, 0.3)', marginBottom: '16px' }}>
          {post.category}
        </div>

        {/* Article Title */}
        <h1 style={{ fontSize: 'clamp(2rem, 4.5vw, 3rem)', fontWeight: 800, color: '#ffffff', lineHeight: 1.2, letterSpacing: '-0.02em', marginBottom: '24px' }}>
          {post.title}
        </h1>

        {/* Author & Meta Row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '24px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', marginBottom: '36px', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img src={post.author.avatar} alt={post.author.name} style={{ width: '42px', height: '42px', borderRadius: '50%', objectFit: 'cover' }} />
            <div>
              <div style={{ fontSize: '14.5px', fontWeight: 600, color: '#ffffff' }}>{post.author.name}</div>
              <div style={{ fontSize: '12.5px', color: '#71717a' }}>{post.author.role}</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '13.5px', color: '#a1a1aa' }}>
            <span>📅 {post.publishDate}</span>
            <span>•</span>
            <span>⏱️ {post.readTime}</span>
          </div>
        </div>

        {/* Featured Cover Image */}
        <div style={{ borderRadius: '20px', overflow: 'hidden', marginBottom: '40px', border: '1px solid rgba(255, 255, 255, 0.1)', maxHeight: '450px' }}>
          <img src={post.coverImage} alt={post.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        </div>

        {/* Formatted Article Content */}
        <article style={{ marginBottom: '60px' }}>
          {renderFormattedContent(post.content)}
        </article>

        {/* Embedded High-Converting SaaS Banner */}
        <div style={{
          borderRadius: '24px',
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(168, 85, 247, 0.18) 100%)',
          border: '1px solid rgba(168, 85, 247, 0.3)',
          padding: '40px 32px',
          textAlign: 'center',
          marginBottom: '60px'
        }}>
          <h3 style={{ fontSize: '24px', fontWeight: 800, color: '#ffffff', marginBottom: '12px' }}>
            Automate Your YouTube Channel in 60 Seconds
          </h3>
          <p style={{ fontSize: '15px', color: '#a1a1aa', maxWidth: '540px', margin: '0 auto 24px', lineHeight: 1.6 }}>
            Let AUTORA handle script writing, neural voiceover, photorealistic AI visuals, and automated daily YouTube publishing.
          </p>
          <Link href="/signup" style={{
            background: '#ffffff',
            color: '#09090b',
            padding: '12px 28px',
            borderRadius: '20px',
            fontSize: '14.5px',
            fontWeight: 700,
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            Build Your First Video Free ➔
          </Link>
        </div>

        {/* Author Bio Box */}
        <div style={{
          borderRadius: '20px',
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          padding: '28px',
          display: 'flex',
          gap: '20px',
          alignItems: 'center',
          marginBottom: '60px',
          flexWrap: 'wrap'
        }}>
          <img src={post.author.avatar} alt={post.author.name} style={{ width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover' }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#ffffff', marginBottom: '4px' }}>Written by {post.author.name}</div>
            <div style={{ fontSize: '13px', color: '#c084fc', fontWeight: 600, marginBottom: '8px' }}>{post.author.role}</div>
            <p style={{ fontSize: '13.5px', color: '#a1a1aa', margin: 0, lineHeight: 1.5 }}>
              Specializing in generative AI architectures, YouTube recommendation algorithms, and automated media production engines at AUTORA.LIVE.
            </p>
          </div>
        </div>

        {/* Related Posts Section */}
        {relatedPosts.length > 0 && (
          <div>
            <h3 style={{ fontSize: '22px', fontWeight: 700, color: '#ffffff', marginBottom: '24px' }}>
              Related Articles
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
              {relatedPosts.map((rPost) => (
                <Link key={rPost.slug} href={`/blog/${rPost.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div style={{
                    borderRadius: '16px',
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(255, 255, 255, 0.07)',
                    padding: '20px',
                    transition: 'border-color 0.2s ease',
                  }}>
                    <span style={{ fontSize: '11px', color: '#c084fc', fontWeight: 700, textTransform: 'uppercase' }}>{rPost.category}</span>
                    <h4 style={{ fontSize: '16px', fontWeight: 700, color: '#ffffff', margin: '8px 0', lineHeight: 1.4 }}>
                      {rPost.title}
                    </h4>
                    <span style={{ fontSize: '12px', color: '#71717a' }}>{rPost.readTime}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

      </main>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', padding: '36px 24px', textAlign: 'center', color: '#71717a', fontSize: '14px' }}>
        <p style={{ margin: 0 }}>© 2026 AUTORA.LIVE — All Rights Reserved. Autonomous AI Video Automation.</p>
      </footer>
    </div>
  );
}
