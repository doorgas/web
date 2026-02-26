'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import DailyIframe from '@daily-co/daily-js';
import { Button } from '@/components/ui/button';
import { Phone, PhoneOff, Mic, MicOff } from 'lucide-react';

type CreateRoomResponse = {
  url: string;
  token: string;
  roomName?: string;
};

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

async function patchCallStatus(callId: string, status: string, duration?: number) {
  try {
    await fetch(`/api/chat/calls/${callId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, ...(duration != null && { duration }) }),
    });
  } catch (e) {
    console.warn('Failed to update call status:', e);
  }
}

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function VoiceClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const conversationId = searchParams.get('conversationId') || '';
  const callId = searchParams.get('callId') || '';
  const label = searchParams.get('label') || 'Voice call';

  const callObjectRef = useRef<ReturnType<typeof DailyIframe.createCallObject> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const joinStartRef = useRef<number>(0);
  const autoJoinedRef = useRef(false);

  const [status, setStatus] = useState<'idle' | 'joining' | 'joined' | 'leaving'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [duration, setDuration] = useState(0);
  const [participantCount, setParticipantCount] = useState(0);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    stopTimer();
    setDuration(0);
    joinStartRef.current = Date.now();
    timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
  }, [stopTimer]);

  const destroyCallObject = useCallback(async () => {
    const co = callObjectRef.current;
    if (!co) return;
    try {
      await co.leave().catch(() => {});
    } finally {
      try { co.destroy(); } catch {}
      callObjectRef.current = null;
    }
    stopTimer();
  }, [stopTimer]);

  const updateParticipants = useCallback(() => {
    const co = callObjectRef.current;
    if (!co) return;
    setParticipantCount(Object.keys(co.participants()).length);
  }, []);

  const join = useCallback(async () => {
    if (!conversationId) {
      setError('Missing conversationId.');
      return;
    }
    if (callObjectRef.current) return;

    setError(null);
    setStatus('joining');

    try {
      const { url, token } = await postJson<CreateRoomResponse>('/api/create-room', { conversationId });

      const callObject = DailyIframe.createCallObject({
        audioSource: true,
        videoSource: false,
      });

      callObject.on('joined-meeting', () => {
        setStatus('joined');
        startTimer();
        updateParticipants();
        if (callId) patchCallStatus(callId, 'answered');
      });
      callObject.on('left-meeting', () => {
        setStatus('idle');
        stopTimer();
        setParticipantCount(0);
      });
      callObject.on('participant-joined', updateParticipants);
      callObject.on('participant-left', updateParticipants);
      callObject.on('error', (e: any) => setError(e?.errorMsg || e?.message || 'Call error'));

      callObjectRef.current = callObject;
      await callObject.join({ url, token, startVideoOff: true, startAudioOff: false });
    } catch (e: any) {
      setError(e?.message || 'Failed to join call');
      setStatus('idle');
      await destroyCallObject();
    }
  }, [conversationId, callId, destroyCallObject, startTimer, stopTimer, updateParticipants]);

  const leave = useCallback(async () => {
    if (!callObjectRef.current) return;
    setStatus('leaving');
    setError(null);
    const elapsed = joinStartRef.current ? Math.round((Date.now() - joinStartRef.current) / 1000) : 0;
    if (callId) patchCallStatus(callId, 'ended', elapsed);
    await destroyCallObject();
    setStatus('idle');
  }, [callId, destroyCallObject]);

  const toggleMute = useCallback(() => {
    const co = callObjectRef.current;
    if (!co) return;
    const next = !muted;
    co.setLocalAudio(!next);
    setMuted(next);
  }, [muted]);

  useEffect(() => {
    if (conversationId && callId && !autoJoinedRef.current) {
      autoJoinedRef.current = true;
      join();
    }
  }, [conversationId, callId, join]);

  useEffect(() => {
    return () => { destroyCallObject(); };
  }, [destroyCallObject]);

  const isActive = status === 'joined';

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="mx-auto flex w-full max-w-md flex-col items-center gap-6 pt-12">
        <button
          onClick={() => { leave(); router.back(); }}
          className="self-start text-sm text-muted-foreground hover:text-foreground"
        >
          &larr; Back
        </button>

        <div className="flex w-full flex-col items-center gap-6 rounded-2xl border bg-card p-8 shadow-sm">
          <div
            className={`flex h-20 w-20 items-center justify-center rounded-full text-white text-2xl font-bold ${
              isActive ? 'bg-green-500 animate-pulse' : status === 'joining' ? 'bg-yellow-500 animate-pulse' : 'bg-gray-400'
            }`}
          >
            <Phone className="h-8 w-8" />
          </div>

          <div className="text-center">
            <div className="text-lg font-semibold">{label}</div>
            <div className="mt-1 text-sm text-muted-foreground">
              {status === 'idle' && 'Call ended'}
              {status === 'joining' && 'Connecting…'}
              {status === 'joined' && formatDuration(duration)}
              {status === 'leaving' && 'Ending call…'}
            </div>
            {isActive && participantCount > 1 && (
              <div className="mt-1 text-xs text-muted-foreground">
                {participantCount} in call
              </div>
            )}
          </div>

          {error && (
            <div className="w-full rounded-md border border-destructive/40 bg-destructive/10 p-3 text-center text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="flex items-center gap-4">
            {isActive && (
              <Button
                variant={muted ? 'destructive' : 'outline'}
                size="lg"
                className="h-14 w-14 rounded-full p-0"
                onClick={toggleMute}
                title={muted ? 'Unmute' : 'Mute'}
              >
                {muted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
              </Button>
            )}

            {(isActive || status === 'joining' || status === 'leaving') && (
              <Button
                variant="destructive"
                size="lg"
                className="h-14 w-14 rounded-full p-0"
                onClick={leave}
                disabled={status === 'leaving'}
                title="End call"
              >
                <PhoneOff className="h-6 w-6" />
              </Button>
            )}

            {status === 'idle' && (
              <Button variant="outline" onClick={() => router.back()}>
                Go back
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
