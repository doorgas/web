import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { generateVoiceToken } from '@/lib/twilio';

function sanitizeIdentityPart(value: string) {
  return value.replace(/[^A-Za-z0-9_]/g, '_').slice(0, 110);
}

function getTwilioIdentity(userId: string, userType?: string | null) {
  const safeId = sanitizeIdentityPart(userId);
  const prefix = userType === 'driver' ? 'driver' : 'user';
  return `${prefix}_${safeId}`.slice(0, 121);
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const identity = getTwilioIdentity(session.user.id, session.user.userType);
  const token = generateVoiceToken(identity);

  return NextResponse.json({ token, identity });
}

