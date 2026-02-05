import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';

/**
 * Test endpoint to verify TwiML generation
 * Access: GET /api/twilio/voice-test?to=user_123
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const toIdentity = searchParams.get('to') || 'test_user';

  const VoiceResponse = twilio.twiml.VoiceResponse;
  const twiml = new VoiceResponse();

  if (!toIdentity) {
    twiml.say('Missing destination.');
    twiml.hangup();
  } else {
    const dial = twiml.dial();
    dial.client(toIdentity);
  }

  return new NextResponse(twiml.toString(), {
    status: 200,
    headers: {
      'Content-Type': 'text/xml; charset=utf-8',
    },
  });
}

/**
 * Diagnostic endpoint to test webhook configuration
 * Returns JSON with configuration status
 */
export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';
    let params: Record<string, string> = {};

    if (contentType.includes('application/x-www-form-urlencoded')) {
      const body = await request.text();
      const urlParams = new URLSearchParams(body);
      for (const [k, v] of urlParams.entries()) {
        params[k] = v;
      }
    } else if (contentType.includes('application/json')) {
      params = await request.json();
    }

    const diagnostic = {
      success: true,
      message: 'Webhook endpoint is accessible',
      receivedParams: params,
      requiredEnvVars: {
        TWILIO_ACCOUNT_SID: !!process.env.TWILIO_ACCOUNT_SID,
        TWILIO_API_KEY: !!process.env.TWILIO_API_KEY,
        TWILIO_API_SECRET: !!process.env.TWILIO_API_SECRET,
        TWILIO_TWIML_APP_SID: !!process.env.TWILIO_TWIML_APP_SID,
      },
      sampleTwiML: '<Response><Dial><Client>test_user</Client></Dial></Response>',
    };

    return NextResponse.json(diagnostic);
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
