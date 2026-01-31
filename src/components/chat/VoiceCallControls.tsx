'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Device, Call } from '@twilio/voice-sdk';
import { Phone, PhoneOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

type CallUiState = 'idle' | 'ready' | 'calling' | 'in_call' | 'incoming';

interface VoiceCallControlsProps {
  conversationId: string;
  toIdentity: string;
  toLabel: string;
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export default function VoiceCallControls({
  conversationId,
  toIdentity,
  toLabel,
}: VoiceCallControlsProps) {
  const deviceRef = useRef<Device | null>(null);
  const activeCallRef = useRef<Call | null>(null);
  const currentCallIdRef = useRef<string | null>(null);

  const [uiState, setUiState] = useState<CallUiState>('idle');
  const [incomingCall, setIncomingCall] = useState<Call | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canStartCall = useMemo(() => Boolean(conversationId && toIdentity), [conversationId, toIdentity]);

  const patchCallStatus = useCallback(async (callId: string, status: string, duration?: number) => {
    try {
      await fetchJson(`/api/chat/calls/${callId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, ...(duration != null ? { duration } : {}) }),
      });
    } catch (e) {
      console.error('Failed to patch call status:', e);
    }
  }, []);

  const wireCallEvents = useCallback(
    (call: Call, callId: string) => {
      const startedAt = Date.now();

      call.on('accept', () => {
        setUiState('in_call');
        patchCallStatus(callId, 'answered');
      });

      call.on('disconnect', () => {
        setUiState('ready');
        const durationSec = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
        patchCallStatus(callId, 'ended', durationSec);
        currentCallIdRef.current = null;
        activeCallRef.current = null;
        setIncomingCall(null);
      });

      call.on('cancel', () => {
        setUiState('ready');
        patchCallStatus(callId, 'missed');
        currentCallIdRef.current = null;
        activeCallRef.current = null;
        setIncomingCall(null);
      });

      call.on('reject', () => {
        setUiState('ready');
        patchCallStatus(callId, 'missed');
        currentCallIdRef.current = null;
        activeCallRef.current = null;
        setIncomingCall(null);
      });

      call.on('error', (err) => {
        console.error('Twilio call error:', err);
        setError(err?.message || 'Call error');
        setUiState('ready');
      });
    },
    [patchCallStatus]
  );

  const ensureDevice = useCallback(async () => {
    if (deviceRef.current) return deviceRef.current;

    const { token } = await fetchJson<{ token: string; identity: string }>('/api/twilio/voice-token');
    const device = new Device(token, {
      closeProtection: true,
      logLevel: 'warn',
    });

    device.on('registered', () => setUiState((s) => (s === 'idle' ? 'ready' : s)));
    device.on('error', (err) => {
      console.error('Twilio device error:', err);
      setError(err?.message || 'Device error');
      setUiState('idle');
    });

    device.on('incoming', async (call: Call) => {
      if (activeCallRef.current) {
        // Busy – reject extra calls.
        call.reject();
        return;
      }

      activeCallRef.current = call;
      setIncomingCall(call);
      setUiState('incoming');

      const callId = (call as any)?.parameters?.callId as string | undefined;
      if (callId) {
        currentCallIdRef.current = callId;
        patchCallStatus(callId, 'ringing');
        wireCallEvents(call, callId);
      } else {
        // Still wire events for cleanup, but can’t patch without our callId
        wireCallEvents(call, '');
      }
    });

    // Register must be initiated by a user gesture in many browsers.
    await device.register();
    deviceRef.current = device;
    return device;
  }, [patchCallStatus, wireCallEvents]);

  const startOutgoingCall = useCallback(async () => {
    if (!canStartCall) return;
    if (activeCallRef.current) return;

    setError(null);
    setUiState('calling');

    try {
      const device = await ensureDevice();

      const callSession = await fetchJson<{ id: string }>(`/api/chat/calls`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId, callType: 'voice' }),
      });

      const callId = callSession.id;
      currentCallIdRef.current = callId;

      const call = await device.connect({
        params: {
          To: toIdentity,
          conversationId,
          callId,
        },
      });

      activeCallRef.current = call;
      wireCallEvents(call, callId);
    } catch (e: any) {
      console.error(e);
      setError(e?.message || 'Failed to start call');
      setUiState('idle');
    }
  }, [canStartCall, conversationId, ensureDevice, toIdentity, wireCallEvents]);

  const hangup = useCallback(() => {
    try {
      activeCallRef.current?.disconnect();
      deviceRef.current?.disconnectAll();
    } catch (e) {
      console.error('Hangup error:', e);
    }
  }, []);

  const acceptIncoming = useCallback(async () => {
    if (!incomingCall) return;
    try {
      incomingCall.accept();
    } catch (e) {
      console.error('Accept error:', e);
    }
  }, [incomingCall]);

  const rejectIncoming = useCallback(async () => {
    if (!incomingCall) return;
    try {
      incomingCall.reject();
    } catch (e) {
      console.error('Reject error:', e);
    } finally {
      setIncomingCall(null);
      setUiState('ready');
    }
  }, [incomingCall]);

  // Cleanup device on unmount
  useEffect(() => {
    return () => {
      try {
        deviceRef.current?.destroy();
      } catch {}
      deviceRef.current = null;
      activeCallRef.current = null;
      currentCallIdRef.current = null;
    };
  }, []);

  return (
    <>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={startOutgoingCall}
          disabled={!canStartCall || uiState === 'calling' || uiState === 'in_call' || uiState === 'incoming'}
          title={`Call ${toLabel}`}
        >
          <Phone className="w-5 h-5" />
        </Button>

        {(uiState === 'calling' || uiState === 'in_call') && (
          <Button variant="ghost" size="sm" onClick={hangup} title="Hang up">
            <PhoneOff className="w-5 h-5 text-red-600" />
          </Button>
        )}
      </div>

      <AlertDialog open={uiState === 'incoming'}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Incoming call</AlertDialogTitle>
            <AlertDialogDescription>
              {toLabel ? `Call related to ${toLabel}.` : 'You have an incoming call.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={rejectIncoming}>Decline</AlertDialogCancel>
            <AlertDialogAction onClick={acceptIncoming}>Answer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {error && (
        <div className="mt-2 text-xs text-red-600">
          {error}
        </div>
      )}
    </>
  );
}

