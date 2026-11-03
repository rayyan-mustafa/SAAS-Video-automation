'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { PUBLIC_PLANS } from '@/lib/site-plans';

export function PricingTable() {
  const [cycle, setCycle] = useState<'monthly' | 'annual'>('annual');

  return (
    <div>
      <div className="flex justify-center">
        <div className="inline-flex items-center gap-1 p-1 bg-white rounded-full border border-purple-100 shadow-sm text-sm font-bold" role="group" aria-label="Billing cycle">
          <button
            type="button"
            onClick={() => setCycle('monthly')}
            aria-pressed={cycle === 'monthly'}
            className={`px-4 py-1.5 rounded-full transition-colors ${cycle === 'monthly' ? 'bg-purple-600 text-white' : 'text-slate-600 hover:text-purple-700'}`}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setCycle('annual')}
            aria-pressed={cycle === 'annual'}
            className={`px-4 py-1.5 rounded-full transition-colors flex items-center gap-1.5 ${cycle === 'annual' ? 'bg-purple-600 text-white' : 'text-slate-600 hover:text-purple-700'}`}
          >
            Annual
            <span className="px-1.5 rounded text-[10px] font-black bg-emerald-100 text-emerald-800">SAVE ~20%</span>
          </button>
        </div>
      </div>

      <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
        {PUBLIC_PLANS.map((p) => {
          const price = cycle === 'annual' ? p.annual : p.monthly;
          return (
            <div
              key={p.id}
              className={`relative p-6 rounded-3xl bg-white flex flex-col ${p.popular ? 'border-2 border-purple-500 shadow-xl ring-4 ring-purple-100/60' : 'border border-purple-100 shadow-sm'}`}
            >
              {p.popular && (
                <span className="absolute -top-3 left-6 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-gradient-to-r from-purple-600 to-pink-500 text-white">
                  Most popular
                </span>
              )}
              <h3 className="text-base font-bold text-slate-900">{p.name}</h3>
              <p className="mt-1 text-sm text-slate-500">{p.blurb}</p>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-black text-slate-950">${price}</span>
                <span className="text-sm text-slate-500">/month</span>
              </div>
              <p className="text-xs text-slate-500 mt-1 min-h-[1rem]">
                {cycle === 'annual' ? `Billed annually ($${price * 12}/year)` : 'Billed monthly, cancel anytime'}
              </p>
              <ul className="mt-5 space-y-2.5 text-sm text-slate-600 flex-1">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <svg className="mt-0.5 shrink-0 text-purple-600" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M5 12l5 5 9-10" />
                    </svg>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Link
                href={`/signup?plan=${p.id}`}
                className={`mt-6 block w-full py-3 rounded-xl text-center text-sm font-extrabold transition-shadow ${
                  p.popular
                    ? 'bg-gradient-to-r from-purple-600 to-pink-500 text-white shadow-md shadow-purple-200 hover:shadow-lg'
                    : 'bg-white text-purple-700 border border-purple-200 hover:bg-purple-50'
                }`}
              >
                Get {p.name} (${price}/mo)
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
