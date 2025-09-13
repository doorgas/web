import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { userLoyaltyPoints, loyaltyPointsHistory, settings } from '@/lib/schema';
import { eq, and, or } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Get loyalty settings
async function getLoyaltySettings() {
  const loyaltySettings = await db
    .select()
    .from(settings)
    .where(
      or(
        eq(settings.key, 'loyalty_enabled'),
        eq(settings.key, 'points_redemption_value'),
        eq(settings.key, 'points_max_redemption_percent'),
        eq(settings.key, 'points_redemption_minimum')
      )
    );

  const settingsObj: { [key: string]: any } = {};
  loyaltySettings.forEach(setting => {
    let value: any = setting.value;
    
    if (setting.key === 'loyalty_enabled') {
      value = value === 'true';
    } else if (setting.key.includes('value') || setting.key.includes('percent') || setting.key.includes('minimum')) {
      value = parseFloat(value) || 0;
    }
    
    settingsObj[setting.key] = value;
  });

  return {
    enabled: settingsObj.loyalty_enabled === true,
    redemptionValue: Number(settingsObj.points_redemption_value) || 0.01,
    maxRedemptionPercent: Number(settingsObj.points_max_redemption_percent) || 50,
    redemptionMinimum: Number(settingsObj.points_redemption_minimum) || 100
  };
}

// GET - Get user's available points
export async function GET(request: NextRequest) {
  try {
    // Check if database configuration is available
    if (!process.env.DB_HOST || !process.env.DB_USER || !process.env.DB_PASS || !process.env.DB_NAME) {
      return NextResponse.json(
        { 
          success: true, 
          data: { availablePoints: 0, maxRedemption: 0 },
          message: 'Database not configured' 
        },
        { status: 200 }
      );
    }

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const orderAmount = parseFloat(searchParams.get('orderAmount') || '0');

    const settings = await getLoyaltySettings();
    if (!settings.enabled) {
      return NextResponse.json({
        success: true,
        data: { availablePoints: 0, maxRedemption: 0 },
        message: 'Loyalty program disabled'
      });
    }

    // Get user's available points
    const userPoints = await db
      .select()
      .from(userLoyaltyPoints)
      .where(eq(userLoyaltyPoints.userId, session.user.id))
      .limit(1);

    const availablePoints = userPoints[0]?.availablePoints || 0;
    
    // Calculate maximum points that can be redeemed for this order
    const maxOrderRedemption = Math.floor((orderAmount * settings.maxRedemptionPercent) / 100 / settings.redemptionValue);
    const maxRedemption = Math.min(
      availablePoints,
      maxOrderRedemption,
      availablePoints >= settings.redemptionMinimum ? availablePoints : 0
    );

    return NextResponse.json({
      success: true,
      data: {
        availablePoints,
        maxRedemption,
        redemptionValue: settings.redemptionValue,
        minimumRedemption: settings.redemptionMinimum
      }
    });

  } catch (error) {
    console.error('Error fetching points:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch points',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST - Redeem points
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

    const { pointsToRedeem, orderAmount, orderId } = await request.json();

    if (!pointsToRedeem || pointsToRedeem <= 0) {
      return NextResponse.json({ error: 'Invalid points amount' }, { status: 400 });
    }

    const settings = await getLoyaltySettings();
    if (!settings.enabled) {
      return NextResponse.json({ error: 'Loyalty program disabled' }, { status: 400 });
    }

    // Get user's current points
    const userPoints = await db
      .select()
      .from(userLoyaltyPoints)
      .where(eq(userLoyaltyPoints.userId, session.user.id))
      .limit(1);

    if (userPoints.length === 0) {
      return NextResponse.json({ error: 'No loyalty points account found' }, { status: 400 });
    }

    const currentPoints = userPoints[0];
    
    // Validate redemption
    const availablePoints = currentPoints.availablePoints || 0;
    if (availablePoints < pointsToRedeem) {
      return NextResponse.json({ error: 'Insufficient points' }, { status: 400 });
    }

    if (pointsToRedeem < settings.redemptionMinimum) {
      return NextResponse.json({ 
        error: `Minimum ${settings.redemptionMinimum} points required for redemption` 
      }, { status: 400 });
    }

    // Calculate discount amount
    const discountAmount = pointsToRedeem * settings.redemptionValue;
    const maxOrderDiscount = (orderAmount * settings.maxRedemptionPercent) / 100;
    
    if (discountAmount > maxOrderDiscount) {
      return NextResponse.json({ 
        error: `Cannot redeem more than ${settings.maxRedemptionPercent}% of order value` 
      }, { status: 400 });
    }

    const newAvailablePoints = availablePoints - pointsToRedeem;
    const newTotalRedeemed = (currentPoints.totalPointsRedeemed || 0) + pointsToRedeem;

    // Update user points
    await db.update(userLoyaltyPoints)
      .set({
        availablePoints: newAvailablePoints,
        totalPointsRedeemed: newTotalRedeemed,
        lastRedeemedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(userLoyaltyPoints.userId, session.user.id));

    // Add history record
    await db.insert(loyaltyPointsHistory).values({
      id: uuidv4(),
      userId: session.user.id,
      orderId,
      transactionType: 'redeemed',
      status: 'available',
      points: -pointsToRedeem, // Negative for redemption
      pointsBalance: newAvailablePoints,
      description: `Redeemed ${pointsToRedeem} points for $${discountAmount.toFixed(2)} discount`,
      orderAmount: orderAmount?.toString() || null,
      discountAmount: discountAmount.toString(),
      expiresAt: null,
      isExpired: false,
      processedBy: session.user.id,
      metadata: { 
        redemptionValue: settings.redemptionValue,
        orderAmount,
        discountAmount
      },
      createdAt: new Date(),
    });

    console.log(`✅ Redeemed ${pointsToRedeem} points for user ${session.user.id}, discount: $${discountAmount}`);

    return NextResponse.json({
      success: true,
      data: {
        pointsRedeemed: pointsToRedeem,
        discountAmount: discountAmount,
        newBalance: newAvailablePoints
      }
    });

  } catch (error) {
    console.error('Error redeeming points:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to redeem points',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}