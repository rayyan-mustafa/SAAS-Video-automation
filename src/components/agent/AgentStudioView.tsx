'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { AgentChatPanel } from './AgentChatPanel';
import { ScriptReviewPanel } from './ScriptReviewPanel';
import { VideoPreviewPanel } from './VideoPreviewPanel';
import { CreditEstimateBar } from './CreditEstimateBar';
import { QuickStartChips } from './QuickStartChips';
import { AgentMessage, AgentScript, InterviewQuestion, AgentConfig } from '@/lib/agent/types';

interface AgentStudioViewProps {
  initialPrompt?: string;
  className?: string;
}

export const AgentStudioView: React.FC<AgentStudioViewProps> = ({
  initialPrompt = '',
  className = '',
}) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const promptFromUrl = searchParams.get('prompt') || initialPrompt;

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<InterviewQuestion | null>(null);
  const [readyForScript, setReadyForScript] = useState<boolean>(false);
  const [currentScript, setCurrentScript] = useState<AgentScript | null>(null);
  const [activeRightTab, setActiveRightTab] = useState<'script' | 'preview'>('script');
  const [previewData, setPreviewData] = useState<{ projectId?: string; previewUrl?: string } | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [creditEstimate, setCreditEstimate] = useState<{
    totalCredits: number;
    sceneCreditTotal: number;
    voiceCredits: number;
    thumbnailCredits: number;
  }>({
    totalCredits: 8,
    sceneCreditTotal: 7,
    voiceCredits: 0,
    thumbnailCredits: 1,
  });

  // 1. Auto-start session if prompt is provided
  useEffect(() => {
    if (promptFromUrl && !sessionId) {
      handleSendMessage(promptFromUrl);
    }
  }, [promptFromUrl]);

  // 2. Chat message dispatch
  const handleSendMessage = async (text: string) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          message: text,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSessionId(data.sessionId);
        setCurrentQuestion(data.question);
        setReadyForScript(data.readyForScript);
        if (data.history) setMessages(data.history);
      }
    } catch (err) {
      console.error('[AgentStudioView] Chat error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Question Option Selection
  const handleSelectOption = async (field: string, value: string) => {
    if (!sessionId) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          field,
          selectedOption: value,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setCurrentQuestion(data.question);
        setReadyForScript(data.readyForScript);
        if (data.history) setMessages(data.history);
      }
    } catch (err) {
      console.error('[AgentStudioView] Option select error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // 4. Script Generation
  const handleGenerateScript = async () => {
    if (!sessionId) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/agent/script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });
      const data = await res.json();
      if (data.success && data.script) {
        setCurrentScript(data.script);
        setReadyForScript(false);
        if (data.estimate) {
          setCreditEstimate({
            totalCredits: data.estimate.totalCredits,
            sceneCreditTotal: data.estimate.sceneCreditTotal,
            voiceCredits: data.estimate.voiceCredits,
            thumbnailCredits: data.estimate.thumbnailCredits,
          });
        }
        // Refresh message history
        const chatRes = await fetch(`/api/agent/chat?sessionId=${sessionId}`);
        const chatData = await chatRes.json();
        if (chatData.history) setMessages(chatData.history);
      }
    } catch (err) {
      console.error('[AgentStudioView] Script generation error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // 5. Scene Refinement
  const handleRefineScene = async (sceneIndex: number, instruction: string) => {
    if (!sessionId) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/agent/refine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          instruction,
          sceneIndex,
        }),
      });
      const data = await res.json();
      if (data.success && data.updatedScript) {
        setCurrentScript(data.updatedScript);
        if (data.estimate) {
          setCreditEstimate({
            totalCredits: data.estimate.totalCredits,
            sceneCreditTotal: data.estimate.sceneCreditTotal,
            voiceCredits: data.estimate.voiceCredits,
            thumbnailCredits: data.estimate.thumbnailCredits,
          });
        }
        // Refresh chat history
        const chatRes = await fetch(`/api/agent/chat?sessionId=${sessionId}`);
        const chatData = await chatRes.json();
        if (chatData.history) setMessages(chatData.history);
      }
    } catch (err) {
      console.error('[AgentStudioView] Scene refine error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // 6. Generate Video Preview
  const handleGeneratePreview = async () => {
    if (!sessionId) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/agent/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });
      const data = await res.json();
      if (data.success) {
        setPreviewData({
          projectId: data.projectId,
          previewUrl: data.previewUrl,
        });
        setActiveRightTab('preview');
        // Refresh chat
        const chatRes = await fetch(`/api/agent/chat?sessionId=${sessionId}`);
        const chatData = await chatRes.json();
        if (chatData.history) setMessages(chatData.history);
      } else {
        alert(data.error || 'Failed to generate preview');
      }
    } catch (err) {
      console.error('[AgentStudioView] Preview error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Top Banner: Quick chips and Credit Quote */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white p-4 rounded-3xl border border-purple-100 shadow-sm">
        <QuickStartChips onSelectChip={(starter) => handleSendMessage(starter)} />
        <CreditEstimateBar
          totalCredits={creditEstimate.totalCredits}
          sceneCredits={creditEstimate.sceneCreditTotal}
          voiceCredits={creditEstimate.voiceCredits}
          thumbnailCredits={creditEstimate.thumbnailCredits}
          userBalance={300}
        />
      </div>

      {/* Main Dual-Pane Studio Canvas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 h-[calc(100vh-220px)] min-h-[600px]">
        {/* Left Pane: Agent Chat & Adaptive Interview */}
        <div className="lg:col-span-5 h-full">
          <AgentChatPanel
            messages={messages}
            currentQuestion={currentQuestion}
            readyForScript={readyForScript}
            isLoading={isLoading}
            onSendMessage={handleSendMessage}
            onSelectOption={handleSelectOption}
            onGenerateScript={handleGenerateScript}
          />
        </div>

        {/* Right Pane: Script or Video Preview */}
        <div className="lg:col-span-7 h-full">
          {activeRightTab === 'preview' && currentScript ? (
            <VideoPreviewPanel
              script={currentScript}
              previewUrl={previewData?.previewUrl}
              projectId={previewData?.projectId}
              onBackToScript={() => setActiveRightTab('script')}
              onGenerateFinal={() => alert('Final video composition dispatched! Background worker is composing.')}
              onRefineScene={handleRefineScene}
            />
          ) : (
            <ScriptReviewPanel
              script={currentScript}
              isLoading={isLoading}
              onRefineScene={handleRefineScene}
              onGeneratePreview={handleGeneratePreview}
              onGenerateFinal={() => alert('Final video composition dispatched! Background worker is composing.')}
            />
          )}
        </div>
      </div>
    </div>
  );
};
