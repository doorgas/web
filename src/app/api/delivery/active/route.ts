import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { orders, drivers, user } from '@/lib/schema';
import { eq, and, notInArray } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  try {
    // Check if database configuration is available
    if (!process.env.DB_HOST || !process.env.DB_USER || !process.env.DB_PASS || !process.env.DB_NAME) {
      console.error('Database configuration missing');
      return NextResponse.json(
        { 
          success: true, 
          data: null,
          message: 'Database not configured - no active delivery found'
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

    // Find active order for the user (not completed/cancelled/delivered)
    const activeOrder = await db
      .select({
        order: orders,
        driver: {
          id: drivers.id,
          licenseNumber: drivers.licenseNumber,
          vehicleType: drivers.vehicleType,
          vehicleMake: drivers.vehicleMake,
          vehicleModel: drivers.vehicleModel,
          vehiclePlateNumber: drivers.vehiclePlateNumber,
          status: drivers.status,
        },
        driverUser: {
          name: user.name,
          phone: user.phone,
        }
      })
      .from(orders)
      .leftJoin(drivers, eq(orders.assignedDriverId, drivers.id))
      .leftJoin(user, eq(drivers.userId, user.id))
      .where(
        and(
          eq(orders.userId, userId),
          notInArray(orders.status, ['delivered', 'cancelled', 'completed'])
        )
      )
      .orderBy(orders.createdAt)
      .limit(1);

    if (activeOrder.length === 0) {
      return NextResponse.json({
        success: true,
        data: null,
        message: 'No active delivery found'
      });
    }

    const orderData = activeOrder[0];
    
    return NextResponse.json({
      success: true,
      data: {
        orderNumber: orderData.order.orderNumber,
        orderStatus: orderData.order.status,
        deliveryStatus: orderData.order.deliveryStatus,
        driver: orderData.driver && orderData.driverUser ? {
          name: orderData.driverUser.name,
          phone: orderData.driverUser.phone,
          vehicleType: orderData.driver.vehicleType,
          vehicleMake: orderData.driver.vehicleMake,
          vehicleModel: orderData.driver.vehicleModel,
          vehiclePlateNumber: orderData.driver.vehiclePlateNumber,
          status: orderData.driver.status,
        } : null,
        createdAt: orderData.order.createdAt,
        eta: orderData.order.deliveryTime,
        serviceDate: orderData.order.serviceDate,
        serviceTime: orderData.order.serviceTime,
      }
    });

  } catch (error) {
    console.error('Error fetching active delivery:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch active delivery data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}