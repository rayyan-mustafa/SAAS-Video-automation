'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface ScheduledProject {
  id: string;
  topic: string;
  channel_name: string;
  platform: string;
  status: string;
  publishing_status: string;
  scheduled_at: string | null;
  published_at: string | null;
  publish_video_id?: string | null;
  publish_url?: string | null;
  publish_error?: string | null;
  created_at: string;
}

interface ChannelSchedule {
  id: string;
  name: string;
  niche: string;
  publishing_days: string;
  publishing_time: string;
  timezone: string;
  publishing_platform: string;
  auto_publish: number;
}

interface PlanDayItem {
  day: number;
  date: string;
  topic: string;
  hook: string;
  hashtags: string[];
  targetLengthMinutes: number;
}

const NICHE_PRESETS = [
  '🤖 AI Tools & Technological Innovations',
  '💰 Wealth Building, Finance & Investing',
  '🧠 Stoicism, Mindset & Daily Discipline',
  '🍏 Healthy Living, Nutrition & Longevity',
  '🌌 Science, Astrophysics & Deep Mysteries',
  '🏛️ Forgotten History & Ancient Civilizations',
];

export default function ContentCalendarPage() {
  const [projects, setProjects] = useState<ScheduledProject[]>([]);
  const [channels, setChannels] = useState<ChannelSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'list'>('month');
  const [runningScheduler, setRunningScheduler] = useState(false);
  const [schedulerMsg, setSchedulerMsg] = useState<string | null>(null);

  // 30-Day Content Planner State
  const [showPlannerModal, setShowPlannerModal] = useState(false);
  const [plannerStep, setPlannerStep] = useState<1 | 2>(1);
  const [selectedChannelId, setSelectedChannelId] = useState<string>('');
  const [selectedNiche, setSelectedNiche] = useState<string>('🤖 AI Tools & Technological Innovations');
  const [customNiche, setCustomNiche] = useState<string>('');
  const [videoFormat, setVideoFormat] = useState<'shorts' | 'long'>('shorts');
  const [publishingTime, setPublishingTime] = useState<string>('14:00');
  const [cadence, setCadence] = useState<'daily' | 'weekdays'>('daily');
  const [defaultVisibility, setDefaultVisibility] = useState<'PRIVATE' | 'UNLISTED' | 'PUBLIC'>('PRIVATE');

  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [schedulingBatch, setSchedulingBatch] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState<PlanDayItem[]>([]);
  const [batchSuccessMsg, setBatchSuccessMsg] = useState<string | null>(null);
  const [plannerError, setPlannerError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [projRes, chanRes] = await Promise.all([
        fetch('/api/projects'),
        fetch('/api/channels'),
      ]);

      if (projRes.ok) {
        const pData = await projRes.json();
        setProjects(pData.projects || []);
      }
      if (chanRes.ok) {
        const cData = await chanRes.json();
        const chList = cData.channels || [];
        setChannels(chList);
        if (chList.length > 0 && !selectedChannelId) {
          setSelectedChannelId(chList[0].id);
        }
      }
    } catch (err: any) {
      console.error('Error fetching calendar data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRunScheduler = async () => {
    try {
      setRunningScheduler(true);
      setSchedulerMsg(null);
      const res = await fetch('/api/scheduler/run', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setSchedulerMsg(`Auto-Publisher Sync: ${data.processedCount || 0} queued video(s) evaluated and processed.`);
        await fetchData();
      } else {
        setSchedulerMsg(`Scheduler error: ${data.error}`);
      }
    } catch (err: any) {
      setSchedulerMsg(`Scheduler error: ${err.message}`);
    } finally {
      setRunningScheduler(false);
    }
  };

  // Step 1 -> 2: Generate 30-Day Plan with AI
  const handleGeneratePlan = async () => {
    try {
      setGeneratingPlan(true);
      setPlannerError(null);
      const effectiveNiche = customNiche.trim() || selectedNiche;

      const res = await fetch('/api/calendar/generate-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelId: selectedChannelId,
          niche: effectiveNiche,
          targetLengthMinutes: videoFormat === 'shorts' ? 1 : 5,
          publishingTime,
          cadence,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate content plan');
      }

      setGeneratedPlan(data.plan || []);
      setPlannerStep(2);
    } catch (err: any) {
      setPlannerError(err.message || 'Error generating content plan');
    } finally {
      setGeneratingPlan(false);
    }
  };

  // Step 2 -> Save & Schedule all 30 days
  const handleScheduleBatch = async () => {
    try {
      setSchedulingBatch(true);
      setPlannerError(null);

      const payload = {
        channelId: selectedChannelId,
        visibility: defaultVisibility,
        topics: generatedPlan.map((item) => ({
          topic: item.topic,
          scheduled_at: item.date,
          targetLengthMinutes: item.targetLengthMinutes,
          hashtags: item.hashtags,
          hook: item.hook,
          aspectRatio: item.targetLengthMinutes <= 1 ? '9:16' : '16:9',
        })),
      };

      const res = await fetch('/api/calendar/batch-schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to schedule 30-day plan');
      }

      setBatchSuccessMsg(`🎉 Success! Scheduled all ${data.scheduledCount} videos to automatically publish to YouTube!`);
      setShowPlannerModal(false);
      setPlannerStep(1);
      setGeneratedPlan([]);
      await fetchData();
    } catch (err: any) {
      setPlannerError(err.message || 'Error scheduling 30-day plan');
    } finally {
      setSchedulingBatch(false);
    }
  };

  const scheduledOrPublished = projects.filter(
    (p) => p.publishing_status === 'SCHEDULED' || p.publishing_status === 'PUBLISHED' || p.publishing_status === 'FAILED' || p.scheduled_at
  );

  return (
    <div style={{ maxWidth: '1240px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* 30-Day Pipeline Visual Walkthrough Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(0, 240, 255, 0.05) 50%, rgba(121, 40, 202, 0.08) 100%)',
          border: '1px solid rgba(16, 185, 129, 0.25)',
          borderRadius: '16px',
          padding: '20px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '20px',
        }}
      >
        <div style={{ maxWidth: '720px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              HOW 30-DAY AUTOMATED PUBLISHING WORKS
            </span>
          </div>
          <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#fff', margin: '0 0 8px' }}>
            Fully Automated Daily YouTube Release Engine
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginTop: '12px' }}>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: 'rgba(16, 185, 129, 0.2)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 800, flexShrink: 0 }}>
                1
              </div>
              <div style={{ fontSize: '12px', color: '#cbd5e1' }}>
                <strong style={{ color: '#fff' }}>Plan 30 Days:</strong> AI drafts 30 viral video topics tailored to your niche.
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: 'rgba(56, 189, 248, 0.2)', color: '#38bdf8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 800, flexShrink: 0 }}>
                2
              </div>
              <div style={{ fontSize: '12px', color: '#cbd5e1' }}>
                <strong style={{ color: '#fff' }}>AI Production:</strong> Videos, voiceovers, clips & subtitles render in background.
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: 'rgba(192, 132, 252, 0.2)', color: '#c084fc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 800, flexShrink: 0 }}>
                3
              </div>
              <div style={{ fontSize: '12px', color: '#cbd5e1' }}>
                <strong style={{ color: '#fff' }}>Daily Upload:</strong> Publishes daily to YouTube with SEO title, description & hashtags!
              </div>
            </div>
          </div>
        </div>

        {/* 1-Click Action Button */}
        <button
          onClick={() => {
            setShowPlannerModal(true);
            setPlannerStep(1);
            setPlannerError(null);
          }}
          style={{
            background: 'linear-gradient(135deg, #10b981 0%, #00F0FF 100%)',
            border: 'none',
            color: '#09090b',
            padding: '12px 22px',
            borderRadius: '10px',
            fontSize: '13px',
            fontWeight: 800,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 8px 24px rgba(0, 240, 255, 0.25)',
            transition: 'all 0.2s ease',
          }}
        >
          <span style={{ fontSize: '16px' }}>⚡</span>
          <span>Setup 30-Day Content Plan</span>
        </button>
      </div>

      {batchSuccessMsg && (
        <div
          style={{
            padding: '14px 20px',
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.4)',
            borderRadius: '10px',
            color: '#34d399',
            fontSize: '13px',
            fontWeight: 600,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>{batchSuccessMsg}</span>
          <button
            onClick={() => setBatchSuccessMsg(null)}
            style={{ background: 'none', border: 'none', color: '#34d399', cursor: 'pointer', fontSize: '16px' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Header Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', margin: '0 0 4px' }}>
            Publishing & Release Calendar
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
            Automated sequential release schedule across your connected YouTube channels ({scheduledOrPublished.length} scheduled/published).
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* View Modes */}
          <div style={{ display: 'flex', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', padding: '3px', border: '1px solid var(--border-subtle)' }}>
            {(['month', 'week', 'list'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setViewMode(m)}
                className="btn btn-sm"
                style={{
                  textTransform: 'capitalize',
                  background: viewMode === m ? 'var(--bg-elevated)' : 'transparent',
                  color: viewMode === m ? '#fff' : 'var(--text-muted)',
                  fontSize: '12px',
                  padding: '5px 12px',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                {m}
              </button>
            ))}
          </div>

          <button
            onClick={handleRunScheduler}
            disabled={runningScheduler}
            className="btn btn-secondary btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
            <span>{runningScheduler ? 'Checking...' : 'Sync Auto-Publisher'}</span>
          </button>
        </div>
      </div>

      {schedulerMsg && (
        <div
          style={{
            padding: '12px 18px',
            background: schedulerMsg.startsWith('Scheduler error') ? 'var(--status-error-bg)' : 'var(--status-ready-bg)',
            border: `1px solid ${schedulerMsg.startsWith('Scheduler error') ? 'var(--status-error-border)' : 'var(--status-ready-border)'}`,
            borderRadius: 'var(--radius-md)',
            color: '#fff',
            fontSize: '13px',
          }}
        >
          {schedulerMsg}
        </div>
      )}

      {/* Main Calendar View */}
      {viewMode === 'list' ? (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#fff', margin: 0 }}>Scheduled & Published Videos</h3>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{scheduledOrPublished.length} videos scheduled</span>
          </div>

          {scheduledOrPublished.length === 0 ? (
            <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
              No videos currently scheduled. Click <strong>"Setup 30-Day Content Plan"</strong> above to schedule an entire month in 1 click!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {scheduledOrPublished.map((p, index) => {
                const isPublished = p.publishing_status === 'PUBLISHED';
                const isScheduled = p.publishing_status === 'SCHEDULED';
                const isFailed = p.publishing_status === 'FAILED';

                return (
                  <div
                    key={p.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '16px 20px',
                      borderBottom: '1px solid var(--border-subtle)',
                      gap: '16px',
                      flexWrap: 'wrap',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 800, padding: '2px 6px', borderRadius: '4px', background: 'rgba(255,255,255,0.06)', color: '#38bdf8' }}>
                          Day {index + 1}
                        </span>
                        <Link href={`/content/${p.id}`} style={{ fontSize: '14px', fontWeight: 700, color: '#fff', textDecoration: 'none' }}>
                          {p.topic}
                        </Link>
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <span style={{ color: 'var(--accent-cyan)' }}>{p.channel_name}</span>
                        <span>•</span>
                        <span>Scheduled: {p.scheduled_at ? new Date(p.scheduled_at).toLocaleString() : 'Next Daily Slot'}</span>
                        {p.publish_video_id && (
                          <>
                            <span>•</span>
                            <span style={{ fontFamily: 'var(--font-mono)', color: '#10b981' }}>YouTube ID: {p.publish_video_id}</span>
                          </>
                        )}
                      </div>
                      {p.publish_error && (
                        <div style={{ fontSize: '11px', color: 'var(--status-error)', marginTop: '4px' }}>
                          Notice: {p.publish_error}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {isPublished && <span className="badge badge-ready">✅ YouTube Published</span>}
                      {isScheduled && <span className="badge badge-proc">🟢 YouTube Scheduled</span>}
                      {isFailed && <span className="badge badge-error">🔴 Retrying</span>}

                      {p.publish_url && (
                        <a href={p.publish_url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">
                          Watch on YouTube ➔
                        </a>
                      )}

                      <Link href={`/content/${p.id}`} className="btn btn-secondary btn-sm">
                        Studio ➔
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* Month / Week Grid View */
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px', marginBottom: '8px' }}>
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
              <div key={d} style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', textAlign: 'center', padding: '4px 0' }}>
                {d}
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' }}>
            {Array.from({ length: 30 }).map((_, idx) => {
              const dayNum = idx + 1;
              const matchingProjs = scheduledOrPublished.filter((_, i) => i === idx || (i % 30) === idx);
              return (
                <div
                  key={idx}
                  style={{
                    minHeight: '92px',
                    padding: '8px',
                    borderRadius: '8px',
                    background: matchingProjs.length > 0 ? 'rgba(16, 185, 129, 0.04)' : 'var(--bg-secondary)',
                    border: matchingProjs.length > 0 ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid var(--border-subtle)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: matchingProjs.length > 0 ? '#10b981' : 'var(--text-muted)' }}>
                      Day {dayNum}
                    </span>
                    {matchingProjs.length > 0 && (
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
                    )}
                  </div>

                  {matchingProjs.map((p) => (
                    <Link
                      key={p.id}
                      href={`/content/${p.id}`}
                      style={{
                        padding: '4px 6px',
                        borderRadius: '4px',
                        background: p.publishing_status === 'PUBLISHED' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(56, 189, 248, 0.15)',
                        border: `1px solid ${p.publishing_status === 'PUBLISHED' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(56, 189, 248, 0.3)'}`,
                        fontSize: '10px',
                        color: '#fff',
                        textDecoration: 'none',
                        lineHeight: 1.2,
                        overflow: 'hidden',
                        whiteSpace: 'nowrap',
                        textOverflow: 'ellipsis',
                        display: 'block',
                      }}
                      title={p.topic}
                    >
                      {p.publishing_status === 'PUBLISHED' ? '✅ ' : '🟢 '}
                      {p.topic}
                    </Link>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          30-DAY AI CONTENT PLANNER & SCHEDULER MODAL WIZARD
      ───────────────────────────────────────────────────────────── */}
      {showPlannerModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '16px',
          }}
        >
          <div
            style={{
              background: '#0e121b',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '16px',
              maxWidth: '840px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '28px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '3px 8px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '20px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: '#10b981', textTransform: 'uppercase' }}>
                    {plannerStep === 1 ? 'Step 1: Configuration' : 'Step 2: Review & Schedule'}
                  </span>
                </div>
                <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#fff', margin: 0 }}>
                  ⚡ 30-Day Content Planner & Auto-Scheduler
                </h2>
                <p style={{ fontSize: '13px', color: '#94a3b8', margin: '4px 0 0' }}>
                  Configure your theme and release cadence to schedule 30 daily videos directly to YouTube.
                </p>
              </div>
              <button
                onClick={() => setShowPlannerModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '20px', cursor: 'pointer', padding: '4px' }}
              >
                ✕
              </button>
            </div>

            {plannerError && (
              <div style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', color: '#f87171', fontSize: '12px' }}>
                {plannerError}
              </div>
            )}

            {/* STEP 1: CONFIGURATION */}
            {plannerStep === 1 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Channel Selector */}
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#e2e8f0', display: 'block', marginBottom: '6px' }}>
                    Target YouTube Channel
                  </label>
                  <select
                    value={selectedChannelId}
                    onChange={(e) => setSelectedChannelId(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', background: '#090d16', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '8px', color: '#fff', fontSize: '13px', outline: 'none' }}
                  >
                    {channels.map((ch) => (
                      <option key={ch.id} value={ch.id}>
                        {ch.name} ({ch.niche})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Niche Theme Selector */}
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#e2e8f0', display: 'block', marginBottom: '6px' }}>
                    Select Niche or Topic Theme
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '8px', marginBottom: '10px' }}>
                    {NICHE_PRESETS.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => {
                          setSelectedNiche(preset);
                          setCustomNiche('');
                        }}
                        style={{
                          padding: '10px 12px',
                          borderRadius: '8px',
                          background: selectedNiche === preset && !customNiche ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                          border: selectedNiche === preset && !customNiche ? '1px solid #10b981' : '1px solid rgba(255, 255, 255, 0.08)',
                          color: selectedNiche === preset && !customNiche ? '#fff' : '#cbd5e1',
                          fontSize: '12px',
                          textAlign: 'left',
                          cursor: 'pointer',
                        }}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>

                  <input
                    type="text"
                    placeholder="Or type a custom niche / core topic (e.g. 10 foods for healthy aging, Quantum computing)..."
                    value={customNiche}
                    onChange={(e) => setCustomNiche(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', background: '#090d16', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '8px', color: '#fff', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>

                {/* Video Format & Duration */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#e2e8f0', display: 'block', marginBottom: '6px' }}>
                      Video Format
                    </label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => setVideoFormat('shorts')}
                        style={{
                          flex: 1,
                          padding: '10px',
                          borderRadius: '8px',
                          background: videoFormat === 'shorts' ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                          border: videoFormat === 'shorts' ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.08)',
                          color: videoFormat === 'shorts' ? '#fff' : '#94a3b8',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        ⚡ 60s Shorts (9:16)
                      </button>
                      <button
                        type="button"
                        onClick={() => setVideoFormat('long')}
                        style={{
                          flex: 1,
                          padding: '10px',
                          borderRadius: '8px',
                          background: videoFormat === 'long' ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                          border: videoFormat === 'long' ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.08)',
                          color: videoFormat === 'long' ? '#fff' : '#94a3b8',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        🎬 5 Min Video (16:9)
                      </button>
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#e2e8f0', display: 'block', marginBottom: '6px' }}>
                      Daily Release Time & Cadence
                    </label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        type="time"
                        value={publishingTime}
                        onChange={(e) => setPublishingTime(e.target.value)}
                        style={{ width: '110px', padding: '8px', background: '#090d16', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '8px', color: '#fff', fontSize: '13px' }}
                      />
                      <select
                        value={cadence}
                        onChange={(e: any) => setCadence(e.target.value)}
                        style={{ flex: 1, padding: '8px', background: '#090d16', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '8px', color: '#fff', fontSize: '13px' }}
                      >
                        <option value="daily">Every Single Day (30 Days)</option>
                        <option value="weekdays">Weekdays Mon-Fri (6 Weeks)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Default Visibility */}
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#e2e8f0', display: 'block', marginBottom: '6px' }}>
                    YouTube Privacy Level
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {(['PUBLIC', 'UNLISTED', 'PRIVATE'] as const).map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setDefaultVisibility(v)}
                        style={{
                          flex: 1,
                          padding: '8px',
                          borderRadius: '8px',
                          background: defaultVisibility === v ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                          border: defaultVisibility === v ? '1px solid #10b981' : '1px solid rgba(255, 255, 255, 0.08)',
                          color: defaultVisibility === v ? '#fff' : '#94a3b8',
                          fontSize: '12px',
                          cursor: 'pointer',
                        }}
                      >
                        {v === 'PUBLIC' ? '🌐 Public (Direct)' : v === 'UNLISTED' ? '🔗 Unlisted' : '🔒 Private (Review first)'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* CTA Generate Plan */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
                  <button
                    onClick={handleGeneratePlan}
                    disabled={generatingPlan}
                    style={{
                      background: 'linear-gradient(135deg, #10b981 0%, #00F0FF 100%)',
                      border: 'none',
                      color: '#000',
                      padding: '12px 24px',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: 800,
                      cursor: generatingPlan ? 'wait' : 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <span>{generatingPlan ? '⏳ Generating 30 Viral Topics...' : '✨ Generate 30-Day Plan with AI ➔'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: REVIEW 30 TOPICS & CONFIRM */}
            {plannerStep === 2 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', color: '#94a3b8' }}>
                    Review your 30 topics below. You can edit any title directly before scheduling!
                  </span>
                  <button
                    onClick={() => setPlannerStep(1)}
                    style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', borderRadius: '6px', padding: '4px 10px', fontSize: '11px', cursor: 'pointer' }}
                  >
                    ← Back to Options
                  </button>
                </div>

                {/* 30-Day List View */}
                <div style={{ maxHeight: '420px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px' }}>
                  {generatedPlan.map((item, idx) => (
                    <div
                      key={item.day}
                      style={{
                        padding: '10px 14px',
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                      }}
                    >
                      <span style={{ width: '60px', fontSize: '11px', fontWeight: 800, color: '#10b981', flexShrink: 0 }}>
                        Day {String(item.day).padStart(2, '0')}
                      </span>
                      <span style={{ fontSize: '11px', color: '#94a3b8', width: '90px', flexShrink: 0 }}>
                        {new Date(item.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                      <input
                        type="text"
                        value={item.topic}
                        onChange={(e) => {
                          const updated = [...generatedPlan];
                          updated[idx].topic = e.target.value;
                          setGeneratedPlan(updated);
                        }}
                        style={{ flex: 1, padding: '6px 10px', background: '#090d16', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '6px', color: '#fff', fontSize: '12px', outline: 'none' }}
                      />
                      <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                        {item.hashtags.slice(0, 2).map((h) => (
                          <span key={h} style={{ fontSize: '10px', color: '#38bdf8', padding: '2px 5px', borderRadius: '4px', background: 'rgba(56,189,248,0.1)' }}>
                            {h}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Final Scheduling Action */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '16px' }}>
                  <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                    Videos will release automatically on YouTube daily at <strong>{publishingTime} UTC</strong> ({defaultVisibility.toLowerCase()}).
                  </div>
                  <button
                    onClick={handleScheduleBatch}
                    disabled={schedulingBatch}
                    style={{
                      background: 'linear-gradient(135deg, #10b981 0%, #00F0FF 100%)',
                      border: 'none',
                      color: '#000',
                      padding: '12px 28px',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: 800,
                      cursor: schedulingBatch ? 'wait' : 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: '0 8px 20px rgba(16, 185, 129, 0.3)',
                    }}
                  >
                    <span>{schedulingBatch ? '⏳ Scheduling All 30 Days...' : '🚀 Schedule All 30 Days to YouTube'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
