'use client';

import React, { useState, useEffect } from 'react';

export interface AuditLogItem {
  id: string;
  admin_user: string;
  action: string;
  target_type: 'integration' | 'gateway';
  target_id: string;
  details_json: string | null;
  ip_address: string | null;
  created_at: string;
}

export interface ConnectionTestItem {
  id: string;
  provider: string;
  status: 'SUCCESS' | 'FAILED';
  latency_ms: number;
  endpoint: string | null;
  error_sanitized: string | null;
  tested_at: string;
}

interface LogsManagerProps {
  onNotify: (msg: string) => void;
}

export default function LogsManager({ onNotify }: LogsManagerProps) {
  const [subTab, setSubTab] = useState<'audit' | 'tests'>('audit');
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [testLogs, setTestLogs] = useState<ConnectionTestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/integrations/logs?limit=100');
      const data = await res.json();
      if (res.ok) {
        if (data.auditLogs) setAuditLogs(data.auditLogs);
        if (data.testLogs) setTestLogs(data.testLogs);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredAudit = auditLogs.filter((l) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      l.admin_user.toLowerCase().includes(s) ||
      l.action.toLowerCase().includes(s) ||
      l.target_id.toLowerCase().includes(s) ||
      (l.details_json && l.details_json.toLowerCase().includes(s))
    );
  });

  const filteredTests = testLogs.filter((t) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      t.provider.toLowerCase().includes(s) ||
      t.status.toLowerCase().includes(s) ||
      (t.endpoint && t.endpoint.toLowerCase().includes(s))
    );
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Header & Switcher */}
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
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setSubTab('audit')}
            style={{
              padding: '7px 16px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: subTab === 'audit' ? 700 : 500,
              background: subTab === 'audit' ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
              color: subTab === 'audit' ? '#38bdf8' : '#94a3b8',
              border: subTab === 'audit' ? '1px solid rgba(56, 189, 248, 0.4)' : '1px solid transparent',
              cursor: 'pointer',
            }}
          >
            🛡️ Security & Audit Trail ({auditLogs.length})
          </button>

          <button
            onClick={() => setSubTab('tests')}
            style={{
              padding: '7px 16px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: subTab === 'tests' ? 700 : 500,
              background: subTab === 'tests' ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
              color: subTab === 'tests' ? '#10b981' : '#94a3b8',
              border: subTab === 'tests' ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid transparent',
              cursor: 'pointer',
            }}
          >
            ⚡ Connection Test Logs ({testLogs.length})
          </button>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Filter logs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
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
            onClick={fetchLogs}
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
            {loading ? 'Refreshing...' : '🔄 Refresh Logs'}
          </button>
        </div>
      </div>

      {/* Audit Logs Table */}
      {subTab === 'audit' && (
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
                  <th style={{ padding: '12px 16px' }}>ADMIN USER</th>
                  <th style={{ padding: '12px 16px' }}>ACTION</th>
                  <th style={{ padding: '12px 16px' }}>TARGET</th>
                  <th style={{ padding: '12px 16px' }}>CHANGES SUMMARY</th>
                  <th style={{ padding: '12px 16px' }}>IP ADDRESS</th>
                  <th style={{ padding: '12px 16px' }}>TIMESTAMP</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>
                      Loading audit logs...
                    </td>
                  </tr>
                ) : filteredAudit.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>
                      No audit logs found.
                    </td>
                  </tr>
                ) : (
                  filteredAudit.map((log) => (
                    <tr
                      key={log.id}
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', color: '#cbd5e1' }}
                    >
                      <td style={{ padding: '12px 16px', fontWeight: 600, color: '#38bdf8' }}>
                        {log.admin_user}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '10px',
                            fontWeight: 700,
                            background:
                              log.action === 'CREATE'
                                ? 'rgba(34,197,94,0.15)'
                                : log.action === 'SWITCH_PRIMARY'
                                ? 'rgba(99,102,241,0.2)'
                                : 'rgba(56,189,248,0.15)',
                            color:
                              log.action === 'CREATE'
                                ? '#4ade80'
                                : log.action === 'SWITCH_PRIMARY'
                                ? '#a5b4fc'
                                : '#38bdf8',
                          }}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 600, color: '#fff' }}>
                        {log.target_type}: {log.target_id}
                      </td>
                      <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: '11px', color: '#94a3b8', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {log.details_json || '—'}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#64748b', fontFamily: 'monospace' }}>
                        {log.ip_address || 'internal'}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#94a3b8' }}>
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Connection Test Logs Table */}
      {subTab === 'tests' && (
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
                  <th style={{ padding: '12px 16px' }}>PROVIDER</th>
                  <th style={{ padding: '12px 16px' }}>STATUS</th>
                  <th style={{ padding: '12px 16px' }}>LATENCY</th>
                  <th style={{ padding: '12px 16px' }}>ENDPOINT / ERROR</th>
                  <th style={{ padding: '12px 16px' }}>TESTED AT</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>
                      Loading connection test logs...
                    </td>
                  </tr>
                ) : filteredTests.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>
                      No connection tests executed yet. Run a Test Connection from the Integrations or Gateways tab.
                    </td>
                  </tr>
                ) : (
                  filteredTests.map((t) => (
                    <tr
                      key={t.id}
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', color: '#cbd5e1' }}
                    >
                      <td style={{ padding: '12px 16px', fontWeight: 700, color: '#fff' }}>
                        {t.provider.toUpperCase()}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 700,
                            background:
                              t.status === 'SUCCESS' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                            color: t.status === 'SUCCESS' ? '#34d399' : '#f87171',
                          }}
                        >
                          {t.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontWeight: 600, color: t.latency_ms < 500 ? '#4ade80' : '#fbbf24' }}>
                        {t.latency_ms}ms
                      </td>
                      <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: '11px', color: t.status === 'SUCCESS' ? '#94a3b8' : '#f87171' }}>
                        {t.error_sanitized || t.endpoint || '—'}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#94a3b8' }}>
                        {new Date(t.tested_at).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
