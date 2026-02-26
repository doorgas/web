import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { randomUUID } from 'crypto';

type DailyRoom = {
  name: string;
  url: string;
};

function sanitizeRoomNamePart(value: string) {
  return value.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 110);
}

async function dailyFetch<T>(path: string, init: RequestInit): Promise<{ ok: boolean; status: number; json?: T; text?: string }> {
  const res = await fetch(`https://api.daily.co/v1${path}`, init);
  const text = await res.text().catch(() => '');
  try {
    const json = text ? (JSON.parse(text) as T) : undefined;
    return { ok: res.ok, status: res.status, json, text };
  } catch {
    return { ok: res.ok, status: res.status, text };
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const apiKey = process.env.DAILY_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'DAILY_API_KEY is not set' }, { status: 500 });
    }

    const body = await request.json().catch(() => ({} as any));
    const conversationId = typeof body?.conversationId === 'string' ? body.conversationId : undefined;

    const roomName = conversationId
      ? `dg_conv_${sanitizeRoomNamePart(conversationId)}`.slice(0, 128)
      : `dg_${sanitizeRoomNamePart(randomUUID())}`.slice(0, 128);

    const nowSec = Math.floor(Date.now() / 1000);
    const roomExpSec = nowSec + 2 * 60 * 60; // 2 hours
    const tokenExpSec = nowSec + 60 * 60; // 1 hour

    const headers = {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    };

    const createRoomRes = await dailyFetch<any>('/rooms', {
      method: 'POST',
      headers,
      cache: 'no-store',
      body: JSON.stringify({
        name: roomName,
        privacy: 'private',
        properties: { exp: roomExpSec },
      }),
    });

    const roomAlreadyExists =
      createRoomRes.status === 409 ||
      (createRoomRes.json as any)?.error === 'invalid-request-error' &&
        typeof (createRoomRes.json as any)?.info === 'string' &&
        (createRoomRes.json as any).info.includes('already exists');

    let room: DailyRoom | null = null;
    if (createRoomRes.ok && createRoomRes.json?.name && createRoomRes.json?.url) {
      room = { name: createRoomRes.json.name, url: createRoomRes.json.url };
    } else if (roomAlreadyExists) {
      const getRoomRes = await dailyFetch<any>(`/rooms/${encodeURIComponent(roomName)}`, {
        method: 'GET',
        headers,
        cache: 'no-store',
      });
      if (!getRoomRes.ok || !getRoomRes.json?.name || !getRoomRes.json?.url) {
        return NextResponse.json(
          { error: 'Failed to fetch existing room', details: getRoomRes.text },
          { status: 500 }
        );
      }
      room = { name: getRoomRes.json.name, url: getRoomRes.json.url };
    } else {
      return NextResponse.json(
        { error: 'Failed to create room', details: createRoomRes.text },
        { status: 500 }
      );
    }

    const tokenRes = await dailyFetch<{ token: string }>('/meeting-tokens', {
      method: 'POST',
      headers,
      cache: 'no-store',
      body: JSON.stringify({
        properties: {
          room_name: room.name,
          exp: tokenExpSec,
          user_id: session.user.id.slice(0, 36),
          user_name: session.user.name || 'User',
          is_owner: false,
          start_video_off: true,
          start_audio_off: false,
          enable_screenshare: false,
          permissions: {
            canSend: ['audio'],
          },
        },
      }),
    });

    if (!tokenRes.ok || !tokenRes.json?.token) {
      return NextResponse.json(
        { error: 'Failed to create meeting token', details: tokenRes.text },
        { status: 500 }
      );
    }

    return NextResponse.json({
      url: room.url,
      token: tokenRes.json.token,
      roomName: room.name,
    });
  } catch (error) {
    console.error('Error creating Daily room/token:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

