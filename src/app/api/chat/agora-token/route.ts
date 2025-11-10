import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Agora credentials (you can move these to environment variables later)
const APP_ID = '2706ac010ad0447f969b7998cfec25b4';
const APP_CERTIFICATE = 'f9c247000c7f41cd9a26e0d5c0f663de';

// Simple token generation for RTM (Real-Time Messaging)
// Note: This is a basic implementation. For production, use Agora's official token server
function generateRtmToken(appId: string, appCertificate: string, userId: string, channelName: string): string {
  // For now, we'll return a simple token structure
  // In production, you should use Agora's official token generation library
  const timestamp = Math.floor(Date.now() / 1000);
  const expireTime = timestamp + 3600; // 1 hour expiry
  
  // This is a simplified token - in production use proper Agora token generation
  return `${appId}_${userId}_${channelName}_${expireTime}`;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { channelName } = await request.json();
    const userId = session.user.id;

    if (!channelName) {
      return NextResponse.json(
        { error: 'Channel name is required' },
        { status: 400 }
      );
    }

    // Generate RTM token
    const token = generateRtmToken(APP_ID, APP_CERTIFICATE, userId, channelName);

    return NextResponse.json({
      token,
      appId: APP_ID,
      userId,
      channelName,
      expireTime: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
    });
  } catch (error) {
    console.error('Error generating Agora token:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}