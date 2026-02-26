'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import DailyIframe from '@daily-co/daily-js';
import { Phone, PhoneOff, Mic, MicOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

const POLL_INTERVAL_MS = 3000;

function createRingtone() {
  const ctx = new AudioContext();
  const gainNode = ctx.createGain();
  gainNode.gain.value = 0.3;
  gainNode.connect(ctx.destination);

  let stopped = false;
  let timeout: ReturnType<typeof setTimeout>;

  function ring() {
    if (stopped) return;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    osc1.type = 'sine';
    osc2.type = 'sine';
    osc1.frequency.value = 440;
    osc2.frequency.value = 480;
    osc1.connect(gainNode);
    osc2.connect(gainNode);
    osc1.start();
    osc2.start();
    osc1.stop(ctx.currentTime + 0.8);
    osc2.stop(ctx.currentTime + 0.8);
    timeout = setTimeout(() => {
      if (!stopped) ring();
    }, 2000);
  }

  ring();
  return {
    stop() {
      stopped = true;
      clearTimeout(timeout);
      ctx.close().catch(() => {});
    },
  };
}

type IncomingCall = {
  id: string;
  conversationId: string;
  callerId: string;
  callerName: string | null;
  status: string;
  createdAt: string;
};

type CreateRoomResponse = {
  url: string;
  token: string;
  roomName?: string;
};

async function patchCallStatus(callId: string, status: string, duration?: number) {
  try {
    await fetch(`/api/chat/calls/${callId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, ...(duration != null && { duration }) }),
    });
  } catch {}
}

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function IncomingCallPopup() {
  const { data: session } = useSession();

  // Polling state
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const dismissedCallsRef = useRef<Set<string>>(new Set());

  // In-call state
  const [callState, setCallState] = useState<'ringing' | 'joining' | 'joined' | 'idle'>('idle');
  const [muted, setMuted] = useState(false);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const callObjectRef = useRef<ReturnType<typeof DailyIframe.createCallObject> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const joinStartRef = useRef(0);

  // Poll for incoming calls
  useEffect(() => {
    if (!session?.user?.id) return;

    let mounted = true;
    const poll = async () => {
      try {
        const res = await fetch('/api/chat/calls/incoming');
        if (!res.ok) return;
        const data = await res.json();
        if (!mounted) return;

        if (data.call && !dismissedCallsRef.current.has(data.call.id)) {
          if (callState === 'idle') {
            setIncomingCall(data.call);
            setCallState('ringing');
          }
        } else if (callState === 'ringing') {
          setIncomingCall(null);
          setCallState('idle');
        }
      } catch {}
    };

    poll();
    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [session?.user?.id, callState]);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const destroyCallObject = useCallback(async () => {
    const co = callObjectRef.current;
    if (!co) return;
    try { await co.leave().catch(() => {}); } finally {
      try { co.destroy(); } catch {}
      callObjectRef.current = null;
    }
    stopTimer();
  }, [stopTimer]);

  const accept = useCallback(async () => {
    if (!incomingCall) return;
    setCallState('joining');
    setError(null);

    try {
      patchCallStatus(incomingCall.id, 'answered');

      const res = await fetch('/api/create-room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: incomingCall.conversationId }),
      });
      if (!res.ok) throw new Error('Failed to get room');
      const { url, token } = (await res.json()) as CreateRoomResponse;

      const callObject = DailyIframe.createCallObject();

      callObject.on('track-started', (ev: any) => {
        if (!ev?.participant || ev.participant.local) return;
        if (!ev.track || ev.track.kind !== 'audio') return;
        const id = `daily-audio-${ev.participant.session_id}`;
        let el = document.getElementById(id) as HTMLAudioElement | null;
        if (!el) { el = document.createElement('audio'); el.id = id; el.autoplay = true; document.body.appendChild(el); }
        el.srcObject = new MediaStream([ev.track]);
        el.play().catch(() => {});
      });
      callObject.on('track-stopped', (ev: any) => {
        if (!ev?.participant) return;
        document.getElementById(`daily-audio-${ev.participant.session_id}`)?.remove();
      });

      callObject.on('joined-meeting', () => {
        setCallState('joined');
        setDuration(0);
        joinStartRef.current = Date.now();
        timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
      });
      callObject.on('left-meeting', () => {
        setCallState('idle');
        stopTimer();
        document.querySelectorAll('audio[id^="daily-audio-"]').forEach((el) => el.remove());
      });
      callObject.on('participant-left', () => {
        const remaining = Object.keys(callObject.participants());
        if (remaining.length <= 1) {
          const elapsed = joinStartRef.current ? Math.round((Date.now() - joinStartRef.current) / 1000) : 0;
          if (incomingCall) {
            patchCallStatus(incomingCall.id, 'ended', elapsed);
            dismissedCallsRef.current.add(incomingCall.id);
          }
          callObject.leave().catch(() => {});
          try { callObject.destroy(); } catch {}
          callObjectRef.current = null;
          stopTimer();
          document.querySelectorAll('audio[id^="daily-audio-"]').forEach((el) => el.remove());
          setCallState('idle');
          setIncomingCall(null);
          setMuted(false);
          setDuration(0);
        }
      });
      callObject.on('error', (e: any) => {
        const msg = e?.errorMsg || e?.message || '';
        const lower = msg.toLowerCase();
        if (['transport', 'disconnected', 'ice', 'network'].some((p) => lower.includes(p))) return;
        setError(msg || 'Call error');
      });

      callObjectRef.current = callObject;
      await callObject.join({ url, token, startVideoOff: true, startAudioOff: false });
      callObject.setLocalVideo(false);
    } catch (e: any) {
      setError(e?.message || 'Failed to join call');
      setCallState('idle');
      setIncomingCall(null);
      await destroyCallObject();
    }
  }, [incomingCall, destroyCallObject, stopTimer]);

  const decline = useCallback(() => {
    if (incomingCall) {
      dismissedCallsRef.current.add(incomingCall.id);
      patchCallStatus(incomingCall.id, 'missed');
    }
    setIncomingCall(null);
    setCallState('idle');
  }, [incomingCall]);

  const hangUp = useCallback(async () => {
    if (incomingCall) {
      const elapsed = joinStartRef.current ? Math.round((Date.now() - joinStartRef.current) / 1000) : 0;
      patchCallStatus(incomingCall.id, 'ended', elapsed);
      dismissedCallsRef.current.add(incomingCall.id);
    }
    await destroyCallObject();
    setCallState('idle');
    setIncomingCall(null);
    setMuted(false);
    setDuration(0);
  }, [incomingCall, destroyCallObject]);

  const toggleMute = useCallback(() => {
    const co = callObjectRef.current;
    if (!co) return;
    const next = !muted;
    co.setLocalAudio(!next);
    setMuted(next);
  }, [muted]);

  // Ringtone: play while ringing, stop on accept/decline/unmount
  const ringtoneRef = useRef<{ stop: () => void } | null>(null);
  useEffect(() => {
    if (callState === 'ringing') {
      try {
        ringtoneRef.current = createRingtone();
      } catch {}
    } else {
      ringtoneRef.current?.stop();
      ringtoneRef.current = null;
    }
    return () => {
      ringtoneRef.current?.stop();
      ringtoneRef.current = null;
    };
  }, [callState]);

  // Cleanup on unmount
  useEffect(() => {
    return () => { destroyCallObject(); };
  }, [destroyCallObject]);

  // Nothing to show
  if (callState === 'idle' && !incomingCall) return null;

  const callerLabel = incomingCall?.callerName || 'Support';

  // --- Ringing popup ---
  if (callState === 'ringing' && incomingCall) {
    return (
      <div className="fixed inset-x-0 top-0 z-[9999] flex justify-center p-4 pointer-events-none">
        <div className="pointer-events-auto w-full max-w-sm animate-in slide-in-from-top-4 duration-300 rounded-2xl border bg-white p-5 shadow-2xl">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-600 animate-pulse">
              <Phone className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-gray-900 truncate">Incoming voice call</div>
              <div className="text-sm text-gray-500 truncate">{callerLabel}</div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                className="h-10 w-10 rounded-full bg-green-600 p-0 hover:bg-green-700"
                onClick={accept}
                title="Accept"
              >
                <Phone className="h-5 w-5 text-white" />
              </Button>
              <Button
                size="sm"
                variant="destructive"
                className="h-10 w-10 rounded-full p-0"
                onClick={decline}
                title="Decline"
              >
                <PhoneOff className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- In-call bar (joining / joined) ---
  if (callState === 'joining' || callState === 'joined') {
    return (
      <div className="fixed inset-x-0 top-0 z-[9999] flex justify-center p-4 pointer-events-none">
        <div className="pointer-events-auto w-full max-w-sm rounded-2xl border bg-white p-4 shadow-2xl">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white ${
              callState === 'joined' ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'
            }`}>
              <Phone className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-gray-900 truncate">{callerLabel}</div>
              <div className="text-xs text-gray-500">
                {callState === 'joining' ? 'Connecting…' : formatDuration(duration)}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {callState === 'joined' && (
                <button
                  onClick={toggleMute}
                  className={`flex h-9 w-9 items-center justify-center rounded-full transition ${
                    muted ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  title={muted ? 'Unmute' : 'Mute'}
                >
                  {muted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </button>
              )}
              <button
                onClick={hangUp}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-red-600 text-white hover:bg-red-700 transition"
                title="End call"
              >
                <PhoneOff className="h-4 w-4" />
              </button>
            </div>
          </div>
          {error && (
            <div className="mt-2 text-xs text-red-600">{error}</div>
          )}
        </div>
      </div>
    );
  }

  return null;
}
