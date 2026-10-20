'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface ViralVideo {
  videoId: string;
  title: string;
  views: number;
  likes: number;
  publishedAt: string;
  viralScore: number;
  thumbnailUrl: string;
}

interface CompetitorChannel {
  id: string;
  channelId: string;
  channel_title: string;
  channel_handle: string;
  subscriber_count: number;
  avg_views_7d: number;
  thumbnail_url?: string;
  viralVideos: ViralVideo[];
}

export default function CompetitorsPage() {
  const [handleQuery, setHandleQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [competitors, setCompetitors] = useState<CompetitorChannel[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal for variation generation
  const [selectedVideo, setSelectedVideo] = useState<ViralVideo | null>(null);
  const [userNiche, setUserNiche] = useState('Tech & Business');
  const [generatingAngles, setGeneratingAngles] = useState(false);
  const [generatedAngles, setGeneratedAngles] = useState<string[]>([]);
  const [addedAngle, setAddedAngle] = useState<string | null>(null);

  useEffect(() => {
    fetchCompetitors();
  }, []);

  const fetchCompetitors = async () => {
    try {
      const res = await fetch('/api/competitors');
      if (res.ok) {
        const data = await res.json();
        setCompetitors(data.competitors || []);
      }
    } catch {}
  };

  const handleDiscover = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!handleQuery.trim()) return;

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch('/api/competitors/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handleOrQuery: handleQuery.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to analyze competitor channel');
      }

      setSuccessMsg(`Successfully tracked @${data.channel.handle} and analyzed viral outliers!`);
      setHandleQuery('');
      await fetchCompetitors();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/competitors?id=${id}`, { method: 'DELETE' });
      setCompetitors((prev) => prev.filter((c) => c.id !== id));
    } catch {}
  };

  const handleOpenVariations = async (video: ViralVideo) => {
    setSelectedVideo(video);
    setGeneratedAngles([]);
    setAddedAngle(null);
    setGeneratingAngles(true);

    try {
      const res = await fetch('/api/competitors/generate-variation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          competitorTitle: video.title,
          competitorViews: video.views,
          viralScore: video.viralScore,
          userNiche,
        }),
      });

      const data = await res.json();
      if (res.ok && data.angles) {
        setGeneratedAngles(data.angles);
      }
    } catch {
      setGeneratedAngles([
        `The Secret Strategy Behind ${userNiche} in 2026`,
        `Why Most People Fail at ${userNiche} (And How to Fix It)`,
        `The 3-Step Blueprint to Master ${userNiche}`,
      ]);
    } finally {
      setGeneratingAngles(false);
    }
  };

  const handleAddToCalendar = async (angle: string) => {
    try {
      const res = await fetch('/api/competitors/generate-variation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          competitorTitle: selectedVideo?.title,
          addToCalendar: true,
          selectedAngle: angle,
          userNiche,
        }),
      });

      if (res.ok) {
        setAddedAngle(angle);
      }
    } catch {}
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 20px' }}>
      {/* Page Header */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '4px 12px', background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '9999px', color: '#f87171', fontSize: '13px', fontWeight: 600, marginBottom: '12px' }}>
          <span>🔥</span> Competitor Intelligence Engine
        </div>
        <h1 style={{ fontSize: '32px', fontWeight: 800, color: '#f8fafc', marginBottom: '8px', letterSpacing: '-0.02em' }}>
          Steal Proven Viral Hooks & Outliers
        </h1>
        <p style={{ color: '#94a3b8', fontSize: '15px', maxWidth: '700px', lineHeight: 1.6 }}>
          Track top competitor YouTube channels in your niche. AUTORA analyzes their uploads from the last 7–14 days, isolates videos performing <strong>&ge;1.5&times; above their average</strong>, and automatically generates high-converting variations directly into your 30-day calendar.
        </p>
      </div>

      {/* Search & Discover Bar */}
      <div style={{ background: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '16px', padding: '24px', backdropFilter: 'blur(16px)', marginBottom: '36px' }}>
        <form onSubmit={handleDiscover} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '280px', position: 'relative' }}>
            <input
              type="text"
              value={handleQuery}
              onChange={(e) => setHandleQuery(e.target.value)}
              placeholder="Enter competitor handle (e.g. @MagnatesMedia, @AliAbdaal, @Veritasium)"
              style={{
                width: '100%',
                padding: '14px 18px',
                background: 'rgba(2, 6, 23, 0.8)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '10px',
                color: '#f8fafc',
                fontSize: '15px',
                outline: 'none',
              }}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '14px 28px',
              background: 'linear-gradient(135deg, #ef4444, #dc2626)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '10px',
              fontSize: '15px',
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            {loading ? 'Harvesting Viral Outliers...' : '⚡ Scan Competitor'}
          </button>
        </form>

        {error && (
          <div style={{ marginTop: '16px', padding: '12px 16px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', color: '#fca5a5', fontSize: '14px' }}>
            ⚠️ {error}
          </div>
        )}

        {successMsg && (
          <div style={{ marginTop: '16px', padding: '12px 16px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '8px', color: '#6ee7b7', fontSize: '14px' }}>
            ✅ {successMsg}
          </div>
        )}
      </div>

      {/* Competitor Channels Grid */}
      {competitors.length === 0 && !loading && (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: 'rgba(15, 23, 42, 0.4)', borderRadius: '16px', border: '1px dashed rgba(255, 255, 255, 0.1)' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎯</div>
          <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#f1f5f9', marginBottom: '8px' }}>No Competitor Channels Tracked Yet</h3>
          <p style={{ color: '#94a3b8', fontSize: '14px', maxWidth: '500px', margin: '0 auto 20px' }}>
            Add competitor handles above to automatically harvest their highest-performing hooks and replicate their winning formula.
          </p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        {competitors.map((comp) => (
          <div
            key={comp.id}
            style={{
              background: 'rgba(15, 23, 42, 0.65)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '16px',
              padding: '24px',
              backdropFilter: 'blur(12px)',
            }}
          >
            {/* Channel Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                {comp.thumbnail_url ? (
                  <img src={comp.thumbnail_url} alt="" style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#94a3b8' }}>
                    {comp.channel_title?.slice(0, 1) || 'C'}
                  </div>
                )}
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
                    {comp.channel_title}
                  </h3>
                  <div style={{ fontSize: '13px', color: '#94a3b8', display: 'flex', gap: '12px', marginTop: '4px' }}>
                    <span>@{comp.channel_handle}</span>
                    <span>•</span>
                    <span>{(comp.subscriber_count || 0).toLocaleString()} Subscribers</span>
                    <span>•</span>
                    <span style={{ color: '#38bdf8' }}>Avg 7-Day Views: {(comp.avg_views_7d || 0).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleDelete(comp.id)}
                style={{
                  background: 'transparent',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#f87171',
                  borderRadius: '8px',
                  padding: '6px 14px',
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                Untrack
              </button>
            </div>

            {/* Viral Outlier Videos Carousel / Grid */}
            <h4 style={{ fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#94a3b8', marginBottom: '14px', fontWeight: 700 }}>
              🔥 Top Viral Outliers (Past 7–14 Days)
            </h4>

            {(!comp.viralVideos || comp.viralVideos.length === 0) ? (
              <p style={{ color: '#64748b', fontSize: '14px' }}>No viral videos detected in the recent upload window.</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                {comp.viralVideos.map((video) => (
                  <div
                    key={video.videoId}
                    style={{
                      background: 'rgba(2, 6, 23, 0.7)',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                      borderRadius: '12px',
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    {/* Thumbnail with Viral Multiplier Badge */}
                    <div style={{ position: 'relative', width: '100%', height: '160px', background: '#0f172a' }}>
                      {video.thumbnailUrl && (
                        <img src={video.thumbnailUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      )}
                      <div
                        style={{
                          position: 'absolute',
                          top: '10px',
                          right: '10px',
                          background: 'rgba(239, 68, 68, 0.9)',
                          color: '#ffffff',
                          fontWeight: 800,
                          fontSize: '12px',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          boxShadow: '0 4px 12px rgba(239, 68, 68, 0.4)',
                        }}
                      >
                        🔥 {video.viralScore}x Avg
                      </div>
                    </div>

                    {/* Video Info */}
                    <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
                      <div>
                        <h5 style={{ fontSize: '14px', fontWeight: 700, color: '#f1f5f9', margin: '0 0 8px 0', lineHeight: 1.4 }}>
                          {video.title}
                        </h5>
                        <div style={{ fontSize: '12px', color: '#94a3b8', display: 'flex', justifyContent: 'space-between' }}>
                          <span>👁️ {video.views.toLocaleString()} views</span>
                          <span>👍 {video.likes.toLocaleString()} likes</span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleOpenVariations(video)}
                        style={{
                          marginTop: '14px',
                          width: '100%',
                          padding: '10px 14px',
                          background: 'rgba(56, 189, 248, 0.1)',
                          border: '1px solid rgba(56, 189, 248, 0.3)',
                          borderRadius: '8px',
                          color: '#38bdf8',
                          fontSize: '13px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                        }}
                      >
                        ⚡ Replicate Hook for Your Niche
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Variation Generation Modal */}
      {selectedVideo && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.8)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
          <div style={{ background: '#0f172a', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '16px', maxWidth: '600px', width: '100%', padding: '28px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <span style={{ fontSize: '12px', textTransform: 'uppercase', color: '#ef4444', fontWeight: 800 }}>Viral Hook Transformation</span>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#f8fafc', margin: '4px 0 0 0' }}>Original Viral Video</h3>
                <p style={{ color: '#94a3b8', fontSize: '14px', margin: '4px 0 0 0' }}>"{selectedVideo.title}" ({selectedVideo.viralScore}x average views)</p>
              </div>
              <button onClick={() => setSelectedVideo(null)} style={{ background: 'transparent', border: 'none', color: '#64748b', fontSize: '20px', cursor: 'pointer' }}>×</button>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>Your Channel Niche:</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  value={userNiche}
                  onChange={(e) => setUserNiche(e.target.value)}
                  style={{ flex: 1, padding: '10px 14px', background: 'rgba(2, 6, 23, 0.8)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: '#f8fafc', fontSize: '14px' }}
                />
                <button
                  onClick={() => handleOpenVariations(selectedVideo)}
                  disabled={generatingAngles}
                  style={{ padding: '10px 18px', background: '#38bdf8', color: '#0f172a', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}
                >
                  Regenerate
                </button>
              </div>
            </div>

            <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#f1f5f9', marginBottom: '12px' }}>
              🎯 AI-Generated Angles for Your Channel:
            </h4>

            {generatingAngles ? (
              <div style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>
                Generating psychologically aligned hooks...
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {generatedAngles.map((angle, idx) => {
                  const isAdded = addedAngle === angle;
                  return (
                    <div
                      key={idx}
                      style={{
                        padding: '12px 16px',
                        background: 'rgba(2, 6, 23, 0.6)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '10px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '12px',
                      }}
                    >
                      <span style={{ fontSize: '14px', color: '#e2e8f0', fontWeight: 500 }}>
                        {idx + 1}. {angle}
                      </span>
                      <button
                        onClick={() => handleAddToCalendar(angle)}
                        disabled={isAdded}
                        style={{
                          padding: '6px 14px',
                          background: isAdded ? '#10b981' : 'linear-gradient(135deg, #38bdf8, #0284c7)',
                          color: isAdded ? '#ffffff' : '#0f172a',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: isAdded ? 'default' : 'pointer',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {isAdded ? '✓ Added to Calendar' : '+ Add to Calendar'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <Link
                href="/calendar"
                style={{ padding: '10px 18px', background: 'transparent', border: '1px solid rgba(255, 255, 255, 0.15)', color: '#94a3b8', borderRadius: '8px', fontSize: '13px', textDecoration: 'none' }}
              >
                Go to Calendar →
              </Link>
              <button
                onClick={() => setSelectedVideo(null)}
                style={{ padding: '10px 18px', background: '#334155', color: '#f8fafc', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
