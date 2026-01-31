import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { user } from '@/lib/schema';
import { eq } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Fetch user type from database
    const userData = await db
      .select({ userType: user.userType })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);
    
    const userType = userData.length > 0 ? userData[0].userType : 'customer';

    return NextResponse.json({
      success: true,
      userType: userType || 'customer'
    });

  } catch (error) {
    console.error('Error fetching user type:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch user type',
      },
      { status: 500 }
    );
  }
}