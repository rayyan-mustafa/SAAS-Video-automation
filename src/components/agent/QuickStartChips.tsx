'use client';

import React from 'react';

export interface QuickStartChip {
  id: string;
  icon: string;
  label: string;
  promptStarter: string;
}

export const DEFAULT_CHIPS: QuickStartChip[] = [
  {
    id: 'script_to_video',
    icon: '📝',
    label: 'Script to Video',
    promptStarter: 'Turn this script into a 45-second high-retention video: ',
  },
  {
    id: 'viral_documentary',
    icon: '🔥',
    label: 'Viral Documentary',
    promptStarter: 'Create a 45-second suspenseful documentary about the mystery of ',
  },
  {
    id: 'tech_explainer',
    icon: '🧠',
    label: 'Tech Explainer',
    promptStarter: 'Create a 60-second crisp educational explainer on how AI ',
  },
  {
    id: 'stat_cards',
    icon: '📊',
    label: 'Stat Cards',
    promptStarter: 'Create a rapid-fire data video with glassmorphic stat cards about ',
  },
  {
    id: 'viral_spy',
    icon: '🕵️',
    label: 'Viral Spy Topic',
    promptStarter: 'Adapt a viral competitor hook about ',
  },
];

interface QuickStartChipsProps {
  onSelectChip: (starter: string) => void;
  className?: string;
}

export const QuickStartChips: React.FC<QuickStartChipsProps> = ({
  onSelectChip,
  className = '',
}) => {
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <span className="text-xs font-semibold uppercase tracking-wider text-slate-600 mr-1">
        Quick start:
      </span>
      {DEFAULT_CHIPS.map((chip) => (
        <button
          key={chip.id}
          type="button"
          onClick={() => onSelectChip(chip.promptStarter)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-white hover:bg-purple-50 text-slate-700 hover:text-purple-700 border border-purple-100 hover:border-purple-300 shadow-sm transition-all duration-150 cursor-pointer hover:shadow"
        >
          <span>{chip.icon}</span>
          <span>{chip.label}</span>
        </button>
      ))}
    </div>
  );
};

