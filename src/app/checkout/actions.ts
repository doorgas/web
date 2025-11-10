'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { userLoyaltyPoints, loyaltyPointsHistory, settings, orders, orderItems, user, products, productVariants } from '@/lib/schema'
import { eq, and, or } from 'drizzle-orm'
import { v4 as uuidv4 } from 'uuid'

// Get loyalty settings directly from database
export async function getLoyaltySettings() {
  try {
    if (!process.env.DB_HOST || !process.env.DB_USER || !process.env.DB_PASS || !process.env.DB_NAME) {
      console.log('Database not configured, using default loyalty settings');
      return {
        enabled: true,
        earningRate: 1,
        earningBasis: 'subtotal',
        redemptionValue: 0.01,
        expiryMonths: 12,
        minimumOrder: 0,
        maxRedemptionPercent: 50,
        redemptionMinimum: 100
      };
    }

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
      
      if (setting.key === 'loyalty_enabled') {
        value = value === 'true';
      } else if (setting.key.includes('rate') || setting.key.includes('value') || setting.key.includes('minimum') || setting.key.includes('percent') || setting.key.includes('months')) {
        value = parseFloat(value) || 0;
      }
      
      settingsObj[setting.key] = value;
    });

    return {
      enabled: settingsObj.loyalty_enabled === true,
      earningRate: Number(settingsObj.points_earning_rate) || 1,
      earningBasis: settingsObj.points_earning_basis || 'subtotal',
      redemptionValue: Number(settingsObj.points_redemption_value) || 0.01,
      expiryMonths: Number(settingsObj.points_expiry_months) || 12,
      minimumOrder: Number(settingsObj.points_minimum_order) || 0,
      maxRedemptionPercent: Number(settingsObj.points_max_redemption_percent) || 50,
      redemptionMinimum: Number(settingsObj.points_redemption_minimum) || 100
    };
  } catch (error) {
    console.error('Error fetching loyalty settings:', error);
    return {
      enabled: true,
      earningRate: 1,
      earningBasis: 'subtotal',
      redemptionValue: 0.01,
      expiryMonths: 12,
      minimumOrder: 0,
      maxRedemptionPercent: 50,
      redemptionMinimum: 100
    };
  }
}

// Get customer points directly from database
export async function getCustomerPoints(userId: string) {
  try {
    if (!process.env.DB_HOST || !process.env.DB_USER || !process.env.DB_PASS || !process.env.DB_NAME) {
      return {
        availablePoints: 0,
        totalPointsEarned: 0,
        totalPointsRedeemed: 0
      };
    }

    const userPoints = await db
      .select()
      .from(userLoyaltyPoints)
      .where(eq(userLoyaltyPoints.userId, userId))
      .limit(1);

    if (userPoints.length === 0) {
      return {
        availablePoints: 0,
        totalPointsEarned: 0,
        totalPointsRedeemed: 0
      };
    }

    const points = userPoints[0];
    return {
      availablePoints: points.availablePoints || 0,
      totalPointsEarned: points.totalPointsEarned || 0,
      totalPointsRedeemed: points.totalPointsRedeemed || 0
    };
  } catch (error) {
    console.error('Error fetching customer points:', error);
    return {
      availablePoints: 0,
      totalPointsEarned: 0,
      totalPointsRedeemed: 0
    };
  }
}

// Process checkout with direct database operations
export async function processCheckout(formData: FormData) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw new Error('User not authenticated');
    }

    // Parse form data
    const orderTypeFromForm = formData.get('orderType') as string;
    const checkoutData = {
      items: JSON.parse(formData.get('items') as string),
      total: parseFloat(formData.get('total') as string),
      subtotal: parseFloat(formData.get('subtotal') as string),
      deliveryFee: parseFloat(formData.get('deliveryFee') as string || '0'),
      shippingFee: parseFloat(formData.get('shippingFee') as string || '0'),
      paymentMethod: formData.get('paymentMethod') as string,
      orderType: orderTypeFromForm || 'delivery',
      customerInfo: JSON.parse(formData.get('customerInfo') as string),
      deliveryAddress: formData.get('deliveryAddress') ? JSON.parse(formData.get('deliveryAddress') as string) : null,
      pickupLocationId: formData.get('pickupLocationId') as string || null,
      orderNotes: formData.get('orderNotes') as string || '',
      pointsToRedeem: parseInt(formData.get('pointsToRedeem') as string || '0'),
      pointsDiscountAmount: parseFloat(formData.get('pointsDiscountAmount') as string || '0')
    };

    console.log('📦 Order Type from form:', orderTypeFromForm);
    console.log('📦 Order Type in checkoutData:', checkoutData.orderType);
    
    // Validate order type
    if (!['delivery', 'pickup', 'shipping'].includes(checkoutData.orderType)) {
      console.error('⚠️ Invalid order type received:', checkoutData.orderType);
      throw new Error(`Invalid order type: ${checkoutData.orderType}`);
    }

    const orderId = uuidv4();
    const orderNumber = `ORD-${Date.now()}`;
    const finalTotal = checkoutData.total;

    // Check if database is configured
    if (!process.env.DB_HOST || !process.env.DB_USER || !process.env.DB_PASS || !process.env.DB_NAME) {
      console.log('⚠️ Database not configured - order cannot be processed');
      throw new Error('Database not configured');
    }

    // Get order settings to validate minimum order value - only for delivery orders
    const orderSettings = await getOrderSettings();
    if (checkoutData.orderType === 'delivery' && checkoutData.subtotal < orderSettings.minimumOrderValue) {
      throw new Error(`Minimum order value is $${orderSettings.minimumOrderValue.toFixed(2)}. Current order: $${checkoutData.subtotal.toFixed(2)}`);
    }

    // Redeem points if any
    if (checkoutData.pointsToRedeem > 0) {
      console.log(`\n=== POINTS REDEMPTION ===`);
      console.log(`User: ${session.user.id}, Points to redeem: ${checkoutData.pointsToRedeem}, Discount: $${checkoutData.pointsDiscountAmount}`);

      // Get current points
      const userPoints = await db
        .select()
        .from(userLoyaltyPoints)
        .where(eq(userLoyaltyPoints.userId, session.user.id))
        .limit(1);

      if (userPoints.length === 0 || (userPoints[0].availablePoints || 0) < checkoutData.pointsToRedeem) {
        throw new Error('Insufficient points for redemption');
      }

      const currentPoints = userPoints[0];
      const newAvailablePoints = (currentPoints.availablePoints || 0) - checkoutData.pointsToRedeem;
      const newTotalRedeemed = (currentPoints.totalPointsRedeemed || 0) + checkoutData.pointsToRedeem;

      // Update user points
      await db.update(userLoyaltyPoints)
        .set({
          availablePoints: newAvailablePoints,
          totalPointsRedeemed: newTotalRedeemed,
          lastRedeemedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(userLoyaltyPoints.userId, session.user.id));

      // Add redemption history
      await db.insert(loyaltyPointsHistory).values({
        id: uuidv4(),
        userId: session.user.id,
        orderId,
        transactionType: 'redeemed',
        status: 'available',
        points: -checkoutData.pointsToRedeem,
        pointsBalance: newAvailablePoints,
        description: `Redeemed ${checkoutData.pointsToRedeem} points for $${checkoutData.pointsDiscountAmount.toFixed(2)} discount`,
        orderAmount: checkoutData.total.toString(),
        discountAmount: checkoutData.pointsDiscountAmount.toString(),
        expiresAt: null,
        isExpired: false,
        processedBy: session.user.id,
        metadata: { source: 'checkout_redemption' },
        createdAt: new Date(),
      });

      console.log(`✅ Points redeemed successfully. New balance: ${newAvailablePoints}`);
    }

    // Create order
    console.log(`\n=== ORDER CREATION ===`);
    console.log(`Order: ${orderNumber}, Total: $${finalTotal}, User: ${session.user.id}`);
    console.log(`Order Type being saved: ${checkoutData.orderType}`);

    await db.insert(orders).values({
      id: orderId,
      orderNumber,
      userId: session.user.id,
      email: checkoutData.customerInfo.email || '',
      phone: checkoutData.customerInfo.phone || null,
      status: 'pending',
      paymentStatus: 'pending',
      fulfillmentStatus: 'pending',
      subtotal: checkoutData.subtotal.toString(),
      taxAmount: '0.00',
      shippingAmount: (checkoutData.deliveryFee + checkoutData.shippingFee).toString(), // Only one will be non-zero based on order type
      discountAmount: checkoutData.pointsDiscountAmount.toString(),
      totalAmount: finalTotal.toString(),
      currency: 'USD',
      
      // Order type and pickup location fields
      orderType: checkoutData.orderType, // Remove the || 'delivery' fallback to see actual value
      pickupLocationId: checkoutData.pickupLocationId || null,
      
      // Driver assignment fields
      assignedDriverId: null,
      deliveryStatus: 'pending',
      
      // Loyalty points fields
      pointsToRedeem: checkoutData.pointsToRedeem,
      pointsDiscountAmount: checkoutData.pointsDiscountAmount.toString(),
      
      // Addresses (for delivery and shipping orders)
      billingFirstName: checkoutData.customerInfo.name?.split(' ')[0] || null,
      billingLastName: checkoutData.customerInfo.name?.split(' ').slice(1).join(' ') || null,
      billingAddress1: checkoutData.deliveryAddress?.street || null,
      billingCity: checkoutData.deliveryAddress?.city || null,
      billingState: checkoutData.deliveryAddress?.state || null,
      billingPostalCode: checkoutData.deliveryAddress?.zipCode || null,
      billingCountry: 'US',
      
      shippingFirstName: checkoutData.customerInfo.name?.split(' ')[0] || null,
      shippingLastName: checkoutData.customerInfo.name?.split(' ').slice(1).join(' ') || null,
      shippingAddress1: checkoutData.deliveryAddress?.street || null,
      shippingCity: checkoutData.deliveryAddress?.city || null,
      shippingState: checkoutData.deliveryAddress?.state || null,
      shippingPostalCode: checkoutData.deliveryAddress?.zipCode || null,
      shippingCountry: 'US',
      shippingLatitude: checkoutData.deliveryAddress?.latitude || null,
      shippingLongitude: checkoutData.deliveryAddress?.longitude || null,
      
      notes: checkoutData.orderNotes || null,
      deliveryInstructions: checkoutData.deliveryAddress?.instructions || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log(`✅ Order created with type: ${checkoutData.orderType}`);
    
    // Verify what was saved by reading it back
    const savedOrder = await db
      .select({ orderType: orders.orderType })
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);
    
    if (savedOrder.length > 0) {
      console.log(`✅ Verified order_type in database: ${savedOrder[0].orderType}`);
      if (savedOrder[0].orderType !== checkoutData.orderType) {
        console.error(`🚨 ORDER TYPE MISMATCH! Expected: ${checkoutData.orderType}, Got: ${savedOrder[0].orderType}`);
      }
    }

    // Create order items
    for (const item of checkoutData.items) {
      const productId = item.product?.id || item.id;
      const productName = item.product?.name || item.name;
      const quantity = item.quantity || 1;
      const price = item.product?.price || item.price || 0;

      // Get cost price and compare price from product or variant at time of sale
      let costPrice = null;
      let comparePrice = null;
      let totalCost = null;
      
      // Check both possible locations for variantId
      const variantId = item.variantId || item.product?.variantId;
      
      // Debug logging for variant detection
      console.log(`Checking variant for ${productName}:`, {
        itemVariantId: item.variantId,
        productVariantId: item.product?.variantId,
        finalVariantId: variantId,
        selectedAttributes: item.product?.selectedAttributes
      });
      
      try {
        if (variantId) {
          // Get cost price and compare price from variant
          const variant = await db.query.productVariants.findFirst({
            where: eq(productVariants.id, variantId),
            columns: { costPrice: true, comparePrice: true }
          });
          if (variant?.costPrice) {
            costPrice = parseFloat(variant.costPrice.toString());
          }
          if (variant?.comparePrice) {
            comparePrice = parseFloat(variant.comparePrice.toString());
          }
        } else {
          // Get cost price and compare price from product
          const product = await db.query.products.findFirst({
            where: eq(products.id, productId),
            columns: { costPrice: true, comparePrice: true }
          });
          if (product?.costPrice) {
            costPrice = parseFloat(product.costPrice.toString());
          }
          if (product?.comparePrice) {
            comparePrice = parseFloat(product.comparePrice.toString());
          }
        }

        // Calculate total cost
        if (costPrice) {
          totalCost = costPrice * quantity;
        }

        // Debug logging
        console.log(`Order item pricing for ${productName}:`, {
          productId,
          variantId: variantId,
          price,
          costPrice,
          comparePrice,
          totalCost
        });
      } catch (error) {
        console.warn(`Failed to get cost price and compare price for item ${productName}:`, error);
      }

      // Prepare variation attributes for storage
      let addonData = null;
      if (item.product?.selectedAttributes || item.addons) {
        addonData = {
          selectedAttributes: item.product?.selectedAttributes || {},
          variantSku: item.product?.variantSku || null,
          addons: item.addons || []
        };
      }

      await db.insert(orderItems).values({
        id: uuidv4(),
        orderId,
        productId,
        variantId: variantId || null,
        productName,
        variantTitle: item.variantTitle || null,
        sku: item.sku || item.product?.variantSku || null,
        quantity,
        price: price.toString(),
        costPrice: costPrice?.toString() || null,
        comparePrice: comparePrice?.toString() || null,
        totalPrice: (price * quantity).toString(),
        totalCost: totalCost?.toString() || null,
        productImage: item.product?.images?.[0] || item.product?.image || null,
        addons: addonData ? JSON.stringify(addonData) : null,
        createdAt: new Date(),
      });
    }

    // Award loyalty points for the order
    const loyaltySettings = await getLoyaltySettings();
    if (loyaltySettings.enabled) {
      console.log(`\n=== LOYALTY POINTS EARNING ===`);
      console.log(`Settings: Rate=${loyaltySettings.earningRate}, Basis=${loyaltySettings.earningBasis}`);
      
      // Calculate points based on original behavior (before fees were added)
      // Originally: total = subtotal + tax (where tax was 0), so total === subtotal
      const originalTotal = checkoutData.subtotal; // This maintains the original behavior
      const baseAmount = loyaltySettings.earningBasis === 'total' ? originalTotal : checkoutData.subtotal;
      const pointsToAward = Math.floor(baseAmount * loyaltySettings.earningRate);
      
      if (pointsToAward > 0 && baseAmount >= loyaltySettings.minimumOrder) {
        // Get or create user loyalty points record
        const existingPoints = await db
          .select()
          .from(userLoyaltyPoints)
          .where(eq(userLoyaltyPoints.userId, session.user.id))
          .limit(1);

        const status = 'pending'; // Pointssss become available when order is completed
        const currentBalance = existingPoints[0]?.availablePoints || 0;

        if (existingPoints.length > 0) {
          await db.update(userLoyaltyPoints)
            .set({
              totalPointsEarned: (existingPoints[0].totalPointsEarned || 0) + pointsToAward,
              pendingPoints: (existingPoints[0].pendingPoints || 0) + pointsToAward, // Add to pending points
              lastEarnedAt: new Date(),
              updatedAt: new Date()
            })
            .where(eq(userLoyaltyPoints.userId, session.user.id));
        } else {
          await db.insert(userLoyaltyPoints).values({
            id: uuidv4(),
            userId: session.user.id,
            totalPointsEarned: pointsToAward,
            totalPointsRedeemed: 0,
            availablePoints: 0, // Will be updated when order is completed
            pendingPoints: pointsToAward, // Set pending points for new orders
            lastEarnedAt: new Date(),
            lastRedeemedAt: null,
            createdAt: new Date(),
            updatedAt: new Date()
          });
        }

        // Add earning history
        const expiresAt = loyaltySettings.expiryMonths > 0 
          ? new Date(Date.now() + (loyaltySettings.expiryMonths * 30 * 24 * 60 * 60 * 1000))
          : null;

        await db.insert(loyaltyPointsHistory).values({
          id: uuidv4(),
          userId: session.user.id,
          orderId,
          transactionType: 'earned',
          status,
          points: pointsToAward,
          pointsBalance: currentBalance, // Will be updated when order is completed
          description: `Earned from order #${orderNumber}`,
          orderAmount: finalTotal.toString(),
          discountAmount: null,
          expiresAt,
          isExpired: false,
          processedBy: null,
          metadata: { 
            source: 'order_checkout',
            earningRate: loyaltySettings.earningRate,
            earningBasis: loyaltySettings.earningBasis
          },
          createdAt: new Date(),
        });

        console.log(`✅ Awarded ${pointsToAward} points (pending) for order ${orderNumber}`);
      } else {
        console.log(`⚠️ No points awarded: Amount=${baseAmount}, MinOrder=${loyaltySettings.minimumOrder}, Points=${pointsToAward}`);
      }
    }

    console.log(`✅ Order ${orderNumber} created successfully`);

    // Update user table with checkout information for future auto-fill
    try {
      console.log(`\n=== UPDATING USER PROFILE ===`);
      console.log(`Updating user ${session.user.id} with checkout data`);
      
      await db.update(user)
        .set({
          name: checkoutData.customerInfo.name || undefined,
          email: checkoutData.customerInfo.email || undefined,
          phone: checkoutData.customerInfo.phone || undefined,
          address: checkoutData.deliveryAddress?.street || undefined,
          city: checkoutData.deliveryAddress?.city || undefined,
          state: checkoutData.deliveryAddress?.state || undefined,
          postalCode: checkoutData.deliveryAddress?.zipCode || undefined,
          latitude: checkoutData.deliveryAddress?.latitude || undefined,
          longitude: checkoutData.deliveryAddress?.longitude || undefined,
          updatedAt: new Date()
        })
        .where(eq(user.id, session.user.id));
      
      console.log(`✅ User profile updated successfully`);
    } catch (error) {
      console.error('Error updating user profile:', error);
      // Don't throw error here - order was successful, profile update is secondary
    }

    console.log(`=== END ORDER PROCESSING ===\n`);

    // Return success response
    return {
      success: true,
      orderId,
      orderNumber,
      total: finalTotal,
      pointsEarned: loyaltySettings.enabled ? Math.floor(checkoutData.subtotal * loyaltySettings.earningRate) : 0
    };

  } catch (error) {
    console.error('Checkout processing error:', error);
    throw error;
  }
}

// Get order settings directly from database
export async function getOrderSettings() {
  try {
    if (!process.env.DB_HOST || !process.env.DB_USER || !process.env.DB_PASS || !process.env.DB_NAME) {
      console.log('Database not configured, using default order settings');
      return {
        minimumOrderValue: 0,
        deliveryFee: 0,
        shippingFee: 0
      };
    }

    const orderSettings = await db
      .select()
      .from(settings)
      .where(
        or(
          eq(settings.key, 'order_minimum_order_value'),
          eq(settings.key, 'order_delivery_fee'),
          eq(settings.key, 'order_shipping_fee')
        )
      );

    const settingsObj: { [key: string]: any } = {};
    orderSettings.forEach(setting => {
      let value: any = setting.value;
      
      // Parse numeric values
      if (setting.type === 'number' || setting.key.includes('fee') || setting.key.includes('value')) {
        value = parseFloat(value) || 0;
      }
      
      settingsObj[setting.key] = value;
    });

    return {
      minimumOrderValue: Number(settingsObj.order_minimum_order_value) || 0,
      deliveryFee: Number(settingsObj.order_delivery_fee) || 0,
      shippingFee: Number(settingsObj.order_shipping_fee) || 0
    };
  } catch (error) {
    console.error('Error fetching order settings:', error);
    return {
      minimumOrderValue: 0,
      deliveryFee: 0,
      shippingFee: 0
    };
  }
}

// Get delivery status directly from database
export async function getDeliveryStatus() {
  try {
    if (!process.env.DB_HOST || !process.env.DB_USER || !process.env.DB_PASS || !process.env.DB_NAME) {
      console.log('Database not configured, assuming delivery is disabled for safety');
      return {
        enabled: false,
        message: 'Delivery is currently unavailable. Please contact support.',
        timestamp: new Date().toISOString()
      };
    }

    // Get delivery settings from database
    const deliverySettings = await db
      .select()
      .from(settings)
      .where(
        or(
          eq(settings.key, 'delivery_enabled'),
          eq(settings.key, 'delivery_message')
        )
      );

    let deliveryEnabled = false; // Default to disabled for safety
    let customMessage = 'Delivery is currently unavailable.';

    // Parse existing settings
    deliverySettings.forEach(setting => {
      if (setting.key === 'delivery_enabled') {
        try {
          deliveryEnabled = setting.value === 'true';
        } catch (error) {
          console.error('Error parsing delivery enabled setting:', error);
        }
      } else if (setting.key === 'delivery_message') {
        customMessage = setting.value || customMessage;
      }
    });

    return {
      enabled: deliveryEnabled,
      message: customMessage,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error fetching delivery status from database:', error);
    // Return disabled state in case of error for safety
    return {
      enabled: false,
      message: 'Delivery is currently unavailable due to a system error.',
      timestamp: new Date().toISOString()
    };
  }
}

// Get shipping status directly from database
export async function getShippingStatus() {
  try {
    if (!process.env.DB_HOST || !process.env.DB_USER || !process.env.DB_PASS || !process.env.DB_NAME) {
      console.log('Database not configured, assuming shipping is disabled for safety');
      return {
        enabled: false,
        message: 'Shipping is currently unavailable. Please contact support.',
        timestamp: new Date().toISOString()
      };
    }

    // Get shipping settings from database
    const shippingSettings = await db
      .select()
      .from(settings)
      .where(
        or(
          eq(settings.key, 'shipping_enabled'),
          eq(settings.key, 'shipping_message')
        )
      );

    let shippingEnabled = false; // Default to disabled for safety
    let customMessage = 'Shipping is currently unavailable.';

    // Parse existing settings
    shippingSettings.forEach(setting => {
      if (setting.key === 'shipping_enabled') {
        try {
          shippingEnabled = setting.value === 'true';
        } catch (error) {
          console.error('Error parsing shipping enabled setting:', error);
        }
      } else if (setting.key === 'shipping_message') {
        customMessage = setting.value || customMessage;
      }
    });

    return {
      enabled: shippingEnabled,
      message: customMessage,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error fetching shipping status from database:', error);
    // Return disabled state in case of error for safety
    return {
      enabled: false,
      message: 'Shipping is currently unavailable due to a system error.',
      timestamp: new Date().toISOString()
    };
  }
}