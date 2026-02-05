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
  try {
    console.log('[Twilio Voice Webhook] Received request');
    // #region agent log
    console.log('[DEBUG:H1] voice/route.ts:26 - Webhook received request, URL:', request.url);
    // #endregion
    
    // Twilio sends x-www-form-urlencoded by default
    const rawBody = await request.text();
    const params = toFormUrlEncodedParams(rawBody);
    
    console.log('[Twilio Voice Webhook] Request params:', {
      To: params.To,
      From: params.From,
      CallSid: params.CallSid,
      callId: params.callId,
      conversationId: params.conversationId,
    });
    // #region agent log
    console.log('[DEBUG:H1] voice/route.ts:42 - Webhook params parsed:', { To: params.To, CallSid: params.CallSid, callId: params.callId });
    // #endregion

    // Optional signature validation (recommended for production)
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const signature = request.headers.get('x-twilio-signature') || '';
    if (authToken && signature) {
      const isValid = validateRequest(authToken, signature, request.url, params);
      if (!isValid) {
        console.error('[Twilio Voice Webhook] Invalid signature');
        return NextResponse.json({ error: 'Invalid Twilio signature' }, { status: 403 });
      }
    }

    const toIdentity = params.To || params.to || '';
    const callSid = params.CallSid || '';
    const callId = params.callId || params.call_id || '';
    
    console.log('[Twilio Voice Webhook] Extracted values:', { toIdentity, callSid, callId });

    // Best-effort: attach Twilio CallSid to our stored call session and mark ringing.
    if (callId && callSid) {
      try {
        console.log('[Twilio Voice Webhook] Updating call session:', callId);
        await db
          .update(twilioCallSessions)
          .set({ twilioCallSid: callSid, status: 'ringing' })
          .where(eq(twilioCallSessions.id, callId));
        console.log('[Twilio Voice Webhook] Call session updated successfully');
      } catch (e) {
        // Don't block call routing on DB write
        console.error('[Twilio Voice Webhook] Failed to update call session:', e);
      }
    }

    const VoiceResponse = twilio.twiml.VoiceResponse;
    const twiml = new VoiceResponse();

    if (!toIdentity) {
      console.error('[Twilio Voice Webhook] Missing destination identity');
      twiml.say('Missing destination.');
      twiml.hangup();
      return xmlResponse(twiml.toString());
    }

    console.log('[Twilio Voice Webhook] Dialing client:', toIdentity);
    // #region agent log
    console.log('[DEBUG:H1] voice/route.ts:82 - Dialing client:', toIdentity);
    // #endregion
    const dial = twiml.dial();
    dial.client(toIdentity);
    
    const twimlString = twiml.toString();
    console.log('[Twilio Voice Webhook] Returning TwiML:', twimlString);
    // #region agent log
    console.log('[DEBUG:H1] voice/route.ts:91 - Returning TwiML:', twimlString);
    // #endregion
    
    return xmlResponse(twimlString);
  } catch (error) {
    console.error('[Twilio Voice Webhook] Unexpected error:', error);
    
    // Return valid TwiML even on error to prevent connection issues
    const VoiceResponse = twilio.twiml.VoiceResponse;
    const twiml = new VoiceResponse();
    twiml.say('An error occurred. Please try again later.');
    twiml.hangup();
    return xmlResponse(twiml.toString());
  }
}
