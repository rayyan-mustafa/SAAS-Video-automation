'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Template {
  id: string;
  name: string;
  category: string;
  format: string;
  durationMinutes: number;
  niche: string;
  visualStyle: string;
  voice: string;
  description: string;
  promptStarter: string;
  badge: string;
}

export default function TemplatesPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const loadTemplates = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/templates');
        if (res.ok) {
          const data = await res.json();
          setTemplates(data.templates || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadTemplates();
  }, []);

  const categories = ['All', 'Shorts & Vertical', 'Long-Form Channel', 'News & Trends', 'Education & Science', 'Business & Finance'];

  const filtered = templates.filter((t) => {
    if (activeCategory !== 'All' && t.category !== activeCategory) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return t.name.toLowerCase().includes(q) || t.niche.toLowerCase().includes(q) || t.description.toLowerCase().includes(q);
    }
    return true;
  });

  const handleUseTemplate = (t: Template) => {
    router.push(`/content/new?preset=${t.format === 'Shorts' ? 'SHORT' : t.durationMinutes > 5 ? 'LONG' : 'STANDARD'}&topic=${encodeURIComponent(t.promptStarter)}`);
  };

  return (
    <div className="content-container" style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>
            Automation Workflow Templates
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Pre-configured production pipelines optimized for high YouTube retention, RPM, and channel growth.
          </p>
        </div>

        <Link href="/content/new" className="btn btn-primary btn-sm">
          + Custom Video
        </Link>
      </div>

      {/* Filter Tabs & Search */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '14px',
          padding: '12px 18px',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
        }}
      >
        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto' }}>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`btn btn-sm ${activeCategory === cat ? 'btn-secondary' : 'btn-ghost'}`}
              style={{
                borderRadius: 'var(--radius-full)',
                padding: '5px 12px',
                fontSize: '12px',
                fontWeight: activeCategory === cat ? 700 : 500,
                background: activeCategory === cat ? 'var(--bg-elevated)' : 'transparent',
                color: activeCategory === cat ? '#fff' : 'var(--text-secondary)',
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        <input
          type="text"
          placeholder="Search templates..."
          className="form-input"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: '200px', padding: '6px 12px', fontSize: '12px' }}
        />
      </div>

      {/* Grid */}
      {loading ? (
        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading templates...</div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>No templates found.</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '22px' }}>
          {filtered.map((t) => (
            <div
              key={t.id}
              className="card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
                padding: '22px',
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    padding: '3px 8px',
                    borderRadius: 'var(--radius-full)',
                    background: 'var(--status-proc-bg)',
                    color: 'var(--accent-primary)',
                    border: '1px solid rgba(99, 102, 241, 0.25)',
                  }}
                >
                  {t.badge}
                </span>

                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  {t.durationMinutes} min • {t.format}
                </span>
              </div>

              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#fff', marginBottom: '6px' }}>{t.name}</h3>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{t.description}</p>
              </div>

              <div style={{ padding: '10px 12px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Sample Prompt Starter</div>
                <div style={{ fontSize: '12px', color: 'var(--accent-cyan)', fontStyle: 'italic' }}>
                  &ldquo;{t.promptStarter}&rdquo;
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)', marginTop: 'auto' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  <span>Voice: {t.voice.split('-')[2] || t.voice}</span>
                </div>

                <button onClick={() => handleUseTemplate(t)} className="btn btn-primary btn-sm">
                  Use Template ➔
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
