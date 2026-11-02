'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { AgentStudioView } from '@/components/agent/AgentStudioView';
import CreateVideoWizard from '@/components/CreateVideoWizard';

function StudioContent() {
  const [viewMode, setViewMode] = useState<'agent' | 'wizard'>('agent');

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50/60 via-white to-purple-50/30 p-4 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Studio Navigation Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-xs font-bold text-slate-500 hover:text-purple-600 transition-colors flex items-center gap-1"
            >
              ← Dashboard
            </Link>
            <span className="text-slate-300">|</span>
            <h1 className="text-sm font-extrabold text-slate-900 tracking-tight">
              Tillercast Studio v3.0
            </h1>
          </div>

          <div className="flex items-center gap-2 bg-white border border-purple-100 rounded-full p-1 shadow-sm text-xs font-semibold">
            <button
              type="button"
              onClick={() => setViewMode('agent')}
              className={`px-3 py-1 rounded-full transition-all cursor-pointer ${
                viewMode === 'agent'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-purple-600'
              }`}
            >
              🤖 Agent Studio
            </button>
            <button
              type="button"
              onClick={() => setViewMode('wizard')}
              className={`px-3 py-1 rounded-full transition-all cursor-pointer ${
                viewMode === 'wizard'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-purple-600'
              }`}
            >
              📋 Classic Wizard
            </button>
          </div>
        </div>

        {/* Active Studio Canvas */}
        {viewMode === 'agent' ? (
          <AgentStudioView />
        ) : (
          <CreateVideoWizard hideBackLink={true} />
        )}
      </div>
    </div>
  );
}

export default function CreateVideoWizardPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-500">Loading Studio...</div>}>
      <StudioContent />
    </Suspense>
  );
}
