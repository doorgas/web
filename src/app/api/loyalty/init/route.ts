import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { settings } from '@/lib/schema';
import { eq, or } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    // Check if database configuration is available
    if (!process.env.DB_HOST || !process.env.DB_USER || !process.env.DB_PASS || !process.env.DB_NAME) {
      return NextResponse.json(
        { success: false, error: 'Database not configured' },
        { status: 500 }
      );
    }

    // Check if loyalty settings already exist
    const existingSettings = await db
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

    // Define default loyalty settings
    const defaultSettings = [
      { key: 'loyalty_enabled', value: 'true', description: 'Enable loyalty points system' },
      { key: 'points_earning_rate', value: '1', description: 'Points earned per dollar spent' },
      { key: 'points_earning_basis', value: 'subtotal', description: 'Base amount for points calculation (subtotal or total)' },
      { key: 'points_redemption_value', value: '0.01', description: 'Dollar value per point when redeemed' },
      { key: 'points_expiry_months', value: '12', description: 'Points expiry period in months' },
      { key: 'points_minimum_order', value: '0', description: 'Minimum order amount to earn points' },
      { key: 'points_max_redemption_percent', value: '50', description: 'Maximum percentage of order that can be paid with points' },
      { key: 'points_redemption_minimum', value: '100', description: 'Minimum points required to redeem' }
    ];

    // Create settings that don't exist
    const existingKeys = existingSettings.map(s => s.key);
    const settingsToCreate = defaultSettings.filter(s => !existingKeys.includes(s.key));

    if (settingsToCreate.length > 0) {
      const newSettings = settingsToCreate.map(setting => ({
        id: uuidv4(),
        key: setting.key,
        value: setting.value,
        description: setting.description,
        category: 'loyalty',
        isPublic: false,
        createdAt: new Date(),
        updatedAt: new Date()
      }));

      await db.insert(settings).values(newSettings);
      console.log(`✅ Created ${settingsToCreate.length} loyalty settings`);
    }

    // Return current settings
    const allSettings = await db
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

    return NextResponse.json({
      success: true,
      message: `Loyalty settings initialized successfully. Created ${settingsToCreate.length} new settings.`,
      settings: allSettings,
      loyaltyEnabled: true
    });

  } catch (error) {
    console.error('Error initializing loyalty settings:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to initialize loyalty settings',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}