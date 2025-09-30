import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { globalMagicLink } from '@/lib/schema';
import { eq } from 'drizzle-orm';

export async function POST(req: Request) {
  try {
    const { token } = await req.json();

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    // Find the global magic link
    const magicLink = await db
      .select()
      .from(globalMagicLink)
      .where(eq(globalMagicLink.token, token))
      .limit(1);

    if (!magicLink.length) {
      return NextResponse.json({ 
        valid: false, 
        error: 'Invalid magic link token' 
      }, { status: 400 });
    }

    const link = magicLink[0];

    // Check if enabled
    if (!link.isEnabled) {
      return NextResponse.json({ 
        valid: false, 
        error: 'Magic link is currently disabled' 
      }, { status: 400 });
    }

    return NextResponse.json({
      valid: true,
      message: 'Magic link is valid! Your account will be automatically approved.',
      description: link.description
    });

  } catch (error) {
    console.error('Error validating magic link:', error);
    return NextResponse.json({ 
      valid: false, 
      error: 'Failed to validate magic link' 
    }, { status: 500 });
  }
}