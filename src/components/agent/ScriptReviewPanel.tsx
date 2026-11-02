'use client';

import React, { useState } from 'react';
import { AgentScript, AgentScriptScene } from '@/lib/agent/types';
import { VisualTierName, VISUAL_TIERS } from '@/lib/billing';

interface ScriptReviewPanelProps {
  script: AgentScript | null;
  isLoading: boolean;
  onRefineScene?: (sceneIndex: number, instruction: string) => void;
  onGeneratePreview?: () => void;
  onGenerateFinal?: () => void;
  className?: string;
}

export const ScriptReviewPanel: React.FC<ScriptReviewPanelProps> = ({
  script,
  isLoading,
  onRefineScene,
  onGeneratePreview,
  onGenerateFinal,
  className = '',
}) => {
  const [activeEditIndex, setActiveEditIndex] = useState<number | null>(null);
  const [editInstruction, setEditInstruction] = useState('');

  if (!script) {
    return (
      <div
        className={`flex flex-col items-center justify-center h-full bg-white rounded-3xl border border-purple-100 p-8 text-center ${className}`}
      >
        <div className="w-16 h-16 rounded-3xl bg-purple-50 text-purple-600 flex items-center justify-center text-2xl shadow-inner mb-4">
          🎬
        </div>
        <h3 className="text-base font-bold text-slate-800">
          Storyboard & Script Canvas
        </h3>
        <p className="text-xs text-slate-500 max-w-sm mt-1.5 leading-relaxed">
          Start chatting with the agent on the left. Your scene-by-scene script, visual prompts, and duration breakdown will appear here in real-time.
        </p>
        <div className="mt-6 flex flex-wrap gap-2 justify-center">
          <span className="text-[11px] font-medium text-slate-600 bg-slate-100 px-3 py-1 rounded-full">
            Zero-Waste Quote Preview
          </span>
          <span className="text-[11px] font-medium text-purple-700 bg-purple-50 px-3 py-1 rounded-full border border-purple-100">
            Per-Scene Conversational Refinement
          </span>
        </div>
      </div>
    );
  }

  const handleRefineSubmit = (sceneIndex: number) => {
    if (!editInstruction.trim() || !onRefineScene) return;
    onRefineScene(sceneIndex, editInstruction.trim());
    setEditInstruction('');
    setActiveEditIndex(null);
  };

  return (
    <div
      className={`flex flex-col h-full bg-white rounded-3xl border border-purple-100 shadow-sm overflow-hidden ${className}`}
    >
      {/* Top Header & Stats */}
      <div className="p-5 border-b border-purple-50 bg-gradient-to-r from-purple-50/40 via-white to-pink-50/20">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-100 text-purple-700">
                {script.aspectRatio} Aspect
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700">
                {script.vibe}
              </span>
            </div>
            <h2 className="text-base font-extrabold text-slate-900 mt-1">
              {script.title}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {onGeneratePreview && (
              <button
                type="button"
                onClick={onGeneratePreview}
                disabled={isLoading}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white hover:bg-purple-50 text-purple-700 border border-purple-200 shadow-sm transition-all cursor-pointer disabled:opacity-50"
              >
                🎥 Video Preview
              </button>
            )}
            {onGenerateFinal && (
              <button
                type="button"
                onClick={onGenerateFinal}
                disabled={isLoading}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-purple-600 to-pink-500 text-white shadow-md shadow-purple-200 hover:shadow-lg transition-all cursor-pointer disabled:opacity-50"
              >
                ⚡ Generate Final
              </button>
            )}
          </div>
        </div>

        {/* Script Quick Metrics */}
        <div className="flex flex-wrap items-center gap-4 mt-3 pt-3 border-t border-purple-50/80 text-xs text-slate-600 font-medium">
          <div>
            <span className="text-slate-400">Scenes:</span>{' '}
            <span className="font-bold text-slate-800">{script.sceneCount}</span>
          </div>
          <div>
            <span className="text-slate-400">Est. Duration:</span>{' '}
            <span className="font-bold text-slate-800">~{script.totalEstimatedSec}s</span>
          </div>
          <div>
            <span className="text-slate-400">Word Count:</span>{' '}
            <span className="font-bold text-slate-800">{script.wordCount} words</span>
          </div>
          <div>
            <span className="text-slate-400">Narrator:</span>{' '}
            <span className="font-bold text-purple-700">
              {script.voiceTier === 'elevenlabs' ? 'ElevenLabs Pro' : 'Neural2 Multi-Accent'}
            </span>
          </div>
        </div>
      </div>

      {/* Scene Cards Feed */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {script.scenes.map((scene, idx) => {
          const tierInfo = VISUAL_TIERS[scene.visual_tier] || VISUAL_TIERS.stock;
          const isEditing = activeEditIndex === idx;

          return (
            <div
              key={scene.sceneIndex}
              className="p-4 rounded-2xl bg-white border border-purple-100 hover:border-purple-200 shadow-sm transition-all duration-150 space-y-3"
            >
              {/* Scene Card Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-slate-900 text-white font-bold text-xs flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <span className="text-xs font-bold text-slate-800">
                    {scene.heading || `Scene ${idx + 1}`}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                    ~{scene.estimated_duration_sec}s
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      scene.visual_tier === 'cinema_ai_fast'
                        ? 'bg-amber-100 text-amber-800'
                        : scene.visual_tier === 'cinema_ai_lite'
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {tierInfo.label} ({tierInfo.creditsPerScene}cr)
                  </span>
                </div>
              </div>

              {/* Spoken Narration */}
              <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-100">
                <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1">
                  🎙️ Spoken Narration
                </div>
                <p className="text-xs text-slate-800 leading-relaxed font-normal">
                  "{scene.narration}"
                </p>
              </div>

              {/* Visual Prompt Description */}
              <div className="bg-purple-50/30 rounded-xl p-3 border border-purple-100/60">
                <div className="text-[10px] uppercase font-bold tracking-wider text-purple-600 mb-1 flex items-center justify-between">
                  <span>🎥 Visual Composition</span>
                  <span className="text-slate-500 font-normal">
                    {scene.camera_movement}
                  </span>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed font-normal">
                  {scene.visual_prompt}
                </p>
              </div>

              {/* Refinement Trigger */}
              {onRefineScene && (
                <div>
                  {isEditing ? (
                    <div className="mt-2 space-y-2 bg-purple-50/50 p-3 rounded-xl border border-purple-200">
                      <input
                        type="text"
                        value={editInstruction}
                        onChange={(e) => setEditInstruction(e.target.value)}
                        placeholder={`e.g. 'Show dramatic drone shot', 'Make narration punchier'`}
                        className="w-full text-xs px-3 py-2 rounded-lg bg-white border border-purple-200 focus:outline-none focus:border-purple-500"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleRefineSubmit(idx);
                        }}
                      />
                      <div className="flex gap-2 justify-end">
                        <button
                          type="button"
                          onClick={() => setActiveEditIndex(null)}
                          className="px-2.5 py-1 text-[11px] font-medium text-slate-500 hover:text-slate-800"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRefineSubmit(idx)}
                          className="px-3 py-1 text-[11px] font-bold text-white bg-purple-600 rounded-lg hover:bg-purple-700"
                        >
                          Apply Edit
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveEditIndex(idx);
                        setEditInstruction('');
                      }}
                      className="text-[11px] font-semibold text-purple-600 hover:text-purple-800 hover:underline flex items-center gap-1 cursor-pointer pt-1"
                    >
                      <span>✏️</span> Refine this scene with AI
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
