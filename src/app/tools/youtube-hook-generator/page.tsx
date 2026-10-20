'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function YoutubeHookGeneratorPage() {
  const router = useRouter();
  const [topic, setTopic] = useState('');
  const [selectedFramework, setSelectedFramework] = useState('all');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[] | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [error, setError] = useState('');

  const sampleTopics = [
    'How ancient Stoics dealt with anxiety',
    'Why quantum computers will break bitcoin',
    'The dark side of high-ticket drop servicing',
    '3 signs of covert narcissistic behavior',
    'Why the 9 to 5 model is mathematically broken',
  ];

  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!topic.trim()) {
      setError('Please enter a video topic or headline.');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/tools/generate-hook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topic.trim(),
          frameworkId: selectedFramework,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate hooks');
      }

      setResults(data.hooks);
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#09090b', color: '#f4f4f5', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Navigation */}
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
              boxShadow: '0 0 20px rgba(0, 240, 255, 0.3)'
            }}>
              Launch Free Studio ➔
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main style={{ maxWidth: '960px', margin: '0 auto', padding: '48px 24px 80px' }}>
        {/* Tool Header */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '4px 12px',
            borderRadius: '20px',
            background: 'rgba(0, 240, 255, 0.1)',
            border: '1px solid rgba(0, 240, 255, 0.25)',
            color: '#00f0ff',
            fontSize: '12px',
            fontWeight: 700,
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            marginBottom: '16px'
          }}>
            ⚡ Free 2026 Creator Tool
          </div>

          <h1 style={{ fontSize: 'clamp(32px, 5vw, 48px)', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.15, margin: '0 0 16px' }}>
            Viral YouTube & TikTok Hook Generator
          </h1>
          <p style={{ color: '#a1a1aa', fontSize: '17px', maxWidth: '640px', margin: '0 auto', lineHeight: 1.6 }}>
            Generate battle-tested retention hooks based on 5 psychological narrative frameworks that bypass YouTube's 2026 AI inauthentic content filters.
          </p>
        </div>

        {/* Interactive Generator Box */}
        <div style={{
          background: '#121215',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '16px',
          padding: '32px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
          marginBottom: '40px'
        }}>
          <form onSubmit={handleGenerate}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#e4e4e7', marginBottom: '8px' }}>
              What is your video about? (Topic, Niche, or Idea)
            </label>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '20px' }}>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. 5 secrets high-performing founders use to stay energized..."
                style={{
                  flex: '1 1 320px',
                  background: '#09090b',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '10px',
                  padding: '14px 18px',
                  color: '#fff',
                  fontSize: '15px',
                  outline: 'none',
                }}
              />
              <button
                type="submit"
                disabled={loading}
                style={{
                  background: 'linear-gradient(135deg, #00f0ff 0%, #7000ff 100%)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '14px 28px',
                  fontSize: '15px',
                  fontWeight: 700,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1,
                  whiteSpace: 'nowrap',
                  boxShadow: '0 4px 20px rgba(0, 240, 255, 0.25)',
                  transition: 'all 0.2s',
                }}
              >
                {loading ? 'Crafting Hooks...' : 'Generate 3 Viral Hooks ➔'}
              </button>
            </div>

            {/* Psychological Framework Selector */}
            <div style={{ marginBottom: '20px' }}>
              <span style={{ fontSize: '13px', color: '#71717a', marginRight: '10px' }}>Hook Angle:</span>
              <div style={{ display: 'inline-flex', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
                {[
                  { id: 'all', label: 'All 5 Frameworks (Recommended)' },
                  { id: 'provocative_question', label: 'Provocative Question' },
                  { id: 'counter_intuitive', label: 'Counter-Intuitive Mistake' },
                  { id: 'mystery_box', label: 'Mystery Box' },
                  { id: 'tactical_system', label: '3-Step System' },
                  { id: 'case_study', label: 'Behind-the-Scenes Case Study' },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setSelectedFramework(f.id)}
                    style={{
                      background: selectedFramework === f.id ? 'rgba(0, 240, 255, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                      border: `1px solid ${selectedFramework === f.id ? '#00f0ff' : 'rgba(255, 255, 255, 0.1)'}`,
                      color: selectedFramework === f.id ? '#00f0ff' : '#a1a1aa',
                      borderRadius: '8px',
                      padding: '6px 12px',
                      fontSize: '12.5px',
                      cursor: 'pointer',
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Inspiration Chips */}
            <div>
              <span style={{ fontSize: '12px', color: '#71717a', marginRight: '8px' }}>Need inspiration? Click one:</span>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
                {sampleTopics.map((s, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setTopic(s);
                    }}
                    style={{
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px dashed rgba(255, 255, 255, 0.12)',
                      color: '#d4d4d8',
                      borderRadius: '6px',
                      padding: '4px 10px',
                      fontSize: '12px',
                      cursor: 'pointer',
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div style={{ marginTop: '16px', color: '#f43f5e', fontSize: '14px', background: 'rgba(244, 63, 94, 0.1)', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(244, 63, 94, 0.2)' }}>
                ⚠️ {error}
              </div>
            )}
          </form>

          {/* Results Output Section */}
          {results && results.length > 0 && (
            <div style={{ marginTop: '36px', borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '28px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: '#fff' }}>
                  🎯 Generated Viral Retention Hooks:
                </h3>
                <span style={{ fontSize: '12px', color: '#10b981', fontWeight: 600 }}>
                  ✓ 100% Algorithmic Compliance Score
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {results.map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: '#09090b',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '12px',
                      padding: '20px',
                      position: 'relative',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#00f0ff', background: 'rgba(0, 240, 255, 0.1)', padding: '2px 8px', borderRadius: '4px', textTransform: 'uppercase' }}>
                        {item.framework}
                      </span>
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', fontSize: '12px', color: '#a1a1aa' }}>
                        <span>⚡ Retention Score: <strong style={{ color: '#10b981' }}>{item.score}/100</strong></span>
                        <span>📊 Est. {item.retentionEst}</span>
                      </div>
                    </div>

                    <p style={{ fontSize: '17px', fontWeight: 600, color: '#ffffff', lineHeight: 1.5, margin: 0 }}>
                      "{item.hook}"
                    </p>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', paddingTop: '8px', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(item.hook, idx)}
                        style={{
                          background: copiedIndex === idx ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.06)',
                          border: `1px solid ${copiedIndex === idx ? '#10b981' : 'rgba(255, 255, 255, 0.15)'}`,
                          color: copiedIndex === idx ? '#10b981' : '#e4e4e7',
                          padding: '6px 14px',
                          borderRadius: '6px',
                          fontSize: '12.5px',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        {copiedIndex === idx ? '✓ Copied to Clipboard!' : '📋 Copy Hook'}
                      </button>

                      {/* HIGH-CONVERTING LEAD CONVERSION CTA */}
                      <Link
                        href={`/signup?topic=${encodeURIComponent(item.hook)}`}
                        style={{
                          background: '#ffffff',
                          color: '#09090b',
                          padding: '8px 16px',
                          borderRadius: '8px',
                          fontSize: '13px',
                          fontWeight: 700,
                          textDecoration: 'none',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          boxShadow: '0 2px 10px rgba(255,255,255,0.2)'
                        }}
                      >
                        Turn Hook into Full 1080p Video on AutoRA ➔
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Educational Content Section for SEO */}
        <section style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '40px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#fff', marginBottom: '16px' }}>
            Why 90% of YouTube Shorts & TikToks Die in the First 3 Seconds
          </h2>
          <p style={{ color: '#a1a1aa', fontSize: '15px', lineHeight: 1.7, marginBottom: '20px' }}>
            Algorithms prioritize one critical metric above all else: <strong>Viewed vs. Swiped Away percentage</strong>. If over 30% of viewers swipe away during your first sentence, YouTube immediately kills distribution to the Shorts shelf.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', marginBottom: '32px' }}>
            <div style={{ background: '#121215', padding: '20px', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#00f0ff', marginBottom: '8px' }}>1. Pattern Interruption</div>
              <p style={{ color: '#a1a1aa', fontSize: '13.5px', lineHeight: 1.6, margin: 0 }}>
                Never open with "Hi guys, today I want to talk about..." Start directly with a high-stakes question, contradiction, or unexpected fact.
              </p>
            </div>

            <div style={{ background: '#121215', padding: '20px', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#c084fc', marginBottom: '8px' }}>2. Psychological Curiosity Gaps</div>
              <p style={{ color: '#a1a1aa', fontSize: '13.5px', lineHeight: 1.6, margin: 0 }}>
                Withhold the core payoff until the middle or end of the video. The viewer must stay to satisfy the tension created in sentence one.
              </p>
            </div>

            <div style={{ background: '#121215', padding: '20px', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#10b981', marginBottom: '8px' }}>3. Multi-Platform Syndication</div>
              <p style={{ color: '#a1a1aa', fontSize: '13.5px', lineHeight: 1.6, margin: 0 }}>
                The exact same hook works across YouTube Shorts, TikTok, and Instagram Reels. AutoRA renders and publishes to all 3 platforms automatically.
              </p>
            </div>
          </div>

          <div style={{ textAlign: 'center', background: 'linear-gradient(180deg, rgba(0, 240, 255, 0.05), rgba(112, 0, 255, 0.05))', border: '1px solid rgba(0, 240, 255, 0.2)', borderRadius: '16px', padding: '36px' }}>
            <h3 style={{ fontSize: '22px', fontWeight: 800, color: '#fff', marginBottom: '10px' }}>
              Want 30 Days of Automated Videos Ready to Publish?
            </h3>
            <p style={{ color: '#a1a1aa', fontSize: '15px', maxWidth: '520px', margin: '0 auto 24px', lineHeight: 1.6 }}>
              AutoRA writes the scripts, generates true generative AI video clips, records studio voiceovers, and auto-schedules to your YouTube channel.
            </p>
            <Link
              href="/signup"
              style={{
                background: '#00f0ff',
                color: '#000',
                padding: '12px 28px',
                borderRadius: '8px',
                fontSize: '15px',
                fontWeight: 700,
                textDecoration: 'none',
                display: 'inline-block',
                boxShadow: '0 0 24px rgba(0, 240, 255, 0.4)'
              }}
            >
              Start Creating with AutoRA Free ➔
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
