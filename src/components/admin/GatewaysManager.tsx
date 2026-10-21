'use client';

import React, { useState, useEffect } from 'react';

export interface PaymentGatewayItem {
  id: string;
  provider: 'stripe' | 'polar';
  displayName: string;
  description: string;
  mode: 'test' | 'live';
  isEnabled: boolean;
  isDefault: boolean;
  isConfigured: boolean;
  maskedCredentials: Record<string, string>;
  maskedWebhookSecret: string;
  webhookUrl: string;
  settings: Record<string, any>;
  lastTestedAt: string | null;
  lastTestStatus: string | null;
  lastTestError: string | null;
}

interface GatewaysManagerProps {
  onNotify: (msg: string) => void;
}

export default function GatewaysManager({ onNotify }: GatewaysManagerProps) {
  const [gateways, setGateways] = useState<PaymentGatewayItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Form edit states
  const [editingProvider, setEditingProvider] = useState<'stripe' | 'polar' | null>(null);
  const [formCreds, setFormCreds] = useState<Record<string, string>>({});
  const [formWebhookSecret, setFormWebhookSecret] = useState<string>('');
  const [formMode, setFormMode] = useState<'test' | 'live'>('test');
  const [formEnabled, setFormEnabled] = useState<boolean>(true);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

  // Test state
  const [testingGateway, setTestingGateway] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<Record<string, { success: boolean; latencyMs: number; message: string; mode?: string }>>({});

  useEffect(() => {
    fetchGateways();
  }, []);

  const fetchGateways = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/gateways');
      const data = await res.json();
      if (res.ok && data.gateways) {
        setGateways(data.gateways);
      }
    } catch (err) {
      console.error('Failed to load gateways:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSetDefault = async (provider: 'stripe' | 'polar') => {
    try {
      const res = await fetch('/api/admin/gateways', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, makeDefault: true }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        onNotify(`✓ ${provider.toUpperCase()} is now the active default payment gateway for customer checkouts`);
        fetchGateways();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to switch default gateway');
    }
  };

  const handleTestGateway = async (provider: 'stripe' | 'polar') => {
    try {
      setTestingGateway(provider);
      const res = await fetch('/api/admin/gateways/test', {
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
          message: data.message || (data.success ? 'Gateway connection verified' : 'Gateway test failed'),
          mode: data.mode,
        },
      }));
      if (data.success) {
        onNotify(`✓ ${provider.toUpperCase()} gateway live test succeeded in ${data.latencyMs}ms!`);
      } else {
        onNotify(`✕ ${provider.toUpperCase()} test failed: ${data.message || data.error}`);
      }
      fetchGateways();
    } catch (err: any) {
      setTestResult((prev) => ({
        ...prev,
        [provider]: {
          success: false,
          latencyMs: 0,
          message: err.message || 'Test failed',
        },
      }));
    } finally {
      setTestingGateway(null);
    }
  };

  const openEditModal = (gw: PaymentGatewayItem) => {
    setEditingProvider(gw.provider);
    setFormCreds({ ...gw.maskedCredentials });
    setFormWebhookSecret(gw.maskedWebhookSecret);
    setFormMode(gw.mode);
    setFormEnabled(gw.isEnabled);
    setShowSecrets({});
  };

  const closeEditModal = () => {
    setEditingProvider(null);
    setFormCreds({});
    setFormWebhookSecret('');
  };

  const handleSaveModal = async () => {
    if (!editingProvider) return;
    try {
      setSaving(true);
      const res = await fetch('/api/admin/gateways', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: editingProvider,
          mode: formMode,
          isEnabled: formEnabled,
          credentials: formCreds,
          webhookSecret: formWebhookSecret,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update gateway');
      }

      onNotify(`✓ ${editingProvider.toUpperCase()} configuration & secrets encrypted and saved`);
      closeEditModal();
      fetchGateways();
    } catch (err: any) {
      alert(err.message || 'Failed to save gateway');
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    onNotify(`✓ Copied ${label} to clipboard`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Intro info box */}
      <div
        style={{
          padding: '16px 20px',
          borderRadius: '12px',
          background: 'linear-gradient(135deg, rgba(99,102,241,0.1) 0%, rgba(56,189,248,0.1) 100%)',
          border: '1px solid rgba(99,102,241,0.3)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div>
          <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#fff', margin: '0 0 4px' }}>
            💳 Payment Gateway & Merchant of Record Hub
          </h4>
          <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>
            Switch between Stripe and Polar.sh at runtime without code deployment. All secrets are encrypted with AES-256-GCM.
          </p>
        </div>
        <button
          onClick={fetchGateways}
          disabled={loading}
          style={{
            padding: '7px 14px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 600,
            background: '#1e293b',
            color: '#38bdf8',
            border: '1px solid rgba(56,189,248,0.2)',
            cursor: 'pointer',
          }}
        >
          {loading ? 'Refreshing...' : '🔄 Refresh Status'}
        </button>
      </div>

      {/* Gateway Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '20px' }}>
        {gateways.map((gw) => {
          const result = testResult[gw.provider];
          return (
            <div
              key={gw.id}
              className="card"
              style={{
                padding: '24px',
                borderRadius: '14px',
                background: '#0e131f',
                border: gw.isDefault
                  ? '2px solid #10b981'
                  : '1px solid rgba(255,255,255,0.08)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '18px',
                position: 'relative',
              }}
            >
              <div>
                {/* Header row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#fff', margin: 0 }}>
                        {gw.displayName}
                      </h3>
                      {gw.isDefault && (
                        <span
                          style={{
                            padding: '3px 10px',
                            borderRadius: '20px',
                            fontSize: '11px',
                            fontWeight: 800,
                            background: 'rgba(16, 185, 129, 0.2)',
                            color: '#10b981',
                            border: '1px solid rgba(16, 185, 129, 0.4)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          ● ACTIVE CHECKOUT
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>
                      {gw.provider === 'stripe' ? 'Standard Payment Processor' : 'Merchant of Record (MoR)'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <span
                      style={{
                        padding: '3px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 700,
                        background: gw.mode === 'live' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                        color: gw.mode === 'live' ? '#34d399' : '#fbbf24',
                        border: `1px solid ${gw.mode === 'live' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
                      }}
                    >
                      {gw.mode.toUpperCase()} MODE
                    </span>

                    <span
                      style={{
                        padding: '3px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 600,
                        background: gw.isEnabled ? 'rgba(34, 197, 94, 0.15)' : 'rgba(148, 163, 184, 0.15)',
                        color: gw.isEnabled ? '#4ade80' : '#94a3b8',
                      }}
                    >
                      {gw.isEnabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                </div>

                <p style={{ fontSize: '12px', color: '#94a3b8', margin: '0 0 16px', lineHeight: 1.5 }}>
                  {gw.description}
                </p>

                {/* Webhook Endpoint Box with Copy Button */}
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#94a3b8', marginBottom: '4px' }}>
                    Webhook Destination URL (Configure in {gw.displayName} Dashboard):
                  </label>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <input
                      type="text"
                      readOnly
                      value={gw.webhookUrl}
                      style={{
                        flex: 1,
                        padding: '7px 10px',
                        borderRadius: '6px',
                        background: '#161b26',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: '#38bdf8',
                        fontSize: '11px',
                        fontFamily: 'monospace',
                      }}
                    />
                    <button
                      onClick={() => copyToClipboard(gw.webhookUrl, 'Webhook URL')}
                      style={{
                        padding: '0 12px',
                        borderRadius: '6px',
                        background: '#1e293b',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: '#fff',
                        fontSize: '11px',
                        cursor: 'pointer',
                        fontWeight: 600,
                      }}
                    >
                      Copy
                    </button>
                  </div>
                </div>

                {/* Masked Credentials Summary */}
                <div
                  style={{
                    background: '#161b26',
                    padding: '12px',
                    borderRadius: '8px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    fontSize: '11px',
                    fontFamily: 'monospace',
                  }}
                >
                  {Object.entries(gw.maskedCredentials).map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#94a3b8' }}>{k}:</span>
                      <span style={{ color: v ? '#38bdf8' : '#ef4444' }}>{v || 'Not Configured'}</span>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '6px' }}>
                    <span style={{ color: '#94a3b8' }}>webhook_secret:</span>
                    <span style={{ color: gw.maskedWebhookSecret ? '#10b981' : '#ef4444' }}>
                      {gw.maskedWebhookSecret || 'Missing Webhook Secret'}
                    </span>
                  </div>
                </div>

                {/* Test Result Readout */}
                {result && (
                  <div
                    style={{
                      marginTop: '10px',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      background: result.success ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                      border: `1px solid ${result.success ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
                      color: result.success ? '#34d399' : '#f87171',
                    }}
                  >
                    {result.message}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '14px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => handleTestGateway(gw.provider)}
                  disabled={testingGateway === gw.provider}
                  style={{
                    flex: 1,
                    padding: '9px 14px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 600,
                    background: '#1e293b',
                    color: '#fff',
                    border: '1px solid rgba(255,255,255,0.1)',
                    cursor: 'pointer',
                  }}
                >
                  {testingGateway === gw.provider ? 'Testing Handshake...' : '⚡ Test Handshake'}
                </button>

                <button
                  onClick={() => openEditModal(gw)}
                  style={{
                    flex: 1,
                    padding: '9px 14px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 600,
                    background: 'linear-gradient(135deg, rgba(56,189,248,0.2) 0%, rgba(59,130,246,0.2) 100%)',
                    color: '#38bdf8',
                    border: '1px solid rgba(56,189,248,0.3)',
                    cursor: 'pointer',
                  }}
                >
                  ⚙️ Edit Credentials
                </button>

                {!gw.isDefault && (
                  <button
                    onClick={() => handleSetDefault(gw.provider)}
                    style={{
                      width: '100%',
                      padding: '9px 14px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: 700,
                      background: 'rgba(16,185,129,0.15)',
                      color: '#10b981',
                      border: '1px solid rgba(16,185,129,0.4)',
                      cursor: 'pointer',
                    }}
                  >
                    ★ Set as Primary Checkout Gateway
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit Gateway Modal */}
      {editingProvider && (
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
              border: '1px solid rgba(16, 185, 129, 0.4)',
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
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#fff', margin: 0 }}>
                  Configure {editingProvider.toUpperCase()} Gateway
                </h3>
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                  Secret keys and webhook signing secrets are encrypted with AES-256-GCM.
                </span>
              </div>
              <button
                onClick={closeEditModal}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '20px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {/* Mode Selector */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#cbd5e1' }}>Gateway Environment Mode:</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setFormMode('test')}
                  style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 700,
                    background: formMode === 'test' ? 'rgba(245, 158, 11, 0.2)' : '#161b26',
                    color: formMode === 'test' ? '#fbbf24' : '#94a3b8',
                    border: formMode === 'test' ? '1px solid #fbbf24' : '1px solid rgba(255,255,255,0.1)',
                    cursor: 'pointer',
                  }}
                >
                  Sandbox / Test Mode
                </button>
                <button
                  type="button"
                  onClick={() => setFormMode('live')}
                  style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 700,
                    background: formMode === 'live' ? 'rgba(16, 185, 129, 0.2)' : '#161b26',
                    color: formMode === 'live' ? '#34d399' : '#94a3b8',
                    border: formMode === 'live' ? '1px solid #10b981' : '1px solid rgba(255,255,255,0.1)',
                    cursor: 'pointer',
                  }}
                >
                  Live Production Mode
                </button>
              </div>
            </div>

            {/* Credential Inputs */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {Object.keys(formCreds).map((k) => {
                const isVisible = showSecrets[k];
                return (
                  <div key={k}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                      {k.toUpperCase()}:
                    </label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        type={isVisible ? 'text' : 'password'}
                        value={formCreds[k] ?? ''}
                        onChange={(e) => setFormCreds({ ...formCreds, [k]: e.target.value })}
                        placeholder="Enter key or leave masked..."
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
                        onClick={() => setShowSecrets({ ...showSecrets, [k]: !isVisible })}
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
              })}

              {/* Webhook Secret Input */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                  WEBHOOK SIGNING SECRET:
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type={showSecrets['webhook'] ? 'text' : 'password'}
                    value={formWebhookSecret}
                    onChange={(e) => setFormWebhookSecret(e.target.value)}
                    placeholder="whsec_... or polar_whs_..."
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
                    onClick={() => setShowSecrets({ ...showSecrets, webhook: !showSecrets['webhook'] })}
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
                    {showSecrets['webhook'] ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>
            </div>

            {/* Enable toggle */}
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#fff', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={formEnabled}
                onChange={(e) => setFormEnabled(e.target.checked)}
              />
              Enable {editingProvider.toUpperCase()} Gateway
            </label>

            {/* Modal Footer */}
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
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: '#fff',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                {saving ? 'Encrypting & Saving...' : 'Save Gateway Settings'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
