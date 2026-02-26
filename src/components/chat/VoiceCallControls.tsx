'use client';

import React, { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Phone } from 'lucide-react';
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
  const canStartCall = useMemo(() => Boolean(conversationId), [conversationId]);

  const openVoiceCall = () => {
    const qs = new URLSearchParams({
      conversationId,
      label: toLabel || '',
    });
    router.push(`/voice?${qs.toString()}`);
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={openVoiceCall}
          disabled={!canStartCall}
          title={`Start voice call with ${toLabel}`}
        >
          <Phone className="w-5 h-5" />
        </Button>
      </div>
    </>
  );
}

