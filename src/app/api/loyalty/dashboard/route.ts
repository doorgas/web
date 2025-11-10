import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { userLoyaltyPoints, loyaltyPointsHistory, settings } from '@/lib/schema';
import { eq, and, gte, sql } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  try {
    // Check if database configuration is available
    if (!process.env.DB_HOST || !process.env.DB_USER || !process.env.DB_PASS || !process.env.DB_NAME) {
      console.error('Database configuration missing');
      return NextResponse.json(
        { 
          success: true, 
          data: {
            availablePoints: 0,
            rewardValue: 0,
            thisMonthPoints: 0,
            totalRedeemed: 0,
            redemptionValue: 0.01
          },
          message: 'Database not configured - returning default values'
        },
        { status: 200 }
      );
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Get user loyalty points
    const userPoints = await db
      .select()
      .from(userLoyaltyPoints)
      .where(eq(userLoyaltyPoints.userId, userId))
      .limit(1);

    // Get loyalty settings for redemption value
    const loyaltySettings = await db
      .select()
      .from(settings)
      .where(eq(settings.key, 'loyalty_redemption_value'))
      .limit(1);

    const redemptionValue = loyaltySettings.length > 0 
      ? parseFloat(loyaltySettings[0].value) 
      : 0.01; // Default: 1 point = $0.01

    // Calculate this month's earned points
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const thisMonthPoints = await db
      .select({
        totalPoints: sql<number>`SUM(${loyaltyPointsHistory.points})`
      })
      .from(loyaltyPointsHistory)
      .where(
        and(
          eq(loyaltyPointsHistory.userId, userId),
          eq(loyaltyPointsHistory.transactionType, 'earned'),
          gte(loyaltyPointsHistory.createdAt, startOfMonth)
        )
      );

    // Calculate total redeemed amount from discount_amount column
    const totalRedeemed = await db
      .select({
        totalAmount: sql<number>`SUM(CAST(${loyaltyPointsHistory.discountAmount} AS DECIMAL(10,2)))`
      })
      .from(loyaltyPointsHistory)
      .where(
        and(
          eq(loyaltyPointsHistory.userId, userId),
          eq(loyaltyPointsHistory.transactionType, 'redeemed'),
          sql`${loyaltyPointsHistory.discountAmount} > 0`
        )
      );

    const availablePoints = userPoints[0]?.availablePoints || 0;
    const thisMonthPointsEarned = thisMonthPoints[0]?.totalPoints || 0;
    const totalRedeemedAmount = totalRedeemed[0]?.totalAmount || 0;
    const rewardValue = availablePoints * redemptionValue;

    return NextResponse.json({
      success: true,
      data: {
        availablePoints,
        rewardValue,
        thisMonthPoints: thisMonthPointsEarned,
        totalRedeemed: totalRedeemedAmount,
        redemptionValue
      }
    });

  } catch (error) {
    console.error('Error fetching loyalty dashboard data:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch loyalty data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}