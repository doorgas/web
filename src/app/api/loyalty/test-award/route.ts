import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { userLoyaltyPoints, loyaltyPointsHistory } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // Check if database configuration is available
    if (!process.env.DB_HOST || !process.env.DB_USER || !process.env.DB_PASS || !process.env.DB_NAME) {
      return NextResponse.json(
        { success: false, error: 'Database not configured' },
        { status: 500 }
      );
    }

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { points = 100, description = 'Test points award' } = await request.json();

    const userId = session.user.id;
    const pointsToAward = parseInt(points);

    // Check if user has loyalty points record
    const existingPoints = await db
      .select()
      .from(userLoyaltyPoints)
      .where(eq(userLoyaltyPoints.userId, userId))
      .limit(1);

    const newAvailablePoints = (existingPoints[0]?.availablePoints || 0) + pointsToAward;

    if (existingPoints.length > 0) {
      // Update existing record
      await db.update(userLoyaltyPoints)
        .set({
          totalPointsEarned: (existingPoints[0].totalPointsEarned || 0) + pointsToAward,
          availablePoints: newAvailablePoints,
          lastEarnedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(userLoyaltyPoints.userId, userId));
    } else {
      // Create new record
      await db.insert(userLoyaltyPoints).values({
        id: uuidv4(),
        userId,
        totalPointsEarned: pointsToAward,
        totalPointsRedeemed: 0,
        availablePoints: newAvailablePoints,
        lastEarnedAt: new Date(),
        lastRedeemedAt: null,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    // Add history record
    await db.insert(loyaltyPointsHistory).values({
      id: uuidv4(),
      userId,
      orderId: null,
      transactionType: 'earned',
      status: 'available',
      points: pointsToAward,
      pointsBalance: newAvailablePoints,
      description,
      orderAmount: null,
      discountAmount: null,
      expiresAt: null,
      isExpired: false,
      processedBy: userId,
      metadata: { source: 'manual_test' },
      createdAt: new Date(),
    });

    console.log(`✅ Awarded ${pointsToAward} test points to user ${userId}`);

    return NextResponse.json({
      success: true,
      message: `Successfully awarded ${pointsToAward} points`,
      newBalance: newAvailablePoints
    });

  } catch (error) {
    console.error('Error awarding test points:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to award test points',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}