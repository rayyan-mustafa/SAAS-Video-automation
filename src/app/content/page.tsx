'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useToast } from '@/components/Toast';

interface Project {
  id: string;
  topic: string;
  target_length_minutes: number;
  preset?: string;
  language: string;
  platform?: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  current_stage: string;
  publishing_status?: string;
  publish_video_id?: string | null;
  publish_url?: string | null;
  scheduled_at?: string | null;
  published_at?: string | null;
  channel_name: string;
  channel_niche: string;
  created_at: string;
}

function ContentLibraryList() {
  const toast = useToast();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'ALL' | 'GENERATING' | 'READY' | 'PUBLISHED' | 'FAILED'>('ALL');
  const [search, setSearch] = useState(initialQuery);
  const [sortBy, setSortBy] = useState<'newest' | 'duration' | 'title'>('newest');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const fetchProjects = async (isInitial = false) => {
    try {
      if (isInitial) setLoading(true);
      const res = await fetch('/api/projects');
      if (res.ok) {
        const data = await res.json();
        setProjects(data.projects || []);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch projects');
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects(true);

    const interval = setInterval(() => {
      fetchProjects(false);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Tab Filtering
  const filteredProjects = projects.filter((p) => {
    // Search match
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchTopic = p.topic?.toLowerCase().includes(q);
      const matchChannel = p.channel_name?.toLowerCase().includes(q);
      if (!matchTopic && !matchChannel) return false;
    }

    if (activeTab === 'ALL') return true;
    if (activeTab === 'GENERATING') return p.status === 'PROCESSING' || p.status === 'PENDING' || p.publishing_status === 'UPLOADING';
    if (activeTab === 'READY') return p.status === 'COMPLETED' && (!p.publishing_status || p.publishing_status === 'READY' || p.publishing_status === 'DRAFT');
    if (activeTab === 'PUBLISHED') return p.publishing_status === 'PUBLISHED' || p.publishing_status === 'SCHEDULED';
    if (activeTab === 'FAILED') return p.status === 'FAILED' || p.publishing_status === 'FAILED';
    return true;
  });

  // Sorting
  const sortedProjects = [...filteredProjects].sort((a, b) => {
    if (sortBy === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    if (sortBy === 'duration') return b.target_length_minutes - a.target_length_minutes;
    if (sortBy === 'title') return a.topic.localeCompare(b.topic);
    return 0;
  });

  const countGenerating = projects.filter((p) => p.status === 'PROCESSING' || p.status === 'PENDING' || p.publishing_status === 'UPLOADING').length;
  const countReady = projects.filter((p) => p.status === 'COMPLETED' && (!p.publishing_status || p.publishing_status === 'READY' || p.publishing_status === 'DRAFT')).length;
  const countPublished = projects.filter((p) => p.publishing_status === 'PUBLISHED' || p.publishing_status === 'SCHEDULED').length;
  const countFailed = projects.filter((p) => p.status === 'FAILED' || p.publishing_status === 'FAILED').length;

  const handleRetryProject = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const res = await fetch(`/api/projects/${id}/retry`, { method: 'POST' });
      if (res.ok) {
        await fetchProjects();
      }
    } catch (err) {
      console.error('Failed to retry project:', err);
    }
  };

  return (
    <div className="content-container" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* ───────────────────────────────────────────────────────────
          1. HEADER BAR
      ─────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <h1 style={{ fontSize: '20px', fontWeight: 600, color: '#f4f4f5', letterSpacing: '-0.02em', margin: 0 }}>
              Video Projects
            </h1>
            <span style={{ fontSize: '11px', fontFamily: 'monospace', padding: '2px 8px', borderRadius: '4px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#a1a1aa' }}>
              {projects.length} {projects.length === 1 ? 'RECORD' : 'RECORDS'}
            </span>
          </div>
          <p style={{ fontSize: '13px', color: '#71717a', margin: 0 }}>
            Manage generated videos, monitor background rendering pipelines, and inspect 1080p output assets.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Link href="/calendar" className="btn btn-secondary btn-sm" style={{ height: '32px' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <span>Calendar</span>
          </Link>

          <Link href="/content/new" className="btn btn-primary btn-sm" style={{ height: '32px' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>New Video</span>
          </Link>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────
          2. FILTER TABS & CONTROLS
      ─────────────────────────────────────────────────────────── */}
      <div
        className="card"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          padding: '10px 14px',
          background: 'rgba(24, 24, 27, 0.5)',
          borderColor: 'rgba(255, 255, 255, 0.08)',
        }}
      >
        {/* Filter Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', overflowX: 'auto' }}>
          {[
            { id: 'ALL', label: 'All', count: projects.length },
            { id: 'GENERATING', label: 'Generating', count: countGenerating },
            { id: 'READY', label: 'Ready', count: countReady },
            { id: 'PUBLISHED', label: 'Published', count: countPublished },
            { id: 'FAILED', label: 'Failed', count: countFailed },
          ].map((t) => {
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as any)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '5px 10px',
                  fontSize: '11px',
                  fontFamily: 'monospace',
                  fontWeight: isActive ? 600 : 500,
                  borderRadius: '4px',
                  border: isActive ? '1px solid #ffffff' : '1px solid rgba(255, 255, 255, 0.06)',
                  background: isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.03)',
                  color: isActive ? '#09090b' : '#a1a1aa',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <span>{t.label}</span>
                <span
                  style={{
                    fontSize: '10px',
                    padding: '0px 5px',
                    borderRadius: '3px',
                    background: isActive ? '#09090b' : 'rgba(255, 255, 255, 0.08)',
                    color: isActive ? '#ffffff' : '#71717a',
                  }}
                >
                  {t.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search, Sort, View Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="Search topic or channel..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="form-input"
              style={{
                padding: '5px 8px 5px 28px',
                fontSize: '11px',
                fontFamily: 'monospace',
                width: '180px',
                height: '28px',
                borderRadius: '4px',
                background: '#09090b',
                borderColor: 'rgba(255, 255, 255, 0.1)',
              }}
            />
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              style={{ position: 'absolute', left: '9px', top: '8px', color: '#71717a' }}
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>

          <select
            className="form-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            style={{
              padding: '4px 8px',
              fontSize: '11px',
              fontFamily: 'monospace',
              width: 'auto',
              height: '28px',
              borderRadius: '4px',
              background: '#09090b',
              borderColor: 'rgba(255, 255, 255, 0.1)',
              color: '#d4d4d8',
            }}
          >
            <option value="newest">Newest First</option>
            <option value="duration">Longest Duration</option>
            <option value="title">Alphabetical</option>
          </select>

          <div style={{ display: 'flex', background: '#09090b', borderRadius: '4px', padding: '2px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <button
              onClick={() => setViewMode('grid')}
              style={{
                background: viewMode === 'grid' ? '#27272a' : 'transparent',
                border: 'none',
                color: viewMode === 'grid' ? '#f4f4f5' : '#71717a',
                padding: '3px 6px',
                borderRadius: '3px',
                cursor: 'pointer',
              }}
              title="Grid View"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode('list')}
              style={{
                background: viewMode === 'list' ? '#27272a' : 'transparent',
                border: 'none',
                color: viewMode === 'list' ? '#f4f4f5' : '#71717a',
                padding: '3px 6px',
                borderRadius: '3px',
                cursor: 'pointer',
              }}
              title="List View"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="8" y1="6" x2="21" y2="6" />
                <line x1="8" y1="12" x2="21" y2="12" />
                <line x1="8" y1="18" x2="21" y2="18" />
                <line x1="3" y1="6" x2="3.01" y2="6" />
                <line x1="3" y1="12" x2="3.01" y2="12" />
                <line x1="3" y1="18" x2="3.01" y2="18" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────
          3. PROJECTS DISPLAY (Grid or List)
      ─────────────────────────────────────────────────────────── */}
      {loading && projects.length === 0 ? (
        <div style={{ padding: '60px', textAlign: 'center', color: '#71717a', fontFamily: 'monospace', fontSize: '13px' }}>
          Loading video projects library...
        </div>
      ) : sortedProjects.length === 0 ? (
        <div
          style={{
            padding: '56px 24px',
            textAlign: 'center',
            background: 'rgba(24, 24, 27, 0.4)',
            border: '1px dashed rgba(255, 255, 255, 0.12)',
            borderRadius: '8px',
          }}
        >
          <div style={{ width: '40px', height: '40px', margin: '0 auto 12px auto', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a1a1aa' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          </div>
          <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#f4f4f5', marginBottom: '4px' }}>
            No matching projects found
          </h3>
          <p style={{ fontSize: '13px', color: '#71717a', maxWidth: '380px', margin: '0 auto 20px auto' }}>
            {search ? `No projects match "${search}". Try adjusting your filters.` : 'Generate a new automated video to start populating your production pipeline.'}
          </p>
          <Link href="/content/new" className="btn btn-primary btn-sm">
            + Create New Video
          </Link>
        </div>
      ) : viewMode === 'grid' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))', gap: '16px' }}>
          {sortedProjects.map((p) => {
            const isProcessing = p.status === 'PROCESSING' || p.status === 'PENDING' || p.publishing_status === 'UPLOADING';
            const isReady = p.status === 'COMPLETED';
            const isFailed = p.status === 'FAILED';

            return (
              <Link
                key={p.id}
                href={`/content/${p.id}`}
                className="card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  padding: '14px',
                  textDecoration: 'none',
                  background: 'rgba(18, 18, 21, 0.8)',
                  borderColor: 'rgba(255, 255, 255, 0.08)',
                  transition: 'border-color 0.15s ease',
                }}
              >
                {/* Thumbnail 16:9 */}
                <div
                  style={{
                    aspectRatio: '16 / 9',
                    borderRadius: '6px',
                    background: '#09090b',
                    position: 'relative',
                    overflow: 'hidden',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '6px',
                      background: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#f4f4f5',
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <polygon points="6 4 20 12 6 20 6 4" />
                    </svg>
                  </div>

                  {/* Status Badges */}
                  <div style={{ position: 'absolute', top: '8px', left: '8px', display: 'flex', gap: '4px' }}>
                    <span
                      style={{
                        fontSize: '9px',
                        fontFamily: 'monospace',
                        fontWeight: 600,
                        padding: '2px 6px',
                        borderRadius: '3px',
                        background: isReady ? 'rgba(16, 185, 129, 0.15)' : isProcessing ? 'rgba(59, 130, 246, 0.15)' : isFailed ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255, 255, 255, 0.1)',
                        border: isReady ? '1px solid rgba(16, 185, 129, 0.3)' : isProcessing ? '1px solid rgba(59, 130, 246, 0.3)' : isFailed ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(255, 255, 255, 0.15)',
                        color: isReady ? '#10b981' : isProcessing ? '#60a5fa' : isFailed ? '#ef4444' : '#e4e4e7',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                      }}
                    >
                      {p.status}
                    </span>
                    {p.publishing_status && p.publishing_status !== 'DRAFT' && (
                      <span
                        style={{
                          fontSize: '9px',
                          fontFamily: 'monospace',
                          padding: '2px 6px',
                          borderRadius: '3px',
                          background: 'rgba(255, 255, 255, 0.08)',
                          border: '1px solid rgba(255, 255, 255, 0.12)',
                          color: '#d4d4d8',
                          textTransform: 'uppercase',
                        }}
                      >
                        {p.publishing_status}
                      </span>
                    )}
                  </div>

                  {/* Duration */}
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '8px',
                      right: '8px',
                      background: 'rgba(9, 9, 11, 0.85)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontSize: '10px',
                      fontWeight: 600,
                      color: '#f4f4f5',
                      fontFamily: 'monospace',
                    }}
                  >
                    {p.target_length_minutes}m • 1080P
                  </div>
                </div>

                {/* Title & Metadata */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <h3
                    style={{
                      fontSize: '13px',
                      fontWeight: 600,
                      color: '#f4f4f5',
                      lineHeight: 1.4,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      margin: 0,
                    }}
                  >
                    {p.topic}
                  </h3>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', fontFamily: 'monospace', color: '#71717a' }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '140px' }}>
                      {p.channel_name || 'Default Channel'}
                    </span>
                    <span>STAGE: <strong style={{ color: '#d4d4d8', fontWeight: 500 }}>{p.current_stage}</strong></span>
                  </div>
                </div>

                {/* Actions Footer */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingTop: '8px',
                    borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                    marginTop: 'auto',
                  }}
                >
                  <span style={{ fontSize: '11px', fontFamily: 'monospace', color: '#52525b' }}>
                    {new Date(p.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }).toUpperCase()}
                  </span>

                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {isReady && (
                      <a
                        href={`/api/assets/video/${p.id}/final_video.mp4`}
                        download={`${p.topic.replace(/[^a-zA-Z0-9]/g, '_')}.mp4`}
                        onClick={(e) => e.stopPropagation()}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '6px 12px', fontSize: '12px', minHeight: '36px', height: '36px', color: '#10b981', borderColor: 'rgba(16,185,129,0.3)', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}
                        title="Download Final MP4"
                      >
                        ⬇️ MP4
                      </a>
                    )}

                    {p.status === 'FAILED' && (
                      <button
                        onClick={(e) => handleRetryProject(p.id, e)}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '6px 12px', fontSize: '12px', minHeight: '36px', height: '36px', color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)', display: 'inline-flex', alignItems: 'center', fontWeight: 600 }}
                        title="Retry Pipeline"
                      >
                        Retry
                      </button>
                    )}

                    <span className="btn btn-secondary btn-sm" style={{ padding: '6px 12px', fontSize: '12px', minHeight: '36px', height: '36px', display: 'inline-flex', alignItems: 'center', fontWeight: 600 }}>
                      Studio ➔
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        /* List View */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {sortedProjects.map((p) => {
            const isReady = p.status === 'COMPLETED';
            const isProcessing = p.status === 'PROCESSING' || p.status === 'PENDING';
            const isFailed = p.status === 'FAILED';

            return (
              <Link
                key={p.id}
                href={`/content/${p.id}`}
                className="card"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 16px',
                  textDecoration: 'none',
                  gap: '14px',
                  background: 'rgba(18, 18, 21, 0.8)',
                  borderColor: 'rgba(255, 255, 255, 0.08)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                  <div
                    style={{
                      width: '48px',
                      height: '28px',
                      borderRadius: '4px',
                      background: '#09090b',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" style={{ color: '#a1a1aa' }}>
                      <polygon points="6 4 20 12 6 20 6 4" />
                    </svg>
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <h4 style={{ fontSize: '13px', fontWeight: 600, color: '#f4f4f5', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: 0 }}>
                      {p.topic}
                    </h4>
                    <div style={{ fontSize: '11px', fontFamily: 'monospace', color: '#71717a', display: 'flex', gap: '8px' }}>
                      <span>{p.channel_name}</span>
                      <span>•</span>
                      <span>{p.target_length_minutes}m</span>
                      <span>•</span>
                      <span>STAGE: {p.current_stage}</span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                  <span
                    style={{
                      fontSize: '9px',
                      fontFamily: 'monospace',
                      fontWeight: 600,
                      padding: '2px 6px',
                      borderRadius: '3px',
                      background: isReady ? 'rgba(16, 185, 129, 0.15)' : isProcessing ? 'rgba(59, 130, 246, 0.15)' : isFailed ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255, 255, 255, 0.1)',
                      border: isReady ? '1px solid rgba(16, 185, 129, 0.3)' : isProcessing ? '1px solid rgba(59, 130, 246, 0.3)' : isFailed ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(255, 255, 255, 0.15)',
                      color: isReady ? '#10b981' : isProcessing ? '#60a5fa' : isFailed ? '#ef4444' : '#e4e4e7',
                      textTransform: 'uppercase',
                    }}
                  >
                    {p.status}
                  </span>
                  <span style={{ fontSize: '11px', fontFamily: 'monospace', color: '#52525b' }}>
                    {new Date(p.created_at).toLocaleDateString()}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function ContentLibraryPage() {
  return (
    <React.Suspense fallback={<div className="content-container" style={{ padding: '40px', color: '#71717a', fontFamily: 'monospace', fontSize: '13px' }}>Loading projects...</div>}>
      <ContentLibraryList />
    </React.Suspense>
  );
}
