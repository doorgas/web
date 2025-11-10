import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { drivers } from '@/lib/schema';
import { eq } from 'drizzle-orm';

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, status } = body;

    if (!userId || !status) {
      return NextResponse.json(
        { success: false, error: 'User ID and status are required' },
        { status: 400 }
      );
    }

    // Validate status
    const validStatuses = ['available', 'busy', 'offline'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Invalid status. Must be available, busy, or offline' },
        { status: 400 }
      );
    }

    // Update driver status
    const result = await db
      .update(drivers)
      .set({ 
        status,
        updatedAt: new Date()
      })
      .where(eq(drivers.userId, userId));

    return NextResponse.json({
      success: true,
      message: `Driver status updated to ${status}`
    });

  } catch (error) {
    console.error('Error updating driver status:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update driver status' },
      { status: 500 }
    );
  }
}