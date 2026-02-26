'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Phone, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface VoiceCallControlsProps {
  conversationId: string;
  toIdentity: string;
  toLabel: string;
}

export default function VoiceCallControls({
  conversationId,
  toIdentity,
  toLabel,
}: VoiceCallControlsProps) {
  const router = useRouter();
  const [starting, setStarting] = useState(false);

  const canStartCall = useMemo(() => Boolean(conversationId) && !starting, [conversationId, starting]);

  const startVoiceCall = async () => {
    if (!conversationId || starting) return;
    setStarting(true);
    try {
      const res = await fetch('/api/chat/calls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId }),
      });
      if (!res.ok) throw new Error('Failed to create call session');
      const data = await res.json();
      const callId = data.id;

      const qs = new URLSearchParams({
        conversationId,
        callId,
        label: toLabel || '',
      });
      router.push(`/voice?${qs.toString()}`);
    } catch (e) {
      console.error('Failed to start call:', e);
      setStarting(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        size="sm"
        onClick={startVoiceCall}
        disabled={!canStartCall}
        title={`Start voice call with ${toLabel}`}
      >
        {starting ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <Phone className="w-5 h-5" />
        )}
      </Button>
    </div>
  );
}
