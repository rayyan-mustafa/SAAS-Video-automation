'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useToast } from '@/components/Toast';
import { InteractiveWorkflowCanvas } from '@/components/InteractiveWorkflowCanvas';

interface StageInfo {
  stage: string;
  status: string;
  error_message?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
}

interface ProjectMetadata {
  youtubeTitle: string;
  description: string;
  tags: string[];
  category: string;
  thumbnailConcepts?: Array<{
    title: string;
    style: string;
    description: string;
  }>;
}

interface ProjectData {
  project: {
    id: string;
    topic: string;
    target_length_minutes: number;
    preset: string;
    language: string;
    platform: string;
    status: string;
    current_stage: string;
    error_message?: string | null;
    scheduled_at?: string | null;
    published_at?: string | null;
    publishing_status?: string;
    publish_url?: string | null;
    channel_name: string;
    channel_niche: string;
    channel_voice: string;
    channel_visual_style: string;
  };
  stages: StageInfo[];
  scenes: Array<{
    id: string;
    scene_index: number;
    narration: string;
    visual_prompt: string;
    visual_subject?: string;
    environment?: string;
    camera_movement?: string;
    lighting?: string;
    continuity_notes?: string;
    estimated_duration_sec: number;
    subtitle_text: string;
    quality_report_json?: string;
  }>;
  assets: Array<{
    id: string;
    asset_type: string;
    storage_key: string;
    url: string;
    duration_sec?: number | null;
  }>;
  output?: {
    id: string;
    storage_key: string;
    url: string;
    duration_sec: number;
    resolution: string;
    filesize_bytes: number;
  } | null;
  thumbnail?: {
    url: string;
    storageKey: string;
  } | null;
  metadata?: ProjectMetadata | null;
  youtubeConnection?: {
    connected: boolean;
    channelTitle?: string;
  };
}

export default function VideoStudioPage({ params }: { params?: any }) {
  const routeParams = useParams();
  const id = (routeParams?.id as string) || (params?.id as string) || '';
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const toast = useToast();

  const [data, setData] = useState<ProjectData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSceneIdx, setActiveSceneIdx] = useState(0);
  const [activeInspectorTab, setActiveInspectorTab] = useState<'scenes' | 'scene' | 'copilot' | 'metadata' | 'publish'>('scene');
  const [mobileStudioTab, setMobileStudioTab] = useState<'scenes' | 'inspector' | 'copilot' | 'publish'>('scenes');
  const [studioViewMode, setStudioViewMode] = useState<'timeline' | 'workflow'>('timeline');

  // Video Player state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showCc, setShowCc] = useState(true);

  // Multi-Scene Cinematic Engine state
  const [playbackMode, setPlaybackMode] = useState<'MULTI_SCENE_AUTO' | 'SOLO_SCENE'>('MULTI_SCENE_AUTO');
  const [rerollMap, setRerollMap] = useState<Record<number, number>>({});
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Per-scene independent regeneration & aspect ratio state
  const [isRegeneratingScene, setIsRegeneratingScene] = useState(false);
  const [aspectRatioMode, setAspectRatioMode] = useState<'9:16' | '16:9'>('9:16');
  const [videoFitMode, setVideoFitMode] = useState<'cover' | 'contain'>('cover');

  // Interactive Voice Recording state
  const [isVoiceRecordModalOpen, setIsVoiceRecordModalOpen] = useState(false);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordedAudioBlob, setRecordedAudioBlob] = useState<Blob | null>(null);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [micErrorMessage, setMicErrorMessage] = useState<string | null>(null);
  const [customAudioOverride, setCustomAudioOverride] = useState<string | null>(null);
  const [isSavingVoice, setIsSavingVoice] = useState(false);
  const voiceMediaRecorderRef = useRef<MediaRecorder | null>(null);
  const voiceAudioChunksRef = useRef<Blob[]>([]);
  const voiceRecordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Copilot state
  const [copilotLoading, setCopilotLoading] = useState(false);
  const [copilotResult, setCopilotResult] = useState<string | null>(null);
  const [copilotCustomPrompt, setCopilotCustomPrompt] = useState('');

  // Publishing state
  const [publishing, setPublishing] = useState(false);
  const [targetPublishPlatforms, setTargetPublishPlatforms] = useState<string[]>(['YouTube', 'TikTok', 'Instagram', 'Facebook']);
  const [publishVisibility, setPublishVisibility] = useState<'PRIVATE' | 'UNLISTED' | 'PUBLIC'>('PRIVATE');
  const [publishScheduleTime, setPublishScheduleTime] = useState('');
  const [publishMsg, setPublishMsg] = useState<string | null>(null);

  const fetchProject = useCallback(async () => {
    try {
      const search = typeof window !== 'undefined' ? window.location.search : '';
      const res = await fetch(`/api/projects/${id}${search}`);
      if (!res.ok) {
        if (res.status === 401) {
          setError('Authentication required. Please log in.');
          return;
        }
        if (res.status === 403) {
          setError('Access denied: You do not have permission to view this project.');
          return;
        }
        if (res.status === 404) {
          setError('Project does not exist or has been deleted.');
          return;
        }
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.error || `Failed to load project details (Error ${res.status})`);
      }
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load project details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchProject();

    const interval = setInterval(() => {
      if (data?.project?.status === 'PROCESSING' || data?.project?.status === 'PENDING' || data?.project?.publishing_status === 'UPLOADING') {
        fetchProject();
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [fetchProject, data?.project?.status, data?.project?.publishing_status]);

  // Video generation state
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [generationStep, setGenerationStep] = useState<string>('');
  const [isEditingTopic, setIsEditingTopic] = useState(false);
  const [editedTopic, setEditedTopic] = useState('');
  const [savingTopic, setSavingTopic] = useState(false);

  const handleSaveTopic = async () => {
    if (!editedTopic.trim() || savingTopic) return;
    try {
      setSavingTopic(true);
      toast.info('Updating topic and generating fresh video pipeline... 🚀');
      const res = await fetch(`/api/projects/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: editedTopic.trim() }),
      });
      const resJson = await res.json();
      if (!res.ok) throw new Error(resJson.error || 'Failed to update topic');
      if (typeof window !== 'undefined') {
        const newUrl = `${window.location.pathname}?topic=${encodeURIComponent(editedTopic.trim())}`;
        window.history.replaceState({}, '', newUrl);
      }
      setIsEditingTopic(false);
      toast.success('Topic updated! Starting video generation... ✨');
      await fetchProject();
      handleGenerateVideo('SCRIPT');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save topic');
    } finally {
      setSavingTopic(false);
    }
  };

  const handleGenerateVideo = async (startStage: string = 'SCRIPT') => {
    try {
      setIsGeneratingVideo(true);
      toast.info('Starting AI video generation pipeline... ⚡');

      const pipelineStages: Array<{ stage: string; label: string }> = [
        { stage: 'SCRIPT', label: '🧠 Generating structured script with AI...' },
        { stage: 'VOICE', label: '🎙️ Synthesizing studio voiceover narration...' },
        { stage: 'SCENES', label: '📐 Calibrating visual scene storyboard...' },
        { stage: 'VIDEO', label: '🎬 Creating 1080p cinematic video clips...' },
        { stage: 'SUBTITLES', label: '📝 Generating synchronized subtitle captions...' },
        { stage: 'FINAL_VIDEO', label: '🎞️ Assembling final 1080p MP4 composition...' },
        { stage: 'THUMBNAIL', label: '🎨 Generating high-CTR video thumbnail...' },
      ];

      const startIdx = pipelineStages.findIndex((s) => s.stage === startStage);
      const executionStages = startIdx >= 0 ? pipelineStages.slice(startIdx) : pipelineStages;

      for (const item of executionStages) {
        setGenerationStep(item.label);
        const search = typeof window !== 'undefined' ? window.location.search : '';
        const res = await fetch(`/api/projects/${id}/retry${search}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stage: item.stage, singleStageOnly: true, topic: data?.project?.topic }),
        });

        const resJson = await res.json();
        if (!res.ok) {
          throw new Error(resJson.error || `Failed during ${item.stage} stage`);
        }
        await fetchProject();
      }

      toast.success('Video generation complete! 1080p MP4 ready 🎉');
    } catch (err: any) {
      toast.error(err.message || 'Generation failed');
    } finally {
      setIsGeneratingVideo(false);
      setGenerationStep('');
      await fetchProject();
    }
  };

  const handleRetry = async (stage?: string) => {
    await handleGenerateVideo(stage || 'SCRIPT');
  };

  const handleCopilotAction = async (action: string) => {
    if (!data) return;
    try {
      setCopilotLoading(true);
      setCopilotResult(null);

      const activeScene = data.scenes[activeSceneIdx] || data.scenes[0];
      const res = await fetch('/api/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          topic: data.project.topic,
          currentText: activeScene?.narration || data.project.topic,
          sceneIndex: activeScene?.scene_index || 1,
          niche: data.project.channel_niche,
        }),
      });

      const resJson = await res.json();
      if (res.ok) {
        setCopilotResult(resJson.result);
        toast.success('Copilot response generated ✨');
      } else {
        setCopilotResult(`Error: ${resJson.error}`);
        toast.error(resJson.error || 'Copilot generation failed');
      }
    } catch (err: any) {
      setCopilotResult(`Error: ${err.message}`);
      toast.error(err.message);
    } finally {
      setCopilotLoading(false);
    }
  };

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (targetPublishPlatforms.length === 0) {
        toast.warning('Please select at least one platform to publish to.');
        return;
      }

      setPublishing(true);
      setPublishMsg(null);
      toast.info(`Publishing 1080p video to ${targetPublishPlatforms.join(', ')}... 🚀`);

      const res = await fetch(`/api/projects/${id}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visibility: publishVisibility,
          scheduleTime: publishScheduleTime || null,
          platforms: targetPublishPlatforms,
        }),
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Publishing failed');

      toast.success(`Published successfully to ${targetPublishPlatforms.join(', ')}! 🎉`);
      setPublishMsg(resData.message || `Published successfully to ${targetPublishPlatforms.join(', ')}!`);
      await fetchProject();
    } catch (err: any) {
      toast.error(err.message || 'Publishing failed');
      setPublishMsg(`Error: ${err.message}`);
    } finally {
      setPublishing(false);
    }
  };

  const scenes = data?.scenes || [];
  const project = data?.project;

  // Computed scene timeline with exact start and end seconds
  const sceneTimeline = React.useMemo(() => {
    let accumulated = 0;
    return scenes.map((s, idx) => {
      const start = accumulated;
      const dur = Math.max(4, s.estimated_duration_sec || 8);
      accumulated += dur;
      return {
        ...s,
        index: idx,
        startTime: start,
        endTime: accumulated,
        duration: dur,
      };
    });
  }, [scenes]);

  const totalCompositionDuration = React.useMemo(() => {
    if (sceneTimeline.length === 0) return duration || 60;
    return sceneTimeline[sceneTimeline.length - 1].endTime;
  }, [sceneTimeline, duration]);

  // Which scene is currently active based on playback position
  const activeTimelineScene = React.useMemo(() => {
    if (sceneTimeline.length === 0) return null;
    const found = sceneTimeline.find(
      (st) => currentTime >= st.startTime && currentTime < st.endTime
    );
    return found || sceneTimeline[sceneTimeline.length - 1];
  }, [sceneTimeline, currentTime]);

  const displayedScene = playbackMode === 'SOLO_SCENE'
    ? (scenes[activeSceneIdx] || scenes[0])
    : (activeTimelineScene || scenes[activeSceneIdx] || scenes[0]);

  const displayedSceneNum = displayedScene?.scene_index || (activeSceneIdx + 1);
  const currentReroll = rerollMap[displayedSceneNum] || 0;

  // Final / active 1080p video URL
  const finalVideoUrl = data?.output?.url && data.output.url.startsWith('http')
    ? data.output.url
    : data?.output && project
    ? `/api/assets/${data.output.storage_key}?topic=${encodeURIComponent(project.topic)}`
    : null;

  // Active clip URL for the displayed scene (cuts dynamically in MULTI_SCENE_AUTO mode)
  const activeVideoUrl = displayedScene && project?.id
    ? `/api/assets/clips/${project.id}/scene_${displayedSceneNum}_clip_1.mp4?topic=${encodeURIComponent(project.topic)}&scene=${displayedSceneNum}&r=${currentReroll}&prompt=${encodeURIComponent(displayedScene.visual_prompt || '')}`
    : finalVideoUrl;

  // Background preload next scene's video for instant zero-latency seamless cuts
  const nextSceneNum = displayedSceneNum < scenes.length ? displayedSceneNum + 1 : null;
  const nextScene = nextSceneNum ? scenes.find((s) => s.scene_index === nextSceneNum) : null;
  const nextVideoUrl = nextScene && project?.id
    ? `/api/assets/clips/${project.id}/scene_${nextSceneNum}_clip_1.mp4?topic=${encodeURIComponent(project.topic)}&scene=${nextSceneNum}&prompt=${encodeURIComponent(nextScene.visual_prompt || '')}`
    : null;

   const audioAsset = data?.assets?.find((a) => a.asset_type === 'audio');
  const baseAudioUrl = project?.id
    ? (audioAsset && audioAsset.storage_key
        ? `/api/assets/${audioAsset.storage_key}?topic=${encodeURIComponent(project.topic || '')}&lang=${encodeURIComponent(project.language || 'en')}`
        : `/api/assets/voice/${project.id}/narration.mp3?topic=${encodeURIComponent(project.topic || '')}&lang=${encodeURIComponent(project.language || 'en')}`)
    : null;
  const audioUrl = customAudioOverride || baseAudioUrl;
  const srtAsset = data?.assets?.find((a) => a.asset_type === 'subtitles');
  const vttUrl = srtAsset && project?.id ? `/api/assets/subtitles/${project.id}/captions.vtt` : null;

  // Browser SpeechSynthesis for guaranteed 100% audible voice narration
  const speakNarration = useCallback((text: string, lang: string = 'en') => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      if (!text || !text.trim()) return;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      const langMap: Record<string, string> = {
        ur: 'ur-PK',
        hi: 'hi-IN',
        ar: 'ar-SA',
        es: 'es-ES',
        fr: 'fr-FR',
        de: 'de-DE',
        pt: 'pt-BR',
        tr: 'tr-TR',
        it: 'it-IT',
        ja: 'ja-JP',
        zh: 'zh-CN',
        en: 'en-US',
      };
      utterance.lang = langMap[lang] || lang || 'en-US';

      // Pick matching regional voice in browser
      const voices = window.speechSynthesis.getVoices();
      if (voices && voices.length > 0) {
        const langCode = utterance.lang.toLowerCase();
        const prefix = langCode.split('-')[0];
        const match =
          voices.find((v) => v.lang.toLowerCase().replace('_', '-') === langCode) ||
          voices.find((v) => v.lang.toLowerCase().startsWith(prefix));
        if (match) {
          utterance.voice = match;
        }
      }

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn('SpeechSynthesis error:', err);
    }
  }, []);

  // Preload speech synthesis voices on page mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
      const onVoices = () => window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = onVoices;
      return () => {
        window.speechSynthesis.onvoiceschanged = null;
      };
    }
  }, []);

  // Toggle play/pause synchronized between audio, narration, and video
  const togglePlay = () => {
    if (isPlaying) {
      if (videoRef.current) videoRef.current.pause();
      if (audioRef.current) audioRef.current.pause();
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setIsPlaying(false);
    } else {
      if (videoRef.current) {
        videoRef.current.play().catch(() => {});
      }
      // Speak browser speech synthesis ONLY if no synthesized MP3 audio track exists
      if (!audioUrl && displayedScene?.narration) {
        speakNarration(displayedScene.narration, project?.language || 'en');
      }
      if (audioRef.current) {
        audioRef.current.currentTime = currentTime;
        audioRef.current.play().catch(() => {});
      }
      setIsPlaying(true);
    }
  };

  // Speak active scene narration on transition ONLY if no audio file asset exists
  useEffect(() => {
    if (isPlaying && !audioUrl && displayedScene?.narration) {
      speakNarration(displayedScene.narration, project?.language || 'en');
    }
  }, [displayedSceneNum, isPlaying, audioUrl]);

  // Synchronized playback ticker across all scene cuts
  useEffect(() => {
    if (!isPlaying) return;
    const tick = setInterval(() => {
      setCurrentTime((prev) => {
        let next = prev + 0.25;
        if (audioRef.current && !audioRef.current.paused && audioRef.current.currentTime > 0) {
          next = audioRef.current.currentTime;
        }
        if (next >= totalCompositionDuration) {
          setIsPlaying(false);
          if (videoRef.current) videoRef.current.pause();
          if (audioRef.current) audioRef.current.pause();
          return 0;
        }
        return next;
      });
    }, 250);
    return () => clearInterval(tick);
  }, [isPlaying, totalCompositionDuration]);

  // ─────────────────────────────────────────────────────────────
  // STUDIO VOICE RECORDING LOGIC
  // ─────────────────────────────────────────────────────────────
  const startVoiceRecording = async () => {
    try {
      setMicErrorMessage(null);
      if (recordedAudioUrl) {
        URL.revokeObjectURL(recordedAudioUrl);
        setRecordedAudioUrl(null);
        setRecordedAudioBlob(null);
      }

      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        throw new Error('Microphone recording is not supported in this browser. Please use Chrome, Edge, or Firefox.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      let mimeType = 'audio/webm';
      if (typeof MediaRecorder !== 'undefined' && typeof MediaRecorder.isTypeSupported === 'function') {
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          mimeType = 'audio/webm;codecs=opus';
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
        }
      }

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      voiceMediaRecorderRef.current = recorder;
      voiceAudioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          voiceAudioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(voiceAudioChunksRef.current, { type: mimeType || 'audio/webm' });
        setRecordedAudioBlob(audioBlob);
        const url = URL.createObjectURL(audioBlob);
        setRecordedAudioUrl(url);
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start(250);
      setIsRecordingVoice(true);
      setRecordingDuration(0);

      if (voiceRecordingTimerRef.current) clearInterval(voiceRecordingTimerRef.current);
      voiceRecordingTimerRef.current = setInterval(() => {
        setRecordingDuration((prev) => {
          if (prev >= 120) {
            stopVoiceRecording();
            return 120;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err: any) {
      console.error('Microphone access error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setMicErrorMessage(
          'Microphone permission was denied. Please click the lock or settings icon in your browser address bar (next to autora.live), set Microphone to "Allow", and reload this page.'
        );
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setMicErrorMessage('No microphone detected on your device. Please plug in a microphone or headset.');
      } else {
        setMicErrorMessage(err.message || 'Unable to access microphone. Please check browser settings.');
      }
    }
  };

  const stopVoiceRecording = () => {
    if (voiceRecordingTimerRef.current) {
      clearInterval(voiceRecordingTimerRef.current);
      voiceRecordingTimerRef.current = null;
    }
    if (voiceMediaRecorderRef.current && voiceMediaRecorderRef.current.state === 'recording') {
      voiceMediaRecorderRef.current.stop();
    }
    setIsRecordingVoice(false);
  };

  const handleApplyVoice = async () => {
    if (!recordedAudioUrl || !recordedAudioBlob) {
      toast.error('Please record your voice first before applying.');
      return;
    }

    setCustomAudioOverride(recordedAudioUrl);
    if (audioRef.current) {
      audioRef.current.src = recordedAudioUrl;
      audioRef.current.currentTime = 0;
    }
    toast.success('🎙️ Your voice is now active on the video player!');
    setIsVoiceRecordModalOpen(false);

    try {
      setIsSavingVoice(true);
      const formData = new FormData();
      const fileName = `voice_${project?.id || 'studio'}_${Date.now()}.webm`;
      const file = new File([recordedAudioBlob], fileName, { type: recordedAudioBlob.type });
      formData.append('file', file);
      formData.append('type', 'voice_sample');
      formData.append('consent', 'true');

      const res = await fetch('/api/personal-ai/upload', {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        toast.success('☁️ Saved to your cloud audio library.');
      }
    } catch (e) {
      console.warn('Voice background upload notice:', e);
    } finally {
      setIsSavingVoice(false);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current && playbackMode === 'SOLO_SCENE') {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(totalCompositionDuration || videoRef.current.duration);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
    if (videoRef.current) {
      videoRef.current.currentTime = time % (videoRef.current.duration || 10);
    }
  };

  const handleSelectScene = (idx: number) => {
    setActiveSceneIdx(idx);
    if (playbackMode === 'MULTI_SCENE_AUTO' && sceneTimeline[idx]) {
      const targetTime = sceneTimeline[idx].startTime;
      setCurrentTime(targetTime);
      if (audioRef.current) audioRef.current.currentTime = targetTime;
    }
  };

  const handleRerollActiveScene = () => {
    const sNum = displayedScene?.scene_index || (activeSceneIdx + 1);
    setRerollMap((prev) => ({
      ...prev,
      [sNum]: (prev[sNum] || 0) + 1,
    }));
    toast.success(`Scene ${sNum} visual switched to alternate 1080p shot! ✨`);
  };

  const handleRegenerateScene = async (targetScene?: any) => {
    const sceneToRegen = targetScene || displayedScene || scenes[activeSceneIdx];
    if (!sceneToRegen || isRegeneratingScene) return;

    try {
      setIsRegeneratingScene(true);
      toast.info(`⚡ Regenerating Scene ${sceneToRegen.scene_index} with AI...`);

      const search = typeof window !== 'undefined' ? window.location.search : '';
      const res = await fetch(`/api/projects/${id}/scenes/${sceneToRegen.id || sceneToRegen.scene_index}/regenerate${search}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visualPrompt: sceneToRegen.visual_prompt,
          cameraMovement: sceneToRegen.camera_movement,
          durationSec: sceneToRegen.estimated_duration_sec,
          niche: project?.channel_niche || 'AI & Tech',
          visualStyle: project?.channel_visual_style || 'Cinematic High-Contrast',
        }),
      });

      const resJson = await res.json();
      if (!res.ok) throw new Error(resJson.error || 'Scene regeneration failed');

      // Update reroll map to bust browser cache for that scene's clip
      setRerollMap((prev) => ({
        ...prev,
        [sceneToRegen.scene_index]: (prev[sceneToRegen.scene_index] || 0) + 1,
      }));

      toast.success(`Scene ${sceneToRegen.scene_index} regenerated! Fresh 9:16 vertical clip ready 🎉`);
      await fetchProject();
    } catch (err: any) {
      toast.error(err.message || 'Failed to regenerate scene');
    } finally {
      setIsRegeneratingScene(false);
    }
  };

  const [isRevoicing, setIsRevoicing] = useState(false);
  const [isSwappingTier, setIsSwappingTier] = useState(false);
  const [isUndoing, setIsUndoing] = useState(false);
  const [isRecomposing, setIsRecomposing] = useState(false);
  const [editedNarrationText, setEditedNarrationText] = useState<string>('');

  const handleRevoiceScene = async (targetScene: any, newText: string) => {
    if (!targetScene || isRevoicing) return;
    try {
      setIsRevoicing(true);
      toast.info(`🎙️ Re-voicing Scene ${targetScene.scene_index}...`);
      const search = typeof window !== 'undefined' ? window.location.search : '';
      const res = await fetch(`/api/projects/${id}/scenes/${targetScene.id || targetScene.scene_index}/narration${search}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ narration: newText }),
      });
      const resJson = await res.json();
      if (!res.ok) throw new Error(resJson.error || 'Failed to re-voice scene');

      toast.success(`Scene ${targetScene.scene_index} re-voiced! (${resJson.durationSec}s) ${resJson.isFree ? '• Free Edit Used' : `• Billed ${resJson.creditsDeducted} cr`}`);
      await fetchProject();
    } catch (err: any) {
      toast.error(err.message || 'Failed to re-voice scene');
    } finally {
      setIsRevoicing(false);
    }
  };

  const handleSwapSceneTier = async (targetScene: any, targetTier: string) => {
    if (!targetScene || isSwappingTier) return;
    try {
      setIsSwappingTier(true);
      toast.info(`🎨 Swapping Scene ${targetScene.scene_index} to [${targetTier.toUpperCase()}]...`);
      const search = typeof window !== 'undefined' ? window.location.search : '';
      const res = await fetch(`/api/projects/${id}/scenes/${targetScene.id || targetScene.scene_index}/swap${search}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetTier, visualPrompt: targetScene.visual_prompt }),
      });
      const resJson = await res.json();
      if (!res.ok) throw new Error(resJson.error || 'Failed to swap visual tier');

      toast.success(`Scene ${targetScene.scene_index} swapped to ${targetTier}! ${resJson.isFree ? '• Free Edit Used' : `• Billed ${resJson.creditsDeducted} cr`}`);
      await fetchProject();
    } catch (err: any) {
      toast.error(err.message || 'Failed to swap visual tier');
    } finally {
      setIsSwappingTier(false);
    }
  };

  const handleUndoScene = async (targetScene: any) => {
    if (!targetScene || isUndoing) return;
    try {
      setIsUndoing(true);
      toast.info(`↩️ Reverting Scene ${targetScene.scene_index} to prior version...`);
      const search = typeof window !== 'undefined' ? window.location.search : '';
      const res = await fetch(`/api/projects/${id}/scenes/${targetScene.id || targetScene.scene_index}/undo${search}`, {
        method: 'POST',
      });
      const resJson = await res.json();
      if (!res.ok) throw new Error(resJson.error || 'Failed to revert scene');

      toast.success(`Scene ${targetScene.scene_index} reverted to previous version! ✨`);
      await fetchProject();
    } catch (err: any) {
      toast.error(err.message || 'Failed to revert scene');
    } finally {
      setIsUndoing(false);
    }
  };

  const handleRecomposeVideo = async () => {
    if (isRecomposing) return;
    try {
      setIsRecomposing(true);
      toast.info('🎬 Re-composing video with latest scene cuts...');
      const search = typeof window !== 'undefined' ? window.location.search : '';
      const res = await fetch(`/api/projects/${id}/recompose${search}`, { method: 'POST' });
      const resJson = await res.json();
      if (!res.ok) throw new Error(resJson.error || 'Failed to recompose video');

      toast.success('Full video re-composed successfully! 🎉');
      await fetchProject();
    } catch (err: any) {
      toast.error(err.message || 'Failed to recompose video');
    } finally {
      setIsRecomposing(false);
    }
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  if (loading) {
    return (
      <div className="studio-page-layout" style={{ padding: '80px 0', textAlign: 'center' }}>
        <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Loading AUTORA Studio...</div>
      </div>
    );
  }

  if (error || !data || !project) {
    const isAuth = error?.toLowerCase().includes('authentication') || error?.toLowerCase().includes('log in');
    return (
      <div className="studio-page-layout" style={{ padding: '80px 0', textAlign: 'center' }}>
        <div style={{ color: 'var(--status-error)', fontSize: '15px', marginBottom: '16px', fontWeight: 500 }}>
          ⚠️ {error || 'Project not found'}
        </div>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', alignItems: 'center' }}>
          {isAuth ? (
            <Link href="/login" className="btn btn-primary btn-sm">
              Log In
            </Link>
          ) : (
            <button
              onClick={() => {
                setLoading(true);
                setError(null);
                fetchProject();
              }}
              className="btn btn-primary btn-sm"
              style={{ cursor: 'pointer' }}
            >
              🔄 Retry
            </button>
          )}
          <Link href="/content" className="btn btn-secondary btn-sm">
            ← Return to Projects
          </Link>
        </div>
      </div>
    );
  }

  const { stages, output, thumbnail, metadata } = data;
  const isGenerating = project.status === 'PROCESSING' || project.status === 'PENDING';
  const activeScene = displayedScene || scenes[0];

  return (
    <div className="studio-page-layout" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 1. STUDIO TOP CONTROL BAR */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          padding: '16px 22px',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
          <Link href="/content" className="btn btn-ghost btn-sm" style={{ padding: '6px 8px' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
          </Link>

          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
              <span className={`status-pill ${project.status}`}>{project.status}</span>
              {project.publishing_status && (
                <span className={`status-pill ${project.publishing_status}`}>
                  {project.publishing_status}
                </span>
              )}
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                {project.channel_name} • {project.target_length_minutes}m
              </span>
            </div>

            {isEditingTopic ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  value={editedTopic}
                  onChange={(e) => setEditedTopic(e.target.value)}
                  placeholder="Enter new video topic or prompt..."
                  style={{
                    padding: '6px 10px',
                    fontSize: '13px',
                    background: 'var(--bg-tertiary)',
                    border: '1px solid #6366f1',
                    borderRadius: '6px',
                    color: '#fff',
                    width: '100%',
                    maxWidth: '380px',
                    minWidth: 0,
                  }}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handleSaveTopic}
                  disabled={savingTopic || !editedTopic.trim()}
                  className="btn btn-primary btn-sm"
                  style={{ padding: '6px 12px', fontSize: '12px', background: '#6366f1' }}
                >
                  {savingTopic ? 'Saving...' : 'Save & Generate Video'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingTopic(false)}
                  className="btn btn-ghost btn-sm"
                  style={{ padding: '6px 8px', fontSize: '12px' }}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', minWidth: 0 }}>
                <h1
                  style={{
                    fontSize: '16px',
                    fontWeight: 700,
                    color: '#fff',
                    maxWidth: '100%',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {project.topic}
                </h1>
                <button
                  type="button"
                  onClick={() => {
                    setEditedTopic(project.topic);
                    setIsEditingTopic(true);
                  }}
                  className="btn btn-ghost btn-sm"
                  style={{ padding: '2px 6px', fontSize: '11px', color: 'var(--text-muted)' }}
                  title="Change this video topic"
                >
                  ✏️ Edit Topic
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={() => handleGenerateVideo('SCRIPT')}
            disabled={isGeneratingVideo}
            className="btn btn-primary btn-sm"
            style={{
              background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
              boxShadow: '0 0 16px rgba(99, 102, 241, 0.4)',
              border: 'none',
              fontWeight: 600,
            }}
          >
            {isGeneratingVideo ? (
              <>
                <span style={{ display: 'inline-block', width: '12px', height: '12px', border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                <span>Generating Video...</span>
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
                <span>{output && project.status === 'COMPLETED' ? '⚡ Re-Generate with AI' : '⚡ Generate Video with AI'}</span>
              </>
            )}
          </button>

          <Link
            href="/content/new"
            className="btn btn-secondary btn-sm"
          >
            + Create New Video
          </Link>

          {output && (
            <a
              href={`/api/assets/${output.storage_key}?topic=${encodeURIComponent(project.topic)}`}
              download={`${project.topic.replace(/[^a-zA-Z0-9]/g, '_')}.mp4`}
              className="btn btn-secondary btn-sm"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              <span>Download 1080p MP4</span>
            </a>
          )}

          <button
            onClick={() => setActiveInspectorTab('publish')}
            className="btn btn-secondary btn-sm"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            <span>Publish to YouTube</span>
          </button>

          {/* View Mode Toggle: Timeline vs n8n Workflow Canvas */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '8px',
              padding: '2px',
              marginLeft: '4px',
            }}
          >
            <button
              type="button"
              onClick={() => setStudioViewMode('timeline')}
              style={{
                background: studioViewMode === 'timeline' ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                color: studioViewMode === 'timeline' ? '#ffffff' : 'var(--text-muted)',
                border: 'none',
                borderRadius: '6px',
                padding: '5px 11px',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <span>🎞️ Timeline</span>
            </button>
            <button
              type="button"
              onClick={() => setStudioViewMode('workflow')}
              style={{
                background: studioViewMode === 'workflow' ? 'rgba(16, 185, 129, 0.25)' : 'transparent',
                color: studioViewMode === 'workflow' ? '#34d399' : 'var(--text-muted)',
                border: 'none',
                borderRadius: '6px',
                padding: '5px 11px',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <span>⚡ Workflow (n8n)</span>
            </button>
          </div>
        </div>
      </div>

      {/* ERROR DIAGNOSTICS BANNER */}
      {(project.status === 'FAILED' || project.error_message) && (
        <div
          style={{
            padding: '14px 18px',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 'var(--radius-lg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '18px' }}>⚠️</span>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#fca5a5' }}>
                Generation Paused ({project.current_stage || 'PIPELINE'} Stage)
              </div>
              <div style={{ fontSize: '12px', color: '#f87171' }}>
                {project.error_message || 'An error occurred during stage execution. Click retry to re-run pipeline with fallback engine.'}
              </div>
            </div>
          </div>
          <button
            onClick={() => handleGenerateVideo(project.current_stage || 'SCRIPT')}
            disabled={isGeneratingVideo}
            className="btn btn-sm"
            style={{
              background: '#ef4444',
              color: '#fff',
              fontWeight: 600,
              padding: '6px 14px',
              fontSize: '12px',
            }}
          >
            🔄 Retry Generation
          </button>
        </div>
      )}

      {/* 2. CONDITIONAL VIEW: INTERACTIVE WORKFLOW CANVAS OR THREE-PANE VIDEO STUDIO */}
      {studioViewMode === 'workflow' ? (
        <div style={{ marginBottom: '24px' }}>
          <InteractiveWorkflowCanvas
            mode="live"
            projectData={project ? { ...project, scenes, output: data?.output, thumbnail: data?.thumbnail } : undefined}
            currentStage={project.current_stage || 'SCRIPT'}
            projectStatus={project.status || 'PROCESSING'}
            onRetryStage={(stageId) => handleGenerateVideo(stageId)}
            title={`${project.topic || 'Video Project'} — Autonomous Pipeline`}
            subtitle="Live execution topology — real-time node statuses, audio/video previews, and retry actions"
          />
        </div>
      ) : (
        <div className="studio-workspace">
        {/* LEFT PANE: Scene Cuts List (Hidden on mobile if other tab active) */}
        <div className={`studio-pane studio-pane-left ${mobileStudioTab !== 'scenes' ? 'studio-pane-mobile-hidden' : ''}`}>
          <div className="pane-header">
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>
              Scene Cuts ({scenes.length})
            </span>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              ~{Math.round(scenes.reduce((acc, s) => acc + s.estimated_duration_sec, 0))}s Total
            </span>
          </div>

          <div className="scene-list-container">
            {scenes.length === 0 ? (
              <div style={{ padding: '24px 12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                No scene cuts generated yet. Click "Generate Video with AI" to create script & scenes.
              </div>
            ) : (
              scenes.map((s, idx) => (
                <div
                  key={s.id || idx}
                  onClick={() => handleSelectScene(idx)}
                  className={`scene-cut-item ${(displayedSceneNum === s.scene_index) ? 'active' : ''}`}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span className="scene-cut-index">Scene {s.scene_index}</span>
                      {rerollMap[s.scene_index] ? (
                        <span style={{ fontSize: '9px', background: '#4f46e5', color: '#fff', padding: '1px 5px', borderRadius: '4px' }}>
                          v{rerollMap[s.scene_index] + 1}
                        </span>
                      ) : null}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span className="scene-cut-duration">{s.estimated_duration_sec}s</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRegenerateScene(s);
                        }}
                        disabled={isRegeneratingScene}
                        style={{
                          background: 'rgba(99,102,241,0.15)',
                          border: '1px solid rgba(99,102,241,0.3)',
                          color: '#818cf8',
                          cursor: 'pointer',
                          padding: '2px 5px',
                          borderRadius: '4px',
                          fontSize: '10px',
                          fontWeight: 600,
                        }}
                        title="Regenerate this scene with AI"
                      >
                        ⚡
                      </button>
                    </div>
                  </div>
                  <div className="scene-cut-text">{s.narration}</div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* CENTER PANE: 1080p Theater Player & Timeline (Pinned to top on mobile) */}
        <div className="studio-theater-column">
          {/* Multi-Scene Engine Mode Switcher Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '8px',
              padding: '8px 12px',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              fontSize: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <button
                onClick={() => setPlaybackMode('MULTI_SCENE_AUTO')}
                className={`btn btn-sm ${playbackMode === 'MULTI_SCENE_AUTO' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ fontSize: '11px', padding: '4px 10px', height: '28px' }}
              >
                🎬 Full Multi-Scene Composition
              </button>
              <button
                onClick={() => setPlaybackMode('SOLO_SCENE')}
                className={`btn btn-sm ${playbackMode === 'SOLO_SCENE' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ fontSize: '11px', padding: '4px 10px', height: '28px' }}
              >
                🔍 Solo Scene {displayedSceneNum} Preview
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '10px', color: '#a1a1aa', fontFamily: 'var(--font-mono)' }}>
                VEO 3 / OPENAI SORA • 1080P 60FPS
              </span>
              <button
                onClick={() => setAspectRatioMode(aspectRatioMode === '9:16' ? '16:9' : '9:16')}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '11px', padding: '3px 8px', height: '26px', color: '#38bdf8' }}
                title="Switch between 9:16 Shorts/Reels vertical and 16:9 widescreen player"
              >
                {aspectRatioMode === '9:16' ? '📱 9:16 Shorts' : '🖥️ 16:9 Widescreen'}
              </button>
              <button
                onClick={() => setVideoFitMode(videoFitMode === 'cover' ? 'contain' : 'cover')}
                className="btn btn-secondary btn-sm"
                style={{
                  fontSize: '11px',
                  padding: '3px 8px',
                  height: '26px',
                  color: videoFitMode === 'cover' ? '#10b981' : '#f59e0b',
                  borderColor: videoFitMode === 'cover' ? 'rgba(16,185,129,0.3)' : undefined,
                }}
                title="Toggle between edge-to-edge full screen fill and letterbox fit"
              >
                {videoFitMode === 'cover' ? '📐 Fill Frame (No Bars)' : '🔲 Fit (Letterbox)'}
              </button>
              <button
                onClick={handleRerollActiveScene}
                className="btn btn-ghost btn-sm"
                style={{ fontSize: '11px', padding: '3px 8px', height: '26px', color: '#818cf8' }}
                title="Switch this scene's footage to an alternate 1080p shot"
              >
                🔄 Re-roll B-Roll
              </button>
            </div>
          </div>

          <div
            className="theater-screen"
            style={{
              position: 'relative',
              overflow: 'hidden',
              margin: '0 auto',
              background: '#050507',
              ...(aspectRatioMode === '9:16'
                ? {
                    height: 'min(500px, 58vh)',
                    maxHeight: 'min(500px, 58vh)',
                    aspectRatio: '9/16',
                    width: 'auto',
                    maxWidth: '300px',
                    borderRadius: '20px',
                    border: '2px solid rgba(255, 255, 255, 0.16)',
                    boxShadow: '0 16px 44px rgba(0, 0, 0, 0.9), 0 0 0 1px rgba(255, 255, 255, 0.05)',
                  }
                : {
                    height: 'min(440px, 52vh)',
                    maxHeight: 'min(440px, 52vh)',
                    aspectRatio: '16/9',
                    width: '100%',
                    maxWidth: '780px',
                    borderRadius: '12px',
                    border: '1px solid rgba(255, 255, 255, 0.14)',
                    boxShadow: '0 12px 36px rgba(0, 0, 0, 0.85)',
                  }),
            }}
          >
            {/* Background continuous narration audio */}
            {audioUrl && <audio ref={audioRef} src={audioUrl} preload="auto" />}

            {/* Scene info banner overlay */}
            {displayedScene && (
              <div
                style={{
                  position: 'absolute',
                  top: '12px',
                  left: '12px',
                  zIndex: 20,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'rgba(9, 11, 16, 0.85)',
                  backdropFilter: 'blur(10px)',
                  padding: '5px 12px',
                  borderRadius: '20px',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#fff',
                }}
              >
                <span style={{ color: '#818cf8' }}>● REC</span>
                <span>Scene {displayedSceneNum} / {scenes.length || 1}</span>
                <span style={{ color: '#71717a' }}>|</span>
                <span style={{ color: '#e4e4e7', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {displayedScene.camera_movement || 'Cinematic Push'}
                </span>
              </div>
            )}

            {activeVideoUrl ? (
              <>
                <video
                  key={`${displayedSceneNum}-${currentReroll}`}
                  ref={videoRef}
                  src={activeVideoUrl}
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={handleLoadedMetadata}
                  onEnded={() => {
                    if (playbackMode === 'SOLO_SCENE') {
                      if (videoRef.current) {
                        videoRef.current.currentTime = 0;
                        videoRef.current.play().catch(() => {});
                      }
                    }
                  }}
                  className="theater-video"
                  crossOrigin="anonymous"
                  autoPlay={isPlaying}
                  loop={playbackMode === 'SOLO_SCENE'}
                  playsInline
                  muted={true}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: videoFitMode,
                    borderRadius: 'inherit',
                  }}
                />

                {/* Preload Next Scene's Footage in Background to Eliminate Transition Buffering */}
                {nextVideoUrl && (
                  <video
                    src={nextVideoUrl}
                    preload="auto"
                    muted={true}
                    playsInline
                    style={{ position: 'absolute', width: '1px', height: '1px', opacity: 0, pointerEvents: 'none' }}
                  />
                )}

                {/* Subtitle Caption Overlay */}
                {showCc && displayedScene && (
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '20px',
                      left: '16px',
                      right: '16px',
                      textAlign: 'center',
                      pointerEvents: 'none',
                      zIndex: 20,
                    }}
                  >
                    <div
                      style={{
                        display: 'inline-block',
                        background: 'rgba(0, 0, 0, 0.75)',
                        backdropFilter: 'blur(12px)',
                        border: '1px solid rgba(255, 255, 255, 0.18)',
                        borderRadius: '8px',
                        padding: '8px 18px',
                        color: '#ffffff',
                        fontSize: '13px',
                        fontWeight: 600,
                        letterSpacing: '0.015em',
                        lineHeight: 1.4,
                        boxShadow: '0 8px 32px rgba(0,0,0,0.8)',
                        maxWidth: '90%',
                      }}
                    >
                      {displayedScene.subtitle_text || displayedScene.narration}
                    </div>
                  </div>
                )}
              </>
            ) : isGeneratingVideo ? (
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'linear-gradient(180deg, #090b10 0%, #0f121a 100%)',
                  padding: '30px',
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    width: '52px',
                    height: '52px',
                    borderRadius: '50%',
                    border: '3px solid rgba(99, 102, 241, 0.2)',
                    borderTopColor: '#818cf8',
                    animation: 'spin 0.9s linear infinite',
                    marginBottom: '20px',
                  }}
                />
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#fff', marginBottom: '6px' }}>
                  Generating Autonomous AI Video
                </h3>
                <p style={{ fontSize: '13px', color: '#818cf8', maxWidth: '380px', lineHeight: 1.5 }}>
                  {generationStep || 'Processing multi-scene screenplay, neural voiceover, and 1080p composition...'}
                </p>
              </div>
            ) : thumbnail?.url ? (
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  backgroundImage: `url(${thumbnail.url})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <button
                  onClick={() => handleGenerateVideo('SCRIPT')}
                  className="btn btn-primary"
                  style={{
                    padding: '12px 24px',
                    boxShadow: '0 0 25px rgba(0,0,0,0.8)',
                    fontSize: '14px',
                  }}
                >
                  ▶ Render Full 1080p Video
                </button>
              </div>
            ) : (
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'linear-gradient(180deg, #090b10 0%, #0f121a 100%)',
                  padding: '32px 20px',
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                    background: 'rgba(99,102,241,0.12)',
                    border: '1px solid rgba(99,102,241,0.25)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '16px',
                  }}
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                  </svg>
                </div>
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#f4f4f5', marginBottom: '6px' }}>
                  Ready to Generate Video
                </h3>
                <p style={{ fontSize: '12px', color: '#94a3b8', maxWidth: '360px', lineHeight: 1.5, marginBottom: '18px' }}>
                  Generate a full retention-focused screenplay, neural voiceover, cinematic B-roll clips, and 1080p MP4.
                </p>
                <button
                  onClick={() => handleGenerateVideo('SCRIPT')}
                  className="btn btn-primary"
                  style={{
                    padding: '10px 22px',
                    fontSize: '13px',
                    fontWeight: 600,
                    background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                    boxShadow: '0 0 16px rgba(99,102,241,0.3)',
                    border: 'none',
                  }}
                >
                  <span>⚡ Generate AI Video (1-Click)</span>
                </button>
              </div>
            )}
          </div>

          {/* Player Controls Bar */}
          <div className="theater-controls-bar">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                onClick={togglePlay}
                disabled={!activeVideoUrl && !finalVideoUrl}
                className="btn btn-secondary btn-sm"
                style={{ padding: '6px 12px' }}
              >
                {isPlaying ? '⏸ Pause' : '▶ Play'}
              </button>

              <span className="time-display">
                {formatTime(currentTime)} / {formatTime(totalCompositionDuration)}
              </span>

              <span style={{ fontSize: '11px', color: '#818cf8', fontWeight: 600, marginLeft: '4px' }}>
                Scene {displayedSceneNum}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => {
                  if (audioRef.current) {
                    audioRef.current.currentTime = currentTime;
                    audioRef.current.play().catch(() => {});
                  }
                  if (!audioUrl && displayedScene?.narration) {
                    speakNarration(displayedScene.narration, project?.language || 'en');
                  }
                  toast.success(customAudioOverride ? '🎙️ Playing your recorded voiceover' : '🎙️ Spoken voiceover activated');
                }}
                className="btn btn-secondary btn-sm"
                style={{ padding: '4px 8px', fontSize: '11px', gap: '4px' }}
                title="Play or test spoken voiceover narration"
              >
                <span>🔊</span>
                <span>Voiceover</span>
              </button>

              <button
                type="button"
                onClick={() => setIsVoiceRecordModalOpen(true)}
                className="btn btn-secondary btn-sm"
                style={{
                  padding: '4px 10px',
                  fontSize: '11px',
                  gap: '5px',
                  background: customAudioOverride ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.12)',
                  borderColor: customAudioOverride ? '#10b981' : 'rgba(239, 68, 68, 0.35)',
                  color: customAudioOverride ? '#34d399' : '#f87171',
                }}
                title="Record your personal voice for this scene/video using your microphone"
              >
                <span>🎙️</span>
                <span>{customAudioOverride ? 'Voice Recorded ✓' : 'Record My Voice'}</span>
              </button>

              <button
                onClick={() => setShowCc(!showCc)}
                className={`btn btn-sm ${showCc ? 'btn-secondary' : 'btn-ghost'}`}
                style={{ padding: '4px 8px', fontSize: '11px' }}
              >
                CC Subtitles
              </button>
            </div>
          </div>

          {/* Timeline Scrubber */}
          <div className="studio-timeline-container">
            <div className="timeline-header">
              <span>Multi-Scene Timeline Scrubber ({formatTime(currentTime)} / {formatTime(totalCompositionDuration)})</span>
              <span>{scenes.length} Scene Blocks • Auto Scene Cuts</span>
            </div>

            <input
              type="range"
              min="0"
              max={totalCompositionDuration || 100}
              step="0.1"
              value={currentTime}
              onChange={handleSeek}
              disabled={!activeVideoUrl && !finalVideoUrl}
              className="timeline-scrubber-track"
            />

            <div className="timeline-scenes-track">
              {sceneTimeline.map((s) => (
                <div
                  key={s.id || s.index}
                  onClick={() => handleSelectScene(s.index)}
                  className={`timeline-scene-block ${(displayedSceneNum === s.scene_index) ? 'active' : ''}`}
                  style={{ flex: Math.max(1, s.duration) }}
                  title={`Scene ${s.scene_index} (${s.duration}s): ${s.narration.substring(0, 45)}...`}
                >
                  S{s.scene_index} ({s.duration}s)
                </div>
              ))}
            </div>
          </div>

          {/* Mobile Tab Navigator (Hidden on Desktop, Visible on Mobile <= 1024px) */}
          <div className="studio-mobile-tabs">
            <button
              type="button"
              onClick={() => setMobileStudioTab('scenes')}
              className={mobileStudioTab === 'scenes' ? 'active' : ''}
            >
              🎬 Scene Cuts ({scenes.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setMobileStudioTab('inspector');
                setActiveInspectorTab('scene');
              }}
              className={mobileStudioTab === 'inspector' && activeInspectorTab === 'scene' ? 'active' : ''}
            >
              ⚙️ Inspector
            </button>
            <button
              type="button"
              onClick={() => {
                setMobileStudioTab('copilot');
                setActiveInspectorTab('copilot');
              }}
              className={mobileStudioTab === 'copilot' || (mobileStudioTab !== 'scenes' && activeInspectorTab === 'copilot') ? 'active' : ''}
            >
              ⚡ Copilot
            </button>
            <button
              type="button"
              onClick={() => {
                setMobileStudioTab('publish');
                setActiveInspectorTab('publish');
              }}
              className={mobileStudioTab === 'publish' || (mobileStudioTab !== 'scenes' && activeInspectorTab === 'publish') ? 'active' : ''}
            >
              🚀 Publish
            </button>
          </div>
        </div>

        {/* RIGHT PANE: AI Inspector, AUTORA Copilot & Publishing (Hidden on mobile if scenes tab is active) */}
        <div className={`studio-pane studio-pane-right ${mobileStudioTab === 'scenes' ? 'studio-pane-mobile-hidden' : ''}`}>
          {/* Tab Switcher */}
          <div className="pane-header" style={{ padding: '8px 12px' }}>
            <div style={{ display: 'flex', gap: '4px', width: '100%', overflowX: 'auto' }}>
              <button
                onClick={() => {
                  setActiveInspectorTab('scenes');
                  setMobileStudioTab('scenes');
                }}
                className={`btn btn-sm studio-tabs-scenes-btn ${activeInspectorTab === 'scenes' ? 'btn-secondary' : 'btn-ghost'}`}
                style={{ flex: 1, fontSize: '11px', whiteSpace: 'nowrap' }}
              >
                🎬 Scenes
              </button>
              <button
                onClick={() => {
                  setActiveInspectorTab('scene');
                  setMobileStudioTab('inspector');
                }}
                className={`btn btn-sm ${activeInspectorTab === 'scene' ? 'btn-secondary' : 'btn-ghost'}`}
                style={{ flex: 1, fontSize: '11px', whiteSpace: 'nowrap' }}
              >
                AI Scene
              </button>
              <button
                onClick={() => {
                  setActiveInspectorTab('copilot');
                  setMobileStudioTab('copilot');
                }}
                className={`btn btn-sm ${activeInspectorTab === 'copilot' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ flex: 1, fontSize: '11px', background: activeInspectorTab === 'copilot' ? 'var(--gradient-brand)' : 'transparent', color: '#fff', whiteSpace: 'nowrap' }}
              >
                ⚡ Copilot
              </button>
              <button
                onClick={() => {
                  setActiveInspectorTab('metadata');
                  setMobileStudioTab('inspector');
                }}
                className={`btn btn-sm ${activeInspectorTab === 'metadata' ? 'btn-secondary' : 'btn-ghost'}`}
                style={{ flex: 1, fontSize: '11px', whiteSpace: 'nowrap' }}
              >
                Metadata
              </button>
              <button
                onClick={() => {
                  setActiveInspectorTab('publish');
                  setMobileStudioTab('publish');
                }}
                className={`btn btn-sm ${activeInspectorTab === 'publish' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ flex: 1, fontSize: '11px', whiteSpace: 'nowrap' }}
              >
                Publish
              </button>
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {activeInspectorTab === 'scenes' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#fff' }}>
                    Scene Cuts ({scenes.length})
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    ~{Math.round(scenes.reduce((acc, s) => acc + s.estimated_duration_sec, 0))}s Total
                  </span>
                </div>
                {scenes.length === 0 ? (
                  <div style={{ padding: '24px 12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                    No scene cuts generated yet.
                  </div>
                ) : (
                  scenes.map((s, idx) => {
                    let qcScore: number | null = null;
                    let qcPassed = true;
                    try {
                      if (s.quality_report_json) {
                        const parsed = JSON.parse(s.quality_report_json);
                        qcScore = parsed.overallScore;
                        qcPassed = parsed.passed ?? true;
                      }
                    } catch {}

                    return (
                      <div
                        key={s.id || idx}
                        onClick={() => handleSelectScene(idx)}
                        className={`scene-cut-item ${(displayedSceneNum === s.scene_index) ? 'active' : ''}`}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span className="scene-cut-index">Scene {s.scene_index}</span>
                            {qcScore !== null ? (
                              <span style={{
                                fontSize: '9px',
                                background: qcPassed ? 'rgba(34, 197, 94, 0.18)' : 'rgba(234, 179, 8, 0.18)',
                                color: qcPassed ? '#4ade80' : '#facc15',
                                border: `1px solid ${qcPassed ? 'rgba(34, 197, 94, 0.35)' : 'rgba(234, 179, 8, 0.35)'}`,
                                padding: '1px 5px',
                                borderRadius: '4px',
                                fontWeight: 600,
                              }}>
                                {qcPassed ? `✓ ${qcScore}% QC` : `⚡ ${qcScore}% QC`}
                              </span>
                            ) : null}
                            {rerollMap[s.scene_index] ? (
                              <span style={{ fontSize: '9px', background: '#4f46e5', color: '#fff', padding: '1px 5px', borderRadius: '4px' }}>
                                v{rerollMap[s.scene_index] + 1}
                              </span>
                            ) : null}
                          </div>
                          <span className="scene-cut-duration">{s.estimated_duration_sec}s</span>
                        </div>
                        <div className="scene-cut-text">{s.narration}</div>
                      </div>
                    );
                  })
                )}
              </div>
            ) : activeInspectorTab === 'scene' && activeScene ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#fff' }}>
                    Scene {displayedSceneNum} Inspector
                  </span>
                  <span style={{ fontSize: '10px', background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', padding: '2px 6px', borderRadius: '4px' }}>
                    Veo 3 Pro
                  </span>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Visual Synthesis Prompt</label>
                  <textarea
                    className="form-textarea"
                    value={activeScene.visual_prompt}
                    readOnly
                    rows={4}
                    style={{ fontSize: '12px', lineHeight: 1.4 }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Camera Movement</label>
                    <input
                      type="text"
                      className="form-input"
                      value={activeScene.camera_movement || 'Linear glide'}
                      readOnly
                      style={{ fontSize: '12px' }}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Lighting Style</label>
                    <input
                      type="text"
                      className="form-input"
                      value={activeScene.lighting || 'Cinematic Studio'}
                      readOnly
                      style={{ fontSize: '12px' }}
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Subtitle Caption Text</label>
                  <textarea
                    className="form-textarea"
                    value={activeScene.subtitle_text || activeScene.narration}
                    readOnly
                    rows={3}
                    style={{ fontSize: '12px' }}
                  />
                </div>

                {/* AI Quality Control Audit Section */}
                {(() => {
                  let qcData: any = null;
                  try {
                    if (activeScene.quality_report_json) {
                      qcData = JSON.parse(activeScene.quality_report_json);
                    }
                  } catch {}

                  if (!qcData) {
                    return (
                      <div style={{ padding: '10px 12px', background: 'rgba(99,102,241,0.08)', borderRadius: '8px', border: '1px solid rgba(99,102,241,0.2)' }}>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: '#818cf8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>🛡️ AI Quality Control Active</span>
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                          Automated 8-point check evaluates narration match, 9:16 framing, visual style cohesion, and motion realism.
                        </div>
                      </div>
                    );
                  }

                  const checks = qcData.checks || {};
                  return (
                    <div style={{ padding: '12px', background: 'rgba(15, 23, 42, 0.65)', borderRadius: '8px', border: `1px solid ${qcData.passed ? 'rgba(34, 197, 94, 0.3)' : 'rgba(234, 179, 8, 0.3)'}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>🛡️ Quality Control Audit</span>
                        </span>
                        <span style={{
                          fontSize: '10px',
                          background: qcData.passed ? 'rgba(34, 197, 94, 0.2)' : 'rgba(234, 179, 8, 0.2)',
                          color: qcData.passed ? '#4ade80' : '#facc15',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontWeight: 700,
                        }}>
                          {qcData.passed ? `PASSED (${qcData.overallScore}%)` : `REFINED (${qcData.overallScore}%)`}
                        </span>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '10px' }}>
                        <div style={{ color: checks.visualMatchesNarration?.passed ? '#4ade80' : '#f87171' }}>
                          {checks.visualMatchesNarration?.passed ? '✓' : '✗'} Narration Sync
                        </div>
                        <div style={{ color: checks.correctSubjectAndObjects?.passed ? '#4ade80' : '#f87171' }}>
                          {checks.correctSubjectAndObjects?.passed ? '✓' : '✗'} Subject / Objects
                        </div>
                        <div style={{ color: checks.noAiArtifactsOrDistortions?.passed ? '#4ade80' : '#f87171' }}>
                          {checks.noAiArtifactsOrDistortions?.passed ? '✓' : '✗'} No Distortions
                        </div>
                        <div style={{ color: checks.naturalLookingMotion?.passed ? '#4ade80' : '#f87171' }}>
                          {checks.naturalLookingMotion?.passed ? '✓' : '✗'} Natural Motion
                        </div>
                        <div style={{ color: checks.correct916Framing?.passed ? '#4ade80' : '#f87171' }}>
                          {checks.correct916Framing?.passed ? '✓' : '✗'} 9:16 Framing
                        </div>
                        <div style={{ color: checks.consistentVisualStyle?.passed ? '#4ade80' : '#f87171' }}>
                          {checks.consistentVisualStyle?.passed ? '✓' : '✗'} Visual Style DNA
                        </div>
                        <div style={{ color: checks.sceneDifferentiation?.passed ? '#4ade80' : '#f87171' }}>
                          {checks.sceneDifferentiation?.passed ? '✓' : '✗'} Shot Variety
                        </div>
                        <div style={{ color: checks.strongVisualHook?.passed ? '#4ade80' : '#f87171' }}>
                          {checks.strongVisualHook?.passed ? '✓' : '✗'} Visual Hook
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Voice Narration Section in Inspector */}
                <div style={{ padding: '10px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#e4e4e7', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <span>🎙️</span>
                      <span>Scene Voiceover</span>
                    </span>
                    {customAudioOverride ? (
                      <span style={{ fontSize: '10px', color: '#10b981', fontWeight: 700, background: 'rgba(16,185,129,0.15)', padding: '2px 6px', borderRadius: '4px' }}>
                        Custom Voice Active ✓
                      </span>
                    ) : (
                      <span style={{ fontSize: '10px', color: '#a1a1aa', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px' }}>
                        AI Voice Active
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsVoiceRecordModalOpen(true)}
                    className="btn btn-secondary btn-xs"
                    style={{ width: '100%', fontSize: '11px', gap: '5px', justifyContent: 'center' }}
                  >
                    <span>🎙️</span>
                    <span>{customAudioOverride ? 'Re-record / Replace Voice' : 'Record My Voice for this Scene'}</span>
                  </button>
                </div>

                {/* WP5 Visual Tier Controls */}
                <div style={{ padding: '12px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#e4e4e7' }}>Visual Tier:</span>
                    <span style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '4px',
                      background: (activeScene as any).visual_tier === 'ai_clip' ? 'rgba(99, 102, 241, 0.2)' : (activeScene as any).visual_tier === 'graphic' ? 'rgba(56, 189, 248, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                      color: (activeScene as any).visual_tier === 'ai_clip' ? '#818cf8' : (activeScene as any).visual_tier === 'graphic' ? '#38bdf8' : '#34d399',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                    }}>
                      {((activeScene as any).visual_tier || 'motion_still').toUpperCase()}
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={() => handleSwapSceneTier(activeScene, 'ai_clip')}
                      disabled={isSwappingTier || (activeScene as any).visual_tier === 'ai_clip'}
                      className="btn btn-secondary btn-xs"
                      style={{ fontSize: '10px', padding: '5px 2px', justifyContent: 'center' }}
                    >
                      AI Video
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSwapSceneTier(activeScene, 'graphic')}
                      disabled={isSwappingTier || (activeScene as any).visual_tier === 'graphic'}
                      className="btn btn-secondary btn-xs"
                      style={{ fontSize: '10px', padding: '5px 2px', justifyContent: 'center' }}
                    >
                      Graphic Card
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSwapSceneTier(activeScene, 'motion_still')}
                      disabled={isSwappingTier || (activeScene as any).visual_tier === 'motion_still'}
                      className="btn btn-secondary btn-xs"
                      style={{ fontSize: '10px', padding: '5px 2px', justifyContent: 'center' }}
                    >
                      Motion Still
                    </button>
                  </div>
                </div>

                {/* WP5 Narration Edit & 1-Click Undo */}
                <div style={{ padding: '12px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#e4e4e7' }}>Narration (Edit & Re-Voice)</span>
                    <button
                      type="button"
                      onClick={() => handleUndoScene(activeScene)}
                      disabled={isUndoing}
                      className="btn btn-ghost btn-xs"
                      style={{ fontSize: '10px', color: '#f59e0b', padding: '2px 6px' }}
                    >
                      ↩️ 1-Click Undo
                    </button>
                  </div>
                  <textarea
                    className="form-textarea"
                    value={editedNarrationText || activeScene.narration}
                    onChange={(e) => setEditedNarrationText(e.target.value)}
                    rows={3}
                    style={{ fontSize: '11px', lineHeight: 1.4 }}
                  />
                  <button
                    type="button"
                    onClick={() => handleRevoiceScene(activeScene, editedNarrationText || activeScene.narration)}
                    disabled={isRevoicing}
                    className="btn btn-secondary btn-xs"
                    style={{ width: '100%', marginTop: '6px', fontSize: '11px', justifyContent: 'center' }}
                  >
                    {isRevoicing ? 'Synthesizing Audio...' : '🎙️ Re-Voice Segment'}
                  </button>
                </div>

                <div style={{ marginTop: 'auto', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <button
                    onClick={() => handleRegenerateScene(activeScene)}
                    disabled={isRegeneratingScene}
                    className="btn btn-primary btn-sm"
                    style={{
                      width: '100%',
                      background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                      color: '#fff',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      boxShadow: '0 0 14px rgba(99,102,241,0.3)',
                    }}
                  >
                    {isRegeneratingScene ? (
                      <>
                        <span style={{ display: 'inline-block', width: '12px', height: '12px', border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                        <span>Regenerating Scene {displayedSceneNum}...</span>
                      </>
                    ) : (
                      <>
                        <span>⚡ Regenerate This Scene (AI)</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleRecomposeVideo}
                    disabled={isRecomposing}
                    className="btn btn-secondary btn-sm"
                    style={{ width: '100%', background: 'rgba(34, 197, 94, 0.15)', color: '#4ade80', borderColor: 'rgba(34, 197, 94, 0.3)' }}
                  >
                    {isRecomposing ? '🎬 Re-composing...' : '🎬 Recompose Full Video'}
                  </button>
                  <button
                    onClick={handleRerollActiveScene}
                    className="btn btn-secondary btn-sm"
                    style={{ width: '100%' }}
                  >
                    🔄 Re-roll B-Roll Footage
                  </button>
                  <button
                    onClick={() => {
                      setPlaybackMode(playbackMode === 'SOLO_SCENE' ? 'MULTI_SCENE_AUTO' : 'SOLO_SCENE');
                    }}
                    className="btn btn-ghost btn-sm"
                    style={{ width: '100%' }}
                  >
                    {playbackMode === 'SOLO_SCENE' ? '🎬 Back to Full Composition' : `🔍 Solo Preview Scene ${displayedSceneNum}`}
                  </button>
                </div>
              </>
            ) : activeInspectorTab === 'copilot' ? (
              /* AUTORA Copilot Tab */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '14px' }}>⚡</span>
                    <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>AUTORA Studio Copilot</h3>
                  </div>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Contextual AI assistant for rewriting scene prompts, hooks, and thumbnail concepts.
                  </p>
                </div>

                {/* Copilot Action Pills */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  <button
                    disabled={copilotLoading}
                    onClick={() => handleCopilotAction('rewrite_scene')}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '11px', padding: '4px 8px' }}
                  >
                    🎬 Rewrite Cinematic
                  </button>
                  <button
                    disabled={copilotLoading}
                    onClick={() => handleCopilotAction('stronger_hook')}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '11px', padding: '4px 8px' }}
                  >
                    🔥 Stronger Hook
                  </button>
                  <button
                    disabled={copilotLoading}
                    onClick={() => handleCopilotAction('thumbnail_ideas')}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '11px', padding: '4px 8px' }}
                  >
                    🎨 Thumbnail Ideas
                  </button>
                  <button
                    disabled={copilotLoading}
                    onClick={() => handleCopilotAction('shorten_narration')}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '11px', padding: '4px 8px' }}
                  >
                    ✂️ Shorten Scene
                  </button>
                  <button
                    disabled={copilotLoading}
                    onClick={() => handleCopilotAction('generate_titles')}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '11px', padding: '4px 8px' }}
                  >
                    🏷️ 5 Viral Titles
                  </button>
                </div>

                {/* Copilot Result Box */}
                {copilotLoading ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: 'var(--accent-cyan)', fontSize: '12px' }}>
                    ⚡ Copilot is generating scene optimizations...
                  </div>
                ) : copilotResult ? (
                  <div style={{ padding: '12px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-glow)' }}>
                    <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--accent-cyan)', marginBottom: '6px' }}>
                      Copilot Output
                    </div>
                    <div style={{ fontSize: '12px', color: '#fff', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                      {copilotResult}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : activeInspectorTab === 'metadata' && metadata ? (
              <>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">YouTube Optimized Title</label>
                  <input type="text" className="form-input" value={metadata.youtubeTitle} readOnly style={{ fontSize: '12px' }} />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Video Description</label>
                  <textarea className="form-textarea" value={metadata.description} readOnly rows={6} style={{ fontSize: '11px', fontFamily: 'var(--font-mono)' }} />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Tags & Keywords ({metadata.tags?.length || 0})</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {metadata.tags?.map((t: string, i: number) => (
                      <span key={i} style={{ fontSize: '10px', padding: '2px 6px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
                        {t}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Thumbnail Preview */}
                {thumbnail?.url && (
                  <div style={{ marginTop: '10px' }}>
                    <label className="form-label">Generated 1080p Thumbnail</label>
                    <img
                      src={thumbnail.url}
                      alt="Thumbnail"
                      style={{ width: '100%', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}
                    />
                  </div>
                )}
              </>
            ) : (
              /* Publish Tab */
              <form onSubmit={handlePublish} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>
                    Multi-Platform Direct Publishing
                  </h3>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Publish this 1080p video directly across YouTube, TikTok, and Instagram simultaneously.
                  </p>
                </div>

                {publishMsg && (
                  <div
                    style={{
                      padding: '10px',
                      borderRadius: 'var(--radius-md)',
                      background: publishMsg.startsWith('Error') ? 'var(--status-error-bg)' : 'var(--status-live-bg)',
                      color: publishMsg.startsWith('Error') ? 'var(--status-error)' : 'var(--status-live)',
                      fontSize: '12px',
                    }}
                  >
                    {publishMsg}
                  </div>
                )}

                {/* Target Platforms Checkboxes */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Target Platforms</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px', marginTop: '4px' }}>
                    {[
                      { id: 'YouTube', label: 'YouTube', icon: '🔴' },
                      { id: 'TikTok', label: 'TikTok', icon: '🎵' },
                      { id: 'Instagram', label: 'Instagram', icon: '📸' },
                      { id: 'Facebook', label: 'Facebook', icon: '🔵' },
                    ].map((plat) => {
                      const isChecked = targetPublishPlatforms.includes(plat.id);
                      return (
                        <label
                          key={plat.id}
                          style={{
                            background: isChecked ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                            border: isChecked ? '1px solid #6366f1' : '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '6px',
                            padding: '8px 10px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            color: '#fff',
                            userSelect: 'none',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setTargetPublishPlatforms([...targetPublishPlatforms, plat.id]);
                              } else {
                                if (targetPublishPlatforms.length > 1) {
                                  setTargetPublishPlatforms(targetPublishPlatforms.filter((p) => p !== plat.id));
                                } else {
                                  toast.warning('Please select at least one platform');
                                }
                              }
                            }}
                            style={{ accentColor: '#6366f1' }}
                          />
                          <span>{plat.icon} {plat.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Privacy Visibility</label>
                  <select
                    className="form-select"
                    value={publishVisibility}
                    onChange={(e) => setPublishVisibility(e.target.value as any)}
                  >
                    <option value="PRIVATE">Private (Restricted)</option>
                    <option value="UNLISTED">Unlisted (Link Only)</option>
                    <option value="PUBLIC">Public (Instant Release)</option>
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Scheduled Release Slot (Optional)</label>
                  <input
                    type="datetime-local"
                    className="form-input"
                    value={publishScheduleTime}
                    onChange={(e) => setPublishScheduleTime(e.target.value)}
                  />
                </div>

                <button
                  type="submit"
                  disabled={publishing || !output}
                  className="btn btn-primary"
                  style={{ width: '100%', marginTop: '12px' }}
                >
                  {publishing
                    ? `Publishing to ${targetPublishPlatforms.join(', ')}...`
                    : `🚀 Publish to ${targetPublishPlatforms.join(', ')} Now`}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          STUDIO VOICE RECORDER MODAL
      ───────────────────────────────────────────────────────────── */}
      {isVoiceRecordModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !isRecordingVoice) {
              setIsVoiceRecordModalOpen(false);
            }
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '520px',
              background: '#12141a',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '16px',
              boxShadow: '0 24px 64px rgba(0, 0, 0, 0.9)',
              padding: '24px',
              position: 'relative',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '16px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                paddingBottom: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '20px' }}>🎙️</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#fff' }}>
                    Record Your Voice (Scene {displayedSceneNum})
                  </h3>
                  <p style={{ margin: 0, fontSize: '11px', color: '#a1a1aa' }}>
                    Record your microphone audio to narrate this scene or video
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (isRecordingVoice) stopVoiceRecording();
                  setIsVoiceRecordModalOpen(false);
                }}
                className="btn btn-ghost btn-sm"
                style={{ fontSize: '16px', padding: '4px 8px', minHeight: 'auto' }}
              >
                ✕
              </button>
            </div>

            {/* Teleprompter: Display current scene narration */}
            {displayedScene?.narration && (
              <div style={{ marginBottom: '16px' }}>
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: '#818cf8',
                    marginBottom: '6px',
                  }}
                >
                  Teleprompter — Read this script aloud:
                </div>
                <div
                  style={{
                    background: '#090b10',
                    border: '1px solid rgba(129, 140, 248, 0.25)',
                    borderRadius: '10px',
                    padding: '14px',
                    color: '#f4f4f5',
                    fontSize: '14px',
                    lineHeight: '1.6',
                    maxHeight: '130px',
                    overflowY: 'auto',
                  }}
                >
                  &ldquo;{displayedScene.narration}&rdquo;
                </div>
              </div>
            )}

            {/* Error Message if Mic Blocked */}
            {micErrorMessage && (
              <div
                style={{
                  background: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.35)',
                  borderRadius: '10px',
                  padding: '12px',
                  marginBottom: '16px',
                  color: '#fca5a5',
                  fontSize: '12px',
                  lineHeight: '1.5',
                }}
              >
                ⚠️ <strong>Microphone Access Notice:</strong>
                <p style={{ margin: '4px 0 0 0' }}>{micErrorMessage}</p>
              </div>
            )}

            {/* Recording Controls Area */}
            <div
              style={{
                background: '#0a0c12',
                border: '1px dashed rgba(255, 255, 255, 0.12)',
                borderRadius: '12px',
                padding: '24px 16px',
                textAlign: 'center',
                marginBottom: '16px',
              }}
            >
              {isRecordingVoice ? (
                <div>
                  <div
                    style={{
                      width: '60px',
                      height: '60px',
                      borderRadius: '50%',
                      background: '#ef4444',
                      margin: '0 auto 12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 0 28px rgba(239, 68, 68, 0.7)',
                    }}
                  >
                    <span style={{ fontSize: '26px' }}>🔴</span>
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: '#ef4444', fontFamily: 'monospace' }}>
                    00:{recordingDuration.toString().padStart(2, '0')} / 02:00
                  </div>
                  <div style={{ fontSize: '12px', color: '#a1a1aa', marginTop: '6px' }}>
                    Recording your microphone... speak clearly!
                  </div>
                  <button
                    type="button"
                    onClick={stopVoiceRecording}
                    className="btn"
                    style={{
                      marginTop: '16px',
                      padding: '10px 24px',
                      background: '#ffffff',
                      color: '#09090b',
                      fontWeight: 700,
                      borderRadius: '8px',
                      fontSize: '13px',
                    }}
                  >
                    ⏹️ Stop Recording
                  </button>
                </div>
              ) : recordedAudioUrl ? (
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#10b981', marginBottom: '10px' }}>
                    ✓ Audio recorded successfully ({recordingDuration}s)
                  </div>
                  <audio controls src={recordedAudioUrl} style={{ width: '100%', marginBottom: '14px' }} />
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                    <button
                      type="button"
                      onClick={startVoiceRecording}
                      className="btn btn-ghost btn-sm"
                      style={{ fontSize: '12px' }}
                    >
                      ↺ Re-record
                    </button>
                    <button
                      type="button"
                      onClick={handleApplyVoice}
                      disabled={isSavingVoice}
                      className="btn btn-primary btn-sm"
                      style={{ fontSize: '12px', padding: '6px 16px', background: '#10b981', borderColor: '#059669' }}
                    >
                      {isSavingVoice ? 'Saving...' : '✓ Use This Voice for Video'}
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <button
                    type="button"
                    onClick={startVoiceRecording}
                    className="btn btn-primary"
                    style={{
                      padding: '12px 28px',
                      background: '#ef4444',
                      borderColor: '#dc2626',
                      borderRadius: '10px',
                      fontSize: '14px',
                      fontWeight: 700,
                      boxShadow: '0 4px 18px rgba(239, 68, 68, 0.4)',
                    }}
                  >
                    🔴 Start Recording Voice
                  </button>
                  <p style={{ margin: '10px 0 0 0', fontSize: '11px', color: '#71717a' }}>
                    Click to start recording your microphone
                  </p>
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              {customAudioOverride ? (
                <button
                  type="button"
                  onClick={() => {
                    setCustomAudioOverride(null);
                    if (audioRef.current && baseAudioUrl) {
                      audioRef.current.src = baseAudioUrl;
                    }
                    toast.info('Restored default AI voiceover');
                  }}
                  className="btn btn-ghost btn-xs"
                  style={{ color: '#ef4444', fontSize: '11px' }}
                >
                  Reset to AI Voiceover
                </button>
              ) : <span />}

              <button
                type="button"
                onClick={() => {
                  if (isRecordingVoice) stopVoiceRecording();
                  setIsVoiceRecordModalOpen(false);
                }}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '12px' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
