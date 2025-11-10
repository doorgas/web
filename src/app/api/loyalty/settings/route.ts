import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { settings } from '@/lib/schema';
import { eq, or } from 'drizzle-orm';

// Get loyalty settings
async function getLoyaltySettings() {
  const loyaltySettings = await db
    .select()
    .from(settings)
    .where(
      or(
        eq(settings.key, 'loyalty_enabled'),
        eq(settings.key, 'points_earning_rate'),
        eq(settings.key, 'points_earning_basis'),
        eq(settings.key, 'points_redemption_value'),
        eq(settings.key, 'points_expiry_months'),
        eq(settings.key, 'points_minimum_order'),
        eq(settings.key, 'points_max_redemption_percent'),
        eq(settings.key, 'points_redemption_minimum')
      )
    );

  const settingsObj: { [key: string]: any } = {};
  loyaltySettings.forEach(setting => {
    let value: any = setting.value;
    
    // Convert values based on the setting key
    if (setting.key === 'loyalty_enabled') {
      value = value === 'true';
    } else if (setting.key.includes('rate') || setting.key.includes('value') || setting.key.includes('minimum') || setting.key.includes('percent') || setting.key.includes('months')) {
      value = parseFloat(value) || 0;
    }
    
    settingsObj[setting.key] = value;
  });

  return {
    enabled: settingsObj.loyalty_enabled === true || settingsObj.loyalty_enabled === 'true',
    earningRate: Number(settingsObj.points_earning_rate) || 1,
    earningBasis: settingsObj.points_earning_basis || 'subtotal',
    redemptionValue: Number(settingsObj.points_redemption_value) || 0.01,
    expiryMonths: Number(settingsObj.points_expiry_months) || 12,
    minimumOrder: Number(settingsObj.points_minimum_order) || 0,
    maxRedemptionPercent: Number(settingsObj.points_max_redemption_percent) || 50,
    redemptionMinimum: Number(settingsObj.points_redemption_minimum) || 100
  };
}

export async function GET() {
  try {
    const settings = await getLoyaltySettings();
    
    return NextResponse.json({
      success: true,
      settings
    });

  } catch (error) {
    console.error('Error fetching loyalty settings:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch loyalty settings',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}