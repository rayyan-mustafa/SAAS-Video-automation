'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { InteractiveWorkflowCanvas } from '@/components/InteractiveWorkflowCanvas';
import { useToast } from '@/components/Toast';

export default function WorkflowPage() {
  const toast = useToast();
  const [channels, setChannels] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedChannelId, setSelectedChannelId] = useState<string>('');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [chanRes, projRes] = await Promise.all([
        fetch('/api/channels'),
        fetch('/api/projects'),
      ]);

      if (chanRes.ok) {
        const cData = await chanRes.json();
        setChannels(cData.channels || []);
        if (cData.channels?.length > 0) {
          setSelectedChannelId(cData.channels[0].id);
        }
      }

      if (projRes.ok) {
        const pData = await projRes.json();
        setProjects(pData.projects || []);
        if (pData.projects?.length > 0) {
          setSelectedProjectId(pData.projects[0].id);
        }
      }
    } catch (e: any) {
      console.error('Failed to load workflow data:', e);
      toast.error('Failed to load workflow metadata');
    } finally {
      setLoading(false);
    }
  };

  const activeChannel = channels.find((c) => c.id === selectedChannelId) || channels[0];
  const activeProject = projects.find((p) => p.id === selectedProjectId) || projects[0];

  return (
    <div style={{ width: '100%', height: 'calc(100vh - 120px)', minHeight: '520px', display: 'flex', flexDirection: 'column' }}>
      {/* Main Interactive Workflow Canvas */}
      <InteractiveWorkflowCanvas
        mode={activeProject ? 'live' : 'simulation'}
        projectData={activeProject || (activeChannel ? { channel_niche: activeChannel.niche, channel_voice: activeChannel.voice } : undefined)}
        currentStage={activeProject?.current_stage || 'SCRIPT'}
        projectStatus={activeProject?.status || 'COMPLETED'}
        title={activeProject ? `Live Topology: ${activeProject.topic}` : 'Autonomous YouTube Production Graph'}
        subtitle="Click any node to inspect real parameters, payloads, models, and previews"
      />
    </div>
  );
}
