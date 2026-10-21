'use client';

import React, { useState, useEffect } from 'react';

export interface IntegrationItem {
  id: string;
  provider: string;
  category: string;
  displayName: string;
  description: string;
  isActive: boolean;
  isPrimary: boolean;
  isConfigured: boolean;
  configuredFields: Record<string, boolean>;
  maskedCredentials: Record<string, string>;
  settings: Record<string, any>;
  supportedModels: string[];
  lastTestedAt: string | null;
  lastTestStatus: 'SUCCESS' | 'FAILED' | 'PENDING' | null;
  lastTestLatencyMs: number | null;
  lastTestError: string | null;
}

interface IntegrationsManagerProps {
  onNotify: (msg: string) => void;
}

export default function IntegrationsManager({ onNotify }: IntegrationsManagerProps) {
  const [integrations, setIntegrations] = useState<IntegrationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Test state
  const [testingProvider, setTestingProvider] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<Record<string, { success: boolean; latencyMs: number; message: string; error?: string }>>({});

  // Edit Modal State
  const [editingItem, setEditingItem] = useState<IntegrationItem | null>(null);
  const [formCreds, setFormCreds] = useState<Record<string, string>>({});
  const [formSettings, setFormSettings] = useState<Record<string, any>>({});
  const [formIsActive, setFormIsActive] = useState<boolean>(true);
  const [formIsPrimary, setFormIsPrimary] = useState<boolean>(false);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

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
      console.error('Failed to load integrations:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async (provider: string) => {
    try {
      setTestingProvider(provider);
      const res = await fetch('/api/admin/integrations/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider }),
      });
      const data = await res.json();
      setTestResult((prev) => ({
        ...prev,
        [provider]: {
          success: data.success,
          latencyMs: data.latencyMs || 0,
          message: data.message || (data.success ? 'Connected successfully' : 'Connection failed'),
          error: data.error,
        },
      }));
      if (data.success) {
        onNotify(`✓ ${provider.toUpperCase()} handshake verified in ${data.latencyMs}ms!`);
      } else {
        onNotify(`✕ ${provider.toUpperCase()} failed: ${data.error || data.message}`);
      }
      fetchIntegrations();
    } catch (err: any) {
      setTestResult((prev) => ({
        ...prev,
        [provider]: {
          success: false,
          latencyMs: 0,
          message: err.message || 'Network error',
          error: err.message,
        },
      }));
    } finally {
      setTestingProvider(null);
    }
  };

  const openEditModal = (item: IntegrationItem) => {
    setEditingItem(item);
    setFormCreds({ ...item.maskedCredentials });
    setFormSettings({ ...item.settings });
    setFormIsActive(item.isActive);
    setFormIsPrimary(item.isPrimary);
    setShowSecrets({});
  };

  const closeEditModal = () => {
    setEditingItem(null);
    setFormCreds({});
    setFormSettings({});
  };

  const handleSaveModal = async () => {
    if (!editingItem) return;
    try {
      setSaving(true);
      const res = await fetch('/api/admin/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: editingItem.provider,
          credentials: formCreds,
          settings: formSettings,
          isActive: formIsActive,
          isPrimary: formIsPrimary,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save integration');
      }

      onNotify(`✓ ${editingItem.displayName} credentials updated and encrypted with AES-256-GCM`);
      closeEditModal();
      fetchIntegrations();
    } catch (err: any) {
      alert(err.message || 'Error saving integration');
    } finally {
      setSaving(false);
    }
  };

  const categories = [
    { id: 'ALL', label: 'All Providers' },
    { id: 'ai_text', label: '🧠 AI Script & NLP' },
    { id: 'ai_video', label: '🎥 AI Video Diffusion' },
    { id: 'stock_video', label: '🎞️ Stock Footage' },
    { id: 'voice', label: '🎙️ Voice & Speech' },
    { id: 'publishing', label: '📺 Publishing & Social' },
    { id: 'storage', label: '☁️ Cloud Storage' },
  ];

  const filteredIntegrations = integrations.filter((item) => {
    const matchesCategory = categoryFilter === 'ALL' || item.category === categoryFilter;
    const matchesSearch =
      !searchQuery ||
      item.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.provider.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Controls Bar */}
      <div
        className="card"
        style={{
          padding: '16px 20px',
          borderRadius: '12px',
          background: '#0e131f',
          border: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategoryFilter(cat.id)}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: categoryFilter === cat.id ? 700 : 500,
                background: categoryFilter === cat.id ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
                color: categoryFilter === cat.id ? '#38bdf8' : '#94a3b8',
                border: categoryFilter === cat.id ? '1px solid rgba(56, 189, 248, 0.4)' : '1px solid transparent',
                cursor: 'pointer',
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Search integrations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              padding: '7px 12px',
              borderRadius: '6px',
              fontSize: '12px',
              background: '#161b26',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#fff',
              minWidth: '200px',
            }}
          />
          <button
            onClick={fetchIntegrations}
            disabled={loading}
            style={{
              padding: '7px 14px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 600,
              background: '#1e293b',
              color: '#38bdf8',
              border: '1px solid rgba(56, 189, 248, 0.2)',
              cursor: 'pointer',
            }}
          >
            {loading ? 'Refreshing...' : '🔄 Refresh'}
          </button>
        </div>
      </div>

      {/* Integrations Grid */}
      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
          Loading secure integration vault...
        </div>
      ) : filteredIntegrations.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
          No integrations matched your filters.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '16px' }}>
          {filteredIntegrations.map((item) => {
            const result = testResult[item.provider];
            return (
              <div
                key={item.id}
                className="card"
                style={{
                  padding: '20px',
                  borderRadius: '12px',
                  background: '#0e131f',
                  border: item.isPrimary
                    ? '1px solid rgba(56, 189, 248, 0.5)'
                    : '1px solid rgba(255,255,255,0.08)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '16px',
                  position: 'relative',
                }}
              >
                {/* Header */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#fff', margin: 0 }}>
                          {item.displayName}
                        </h4>
                        {item.isPrimary && (
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '10px',
                              fontWeight: 700,
                              background: 'rgba(56, 189, 248, 0.2)',
                              color: '#38bdf8',
                              border: '1px solid rgba(56, 189, 248, 0.3)',
                            }}
                          >
                            PRIMARY
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        {item.category.replace('_', ' ')} • {item.provider}
                      </span>
                    </div>

                    <span
                      style={{
                        padding: '3px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 600,
                        background: item.isConfigured ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                        color: item.isConfigured ? '#4ade80' : '#f87171',
                        border: `1px solid ${item.isConfigured ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                      }}
                    >
                      {item.isConfigured ? '● Configured' : '○ Not Configured'}
                    </span>
                  </div>

                  <p style={{ fontSize: '12px', color: '#94a3b8', lineHeight: 1.5, margin: '6px 0 12px' }}>
                    {item.description}
                  </p>

                  {/* Masked Credentials Preview */}
                  <div style={{ background: '#161b26', padding: '10px 12px', borderRadius: '8px', fontSize: '11px', fontFamily: 'monospace', color: '#cbd5e1' }}>
                    {Object.keys(item.maskedCredentials).length === 0 ? (
                      <span style={{ color: '#64748b' }}>No API keys required (Built-in engine)</span>
                    ) : (
                      Object.entries(item.maskedCredentials).map(([k, v]) => (
                        <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span style={{ color: '#94a3b8' }}>{k}:</span>
                          <span style={{ color: v ? '#38bdf8' : '#ef4444' }}>{v || 'Not Set'}</span>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Default Model / Setting tag */}
                  {item.settings?.defaultModel && (
                    <div style={{ marginTop: '8px', fontSize: '11px', color: '#a78bfa' }}>
                      ⚡ Active Model: <strong>{item.settings.defaultModel}</strong>
                    </div>
                  )}

                  {/* Last Test readout */}
                  {item.lastTestedAt && (
                    <div style={{ marginTop: '8px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ color: item.lastTestStatus === 'SUCCESS' ? '#4ade80' : '#f87171' }}>
                        {item.lastTestStatus === 'SUCCESS' ? '✓ Online' : '✕ Error'}
                      </span>
                      {item.lastTestLatencyMs !== null && (
                        <span style={{ color: '#64748b' }}>({item.lastTestLatencyMs}ms)</span>
                      )}
                      <span style={{ color: '#64748b' }}>
                        • Tested {new Date(item.lastTestedAt).toLocaleTimeString()}
                      </span>
                    </div>
                  )}

                  {result && (
                    <div
                      style={{
                        marginTop: '8px',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        background: result.success ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                        border: `1px solid ${result.success ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
                        color: result.success ? '#4ade80' : '#f87171',
                      }}
                    >
                      {result.message}
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '8px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <button
                    onClick={() => handleTestConnection(item.provider)}
                    disabled={testingProvider === item.provider}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 600,
                      background: '#1e293b',
                      color: '#fff',
                      border: '1px solid rgba(255,255,255,0.1)',
                      cursor: 'pointer',
                    }}
                  >
                    {testingProvider === item.provider ? 'Pinging...' : '⚡ Test Ping'}
                  </button>

                  <button
                    onClick={() => openEditModal(item)}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 600,
                      background: 'linear-gradient(135deg, rgba(56,189,248,0.2) 0%, rgba(59,130,246,0.2) 100%)',
                      color: '#38bdf8',
                      border: '1px solid rgba(56,189,248,0.3)',
                      cursor: 'pointer',
                    }}
                  >
                    ⚙️ Configure
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Credentials Modal */}
      {editingItem && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.8)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '560px',
              borderRadius: '16px',
              background: '#0d131f',
              border: '1px solid rgba(56, 189, 248, 0.4)',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '18px',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#fff', margin: 0 }}>
                  Configure {editingItem.displayName}
                </h3>
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                  Credentials are encrypted at rest with AES-256-GCM.
                </span>
              </div>
              <button
                onClick={closeEditModal}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '20px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {/* Credential Fields */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {Object.keys(editingItem.maskedCredentials).length === 0 ? (
                <div style={{ padding: '12px', borderRadius: '8px', background: '#161b26', fontSize: '12px', color: '#94a3b8' }}>
                  This service is built-in and does not require third-party API credentials.
                </div>
              ) : (
                Object.keys(editingItem.maskedCredentials).map((key) => {
                  const isVisible = showSecrets[key];
                  return (
                    <div key={key}>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                        {key.toUpperCase()}:
                      </label>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <input
                          type={isVisible ? 'text' : 'password'}
                          value={formCreds[key] ?? ''}
                          onChange={(e) => setFormCreds({ ...formCreds, [key]: e.target.value })}
                          placeholder={editingItem.maskedCredentials[key] || 'Enter new key...'}
                          style={{
                            flex: 1,
                            padding: '9px 12px',
                            borderRadius: '6px',
                            background: '#161b26',
                            border: '1px solid rgba(255,255,255,0.1)',
                            color: '#fff',
                            fontSize: '12px',
                            fontFamily: 'monospace',
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowSecrets({ ...showSecrets, [key]: !isVisible })}
                          style={{
                            padding: '0 12px',
                            borderRadius: '6px',
                            background: '#1e293b',
                            border: '1px solid rgba(255,255,255,0.1)',
                            color: '#94a3b8',
                            cursor: 'pointer',
                            fontSize: '12px',
                          }}
                        >
                          {isVisible ? 'Hide' : 'Show'}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Supported Models Selector */}
            {editingItem.supportedModels && editingItem.supportedModels.length > 0 && (
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                  Default AI Model:
                </label>
                <select
                  value={formSettings.defaultModel || editingItem.supportedModels[0]}
                  onChange={(e) => setFormSettings({ ...formSettings, defaultModel: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '6px',
                    background: '#161b26',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                >
                  {editingItem.supportedModels.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Status & Priority Toggles */}
            <div style={{ display: 'flex', gap: '20px', padding: '12px', borderRadius: '8px', background: '#161b26' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#fff', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={formIsActive}
                  onChange={(e) => setFormIsActive(e.target.checked)}
                />
                Enable Integration
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#38bdf8', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={formIsPrimary}
                  onChange={(e) => setFormIsPrimary(e.target.checked)}
                />
                Set as Primary for {editingItem.category.replace('_', ' ')}
              </label>
            </div>

            {/* Footer Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
              <button
                type="button"
                onClick={closeEditModal}
                style={{
                  padding: '9px 18px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  background: '#1e293b',
                  color: '#94a3b8',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSaveModal}
                disabled={saving}
                style={{
                  padding: '9px 22px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 600,
                  background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
                  color: '#fff',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                {saving ? 'Encrypting & Saving...' : 'Save Configuration'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
