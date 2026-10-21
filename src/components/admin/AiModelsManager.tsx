'use client';

import React, { useState, useEffect } from 'react';
import { IntegrationItem } from './IntegrationsManager';

interface AiModelsManagerProps {
  onNotify: (msg: string) => void;
}

export default function AiModelsManager({ onNotify }: AiModelsManagerProps) {
  const [integrations, setIntegrations] = useState<IntegrationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingProvider, setSavingProvider] = useState<string | null>(null);

  useEffect(() => {
    fetchIntegrations();
  }, []);

  const fetchIntegrations = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/integrations');
      const data = await res.json();
      if (res.ok && data.integrations) {
        setIntegrations(data.integrations);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSetPrimary = async (provider: string, category: string) => {
    try {
      setSavingProvider(provider);
      const res = await fetch('/api/admin/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          isPrimary: true,
          isActive: true,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        onNotify(`✓ Set ${provider.toUpperCase()} as primary engine for ${category.replace('_', ' ')}`);
        fetchIntegrations();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update primary engine');
    } finally {
      setSavingProvider(null);
    }
  };

  const handleUpdateModel = async (provider: string, defaultModel: string) => {
    try {
      setSavingProvider(provider);
      const item = integrations.find((i) => i.provider === provider);
      const currentSettings = item?.settings || {};

      const res = await fetch('/api/admin/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          settings: { ...currentSettings, defaultModel },
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        onNotify(`✓ Updated default model for ${provider.toUpperCase()} to ${defaultModel}`);
        fetchIntegrations();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update model');
    } finally {
      setSavingProvider(null);
    }
  };

  const textProviders = integrations.filter((i) => i.category === 'ai_text');
  const videoProviders = integrations.filter((i) => i.category === 'ai_video');
  const voiceProviders = integrations.filter((i) => i.category === 'voice');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Scriptwriting Section */}
      <div
        className="card"
        style={{
          padding: '24px',
          borderRadius: '14px',
          background: '#0e131f',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <div style={{ marginBottom: '16px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#fff', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🧠</span> Scriptwriting & NLP AI Engines
          </h3>
          <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>
            Select which LLM generates video scripts, scene narration, and visual prompts for new projects.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '14px' }}>
          {textProviders.map((p) => (
            <div
              key={p.provider}
              style={{
                padding: '16px',
                borderRadius: '10px',
                background: '#161b26',
                border: p.isPrimary ? '2px solid #38bdf8' : '1px solid rgba(255,255,255,0.08)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '12px',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <strong style={{ fontSize: '14px', color: '#fff' }}>{p.displayName}</strong>
                  {p.isPrimary && (
                    <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 700, background: 'rgba(56,189,248,0.2)', color: '#38bdf8' }}>
                      ACTIVE PRIMARY
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '10px' }}>
                  {p.description}
                </div>

                {p.supportedModels.length > 0 && (
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#cbd5e1', marginBottom: '4px' }}>
                      Active Model:
                    </label>
                    <select
                      value={p.settings?.defaultModel || p.supportedModels[0]}
                      onChange={(e) => handleUpdateModel(p.provider, e.target.value)}
                      style={{
                        width: '100%',
                        padding: '7px 10px',
                        borderRadius: '6px',
                        background: '#0e131f',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: '#38bdf8',
                        fontSize: '12px',
                      }}
                    >
                      {p.supportedModels.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {!p.isPrimary && (
                <button
                  onClick={() => handleSetPrimary(p.provider, 'ai_text')}
                  disabled={savingProvider === p.provider}
                  style={{
                    padding: '8px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 600,
                    background: '#1e293b',
                    color: '#fff',
                    border: '1px solid rgba(255,255,255,0.1)',
                    cursor: 'pointer',
                  }}
                >
                  {savingProvider === p.provider ? 'Updating...' : 'Set as Primary Script Engine'}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Video Diffusion Section */}
      <div
        className="card"
        style={{
          padding: '24px',
          borderRadius: '14px',
          background: '#0e131f',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <div style={{ marginBottom: '16px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#fff', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🎥</span> AI Video Diffusion Engines
          </h3>
          <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>
            Configure generative video models (Wan 2.1, MiniMax, Veo, Sora) used for generating cinematic B-roll scenes.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '14px' }}>
          {videoProviders.map((p) => (
            <div
              key={p.provider}
              style={{
                padding: '16px',
                borderRadius: '10px',
                background: '#161b26',
                border: p.isPrimary ? '2px solid #a78bfa' : '1px solid rgba(255,255,255,0.08)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '12px',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <strong style={{ fontSize: '14px', color: '#fff' }}>{p.displayName}</strong>
                  {p.isPrimary && (
                    <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 700, background: 'rgba(167,139,250,0.2)', color: '#a78bfa' }}>
                      PRIMARY DIFFUSION
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '10px' }}>
                  {p.description}
                </div>

                {p.supportedModels.length > 0 && (
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#cbd5e1', marginBottom: '4px' }}>
                      Active Diffusion Model:
                    </label>
                    <select
                      value={p.settings?.defaultModel || p.supportedModels[0]}
                      onChange={(e) => handleUpdateModel(p.provider, e.target.value)}
                      style={{
                        width: '100%',
                        padding: '7px 10px',
                        borderRadius: '6px',
                        background: '#0e131f',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: '#a78bfa',
                        fontSize: '12px',
                      }}
                    >
                      {p.supportedModels.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {!p.isPrimary && (
                <button
                  onClick={() => handleSetPrimary(p.provider, 'ai_video')}
                  disabled={savingProvider === p.provider}
                  style={{
                    padding: '8px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 600,
                    background: '#1e293b',
                    color: '#fff',
                    border: '1px solid rgba(255,255,255,0.1)',
                    cursor: 'pointer',
                  }}
                >
                  {savingProvider === p.provider ? 'Updating...' : 'Set as Primary Video Engine'}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Voice Synthesis Section */}
      <div
        className="card"
        style={{
          padding: '24px',
          borderRadius: '14px',
          background: '#0e131f',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <div style={{ marginBottom: '16px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#fff', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🎙️</span> Voice Synthesis & TTS Engines
          </h3>
          <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>
            Choose between Microsoft Edge Neural Voice (built-in, zero cost) and ElevenLabs Studio Voice.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '14px' }}>
          {voiceProviders.map((p) => (
            <div
              key={p.provider}
              style={{
                padding: '16px',
                borderRadius: '10px',
                background: '#161b26',
                border: p.isPrimary ? '2px solid #10b981' : '1px solid rgba(255,255,255,0.08)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '12px',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <strong style={{ fontSize: '14px', color: '#fff' }}>{p.displayName}</strong>
                  {p.isPrimary && (
                    <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 700, background: 'rgba(16,185,129,0.2)', color: '#10b981' }}>
                      PRIMARY TTS
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '10px' }}>
                  {p.description}
                </div>
              </div>

              {!p.isPrimary && (
                <button
                  onClick={() => handleSetPrimary(p.provider, 'voice')}
                  disabled={savingProvider === p.provider}
                  style={{
                    padding: '8px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 600,
                    background: '#1e293b',
                    color: '#fff',
                    border: '1px solid rgba(255,255,255,0.1)',
                    cursor: 'pointer',
                  }}
                >
                  {savingProvider === p.provider ? 'Updating...' : 'Set as Primary Voice Engine'}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
