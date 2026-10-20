'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useToast } from '@/components/Toast';

interface SceneItem {
  sceneNumber: number;
  sceneType: string;
  heading: string;
  narration: string;
  visualPrompt: string;
  sceneTopic: string;
  durationSec: number;
}

function PersonalAiCreatorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();

  // Navigation tab: 'create' | 'projects' | 'avatar' | 'voice'
  const initialTab = (searchParams?.get('tab') as any) || 'create';
  const [activeTab, setActiveTab] = useState<'create' | 'projects' | 'avatar' | 'voice'>(initialTab);

  // Wizard Step: 1 = Identity, 2 = Voice, 3 = Content, 4 = Style, 5 = Preview/Generate
  const [currentStep, setCurrentStep] = useState<number>(1);

  // ─────────────────────────────────────────────────────────────
  // STATE: USER PROFILE & ASSETS
  // ─────────────────────────────────────────────────────────────
  const [profile, setProfile] = useState<any>(null);
  const [loadingProfile, setLoadingProfile] = useState<boolean>(true);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoAssetId, setPhotoAssetId] = useState<string | null>(null);
  const [consentAgreed, setConsentAgreed] = useState<boolean>(false);

  // Voice State
  const [voiceMode, setVoiceMode] = useState<'upload' | 'record'>('upload');
  const [voiceFile, setVoiceFile] = useState<File | null>(null);
  const [voiceAssetId, setVoiceAssetId] = useState<string | null>(null);
  const [voicePreviewUrl, setVoicePreviewUrl] = useState<string | null>(null);
  const [voiceLabel, setVoiceLabel] = useState<string>('Personal Voice');
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingDuration, setRecordingDuration] = useState<number>(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // ─────────────────────────────────────────────────────────────
  // STATE: CONTENT & SCRIPT
  // ─────────────────────────────────────────────────────────────
  const [contentMode, setContentMode] = useState<'generate' | 'custom'>('generate');
  const [topic, setTopic] = useState<string>('The Future of Artificial Intelligence');
  const [audience, setAudience] = useState<string>('General Audience');
  const [tone, setTone] = useState<string>('Professional');
  const [videoLength, setVideoLength] = useState<number>(3);
  const [language, setLanguage] = useState<string>('English');
  const [customScriptText, setCustomScriptText] = useState<string>('');
  const [isGeneratingScript, setIsGeneratingScript] = useState<boolean>(false);
  const [scenes, setScenes] = useState<SceneItem[]>([]);
  const [scriptStats, setScriptStats] = useState<{ wordCount: number; durationFormatted: string }>({
    wordCount: 0,
    durationFormatted: '0:00',
  });

  // ─────────────────────────────────────────────────────────────
  // STATE: STYLE & CAMERA
  // ─────────────────────────────────────────────────────────────
  const [selectedStyle, setSelectedStyle] = useState<'PODCAST' | 'VLOG' | 'EDUCATIONAL' | 'NEWS' | 'STORYTELLING'>('PODCAST');
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16' | '1:1'>('16:9');
  const [presenterPosition, setPresenterPosition] = useState<'center' | 'left' | 'right'>('center');
  const [presenterFraming, setPresenterFraming] = useState<'close-up' | 'medium' | 'wide'>('medium');
  const [cameraMotion, setCameraMotion] = useState<'static' | 'slow_zoom' | 'push_in' | 'pull_out' | 'cinematic'>('cinematic');
  const [captionsEnabled, setCaptionsEnabled] = useState<boolean>(true);
  const [captionStyle, setCaptionStyle] = useState<string>('YouTube');
  const [musicEnabled, setMusicEnabled] = useState<boolean>(true);
  const [musicVolume, setMusicVolume] = useState<number>(20);

  // ─────────────────────────────────────────────────────────────
  // STATE: JOB STATUS & GENERATION
  // ─────────────────────────────────────────────────────────────
  const [activeProject, setActiveProject] = useState<any>(null);
  const [isSubmittingJob, setIsSubmittingJob] = useState<boolean>(false);
  const [projectsList, setProjectsList] = useState<any[]>([]);
  const [loadingProjects, setLoadingProjects] = useState<boolean>(false);

  // Fetch initial profile & projects
  useEffect(() => {
    fetchProfile();
    fetchProjects();
  }, []);

  // Update URL search params on tab change
  useEffect(() => {
    const tabParam = searchParams?.get('tab');
    if (tabParam && ['create', 'projects', 'avatar', 'voice'].includes(tabParam)) {
      setActiveTab(tabParam as any);
    }
  }, [searchParams]);

  const fetchProfile = async () => {
    try {
      setLoadingProfile(true);
      const res = await fetch('/api/personal-ai/profile');
      if (res.ok) {
        const data = await res.json();
        setProfile(data.profile);
        if (data.profile?.consent_agreed_at) {
          setConsentAgreed(true);
        }
        if (data.avatarAsset) {
          setPhotoAssetId(data.avatarAsset.id);
          setPhotoPreview(`/api/personal-ai/assets/${data.avatarAsset.id}`);
        }
        if (data.voiceAsset) {
          setVoiceAssetId(data.voiceAsset.id);
          setVoicePreviewUrl(`/api/personal-ai/assets/${data.voiceAsset.id}`);
        }
      }
    } catch (err) {
      console.error('Failed to load profile:', err);
    } finally {
      setLoadingProfile(false);
    }
  };

  const fetchProjects = async () => {
    try {
      setLoadingProjects(true);
      const res = await fetch('/api/personal-ai/projects');
      if (res.ok) {
        const data = await res.json();
        setProjectsList(data.projects || []);
      }
    } catch (err) {
      console.error('Failed to load projects:', err);
    } finally {
      setLoadingProjects(false);
    }
  };

  // Poll active project if rendering
  useEffect(() => {
    if (!activeProject || ['COMPLETED', 'FAILED'].includes(activeProject.status)) {
      return;
    }

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/personal-ai/projects/${activeProject.id}`);
        if (res.ok) {
          const data = await res.json();
          setActiveProject(data.project);
          if (data.project.status === 'COMPLETED') {
            toast.success('🎉 Personal AI Video rendered successfully!');
            fetchProjects();
          } else if (data.project.status === 'FAILED') {
            toast.error(data.project.error_message || 'Video generation failed.');
          }
        }
      } catch {}
    }, 2500);

    return () => clearInterval(interval);
  }, [activeProject]);

  // Real-time custom script character/word count
  useEffect(() => {
    if (contentMode === 'custom') {
      const words = customScriptText.trim().split(/\s+/).filter(Boolean);
      const count = words.length;
      const durationSec = Math.max(0, Math.round(count / 2.4));
      const m = Math.floor(durationSec / 60);
      const s = durationSec % 60;
      setScriptStats({
        wordCount: count,
        durationFormatted: `${m}:${s.toString().padStart(2, '0')}`,
      });
    }
  }, [customScriptText, contentMode]);

  // ─────────────────────────────────────────────────────────────
  // PHOTO UPLOAD HANDLER
  // ─────────────────────────────────────────────────────────────
  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file (JPG, PNG, WEBP).');
      return;
    }

    setPhotoFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPhotoPreview(objectUrl);

    // Auto upload photo asset
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', 'photo');
    formData.append('consent', consentAgreed ? 'true' : 'false');

    try {
      const res = await fetch('/api/personal-ai/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Photo upload failed');
      }

      const data = await res.json();
      setPhotoAssetId(data.asset.id);
      toast.success('Presenter photo uploaded and verified! ✨');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // VOICE RECORDING & UPLOAD HANDLERS
  // ─────────────────────────────────────────────────────────────
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const recordedFile = new File([audioBlob], 'recorded_voice.webm', { type: 'audio/webm' });
        const previewUrl = URL.createObjectURL(audioBlob);
        setVoicePreviewUrl(previewUrl);
        setVoiceFile(recordedFile);

        // Upload recorded audio
        await uploadVoiceFile(recordedFile);

        // Stop all audio tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        toast.error('Microphone permission denied. Please click the lock or settings icon in your browser address bar to allow microphone access, then refresh.');
      } else {
        toast.error('Microphone access denied or unavailable: ' + err.message);
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    }
  };

  const handleVoiceFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setVoiceFile(file);
    const objectUrl = URL.createObjectURL(file);
    setVoicePreviewUrl(objectUrl);
    await uploadVoiceFile(file);
  };

  const uploadVoiceFile = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', 'voice_sample');
    formData.append('consent', consentAgreed ? 'true' : 'false');

    try {
      toast.info('Analyzing voice sample for quality and duration...');
      const res = await fetch('/api/personal-ai/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Voice sample validation failed');
      }

      const data = await res.json();
      setVoiceAssetId(data.asset.id);
      if (data.voiceResult?.voiceLabel) {
        setVoiceLabel(data.voiceResult.voiceLabel);
      }
      toast.success('Voice sample verified and ready! 🎙️');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // SCRIPT GENERATION HANDLER
  // ─────────────────────────────────────────────────────────────
  const handleGenerateScript = async () => {
    try {
      setIsGeneratingScript(true);
      const payload: any = {
        mode: contentMode,
        topic,
        audience,
        tone,
        lengthMinutes: videoLength,
        language,
        style: selectedStyle,
      };

      if (contentMode === 'custom') {
        if (!customScriptText.trim()) {
          toast.error('Please paste your script text first.');
          setIsGeneratingScript(false);
          return;
        }
        payload.scriptText = customScriptText;
      }

      const res = await fetch('/api/personal-ai/script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to generate script');
      }

      const data = await res.json();
      if (data.script?.scenes) {
        setScenes(data.script.scenes);
        setScriptStats({
          wordCount: data.script.wordCount,
          durationFormatted: data.script.estimatedDurationFormatted,
        });
        toast.success(`Generated ${data.script.scenes.length} structured scenes! ✨`);
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsGeneratingScript(false);
    }
  };

  const handleUpdateScene = (index: number, field: keyof SceneItem, value: any) => {
    setScenes((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  // ─────────────────────────────────────────────────────────────
  // SUBMIT & GENERATE FINAL VIDEO
  // ─────────────────────────────────────────────────────────────
  const handleStartGeneration = async () => {
    if (!consentAgreed) {
      toast.error('You must confirm ownership or permission of your photo and voice to continue.');
      setCurrentStep(1);
      return;
    }

    if (scenes.length === 0) {
      toast.error('Please generate or prepare your script scenes first.');
      setCurrentStep(3);
      return;
    }

    try {
      setIsSubmittingJob(true);
      const res = await fetch('/api/personal-ai/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: topic || 'Personal AI Video',
          topic,
          script: scenes.map((s) => s.narration).join('\n\n'),
          style: selectedStyle,
          language,
          aspectRatio,
          presenterPosition,
          presenterFraming,
          cameraMotion,
          captionsEnabled,
          captionStyle,
          musicEnabled,
          musicVolume,
          scenes,
          avatarAssetId: photoAssetId,
          voiceType: voiceAssetId ? 'personal' : 'standard',
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to start video rendering');
      }

      const data = await res.json();
      setActiveProject(data.project);
      toast.success('Video generation job queued! Rendering in background.');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSubmittingJob(false);
    }
  };

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '12px 16px 60px', color: '#f8fafc' }}>
      
      {/* ─────────────────────────────────────────────────────────────
          HEADER & NAVIGATION TABS
      ───────────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: '28px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{
            background: 'linear-gradient(135deg, #6366f1, #a855f7)',
            color: '#ffffff',
            fontSize: '11px',
            fontWeight: 800,
            padding: '3px 8px',
            borderRadius: '5px',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
          }}>
            Studio Pro
          </span>
          <span style={{ fontSize: '13px', color: '#94a3b8' }}>
            Autonomous Presenter Engine
          </span>
        </div>
        <h1 style={{ fontSize: '30px', fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }}>
          Personal AI Creator
        </h1>
        <p style={{ fontSize: '15px', color: '#94a3b8', margin: 0 }}>
          Turn your photo and voice into realistic presenter-style YouTube videos.
        </p>

        {/* Tab Switcher */}
        <div style={{
          display: 'flex',
          gap: '8px',
          marginTop: '16px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          paddingBottom: '10px',
          overflowX: 'auto',
        }}>
          {[
            { id: 'create', label: 'Create Video', icon: '✨' },
            { id: 'projects', label: `My Projects (${projectsList.length})`, icon: '🎬' },
            { id: 'avatar', label: 'My Avatar', icon: '👤' },
            { id: 'voice', label: 'My Voice', icon: '🎙️' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 18px',
                borderRadius: '8px',
                border: 'none',
                background: activeTab === tab.id ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                color: activeTab === tab.id ? '#818cf8' : '#94a3b8',
                fontWeight: activeTab === tab.id ? 700 : 500,
                fontSize: '14px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          TAB 1: CREATE VIDEO WIZARD
      ───────────────────────────────────────────────────────────── */}
      {activeTab === 'create' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          
          {/* Step Indicator Header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gap: '8px',
            background: 'rgba(255, 255, 255, 0.03)',
            padding: '12px',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.06)',
          }}>
            {[
              { num: 1, label: 'Identity' },
              { num: 2, label: 'Voice' },
              { num: 3, label: 'Content' },
              { num: 4, label: 'Style & Framing' },
              { num: 5, label: 'Preview & Render' },
            ].map((s) => (
              <button
                key={s.num}
                onClick={() => setCurrentStep(s.num)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: currentStep === s.num ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
                  border: currentStep === s.num ? '1px solid rgba(99, 102, 241, 0.4)' : '1px solid transparent',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  color: currentStep === s.num ? '#ffffff' : '#71717a',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: currentStep === s.num ? 700 : 500,
                  transition: 'all 0.15s',
                }}
              >
                <span style={{
                  width: '22px',
                  height: '22px',
                  borderRadius: '50%',
                  background: currentStep === s.num ? '#6366f1' : 'rgba(255, 255, 255, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: 700,
                }}>
                  {s.num}
                </span>
                <span>{s.label}</span>
              </button>
            ))}
          </div>

          {/* ─────────────────────────────────────────────────────────────
              STEP 1: IDENTITY (UPLOAD PHOTO + CONSENT)
          ───────────────────────────────────────────────────────────── */}
          {currentStep === 1 && (
            <div style={{
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '16px',
              padding: '28px',
              display: 'flex',
              flexDirection: 'column',
              gap: '24px',
            }}>
              <div>
                <h3 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 6px' }}>
                  Step 1: Upload Your Photo
                </h3>
                <p style={{ fontSize: '14px', color: '#94a3b8', margin: 0 }}>
                  Upload a clear, front-facing photo of yourself. This becomes the visual identity of your presenter.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', alignItems: 'center' }}>
                {/* Upload Box */}
                <div style={{
                  border: '2px dashed rgba(255, 255, 255, 0.15)',
                  borderRadius: '12px',
                  padding: '36px 20px',
                  textAlign: 'center',
                  background: 'rgba(0, 0, 0, 0.2)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '12px',
                  cursor: 'pointer',
                  position: 'relative',
                }}>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handlePhotoSelect}
                    style={{
                      position: 'absolute',
                      inset: 0,
                      opacity: 0,
                      cursor: 'pointer',
                    }}
                  />
                  <div style={{
                    width: '54px',
                    height: '54px',
                    borderRadius: '50%',
                    background: 'rgba(99, 102, 241, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#818cf8',
                  }}>
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '15px' }}>Upload a clear photo of yourself</div>
                    <div style={{ fontSize: '12px', color: '#71717a', marginTop: '4px' }}>JPG, JPEG, PNG, or WEBP up to 25MB</div>
                  </div>
                </div>

                {/* Photo Preview & Position Guide */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(0,0,0,0.3)',
                  padding: '20px',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                }}>
                  <div style={{
                    width: '160px',
                    height: '160px',
                    borderRadius: '50%',
                    overflow: 'hidden',
                    border: '3px solid #6366f1',
                    boxShadow: '0 0 24px rgba(99, 102, 241, 0.3)',
                    background: '#111118',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                  }}>
                    {photoPreview ? (
                      <img
                        src={photoPreview}
                        alt="Avatar Preview"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <div style={{ color: '#52525b', fontSize: '12px', textAlign: 'center', padding: '12px' }}>
                        No photo chosen yet
                      </div>
                    )}
                  </div>
                  <span style={{ fontSize: '12px', color: '#94a3b8', marginTop: '12px' }}>
                    {photoPreview ? '✅ Presenter Photo Loaded' : 'Preview area'}
                  </span>
                </div>
              </div>

              {/* Privacy Consent Checkbox */}
              <div style={{
                background: 'rgba(234, 179, 8, 0.08)',
                border: '1px solid rgba(234, 179, 8, 0.25)',
                borderRadius: '10px',
                padding: '16px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
              }}>
                <input
                  type="checkbox"
                  id="consentCheckbox"
                  checked={consentAgreed}
                  onChange={(e) => setConsentAgreed(e.target.checked)}
                  style={{ marginTop: '3px', cursor: 'pointer', accentColor: '#eab308' }}
                />
                <label htmlFor="consentCheckbox" style={{ fontSize: '13px', color: '#fef08a', cursor: 'pointer', lineHeight: 1.5 }}>
                  <strong>Consent & Rights Confirmation:</strong> "I confirm that I own this photo and voice sample, or have explicit legal permission to use them. I understand this platform does not allow arbitrary third-party impersonation or deepfakes."
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
                <button
                  type="button"
                  disabled={!consentAgreed}
                  onClick={() => setCurrentStep(2)}
                  style={{
                    padding: '12px 28px',
                    borderRadius: '8px',
                    background: consentAgreed ? '#6366f1' : 'rgba(255,255,255,0.1)',
                    color: consentAgreed ? '#ffffff' : '#71717a',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '14px',
                    cursor: consentAgreed ? 'pointer' : 'not-allowed',
                  }}
                >
                  Continue to Voice →
                </button>
              </div>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────
              STEP 2: VOICE (UPLOAD OR RECORD)
          ───────────────────────────────────────────────────────────── */}
          {currentStep === 2 && (
            <div style={{
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '16px',
              padding: '28px',
              display: 'flex',
              flexDirection: 'column',
              gap: '24px',
            }}>
              <div>
                <h3 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 6px' }}>
                  Step 2: Provide Your Voice
                </h3>
                <p style={{ fontSize: '14px', color: '#94a3b8', margin: 0 }}>
                  Upload an audio clip or record directly from your microphone (minimum 3 seconds, clear speech).
                </p>
              </div>

              {/* Mode Toggle */}
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setVoiceMode('upload')}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '8px',
                    background: voiceMode === 'upload' ? '#6366f1' : 'rgba(255,255,255,0.05)',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  📁 Upload Voice File (MP3 / WAV / M4A)
                </button>
                <button
                  type="button"
                  onClick={() => setVoiceMode('record')}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '8px',
                    background: voiceMode === 'record' ? '#6366f1' : 'rgba(255,255,255,0.05)',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  🎙️ Record in Browser
                </button>
              </div>

              {voiceMode === 'upload' ? (
                <div style={{
                  border: '2px dashed rgba(255, 255, 255, 0.15)',
                  borderRadius: '12px',
                  padding: '36px 20px',
                  textAlign: 'center',
                  background: 'rgba(0, 0, 0, 0.2)',
                  position: 'relative',
                  cursor: 'pointer',
                }}>
                  <input
                    type="file"
                    accept="audio/mp3,audio/wav,audio/m4a,audio/mpeg"
                    onChange={handleVoiceFileSelect}
                    style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}
                  />
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>🎧</div>
                  <div style={{ fontWeight: 700, fontSize: '15px' }}>Click or drop audio file here</div>
                  <div style={{ fontSize: '12px', color: '#71717a', marginTop: '4px' }}>MP3, WAV, or M4A (10s–60s recommended)</div>
                </div>
              ) : (
                <div style={{
                  background: 'rgba(0, 0, 0, 0.25)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '12px',
                  padding: '28px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '16px',
                }}>
                  <div style={{ fontSize: '36px' }}>
                    {isRecording ? '🔴' : '🎙️'}
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: 700 }}>
                    {isRecording ? `Recording... ${recordingDuration}s` : 'Ready to record'}
                  </div>
                  <p style={{ fontSize: '13px', color: '#94a3b8', textAlign: 'center', maxWidth: '440px', margin: 0 }}>
                    Read a paragraph aloud with a steady, natural tone. Avoid background noise.
                  </p>

                  <div style={{ display: 'flex', gap: '12px' }}>
                    {!isRecording ? (
                      <button
                        type="button"
                        onClick={startRecording}
                        style={{
                          padding: '10px 24px',
                          borderRadius: '8px',
                          background: '#ef4444',
                          color: '#ffffff',
                          border: 'none',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        Start Recording
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={stopRecording}
                        style={{
                          padding: '10px 24px',
                          borderRadius: '8px',
                          background: '#22c55e',
                          color: '#ffffff',
                          border: 'none',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        Finish & Save Recording
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Voice Preview Player */}
              {voicePreviewUrl && (
                <div style={{
                  background: 'rgba(99, 102, 241, 0.08)',
                  border: '1px solid rgba(99, 102, 241, 0.25)',
                  borderRadius: '10px',
                  padding: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '14px' }}>Active Voice Sample</div>
                    <span style={{ fontSize: '12px', color: '#818cf8', fontWeight: 600 }}>
                      🏷️ {voiceLabel}
                    </span>
                  </div>
                  <audio controls src={voicePreviewUrl} style={{ height: '36px' }} />
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '8px',
                    background: 'rgba(255,255,255,0.06)',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  ← Back to Photo
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  style={{
                    padding: '12px 28px',
                    borderRadius: '8px',
                    background: '#6366f1',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '14px',
                    cursor: 'pointer',
                  }}
                >
                  Continue to Content →
                </button>
              </div>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────
              STEP 3: CONTENT & SCRIPT
          ───────────────────────────────────────────────────────────── */}
          {currentStep === 3 && (
            <div style={{
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '16px',
              padding: '28px',
              display: 'flex',
              flexDirection: 'column',
              gap: '24px',
            }}>
              <div>
                <h3 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 6px' }}>
                  Step 3: Content Input & Script Breakdown
                </h3>
                <p style={{ fontSize: '14px', color: '#94a3b8', margin: 0 }}>
                  Generate a structured presenter script from a topic, or paste your own script.
                </p>
              </div>

              {/* Mode Toggle */}
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setContentMode('generate')}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '8px',
                    background: contentMode === 'generate' ? '#6366f1' : 'rgba(255,255,255,0.05)',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  ✨ Generate from Topic
                </button>
                <button
                  type="button"
                  onClick={() => setContentMode('custom')}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '8px',
                    background: contentMode === 'custom' ? '#6366f1' : 'rgba(255,255,255,0.05)',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  📝 Use My Own Script
                </button>
              </div>

              {contentMode === 'generate' ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                      Video Topic
                    </label>
                    <input
                      type="text"
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      placeholder="e.g. 5 AI tools that will replace junior developers in 2026"
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        borderRadius: '8px',
                        background: 'rgba(0,0,0,0.3)',
                        border: '1px solid rgba(255,255,255,0.12)',
                        color: '#ffffff',
                        fontSize: '14px',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Tone</label>
                    <select
                      value={tone}
                      onChange={(e) => setTone(e.target.value)}
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#181824', border: '1px solid rgba(255,255,255,0.12)', color: '#ffffff' }}
                    >
                      <option value="Professional">Professional</option>
                      <option value="Casual">Casual & Relatable</option>
                      <option value="Educational">Educational & Analytical</option>
                      <option value="Storytelling">Storytelling & Suspenseful</option>
                      <option value="Energetic">Energetic & Fast-Paced</option>
                      <option value="Documentary">Documentary Authoritative</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Target Length</label>
                    <select
                      value={videoLength}
                      onChange={(e) => setVideoLength(Number(e.target.value))}
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#181824', border: '1px solid rgba(255,255,255,0.12)', color: '#ffffff' }}
                    >
                      <option value={1}>1 Minute (Short form)</option>
                      <option value={3}>3 Minutes (Recommended)</option>
                      <option value={5}>5 Minutes</option>
                      <option value={8}>8 Minutes</option>
                      <option value={10}>10 Minutes</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Language</label>
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#181824', border: '1px solid rgba(255,255,255,0.12)', color: '#ffffff' }}
                    >
                      <option value="English">English</option>
                      <option value="Urdu">Urdu</option>
                      <option value="Roman Urdu">Roman Urdu</option>
                      <option value="Hindi">Hindi</option>
                      <option value="Spanish">Spanish</option>
                    </select>
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 600 }}>Paste Your Script</label>
                    <span style={{ fontSize: '12px', color: '#818cf8', fontWeight: 600 }}>
                      {scriptStats.wordCount} words • Estimated Duration: {scriptStats.durationFormatted}
                    </span>
                  </div>
                  <textarea
                    rows={8}
                    value={customScriptText}
                    onChange={(e) => setCustomScriptText(e.target.value)}
                    placeholder="Paste your full narration script here. We will automatically divide it into scenes and calculate timing..."
                    style={{
                      width: '100%',
                      padding: '14px',
                      borderRadius: '8px',
                      background: 'rgba(0,0,0,0.3)',
                      border: '1px solid rgba(255,255,255,0.12)',
                      color: '#ffffff',
                      fontSize: '14px',
                      fontFamily: 'inherit',
                      resize: 'vertical',
                    }}
                  />
                </div>
              )}

              <div>
                <button
                  type="button"
                  disabled={isGeneratingScript}
                  onClick={handleGenerateScript}
                  style={{
                    padding: '12px 24px',
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: 700,
                    cursor: isGeneratingScript ? 'not-allowed' : 'pointer',
                  }}
                >
                  {isGeneratingScript ? '⚡ Analyzing & Structuring Scenes...' : '⚡ Generate Structured Scenes'}
                </button>
              </div>

              {/* Editable Scene Cards List */}
              {scenes.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '12px' }}>
                  <div style={{ fontWeight: 700, fontSize: '16px' }}>
                    Scene Breakdown ({scenes.length} Scenes)
                  </div>
                  {scenes.map((scene, idx) => (
                    <div
                      key={idx}
                      style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '10px',
                        padding: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 700, color: '#818cf8', fontSize: '13px' }}>
                          Scene {scene.sceneNumber}: {scene.heading} ({scene.durationSec}s)
                        </span>
                        <span style={{
                          fontSize: '11px',
                          textTransform: 'uppercase',
                          background: 'rgba(255,255,255,0.06)',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          color: '#a1a1aa',
                        }}>
                          {scene.sceneType}
                        </span>
                      </div>

                      <div>
                        <label style={{ fontSize: '11px', color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          Narration
                        </label>
                        <textarea
                          rows={2}
                          value={scene.narration}
                          onChange={(e) => handleUpdateScene(idx, 'narration', e.target.value)}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            background: 'rgba(0,0,0,0.2)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            color: '#ffffff',
                            borderRadius: '6px',
                            fontSize: '13px',
                            marginTop: '4px',
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: '11px', color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          Visual Prompt / B-Roll Target
                        </label>
                        <input
                          type="text"
                          value={scene.visualPrompt}
                          onChange={(e) => handleUpdateScene(idx, 'visualPrompt', e.target.value)}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            background: 'rgba(0,0,0,0.2)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            color: '#94a3b8',
                            borderRadius: '6px',
                            fontSize: '12px',
                            marginTop: '4px',
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '8px',
                    background: 'rgba(255,255,255,0.06)',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  ← Back to Voice
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentStep(4)}
                  style={{
                    padding: '12px 28px',
                    borderRadius: '8px',
                    background: '#6366f1',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '14px',
                    cursor: 'pointer',
                  }}
                >
                  Continue to Style & Camera →
                </button>
              </div>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────
              STEP 4: VIDEO STYLES & CAMERA FRAMING
          ───────────────────────────────────────────────────────────── */}
          {currentStep === 4 && (
            <div style={{
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '16px',
              padding: '28px',
              display: 'flex',
              flexDirection: 'column',
              gap: '28px',
            }}>
              <div>
                <h3 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 6px' }}>
                  Step 4: Select Video Style & Camera Setup
                </h3>
                <p style={{ fontSize: '14px', color: '#94a3b8', margin: 0 }}>
                  Choose from 5 distinct visual styles and configure presenter camera framing.
                </p>
              </div>

              {/* 5 Distinct Styles Selector */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '12px', color: '#e2e8f0' }}>
                  Production Style
                </label>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
                  gap: '14px',
                }}>
                  {[
                    {
                      id: 'PODCAST',
                      title: 'PODCAST',
                      desc: 'Professional talking-head podcast with studio lighting, mic aesthetic, and subtle camera drift.',
                      icon: '🎙️',
                    },
                    {
                      id: 'VLOG',
                      title: 'VLOG',
                      desc: 'Personal YouTube vlog with lifestyle cutaways, dynamic transitions, and casual pacing.',
                      icon: '📹',
                    },
                    {
                      id: 'EDUCATIONAL',
                      title: 'EDUCATIONAL',
                      desc: 'Explainer / documentary format with presenter framing, educational graphics, and charts.',
                      icon: '🎓',
                    },
                    {
                      id: 'NEWS',
                      title: 'NEWS / COMMENTARY',
                      desc: 'Presenter-led commentary with newsroom split-screens, headlines, and supporting B-roll.',
                      icon: '📰',
                    },
                    {
                      id: 'STORYTELLING',
                      title: 'STORYTELLING',
                      desc: 'Cinematic storytelling with dramatic presenter introduction, moody lighting, and slow camera pans.',
                      icon: '🎬',
                    },
                  ].map((style) => (
                    <div
                      key={style.id}
                      onClick={() => setSelectedStyle(style.id as any)}
                      style={{
                        padding: '18px',
                        borderRadius: '12px',
                        background: selectedStyle === style.id ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255,255,255,0.03)',
                        border: selectedStyle === style.id ? '2px solid #6366f1' : '1px solid rgba(255,255,255,0.08)',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ fontSize: '24px' }}>{style.icon}</div>
                      <div style={{ fontWeight: 700, fontSize: '14px', color: selectedStyle === style.id ? '#ffffff' : '#e2e8f0' }}>
                        {style.title}
                      </div>
                      <div style={{ fontSize: '12px', color: '#94a3b8', lineHeight: 1.4 }}>
                        {style.desc}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Aspect Ratio & Camera Controls */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '20px',
                paddingTop: '16px',
                borderTop: '1px solid rgba(255,255,255,0.08)',
              }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                    Aspect Ratio
                  </label>
                  <select
                    value={aspectRatio}
                    onChange={(e) => setAspectRatio(e.target.value as any)}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#181824', border: '1px solid rgba(255,255,255,0.12)', color: '#ffffff' }}
                  >
                    <option value="16:9">16:9 Standard YouTube (1920x1080)</option>
                    <option value="9:16">9:16 Shorts / Reels (1080x1920)</option>
                    <option value="1:1">1:1 Square (1080x1080)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                    Presenter Position
                  </label>
                  <select
                    value={presenterPosition}
                    onChange={(e) => setPresenterPosition(e.target.value as any)}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#181824', border: '1px solid rgba(255,255,255,0.12)', color: '#ffffff' }}
                  >
                    <option value="center">Center</option>
                    <option value="left">Left (Lower Third)</option>
                    <option value="right">Right</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                    Camera Motion
                  </label>
                  <select
                    value={cameraMotion}
                    onChange={(e) => setCameraMotion(e.target.value as any)}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#181824', border: '1px solid rgba(255,255,255,0.12)', color: '#ffffff' }}
                  >
                    <option value="cinematic">Cinematic Drift</option>
                    <option value="slow_zoom">Slow Zoom</option>
                    <option value="push_in">Dynamic Push-in</option>
                    <option value="pull_out">Smooth Pull-out</option>
                    <option value="static">Static Locked Camera</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                    Captions Overlay
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', height: '42px' }}>
                    <input
                      type="checkbox"
                      checked={captionsEnabled}
                      onChange={(e) => setCaptionsEnabled(e.target.checked)}
                      id="captionsToggle"
                      style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                    />
                    <label htmlFor="captionsToggle" style={{ fontSize: '13px', cursor: 'pointer' }}>
                      Enabled (Clean YouTube style)
                    </label>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                    Background Music & Auto-Ducking
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <input
                      type="range"
                      min={0}
                      max={50}
                      value={musicEnabled ? musicVolume : 0}
                      onChange={(e) => {
                        setMusicVolume(Number(e.target.value));
                        setMusicEnabled(Number(e.target.value) > 0);
                      }}
                      style={{ flex: 1 }}
                    />
                    <span style={{ fontSize: '12px', color: '#94a3b8', width: '38px' }}>
                      {musicEnabled ? `${musicVolume}%` : 'Off'}
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '8px',
                    background: 'rgba(255,255,255,0.06)',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  ← Back to Content
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentStep(5)}
                  style={{
                    padding: '12px 28px',
                    borderRadius: '8px',
                    background: '#6366f1',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '14px',
                    cursor: 'pointer',
                  }}
                >
                  Continue to Preview & Render →
                </button>
              </div>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────
              STEP 5: PREVIEW & FINAL RENDER
          ───────────────────────────────────────────────────────────── */}
          {currentStep === 5 && (
            <div style={{
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '16px',
              padding: '28px',
              display: 'flex',
              flexDirection: 'column',
              gap: '24px',
            }}>
              <div>
                <h3 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 6px' }}>
                  Step 5: Review & Render Final Video
                </h3>
                <p style={{ fontSize: '14px', color: '#94a3b8', margin: 0 }}>
                  Review your project specifications, estimated duration, and trigger the background rendering compositor.
                </p>
              </div>

              {/* Specs Summary Table */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '12px',
                background: 'rgba(0,0,0,0.3)',
                padding: '20px',
                borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.06)',
              }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#71717a', textTransform: 'uppercase' }}>Resolution</div>
                  <div style={{ fontWeight: 700, fontSize: '14px', marginTop: '2px' }}>
                    {aspectRatio === '16:9' ? '1920x1080 (16:9)' : aspectRatio === '9:16' ? '1080x1920 (9:16)' : '1080x1080 (1:1)'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#71717a', textTransform: 'uppercase' }}>Production Style</div>
                  <div style={{ fontWeight: 700, fontSize: '14px', marginTop: '2px' }}>{selectedStyle}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#71717a', textTransform: 'uppercase' }}>Presenter Identity</div>
                  <div style={{ fontWeight: 700, fontSize: '14px', marginTop: '2px', color: photoPreview ? '#4ade80' : '#f59e0b' }}>
                    {photoPreview ? 'Verified Photo Attached' : 'Studio Presenter Stills'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#71717a', textTransform: 'uppercase' }}>Voice Track</div>
                  <div style={{ fontWeight: 700, fontSize: '14px', marginTop: '2px', color: '#818cf8' }}>
                    {voiceLabel}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#71717a', textTransform: 'uppercase' }}>Estimated Duration</div>
                  <div style={{ fontWeight: 700, fontSize: '14px', marginTop: '2px' }}>
                    {scriptStats.durationFormatted} ({scenes.length} Scenes)
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#71717a', textTransform: 'uppercase' }}>Avatar Status</div>
                  <div style={{ fontWeight: 700, fontSize: '14px', marginTop: '2px', color: '#c084fc' }}>
                    Standard Presenter Studio Mode
                  </div>
                </div>
              </div>

              {/* Live Background Job Monitor */}
              {activeProject && (
                <div style={{
                  background: 'rgba(99, 102, 241, 0.08)',
                  border: '1px solid rgba(99, 102, 241, 0.3)',
                  borderRadius: '12px',
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontWeight: 700, fontSize: '16px' }}>
                      Status: {activeProject.current_stage_label || activeProject.status}
                    </div>
                    <span style={{
                      fontWeight: 800,
                      fontSize: '18px',
                      color: activeProject.status === 'COMPLETED' ? '#22c55e' : '#818cf8',
                    }}>
                      {activeProject.progress}%
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div style={{
                    width: '100%',
                    height: '10px',
                    background: 'rgba(255,255,255,0.08)',
                    borderRadius: '5px',
                    overflow: 'hidden',
                  }}>
                    <div style={{
                      width: `${activeProject.progress}%`,
                      height: '100%',
                      background: 'linear-gradient(90deg, #6366f1, #a855f7, #22c55e)',
                      transition: 'width 0.4s ease',
                    }} />
                  </div>

                  {/* HTML5 Video Player when COMPLETED */}
                  {activeProject.status === 'COMPLETED' && (
                    <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      <div style={{ fontWeight: 700, fontSize: '15px', color: '#22c55e' }}>
                        🎉 Your Personal AI Video is Ready!
                      </div>
                      <div style={{
                        maxWidth: aspectRatio === '9:16' ? '340px' : '640px',
                        borderRadius: '10px',
                        overflow: 'hidden',
                        background: '#000000',
                        boxShadow: '0 8px 30px rgba(0,0,0,0.6)',
                      }}>
                        <video
                          controls
                          src={`/api/personal-ai/assets/${activeProject.id}`}
                          style={{ width: '100%', display: 'block' }}
                        />
                      </div>
                      <div>
                        <a
                          href={`/api/personal-ai/assets/${activeProject.id}`}
                          download={`${topic || 'personal-video'}.mp4`}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '10px 20px',
                            borderRadius: '8px',
                            background: '#22c55e',
                            color: '#ffffff',
                            fontWeight: 700,
                            textDecoration: 'none',
                            fontSize: '13px',
                          }}
                        >
                          ⬇️ Download MP4 Video
                        </a>
                      </div>
                    </div>
                  )}

                  {activeProject.status === 'FAILED' && (
                    <div style={{ color: '#ef4444', fontSize: '14px' }}>
                      ❌ Error: {activeProject.error_message}
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setCurrentStep(4)}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '8px',
                    background: 'rgba(255,255,255,0.06)',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  ← Back to Style
                </button>

                <button
                  type="button"
                  disabled={isSubmittingJob || (activeProject && !['COMPLETED', 'FAILED'].includes(activeProject.status))}
                  onClick={handleStartGeneration}
                  style={{
                    padding: '14px 36px',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: 800,
                    fontSize: '15px',
                    cursor: isSubmittingJob ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 18px rgba(99, 102, 241, 0.4)',
                  }}
                >
                  {isSubmittingJob ? 'Initializing...' : '🚀 Render Final Personal Video'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 2: MY PROJECTS
      ───────────────────────────────────────────────────────────── */}
      {activeTab === 'projects' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>
              Personal Creator Projects ({projectsList.length})
            </h3>
            <button
              onClick={() => { setActiveTab('create'); setCurrentStep(1); }}
              style={{
                padding: '8px 18px',
                borderRadius: '8px',
                background: '#6366f1',
                color: '#ffffff',
                border: 'none',
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              + New Video
            </button>
          </div>

          {projectsList.length === 0 ? (
            <div style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '12px',
              padding: '48px 20px',
              textAlign: 'center',
              color: '#94a3b8',
            }}>
              <div style={{ fontSize: '36px', marginBottom: '12px' }}>🎬</div>
              <div style={{ fontWeight: 700, fontSize: '16px', color: '#ffffff' }}>No Personal Videos Yet</div>
              <p style={{ fontSize: '13px', margin: '6px 0 16px' }}>
                Create your first YouTube video using your own photo and voice.
              </p>
              <button
                onClick={() => { setActiveTab('create'); setCurrentStep(1); }}
                style={{
                  padding: '10px 24px',
                  borderRadius: '8px',
                  background: '#6366f1',
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Create Personal Video
              </button>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: '16px',
            }}>
              {projectsList.map((p) => (
                <div
                  key={p.id}
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '12px',
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ fontWeight: 700, fontSize: '16px', color: '#ffffff', lineHeight: 1.3 }}>
                      {p.title || p.topic}
                    </div>
                    <span style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: '6px',
                      background: p.status === 'COMPLETED' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(99, 102, 241, 0.15)',
                      color: p.status === 'COMPLETED' ? '#4ade80' : '#818cf8',
                    }}>
                      {p.status}
                    </span>
                  </div>

                  <div style={{ fontSize: '12px', color: '#94a3b8', display: 'flex', gap: '12px' }}>
                    <span>📐 {p.aspect_ratio}</span>
                    <span>🎭 {p.style}</span>
                    <span>⏱️ {p.duration ? `${Math.round(p.duration)}s` : 'Processing'}</span>
                  </div>

                  {p.status === 'COMPLETED' && (
                    <div style={{ marginTop: '6px' }}>
                      <video
                        controls
                        src={`/api/personal-ai/assets/${p.id}`}
                        style={{ width: '100%', borderRadius: '8px', maxHeight: '200px', background: '#000000' }}
                      />
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>
                      {new Date(p.created_at).toLocaleDateString()}
                    </span>
                    <button
                      onClick={async () => {
                        if (confirm('Delete this project?')) {
                          await fetch(`/api/personal-ai/projects/${p.id}`, { method: 'DELETE' });
                          fetchProjects();
                        }
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#ef4444',
                        fontSize: '12px',
                        cursor: 'pointer',
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 3: MY AVATAR
      ───────────────────────────────────────────────────────────── */}
      {activeTab === 'avatar' && (
        <div style={{
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '16px',
          padding: '32px',
          maxWidth: '680px',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '24px',
          textAlign: 'center',
        }}>
          <div>
            <h3 style={{ fontSize: '22px', fontWeight: 800, margin: '0 0 6px' }}>
              My Presenter Avatar
            </h3>
            <p style={{ fontSize: '14px', color: '#94a3b8', margin: 0 }}>
              Your active photo used to generate presenter clips across all video styles.
            </p>
          </div>

          <div style={{
            width: '180px',
            height: '180px',
            borderRadius: '50%',
            overflow: 'hidden',
            border: '4px solid #6366f1',
            boxShadow: '0 0 32px rgba(99, 102, 241, 0.35)',
            background: '#111118',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            {photoPreview ? (
              <img src={photoPreview} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ color: '#71717a', fontSize: '13px' }}>No photo uploaded</div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', maxWidth: '380px' }}>
            <label style={{
              display: 'block',
              padding: '12px 20px',
              borderRadius: '8px',
              background: '#6366f1',
              color: '#ffffff',
              fontWeight: 700,
              cursor: 'pointer',
              fontSize: '14px',
            }}>
              Upload New Photo
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handlePhotoSelect}
                style={{ display: 'none' }}
              />
            </label>
            <span style={{ fontSize: '12px', color: '#71717a' }}>
              Supported formats: JPG, JPEG, PNG, WEBP (front-facing clear lighting)
            </span>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 4: MY VOICE
      ───────────────────────────────────────────────────────────── */}
      {activeTab === 'voice' && (
        <div style={{
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '16px',
          padding: '32px',
          maxWidth: '680px',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
        }}>
          <div>
            <h3 style={{ fontSize: '22px', fontWeight: 800, margin: '0 0 6px' }}>
              My Voice Profile
            </h3>
            <p style={{ fontSize: '14px', color: '#94a3b8', margin: 0 }}>
              Manage your personal voice sample or record a fresh audio clip.
            </p>
          </div>

          {voicePreviewUrl && (
            <div style={{
              background: 'rgba(0,0,0,0.3)',
              borderRadius: '12px',
              padding: '20px',
              border: '1px solid rgba(255,255,255,0.08)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, fontSize: '15px' }}>Current Voice Audio</span>
                <span style={{ fontSize: '12px', color: '#818cf8', fontWeight: 600 }}>
                  {voiceLabel}
                </span>
              </div>
              <audio controls src={voicePreviewUrl} style={{ width: '100%' }} />
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
            <label style={{
              padding: '16px',
              borderRadius: '10px',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              cursor: 'pointer',
              textAlign: 'center',
              display: 'block',
            }}>
              <div style={{ fontSize: '24px', marginBottom: '6px' }}>📁</div>
              <div style={{ fontWeight: 700, fontSize: '14px' }}>Upload Audio File</div>
              <div style={{ fontSize: '12px', color: '#71717a', marginTop: '2px' }}>MP3, WAV, M4A</div>
              <input
                type="file"
                accept="audio/mp3,audio/wav,audio/m4a"
                onChange={handleVoiceFileSelect}
                style={{ display: 'none' }}
              />
            </label>

            <div
              onClick={isRecording ? stopRecording : startRecording}
              style={{
                padding: '16px',
                borderRadius: '10px',
                background: isRecording ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255,255,255,0.04)',
                border: isRecording ? '1px solid #ef4444' : '1px solid rgba(255,255,255,0.08)',
                cursor: 'pointer',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '24px', marginBottom: '6px' }}>
                {isRecording ? '⏹️' : '🎙️'}
              </div>
              <div style={{ fontWeight: 700, fontSize: '14px' }}>
                {isRecording ? `Stop Recording (${recordingDuration}s)` : 'Record from Mic'}
              </div>
              <div style={{ fontSize: '12px', color: '#71717a', marginTop: '2px' }}>
                {isRecording ? 'Click to finish' : 'Browser microphone'}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default function PersonalAiCreatorPage() {
  return (
    <React.Suspense fallback={
      <div style={{ padding: '60px 20px', textAlign: 'center', color: '#94a3b8' }}>
        <div style={{ fontSize: '32px', marginBottom: '12px' }}>✨</div>
        <div style={{ fontWeight: 700, fontSize: '18px', color: '#ffffff' }}>Loading Personal AI Creator Studio...</div>
      </div>
    }>
      <PersonalAiCreatorContent />
    </React.Suspense>
  );
}

