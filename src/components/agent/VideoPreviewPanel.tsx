'use client';

import React, { useState, useRef, useEffect } from 'react';
import { AgentScript, AgentScriptScene } from '@/lib/agent/types';

interface VideoPreviewPanelProps {
  script: AgentScript;
  previewUrl?: string;
  projectId?: string;
  onBackToScript?: () => void;
  onGenerateFinal?: () => void;
  onRefineScene?: (sceneIndex: number, instruction: string) => void;
  className?: string;
}

export const VideoPreviewPanel: React.FC<VideoPreviewPanelProps> = ({
  script,
  previewUrl,
  projectId,
  onBackToScript,
  onGenerateFinal,
  onRefineScene,
  className = '',
}) => {
  const [activeSceneIndex, setActiveSceneIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);

  const videoRef = useRef<HTMLVideoElement>(null);

  const activeScene = script.scenes[activeSceneIndex] || script.scenes[0];

  // Calculate cumulative timestamps for each scene
  const sceneTimestamps = script.scenes.map((s, idx) => {
    let start = 0;
    for (let i = 0; i < idx; i++) {
      start += script.scenes[i].estimated_duration_sec;
    }
    return {
      sceneIndex: idx,
      startSec: start,
      endSec: start + s.estimated_duration_sec,
    };
  });

  const totalDuration = script.totalEstimatedSec || 45;

  // Sync active scene with playback
  useEffect(() => {
    const found = sceneTimestamps.find(
      (t) => currentTime >= t.startSec && currentTime < t.endSec
    );
    if (found && found.sceneIndex !== activeSceneIndex) {
      setActiveSceneIndex(found.sceneIndex);
    }
  }, [currentTime]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play().catch(() => {});
      }
      setIsPlaying(!isPlaying);
    } else {
      setIsPlaying(!isPlaying);
    }
  };

  const jumpToScene = (idx: number) => {
    setActiveSceneIndex(idx);
    const ts = sceneTimestamps[idx];
    if (ts) {
      setCurrentTime(ts.startSec);
      if (videoRef.current) {
        videoRef.current.currentTime = ts.startSec;
      }
    }
  };

  return (
    <div
      className={`flex flex-col h-full bg-white rounded-3xl border border-purple-100 shadow-sm overflow-hidden ${className}`}
    >
      {/* Top Action Bar */}
      <div className="flex items-center justify-between p-4 border-b border-purple-50 bg-gradient-to-r from-purple-50/40 via-white to-pink-50/20">
        <div className="flex items-center gap-2">
          {onBackToScript && (
            <button
              type="button"
              onClick={onBackToScript}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-purple-50 border border-slate-200 shadow-sm transition-all cursor-pointer"
            >
              ← Edit Script
            </button>
          )}
          <span className="text-xs font-bold text-slate-900 truncate max-w-[200px]">
            {script.title}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
            Preview Mode
          </span>
          {onGenerateFinal && (
            <button
              type="button"
              onClick={onGenerateFinal}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-purple-600 to-pink-500 text-white shadow-md shadow-purple-200 hover:shadow-lg transition-all cursor-pointer"
            >
              ⚡ Approve & Render Final
            </button>
          )}
        </div>
      </div>

      {/* Main Theater Canvas */}
      <div className="flex-1 overflow-y-auto p-5 flex flex-col items-center justify-center bg-slate-900/5">
        <div className="w-full max-w-[320px] aspect-[9/16] bg-slate-950 rounded-2xl shadow-2xl relative overflow-hidden flex flex-col justify-between border-4 border-slate-800">
          {previewUrl ? (
            <video
              ref={videoRef}
              src={previewUrl}
              className="w-full h-full object-cover"
              onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime || 0)}
              onEnded={() => setIsPlaying(false)}
            />
          ) : (
            // Simulated Visual Preview Canvas
            <div className="relative w-full h-full flex flex-col justify-between p-4 bg-gradient-to-b from-black/80 via-transparent to-black/90">
              {/* Top Scene Tag */}
              <div className="flex items-center justify-between text-white text-[11px] font-bold">
                <span className="px-2 py-0.5 rounded bg-white/20 backdrop-blur-sm">
                  Scene {activeSceneIndex + 1}/{script.scenes.length}
                </span>
                <span className="text-purple-300">
                  {activeScene.camera_movement}
                </span>
              </div>

              {/* Center Visual Mock */}
              <div className="text-center text-white/80 space-y-2 px-2">
                <div className="text-3xl">🎬</div>
                <div className="text-xs font-semibold text-purple-200">
                  [{activeScene.visual_tier.toUpperCase()}]
                </div>
                <div className="text-[11px] text-slate-300 line-clamp-3 italic">
                  "{activeScene.visual_prompt}"
                </div>
              </div>

              {/* Bottom Kinetic Subtitles */}
              <div className="text-center pb-2">
                <div className="inline-block bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/20 text-yellow-300 font-extrabold text-xs shadow-lg">
                  {activeScene.narration}
                </div>
              </div>
            </div>
          )}

          {/* Center Play Overlay when paused */}
          {!isPlaying && (
            <button
              type="button"
              onClick={togglePlay}
              className="absolute inset-0 m-auto w-14 h-14 rounded-full bg-purple-600/90 text-white flex items-center justify-center text-xl shadow-lg backdrop-blur-sm cursor-pointer hover:scale-105 transition-all"
            >
              ▶
            </button>
          )}
        </div>

        {/* Timeline Scrubber */}
        <div className="w-full max-w-[420px] mt-4 space-y-2">
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500">
            <span>{Math.round(currentTime)}s</span>
            <span>Active: Scene {activeSceneIndex + 1}</span>
            <span>{totalDuration}s</span>
          </div>

          <div className="grid grid-cols-5 gap-1.5">
            {script.scenes.map((s, idx) => (
              <button
                key={s.sceneIndex}
                type="button"
                onClick={() => jumpToScene(idx)}
                className={`py-1.5 px-2 rounded-lg text-[10px] font-bold text-center border transition-all cursor-pointer ${
                  activeSceneIndex === idx
                    ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-purple-300'
                }`}
              >
                Sc {idx + 1}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

