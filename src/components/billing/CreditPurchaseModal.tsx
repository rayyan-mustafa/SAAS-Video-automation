'use client';

import React, { useState } from 'react';
import { CREDIT_PACKS, CreditPackConfig } from '@/lib/billing';

interface CreditPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (newBalance: number, creditsAdded: number) => void;
  userBalance?: number;
}

export const CreditPurchaseModal: React.FC<CreditPurchaseModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  userBalance,
}) => {
  const [selectedPackId, setSelectedPackId] = useState<string>('power_500');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [successResult, setSuccessResult] = useState<{ credits: number; newBalance: number } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const selectedPack = CREDIT_PACKS.find((p) => p.id === selectedPackId) || CREDIT_PACKS[1];

  const handlePurchase = async () => {
    setIsProcessing(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/credits/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packId: selectedPack.id }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessResult({
          credits: selectedPack.credits,
          newBalance: data.newBalance,
        });
        if (onSuccess) {
          onSuccess(data.newBalance, selectedPack.credits);
        }
      } else {
        setErrorMsg(data.error || 'Failed to process purchase');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Network error processing purchase');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-xl bg-white rounded-3xl border border-purple-100 shadow-2xl p-6 sm:p-8 overflow-hidden">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-sm font-bold transition-all"
        >
          ✕
        </button>

        {successResult ? (
          <div className="text-center py-6 space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-600 flex items-center justify-center text-3xl mx-auto shadow-inner">
              🎉
            </div>
            <h3 className="text-xl font-extrabold text-slate-900">
              Credits Added Successfully!
            </h3>
            <p className="text-sm text-slate-600 max-w-sm mx-auto">
              Added <span className="font-bold text-purple-700">+{successResult.credits} credits</span> to your wallet. Your new total balance is{' '}
              <span className="font-extrabold text-slate-900">{successResult.newBalance} credits</span>.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-4 px-6 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition-all cursor-pointer shadow-md"
            >
              Back to Studio
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Header */}
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 mb-2">
                <span>⚡</span> Instant Credit Boost
              </div>
              <h2 className="text-xl font-extrabold text-slate-900">
                Top Up Your Video Credits
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Extra credit packs stack directly on top of your plan allowance and remain valid for up to 365 days.
              </p>
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {errorMsg}
              </div>
            )}

            {/* Pack Cards Grid */}
            <div className="grid grid-cols-2 gap-3">
              {CREDIT_PACKS.map((pack) => {
                const isSelected = selectedPack.id === pack.id;
                return (
                  <button
                    key={pack.id}
                    type="button"
                    onClick={() => setSelectedPackId(pack.id)}
                    className={`p-4 rounded-2xl border text-left transition-all duration-150 cursor-pointer relative ${
                      isSelected
                        ? 'bg-purple-50/70 border-purple-500 shadow-md ring-2 ring-purple-200'
                        : 'bg-white border-slate-200 hover:border-purple-200 hover:bg-purple-50/20'
                    }`}
                  >
                    {pack.savingsPercent > 0 && (
                      <span className="absolute -top-2 right-3 px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-gradient-to-r from-purple-600 to-pink-500 text-white shadow-sm">
                        SAVE {pack.savingsPercent}%
                      </span>
                    )}

                    <div className="text-xs font-bold text-slate-600">
                      {pack.label}
                    </div>
                    <div className="text-xl font-black text-slate-900 mt-1 flex items-baseline gap-1">
                      <span>{pack.credits}</span>
                      <span className="text-xs font-semibold text-slate-400">credits</span>
                    </div>

                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100 text-xs">
                      <span className="font-extrabold text-purple-700">
                        ${pack.priceUsd}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {pack.validityDays}d valid
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Anti-Dispute Trust Banner */}
            <div className="p-3 rounded-2xl bg-emerald-50/80 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2">
              <span className="text-base">🛡️</span>
              <div>
                <span className="font-bold">Zero-Waste Trust Guarantee:</span>{' '}
                Failed or glitched renders are automatically refunded 100% back to your wallet instantly.
              </div>
            </div>

            {/* Buy CTA */}
            <div className="flex items-center justify-between pt-2">
              <div>
                <div className="text-xs text-slate-500 font-medium">Total Price:</div>
                <div className="text-xl font-black text-slate-900">
                  ${selectedPack.priceUsd}{' '}
                  <span className="text-xs font-normal text-slate-400">
                    (${selectedPack.perCreditCost.toFixed(3)}/cr)
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handlePurchase}
                  disabled={isProcessing}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-500 text-white font-bold text-xs shadow-md shadow-purple-200 hover:shadow-lg transition-all cursor-pointer disabled:opacity-50"
                >
                  {isProcessing ? 'Processing...' : `⚡ Buy ${selectedPack.credits} Credits`}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
