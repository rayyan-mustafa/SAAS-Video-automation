'use client';

import React, { useState, useEffect } from 'react';

export interface WebhookEventItem {
  id: string;
  provider: string;
  event_id: string;
  event_type: string;
  payload_json: string | null;
  status: 'PROCESSED' | 'FAILED' | 'IGNORED';
  error_message: string | null;
  processed_at: string;
}

interface WebhooksManagerProps {
  onNotify: (msg: string) => void;
}

export default function WebhooksManager({ onNotify }: WebhooksManagerProps) {
  const [events, setEvents] = useState<WebhookEventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterProvider, setFilterProvider] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [search, setSearch] = useState('');

  // Selected event modal
  const [selectedEvent, setSelectedEvent] = useState<WebhookEventItem | null>(null);

  useEffect(() => {
    fetchWebhooks();
  }, []);

  const fetchWebhooks = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/integrations/logs?limit=100');
      const data = await res.json();
      if (res.ok && data.webhookEvents) {
        setEvents(data.webhookEvents);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredEvents = events.filter((ev) => {
    const matchProv = filterProvider === 'ALL' || ev.provider.toLowerCase() === filterProvider.toLowerCase();
    const matchStatus = filterStatus === 'ALL' || ev.status === filterStatus;
    const matchSearch =
      !search ||
      ev.event_id.toLowerCase().includes(search.toLowerCase()) ||
      ev.event_type.toLowerCase().includes(search.toLowerCase());
    return matchProv && matchStatus && matchSearch;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Filters Bar */}
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
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            value={filterProvider}
            onChange={(e) => setFilterProvider(e.target.value)}
            style={{
              padding: '7px 12px',
              borderRadius: '6px',
              fontSize: '12px',
              background: '#161b26',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#fff',
            }}
          >
            <option value="ALL">All Gateways</option>
            <option value="stripe">Stripe</option>
            <option value="polar">Polar.sh</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{
              padding: '7px 12px',
              borderRadius: '6px',
              fontSize: '12px',
              background: '#161b26',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#fff',
            }}
          >
            <option value="ALL">All Statuses</option>
            <option value="PROCESSED">Processed</option>
            <option value="FAILED">Failed</option>
            <option value="IGNORED">Ignored</option>
          </select>

          <input
            type="text"
            placeholder="Search Event ID or Type..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              padding: '7px 12px',
              borderRadius: '6px',
              fontSize: '12px',
              background: '#161b26',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#fff',
              minWidth: '220px',
            }}
          />
        </div>

        <button
          onClick={fetchWebhooks}
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
          {loading ? 'Refreshing...' : '🔄 Refresh Stream'}
        </button>
      </div>

      {/* Events Table */}
      <div
        className="card"
        style={{
          borderRadius: '12px',
          background: '#0e131f',
          border: '1px solid rgba(255,255,255,0.08)',
          overflow: 'hidden',
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
            <thead>
              <tr style={{ background: '#161b26', borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8' }}>
                <th style={{ padding: '12px 16px' }}>GATEWAY</th>
                <th style={{ padding: '12px 16px' }}>EVENT TYPE</th>
                <th style={{ padding: '12px 16px' }}>EVENT ID</th>
                <th style={{ padding: '12px 16px' }}>STATUS</th>
                <th style={{ padding: '12px 16px' }}>PROCESSED AT</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>
                    Loading webhook events stream...
                  </td>
                </tr>
              ) : filteredEvents.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>
                    No webhook events found. Incoming webhooks from Stripe and Polar will appear here in real time.
                  </td>
                </tr>
              ) : (
                filteredEvents.map((ev) => (
                  <tr
                    key={ev.id}
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', color: '#cbd5e1' }}
                  >
                    <td style={{ padding: '12px 16px' }}>
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 700,
                          background: ev.provider === 'stripe' ? 'rgba(99,102,241,0.2)' : 'rgba(56,189,248,0.2)',
                          color: ev.provider === 'stripe' ? '#818cf8' : '#38bdf8',
                        }}
                      >
                        {ev.provider.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#fff' }}>
                      {ev.event_type}
                    </td>
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: '#94a3b8' }}>
                      {ev.event_id}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 700,
                          background:
                            ev.status === 'PROCESSED'
                              ? 'rgba(16,185,129,0.15)'
                              : 'rgba(239,68,68,0.15)',
                          color: ev.status === 'PROCESSED' ? '#34d399' : '#f87171',
                        }}
                      >
                        {ev.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#94a3b8' }}>
                      {new Date(ev.processed_at).toLocaleString()}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <button
                        onClick={() => setSelectedEvent(ev)}
                        style={{
                          padding: '5px 10px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 600,
                          background: '#1e293b',
                          color: '#38bdf8',
                          border: '1px solid rgba(56,189,248,0.2)',
                          cursor: 'pointer',
                        }}
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inspect Event Payload Modal */}
      {selectedEvent && (
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
              maxWidth: '640px',
              borderRadius: '16px',
              background: '#0d131f',
              border: '1px solid rgba(56, 189, 248, 0.4)',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              maxHeight: '90vh',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#fff', margin: 0 }}>
                  Webhook Event: {selectedEvent.event_type}
                </h3>
                <span style={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'monospace' }}>
                  ID: {selectedEvent.event_id} • {selectedEvent.provider.toUpperCase()}
                </span>
              </div>
              <button
                onClick={() => setSelectedEvent(null)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '20px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {selectedEvent.error_message && (
              <div style={{ padding: '10px 12px', borderRadius: '6px', background: 'rgba(239,68,68,0.15)', color: '#f87171', fontSize: '12px' }}>
                Error: {selectedEvent.error_message}
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>
                Event Payload JSON:
              </label>
              <pre
                style={{
                  padding: '16px',
                  borderRadius: '8px',
                  background: '#000',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#38bdf8',
                  fontSize: '11px',
                  fontFamily: 'monospace',
                  overflowX: 'auto',
                  maxHeight: '400px',
                }}
              >
                {selectedEvent.payload_json
                  ? JSON.stringify(JSON.parse(selectedEvent.payload_json), null, 2)
                  : 'No payload captured'}
              </pre>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setSelectedEvent(null)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  background: '#1e293b',
                  color: '#fff',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
