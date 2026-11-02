'use client';

import React from 'react';

export interface CreditEstimateBarProps {
  totalCredits: number;
  sceneCredits: number;
  voiceCredits: number;
  thumbnailCredits: number;
  userBalance?: number | null;
  isPreview?: boolean;
  className?: string;
}

export const CreditEstimateBar: React.FC<CreditEstimateBarProps> = ({
  totalCredits,
  sceneCredits,
  voiceCredits,
  thumbnailCredits,
  userBalance,
  isPreview = false,
  className = '',
}) => {
  const hasBalance = userBalance !== undefined && userBalance !== null;
  const isSufficient = hasBalance ? userBalance >= totalCredits : true;
  const shortfall = hasBalance ? Math.max(0, totalCredits - userBalance) : 0;

  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-50/80 via-purple-50/50 to-white border border-amber-200/80 shadow-sm ${className}`}
    >
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-sm font-bold text-xs">
          ⚡
        </span>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-900">
              {totalCredits} Credits
            </span>
            {isPreview && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-100 text-purple-700 uppercase tracking-wider">
                50% Preview Rate
              </span>
            )}
          </div>
          <div className="text-[11px] text-slate-500">
            Scenes: {sceneCredits}cr • Voice: {voiceCredits}cr • Thumb: {thumbnailCredits}cr
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {hasBalance && (
          <div className="text-right">
            <div className="text-xs font-medium text-slate-700">
              Wallet:{' '}
              <span className="font-bold text-slate-900">{userBalance} cr</span>
            </div>
            {isSufficient ? (
              <div className="text-[11px] font-medium text-emerald-600 flex items-center gap-1 justify-end">
                <span>✓</span> Sufficient Balance
              </div>
            ) : (
              <div className="text-[11px] font-semibold text-rose-600 flex items-center gap-1 justify-end">
                <span>⚠️</span> Short by {shortfall} cr
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
