'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useToast } from '@/components/Toast';

interface Channel {
  id: string;
  name: string;
  niche: string;
  language: string;
  voice: string;
  voice_speed: string;
  target_duration_minutes: number;
  visual_style: string;
  subtitle_style: string;
  intro_style: string;
  outro_cta: string;
  publishing_platform: string;
  content_rules: string;
  publishing_days?: string;
  publishing_time?: string;
  timezone?: string;
  default_visibility?: 'PRIVATE' | 'UNLISTED' | 'PUBLIC';
  auto_publish?: number;
  video_count?: number;
  created_at: string;
}

const NICHE_PRESETS = [
  { id: 'ai', label: '🤖 AI & Tech', niche: 'Cutting-edge AI tools, future tech trends, and technological innovations' },
  { id: 'finance', label: '💰 Wealth & Finance', niche: 'Personal finance, smart investing, wealth building, and financial psychology' },
  { id: 'stoic', label: '🧠 Stoicism & Mindset', niche: 'Stoic philosophy, mental mastery, discipline, and emotional resilience' },
  { id: 'crime', label: '🕵️ True Crime & Mystery', niche: 'Unsolved criminal cases, bizarre mysteries, and psychological investigations' },
  { id: 'history', label: '🏛️ Forgotten History', niche: 'Untold historical events, pivotal battles, and ancient civilizations' },
  { id: 'science', label: '🌌 Space & Science', niche: 'Mind-bending astrophysics, cosmos exploration, and scientific breakthroughs' },
];

const DAYS_SHORT = [
  { full: 'Monday', short: 'Mon' },
  { full: 'Tuesday', short: 'Tue' },
  { full: 'Wednesday', short: 'Wed' },
  { full: 'Thursday', short: 'Thu' },
  { full: 'Friday', short: 'Fri' },
  { full: 'Saturday', short: 'Sat' },
  { full: 'Sunday', short: 'Sun' },
];

const DURATION_OPTIONS = [
  { value: 1, label: '⚡ 60s Shorts', desc: 'YouTube Shorts & TikToks' },
  { value: 5, label: '⏱️ 5 Mins', desc: 'Quick punchy videos' },
  { value: 8, label: '🎬 8 Mins', desc: 'Mid-roll monetization standard' },
  { value: 12, label: '📚 12 Mins', desc: 'Deep dive documentary' },
];

export default function ChannelsPage() {
  const toast = useToast();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingChannel, setEditingChannel] = useState<Channel | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'persona' | 'schedule'>('general');

  // Delete confirmation modal state
  const [deleteTarget, setDeleteTarget] = useState<Channel | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [niche, setNiche] = useState('');
  const [language, setLanguage] = useState('en');
  const [voice, setVoice] = useState('en-US-ChristopherNeural');
  const [voiceSpeed, setVoiceSpeed] = useState('1.0x');
  const [targetDuration, setTargetDuration] = useState(8);
  const [visualStyle, setVisualStyle] = useState('Cinematic High-Contrast');
  const [subtitleStyle, setSubtitleStyle] = useState('Modern Clean White');
  const [introStyle, setIntroStyle] = useState('High-Impact Dramatic Question');
  const [outroCta, setOutroCta] = useState('Subscribe to the channel and leave your thoughts below');
  const [publishingPlatform, setPublishingPlatform] = useState('YouTube');
  const [contentRules, setContentRules] = useState('Engaging, clear, professional delivery');
  const [selectedDays, setSelectedDays] = useState<string[]>(['Monday', 'Wednesday', 'Friday']);
  const [publishingTime, setPublishingTime] = useState('14:00');
  const [timezone, setTimezone] = useState('UTC');
  const [defaultVisibility, setDefaultVisibility] = useState<'PRIVATE' | 'UNLISTED' | 'PUBLIC'>('PRIVATE');
  const [autoPublish, setAutoPublish] = useState(false);

  const fetchChannels = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/channels');
      if (res.ok) {
        const data = await res.json();
        setChannels(data.channels || []);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch channels');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChannels();
  }, []);

  const openCreateModal = () => {
    setEditingChannel(null);
    setName('');
    setNiche('');
    setLanguage('en');
    setVoice('en-US-ChristopherNeural');
    setVoiceSpeed('1.0x');
    setTargetDuration(5);
    setVisualStyle('Cinematic High-Contrast');
    setSubtitleStyle('Modern Clean White');
    setIntroStyle('High-Impact Dramatic Question');
    setOutroCta('Subscribe to the channel and leave your thoughts below');
    setPublishingPlatform('YouTube');
    setContentRules('Engaging, clear, professional delivery');
    setSelectedDays(['Monday', 'Wednesday', 'Friday']);
    setPublishingTime('14:00');
    setTimezone('UTC');
    setDefaultVisibility('PRIVATE');
    setAutoPublish(false);
    setShowModal(true);
  };

  const openEditModal = (ch: Channel) => {
    setEditingChannel(ch);
    setName(ch.name);
    setNiche(ch.niche);
    setLanguage(ch.language);
    setVoice(ch.voice);
    setVoiceSpeed(ch.voice_speed || '1.0x');
    setTargetDuration(ch.target_duration_minutes || 5);
    setVisualStyle(ch.visual_style || 'Cinematic High-Contrast');
    setSubtitleStyle(ch.subtitle_style || 'Modern Clean White');
    setIntroStyle(ch.intro_style || 'High-Impact Dramatic Question');
    setOutroCta(ch.outro_cta || 'Subscribe to the channel');
    setPublishingPlatform(ch.publishing_platform || 'YouTube');
    setContentRules(ch.content_rules || 'Engaging, clear, professional delivery');

    try {
      setSelectedDays(ch.publishing_days ? JSON.parse(ch.publishing_days) : ['Monday', 'Wednesday', 'Friday']);
    } catch {
      setSelectedDays(['Monday', 'Wednesday', 'Friday']);
    }

    setPublishingTime(ch.publishing_time || '14:00');
    setTimezone(ch.timezone || 'UTC');
    setDefaultVisibility(ch.default_visibility || 'PRIVATE');
    setAutoPublish(!!ch.auto_publish);
    setShowModal(true);
  };

  const handleSaveChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast.warning('Please enter a channel name'); return; }
    if (!niche.trim()) { toast.warning('Please specify your channel niche'); return; }

    try {
      setSubmitting(true);
      const payload = {
        name: name.trim(),
        niche: niche.trim(),
        language,
        voice,
        voice_speed: voiceSpeed,
        target_duration_minutes: targetDuration,
        visual_style: visualStyle,
        subtitle_style: subtitleStyle,
        intro_style: introStyle,
        outro_cta: outroCta,
        publishing_platform: publishingPlatform,
        content_rules: contentRules,
        publishing_days: JSON.stringify(selectedDays),
        publishing_time: publishingTime,
        timezone,
        default_visibility: defaultVisibility,
        auto_publish: autoPublish ? 1 : 0,
      };

      const url = editingChannel ? `/api/channels/${editingChannel.id}` : '/api/channels';
      const method = editingChannel ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to save channel');

      toast.success(editingChannel ? 'Channel profile updated! ✨' : 'Channel created successfully! 🎉');
      setShowModal(false);
      await fetchChannels();
    } catch (err: any) {
      toast.error(err.message || 'An unexpected error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleDay = (day: string) => {
    if (selectedDays.includes(day)) {
      if (selectedDays.length > 1) setSelectedDays(selectedDays.filter((d) => d !== day));
    } else {
      setSelectedDays([...selectedDays, day]);
    }
  };

  const handleDeleteClick = (ch: Channel) => {
    setDeleteTarget(ch);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      const res = await fetch(`/api/channels/${deleteTarget.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to delete channel');
      }
      toast.success('Channel profile deleted');
      setChannels((prev) => prev.filter((c) => c.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err: any) {
      toast.error(err.message || 'Error deleting channel');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="content-container" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <h1 style={{ fontSize: '20px', fontWeight: 600, color: '#f4f4f5', letterSpacing: '-0.02em', margin: 0 }}>
              Channel Profiles
            </h1>
            <span style={{ fontSize: '11px', fontFamily: 'monospace', padding: '2px 8px', borderRadius: '4px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#a1a1aa' }}>
              {channels.length} {channels.length === 1 ? 'CHANNEL' : 'CHANNELS'}
            </span>
          </div>
          <p style={{ fontSize: '13px', color: '#71717a', margin: 0 }}>
            Configure niche presets, neural voice personas, and automated publishing calendars.
          </p>
        </div>

        <button onClick={openCreateModal} className="btn btn-primary btn-sm">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span>New Channel</span>
        </button>
      </div>

      {/* YouTube Connection Banner */}
      <div
        className="card"
        style={{
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          background: 'rgba(24, 24, 27, 0.65)',
          borderColor: 'rgba(255, 255, 255, 0.08)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '6px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#f4f4f5',
              flexShrink: 0,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z" />
              <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" fill="#09090b" />
            </svg>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#f4f4f5' }}>YouTube OAuth Bridge</span>
              <span style={{ fontSize: '10px', fontFamily: 'monospace', color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.25)', padding: '1px 5px', borderRadius: '3px' }}>
                DIRECT PIPELINE
              </span>
            </div>
            <div style={{ fontSize: '12px', color: '#71717a' }}>
              Connect your YouTube account to unlock 1-click video publishing and scheduled autopilot distribution.
            </div>
          </div>
        </div>
        <Link href="/settings/publishing" className="btn btn-secondary btn-sm">
          <span>Configure OAuth Bridge ➔</span>
        </Link>
      </div>

      {/* Grid */}
      {loading ? (
        <div style={{ padding: '60px', textAlign: 'center', color: '#71717a', fontFamily: 'monospace', fontSize: '13px' }}>
          Loading channel telemetry...
        </div>
      ) : channels.length === 0 ? (
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
              <rect x="2" y="7" width="20" height="15" rx="2" ry="2" />
              <polyline points="17 2 12 7 7 2" />
            </svg>
          </div>
          <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#f4f4f5', marginBottom: '4px' }}>No active channel profiles</h3>
          <p style={{ fontSize: '13px', color: '#71717a', maxWidth: '380px', margin: '0 auto 20px auto' }}>
            Set up your first channel profile to define your visual aesthetic, voiceover profile, and automation schedule.
          </p>
          <button onClick={openCreateModal} className="btn btn-primary btn-sm">
            + Create Your First Channel
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
          {channels.map((ch) => {
            let daysList: string[] = [];
            try {
              daysList = ch.publishing_days ? JSON.parse(ch.publishing_days) : [];
            } catch {
              daysList = [];
            }
            const daysShortStr = daysList.map(d => d.slice(0, 3).toUpperCase()).join(' • ') || 'MANUAL';

            return (
              <div
                key={ch.id}
                className="card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                  padding: '18px',
                  background: 'rgba(18, 18, 21, 0.8)',
                  borderColor: 'rgba(255, 255, 255, 0.08)',
                }}
              >
                {/* Card Header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '6px',
                        background: '#18181b',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        color: '#f4f4f5',
                        fontSize: '12px',
                        fontFamily: 'monospace',
                        flexShrink: 0,
                      }}
                    >
                      {ch.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#f4f4f5', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {ch.name}
                      </h3>
                      <span style={{ fontSize: '11px', color: '#71717a', fontFamily: 'monospace', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {ch.niche}
                      </span>
                    </div>
                  </div>

                  <span
                    style={{
                      fontSize: '10px',
                      fontFamily: 'monospace',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      color: '#a1a1aa',
                      textTransform: 'uppercase',
                      flexShrink: 0,
                    }}
                  >
                    {ch.publishing_platform || 'YOUTUBE'}
                  </span>
                </div>

                {/* Specs Matrix */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '8px',
                    padding: '10px 12px',
                    background: '#09090b',
                    borderRadius: '6px',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '9px', color: '#52525b', textTransform: 'uppercase', fontFamily: 'monospace', letterSpacing: '0.04em' }}>
                      DURATION
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: 500, color: '#e4e4e7', fontFamily: 'monospace' }}>
                      {ch.target_duration_minutes}m target
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '9px', color: '#52525b', textTransform: 'uppercase', fontFamily: 'monospace', letterSpacing: '0.04em' }}>
                      VOICE
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: 500, color: '#e4e4e7', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {ch.voice.split('-')[2]?.replace('Neural', '') || ch.voice}
                    </div>
                  </div>
                  <div style={{ gridColumn: 'span 2', paddingTop: '4px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                    <div style={{ fontSize: '9px', color: '#52525b', textTransform: 'uppercase', fontFamily: 'monospace', letterSpacing: '0.04em' }}>
                      SCHEDULE
                    </div>
                    <div style={{ fontSize: '11px', color: '#a1a1aa', fontFamily: 'monospace' }}>
                      {daysShortStr} {ch.publishing_time ? `@ ${ch.publishing_time} UTC` : ''}
                    </div>
                  </div>
                </div>

                {/* Telemetry Row */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', fontFamily: 'monospace', color: '#71717a' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span
                      style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        background: ch.auto_publish ? '#10b981' : '#52525b',
                        boxShadow: ch.auto_publish ? '0 0 6px rgba(16,185,129,0.5)' : 'none',
                      }}
                    />
                    <span style={{ color: ch.auto_publish ? '#10b981' : '#71717a' }}>
                      {ch.auto_publish ? 'AUTOPILOT ON' : 'MANUAL DISPATCH'}
                    </span>
                  </span>
                  <span>{ch.video_count || 0} VIDEOS</span>
                </div>

                {/* Card Actions */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '10px', borderTop: '1px solid rgba(255, 255, 255, 0.06)', marginTop: 'auto' }}>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      onClick={() => openEditModal(ch)}
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '3px 9px', fontSize: '11px', height: '26px' }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteClick(ch)}
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '3px 9px', fontSize: '11px', height: '26px', color: '#ef4444', borderColor: 'rgba(239,68,68,0.2)' }}
                    >
                      Delete
                    </button>
                  </div>

                  <Link
                    href={`/content/new?channel_id=${ch.id}`}
                    className="btn btn-primary btn-sm"
                    style={{ padding: '3px 10px', fontSize: '11px', height: '26px' }}
                  >
                    + Create Video
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Modal */}
      {showModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '16px',
          }}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: '540px',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '24px',
              background: '#121215',
              borderColor: 'rgba(255, 255, 255, 0.12)',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)',
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div>
                <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#f4f4f5', margin: 0, letterSpacing: '-0.01em' }}>
                  {editingChannel ? 'Edit Channel Profile' : 'New Channel Profile'}
                </h2>
                <p style={{ fontSize: '12px', color: '#71717a', margin: '2px 0 0 0' }}>
                  Define channel persona, visual style, and publishing parameters.
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="btn btn-secondary btn-sm"
                style={{ padding: '4px 8px', height: '28px', fontSize: '12px' }}
              >
                ✕
              </button>
            </div>

            {/* Segmented Tab Navigation */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: '4px',
                background: '#09090b',
                padding: '3px',
                borderRadius: '6px',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                marginBottom: '18px',
              }}
            >
              {(
                [
                  { id: 'general', label: '1. General' },
                  { id: 'persona', label: '2. Persona & Voice' },
                  { id: 'schedule', label: '3. Schedule' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    padding: '6px 8px',
                    fontSize: '11px',
                    fontWeight: activeTab === tab.id ? 600 : 500,
                    fontFamily: 'monospace',
                    borderRadius: '4px',
                    border: 'none',
                    cursor: 'pointer',
                    background: activeTab === tab.id ? '#27272a' : 'transparent',
                    color: activeTab === tab.id ? '#f4f4f5' : '#71717a',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <form onSubmit={handleSaveChannel} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* TAB 1: GENERAL */}
              {activeTab === 'general' && (
                <>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '11px', fontFamily: 'monospace' }}>CHANNEL NAME</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Apex AI & Tech"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '11px', fontFamily: 'monospace' }}>NICHE / TOPIC</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Cutting-edge artificial intelligence, future tech"
                      value={niche}
                      onChange={(e) => setNiche(e.target.value)}
                      required
                    />
                  </div>

                  {/* Niche Quick Presets */}
                  <div>
                    <div style={{ fontSize: '10px', color: '#52525b', fontFamily: 'monospace', marginBottom: '6px' }}>QUICK PRESETS</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                      {NICHE_PRESETS.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            if (!name) setName(p.label.replace(/^[^\s]+\s/, ''));
                            setNiche(p.niche);
                          }}
                          style={{
                            fontSize: '11px',
                            padding: '3px 7px',
                            borderRadius: '4px',
                            background: '#18181b',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            color: '#a1a1aa',
                            cursor: 'pointer',
                          }}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: '11px', fontFamily: 'monospace' }}>PLATFORM</label>
                      <select
                        className="form-select"
                        value={publishingPlatform}
                        onChange={(e) => setPublishingPlatform(e.target.value)}
                      >
                        <option value="YouTube">YouTube</option>
                        <option value="TikTok">TikTok</option>
                        <option value="Instagram">Instagram Reels</option>
                      </select>
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: '11px', fontFamily: 'monospace' }}>LANGUAGE</label>
                      <select className="form-select" value={language} onChange={(e) => setLanguage(e.target.value)}>
                        <option value="en">English (en-US)</option>
                        <option value="ur">Urdu (ur-PK)</option>
                        <option value="hi">Hindi (hi-IN)</option>
                        <option value="es">Spanish (es-ES)</option>
                        <option value="fr">French (fr-FR)</option>
                        <option value="de">German (de-DE)</option>
                      </select>
                    </div>
                  </div>
                </>
              )}

              {/* TAB 2: PERSONA & VOICE */}
              {activeTab === 'persona' && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: '11px', fontFamily: 'monospace' }}>TARGET DURATION</label>
                      <select
                        className="form-select"
                        value={targetDuration}
                        onChange={(e) => setTargetDuration(Number(e.target.value))}
                      >
                        <option value="1">1 Minute (Shorts)</option>
                        <option value="3">3 Minutes (Fast)</option>
                        <option value="5">5 Minutes (Standard)</option>
                        <option value="8">8 Minutes (Mid-roll)</option>
                        <option value="12">12 Minutes (Documentary)</option>
                      </select>
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: '11px', fontFamily: 'monospace' }}>NEURAL VOICE</label>
                      <select className="form-select" value={voice} onChange={(e) => setVoice(e.target.value)}>
                        <option value="en-US-ChristopherNeural">Christopher (US Male - Deep)</option>
                        <option value="en-US-JennyNeural">Jenny (US Female - Clear)</option>
                        <option value="en-US-GuyNeural">Guy (US Male - Natural)</option>
                        <option value="en-GB-SoniaNeural">Sonia (UK Female - Crisp)</option>
                        <option value="en-GB-RyanNeural">Ryan (UK Male - Authoritative)</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '11px', fontFamily: 'monospace' }}>VISUAL STYLE</label>
                    <select className="form-select" value={visualStyle} onChange={(e) => setVisualStyle(e.target.value)}>
                      <option value="Cinematic High-Contrast">Cinematic High-Contrast (Dark Studio)</option>
                      <option value="Documentary Minimalist">Documentary Minimalist (Monochrome)</option>
                      <option value="Cyber Cyberpunk Tech">Cyber Cyberpunk Tech (Futuristic)</option>
                      <option value="Emerald Nature Vitality">Emerald Nature Vitality (Organic)</option>
                      <option value="Gold Luxury Business">Gold Luxury Business (Executive)</option>
                      <option value="Vintage Historical Film">Vintage Historical Film (Grain & Sepia)</option>
                    </select>
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '11px', fontFamily: 'monospace' }}>SUBTITLE PRESET</label>
                    <select className="form-select" value={subtitleStyle} onChange={(e) => setSubtitleStyle(e.target.value)}>
                      <option value="Modern Clean White">Modern Clean White (Minimal Line-by-Line)</option>
                      <option value="Yellow Box Punchy">Yellow Box Punchy (Viral Shorts Style)</option>
                      <option value="Cyber Glow Cyan">Cyber Glow Cyan (Monospace Terminal)</option>
                    </select>
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '11px', fontFamily: 'monospace' }}>OUTRO CTA</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Subscribe to the channel and leave your thoughts below"
                      value={outroCta}
                      onChange={(e) => setOutroCta(e.target.value)}
                    />
                  </div>
                </>
              )}

              {/* TAB 3: SCHEDULE & AUTOPILOT */}
              {activeTab === 'schedule' && (
                <>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px',
                      background: '#09090b',
                      borderRadius: '6px',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#f4f4f5' }}>Autopilot Publishing</div>
                      <div style={{ fontSize: '11px', color: '#71717a' }}>Automatically queue & publish scheduled videos</div>
                    </div>
                    <input
                      type="checkbox"
                      id="chAutoPub"
                      checked={autoPublish}
                      onChange={(e) => setAutoPublish(e.target.checked)}
                      style={{ width: '16px', height: '16px', accentColor: '#ffffff', cursor: 'pointer' }}
                    />
                  </div>

                  <div>
                    <label className="form-label" style={{ fontSize: '11px', fontFamily: 'monospace' }}>PUBLISHING DAYS</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
                      {DAYS_SHORT.map((day) => {
                        const active = selectedDays.includes(day.full);
                        return (
                          <button
                            key={day.full}
                            type="button"
                            onClick={() => toggleDay(day.full)}
                            style={{
                              padding: '8px 2px',
                              fontSize: '11px',
                              fontWeight: active ? 600 : 500,
                              fontFamily: 'monospace',
                              borderRadius: '4px',
                              border: active ? '1px solid #ffffff' : '1px solid rgba(255, 255, 255, 0.08)',
                              background: active ? '#ffffff' : '#18181b',
                              color: active ? '#09090b' : '#71717a',
                              cursor: 'pointer',
                              textAlign: 'center',
                            }}
                          >
                            {day.short}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: '11px', fontFamily: 'monospace' }}>PUBLISHING TIME (UTC)</label>
                      <input
                        type="time"
                        className="form-input"
                        value={publishingTime}
                        onChange={(e) => setPublishingTime(e.target.value)}
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: '11px', fontFamily: 'monospace' }}>VISIBILITY</label>
                      <select
                        className="form-select"
                        value={defaultVisibility}
                        onChange={(e) => setDefaultVisibility(e.target.value as any)}
                      >
                        <option value="PRIVATE">Private</option>
                        <option value="UNLISTED">Unlisted</option>
                        <option value="PUBLIC">Public</option>
                      </select>
                    </div>
                  </div>
                </>
              )}

              {/* Modal Footer */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {activeTab !== 'general' && (
                    <button
                      type="button"
                      onClick={() => setActiveTab(activeTab === 'schedule' ? 'persona' : 'general')}
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: '11px', fontFamily: 'monospace' }}
                    >
                      ← Prev
                    </button>
                  )}
                  {activeTab !== 'schedule' && (
                    <button
                      type="button"
                      onClick={() => setActiveTab(activeTab === 'general' ? 'persona' : 'schedule')}
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: '11px', fontFamily: 'monospace' }}
                    >
                      Next →
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary btn-sm">
                    Cancel
                  </button>
                  <button type="submit" disabled={submitting} className="btn btn-primary btn-sm">
                    {submitting ? 'Saving...' : editingChannel ? 'Update Profile' : 'Create Channel'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 110,
            padding: '16px',
          }}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: '400px',
              padding: '20px',
              background: '#121215',
              borderColor: 'rgba(239, 68, 68, 0.3)',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '4px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#f4f4f5', margin: 0 }}>
                Delete Channel Profile?
              </h3>
            </div>
            <p style={{ fontSize: '12px', color: '#a1a1aa', margin: '0 0 16px 0', lineHeight: 1.5 }}>
              Are you sure you want to delete <strong style={{ color: '#fff' }}>"{deleteTarget.name}"</strong>? This will permanently remove its persona presets and automated schedule.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="btn btn-secondary btn-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={deleting}
                className="btn btn-sm"
                style={{ background: '#ef4444', color: '#fff', border: 'none', fontWeight: 500 }}
              >
                {deleting ? 'Deleting...' : 'Delete Profile'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
