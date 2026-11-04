'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useToast } from '@/components/Toast';
import { TILLERCAST_VOICE_CATALOG, VoicePreset } from '@/lib/video/voiceCatalog';

interface UserVoice {
  id: string;
  name: string;
  voice_id: string;
  sample_url?: string;
  created_at: string;
}

const STORYTELLING_FORMATS = [
  {
    id: 'viral-documentary',
    title: 'Viral Documentary',
    desc: 'Dramatic pacing, curiosity hooks & investigative tone',
    icon: '🕵️',
    badge: 'High Retention',
  },
  {
    id: 'true-crime-mystery',
    title: 'True Crime & Mystery',
    desc: 'Suspenseful atmosphere, tension build & unanswered questions',
    icon: '🔍',
    badge: 'Binge-Worthy',
  },
  {
    id: 'reddit-confession',
    title: 'Reddit / First-Person Story',
    desc: 'Emotional confessions, shocking plot twists & relatable voice',
    icon: '💬',
    badge: 'Viral Confessions',
  },
  {
    id: 'founder-business',
    title: 'Founder / Business Breakdown',
    desc: 'Fast-paced teardowns, valuation numbers & contrarian lessons',
    icon: '📈',
    badge: 'High RPM',
  },
  {
    id: 'stoic-history',
    title: 'Stoic & History',
    desc: 'Ancient philosophy, legendary leaders & timeless life wisdom',
    icon: '🏛️',
    badge: 'Evergreen',
  },
];

const VISUAL_STYLE_PRESETS_UI = [
  {
    id: 'dark-cinematic-8k',
    title: 'Dark Cinematic 8K',
    desc: 'Dramatic chiaroscuro lighting & deep atmospheric shadows',
    icon: '🎬',
    tag: 'Documentary',
  },
  {
    id: 'hyper-realistic-film',
    title: 'Hyper-Realistic Film',
    desc: 'Authentic 35mm film stock, natural lighting & documentary clarity',
    icon: '🎞️',
    tag: '35mm Kodak',
  },
  {
    id: 'stock-footage',
    title: 'Curated 1080p Stock & B-Roll',
    desc: 'High-definition real-world footage, drone aerials & lifestyle b-roll',
    icon: '📹',
    tag: 'Real World B-Roll',
  },
  {
    id: '3d-pixar-animation',
    title: '3D Pixar Animation',
    desc: 'Stylized characters, rich subsurface scattering & vibrant lighting',
    icon: '✨',
    tag: 'Stylized 3D',
  },
  {
    id: 'graphic-novel-comic',
    title: 'Graphic Novel / Comic',
    desc: 'Bold ink linework, dynamic cel shading & comic book pulp art',
    icon: '💥',
    tag: 'Graphic Cel',
  },
  {
    id: 'dark-anime',
    title: 'Dark Anime',
    desc: 'Neo-Tokyo aesthetics, dramatic edge glow & Japanese animation',
    icon: '⚡',
    tag: 'Anime 8K',
  },
];

const MOTION_ENGINE_TIERS = [
  {
    id: 'motion_still',
    title: 'Tillercast Flash Motion',
    multiplier: '1x Credit / Scene',
    desc: '60fps Dynamic Ken Burns Camera Motion powered by FLUX.1',
    badge: 'Free Demo & All Plans',
    badgeColor: '#10b981',
    proRequired: false,
  },
  {
    id: 'stock_footage',
    title: 'Curated 1080p Stock & B-Roll',
    multiplier: '1x Credit / Scene',
    desc: 'High-definition real-world footage, drone aerials & lifestyle b-roll via Pexels & Pixabay',
    badge: 'Free Demo & All Plans',
    badgeColor: '#0ea5e9',
    proRequired: false,
  },
  {
    id: 'ai_clip',
    title: 'Cinema AI Video',
    multiplier: '3x Credits / Scene',
    desc: 'True AI Motion Video via Luma / Fal / Runway',
    badge: 'Creator & Pro',
    badgeColor: '#8b5cf6',
    proRequired: true,
  },
  {
    id: 'ai_clip_ultra',
    title: 'Hollywood Director',
    multiplier: '5x Credits / Scene',
    desc: 'Ultra-Cinema AI Video via Veo / Kling Pro',
    badge: 'PRO EXCLUSIVE',
    badgeColor: '#ec4899',
    proRequired: true,
  },
];

type ModalState = 'idle' | 'recording' | 'recorded' | 'uploading' | 'cloning' | 'success' | 'error';

const VIRAL_IDEAS_BANK = [
  'Top 5 mysterious places in the world science still cannot explain',
  'Dark psychological facts about human decision making',
  'What happens to your cognitive performance when you drink black coffee',
  '3 ancient lost civilizations uncovered with satellite radar',
  'High-performance habits that separate senior founders from novices',
  'Mind-blowing artificial intelligence breakthroughs scheduled for late 2026',
  '5 optical illusions that reveal how the human visual cortex processes light',
  'Why the global tech sector is restructuring around agentic automation',
];

export function CreateVideoWizardContent({ hideBackLink = false }: { hideBackLink?: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const searchParams = useSearchParams();
  const templateTopic = searchParams.get('topic');

  const [topic, setTopic] = useState(templateTopic || '');
  const [selectedVoice, setSelectedVoice] = useState('cf-aura-orion');
  const [customVoiceId, setCustomVoiceId] = useState('');
  const [channels, setChannels] = useState<any[]>([]);
  const [monthlyUsage, setMonthlyUsage] = useState({ used: 0, limit: 1, remaining: 1 });
  const [userPlan, setUserPlan] = useState<string>('free');
  const [creating, setCreating] = useState(false);

  const handleSurpriseMe = () => {
    const randomTopic = VIRAL_IDEAS_BANK[Math.floor(Math.random() * VIRAL_IDEAS_BANK.length)];
    setTopic(randomTopic);
    toast.info('Loaded viral concept: ' + randomTopic.substring(0, 35) + '... ✨');
  };

  const handleResetConfig = () => {
    setTopic('');
    setStorytellingFormat('viral-documentary');
    setVisualStyle('dark-cinematic-8k');
    setVisualMotionTier('motion_still');
    setAspectRatio('9:16');
    setVideoLength(1);
    toast.info('Configuration reset to defaults.');
  };

  // 3 Outcome-Driven Creator Selectors
  const [storytellingFormat, setStorytellingFormat] = useState('viral-documentary');
  const [visualStyle, setVisualStyle] = useState('dark-cinematic-8k');
  const [visualMotionTier, setVisualMotionTier] = useState<'motion_still' | 'stock_footage' | 'ai_clip' | 'ai_clip_ultra'>('motion_still');

  // Video Format & Platforms
  const [aspectRatio, setAspectRatio] = useState<'9:16' | '16:9'>('9:16');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['YouTube', 'TikTok', 'Instagram', 'Facebook']);
  const [videoLength, setVideoLength] = useState<number>(1); // Default 1m for Shorts (Length Band 1 <=60s)

  // User Cloned Voices State
  const [myVoices, setMyVoices] = useState<UserVoice[]>([]);
  const [loadingVoices, setLoadingVoices] = useState(true);
  const [voicesError, setVoicesError] = useState<string | null>(null);

  // Voice Cloning Modal State
  const [showCloneModal, setShowCloneModal] = useState(false);
  const [modalState, setModalState] = useState<ModalState>('idle');
  const [cloneTab, setCloneTab] = useState<'mic' | 'upload'>('mic');
  const [newVoiceName, setNewVoiceName] = useState('');
  const [modalError, setModalError] = useState<string | null>(null);
  const [justClonedVoice, setJustClonedVoice] = useState<UserVoice | null>(null);

  // Pro Voice Upgrade Modal State
  const [showProVoiceModal, setShowProVoiceModal] = useState(false);
  const [showProVoiceCloneModal, setShowProVoiceCloneModal] = useState(false);
  const [pendingProVoice, setPendingProVoice] = useState<VoicePreset | null>(null);

  // Recording & Upload State
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedAudioUrl, setUploadedAudioUrl] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Audio Playback Preview State
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // MediaStream and Recorder Refs
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const modalCardRef = useRef<HTMLDivElement | null>(null);

  const isFree = userPlan === 'free';
  const freeVoices = TILLERCAST_VOICE_CATALOG.filter((v) => v.tier === 'free');
  const proVoices = TILLERCAST_VOICE_CATALOG.filter((v) => v.tier === 'paid');

  useEffect(() => {
    fetchUserData();
    fetchUserVoices();
  }, []);

  // Handle modal keyboard accessibility & body scroll lock
  useEffect(() => {
    if (showCloneModal || showProVoiceModal) {
      document.body.style.overflow = 'hidden';
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          if (showCloneModal && modalState !== 'cloning') closeModalSafely();
          if (showProVoiceModal) setShowProVoiceModal(false);
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = '';
        window.removeEventListener('keydown', handleKeyDown);
      };
    } else {
      document.body.style.overflow = '';
    }
  }, [showCloneModal, showProVoiceModal, modalState]);

  // Clean up media streams and object URLs on unmount
  useEffect(() => {
    return () => {
      stopMediaTracks();
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (recordedAudioUrl) URL.revokeObjectURL(recordedAudioUrl);
      if (uploadedAudioUrl) URL.revokeObjectURL(uploadedAudioUrl);
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        audioPlayerRef.current = null;
      }
    };
  }, [recordedAudioUrl, uploadedAudioUrl]);

  const stopMediaTracks = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
  };

  const fetchUserData = async () => {
    try {
      const [chanRes, projRes, authRes] = await Promise.all([
        fetch('/api/channels'),
        fetch('/api/projects'),
        fetch('/api/auth/me'),
      ]);

      if (chanRes.ok) {
        const cData = await chanRes.json();
        setChannels(cData.channels || []);
      }
      if (projRes.ok) {
        const pData = await projRes.json();
        if (pData.monthlyUsage) {
          setMonthlyUsage(pData.monthlyUsage);
        }
      }
      if (authRes.ok) {
        const aData = await authRes.json();
        const plan = (aData.credits?.tier || aData.user?.plan || '').toLowerCase();
        if (plan) {
          setUserPlan(plan);
          if (plan !== 'free' && plan !== 'demo') {
            setSelectedVoice('el-adam-viral');
          }
        }
      }
    } catch {}
  };

  const fetchUserVoices = async () => {
    try {
      setLoadingVoices(true);
      setVoicesError(null);
      const res = await fetch('/api/voice/my-voices');
      const data = await res.json();
      if (res.ok && data.success) {
        setMyVoices(data.voices || []);
      } else {
        setVoicesError(data.error || 'Failed to load custom voices.');
      }
    } catch (err: any) {
      console.warn('Could not load user voices:', err);
      setVoicesError('Network error loading voices.');
    } finally {
      setLoadingVoices(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // LIVE AUDIO RECORDING HANDLERS
  // ─────────────────────────────────────────────────────────────

  const startRecording = async () => {
    try {
      setModalError(null);
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setModalError('Audio recording is not supported in this browser. Please upload an audio file instead.');
        return;
      }

      stopMediaTracks();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      audioChunksRef.current = [];

      let mimeType = 'audio/webm';
      if (typeof MediaRecorder.isTypeSupported === 'function') {
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          mimeType = 'audio/webm;codecs=opus';
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
        }
      }

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        setRecordedBlob(audioBlob);
        if (recordedAudioUrl) URL.revokeObjectURL(recordedAudioUrl);
        const url = URL.createObjectURL(audioBlob);
        setRecordedAudioUrl(url);
        setModalState('recorded');
        stopMediaTracks();
      };

      recorder.start(250);
      setModalState('recording');
      setRecordingSeconds(0);

      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => {
          if (prev >= 60) {
            stopRecording();
            return 60;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err: any) {
      console.error('Microphone access error:', err);
      stopMediaTracks();
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setModalError('Microphone permission was denied. Please allow microphone access in your browser address bar.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setModalError('No microphone was detected on your device. Please plug in a microphone or upload an audio file.');
      } else {
        setModalError('Could not access microphone. Please check your browser audio settings or upload a file.');
      }
      setModalState('idle');
    }
  };

  const stopRecording = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    if (recordingSeconds < 5) {
      toast.warning('Please speak for at least 5 seconds so AI can analyze your voice.');
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  const resetRecording = () => {
    stopMediaTracks();
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (recordedAudioUrl) URL.revokeObjectURL(recordedAudioUrl);
    setRecordedBlob(null);
    setRecordedAudioUrl(null);
    setRecordingSeconds(0);
    setModalState('idle');
    setModalError(null);
  };

  // ─────────────────────────────────────────────────────────────
  // FILE UPLOAD HANDLERS
  // ─────────────────────────────────────────────────────────────

  const processSelectedFile = (file: File) => {
    setModalError(null);

    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    const validExts = ['.mp3', '.wav', '.m4a', '.webm', '.ogg', '.aac', '.flac'];
    if (!validExts.includes(ext)) {
      setModalError("This audio format isn't supported. Please choose an MP3, WAV, M4A, WebM, or OGG file.");
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      setModalError('The audio file is too large. Maximum supported size is 25 MB.');
      return;
    }

    if (file.size < 8000) {
      setModalError('The audio file is too short. Please provide at least 5 seconds of clear speech.');
      return;
    }

    setUploadedFile(file);
    if (uploadedAudioUrl) URL.revokeObjectURL(uploadedAudioUrl);
    setUploadedAudioUrl(URL.createObjectURL(file));
    setModalState('uploading');

    if (!newVoiceName.trim()) {
      const suggested = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      const clean = suggested.replace(/[<>"'&]/g, '').trim();
      if (clean) {
        setNewVoiceName(clean.charAt(0).toUpperCase() + clean.slice(1));
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processSelectedFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processSelectedFile(file);
  };

  // ─────────────────────────────────────────────────────────────
  // CLONE SUBMISSION
  // ─────────────────────────────────────────────────────────────

  const handleCloneVoice = async () => {
    if (modalState === 'cloning') return;

    setModalError(null);
    const sanitizedName = newVoiceName.replace(/[<>"'&]/g, '').trim().substring(0, 50) || 'My Cloned Voice';
    let audioToSend: Blob | File | null = null;
    let fileName = 'recording.webm';

    if (cloneTab === 'mic') {
      if (!recordedBlob) {
        setModalError('Please record an audio sample first.');
        return;
      }
      if (recordingSeconds < 5) {
        setModalError('Please record at least 5 seconds of speech.');
        return;
      }
      audioToSend = recordedBlob;
    } else {
      if (!uploadedFile) {
        setModalError('Please select an audio file to upload.');
        return;
      }
      audioToSend = uploadedFile;
      fileName = uploadedFile.name;
    }

    try {
      setModalState('cloning');

      const formData = new FormData();
      formData.append('name', sanitizedName);
      formData.append('file', audioToSend, fileName);

      const res = await fetch('/api/voice/clone', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to clone voice');
      }

      const newVoice: UserVoice = data.voice;
      setJustClonedVoice(newVoice);
      setMyVoices((prev) => [newVoice, ...prev.filter((v) => v.id !== newVoice.id)]);
      setSelectedVoice(newVoice.voice_id);
      setModalState('success');
      toast.success(`🎉 Voice "${sanitizedName}" ready!`);

      setTimeout(() => {
        closeModalSafely();
      }, 2000);
    } catch (err: any) {
      setModalState('error');
      setModalError(err.message || 'Voice cloning failed. Please try again.');
    }
  };

  const closeModalSafely = () => {
    if (modalState === 'cloning') return;
    stopMediaTracks();
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    resetRecording();
    setUploadedFile(null);
    if (uploadedAudioUrl) URL.revokeObjectURL(uploadedAudioUrl);
    setUploadedAudioUrl(null);
    setNewVoiceName('');
    setModalError(null);
    setJustClonedVoice(null);
    setModalState('idle');
    setShowCloneModal(false);
  };

  // ─────────────────────────────────────────────────────────────
  // VOICE MANAGEMENT (PLAYBACK & DELETION)
  // ─────────────────────────────────────────────────────────────

  const handleDeleteVoice = async (e: React.MouseEvent, voiceDbId: string, voiceId: string, voiceName: string) => {
    e.stopPropagation();
    const confirmed = window.confirm(`Delete "${voiceName}"? This will permanently remove it from your account.`);
    if (!confirmed) return;

    const previousVoices = [...myVoices];
    setMyVoices((prev) => prev.filter((v) => v.id !== voiceDbId));

    if (selectedVoice === voiceId) {
      setSelectedVoice('cf-aura-orion');
    }

    try {
      const res = await fetch(`/api/voice/my-voices?id=${encodeURIComponent(voiceDbId)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setMyVoices(previousVoices);
        toast.error(data.error || 'Failed to delete voice');
      } else {
        toast.info(`Voice "${voiceName}" removed.`);
      }
    } catch {
      setMyVoices(previousVoices);
      toast.error('Network error removing voice');
    }
  };

  const handlePlaySample = (e: React.MouseEvent, sampleUrl?: string, voiceKey?: string) => {
    e.stopPropagation();
    if (!sampleUrl) return;

    if (playingVoiceId === voiceKey && audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      setPlayingVoiceId(null);
      return;
    }

    if (!audioPlayerRef.current) {
      audioPlayerRef.current = new Audio();
      audioPlayerRef.current.onended = () => setPlayingVoiceId(null);
      audioPlayerRef.current.onerror = () => {
        toast.error('Could not play sample audio.');
        setPlayingVoiceId(null);
      };
    }

    audioPlayerRef.current.src = sampleUrl;
    audioPlayerRef.current.play().catch(() => setPlayingVoiceId(null));
    setPlayingVoiceId(voiceKey || 'sample');
  };

  // ─────────────────────────────────────────────────────────────
  // CREATE VIDEO SUBMISSION
  // ─────────────────────────────────────────────────────────────

  const handleCreateVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) {
      toast.warning('Please enter what you want your video to be about');
      return;
    }
    if (monthlyUsage.remaining <= 0) {
      toast.error(`Monthly plan limit reached (${monthlyUsage.used}/${monthlyUsage.limit} videos).`);
      return;
    }
    if (selectedVoice === 'custom_manual' && !customVoiceId.trim()) {
      toast.warning('Please enter your ElevenLabs Voice ID');
      return;
    }

    // Pro Voice Gate: If free tier user tries to generate with an ElevenLabs Pro voice, show conversion modal
    const isProVoiceSelected = proVoices.some((pv) => pv.id === selectedVoice);
    if (isFree && isProVoiceSelected) {
      const selectedPreset = proVoices.find((pv) => pv.id === selectedVoice) || proVoices[0];
      setPendingProVoice(selectedPreset);
      setShowProVoiceModal(true);
      return;
    }

    if (creating) return;

    try {
      setCreating(true);
      toast.info('Starting AI video creation pipeline... ⚡');

      let targetChannelId = channels[0]?.id;
      if (!targetChannelId) {
        const cRes = await fetch('/api/channels', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'Studio Channel', niche: 'General', target_duration_minutes: videoLength }),
        });
        if (cRes.ok) {
          const cData = await cRes.json();
          targetChannelId = cData.channel?.id;
        }
      }

      const activeVoice = selectedVoice === 'custom_manual' ? customVoiceId.trim() : selectedVoice;

      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel_id: targetChannelId || 'default_channel',
          topic: topic.trim(),
          storytelling_format: storytellingFormat,
          storytellingFormat,
          visual_style: visualStyle,
          visualStyle,
          motion_tier: visualMotionTier,
          visual_tier: visualMotionTier,
          target_length_minutes: videoLength,
          aspect_ratio: aspectRatio,
          platforms: selectedPlatforms,
          platform: selectedPlatforms.join(', '),
          voice: activeVoice,
          auto_render: true,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        if (err.upgradeRequired) {
          toast.warning(err.message || 'Upgrade required for this feature.');
          setShowProVoiceCloneModal(true);
          return;
        }
        throw new Error(err.error || err.message || 'Failed to start video generation');
      }

      const data = await res.json();
      toast.success('Your video is being created!');
      router.push(`/content/${data.projectId}?topic=${encodeURIComponent(topic.trim())}&duration=${videoLength}`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div style={{ maxWidth: '780px', margin: '0 auto', padding: '20px 16px 60px' }}>
      {/* Top Breadcrumb & Quota Status */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '8px' }}>
        {!hideBackLink ? (
          <Link
            href="/"
            style={{ color: '#a1a1aa', textDecoration: 'none', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', minHeight: '36px' }}
          >
            ← Back to Dashboard
          </Link>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px' }}>⚡</span>
            <span style={{ fontSize: '14px', fontWeight: 700, color: '#ffffff' }}>Autonomous AI Video Studio</span>
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{
            fontSize: '11px',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            padding: '2px 8px',
            borderRadius: '4px',
            fontWeight: 700,
            background: isFree ? 'rgba(255,255,255,0.06)' : 'rgba(99, 102, 241, 0.2)',
            color: isFree ? '#a1a1aa' : '#818cf8',
            border: isFree ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(99, 102, 241, 0.4)'
          }}>
            {userPlan.toUpperCase()} PLAN
          </span>
          <div style={{ fontSize: '12px', color: monthlyUsage.remaining > 0 ? '#10b981' : '#f43f5e', fontWeight: 600 }}>
            {isFree ? `Free Demo: ${monthlyUsage.used} / ${monthlyUsage.limit} video used (${monthlyUsage.remaining} remaining)` : `${monthlyUsage.used} / ${monthlyUsage.limit} videos this month (${monthlyUsage.remaining} remaining)`}
          </div>
        </div>
      </div>

      <div style={{
        background: '#121215',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '16px',
        padding: '32px 24px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.4)'
      }}>
        <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em', margin: '0 0 8px 0' }}>
          Create Viral Video
        </h1>
        <p style={{ color: '#a1a1aa', fontSize: '14px', margin: '0 0 28px 0' }}>
          AI crafts high-retention scripts, selects pacing beats, synthesizes natural voiceover, and renders cinematic motion.
        </p>

        <form onSubmit={handleCreateVideo} style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          {/* Prompt-to-Video Engine Panel (InVideo AI / Runway class workflow) */}
          <div className="autora-panel" style={{
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '12px',
            padding: '20px',
            position: 'relative',
            overflow: 'hidden',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div>
                <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#ffffff', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>⚡ Prompt-to-Video Engine</span>
                  <span style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    background: 'rgba(168, 85, 247, 0.15)',
                    border: '1px solid rgba(168, 85, 247, 0.3)',
                    color: '#c084fc',
                    padding: '2px 8px',
                    borderRadius: '9999px'
                  }}>
                    Agentic Studio (WP8 / WP5)
                  </span>
                </h2>
                <p style={{ fontSize: '12px', color: '#71717a', margin: '4px 0 0' }}>
                  One prompt → Multi-scene storyboard cut → Interactive Timeline Editor
                </p>
              </div>
              <button
                type="button"
                onClick={handleResetConfig}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#71717a',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: '4px 8px'
                }}
              >
                Reset Config
              </button>
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <label htmlFor="creator-topic-input" style={{ fontSize: '12px', fontWeight: 700, color: '#e4e4e7' }}>
                  AI Video Prompt (Describe topic, visuals, pacing & tone)
                </label>
                <button
                  type="button"
                  onClick={handleSurpriseMe}
                  style={{
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '6px',
                    color: '#c084fc',
                    cursor: 'pointer',
                    fontSize: '11px',
                    fontWeight: 600,
                    padding: '3px 8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                  aria-label="Randomize viral concept prompt"
                >
                  <span>🎲 Surprise Me</span>
                </button>
              </div>
              <div style={{ position: 'relative' }}>
                <textarea
                  id="creator-topic-input"
                  rows={4}
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="Describe your video in detail... (e.g. A 45-second high-retention documentary exploring how quantum computers will break RSA encryption. Fast pacing, dark cyberpunk aesthetic, high-contrast visuals, dramatic narrator voice, and clear subtitle captions)..."
                  className="autora-input"
                  style={{
                    width: '100%',
                    background: '#111216',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '10px',
                    padding: '14px',
                    color: '#ffffff',
                    fontSize: '13px',
                    lineHeight: '1.5',
                    resize: 'vertical',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                  aria-label="AI Video Prompt"
                />
              </div>

              {/* Prompt Enhancer Quick-Chips */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '10px' }}>
                <span style={{ fontSize: '11px', color: '#71717a', alignSelf: 'center', marginRight: '4px' }}>
                  Add Enhancers:
                </span>
                {[
                  { label: '⚡ High-Impact Hook', append: ', starts with a shocking 3-second hook question' },
                  { label: '💎 4K Generative AI', append: ', photorealistic cinematic visuals with slow dramatic camera motion' },
                  { label: '📊 Data & Stats', append: ', backed by verified data, research numbers and crisp motion graphics' },
                  { label: '🎙️ Deep Docu-Tone', append: ', serious investigative documentary narration style' },
                  { label: '📱 Viral Retention', append: ', ultra high-tempo scene transitions every 3 to 4 seconds' },
                ].map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setTopic((prev) => (prev ? prev.trim() + chip.append : chip.label.replace(/^.*? /, '')));
                      toast.info(`Added enhancer: ${chip.label}`);
                    }}
                    style={{
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '6px',
                      color: '#a1a1aa',
                      fontSize: '11px',
                      fontWeight: 600,
                      padding: '4px 8px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(168, 85, 247, 0.4)';
                      e.currentTarget.style.color = '#ffffff';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                      e.currentTarget.style.color = '#a1a1aa';
                    }}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ─────────────────────────────────────────────────────────────
              OUTCOME-BASED CREATOR CONTROL 1: STORYTELLING FORMAT
          ───────────────────────────────────────────────────────────── */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <label style={{ fontSize: '14px', fontWeight: 700, color: '#f4f4f5', margin: 0 }}>
                1. Storytelling Format & Narrative Engine
              </label>
              <span style={{ fontSize: '11px', color: '#818cf8', fontWeight: 600 }}>Curiosity & Retention Rules Applied</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
              {STORYTELLING_FORMATS.map((f) => {
                const isSelected = storytellingFormat === f.id;
                return (
                  <div
                    key={f.id}
                    role="radio"
                    aria-checked={isSelected}
                    tabIndex={0}
                    onClick={() => setStorytellingFormat(f.id)}
                    onKeyDown={(e) => {
                      if (e.key === ' ' || e.key === 'Enter') {
                        e.preventDefault();
                        setStorytellingFormat(f.id);
                      }
                    }}
                    style={{
                      background: isSelected ? 'rgba(99, 102, 241, 0.14)' : 'rgba(255, 255, 255, 0.02)',
                      border: isSelected ? '2px solid #818cf8' : '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '10px',
                      padding: '12px 14px',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      transition: 'all 0.15s ease',
                      outline: 'none',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '18px' }}>{f.icon}</span>
                      <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '4px', background: 'rgba(255,255,255,0.06)', color: '#c7d2fe' }}>
                        {f.badge}
                      </span>
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff', marginTop: '2px' }}>
                      {f.title}
                    </div>
                    <div style={{ fontSize: '11px', color: '#a1a1aa', lineHeight: 1.35 }}>
                      {f.desc}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ─────────────────────────────────────────────────────────────
              OUTCOME-BASED CREATOR CONTROL 2: VISUAL STYLE PRESET
          ───────────────────────────────────────────────────────────── */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <label style={{ fontSize: '14px', fontWeight: 700, color: '#f4f4f5', margin: 0 }}>
                2. Visual Art Style & Lighting Preset
              </label>
              <span style={{ fontSize: '11px', color: '#a1a1aa' }}>Cohesive DNA across all scenes</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
              {VISUAL_STYLE_PRESETS_UI.map((s) => {
                const isSelected = visualStyle === s.id;
                return (
                  <div
                    key={s.id}
                    role="radio"
                    aria-checked={isSelected}
                    tabIndex={0}
                    onClick={() => {
                      setVisualStyle(s.id);
                      if (s.id === 'stock-footage') {
                        setVisualMotionTier('stock_footage');
                      } else {
                        setVisualMotionTier(isFree ? 'motion_still' : 'ai_clip');
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === ' ' || e.key === 'Enter') {
                        e.preventDefault();
                        setVisualStyle(s.id);
                        if (s.id === 'stock-footage') {
                          setVisualMotionTier('stock_footage');
                        } else {
                          setVisualMotionTier(isFree ? 'motion_still' : 'ai_clip');
                        }
                      }
                    }}
                    style={{
                      background: isSelected ? 'rgba(99, 102, 241, 0.14)' : 'rgba(255, 255, 255, 0.02)',
                      border: isSelected ? '2px solid #818cf8' : '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '10px',
                      padding: '12px 14px',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      transition: 'all 0.15s ease',
                      outline: 'none',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '18px' }}>{s.icon}</span>
                      <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '4px', background: 'rgba(255,255,255,0.06)', color: '#d4d4d8' }}>
                        {s.tag}
                      </span>
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff', marginTop: '2px' }}>
                      {s.title}
                    </div>
                    <div style={{ fontSize: '11px', color: '#a1a1aa', lineHeight: 1.35 }}>
                      {s.desc}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ─────────────────────────────────────────────────────────────
              STEP 3: CHOOSE VOICEOVER (STRICT 2-TIER CATALOG)
          ───────────────────────────────────────────────────────────── */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <label style={{ fontSize: '14px', fontWeight: 700, color: '#f4f4f5', margin: 0 }}>
                  3. Choose Voiceover Narration
                </label>
                <div style={{ fontSize: '11px', color: '#71717a', marginTop: '2px' }}>
                  Aura-2 Standard (Free Demo) vs 100% ElevenLabs Studio Voices (Pro)
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (userPlan !== 'pro' && userPlan !== 'scale') {
                    setShowProVoiceCloneModal(true);
                    return;
                  }
                  setModalState('idle');
                  setModalError(null);
                  setShowCloneModal(true);
                }}
                aria-label="Open Voice Cloning Studio to record or upload voice"
                style={{
                  background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '8px 14px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 8px rgba(99, 102, 241, 0.3)',
                  minHeight: '38px',
                }}
              >
                <span>🎙️</span>
                <span>Clone Your Voice</span>
              </button>
            </div>

            {/* MY CLONED VOICES SECTION */}
            {myVoices.length > 0 && (
              <div style={{ marginBottom: '18px' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                  My Cloned Voices
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '10px' }}>
                  {myVoices.map((v) => {
                    const isSelected = selectedVoice === v.voice_id;
                    const isPlaying = playingVoiceId === v.id;
                    return (
                      <div
                        key={v.id}
                        role="radio"
                        aria-checked={isSelected}
                        tabIndex={0}
                        onClick={() => setSelectedVoice(v.voice_id)}
                        onKeyDown={(e) => {
                          if (e.key === ' ' || e.key === 'Enter') {
                            e.preventDefault();
                            setSelectedVoice(v.voice_id);
                          }
                        }}
                        style={{
                          background: isSelected ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                          border: isSelected ? '1px solid #818cf8' : '1px solid rgba(255, 255, 255, 0.08)',
                          borderRadius: '8px',
                          padding: '12px 14px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '10px',
                          outline: 'none',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                          <div style={{
                            width: '16px',
                            height: '16px',
                            borderRadius: '50%',
                            border: isSelected ? '5px solid #818cf8' : '1px solid rgba(255,255,255,0.3)',
                            background: isSelected ? '#09090b' : 'transparent',
                            flexShrink: 0
                          }} />
                          <div style={{ overflow: 'hidden' }}>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>🎙️ {v.name}</span>
                              <span style={{ fontSize: '10px', background: '#6366f1', color: '#fff', padding: '1px 5px', borderRadius: '4px', flexShrink: 0 }}>
                                My Voice
                              </span>
                            </div>
                            <div style={{ fontSize: '11px', color: '#a1a1aa' }}>
                              Personal Cloned Voice
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                          {v.sample_url && (
                            <button
                              type="button"
                              onClick={(e) => handlePlaySample(e, v.sample_url, v.id)}
                              aria-label={isPlaying ? `Pause sample for ${v.name}` : `Play sample for ${v.name}`}
                              style={{
                                background: isPlaying ? '#4f46e5' : 'rgba(255,255,255,0.08)',
                                border: 'none',
                                color: '#fff',
                                borderRadius: '4px',
                                padding: '6px 10px',
                                fontSize: '12px',
                                cursor: 'pointer',
                                minWidth: '32px',
                                minHeight: '32px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                            >
                              {isPlaying ? '⏸' : '▶'}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={(e) => handleDeleteVoice(e, v.id, v.voice_id, v.name)}
                            aria-label={`Delete cloned voice ${v.name}`}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#71717a',
                              cursor: 'pointer',
                              fontSize: '14px',
                              padding: '6px 8px',
                              minWidth: '32px',
                              minHeight: '32px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* DYNAMIC VOICE DISPLAY: PAID USERS SEE STUDIO VOICES FIRST; FREE DEMO USERS SEE STANDARD FIRST */}
            {!isFree ? (
              <>
                {/* PRO STUDIO VOICES (100% ElevenLabs Turbo v2.5) — Primary for Creator / Pro */}
                <div style={{ marginBottom: '18px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#c084fc', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      ⭐ Studio Narrator Voices (100% ElevenLabs)
                    </span>
                    <span style={{ fontSize: '10px', color: '#c084fc', fontWeight: 700, background: 'rgba(192, 132, 252, 0.15)', border: '1px solid rgba(192, 132, 252, 0.3)', padding: '2px 8px', borderRadius: '4px' }}>
                      INCLUDED IN YOUR PLAN
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '10px' }}>
                    {proVoices.map((v) => {
                      const isSelected = selectedVoice === v.id;
                      const isPlaying = playingVoiceId === v.id;
                      return (
                        <div
                          key={v.id}
                          role="radio"
                          aria-checked={isSelected}
                          tabIndex={0}
                          onClick={() => setSelectedVoice(v.id)}
                          onKeyDown={(e) => {
                            if (e.key === ' ' || e.key === 'Enter') {
                              e.preventDefault();
                              setSelectedVoice(v.id);
                            }
                          }}
                          style={{
                            background: isSelected ? 'rgba(168, 85, 247, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                            border: isSelected ? '1px solid #c084fc' : '1px solid rgba(255, 255, 255, 0.08)',
                            borderRadius: '8px',
                            padding: '12px 14px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '10px',
                            outline: 'none',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                            <div style={{
                              width: '16px',
                              height: '16px',
                              borderRadius: '50%',
                              border: isSelected ? '5px solid #c084fc' : '1px solid rgba(255,255,255,0.3)',
                              background: isSelected ? '#09090b' : 'transparent',
                              flexShrink: 0
                            }} />
                            <div>
                              <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span>{v.name}</span>
                                <span style={{ fontSize: '9px', fontWeight: 800, padding: '1px 5px', borderRadius: '3px', background: 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)', color: '#fff' }}>
                                  STUDIO
                                </span>
                              </div>
                              <div style={{ fontSize: '11px', color: '#a1a1aa' }}>{v.description}</div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => handlePlaySample(e, v.previewAudioUrl, v.id)}
                            aria-label={isPlaying ? `Pause sample for ${v.name}` : `Play sample for ${v.name}`}
                            style={{
                              background: isPlaying ? '#a855f7' : 'rgba(255,255,255,0.08)',
                              border: 'none',
                              color: '#fff',
                              borderRadius: '4px',
                              padding: '6px 10px',
                              fontSize: '11px',
                              cursor: 'pointer',
                              minWidth: '32px',
                              minHeight: '32px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0
                            }}
                          >
                            {isPlaying ? '⏸' : '▶'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Collapsible Standard Voices for Pro Users (Optional) */}
                <details style={{ marginBottom: '14px', fontSize: '12px', color: '#71717a' }}>
                  <summary style={{ cursor: 'pointer', userSelect: 'none', padding: '6px 0', color: '#a1a1aa' }}>
                    ▶ Show Standard Voices (Cloudflare Aura-2) — Optional
                  </summary>
                  <div style={{ marginTop: '10px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '10px' }}>
                    {freeVoices.map((v) => {
                      const isSelected = selectedVoice === v.id;
                      const isPlaying = playingVoiceId === v.id;
                      return (
                        <div
                          key={v.id}
                          role="radio"
                          aria-checked={isSelected}
                          tabIndex={0}
                          onClick={() => setSelectedVoice(v.id)}
                          onKeyDown={(e) => {
                            if (e.key === ' ' || e.key === 'Enter') {
                              e.preventDefault();
                              setSelectedVoice(v.id);
                            }
                          }}
                          style={{
                            background: isSelected ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                            border: isSelected ? '1px solid #10b981' : '1px solid rgba(255, 255, 255, 0.08)',
                            borderRadius: '8px',
                            padding: '12px 14px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '10px',
                            outline: 'none',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                            <div style={{
                              width: '16px',
                              height: '16px',
                              borderRadius: '50%',
                              border: isSelected ? '5px solid #10b981' : '1px solid rgba(255,255,255,0.3)',
                              background: isSelected ? '#09090b' : 'transparent',
                              flexShrink: 0
                            }} />
                            <div>
                              <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>{v.name}</div>
                              <div style={{ fontSize: '11px', color: '#a1a1aa' }}>{v.description}</div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => handlePlaySample(e, v.previewAudioUrl, v.id)}
                            aria-label={isPlaying ? `Pause sample for ${v.name}` : `Play sample for ${v.name}`}
                            style={{
                              background: isPlaying ? '#10b981' : 'rgba(255,255,255,0.08)',
                              border: 'none',
                              color: '#fff',
                              borderRadius: '4px',
                              padding: '6px 10px',
                              fontSize: '11px',
                              cursor: 'pointer',
                              minWidth: '32px',
                              minHeight: '32px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0
                            }}
                          >
                            {isPlaying ? '⏸' : '▶'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </details>
              </>
            ) : (
              <>
                {/* FREE DEMO VOICES (Deepgram Aura-2 on Cloudflare) — Primary for Free Demo */}
                <div style={{ marginBottom: '18px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      ✓ Standard Voices (Free Demo & All Plans)
                    </span>
                    <span style={{ fontSize: '11px', color: '#71717a' }}>Cloudflare Deepgram Aura-2</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '10px' }}>
                    {freeVoices.map((v) => {
                      const isSelected = selectedVoice === v.id;
                      const isPlaying = playingVoiceId === v.id;
                      return (
                        <div
                          key={v.id}
                          role="radio"
                          aria-checked={isSelected}
                          tabIndex={0}
                          onClick={() => setSelectedVoice(v.id)}
                          onKeyDown={(e) => {
                            if (e.key === ' ' || e.key === 'Enter') {
                              e.preventDefault();
                              setSelectedVoice(v.id);
                            }
                          }}
                          style={{
                            background: isSelected ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                            border: isSelected ? '1px solid #10b981' : '1px solid rgba(255, 255, 255, 0.08)',
                            borderRadius: '8px',
                            padding: '12px 14px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '10px',
                            outline: 'none',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                            <div style={{
                              width: '16px',
                              height: '16px',
                              borderRadius: '50%',
                              border: isSelected ? '5px solid #10b981' : '1px solid rgba(255,255,255,0.3)',
                              background: isSelected ? '#09090b' : 'transparent',
                              flexShrink: 0
                            }} />
                            <div>
                              <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>{v.name}</div>
                              <div style={{ fontSize: '11px', color: '#a1a1aa' }}>{v.description}</div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => handlePlaySample(e, v.previewAudioUrl, v.id)}
                            aria-label={isPlaying ? `Pause sample for ${v.name}` : `Play sample for ${v.name}`}
                            style={{
                              background: isPlaying ? '#10b981' : 'rgba(255,255,255,0.08)',
                              border: 'none',
                              color: '#fff',
                              borderRadius: '4px',
                              padding: '6px 10px',
                              fontSize: '11px',
                              cursor: 'pointer',
                              minWidth: '32px',
                              minHeight: '32px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0
                            }}
                          >
                            {isPlaying ? '⏸' : '▶'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* PRO STUDIO VOICES (Upgrade Teaser for Free Users) */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#c084fc', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      ⭐ Studio Narrator Voices (100% ElevenLabs)
                    </span>
                    <span style={{ fontSize: '11px', color: '#c084fc', fontWeight: 600 }}>PRO TIER</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '10px' }}>
                    {proVoices.map((v) => {
                      const isSelected = selectedVoice === v.id;
                      const isPlaying = playingVoiceId === v.id;
                      return (
                        <div
                          key={v.id}
                          role="radio"
                          aria-checked={isSelected}
                          tabIndex={0}
                          onClick={() => {
                            if (isFree) {
                              setPendingProVoice(v);
                              setShowProVoiceModal(true);
                              return;
                            }
                            setSelectedVoice(v.id);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === ' ' || e.key === 'Enter') {
                              e.preventDefault();
                              if (isFree) {
                                setPendingProVoice(v);
                                setShowProVoiceModal(true);
                                return;
                              }
                              setSelectedVoice(v.id);
                            }
                          }}
                          style={{
                            background: isSelected ? 'rgba(168, 85, 247, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                            border: isSelected ? '1px solid #c084fc' : '1px solid rgba(255, 255, 255, 0.08)',
                            borderRadius: '8px',
                            padding: '12px 14px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '10px',
                            outline: 'none',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                            <div style={{
                              width: '16px',
                              height: '16px',
                              borderRadius: '50%',
                              border: isSelected ? '5px solid #c084fc' : '1px solid rgba(255,255,255,0.3)',
                              background: isSelected ? '#09090b' : 'transparent',
                              flexShrink: 0
                            }} />
                            <div>
                              <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span>{v.name}</span>
                                <span style={{ fontSize: '9px', fontWeight: 800, padding: '1px 5px', borderRadius: '3px', background: 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)', color: '#fff' }}>
                                  PRO
                                </span>
                              </div>
                              <div style={{ fontSize: '11px', color: '#a1a1aa' }}>{v.description}</div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => handlePlaySample(e, v.previewAudioUrl, v.id)}
                            aria-label={isPlaying ? `Pause sample for ${v.name}` : `Play sample for ${v.name}`}
                            style={{
                              background: isPlaying ? '#a855f7' : 'rgba(255,255,255,0.08)',
                              border: 'none',
                              color: '#fff',
                              borderRadius: '4px',
                              padding: '6px 10px',
                              fontSize: '11px',
                              cursor: 'pointer',
                              minWidth: '32px',
                              minHeight: '32px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0
                            }}
                          >
                            {isPlaying ? '⏸' : '▶'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            {/* Optional Collapsed Accordion for Raw Voice ID */}
            <details style={{ marginTop: '14px', fontSize: '12px', color: '#71717a' }}>
              <summary style={{ cursor: 'pointer', userSelect: 'none', padding: '4px 0' }}>
                Advanced: Paste an external ElevenLabs Voice ID manually
              </summary>
              <div style={{ marginTop: '8px', padding: '12px', background: '#09090b', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '6px' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    className="form-input"
                    aria-label="Manual ElevenLabs Voice ID"
                    style={{
                      flex: 1,
                      padding: '8px 10px',
                      fontSize: '12px',
                      background: '#121215',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '4px',
                      color: '#fff'
                    }}
                    placeholder="e.g. 21m00Tcm4TlvDq8ikWAM"
                    value={customVoiceId}
                    onChange={(e) => {
                      setCustomVoiceId(e.target.value);
                      if (e.target.value.trim()) {
                        setSelectedVoice('custom_manual');
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (customVoiceId.trim()) {
                        setSelectedVoice('custom_manual');
                        toast.success('Custom Voice ID selected');
                      }
                    }}
                    style={{
                      background: selectedVoice === 'custom_manual' ? '#10b981' : 'rgba(255,255,255,0.1)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      padding: '0 12px',
                      fontSize: '12px',
                      cursor: 'pointer',
                      minHeight: '34px',
                    }}
                  >
                    {selectedVoice === 'custom_manual' ? '✓ Using Custom ID' : 'Apply'}
                  </button>
                </div>
              </div>
            </details>
          </div>

          {/* STEP 4: VIDEO FORMAT & ASPECT RATIO */}
          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 700, color: '#f4f4f5', marginBottom: '8px' }}>
              4. Video Format & Aspect Ratio
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
              <div
                id="aspect-ratio-9-16"
                role="button"
                tabIndex={0}
                onClick={() => {
                  setAspectRatio('9:16');
                  if (videoLength > 1.5) setVideoLength(1);
                }}
                onKeyDown={(e) => {
                  if (e.key === ' ' || e.key === 'Enter') {
                    e.preventDefault();
                    setAspectRatio('9:16');
                    if (videoLength > 1.5) setVideoLength(1);
                  }
                }}
                style={{
                  background: aspectRatio === '9:16' ? 'rgba(99, 102, 241, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                  border: aspectRatio === '9:16' ? '2px solid #6366f1' : '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '10px',
                  padding: '16px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  transition: 'all 0.2s ease',
                }}
              >
                <div style={{ fontSize: '24px' }}>📱</div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <span>9:16 Vertical</span>
                    <span style={{ fontSize: '10px', background: '#10b981', color: '#fff', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                      TikTok / Reels / Shorts / FB Reels
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#a1a1aa', marginTop: '4px', lineHeight: 1.4 }}>
                    Full-screen mobile video. Supports 30s up to 5 min. Safe-zone subtitles placed at least 320px from bottom.
                  </div>
                </div>
              </div>

              <div
                id="aspect-ratio-16-9"
                role="button"
                tabIndex={0}
                onClick={() => {
                  setAspectRatio('16:9');
                  if (videoLength < 2) setVideoLength(3);
                }}
                onKeyDown={(e) => {
                  if (e.key === ' ' || e.key === 'Enter') {
                    e.preventDefault();
                    setAspectRatio('16:9');
                    if (videoLength < 2) setVideoLength(3);
                  }
                }}
                style={{
                  background: aspectRatio === '16:9' ? 'rgba(99, 102, 241, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                  border: aspectRatio === '16:9' ? '2px solid #6366f1' : '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '10px',
                  padding: '16px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  transition: 'all 0.2s ease',
                }}
              >
                <div style={{ fontSize: '24px' }}>🎬</div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <span>16:9 Landscape</span>
                    <span style={{ fontSize: '10px', background: '#3b82f6', color: '#fff', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                      YouTube & FB Watch / Feed
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#a1a1aa', marginTop: '4px', lineHeight: 1.4 }}>
                    Widescreen cinematic 1080p. Perfect for in-depth explainers, FB In-Stream Ads & desktop TV viewing.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* STEP 5: TARGET PUBLISHING PLATFORMS */}
          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 700, color: '#f4f4f5', marginBottom: '8px' }}>
              5. Target Publishing Platforms
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
              {[
                { id: 'YouTube', label: 'YouTube', icon: '🔴', desc: 'Shorts & Long-Form' },
                { id: 'TikTok', label: 'TikTok', icon: '🎵', desc: 'Creator Rewards Ready (1-3m+)' },
                { id: 'Instagram', label: 'Instagram', icon: '📸', desc: 'Reels & Feed' },
                { id: 'Facebook', label: 'Facebook', icon: '🔵', desc: 'Reels (9:16) & Watch (16:9)' },
              ].map((plat) => {
                const isChecked = selectedPlatforms.includes(plat.id);
                return (
                  <label
                    key={plat.id}
                    style={{
                      background: isChecked ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                      border: isChecked ? '1px solid #ffffff' : '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px',
                      padding: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      cursor: 'pointer',
                      userSelect: 'none',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedPlatforms([...selectedPlatforms, plat.id]);
                        } else {
                          if (selectedPlatforms.length > 1) {
                            setSelectedPlatforms(selectedPlatforms.filter((p) => p !== plat.id));
                          } else {
                            toast.warning('Please select at least one target platform');
                          }
                        }
                      }}
                      style={{ width: '16px', height: '16px', accentColor: '#6366f1' }}
                    />
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>
                        {plat.icon} {plat.label}
                      </div>
                      <div style={{ fontSize: '11px', color: '#a1a1aa' }}>{plat.desc}</div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* STEP 6: TARGET DURATION & MONETIZATION TIER */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
              <label htmlFor="target-duration-select" style={{ fontSize: '14px', fontWeight: 700, color: '#f4f4f5', margin: 0 }}>
                6. Video Length & Monetization Tier
              </label>
              {aspectRatio === '9:16' && (
                <span style={{ fontSize: '11px', color: '#34d399', fontWeight: 600 }}>
                  ⭐ TikTok Creator Rewards: $0.50-$1.20+ RPM
                </span>
              )}
            </div>

            <select
              id="target-duration-select"
              value={videoLength}
              onChange={(e) => setVideoLength(Number(e.target.value))}
              style={{
                width: '100%',
                padding: '12px 14px',
                fontSize: '14px',
                background: '#09090b',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '8px',
                color: '#fff',
              }}
            >
              {aspectRatio === '9:16' ? (
                <>
                  <option value={0.5}>30 Seconds - Quick Viral Hook Teaser (9:16)</option>
                  <option value={0.75}>45 Seconds - Free Demo Max Cap (9:16)</option>
                  <option value={1}>60 Seconds (1 min) - Classic Short Format (9:16)</option>
                  <option value={1.5}>90 Seconds (1.5 min) - Instagram Reels Sweet Spot (9:16)</option>
                  <option value={2}>2 Minutes (120s) - High-Retention Narrative Story (9:16)</option>
                  <option value={3}>⭐ 3 Minutes (180s) - TikTok Creator Rewards Sweet Spot (Highest RPM)</option>
                  <option value={5}>5 Minutes (300s) - Deep Vertical Masterclass (9:16)</option>
                </>
              ) : (
                <>
                  <option value={2}>2 min - Quick Topic Overview (16:9 Widescreen)</option>
                  <option value={3}>3 min - Standard Breakdown (16:9 Widescreen)</option>
                  <option value={5}>5 min - Deep Dive Chapter (16:9 Widescreen)</option>
                  <option value={8}>8 min - Documentary Short (16:9 Widescreen)</option>
                  <option value={10}>10 min - Complete Masterclass (16:9 Widescreen)</option>
                  <option value={15}>15 min - Extended Analysis (16:9 Widescreen)</option>
                  <option value={20}>20 min - Full Feature Story (16:9 Widescreen)</option>
                </>
              )}
            </select>

            {aspectRatio === '9:16' && (
              <div style={{
                marginTop: '10px',
                padding: '12px 14px',
                background: 'rgba(99, 102, 241, 0.08)',
                border: '1px solid rgba(99, 102, 241, 0.25)',
                borderRadius: '8px',
                fontSize: '12px',
                color: '#c7d2fe',
                lineHeight: 1.5,
              }}>
                <strong>💡 TikTok Monetization Rule:</strong> The TikTok Creator Rewards Program strictly requires videos to be <strong>over 1 minute (&gt;60 seconds)</strong> to qualify for monetization. Videos between <strong>2 to 3+ minutes</strong> earn $0.50 &ndash; $1.20+ RPM compared to sub-minute shorts.
              </div>
            )}
          </div>

          {/* PRIMARY CTA */}
          <div style={{ marginTop: '10px' }}>
            <button
              id="creator-submit-btn"
              type="submit"
              disabled={creating || !topic.trim()}
              style={{
                width: '100%',
                padding: '16px',
                background: '#ffffff',
                color: '#09090b',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: 700,
                cursor: creating ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                minHeight: '52px',
              }}
            >
              {creating ? (
                <>
                  <span style={{ display: 'inline-block', width: '16px', height: '16px', border: '2px solid #000', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  <span>Starting Autonomous AI Pipeline...</span>
                </>
              ) : (
                <span>⚡ Generate Full Video (1-Click)</span>
              )}
            </button>

            <p style={{
              textAlign: 'center',
              fontSize: '13px',
              color: '#a1a1aa',
              margin: '12px 0 0 0',
              lineHeight: 1.5
            }}>
              AI will write the viral script, calculate exact audio timing, compose scenes, and render your video automatically.
            </p>
          </div>
        </form>
      </div>


      {/* ─────────────────────────────────────────────────────────────
          IN-APP INSTANT VOICE CLONING MODAL
      ───────────────────────────────────────────────────────────── */}
      {showCloneModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="voice-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget && modalState !== 'cloning') {
              closeModalSafely();
            }
          }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px'
          }}
        >
          <div
            ref={modalCardRef}
            style={{
              background: '#121215',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '560px',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '24px 20px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
              position: 'relative',
              boxSizing: 'border-box'
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <h2 id="voice-modal-title" style={{ fontSize: '20px', fontWeight: 800, color: '#fff', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>🎙️</span>
                  <span>Instant Voice Cloning</span>
                </h2>
                <p style={{ fontSize: '13px', color: '#a1a1aa', margin: 0 }}>
                  Clone your voice in seconds so all your videos sound exactly like you.
                </p>
              </div>
              <button
                type="button"
                onClick={closeModalSafely}
                disabled={modalState === 'cloning'}
                aria-label="Close Voice Cloning Modal"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: 'none',
                  color: modalState === 'cloning' ? '#52525b' : '#a1a1aa',
                  borderRadius: '50%',
                  width: '36px',
                  height: '36px',
                  cursor: modalState === 'cloning' ? 'not-allowed' : 'pointer',
                  fontSize: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                ✕
              </button>
            </div>

            {/* Error Banner Inside Modal */}
            {modalError && (
              <div style={{
                marginBottom: '16px',
                padding: '12px 14px',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '8px',
                fontSize: '13px',
                color: '#f87171',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span>⚠️</span>
                <span style={{ flex: 1 }}>{modalError}</span>
              </div>
            )}

            {/* Success State Banner */}
            {modalState === 'success' && justClonedVoice && (
              <div style={{
                padding: '24px',
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: '12px',
                textAlign: 'center',
                marginBottom: '16px'
              }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>🎉</div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#10b981', margin: '0 0 6px 0' }}>
                  Voice &ldquo;{justClonedVoice.name}&rdquo; Successfully Cloned!
                </h3>
                <p style={{ fontSize: '13px', color: '#a1a1aa', margin: '0 0 16px 0' }}>
                  Your voice is automatically selected and ready for your video.
                </p>
                {justClonedVoice.sample_url && (
                  <audio controls src={justClonedVoice.sample_url} style={{ width: '100%', marginBottom: '14px' }} />
                )}
                <button
                  type="button"
                  onClick={closeModalSafely}
                  style={{
                    padding: '10px 24px',
                    background: '#10b981',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Continue to Video ➔
                </button>
              </div>
            )}

            {/* Active Workflow (Hidden once in success mode) */}
            {modalState !== 'success' && (
              <>
                {/* Tab Switcher */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', background: '#09090b', padding: '4px', borderRadius: '8px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      if (modalState === 'recording') stopRecording();
                      setCloneTab('mic');
                      setModalError(null);
                    }}
                    disabled={modalState === 'cloning'}
                    style={{
                      flex: 1,
                      padding: '10px',
                      fontSize: '13px',
                      fontWeight: 600,
                      borderRadius: '6px',
                      border: 'none',
                      cursor: modalState === 'cloning' ? 'not-allowed' : 'pointer',
                      background: cloneTab === 'mic' ? 'rgba(255,255,255,0.1)' : 'transparent',
                      color: cloneTab === 'mic' ? '#fff' : '#71717a',
                      minHeight: '40px',
                    }}
                  >
                    🎤 Record Microphone
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (modalState === 'recording') stopRecording();
                      setCloneTab('upload');
                      setModalError(null);
                    }}
                    disabled={modalState === 'cloning'}
                    style={{
                      flex: 1,
                      padding: '10px',
                      fontSize: '13px',
                      fontWeight: 600,
                      borderRadius: '6px',
                      border: 'none',
                      cursor: modalState === 'cloning' ? 'not-allowed' : 'pointer',
                      background: cloneTab === 'upload' ? 'rgba(255,255,255,0.1)' : 'transparent',
                      color: cloneTab === 'upload' ? '#fff' : '#71717a',
                      minHeight: '40px',
                    }}
                  >
                    📁 Upload Audio File
                  </button>
                </div>

                {/* TAB 1: RECORD WITH MICROPHONE */}
                {cloneTab === 'mic' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '20px' }}>
                    <div style={{
                      padding: '18px',
                      background: 'rgba(255,255,255,0.02)',
                      border: modalState === 'recording' ? '1px solid #ef4444' : '1px dashed rgba(255,255,255,0.15)',
                      borderRadius: '10px',
                      textAlign: 'center'
                    }}>
                      {modalState === 'recording' ? (
                        <div>
                          <div style={{
                            width: '64px',
                            height: '64px',
                            borderRadius: '50%',
                            background: '#ef4444',
                            margin: '0 auto 12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 0 24px rgba(239, 68, 68, 0.6)'
                          }}>
                            <span style={{ fontSize: '26px' }}>🎤</span>
                          </div>
                          <div aria-live="polite" style={{ fontSize: '22px', fontWeight: 800, color: '#ef4444', fontFamily: 'monospace' }}>
                            00:{recordingSeconds.toString().padStart(2, '0')} / 01:00
                          </div>
                          <div style={{ fontSize: '12px', color: '#a1a1aa', marginTop: '6px' }}>
                            Speaking clearly into your microphone... (speak for 10-30 seconds)
                          </div>
                          <button
                            type="button"
                            onClick={stopRecording}
                            style={{
                              marginTop: '16px',
                              padding: '10px 24px',
                              background: '#ffffff',
                              color: '#09090b',
                              border: 'none',
                              borderRadius: '6px',
                              fontSize: '13px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              minHeight: '42px',
                            }}
                          >
                            ⏹️ Stop Recording
                          </button>
                        </div>
                      ) : recordedAudioUrl ? (
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: '#10b981', marginBottom: '8px' }}>
                            ✓ Voice sample recorded ({recordingSeconds}s)
                          </div>
                          <audio controls src={recordedAudioUrl} style={{ width: '100%', marginBottom: '12px' }} />
                          <button
                            type="button"
                            onClick={resetRecording}
                            disabled={modalState === 'cloning'}
                            style={{
                              background: 'rgba(255,255,255,0.08)',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '6px',
                              padding: '8px 16px',
                              fontSize: '12px',
                              cursor: 'pointer',
                              minHeight: '36px',
                            }}
                          >
                            ↺ Re-record Sample
                          </button>
                        </div>
                      ) : (
                        <div>
                          <div style={{ fontSize: '12px', color: '#a1a1aa', marginBottom: '14px', lineHeight: 1.6 }}>
                            <span style={{ color: '#e4e4e7', fontWeight: 600 }}>Suggested Reading Sample (15-20s):</span><br />
                            <em>&ldquo;Hello and welcome to my channel. In this video, we will explore exciting ideas, healthy habits, and helpful insights to level up your everyday life. Let&apos;s get started!&rdquo;</em>
                          </div>
                          <button
                            type="button"
                            onClick={startRecording}
                            disabled={modalState === 'cloning'}
                            style={{
                              padding: '12px 28px',
                              background: '#ef4444',
                              color: '#ffffff',
                              border: 'none',
                              borderRadius: '8px',
                              fontSize: '14px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '8px',
                              boxShadow: '0 4px 14px rgba(239, 68, 68, 0.4)',
                              minHeight: '46px',
                            }}
                          >
                            <span>🔴</span>
                            <span>Start Recording</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* TAB 2: UPLOAD AUDIO FILE */}
                {cloneTab === 'upload' && (
                  <div style={{ marginBottom: '20px' }}>
                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      style={{
                        padding: '24px',
                        background: isDragOver ? 'rgba(99, 102, 241, 0.08)' : 'rgba(255,255,255,0.02)',
                        border: isDragOver ? '1px solid #818cf8' : '1px dashed rgba(255,255,255,0.15)',
                        borderRadius: '10px',
                        textAlign: 'center'
                      }}
                    >
                      {uploadedFile ? (
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: '#10b981', marginBottom: '4px' }}>
                            ✓ {uploadedFile.name}
                          </div>
                          <div style={{ fontSize: '11px', color: '#71717a', marginBottom: '12px' }}>
                            {(uploadedFile.size / (1024 * 1024)).toFixed(2)} MB
                          </div>
                          {uploadedAudioUrl && (
                            <audio controls src={uploadedAudioUrl} style={{ width: '100%', marginBottom: '12px' }} />
                          )}
                          <label style={{
                            display: 'inline-block',
                            background: 'rgba(255,255,255,0.08)',
                            color: '#fff',
                            borderRadius: '6px',
                            padding: '8px 16px',
                            fontSize: '12px',
                            cursor: 'pointer'
                          }}>
                            Choose Different File
                            <input
                              type="file"
                              accept="audio/*,.mp3,.wav,.m4a,.webm,.ogg,.aac,.flac"
                              onChange={handleFileChange}
                              disabled={modalState === 'cloning'}
                              style={{ display: 'none' }}
                            />
                          </label>
                        </div>
                      ) : (
                        <div>
                          <div style={{ fontSize: '28px', marginBottom: '8px' }}>📂</div>
                          <div style={{ fontSize: '14px', fontWeight: 600, color: '#fff', marginBottom: '4px' }}>
                            Drag & drop or choose an audio file
                          </div>
                          <div style={{ fontSize: '12px', color: '#71717a', marginBottom: '16px' }}>
                            Supports MP3, WAV, M4A, WebM, OGG (up to 25 MB). Clear vocal speech works best.
                          </div>
                          <label style={{
                            display: 'inline-block',
                            background: '#ffffff',
                            color: '#09090b',
                            borderRadius: '6px',
                            padding: '10px 22px',
                            fontSize: '13px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            minHeight: '40px',
                          }}>
                            Browse Audio File
                            <input
                              type="file"
                              accept="audio/*,.mp3,.wav,.m4a,.webm,.ogg,.aac,.flac"
                              onChange={handleFileChange}
                              disabled={modalState === 'cloning'}
                              style={{ display: 'none' }}
                            />
                          </label>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Voice Name Input */}
                <div style={{ marginBottom: '20px' }}>
                  <label htmlFor="voice-name-input" style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#e4e4e7', marginBottom: '6px' }}>
                    Give Your Voice a Name
                  </label>
                  <input
                    id="voice-name-input"
                    type="text"
                    className="form-input"
                    maxLength={50}
                    disabled={modalState === 'cloning'}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      fontSize: '13px',
                      background: '#09090b',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '6px',
                      color: '#fff',
                      boxSizing: 'border-box'
                    }}
                    placeholder="e.g. My Host Voice, Nabeel's Voice"
                    value={newVoiceName}
                    onChange={(e) => setNewVoiceName(e.target.value)}
                  />
                </div>

                {/* Modal Actions */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={closeModalSafely}
                    disabled={modalState === 'cloning'}
                    style={{
                      background: 'transparent',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: '#a1a1aa',
                      borderRadius: '6px',
                      padding: '10px 18px',
                      fontSize: '13px',
                      cursor: modalState === 'cloning' ? 'not-allowed' : 'pointer',
                      minHeight: '42px',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleCloneVoice}
                    disabled={modalState === 'cloning' || (cloneTab === 'mic' ? !recordedBlob : !uploadedFile)}
                    style={{
                      background: modalState === 'cloning' ? '#4f46e5' : 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '10px 22px',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: (modalState === 'cloning' || (cloneTab === 'mic' ? !recordedBlob : !uploadedFile)) ? 'not-allowed' : 'pointer',
                      opacity: (cloneTab === 'mic' ? !recordedBlob : !uploadedFile) ? 0.5 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      minHeight: '42px',
                    }}
                  >
                    {modalState === 'cloning' ? (
                      <>
                        <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⏳</span>
                        <span>Cloning Voice (~5-10s)...</span>
                      </>
                    ) : (
                      <>
                        <span>⚡</span>
                        <span>Clone My Voice Now</span>
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          ELEVENLABS PRO VOICE CONVERSION MODAL
      ───────────────────────────────────────────────────────────── */}
      
      {/* ─────────────────────────────────────────────────────────────
          VOICE CLONING PRO UPGRADE MODAL
      ───────────────────────────────────────────────────────────── */}
      {showProVoiceCloneModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="pro-clone-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowProVoiceCloneModal(false);
            }
          }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px',
          }}
        >
          <div
            style={{
              background: '#121215',
              border: '1px solid rgba(168, 85, 247, 0.4)',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '500px',
              padding: '28px 24px',
              boxShadow: '0 25px 50px -12px rgba(168, 85, 247, 0.25)',
              position: 'relative',
              boxSizing: 'border-box',
            }}
          >
            <button
              type="button"
              onClick={() => setShowProVoiceCloneModal(false)}
              aria-label="Close upgrade modal"
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'transparent',
                border: 'none',
                color: '#a1a1aa',
                fontSize: '18px',
                cursor: 'pointer',
                padding: '4px 8px',
                borderRadius: '4px',
              }}
            >
              ✕
            </button>

            <div style={{ marginBottom: '16px' }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.2) 0%, rgba(99, 102, 241, 0.2) 100%)',
                  border: '1px solid rgba(168, 85, 247, 0.4)',
                  borderRadius: '20px',
                  padding: '4px 12px',
                  marginBottom: '12px',
                }}
              >
                <span style={{ fontSize: '13px' }}>🎙️</span>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: '#c084fc',
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                  }}
                >
                  Pro Automation Feature
                </span>
              </div>
              <h2
                id="pro-clone-modal-title"
                style={{
                  fontSize: '22px',
                  fontWeight: 800,
                  color: '#ffffff',
                  margin: '0 0 8px 0',
                  letterSpacing: '-0.02em',
                }}
              >
                Unlock Voice Cloning Studio on Pro Automation
              </h2>
              <p style={{ fontSize: '13px', color: '#a1a1aa', margin: 0, lineHeight: 1.5 }}>
                Clone your personal voice in under 30 seconds with hyper-realistic emotional inflections, and unlock our entire library of 50+ ElevenLabs studio voices!
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '13px', color: '#e4e4e7' }}>
                <span style={{ color: '#10b981', fontWeight: 700 }}>✓</span>
                <span>Instant voice cloning from a 30-second mic recording or audio upload</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '13px', color: '#e4e4e7' }}>
                <span style={{ color: '#10b981', fontWeight: 700 }}>✓</span>
                <span>Hyper-realistic pacing, natural breath pauses, and custom vocal identity</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '13px', color: '#e4e4e7' }}>
                <span style={{ color: '#10b981', fontWeight: 700 }}>✓</span>
                <span>Full access to Google Veo 3.1 & Seedance generative AI video engine</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                type="button"
                onClick={() => {
                  window.open('/billing', '_blank');
                  setShowProVoiceCloneModal(false);
                }}
                style={{
                  width: '100%',
                  padding: '13px',
                  background: 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(168, 85, 247, 0.4)',
                }}
              >
                View Pro Automation Plan ➔
              </button>
              <button
                type="button"
                onClick={() => setShowProVoiceCloneModal(false)}
                style={{
                  width: '100%',
                  padding: '10px',
                  background: 'transparent',
                  color: '#a1a1aa',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Keep Standard Free Voice
              </button>
            </div>
          </div>
        </div>
      )}

      {showProVoiceModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="pro-voice-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowProVoiceModal(false);
            }
          }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px',
          }}
        >
          <div
            style={{
              background: '#121215',
              border: '1px solid rgba(168, 85, 247, 0.35)',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '520px',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '28px 24px',
              boxShadow: '0 25px 50px -12px rgba(168, 85, 247, 0.25)',
              position: 'relative',
              boxSizing: 'border-box',
            }}
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setShowProVoiceModal(false)}
              aria-label="Close upgrade modal"
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'transparent',
                border: 'none',
                color: '#a1a1aa',
                fontSize: '18px',
                cursor: 'pointer',
                padding: '4px 8px',
                borderRadius: '4px',
                lineHeight: 1,
              }}
            >
              ✕
            </button>

            {/* Modal Header */}
            <div style={{ marginBottom: '18px' }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.2) 0%, rgba(99, 102, 241, 0.2) 100%)',
                  border: '1px solid rgba(168, 85, 247, 0.4)',
                  borderRadius: '20px',
                  padding: '4px 12px',
                  marginBottom: '12px',
                }}
              >
                <span style={{ fontSize: '13px' }}>⭐</span>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: '#c084fc',
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                  }}
                >
                  Creator & Pro Exclusive
                </span>
              </div>
              <h2
                id="pro-voice-modal-title"
                style={{
                  fontSize: '22px',
                  fontWeight: 800,
                  color: '#ffffff',
                  margin: '0 0 8px 0',
                  letterSpacing: '-0.02em',
                  lineHeight: 1.3,
                }}
              >
                Unlock ElevenLabs Ultra-Realistic Voices on Creator or Pro
              </h2>
              <p style={{ fontSize: '13px', color: '#a1a1aa', margin: 0, lineHeight: 1.5 }}>
                You selected <strong style={{ color: '#fff' }}>{pendingProVoice?.name || 'an ElevenLabs Pro Voice'}</strong>. Studio voiceovers feature human-grade pacing, natural emotional inflections, and dramatic pauses that skyrocket viewer retention.
              </p>
            </div>

            {/* Audio Preview Spotlight */}
            {pendingProVoice && (
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '10px',
                  padding: '14px',
                  marginBottom: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '18px',
                      color: '#fff',
                      flexShrink: 0,
                    }}
                  >
                    🎙️
                  </div>
                  <div style={{ overflow: 'hidden' }}>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {pendingProVoice.name}
                    </div>
                    <div style={{ fontSize: '11px', color: '#a1a1aa' }}>
                      ElevenLabs Turbo v2.5 &bull; {pendingProVoice.category.toUpperCase()}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => handlePlaySample(e, pendingProVoice.previewAudioUrl, pendingProVoice.id)}
                  style={{
                    background: playingVoiceId === pendingProVoice.id ? '#a855f7' : 'rgba(168, 85, 247, 0.2)',
                    border: '1px solid rgba(168, 85, 247, 0.4)',
                    color: '#fff',
                    borderRadius: '6px',
                    padding: '8px 14px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    flexShrink: 0,
                  }}
                >
                  <span>{playingVoiceId === pendingProVoice.id ? '⏸' : '▶'}</span>
                  <span>{playingVoiceId === pendingProVoice.id ? 'Pause' : 'Listen Sample'}</span>
                </button>
              </div>
            )}

            {/* Value Highlights */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '13px', color: '#e4e4e7', lineHeight: 1.4 }}>
                <span style={{ color: '#10b981', fontWeight: 700 }}>✓</span>
                <div>
                  <strong>42% Higher Retention:</strong> Ultra-realistic voice timbre and natural breath pauses keep audiences glued on TikTok & YouTube Shorts.
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '13px', color: '#e4e4e7', lineHeight: 1.4 }}>
                <span style={{ color: '#10b981', fontWeight: 700 }}>✓</span>
                <div>
                  <strong>No Watermarks:</strong> Remove the &ldquo;Created with Tillercast&rdquo; watermark on all exported videos.
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '13px', color: '#e4e4e7', lineHeight: 1.4 }}>
                <span style={{ color: '#10b981', fontWeight: 700 }}>✓</span>
                <div>
                  <strong>1-Click Direct Publishing:</strong> Auto-schedule and post directly to YouTube, TikTok, Instagram & Facebook.
                </div>
              </div>
            </div>

            {/* CTAs */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                type="button"
                onClick={() => {
                  setShowProVoiceModal(false);
                  router.push('/billing');
                }}
                style={{
                  width: '100%',
                  padding: '14px',
                  background: 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '15px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(168, 85, 247, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  minHeight: '48px',
                }}
              >
                <span>Upgrade to Creator or Pro ➔</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedVoice('cf-aura-orion');
                  setShowProVoiceModal(false);
                  toast.info('Switched to free Deepgram Aura-2 voice. You can create your demo video now!');
                }}
                style={{
                  width: '100%',
                  padding: '10px',
                  background: 'transparent',
                  color: '#a1a1aa',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  minHeight: '40px',
                }}
              >
                Keep using Free Aura-2 Voice
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default function CreateVideoWizard({ hideBackLink = false }: { hideBackLink?: boolean }) {
  return (
    <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center', color: '#71717a' }}>Loading Studio Creator...</div>}>
      <CreateVideoWizardContent hideBackLink={hideBackLink} />
    </Suspense>
  );
}
