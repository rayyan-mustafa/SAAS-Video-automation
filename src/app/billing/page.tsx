'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

export default function BillingPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isAnnual, setIsAnnual] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchBilling();
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('status') === 'success') {
        setActionMsg('🎉 Payment successful! Your plan subscription and AI video credits are now active.');
      } else if (urlParams.get('status') === 'cancelled') {
        setActionMsg('Notice: Checkout was cancelled. No charges were made.');
      }
    }
  }, []);

  const fetchBilling = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/billing');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleTopUp = async (amount: number) => {
    try {
      setActionLoading(true);
      setActionMsg(null);
      const res = await fetch('/api/billing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topUpAmount: amount }),
      });
      const json = await res.json();
      if (res.ok) {
        setActionMsg(json.message || `Added ${amount} credits to your account.`);
        fetchBilling();
      } else {
        setActionMsg(json.error || 'Payment gateway setup required.');
      }
    } catch (err: any) {
      setActionMsg(`Notice: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSelectPlan = async (planId: string) => {
    try {
      setActionLoading(true);
      setActionMsg(null);
      const res = await fetch('/api/billing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId, isAnnual }),
      });
      const json = await res.json();
      if (res.ok) {
        if (json.url) {
          window.location.href = json.url;
          return;
        }
        setActionMsg(json.message || `Upgraded to ${planId.toUpperCase()} plan.`);
        fetchBilling();
      } else {
        setActionMsg(json.error || 'Payment gateway setup required in .env for live checkout.');
      }
    } catch (err: any) {
      setActionMsg(`Notice: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const credits = data?.credits;
  const plans = data?.plans || [];
  const transactions = data?.transactions || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', maxWidth: '1280px', margin: '0 auto' }}>
      {/* Header & Subtitle */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '3px 8px', background: 'var(--bg-secondary)', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-full)', marginBottom: '8px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-emerald)' }} />
            <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              TRANSPARENT VIDEO PRICING & TIERS
            </span>
          </div>
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
            Plans, Credits & Monetization
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Each video generation uses 25 credits. Choose a plan that matches your monthly content production schedule.
          </p>
        </div>

        {/* Monthly / Annual Billing Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-secondary)', padding: '4px', borderRadius: 'var(--radius-full)', border: '1px solid var(--border-medium)' }}>
          <button
            type="button"
            onClick={() => setIsAnnual(false)}
            className={`btn btn-sm ${!isAnnual ? 'btn-primary' : 'btn-ghost'}`}
            style={{ borderRadius: 'var(--radius-full)', fontSize: '12px' }}
          >
            Monthly Billing
          </button>
          <button
            type="button"
            onClick={() => setIsAnnual(true)}
            className={`btn btn-sm ${isAnnual ? 'btn-primary' : 'btn-ghost'}`}
            style={{ borderRadius: 'var(--radius-full)', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <span>Annual Billing</span>
            <span style={{ padding: '1px 6px', borderRadius: 'var(--radius-full)', background: 'var(--status-ready-bg)', color: 'var(--status-ready)', fontSize: '10px', fontWeight: 700 }}>
              SAVE 20%
            </span>
          </button>
        </div>
      </div>

      {actionMsg && (
        <div style={{ padding: '12px 16px', borderRadius: 'var(--radius-md)', background: 'var(--status-proc-bg)', border: '1px solid var(--status-proc-border)', color: 'var(--accent-primary)', fontSize: '13px' }}>
          ℹ️ {actionMsg}
        </div>
      )}

      {loading ? (
        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading billing details...</div>
      ) : (
        <>
          {/* Active Balance & Top-Up Card */}
          <div
            className="card card-glow"
            style={{
              padding: '28px',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '24px',
              alignItems: 'center',
              background: 'linear-gradient(135deg, rgba(22, 26, 38, 0.9) 0%, rgba(13, 16, 23, 0.95) 100%)',
            }}
          >
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.04em' }}>
                Active Plan Tier
              </div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#fff', marginTop: '4px' }}>
                {credits?.tier ? `${credits.tier} Plan` : 'PRO CREATOR Plan'}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--status-ready)', marginTop: '4px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--status-ready)' }} />
                <span>{credits?.subscription_status || 'ACTIVE'} Subscription</span>
              </div>
            </div>

            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.04em' }}>
                Remaining Balance
              </div>
              <div className="tabular-nums" style={{ fontSize: '32px', fontWeight: 800, color: 'var(--accent-emerald)', fontFamily: 'var(--font-mono)' }}>
                ⚡ {credits?.balance ?? 475}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                Can generate ~{Math.floor((credits?.balance ?? 475) / 25)} Full 1080p Videos
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.04em' }}>
                Instant Credit Top-Up
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button disabled={actionLoading} onClick={() => handleTopUp(100)} className="btn btn-secondary btn-sm" title="Adds 100 credits (~4 videos)">
                  +100 ($10)
                </button>
                <button disabled={actionLoading} onClick={() => handleTopUp(500)} className="btn btn-secondary btn-sm" title="Adds 500 credits (~20 videos)">
                  +500 ($40)
                </button>
                <button disabled={actionLoading} onClick={() => handleTopUp(1000)} className="btn btn-secondary btn-sm" title="Adds 1,000 credits (~40 videos)">
                  +1,000 ($75)
                </button>
              </div>
            </div>
          </div>

          {/* 2 PRODUCTION PRICING PACKAGES ($49 & $99) */}
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#fff', marginBottom: '16px' }}>
              Select Your Video Production Package
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
              {plans.map((p: any) => {
                const isCurrent = (credits?.tier || 'CREATOR').toLowerCase() === p.id.toLowerCase();
                const price = isAnnual ? p.price_annual : p.price_monthly;

                return (
                  <div
                    key={p.id}
                    className="card"
                    style={{
                      padding: '28px 24px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '18px',
                      border: p.is_popular ? '2px solid var(--accent-primary)' : isCurrent ? '1px solid var(--status-ready)' : '1px solid var(--border-subtle)',
                      background: p.is_popular ? 'linear-gradient(180deg, rgba(99, 102, 241, 0.08) 0%, rgba(16, 19, 26, 0.9) 100%)' : 'var(--gradient-card)',
                      position: 'relative',
                      boxShadow: p.is_popular ? '0 8px 32px rgba(99, 102, 241, 0.2)' : 'none',
                    }}
                  >
                    {/* Badge */}
                    {p.badge && (
                      <div
                        style={{
                          position: 'absolute',
                          top: '-11px',
                          right: '16px',
                          padding: '3px 10px',
                          background: 'var(--gradient-brand)',
                          color: '#fff',
                          fontSize: '10px',
                          fontWeight: 800,
                          borderRadius: 'var(--radius-full)',
                          letterSpacing: '0.04em',
                        }}
                      >
                        {p.badge}
                      </div>
                    )}

                    <div>
                      <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#fff', letterSpacing: '-0.01em' }}>
                        {p.name}
                      </h3>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginTop: '10px' }}>
                        <span className="tabular-nums" style={{ fontSize: '32px', fontWeight: 800, color: '#fff', fontFamily: 'var(--font-mono)' }}>
                          ${price}
                        </span>
                        <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                          / month {isAnnual ? '(billed annually)' : ''}
                        </span>
                      </div>
                    </div>

                    {/* Calculated Output Highlight Pill */}
                    <div style={{ padding: '10px 12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-medium)' }}>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent-cyan)', marginBottom: '2px' }}>
                        ⚡ {p.credits_monthly} Credits / month
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                        Creates <strong style={{ color: '#fff' }}>~{p.estimated_videos} Full 1080p Videos</strong> (or ~{p.estimated_shorts} Shorts)
                      </div>
                    </div>

                    {/* Features List */}
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {p.features.map((f: string, idx: number) => (
                        <li key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', lineHeight: 1.4 }}>
                          <span style={{ color: 'var(--status-ready)', fontWeight: 700 }}>✓</span>
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>

                    {/* CTA Button */}
                    <div style={{ marginTop: 'auto', paddingTop: '14px' }}>
                      <button
                        onClick={() => handleSelectPlan(p.id)}
                        disabled={actionLoading || isCurrent}
                        className={`btn ${isCurrent ? 'btn-secondary' : p.is_popular ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ width: '100%', padding: '10px 16px' }}
                      >
                        {isCurrent ? '✓ Current Plan' : p.cta_label}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Credit Usage History */}
          <div className="card" style={{ padding: '24px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#fff', marginBottom: '16px' }}>
              Credit Ledger & Generation Transactions
            </h2>

            {transactions.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                No credit transactions recorded yet. Creating a video deducts 25 credits.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-medium)', textAlign: 'left', color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase' }}>
                      <th style={{ padding: '10px 12px' }}>Date</th>
                      <th style={{ padding: '10px 12px' }}>Type</th>
                      <th style={{ padding: '10px 12px' }}>Description</th>
                      <th style={{ padding: '10px 12px' }}>Amount</th>
                      <th style={{ padding: '10px 12px' }}>Balance After</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((tx: any) => (
                      <tr key={tx.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '10px 12px', color: 'var(--text-secondary)' }}>
                          {new Date(tx.created_at).toLocaleDateString()}
                        </td>
                        <td style={{ padding: '10px 12px', fontWeight: 600, color: '#fff' }}>
                          {tx.type}
                        </td>
                        <td style={{ padding: '10px 12px', color: 'var(--text-secondary)' }}>
                          {tx.description}
                        </td>
                        <td className="tabular-nums" style={{ padding: '10px 12px', fontWeight: 700, color: tx.amount < 0 ? 'var(--status-error)' : 'var(--status-ready)' }}>
                          {tx.amount > 0 ? `+${tx.amount}` : tx.amount}
                        </td>
                        <td className="tabular-nums" style={{ padding: '10px 12px', color: '#fff' }}>
                          ⚡ {tx.balance_after}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
