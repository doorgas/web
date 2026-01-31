import { NextRequest, NextResponse } from 'next/server';
import twilio, { validateRequest } from 'twilio';
import { db } from '@/lib/db';
import { twilioCallSessions } from '@/lib/schema';
import { eq } from 'drizzle-orm';

function toFormUrlEncodedParams(body: string) {
  const params = new URLSearchParams(body);
  const record: Record<string, string> = {};
  for (const [k, v] of params.entries()) record[k] = v;
  return record;
}

function xmlResponse(xml: string) {
  return new NextResponse(xml, {
    status: 200,
    headers: {
      'Content-Type': 'text/xml; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

export async function POST(request: NextRequest) {
  // Twilio sends x-www-form-urlencoded by default
  const rawBody = await request.text();
  const params = toFormUrlEncodedParams(rawBody);

  // Optional signature validation (recommended for production)
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const signature = request.headers.get('x-twilio-signature') || '';
  if (authToken && signature) {
    const isValid = validateRequest(authToken, signature, request.url, params);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid Twilio signature' }, { status: 403 });
    }
  }

  const toIdentity = params.To || params.to || '';
  const callSid = params.CallSid || '';
  const callId = params.callId || params.call_id || '';

  // Best-effort: attach Twilio CallSid to our stored call session and mark ringing.
  if (callId && callSid) {
    try {
      await db
        .update(twilioCallSessions)
        .set({ twilioCallSid: callSid, status: 'ringing' })
        .where(eq(twilioCallSessions.id, callId));
    } catch (e) {
      // Don’t block call routing on DB write
      console.error('Failed to update call session from Twilio webhook:', e);
    }
  }

  const VoiceResponse = twilio.twiml.VoiceResponse;
  const twiml = new VoiceResponse();

  if (!toIdentity) {
    twiml.say('Missing destination.');
    twiml.hangup();
    return xmlResponse(twiml.toString());
  }

  const dial = twiml.dial();
  dial.client(toIdentity);
  return xmlResponse(twiml.toString());
}

