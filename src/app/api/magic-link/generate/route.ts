import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { globalMagicLink } from '@/lib/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  try {
    // This endpoint validates if a magic token is valid
    return NextResponse.json({ 
      message: 'Use POST /api/magic-link/validate to validate tokens' 
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}