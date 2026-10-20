'use client';

import React, { useState } from 'react';

export interface WorkflowNode {
  id: string;
  label: string;
  type: string;
  icon: string;
  description: string;
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  details?: {
    summary?: string;
    metrics?: Record<string, string | number>;
    rawOutput?: any;
  };
}

interface VisualWorkflowCanvasProps {
  currentStage: string;
  projectStatus: string;
  stageProgress: number;
  projectData: any;
  onRetryStage?: (stage: string) => void;
}

export const VisualWorkflowCanvas: React.FC<VisualWorkflowCanvasProps> = ({
  currentStage,
  projectStatus,
  stageProgress,
  projectData,
  onRetryStage,
}) => {
  const [selectedNode, setSelectedNode] = useState<WorkflowNode | null>(null);

  const stageOrder = [
    { id: 'TOPIC', label: 'Topic Input', icon: '🎯', desc: 'Channel niche & target duration' },
    { id: 'SCRIPT', label: 'AI Script Engine', icon: '🧠', desc: 'Gemini / LLM narration & scenes' },
    { id: 'VOICE', label: 'Neural Voice Synth', icon: '🎙️', desc: 'EdgeTTS / Neural voice audio' },
    { id: 'VIDEO', label: 'Scene & Clip Gen', icon: '🎬', desc: '8-sec motion visual clips' },
    { id: 'SUBTITLES', label: 'Subtitle Alignment', icon: '📝', desc: 'SRT / VTT caption styling' },
    { id: 'FINAL_VIDEO', label: 'FFmpeg Compositor', icon: '🎞️', desc: '1080p H.264 composition' },
    { id: 'THUMBNAIL', label: 'Thumbnail Generator', icon: '🖼️', desc: '1280x720 graphic thumbnail' },
    { id: 'PUBLISH', label: 'YouTube Publisher', icon: '🚀', desc: 'OAuth direct upload & schedule' },
  ];

  const getStageStatus = (stageId: string): 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED' => {
    if (projectStatus === 'FAILED' && currentStage === stageId) {
      return 'FAILED';
    }

    const currentIndex = stageOrder.findIndex((s) => s.id === currentStage);
    const nodeIndex = stageOrder.findIndex((s) => s.id === stageId);

    if (projectStatus === 'COMPLETED') {
      return 'COMPLETED';
    }

    if (nodeIndex < currentIndex) {
      return 'COMPLETED';
    }
    if (nodeIndex === currentIndex) {
      return projectStatus === 'PROCESSING' ? 'PROCESSING' : 'COMPLETED';
    }
    return 'QUEUED';
  };

  const nodes: WorkflowNode[] = stageOrder.map((s) => {
    const status = getStageStatus(s.id);
    let summary = '';
    let metrics: Record<string, string | number> = {};

    if (s.id === 'TOPIC') {
      summary = `Topic: ${projectData.topic || 'Untitled'}`;
      metrics = {
        Channel: projectData.channelName || 'Default Channel',
        TargetLength: `${projectData.targetLengthMinutes || 3} min`,
        Niche: projectData.niche || 'General',
      };
    } else if (s.id === 'SCRIPT') {
      const words = projectData.script ? projectData.script.split(/\s+/).length : 0;
      summary = projectData.script ? `${words} words generated` : 'Awaiting script generation';
      metrics = { WordCount: words, Sections: projectData.scenes?.length || 'Calculated' };
    } else if (s.id === 'VOICE') {
      summary = projectData.audioUrl ? 'Voiceover synthesized' : 'Awaiting TTS synthesis';
      metrics = { Voice: projectData.voice || 'en-US-ChristopherNeural', Format: '24kHz MP3' };
    } else if (s.id === 'VIDEO') {
      summary = projectData.clipCount ? `${projectData.clipCount} clips generated` : 'Awaiting visual clips';
      metrics = { Clips: projectData.clipCount || 0, Engine: projectData.videoProvider || 'Local FFmpeg' };
    } else if (s.id === 'SUBTITLES') {
      summary = projectData.subtitlesUrl ? 'Subtitles aligned (.srt & .vtt)' : 'Awaiting alignment';
      metrics = { Style: 'Yellow Glow Bold', Layout: 'Centered Lower-Third' };
    } else if (s.id === 'FINAL_VIDEO') {
      summary = projectData.videoUrl ? '1080p MP4 composed' : 'Awaiting FFmpeg render';
      metrics = { Resolution: '1920x1080', FPS: 30, Codec: 'H.264 / AAC' };
    } else if (s.id === 'THUMBNAIL') {
      summary = projectData.thumbnailUrl ? '1280x720 thumbnail ready' : 'Awaiting thumbnail';
      metrics = { Dimensions: '1280x720', Format: 'PNG' };
    } else if (s.id === 'PUBLISH') {
      summary = projectData.publishUrl ? `Published: ${projectData.publishUrl}` : `Status: ${projectData.publishingStatus || 'DRAFT'}`;
      metrics = { Provider: 'YouTube Data API v3', Visibility: projectData.visibility || 'PRIVATE' };
    }

    return {
      id: s.id,
      label: s.label,
      type: s.id,
      icon: s.icon,
      description: s.desc,
      status,
      details: { summary, metrics, rawOutput: projectData },
    };
  });

  return (
    <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-6 mb-8 text-white shadow-2xl relative overflow-hidden">
      {/* Background Grid Pattern for n8n/ComfyUI aesthetic */}
      <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

      <div className="flex items-center justify-between mb-6 border-b border-slate-800 pb-4 relative z-10">
        <div>
          <h3 className="text-xl font-bold flex items-center gap-2">
            <span className="text-emerald-400">⚡</span> Visual Workflow Engine (n8n Mode)
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Interactive Node Diagram — Click any node to inspect real-time payloads, audio/video previews, and stage metrics.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs bg-slate-800 text-slate-300 px-3 py-1.5 rounded-full font-mono border border-slate-700">
            Pipeline: {projectStatus} ({stageProgress}%)
          </span>
        </div>
      </div>

      {/* Interactive Flow Nodes Grid / Sequence */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 relative z-10">
        {nodes.map((node, idx) => {
          const isSelected = selectedNode?.id === node.id;
          let statusBadgeClass = 'bg-slate-800 border-slate-700 text-slate-400';
          let borderClass = 'border-slate-800 hover:border-slate-700';

          if (node.status === 'COMPLETED') {
            statusBadgeClass = 'bg-emerald-950/80 border-emerald-500/50 text-emerald-400';
            borderClass = 'border-emerald-500/30 bg-emerald-950/10 hover:border-emerald-500/60';
          } else if (node.status === 'PROCESSING') {
            statusBadgeClass = 'bg-amber-950/90 border-amber-500 text-amber-300 animate-pulse';
            borderClass = 'border-amber-500/80 bg-amber-950/20 shadow-[0_0_15px_rgba(245,158,11,0.2)]';
          } else if (node.status === 'FAILED') {
            statusBadgeClass = 'bg-rose-950/90 border-rose-500 text-rose-300';
            borderClass = 'border-rose-500/80 bg-rose-950/20 shadow-[0_0_15px_rgba(244,63,94,0.25)]';
          }

          return (
            <div
              key={node.id}
              onClick={() => setSelectedNode(node)}
              className={`cursor-pointer transition-all duration-200 border rounded-xl p-4 relative group ${borderClass} ${
                isSelected ? 'ring-2 ring-emerald-400' : ''
              }`}
            >
              {/* Top Node Connector Arrow */}
              {idx > 0 && (
                <div className="hidden lg:block absolute -left-3 top-1/2 -translate-y-1/2 text-slate-600 text-xs font-bold pointer-events-none z-20">
                  ▶
                </div>
              )}

              <div className="flex items-start justify-between mb-2">
                <div className="w-9 h-9 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center text-lg shadow-inner">
                  {node.icon}
                </div>
                <span className={`text-[10px] font-semibold tracking-wider px-2 py-0.5 rounded-full border uppercase ${statusBadgeClass}`}>
                  {node.status}
                </span>
              </div>

              <h4 className="text-sm font-semibold text-slate-100 group-hover:text-emerald-300 transition-colors">
                {node.label}
              </h4>
              <p className="text-xs text-slate-400 mt-1 line-clamp-1">{node.description}</p>

              {node.details?.summary && (
                <div className="mt-3 pt-2 border-t border-slate-800/80 text-[11px] text-slate-300 font-mono flex items-center justify-between">
                  <span className="truncate">{node.details.summary}</span>
                  <span className="text-slate-500 text-[10px]">inspect ➔</span>
                </div>
              )}

              {/* Failed Retry Shortcut */}
              {node.status === 'FAILED' && onRetryStage && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRetryStage(node.id);
                  }}
                  className="mt-3 w-full bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold py-1.5 px-3 rounded-lg transition"
                >
                  🔄 Retry Node ({node.label})
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Slide-Out / Expanded Node Inspector Drawer */}
      {selectedNode && (
        <div className="mt-6 border-t border-slate-800 pt-5 bg-slate-900/90 rounded-xl p-5 border border-slate-700/60 relative animate-fadeIn">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{selectedNode.icon}</span>
              <div>
                <h4 className="text-base font-bold text-white flex items-center gap-2">
                  Node Inspector: {selectedNode.label}
                  <span className="text-xs font-normal text-slate-400 font-mono">({selectedNode.id})</span>
                </h4>
                <p className="text-xs text-slate-400">{selectedNode.description}</p>
              </div>
            </div>
            <button
              onClick={() => setSelectedNode(null)}
              className="text-slate-400 hover:text-white text-xs bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg border border-slate-700 transition"
            >
              ✕ Close Inspector
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
            {/* Key Metrics */}
            <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
              <h5 className="text-slate-400 text-[11px] font-sans font-semibold uppercase tracking-wider mb-2">
                Node Metrics
              </h5>
              {selectedNode.details?.metrics &&
                Object.entries(selectedNode.details.metrics).map(([k, v]) => (
                  <div key={k} className="flex justify-between py-1 border-b border-slate-800/60 last:border-0">
                    <span className="text-slate-400">{k}:</span>
                    <span className="text-emerald-400 font-semibold">{String(v)}</span>
                  </div>
                ))}
            </div>

            {/* Node Output Details */}
            <div className="md:col-span-2 bg-slate-950 p-4 rounded-lg border border-slate-800 overflow-x-auto max-h-48">
              <h5 className="text-slate-400 text-[11px] font-sans font-semibold uppercase tracking-wider mb-2">
                Node Summary & Output Payload
              </h5>
              <p className="text-slate-200 mb-2 font-sans">{selectedNode.details?.summary}</p>
              {selectedNode.id === 'SCRIPT' && projectData.script && (
                <div className="bg-slate-900 p-2.5 rounded text-[11px] text-slate-300 font-mono whitespace-pre-wrap">
                  {projectData.script}
                </div>
              )}
              {selectedNode.id === 'VOICE' && projectData.audioUrl && (
                <div className="mt-2">
                  <audio controls src={projectData.audioUrl} className="w-full h-8" />
                </div>
              )}
              {selectedNode.id === 'FINAL_VIDEO' && projectData.videoUrl && (
                <div className="mt-2 text-emerald-400">
                  ✓ Output Video Rendered: <a href={projectData.videoUrl} target="_blank" rel="noreferrer" className="underline">Download MP4</a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
