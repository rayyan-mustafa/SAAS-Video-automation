'use client';

import React from 'react';

export interface AutomationPipelineProps {
  currentStage?: string;
  status?: string;
  stages?: Array<{
    stage: string;
    status: string;
    error_message?: string | null;
    started_at?: string | null;
    completed_at?: string | null;
  }>;
  onRetryStage?: (stage: string) => void;
}

export function AutomationPipeline({
  currentStage = 'SCRIPT',
  status = 'PROCESSING',
  stages = [],
  onRetryStage,
}: AutomationPipelineProps) {
  const pipelineNodes = [
    {
      id: 'IDEA',
      title: 'Idea',
      subtitle: 'Topic & Context',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2v1" />
          <path d="M12 21v1" />
          <path d="M4.93 4.93l.7.7" />
          <path d="M18.36 18.36l.7.7" />
          <path d="M2 12h1" />
          <path d="M21 12h1" />
          <path d="M4.93 19.07l.7-.7" />
          <path d="M18.36 5.64l.7-.7" />
          <circle cx="12" cy="12" r="4" />
        </svg>
      ),
    },
    {
      id: 'SCRIPT',
      title: 'Script',
      subtitle: 'Hook & Narration',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
      ),
    },
    {
      id: 'SCENES',
      title: 'Scenes',
      subtitle: 'Decomposition',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" />
          <line x1="7" y1="2" x2="7" y2="22" />
          <line x1="17" y1="2" x2="17" y2="22" />
          <line x1="2" y1="12" x2="22" y2="12" />
        </svg>
      ),
    },
    {
      id: 'VISUALS',
      title: 'Visuals',
      subtitle: 'Stock & 4K AI',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="23 7 16 12 23 17 23 7" />
          <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
        </svg>
      ),
    },
    {
      id: 'VOICE',
      title: 'Voice',
      subtitle: 'Neural Audio',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <line x1="12" y1="19" x2="12" y2="23" />
          <line x1="8" y1="23" x2="16" y2="23" />
        </svg>
      ),
    },
    {
      id: 'SUBTITLES',
      title: 'Captions',
      subtitle: 'SRT / WebVTT',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="2" y="4" width="20" height="16" rx="2" />
          <line x1="6" y1="12" x2="10" y2="12" />
          <line x1="14" y1="12" x2="18" y2="12" />
          <line x1="6" y1="16" x2="18" y2="16" />
        </svg>
      ),
    },
    {
      id: 'FINAL_VIDEO',
      title: 'Render',
      subtitle: 'FFmpeg 1080p',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <polygon points="10 8 16 12 10 16 10 8" />
        </svg>
      ),
    },
    {
      id: 'PUBLISH',
      title: 'Publish',
      subtitle: 'YouTube / Cloud',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
      ),
    },
  ];

  // Calculate node states
  const stagesOrder = ['IDEA', 'SCRIPT', 'VOICE', 'SCENES', 'VIDEO', 'SUBTITLES', 'FINAL_VIDEO', 'THUMBNAIL', 'PUBLISH'];
  const currentIdx = stagesOrder.indexOf(currentStage === 'VIDEO' ? 'VISUALS' : currentStage);

  const getNodeState = (nodeId: string, idx: number) => {
    if (status === 'COMPLETED') return 'completed';
    if (status === 'FAILED' && (nodeId === currentStage || (currentStage === 'VIDEO' && nodeId === 'VISUALS'))) return 'failed';

    const normalizedStage = currentStage === 'VIDEO' ? 'VISUALS' : currentStage;
    if (nodeId === normalizedStage && status === 'PROCESSING') return 'active';

    const nodeIdx = stagesOrder.indexOf(nodeId === 'VISUALS' ? 'VIDEO' : nodeId);
    const targetIdx = stagesOrder.indexOf(currentStage);

    if (targetIdx > nodeIdx) return 'completed';
    return 'pending';
  };

  return (
    <div className="pipeline-container">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: status === 'COMPLETED' ? 'var(--status-live)' : status === 'FAILED' ? 'var(--status-error)' : 'var(--accent-primary)', boxShadow: '0 0 10px currentColor' }} />
          <h3 style={{ fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-primary)' }}>
            Autonomous Video Pipeline Workflow
          </h3>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className={`status-pill ${status}`}>{status}</span>
        </div>
      </div>

      <div className="pipeline-nodes-wrapper">
        {pipelineNodes.map((node, index) => {
          const nodeState = getNodeState(node.id, index);
          return (
            <React.Fragment key={node.id}>
              <div className={`pipeline-node ${nodeState}`}>
                <div className="pipeline-node-circle">
                  {nodeState === 'completed' ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : nodeState === 'failed' ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  ) : (
                    node.icon
                  )}
                </div>
                <div className="pipeline-node-title">{node.title}</div>
                <div className="pipeline-node-status">
                  {nodeState === 'active' ? (
                    <span style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>Active...</span>
                  ) : nodeState === 'completed' ? (
                    <span style={{ color: 'var(--status-live)' }}>✓ Done</span>
                  ) : nodeState === 'failed' ? (
                    <span style={{ color: 'var(--status-error)' }}>Failed</span>
                  ) : (
                    node.subtitle
                  )}
                </div>
              </div>

              {index < pipelineNodes.length - 1 && (
                <div
                  className={`pipeline-connector-line ${
                    nodeState === 'completed' ? 'filled' : ''
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
