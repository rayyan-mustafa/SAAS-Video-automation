'use client';

import React, { useState, useEffect, useRef } from 'react';

export interface WorkflowNodeData {
  id: string;
  name: string;
  category: 'trigger' | 'agent' | 'model' | 'tool' | 'compositor' | 'publisher';
  icon: string;
  subtext: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  status: 'IDLE' | 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  itemCount?: string;
  inputs?: Array<{ label: string; type: string }>;
  outputs?: Array<{ label: string; type: string }>;
  config?: Record<string, string | number>;
  liveOutput?: {
    summary?: string;
    details?: string;
    audioUrl?: string;
    videoUrl?: string;
    thumbnailUrl?: string;
    metadata?: Record<string, any>;
  };
}

export interface ConnectionWire {
  fromNode: string;
  toNode: string;
  fromPort?: 'right' | 'bottom';
  toPort?: 'left' | 'top';
  label?: string;
  isModelLink?: boolean;
}

interface InteractiveWorkflowCanvasProps {
  mode?: 'simulation' | 'live';
  projectData?: any;
  currentStage?: string;
  projectStatus?: string;
  onRetryStage?: (stageId: string) => void;
  title?: string;
  subtitle?: string;
  containerHeight?: string;
}

const DEFAULT_PRESET_TOPICS = [
  'How Quantum Computers Break Encryption',
  '10 Stoic Habits That Changed My Life',
  'The Psychology of Money & Financial Freedom',
  'Secrets of Ancient Rome History Forgot',
];

export const getCategoryTheme = (category: string) => {
  switch (category) {
    case 'trigger':
      return {
        accent: '#f59e0b',
        border: 'rgba(245, 158, 11, 0.4)',
        glow: 'rgba(245, 158, 11, 0.25)',
        iconBg: 'rgba(245, 158, 11, 0.15)',
        badgeBg: 'rgba(245, 158, 11, 0.15)',
        badgeText: '#fbbf24',
      };
    case 'agent':
      return {
        accent: '#38bdf8',
        border: 'rgba(56, 189, 248, 0.45)',
        glow: 'rgba(56, 189, 248, 0.3)',
        iconBg: 'rgba(56, 189, 248, 0.15)',
        badgeBg: 'rgba(56, 189, 248, 0.15)',
        badgeText: '#38bdf8',
      };
    case 'model':
      return {
        accent: '#a855f7',
        border: 'rgba(168, 85, 247, 0.4)',
        glow: 'rgba(168, 85, 247, 0.25)',
        iconBg: 'rgba(168, 85, 247, 0.15)',
        badgeBg: 'rgba(168, 85, 247, 0.15)',
        badgeText: '#c084fc',
      };
    case 'compositor':
      return {
        accent: '#10b981',
        border: 'rgba(16, 185, 129, 0.4)',
        glow: 'rgba(16, 185, 129, 0.25)',
        iconBg: 'rgba(16, 185, 129, 0.15)',
        badgeBg: 'rgba(16, 185, 129, 0.15)',
        badgeText: '#34d399',
      };
    case 'publisher':
      return {
        accent: '#f43f5e',
        border: 'rgba(244, 63, 94, 0.4)',
        glow: 'rgba(244, 63, 94, 0.25)',
        iconBg: 'rgba(244, 63, 94, 0.15)',
        badgeBg: 'rgba(244, 63, 94, 0.15)',
        badgeText: '#fb7185',
      };
    case 'tool':
    default:
      return {
        accent: '#06b6d4',
        border: 'rgba(6, 182, 212, 0.4)',
        glow: 'rgba(6, 182, 212, 0.25)',
        iconBg: 'rgba(6, 182, 212, 0.15)',
        badgeBg: 'rgba(6, 182, 212, 0.15)',
        badgeText: '#22d3ee',
      };
  }
};

export const InteractiveWorkflowCanvas: React.FC<InteractiveWorkflowCanvasProps> = ({
  mode = 'simulation',
  projectData,
  currentStage = 'SCRIPT',
  projectStatus = 'PROCESSING',
  onRetryStage,
  title,
  subtitle,
  containerHeight,
}) => {
  // Canvas viewport scale & panning — defaults to generous 0.95 zoom for crystal-clear readability
  const [zoomLevel, setZoomLevel] = useState<number>(0.95);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const dragStartRef = useRef<{ startX: number; startY: number; initialPanX: number; initialPanY: number }>({
    startX: 0,
    startY: 0,
    initialPanX: 0,
    initialPanY: 0,
  });

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>('agent');
  const [selectedTopic, setSelectedTopic] = useState<string>(
    projectData?.topic || DEFAULT_PRESET_TOPICS[0]
  );
  const [customTopicInput, setCustomTopicInput] = useState('');
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [activeSimulationStep, setActiveSimulationStep] = useState<number>(-1);
  const [logs, setLogs] = useState<Array<{ timestamp: string; node: string; message: string; type: 'info' | 'success' | 'warn' }>>([]);
  const [viewMode, setViewMode] = useState<'graph' | 'steps'>('graph');
  const [isInspectorOpen, setIsInspectorOpen] = useState<boolean>(false);
  const [inspectorTab, setInspectorTab] = useState<'details' | 'logs'>('details');
  const logsEndRef = useRef<HTMLDivElement | null>(null);

  // Dynamic Auto-Fit: measures available width & height and scales/centers the spacious 1580px graph
  const handleAutoFit = () => {
    if (!containerRef.current) return;
    const containerWidth = containerRef.current.clientWidth;
    const containerHeight = containerRef.current.clientHeight;

    if (!containerWidth || containerWidth <= 0) return;

    // Responsive behavior on mobile screens (<860px)
    if (containerWidth < 860) {
      setZoomLevel(0.80);
      setPanOffset({ x: 16, y: 16 });
      return;
    }

    // Content bounds: 1740px wide, 460px high
    const contentWidth = 1740;
    const contentHeight = 460;

    const horizontalMargin = 32;
    const verticalMargin = 24;

    const scaleX = (containerWidth - horizontalMargin) / contentWidth;
    const scaleY = containerHeight > 100 ? (containerHeight - verticalMargin) / contentHeight : scaleX;

    // Fit smoothly with min 0.72 so on any desktop it scales cleanly to fill the viewport
    let fitScale = Math.min(scaleX, scaleY > 0.5 ? scaleY : scaleX);
    fitScale = Math.max(0.72, Math.min(1.15, fitScale));
    fitScale = Number(fitScale.toFixed(2));

    setZoomLevel(fitScale);

    // Center the graph horizontally & vertically if container has room
    const scaledWidth = contentWidth * fitScale;
    const offsetX = containerWidth > scaledWidth ? Math.round((containerWidth - scaledWidth) / 2) : 20;
    const scaledHeight = contentHeight * fitScale;
    const offsetY = containerHeight > scaledHeight ? Math.round((containerHeight - scaledHeight) / 2) : 16;

    setPanOffset({ x: offsetX, y: offsetY });
  };

  // Auto-detect viewport and fit on mount and window resize
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 860) {
      setViewMode('steps');
    }

    const timer = setTimeout(() => {
      handleAutoFit();
    }, 60);

    const handleResize = () => {
      handleAutoFit();
    };

    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Close inspector on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isInspectorOpen) {
        setIsInspectorOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isInspectorOpen]);

  // Initial node definitions with spacious, non-overlapping canvas positions (1740px wide)
  const getInitialNodes = (): WorkflowNodeData[] => [
    {
      id: 'trigger',
      name: 'When Topic Prompt Received',
      category: 'trigger',
      icon: '⚡',
      subtext: 'Channel Trigger • Webhook / Schedule',
      x: 24,
      y: 165,
      width: 230,
      height: 96,
      status: 'COMPLETED',
      itemCount: '1 prompt',
      inputs: [],
      outputs: [{ label: 'Topic Payload', type: 'json' }],
      config: {
        TriggerType: 'Instant Webhook / Topic Form',
        ChannelNiche: projectData?.channel_niche || 'Technology & Science',
        TargetDuration: `${projectData?.target_length_minutes || 2} min`,
        Language: projectData?.language || 'en',
      },
      liveOutput: {
        summary: `Triggered with topic: "${selectedTopic}"`,
        details: 'Dispatched event payload to Autonomous Orchestrator Agent.',
      },
    },
    {
      id: 'agent',
      name: 'AI Script & Story Agent',
      category: 'agent',
      icon: '🤖',
      subtext: 'Tools Agent • Autonomous Orchestration',
      x: 350,
      y: 150,
      width: 250,
      height: 112,
      status: 'COMPLETED',
      itemCount: '5 scenes',
      inputs: [{ label: 'Input Prompt', type: 'payload' }],
      outputs: [{ label: 'Scene Plan', type: 'story' }],
      config: {
        AgentType: 'Multi-Tool Script Orchestrator',
        LLMProvider: 'OpenRouter DeepSeek V3 / Gemini 3.8',
        RetentionFramework: 'High-Hook + Pacing + Call-to-Action',
        Format: 'Structured JSON Scene Array',
      },
      liveOutput: {
        summary: 'Generated narrative script with 5 visual scenes and viral hook.',
        details: projectData?.scenes
          ? projectData.scenes.map((s: any) => `Scene ${s.scene_index}: ${s.narration.slice(0, 70)}...`).join('\n')
          : 'Scene 1: Hook opening with dramatic visual prompt\nScene 2: Problem introduction & core question\nScene 3: Deep exploration & key insights\nScene 4: Climax & mind-bending takeaway\nScene 5: Call to action & channel subscribe',
      },
    },
    {
      id: 'model',
      name: 'OpenRouter DeepSeek V3',
      category: 'model',
      icon: '🧠',
      subtext: 'Chat Model • 671B MoE Parameters',
      x: 260,
      y: 335,
      width: 190,
      height: 80,
      status: 'COMPLETED',
      itemCount: '82 t/s',
      inputs: [],
      outputs: [{ label: 'Tokens', type: 'stream' }],
      config: {
        ModelID: 'deepseek/deepseek-chat',
        Temperature: 0.7,
        MaxTokens: 2048,
        Fallback: 'Google Gemini 3.8 Flash',
      },
      liveOutput: {
        summary: 'Streamed 480 tokens in 3.4 seconds without errors.',
      },
    },
    {
      id: 'memory',
      name: 'Channel Persona & Context',
      category: 'model',
      icon: '🗄️',
      subtext: 'Persistent Style Rules & Tone',
      x: 470,
      y: 335,
      width: 190,
      height: 80,
      status: 'COMPLETED',
      itemCount: 'Active',
      inputs: [],
      outputs: [{ label: 'Persona', type: 'context' }],
      config: {
        PersonaTone: 'Authoritative, engaging, cinematic',
        VocabularyFilter: 'Active verbs, no cliches',
        TargetAudience: 'YouTube Tech & Curiosity Seekers',
      },
      liveOutput: {
        summary: 'Applied channel visual tone and pacing guidelines.',
      },
    },
    {
      id: 'voice',
      name: 'Neural Voice Synth',
      category: 'tool',
      icon: '🎙️',
      subtext: 'ElevenLabs / EdgeTTS Studio Audio',
      x: 730,
      y: 15,
      width: 230,
      height: 84,
      status: 'COMPLETED',
      itemCount: '1 master audio',
      inputs: [{ label: 'Narration Script', type: 'text' }],
      outputs: [{ label: 'Audio Stream', type: 'audio' }],
      config: {
        VoiceName: projectData?.channel_voice || 'en-US-ChristopherNeural',
        SampleRate: '24kHz Studio Quality',
        Normalization: '-14 LUFS Broadcast Standard',
        InAppCloning: 'Supported (Live Mic / Upload)',
      },
      liveOutput: {
        summary: 'Synthesized 5 scene audio segments and merged into master narration track.',
        audioUrl: projectData?.id ? `/api/assets/voice/${projectData.id}/narration.mp3` : undefined,
      },
    },
    {
      id: 'visuals',
      name: 'Visuals & B-Roll Engine',
      category: 'tool',
      icon: '🎬',
      subtext: 'Cloudflare Flux 1 + Pexels 8K Clips',
      x: 730,
      y: 120,
      width: 230,
      height: 84,
      status: 'COMPLETED',
      itemCount: '5 clips',
      inputs: [{ label: 'Visual Prompts', type: 'array' }],
      outputs: [{ label: '1080p Video Clips', type: 'video' }],
      config: {
        Engine: 'Cloudflare Workers AI (Flux 1 Schnell)',
        Resolution: '1920x1080 Full HD',
        Motion: 'Dynamic Ken Burns Zoompan & Pan-Left',
        StockFallback: 'Pexels High-Definition Curated Clips',
      },
      liveOutput: {
        summary: '5 high-definition scene visuals generated with cinematic camera movements.',
      },
    },
    {
      id: 'subtitles',
      name: 'Subtitle Alignment',
      category: 'tool',
      icon: '📝',
      subtext: 'Karaoke-Style Timed SRT & VTT',
      x: 730,
      y: 225,
      width: 230,
      height: 84,
      status: 'COMPLETED',
      itemCount: 'SRT / VTT',
      inputs: [{ label: 'Audio Timings', type: 'timecodes' }],
      outputs: [{ label: 'Formatted Subtitles', type: 'captions' }],
      config: {
        Style: 'Yellow Glow Bold Centered Lower-Third',
        MaxWordsPerLine: 5,
        Format: 'WebVTT & SubRip (.srt)',
        DynamicColorGlow: 'Active',
      },
      liveOutput: {
        summary: 'Generated 42 timed caption cues aligned with speech boundaries.',
      },
    },
    {
      id: 'thumbnail',
      name: 'AI Thumbnail Studio',
      category: 'tool',
      icon: '🖼️',
      subtext: 'High-CTR 1280x720 Graphic Gen',
      x: 730,
      y: 330,
      width: 230,
      height: 84,
      status: 'COMPLETED',
      itemCount: '1 thumbnail',
      inputs: [{ label: 'Metadata & Title', type: 'text' }],
      outputs: [{ label: 'Thumbnail Image', type: 'image' }],
      config: {
        Aspect: '16:9 (1280x720)',
        Format: 'PNG (Lossless RGB)',
        Style: 'Cinematic High-Contrast YouTube Thumbnail',
      },
      liveOutput: {
        summary: 'High-CTR YouTube thumbnail composed with bold focal subject.',
        thumbnailUrl: projectData?.thumbnail?.url || undefined,
      },
    },
    {
      id: 'compositor',
      name: 'FFmpeg Compositor',
      category: 'compositor',
      icon: '🎞️',
      subtext: '1080p H.264 CFR Video Muxer',
      x: 1080,
      y: 150,
      width: 250,
      height: 112,
      status: 'COMPLETED',
      itemCount: '1080p MP4',
      inputs: [
        { label: 'Video Clips', type: 'video' },
        { label: 'Master Audio', type: 'audio' },
        { label: 'Captions', type: 'srt' },
      ],
      outputs: [{ label: 'Final Master MP4', type: 'file' }],
      config: {
        Resolution: '1920x1080 (16:9)',
        VideoCodec: 'libx264 (Constant Frame Rate 30fps)',
        AudioCodec: 'aac (Stereo 192kbps)',
        Container: 'MP4 (FastStart Web-Optimized)',
      },
      liveOutput: {
        summary: 'Master MP4 rendered successfully with synchronized audio & video.',
        videoUrl: projectData?.output?.url || undefined,
      },
    },
    {
      id: 'publisher',
      name: 'YouTube Publisher',
      category: 'publisher',
      icon: '🚀',
      subtext: 'Data API v3 • Google OAuth 2.0',
      x: 1450,
      y: 150,
      width: 250,
      height: 112,
      status: 'COMPLETED',
      itemCount: 'Ready',
      inputs: [
        { label: 'Master MP4', type: 'file' },
        { label: 'Thumbnail', type: 'image' },
        { label: 'Title & Tags', type: 'metadata' },
      ],
      outputs: [{ label: 'YouTube URL', type: 'url' }],
      config: {
        API: 'YouTube Data API v3 (Resumable Upload)',
        Auth: 'Google OAuth 2.0 Token Vault',
        Scheduling: '30-Day Auto-Release Calendar',
        Visibility: 'Private / Unlisted / Public',
      },
      liveOutput: {
        summary: projectData?.publish_url
          ? `Live Video URL: ${projectData.publish_url}`
          : 'OAuth verified. Video staged for scheduled YouTube publication.',
      },
    },
  ];

  const [nodes, setNodes] = useState<WorkflowNodeData[]>(getInitialNodes());

  // Connection definitions (Bezier cables)
  const connections: ConnectionWire[] = [
    { fromNode: 'trigger', toNode: 'agent', label: '1 topic' },
    { fromNode: 'agent', toNode: 'model', fromPort: 'bottom', toPort: 'top', isModelLink: true, label: 'Chat Model' },
    { fromNode: 'agent', toNode: 'memory', fromPort: 'bottom', toPort: 'top', isModelLink: true, label: 'Tone Memory' },
    { fromNode: 'agent', toNode: 'voice', label: 'narration' },
    { fromNode: 'agent', toNode: 'visuals', label: 'visual prompts' },
    { fromNode: 'agent', toNode: 'subtitles', label: 'cues' },
    { fromNode: 'agent', toNode: 'thumbnail', label: 'title idea' },
    { fromNode: 'voice', toNode: 'compositor', label: 'audio.mp3' },
    { fromNode: 'visuals', toNode: 'compositor', label: 'clips[0..4]' },
    { fromNode: 'subtitles', toNode: 'compositor', label: 'captions.srt' },
    { fromNode: 'compositor', toNode: 'publisher', label: '1080p.mp4' },
    { fromNode: 'thumbnail', toNode: 'publisher', label: 'thumb.png' },
  ];

  // Helper to add timestamped logs
  const addLog = (nodeName: string, message: string, type: 'info' | 'success' | 'warn' = 'info') => {
    const time = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLogs((prev) => [...prev.slice(-30), { timestamp: time, node: nodeName, message, type }]);
  };

  // Sync with real project data when in Live mode
  useEffect(() => {
    if (mode === 'live' && projectData) {
      const stageMap: Record<string, string> = {
        SCRIPT: 'agent',
        VOICE: 'voice',
        VIDEO: 'visuals',
        SUBTITLES: 'subtitles',
        FINAL_VIDEO: 'compositor',
        THUMBNAIL: 'thumbnail',
        PUBLISH: 'publisher',
      };

      const stageOrder = ['trigger', 'agent', 'voice', 'visuals', 'subtitles', 'thumbnail', 'compositor', 'publisher'];
      const activeNodeKey = stageMap[currentStage] || 'agent';
      const activeIdx = stageOrder.indexOf(activeNodeKey);

      setNodes((prev) =>
        prev.map((n) => {
          const nodeIdx = stageOrder.indexOf(n.id);
          if (projectStatus === 'FAILED' && n.id === activeNodeKey) {
            return { ...n, status: 'FAILED' };
          }
          if (projectStatus === 'COMPLETED' || nodeIdx < activeIdx) {
            return { ...n, status: 'COMPLETED' };
          }
          if (nodeIdx === activeIdx) {
            return { ...n, status: projectStatus === 'PROCESSING' ? 'RUNNING' : 'COMPLETED' };
          }
          return { ...n, status: 'QUEUED' };
        })
      );
    }
  }, [mode, projectData, currentStage, projectStatus]);

  // Initial simulation greeting log
  useEffect(() => {
    if (logs.length === 0) {
      addLog('System', 'Visual Workflow Engine initialized. Ready for execution.', 'info');
      addLog('Trigger', `Active topic: "${selectedTopic}"`, 'info');
    }
  }, []);

  // Auto-scroll logs drawer to bottom
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  // Interactive Simulation Runner (Step-by-Step Flow Animation)
  const runSimulation = () => {
    if (isSimulating) return;
    setIsSimulating(true);
    setActiveSimulationStep(0);

    // Reset nodes to queued
    setNodes((prev) =>
      prev.map((n) => (n.id === 'trigger' ? { ...n, status: 'RUNNING' } : { ...n, status: 'QUEUED' }))
    );

    addLog('Pipeline', `▶ Starting Autonomous Simulation for: "${selectedTopic}"`, 'info');

    // Step sequence with realistic timings
    const steps = [
      {
        step: 0,
        nodeId: 'trigger',
        duration: 900,
        action: () => {
          addLog('Trigger', `[Webhook] Ingested user prompt: "${selectedTopic}"`, 'success');
          setNodes((prev) =>
            prev.map((n) =>
              n.id === 'trigger' ? { ...n, status: 'COMPLETED' } : n.id === 'agent' ? { ...n, status: 'RUNNING' } : n
            )
          );
        },
      },
      {
        step: 1,
        nodeId: 'agent',
        duration: 1400,
        action: () => {
          addLog('AI Agent', 'Calling OpenRouter DeepSeek V3 with viral retention system prompt...', 'info');
          addLog('DeepSeek', 'Streaming 5-scene breakdown: Hook, Premise, Twist, Breakdown, Call-to-Action.', 'info');
          addLog('AI Agent', '✓ Script generated (380 words). Dispatching parallel production jobs...', 'success');
          setNodes((prev) =>
            prev.map((n) => {
              if (n.id === 'agent' || n.id === 'model' || n.id === 'memory') return { ...n, status: 'COMPLETED' };
              if (['voice', 'visuals', 'subtitles', 'thumbnail'].includes(n.id)) return { ...n, status: 'RUNNING' };
              return n;
            })
          );
        },
      },
      {
        step: 2,
        nodeId: 'parallel_tools',
        duration: 1800,
        action: () => {
          addLog('Voice Engine', 'ElevenLabs synthesized studio audio narration (-14 LUFS).', 'success');
          addLog('Visuals Engine', 'Cloudflare Flux 1 generated 5 continuous 1080p clips with Ken Burns camera zoom.', 'success');
          addLog('Captions', 'Subtitle aligner synchronized 42 karaoke-style dynamic cues (.srt & .vtt).', 'success');
          addLog('Thumbnail', 'High-CTR YouTube 1280x720 graphic generated with high contrast subject.', 'success');
          setNodes((prev) =>
            prev.map((n) => {
              if (['voice', 'visuals', 'subtitles', 'thumbnail'].includes(n.id)) return { ...n, status: 'COMPLETED' };
              if (n.id === 'compositor') return { ...n, status: 'RUNNING' };
              return n;
            })
          );
        },
      },
      {
        step: 3,
        nodeId: 'compositor',
        duration: 1300,
        action: () => {
          addLog('FFmpeg', 'Muxing H.264 CFR video stream + stereo AAC audio + burned subtitle cues...', 'info');
          addLog('FFmpeg', '✓ 1080p MP4 render complete (1920x1080 @ 30fps). File size: 18.4 MB.', 'success');
          setNodes((prev) =>
            prev.map((n) => {
              if (n.id === 'compositor') return { ...n, status: 'COMPLETED' };
              if (n.id === 'publisher') return { ...n, status: 'RUNNING' };
              return n;
            })
          );
        },
      },
      {
        step: 4,
        nodeId: 'publisher',
        duration: 1100,
        action: () => {
          addLog('YouTube Publisher', 'Verifying Google OAuth 2.0 access token...', 'info');
          addLog('YouTube Publisher', 'Uploading 1080p MP4 via Resumable Upload API endpoint...', 'info');
          addLog('YouTube Publisher', '✓ Staged to YouTube Studio! Privacy: UNLISTED | Ready for release.', 'success');
          setNodes((prev) =>
            prev.map((n) => (n.id === 'publisher' ? { ...n, status: 'COMPLETED' } : n))
          );
          setIsSimulating(false);
          setActiveSimulationStep(-1);
          addLog('Pipeline', '🎉 Complete Autonomous Workflow Cycle finished with 100% success!', 'success');
        },
      },
    ];

    let currentDelay = 0;
    steps.forEach((s) => {
      currentDelay += s.duration;
      setTimeout(() => {
        s.action();
        setActiveSimulationStep(s.step);
      }, currentDelay);
    });
  };

  const handleSelectPresetTopic = (topic: string) => {
    setSelectedTopic(topic);
    addLog('Topic Input', `Switched topic preset to: "${topic}"`, 'info');
  };

  const handleApplyCustomTopic = (e: React.FormEvent) => {
    e.preventDefault();
    if (customTopicInput.trim()) {
      setSelectedTopic(customTopicInput.trim());
      addLog('Topic Input', `Custom topic loaded: "${customTopicInput.trim()}"`, 'info');
      setCustomTopicInput('');
    }
  };

  // Helper to calculate exact port coordinates for SVG bezier wires
  const getNodePortPos = (nodeId: string, port: 'left' | 'right' | 'top' | 'bottom') => {
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return { x: 0, y: 0 };
    const w = node.width || 220;
    const h = node.height || 80;

    switch (port) {
      case 'left':
        return { x: node.x, y: node.y + h / 2 };
      case 'right':
        return { x: node.x + w, y: node.y + h / 2 };
      case 'top':
        return { x: node.x + w / 2, y: node.y };
      case 'bottom':
        return { x: node.x + w / 2, y: node.y + h };
    }
  };

  // Canvas Mouse & Touch Drag-to-Pan Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (
      target.closest('.workflow-interactive-node') ||
      target.closest('button') ||
      target.closest('input') ||
      target.closest('a') ||
      target.closest('.workflow-floating-controls')
    ) {
      return;
    }
    setIsDragging(true);
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialPanX: panOffset.x,
      initialPanY: panOffset.y,
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.startX;
    const dy = e.clientY - dragStartRef.current.startY;
    setPanOffset({
      x: Math.round(dragStartRef.current.initialPanX + dx),
      y: Math.round(dragStartRef.current.initialPanY + dy),
    });
  };

  const handleMouseUp = () => {
    if (isDragging) setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const target = e.target as HTMLElement;
      if (
        target.closest('.workflow-interactive-node') ||
        target.closest('button') ||
        target.closest('input') ||
        target.closest('a') ||
        target.closest('.workflow-floating-controls')
      ) {
        return;
      }
      setIsDragging(true);
      dragStartRef.current = {
        startX: e.touches[0].clientX,
        startY: e.touches[0].clientY,
        initialPanX: panOffset.x,
        initialPanY: panOffset.y,
      };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - dragStartRef.current.startX;
    const dy = e.touches[0].clientY - dragStartRef.current.startY;
    setPanOffset({
      x: Math.round(dragStartRef.current.initialPanX + dx),
      y: Math.round(dragStartRef.current.initialPanY + dy),
    });
  };

  const handleTouchEnd = () => {
    if (isDragging) setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.05 : -0.05;
      setZoomLevel((z) => Math.max(0.3, Math.min(1.5, Number((z + delta).toFixed(2)))));
    } else {
      setPanOffset((prev) => ({
        x: Math.round(prev.x - e.deltaX),
        y: Math.round(prev.y - e.deltaY),
      }));
    }
  };

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) || nodes[1];

  return (
    <div
      style={{
        background: '#090d16',
        borderRadius: '16px',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.7)',
        overflow: 'hidden',
        color: '#f4f4f5',
        fontFamily: 'var(--font-sans, -apple-system, BlinkMacSystemFont, sans-serif)',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        height: containerHeight || '100%',
        minHeight: '540px',
      }}
    >
      {/* ─────────────────────────────────────────────────────────────
          1. TOP CANVAS TOOLBAR & CONTROLS (Fully Responsive)
      ───────────────────────────────────────────────────────────── */}
      <div
        className="workflow-canvas-topbar"
        style={{
          padding: '12px 18px',
          background: 'rgba(15, 23, 42, 0.92)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          backdropFilter: 'blur(16px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          position: 'relative',
          zIndex: 20,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '16px',
              boxShadow: '0 0 15px rgba(16, 185, 129, 0.35)',
              flexShrink: 0,
            }}
          >
            ⚡
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '14px', fontWeight: 700, letterSpacing: '-0.01em', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {title || 'Autonomous Workflow Engine'}
              </span>
              <span
                className="workflow-mode-badge"
                style={{
                  fontSize: '9px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  padding: '2px 7px',
                  borderRadius: '10px',
                  background: mode === 'simulation' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                  border: mode === 'simulation' ? '1px solid rgba(56, 189, 248, 0.3)' : '1px solid rgba(16, 185, 129, 0.3)',
                  color: mode === 'simulation' ? '#38bdf8' : '#10b981',
                  whiteSpace: 'nowrap',
                }}
              >
                {mode === 'simulation' ? 'Interactive Demo' : 'Live Production'}
              </span>
            </div>
            <p className="workflow-subtext" style={{ fontSize: '11px', color: '#94a3b8', margin: '2px 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {subtitle || 'Visual node architecture connecting AI Scripting, Neural Voice, 1080p Clips, Subtitles & YouTube'}
            </p>
          </div>
        </div>

        {/* Toolbar Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          {/* View Mode Switcher: Flow Graph vs Pipeline Steps */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              padding: '2px',
            }}
          >
            <button
              type="button"
              onClick={() => {
                setViewMode('graph');
                setTimeout(handleAutoFit, 60);
              }}
              style={{
                background: viewMode === 'graph' ? 'rgba(56, 189, 248, 0.25)' : 'transparent',
                border: viewMode === 'graph' ? '1px solid rgba(56, 189, 248, 0.45)' : '1px solid transparent',
                color: viewMode === 'graph' ? '#38bdf8' : '#94a3b8',
                padding: '5px 10px',
                fontSize: '11px',
                fontWeight: 600,
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                transition: 'all 0.15s ease',
              }}
            >
              <span>☩</span>
              <span className="view-mode-label">Flow Graph</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('steps')}
              style={{
                background: viewMode === 'steps' ? 'rgba(56, 189, 248, 0.25)' : 'transparent',
                border: viewMode === 'steps' ? '1px solid rgba(56, 189, 248, 0.45)' : '1px solid transparent',
                color: viewMode === 'steps' ? '#38bdf8' : '#94a3b8',
                padding: '5px 10px',
                fontSize: '11px',
                fontWeight: 600,
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                transition: 'all 0.15s ease',
              }}
            >
              <span>☰</span>
              <span className="view-mode-label">Pipeline Steps</span>
            </button>
          </div>

          {/* Test Workflow Action Button */}
          {mode === 'simulation' ? (
            <button
              onClick={runSimulation}
              disabled={isSimulating}
              style={{
                background: isSimulating
                  ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                  : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '6px 14px',
                fontSize: '11px',
                fontWeight: 700,
                cursor: isSimulating ? 'wait' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: isSimulating
                  ? '0 0 15px rgba(245, 158, 11, 0.4)'
                  : '0 0 15px rgba(16, 185, 129, 0.3)',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap',
              }}
            >
              <span>{isSimulating ? '⏳' : '⚡'}</span>
              <span className="workflow-test-btn-text">{isSimulating ? 'Running...' : 'Test Workflow'}</span>
              <span className="workflow-test-btn-mobile">{isSimulating ? 'Running' : 'Test'}</span>
            </button>
          ) : (
            <div
              className="workflow-live-badge"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                padding: '5px 10px',
                borderRadius: '8px',
                fontSize: '10px',
                color: '#10b981',
                fontFamily: 'monospace',
                whiteSpace: 'nowrap',
              }}
            >
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
              <span>Live Synced</span>
            </div>
          )}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. SIMULATION TOPIC PROMPT BAR (Landing Page Mode)
      ───────────────────────────────────────────────────────────── */}
      {mode === 'simulation' && (
        <div
          className="workflow-sample-topics-bar"
          style={{
            padding: '10px 20px',
            background: 'rgba(10, 15, 26, 0.95)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '10px',
            position: 'relative',
            zIndex: 15,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Sample Topics:
            </span>
            {DEFAULT_PRESET_TOPICS.map((topic) => (
              <button
                key={topic}
                onClick={() => handleSelectPresetTopic(topic)}
                style={{
                  background: selectedTopic === topic ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                  border: selectedTopic === topic ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(255, 255, 255, 0.08)',
                  color: selectedTopic === topic ? '#34d399' : '#cbd5e1',
                  borderRadius: '6px',
                  padding: '4px 10px',
                  fontSize: '11px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {topic}
              </button>
            ))}
          </div>

          <form onSubmit={handleApplyCustomTopic} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <input
              type="text"
              placeholder="Or type custom topic..."
              value={customTopicInput}
              onChange={(e) => setCustomTopicInput(e.target.value)}
              style={{
                background: 'rgba(0, 0, 0, 0.4)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '6px',
                padding: '5px 10px',
                color: '#fff',
                fontSize: '11px',
                outline: 'none',
                width: '180px',
              }}
            />
            <button
              type="submit"
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '6px',
                padding: '5px 10px',
                color: '#fff',
                fontSize: '11px',
                cursor: 'pointer',
              }}
            >
              Set
            </button>
          </form>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          3. MAIN INTERACTIVE 2D NODE CANVAS (Pan & Zoom Responsive)
      ───────────────────────────────────────────────────────────── */}
      <div
        ref={containerRef}
        className="workflow-canvas-scroll-container"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onWheel={handleWheel}
        style={{
          position: 'relative',
          flex: 1,
          width: '100%',
          minHeight: 0,
          overflow: 'hidden',
          background: '#07090e',
          backgroundImage:
            'radial-gradient(ellipse 65% 55% at 50% 48%, rgba(56, 189, 248, 0.05) 0%, transparent 70%), radial-gradient(rgba(255, 255, 255, 0.15) 1.2px, transparent 1.2px)',
          backgroundSize: '100% 100%, 22px 22px',
          cursor: isDragging ? 'grabbing' : 'grab',
          userSelect: isDragging ? 'none' : 'auto',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {viewMode === 'graph' ? (
          <>
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                width: '1740px',
                height: '460px',
                transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`,
                transformOrigin: 'top left',
                transition: isDragging ? 'none' : 'transform 0.12s ease-out',
                pointerEvents: 'auto',
              }}
            >
          {/* SVG LAYER: Connecting Animated Bezier Cables & Traveling Data Packets */}
          <svg
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              pointerEvents: 'none',
              zIndex: 5,
            }}
          >
            <defs>
              <linearGradient id="activeCableGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#10b981" />
                <stop offset="50%" stopColor="#38bdf8" />
                <stop offset="100%" stopColor="#818cf8" />
              </linearGradient>
              <linearGradient id="streamPulseGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#34d399" />
                <stop offset="100%" stopColor="#38bdf8" />
              </linearGradient>
              <filter id="cableGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3.5" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter id="particleGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="2.5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {connections.map((c, idx) => {
              const fromPos = getNodePortPos(c.fromNode, c.fromPort || 'right');
              const toPos = getNodePortPos(c.toNode, c.toPort || 'left');

              const sourceNode = nodes.find((n) => n.id === c.fromNode);
              const targetNode = nodes.find((n) => n.id === c.toNode);

              const isActive =
                sourceNode?.status === 'RUNNING' ||
                (sourceNode?.status === 'COMPLETED' && targetNode?.status === 'RUNNING');
              const isCompleted = sourceNode?.status === 'COMPLETED' && targetNode?.status === 'COMPLETED';

              // Cubic bezier control points
              let d = '';
              if (c.fromPort === 'bottom' && c.toPort === 'top') {
                const dy = (toPos.y - fromPos.y) / 2;
                d = `M ${fromPos.x} ${fromPos.y} C ${fromPos.x} ${fromPos.y + dy}, ${toPos.x} ${toPos.y - dy}, ${toPos.x} ${toPos.y}`;
              } else {
                const dx = Math.abs(toPos.x - fromPos.x) * 0.45;
                d = `M ${fromPos.x} ${fromPos.y} C ${fromPos.x + dx} ${fromPos.y}, ${toPos.x - dx} ${toPos.y}, ${toPos.x} ${toPos.y}`;
              }

              // Cable styling
              let strokeColor = 'rgba(255, 255, 255, 0.12)';
              let strokeWidth = 2.4;
              let isDashed = c.isModelLink;

              if (isActive) {
                strokeColor = '#38bdf8';
                strokeWidth = 3;
              } else if (isCompleted) {
                strokeColor = '#10b981';
                strokeWidth = 2.4;
              }

              const midX = (fromPos.x + toPos.x) / 2;
              const midY = (fromPos.y + toPos.y) / 2;

              return (
                <g key={`${c.fromNode}-${c.toNode}-${idx}`}>
                  {/* Outer Ambient Glow for Active / Completed Cables */}
                  {(isActive || isCompleted) && (
                    <path
                      d={d}
                      fill="none"
                      stroke={isActive ? '#38bdf8' : '#10b981'}
                      strokeWidth={7}
                      opacity={isActive ? 0.45 : 0.22}
                      filter="url(#cableGlow)"
                    />
                  )}

                  {/* Base Track Conduit */}
                  <path
                    d={d}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    strokeDasharray={isDashed ? '5, 5' : undefined}
                    opacity={isActive ? 0.9 : 0.7}
                  />

                  {/* Dynamic Glowing Stream Pulses (Continuous Data Flow) */}
                  {(isActive || isCompleted) && (
                    <path
                      d={d}
                      fill="none"
                      stroke={isActive ? 'url(#activeCableGrad)' : 'url(#streamPulseGrad)'}
                      strokeWidth={isActive ? 3.2 : 2.4}
                      strokeDasharray="8 14"
                      style={{
                        animation: 'cablePulse 1.4s linear infinite',
                      }}
                    />
                  )}

                  {/* Traveling Luminous Data Particles */}
                  {(isActive || isCompleted) && !c.isModelLink && (
                    <circle r={isActive ? 4 : 3.2} fill={isActive ? '#38bdf8' : '#34d399'} filter="url(#particleGlow)">
                      <animateMotion
                        path={d}
                        dur={isActive ? '1.8s' : '3.0s'}
                        repeatCount="indefinite"
                      />
                    </circle>
                  )}

                  {/* Wire Label Pill */}
                  {c.label && !c.isModelLink && (() => {
                    const pillWidth = Math.max(56, c.label.length * 7.5 + 16);
                    const labelX = c.fromNode === 'thumbnail' ? fromPos.x + 95 : midX;
                    const labelY = c.fromNode === 'thumbnail' ? fromPos.y - 25 : midY;

                    return (
                      <g transform={`translate(${labelX}, ${labelY})`}>
                        <rect
                          x={-pillWidth / 2}
                          y="-10"
                          width={pillWidth}
                          height="20"
                          rx="10"
                          fill="rgba(10, 16, 30, 0.94)"
                          stroke={isActive ? '#38bdf8' : isCompleted ? '#10b981' : 'rgba(255, 255, 255, 0.16)'}
                          strokeWidth="1.2"
                          filter="drop-shadow(0 2px 6px rgba(0, 0, 0, 0.6))"
                        />
                        <text
                          x="0"
                          y="4"
                          textAnchor="middle"
                          fill={isActive ? '#38bdf8' : isCompleted ? '#34d399' : '#94a3b8'}
                          fontSize="10"
                          fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                          fontWeight="700"
                          letterSpacing="0.02em"
                        >
                          {c.label}
                        </text>
                      </g>
                    );
                  })()}
                </g>
              );
            })}
          </svg>

          {/* RENDER WORKFLOW NODES */}
          {nodes.map((node) => {
            const isSelected = selectedNodeId === node.id;
            const theme = getCategoryTheme(node.category);
            const isModelOrMemory = node.category === 'model';

            let statusBadgeBg = 'rgba(255, 255, 255, 0.06)';
            let statusBadgeBorder = 'rgba(255, 255, 255, 0.14)';
            let statusBadgeText = '#94a3b8';
            let dotColor = '#64748b';

            if (node.status === 'COMPLETED') {
              statusBadgeBg = 'rgba(16, 185, 129, 0.15)';
              statusBadgeBorder = 'rgba(16, 185, 129, 0.45)';
              statusBadgeText = '#34d399';
              dotColor = '#10b981';
            } else if (node.status === 'RUNNING') {
              statusBadgeBg = 'rgba(245, 158, 11, 0.2)';
              statusBadgeBorder = '#f59e0b';
              statusBadgeText = '#fbbf24';
              dotColor = '#f59e0b';
            } else if (node.status === 'FAILED') {
              statusBadgeBg = 'rgba(239, 68, 68, 0.2)';
              statusBadgeBorder = '#ef4444';
              statusBadgeText = '#f87171';
              dotColor = '#ef4444';
            }

            return (
              <div
                key={node.id}
                className={`workflow-interactive-node ${node.status === 'RUNNING' ? 'node-running-pulse' : node.status === 'COMPLETED' ? 'node-completed-glow' : ''} ${isSelected ? 'node-selected-aura' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedNodeId(node.id);
                  setIsInspectorOpen(true);
                }}
                style={{
                  position: 'absolute',
                  left: `${node.x}px`,
                  top: `${node.y}px`,
                  width: `${node.width || 240}px`,
                  minHeight: `${node.height || 90}px`,
                  background: 'linear-gradient(145deg, rgba(16, 23, 38, 0.96) 0%, rgba(9, 14, 25, 0.98) 100%)',
                  borderTop: `2.5px solid ${theme.accent}`,
                  borderRight: isSelected ? '1.5px solid #38bdf8' : node.status === 'RUNNING' ? '1.5px solid #f59e0b' : '1px solid rgba(255, 255, 255, 0.12)',
                  borderBottom: isSelected ? '1.5px solid #38bdf8' : node.status === 'RUNNING' ? '1.5px solid #f59e0b' : '1px solid rgba(255, 255, 255, 0.12)',
                  borderLeft: isSelected ? '1.5px solid #38bdf8' : node.status === 'RUNNING' ? '1.5px solid #f59e0b' : '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: isModelOrMemory ? '18px' : '14px',
                  boxShadow: isSelected
                    ? '0 0 25px rgba(56, 189, 248, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.15)'
                    : node.status === 'RUNNING'
                    ? '0 0 30px rgba(245, 158, 11, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
                    : node.status === 'COMPLETED'
                    ? '0 0 16px rgba(16, 185, 129, 0.22), 0 12px 28px -6px rgba(0, 0, 0, 0.65)'
                    : '0 12px 28px -6px rgba(0, 0, 0, 0.65)',
                  padding: '12px 14px',
                  cursor: 'pointer',
                  zIndex: isSelected ? 20 : 10,
                  backdropFilter: 'blur(12px)',
                }}
              >
                {/* Left Input Port Dot */}
                {node.category !== 'trigger' && !isModelOrMemory && (
                  <div
                    style={{
                      position: 'absolute',
                      left: '-8px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: '15px',
                      height: '15px',
                      borderRadius: '50%',
                      background: '#090d16',
                      border: '2.5px solid #38bdf8',
                      boxShadow: '0 0 10px rgba(56, 189, 248, 0.6)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      zIndex: 12,
                    }}
                    title="Input Port"
                  >
                    <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#38bdf8' }} />
                    {(node.status === 'RUNNING' || node.status === 'COMPLETED') && (
                      <div className="port-ping-wave" style={{ borderColor: '#38bdf8' }} />
                    )}
                  </div>
                )}

                {/* Right Output Port Dot */}
                {node.category !== 'publisher' && (
                  <div
                    style={{
                      position: 'absolute',
                      right: '-8px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: '15px',
                      height: '15px',
                      borderRadius: '50%',
                      background: '#090d16',
                      border: '2.5px solid #10b981',
                      boxShadow: '0 0 10px rgba(16, 185, 129, 0.6)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      zIndex: 12,
                    }}
                    title="Output Port"
                  >
                    <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#10b981' }} />
                    {(node.status === 'RUNNING' || node.status === 'COMPLETED') && (
                      <div className="port-ping-wave" style={{ borderColor: '#10b981' }} />
                    )}
                  </div>
                )}

                {/* Top Input for Models */}
                {isModelOrMemory && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '-8px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: '15px',
                      height: '15px',
                      borderRadius: '50%',
                      background: '#090d16',
                      border: '2.5px solid #c084fc',
                      boxShadow: '0 0 10px rgba(192, 132, 252, 0.6)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      zIndex: 12,
                    }}
                  >
                    <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#c084fc' }} />
                    {(node.status === 'RUNNING' || node.status === 'COMPLETED') && (
                      <div className="port-ping-wave" style={{ borderColor: '#c084fc' }} />
                    )}
                  </div>
                )}

                {/* Node Card Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '9px',
                        background: theme.iconBg,
                        border: `1px solid ${theme.border}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '18px',
                        flexShrink: 0,
                        boxShadow: `0 0 10px ${theme.glow}`,
                      }}
                    >
                      {node.icon}
                    </div>
                    <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#ffffff', letterSpacing: '-0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {node.name}
                    </span>
                  </div>

                  {/* Status Indicator Pill */}
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: '12px',
                      background: statusBadgeBg,
                      border: `1px solid ${statusBadgeBorder}`,
                      color: statusBadgeText,
                      fontFamily: 'monospace',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      flexShrink: 0,
                    }}
                  >
                    <span
                      style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        background: dotColor,
                        display: 'inline-block',
                        boxShadow: `0 0 6px ${dotColor}`,
                        animation: node.status === 'RUNNING' ? 'liveDotPulse 1.2s ease-in-out infinite' : undefined,
                      }}
                    />
                    {node.status === 'COMPLETED' && '✓'}
                    {node.status === 'FAILED' && '✕'}
                    <span>{node.status}</span>
                  </span>
                </div>

                {/* Node Subtext */}
                <div style={{ fontSize: '11px', color: '#94a3b8', lineHeight: 1.35, marginTop: '2px' }}>
                  {node.subtext}
                </div>

                {/* Output Count Badge */}
                {node.itemCount && (
                  <div
                    style={{
                      marginTop: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                      paddingTop: '6px',
                      fontSize: '11px',
                    }}
                  >
                    <span style={{ color: '#64748b', fontSize: '9.5px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                      Payload:
                    </span>
                    <span
                      style={{
                        fontWeight: 700,
                        color: theme.accent,
                        fontFamily: 'monospace',
                        background: 'rgba(0, 0, 0, 0.4)',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        border: '1px solid rgba(255, 255, 255, 0.06)',
                      }}
                    >
                      {node.itemCount}
                    </span>
                  </div>
                )}

                {/* Failed Node Retry Button */}
                {node.status === 'FAILED' && onRetryStage && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRetryStage(node.id);
                    }}
                    style={{
                      marginTop: '6px',
                      width: '100%',
                      background: '#ef4444',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '4px 8px',
                      fontSize: '10px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    🔄 Retry Node
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Floating Canvas Controls (Bottom-Right corner to never collide with extensions/overlays) */}
        <div
          className="workflow-floating-controls"
          style={{
            position: 'absolute',
            right: '20px',
            bottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(15, 23, 42, 0.92)',
            border: '1px solid rgba(255, 255, 255, 0.14)',
            borderRadius: '12px',
            padding: '6px 10px',
            zIndex: 35,
            boxShadow: '0 10px 30px rgba(0,0,0,0.6)',
            backdropFilter: 'blur(14px)',
          }}
        >
          <button
            type="button"
            onClick={() => setIsInspectorOpen(!isInspectorOpen)}
            title={isInspectorOpen ? 'Close Inspector Drawer' : 'Open Inspector & Logs Drawer'}
            style={{
              padding: '6px 10px',
              borderRadius: '8px',
              background: isInspectorOpen ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.05)',
              border: isInspectorOpen ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.1)',
              color: isInspectorOpen ? '#38bdf8' : '#e2e8f0',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              fontSize: '11px',
              fontWeight: 600,
            }}
          >
            <span>📋</span>
            <span>Inspector</span>
          </button>

          <div style={{ width: '1px', height: '18px', background: 'rgba(255, 255, 255, 0.12)' }} />

          <button
            type="button"
            onClick={() => setZoomLevel((z) => Math.max(0.35, Number((z - 0.1).toFixed(2))))}
            title="Zoom out (−)"
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '6px',
              background: 'transparent',
              border: 'none',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: 700,
            }}
          >
            −
          </button>

          <span
            onClick={handleAutoFit}
            title="Click to reset zoom"
            style={{
              fontSize: '11px',
              color: '#94a3b8',
              fontFamily: 'monospace',
              minWidth: '40px',
              textAlign: 'center',
              cursor: 'pointer',
            }}
          >
            {Math.round(zoomLevel * 100)}%
          </span>

          <button
            type="button"
            onClick={() => setZoomLevel((z) => Math.min(1.5, Number((z + 0.1).toFixed(2))))}
            title="Zoom in (+)"
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '6px',
              background: 'transparent',
              border: 'none',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: 700,
            }}
          >
            +
          </button>

          <button
            type="button"
            onClick={handleAutoFit}
            title="Auto fit all 10 nodes to screen"
            style={{
              padding: '4px 8px',
              borderRadius: '6px',
              background: 'rgba(56, 189, 248, 0.15)',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              color: '#38bdf8',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <span>⛶</span>
            <span>Fit</span>
          </button>
        </div>
      </>
    ) : (
      /* ─────────────────────────────────────────────────────────────
         PIPELINE STEPS VIEW (Linear, 100% Mobile & Laptop Friendly)
      ───────────────────────────────────────────────────────────── */
      <div
        className="workflow-steps-view-container"
        style={{
          flex: 1,
          height: '100%',
          overflowY: 'auto',
          padding: '20px 16px 40px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          maxWidth: '920px',
          margin: '0 auto',
          width: '100%',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px', padding: '0 4px', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc', letterSpacing: '-0.01em' }}>
              Autonomous Execution Stages
            </div>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>
              {nodes.filter((n) => n.status === 'COMPLETED').length} of {nodes.length} stages completed • Synchronous DAG Pipeline
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsInspectorOpen(true)}
            style={{
              fontSize: '11px',
              padding: '6px 12px',
              background: 'rgba(56, 189, 248, 0.15)',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              color: '#38bdf8',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>📋</span>
            <span>Inspector Drawer</span>
          </button>
        </div>

        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '14px', paddingTop: '8px' }}>
          {/* Timeline continuous connector line */}
          <div
            style={{
              position: 'absolute',
              left: '23px',
              top: '24px',
              bottom: '30px',
              width: '2px',
              background: 'linear-gradient(to bottom, #10b981 0%, #38bdf8 50%, #6366f1 100%)',
              opacity: 0.3,
              zIndex: 1,
            }}
          />

          {nodes.map((node, index) => {
            const isSelected = selectedNodeId === node.id;
            let statusColor = '#94a3b8';
            let statusBg = 'rgba(255, 255, 255, 0.05)';
            let statusBorder = 'rgba(255, 255, 255, 0.1)';
            let nodeDotBorder = 'rgba(255, 255, 255, 0.2)';
            let nodeDotBg = '#0f172a';

            if (node.status === 'COMPLETED') {
              statusColor = '#34d399';
              statusBg = 'rgba(16, 185, 129, 0.12)';
              statusBorder = '#10b981';
              nodeDotBorder = '#10b981';
              nodeDotBg = 'rgba(16, 185, 129, 0.2)';
            } else if (node.status === 'RUNNING') {
              statusColor = '#fbbf24';
              statusBg = 'rgba(245, 158, 11, 0.15)';
              statusBorder = '#f59e0b';
              nodeDotBorder = '#f59e0b';
              nodeDotBg = 'rgba(245, 158, 11, 0.25)';
            } else if (node.status === 'FAILED') {
              statusColor = '#f87171';
              statusBg = 'rgba(239, 68, 68, 0.15)';
              statusBorder = '#ef4444';
              nodeDotBorder = '#ef4444';
              nodeDotBg = 'rgba(239, 68, 68, 0.25)';
            }

            return (
              <div
                key={node.id}
                onClick={() => {
                  setSelectedNodeId(node.id);
                  setIsInspectorOpen(true);
                }}
                className="workflow-step-card"
                style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '14px',
                  zIndex: 2,
                }}
              >
                {/* Timeline Node Badge / Number Dot */}
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: nodeDotBg,
                    border: `2px solid ${nodeDotBorder}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '11px',
                    fontWeight: 700,
                    color: node.status === 'COMPLETED' ? '#34d399' : node.status === 'RUNNING' ? '#fbbf24' : '#94a3b8',
                    fontFamily: 'monospace',
                    flexShrink: 0,
                    marginTop: '10px',
                    boxShadow: node.status === 'RUNNING' ? '0 0 12px rgba(245, 158, 11, 0.5)' : 'none',
                  }}
                >
                  {node.status === 'COMPLETED' ? '✓' : index + 1}
                </div>

                {/* Card Body */}
                <div
                  style={{
                    flex: 1,
                    minWidth: 0,
                    background: isSelected ? 'rgba(30, 41, 59, 0.95)' : 'rgba(15, 23, 42, 0.85)',
                    border: isSelected
                      ? '1.5px solid #38bdf8'
                      : node.status === 'RUNNING'
                      ? '1.5px solid #f59e0b'
                      : '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '14px',
                    padding: '14px 16px',
                    boxShadow: isSelected
                      ? '0 0 20px rgba(56, 189, 248, 0.25)'
                      : '0 4px 12px rgba(0, 0, 0, 0.4)',
                    cursor: 'pointer',
                    transition: 'all 0.18s ease',
                  }}
                >
                  {/* Top Bar of Card */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                      <span style={{ fontSize: '20px', flexShrink: 0 }}>{node.icon}</span>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#ffffff' }}>
                          {node.name}
                        </div>
                        <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '1px' }}>
                          {node.subtext}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      {node.itemCount && (
                        <span
                          style={{
                            fontSize: '11px',
                            color: '#38bdf8',
                            background: 'rgba(56, 189, 248, 0.1)',
                            border: '1px solid rgba(56, 189, 248, 0.2)',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontFamily: 'monospace',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {node.itemCount}
                        </span>
                      )}

                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '12px',
                          background: statusBg,
                          border: `1px solid ${statusBorder}`,
                          color: statusColor,
                          fontFamily: 'monospace',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {node.status === 'COMPLETED' && '✓'}
                        {node.status === 'RUNNING' && '⚡'}
                        {node.status === 'FAILED' && '✕'}
                        <span>{node.status}</span>
                      </span>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedNodeId(node.id);
                          setIsInspectorOpen(true);
                        }}
                        style={{
                          padding: '4px 9px',
                          background: 'rgba(255, 255, 255, 0.06)',
                          border: '1px solid rgba(255, 255, 255, 0.12)',
                          color: '#cbd5e1',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        Inspect →
                      </button>
                    </div>
                  </div>

                  {/* Node Live Output / Preview Snippet */}
                  {node.liveOutput?.summary && (
                    <div
                      style={{
                        fontSize: '11px',
                        color: '#cbd5e1',
                        background: 'rgba(0, 0, 0, 0.25)',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                        borderRadius: '8px',
                        padding: '8px 12px',
                        marginTop: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '8px',
                      }}
                    >
                      <span style={{ flex: 1, minWidth: '180px' }}>
                        💡 {node.liveOutput.summary}
                      </span>

                      {/* Embedded Audio Player for Voice Stage */}
                      {node.id === 'voice' && node.liveOutput?.audioUrl && (
                        <audio
                          controls
                          src={node.liveOutput.audioUrl}
                          style={{ height: '28px', maxWidth: '240px' }}
                          onClick={(e) => e.stopPropagation()}
                        />
                      )}

                      {/* Thumbnail Preview for Thumbnail Stage */}
                      {node.id === 'thumbnail' && node.liveOutput?.thumbnailUrl && (
                        <a
                          href={node.liveOutput.thumbnailUrl}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            color: '#38bdf8',
                            fontSize: '11px',
                            textDecoration: 'none',
                          }}
                        >
                          <span>🖼️ View High-Res PNG</span>
                        </a>
                      )}

                      {/* Video Link for Final Compositor */}
                      {node.id === 'compositor' && node.liveOutput?.videoUrl && (
                        <a
                          href={node.liveOutput.videoUrl}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            color: '#10b981',
                            fontSize: '11px',
                            fontWeight: 600,
                            textDecoration: 'none',
                          }}
                        >
                          <span>▶ Play 1080p MP4</span>
                        </a>
                      )}
                    </div>
                  )}

                  {/* Failure / Retry Option if Failed */}
                  {node.status === 'FAILED' && onRetryStage && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRetryStage(node.id);
                      }}
                      style={{
                        marginTop: '10px',
                        background: '#ef4444',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '6px 12px',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <span>🔄</span>
                      <span>Retry Stage ({node.name})</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    )}

    {/* ─────────────────────────────────────────────────────────────
        SLIDE-OVER NODE INSPECTOR & TELEMETRY DRAWER (DOCKED RIGHT)
    ───────────────────────────────────────────────────────────── */}
    {isInspectorOpen && (
      <div
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          bottom: 0,
          width: 'min(440px, 94vw)',
          background: 'rgba(11, 15, 25, 0.98)',
          backdropFilter: 'blur(20px)',
          borderLeft: '1px solid rgba(255, 255, 255, 0.12)',
          boxShadow: '-12px 0 45px rgba(0, 0, 0, 0.75)',
          zIndex: 50,
          display: 'flex',
          flexDirection: 'column',
          animation: 'slideInRight 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Drawer Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(15, 23, 42, 0.75)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '20px' }}>{selectedNode.icon}</span>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>
                {selectedNode.name}
              </div>
              <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                ID: {selectedNode.id} • Category: {selectedNode.category}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsInspectorOpen(false)}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: 'none',
              borderRadius: '6px',
              width: '28px',
              height: '28px',
              color: '#94a3b8',
              fontSize: '14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="Close Inspector (Esc)"
          >
            ✕
          </button>
        </div>

        {/* Inspector Navigation Tabs */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            background: 'rgba(0, 0, 0, 0.25)',
            padding: '0 16px',
          }}
        >
          <button
            type="button"
            onClick={() => setInspectorTab('details')}
            style={{
              padding: '10px 14px',
              background: 'transparent',
              border: 'none',
              borderBottom: inspectorTab === 'details' ? '2px solid #38bdf8' : '2px solid transparent',
              color: inspectorTab === 'details' ? '#38bdf8' : '#94a3b8',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Config & Payloads
          </button>
          <button
            type="button"
            onClick={() => setInspectorTab('logs')}
            style={{
              padding: '10px 14px',
              background: 'transparent',
              border: 'none',
              borderBottom: inspectorTab === 'logs' ? '2px solid #38bdf8' : '2px solid transparent',
              color: inspectorTab === 'logs' ? '#38bdf8' : '#94a3b8',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>Live Logs</span>
            <span
              style={{
                fontSize: '9px',
                padding: '1px 6px',
                borderRadius: '8px',
                background: 'rgba(56, 189, 248, 0.2)',
                color: '#38bdf8',
              }}
            >
              {logs.length}
            </span>
          </button>
        </div>

        {/* Drawer Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {inspectorTab === 'details' ? (
            <>
              {/* Status Banner */}
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase' }}>Current State</div>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#e2e8f0', marginTop: '2px' }}>
                    {selectedNode.status}
                  </div>
                </div>
                {selectedNode.itemCount && (
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase' }}>Payload</div>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#38bdf8', fontFamily: 'monospace', marginTop: '2px' }}>
                      {selectedNode.itemCount}
                    </div>
                  </div>
                )}
              </div>

              {/* Summary */}
              <div>
                <div style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Stage Summary
                </div>
                <div style={{ fontSize: '12px', color: '#cbd5e1', lineHeight: 1.5, background: 'rgba(0,0,0,0.3)', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  {selectedNode.liveOutput?.summary || selectedNode.subtext}
                </div>
              </div>

              {/* Config parameters */}
              {selectedNode.config && (
                <div>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px' }}>
                    Configuration Parameters
                  </div>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                      gap: '6px',
                      background: 'rgba(255, 255, 255, 0.02)',
                      padding: '10px',
                      borderRadius: '8px',
                      border: '1px solid rgba(255, 255, 255, 0.05)',
                    }}
                  >
                    {Object.entries(selectedNode.config).map(([k, v]) => (
                      <div key={k} style={{ fontSize: '11px' }}>
                        <span style={{ color: '#64748b' }}>{k}: </span>
                        <span style={{ color: '#e2e8f0', fontWeight: 600, fontFamily: 'monospace' }}>{String(v)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Media previews if available */}
              {selectedNode.liveOutput?.audioUrl && (
                <div>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px' }}>
                    Audible Narration Preview
                  </div>
                  <audio controls src={selectedNode.liveOutput.audioUrl} style={{ width: '100%', height: '32px' }} />
                </div>
              )}

              {selectedNode.liveOutput?.thumbnailUrl && (
                <div>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px' }}>
                    Generated Thumbnail
                  </div>
                  <img
                    src={selectedNode.liveOutput.thumbnailUrl}
                    alt="Thumbnail"
                    style={{ width: '100%', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}
                  />
                </div>
              )}

              {selectedNode.liveOutput?.videoUrl && (
                <div>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px' }}>
                    Rendered Video Output
                  </div>
                  <a
                    href={selectedNode.liveOutput.videoUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      color: '#10b981',
                      fontSize: '12px',
                      fontWeight: 600,
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: 'rgba(16, 185, 129, 0.1)',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                    }}
                  >
                    <span>▶ Play Rendered 1080p MP4</span>
                  </a>
                </div>
              )}

              {selectedNode.liveOutput?.details && (
                <div>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px' }}>
                    Raw Output Payload
                  </div>
                  <pre
                    style={{
                      margin: 0,
                      padding: '10px 12px',
                      background: 'rgba(0, 0, 0, 0.5)',
                      borderRadius: '8px',
                      fontSize: '11px',
                      color: '#cbd5e1',
                      fontFamily: 'monospace',
                      whiteSpace: 'pre-wrap',
                      maxHeight: '160px',
                      overflowY: 'auto',
                      border: '1px solid rgba(255, 255, 255, 0.05)',
                    }}
                  >
                    {selectedNode.liveOutput.details}
                  </pre>
                </div>
              )}

              {selectedNode.status === 'FAILED' && onRetryStage && (
                <button
                  type="button"
                  onClick={() => onRetryStage(selectedNode.id)}
                  style={{
                    marginTop: '10px',
                    background: '#ef4444',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '8px 14px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  🔄 Retry This Failed Node
                </button>
              )}
            </>
          ) : (
            /* Logs Tab */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '10px', color: '#64748b', fontFamily: 'monospace' }}>
                Session: autora-{selectedTopic.slice(0, 10).replace(/[^a-zA-Z0-9]/g, '')}
              </div>
              {logs.length === 0 ? (
                <div style={{ fontSize: '12px', color: '#64748b', padding: '20px 0', textAlign: 'center' }}>
                  No logs generated yet. Click &quot;Test Workflow&quot; to run simulation.
                </div>
              ) : (
                logs.map((log, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '2px',
                      background: 'rgba(0, 0, 0, 0.3)',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: '1px solid rgba(255, 255, 255, 0.04)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '10px' }}>
                      <span
                        style={{
                          color: log.type === 'success' ? '#34d399' : log.type === 'warn' ? '#fbbf24' : '#38bdf8',
                          fontWeight: 700,
                          fontFamily: 'monospace',
                        }}
                      >
                        [{log.node}]
                      </span>
                      <span style={{ color: '#64748b', fontFamily: 'monospace' }}>{log.timestamp}</span>
                    </div>
                    <div style={{ color: '#cbd5e1', fontSize: '11px', fontFamily: 'monospace', wordBreak: 'break-word', marginTop: '2px' }}>
                      {log.message}
                    </div>
                  </div>
                ))
              )}
              <div ref={logsEndRef} />
            </div>
          )}
        </div>
      </div>
    )}
  </div>

      {/* Embedded CSS for Cable Pulse Animation, Node Glowing Aura, Port Radar & Media Queries */}
      <style jsx global>{`
        @keyframes cablePulse {
          0% {
            stroke-dashoffset: 44;
          }
          100% {
            stroke-dashoffset: 0;
          }
        }
        @keyframes liveDotPulse {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(0.65);
            opacity: 0.35;
          }
        }
        @keyframes portPing {
          0% {
            transform: scale(0.9);
            opacity: 0.85;
          }
          70%, 100% {
            transform: scale(2.4);
            opacity: 0;
          }
        }
        @keyframes nodeRunningPulse {
          0%, 100% {
            box-shadow: 0 0 20px rgba(245, 158, 11, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.2);
            border-color: #f59e0b;
          }
          50% {
            box-shadow: 0 0 35px rgba(245, 158, 11, 0.65), inset 0 1px 0 rgba(255, 255, 255, 0.3);
            border-color: #fbbf24;
          }
        }
        @keyframes nodeCompletedGlow {
          0%, 100% {
            box-shadow: 0 0 16px rgba(16, 185, 129, 0.2), 0 12px 28px -6px rgba(0, 0, 0, 0.65);
          }
          50% {
            box-shadow: 0 0 26px rgba(16, 185, 129, 0.38), 0 12px 28px -6px rgba(0, 0, 0, 0.65);
          }
        }
        @keyframes nodeSelectedAura {
          0%, 100% {
            box-shadow: 0 0 24px rgba(56, 189, 248, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.25);
          }
          50% {
            box-shadow: 0 0 38px rgba(56, 189, 248, 0.8), inset 0 1px 0 rgba(255, 255, 255, 0.35);
          }
        }
        .node-running-pulse {
          animation: nodeRunningPulse 2s ease-in-out infinite;
        }
        .node-completed-glow {
          animation: nodeCompletedGlow 3.5s ease-in-out infinite;
        }
        .node-selected-aura {
          animation: nodeSelectedAura 2.2s ease-in-out infinite;
        }
        .port-ping-wave {
          position: absolute;
          inset: -4px;
          border-radius: 50%;
          border: 1.5px solid currentColor;
          animation: portPing 2.2s cubic-bezier(0, 0, 0.2, 1) infinite;
          pointer-events: none;
        }
        .workflow-interactive-node {
          transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.25s ease, border-color 0.25s ease;
        }
        .workflow-interactive-node:hover {
          transform: translateY(-4px) scale(1.02) !important;
          z-index: 25 !important;
        }
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        .workflow-test-btn-mobile {
          display: none;
        }

        /* Mobile & Small Screen Responsiveness */
        @media (max-width: 768px) {
          .workflow-mode-badge {
            display: none !important;
          }
          .workflow-test-btn-text {
            display: none !important;
          }
          .workflow-test-btn-mobile {
            display: inline !important;
          }
          .workflow-canvas-topbar {
            padding: 8px 12px !important;
          }
          .workflow-subtext {
            display: none !important;
          }
          .view-mode-label {
            display: none !important;
          }
          .workflow-live-badge {
            padding: 4px 8px !important;
            font-size: 9px !important;
          }
          .workflow-sample-topics-bar {
            padding: 8px 12px !important;
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 8px !important;
          }
          .workflow-sample-topics-bar form input {
            width: 100% !important;
          }
          .workflow-floating-controls {
            right: 10px !important;
            bottom: 10px !important;
            padding: 4px 8px !important;
            gap: 4px !important;
          }
          .workflow-step-card {
            gap: 10px !important;
          }
        }
      `}</style>
    </div>
  );
};
