import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { orders, orderItems, user, drivers, driverOrderRejections } from '@/lib/schema';
import { eq, desc, isNull, sql, and, ne, notExists } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { getTravelTimeEstimate, kmToMiles } from '@/lib/maps-utils';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const radiusMiles = parseInt(searchParams.get('radius') || '6'); // Default 6 miles radius (approximately 10km)

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    // First get the driver data including current location
    const driverData = await db
      .select({
        driverId: drivers.id,
        currentLatitude: drivers.currentLatitude,
        currentLongitude: drivers.currentLongitude,
        status: drivers.status,
        isActive: drivers.isActive
      })
      .from(drivers)
      .where(eq(drivers.userId, userId))
      .limit(1);

    if (driverData.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Driver not found' },
        { status: 404 }
      );
    }

    const driver = driverData[0];

    // Check if driver is active and available
    if (!driver.isActive || driver.status === 'offline') {
      return NextResponse.json({
        success: true,
        orders: [],
        message: 'Driver is not active or offline'
      });
    }

    // Check if driver has current location
    if (!driver.currentLatitude || !driver.currentLongitude) {
      return NextResponse.json(
        { success: false, error: 'Driver location not available. Please update your location.' },
        { status: 400 }
      );
    }

    const driverLat = parseFloat(driver.currentLatitude.toString());
    const driverLng = parseFloat(driver.currentLongitude.toString());

    // Get unassigned orders within radius using Haversine formula
    // Only get orders that are:
    // 1. Not assigned to any driver (assignedDriverId is NULL)
    // 2. Have a confirmed or pending status (not cancelled, delivered, etc.)
    // 3. Have shipping coordinates
    // 4. Are within the specified radius
    // 5. Not previously rejected by this driver
    const nearbyOrders = await db
      .select({
        order: orders,
        customer: user,
        distance: sql<number>`(
          3959 * acos(
            cos(radians(${driverLat})) * 
            cos(radians(${orders.shippingLatitude})) * 
            cos(radians(${orders.shippingLongitude}) - radians(${driverLng})) + 
            sin(radians(${driverLat})) * 
            sin(radians(${orders.shippingLatitude}))
          )
        ) AS distance`
      })
      .from(orders)
      .leftJoin(user, eq(orders.userId, user.id))
      .where(
        and(
          isNull(orders.assignedDriverId), // Not assigned to any driver
          eq(orders.deliveryStatus, 'pending'), // Pending delivery
          ne(orders.status, 'cancelled'), // Not cancelled
          ne(orders.status, 'delivered'), // Not delivered
          sql`${orders.shippingLatitude} IS NOT NULL`,
          sql`${orders.shippingLongitude} IS NOT NULL`,
          // Haversine distance filter
          sql`(
            3959 * acos(
              cos(radians(${driverLat})) * 
              cos(radians(${orders.shippingLatitude})) * 
              cos(radians(${orders.shippingLongitude}) - radians(${driverLng})) + 
              sin(radians(${driverLat})) * 
              sin(radians(${orders.shippingLatitude}))
            )
          ) <= ${radiusMiles}`,
          // Exclude orders previously rejected by this driver
          notExists(
            db.select().from(driverOrderRejections).where(
              and(
                eq(driverOrderRejections.driverId, driver.driverId),
                eq(driverOrderRejections.orderId, orders.id)
              )
            )
          )
        )
      )
      .orderBy(sql`distance ASC`, desc(orders.createdAt))
      .limit(20); // Limit to 20 orders

    // Get order items and travel time for each order
    const ordersWithItems = await Promise.all(
      nearbyOrders.map(async (orderData) => {
        const items = await db
          .select()
          .from(orderItems)
          .where(eq(orderItems.orderId, orderData.order.id));

        // Calculate travel time using Google Maps API if both coordinates are available
        let travelTime = null;
        if (orderData.order.shippingLatitude && orderData.order.shippingLongitude) {
          try {
            const destLat = parseFloat(orderData.order.shippingLatitude.toString());
            const destLng = parseFloat(orderData.order.shippingLongitude.toString());
            
            travelTime = await getTravelTimeEstimate(
              { latitude: driverLat, longitude: driverLng },
              { latitude: destLat, longitude: destLng }
            );
          } catch (error) {
            console.error('Error calculating travel time for order', orderData.order.id, ':', error);
          }
        }

        return {
          id: orderData.order.id,
          orderNumber: orderData.order.orderNumber,
          userId: orderData.order.userId || '',
          items: items.map(item => ({
            id: item.id,
            productName: item.productName,
            quantity: item.quantity,
            price: parseFloat(item.price.toString()),
            totalPrice: parseFloat(item.totalPrice.toString())
          })),
          total: parseFloat(orderData.order.totalAmount.toString()),
          status: orderData.order.status,
          deliveryStatus: orderData.order.deliveryStatus || 'pending',
          paymentStatus: orderData.order.paymentStatus,
          orderNotes: orderData.order.notes,
          deliveryInstructions: orderData.order.deliveryInstructions,
          deliveryAddress: {
            street: orderData.order.shippingAddress1 || '',
            city: orderData.order.shippingCity || '',
            state: orderData.order.shippingState || '',
            zipCode: orderData.order.shippingPostalCode || '',
            instructions: orderData.order.shippingAddress2 || '',
            latitude: orderData.order.shippingLatitude ? parseFloat(orderData.order.shippingLatitude.toString()) : undefined,
            longitude: orderData.order.shippingLongitude ? parseFloat(orderData.order.shippingLongitude.toString()) : undefined
          },
          distance: Math.round(orderData.distance * 100) / 100, // Round to 2 decimal places (already in miles)
          travelTime: travelTime ? {
            duration: travelTime.duration,
            durationValue: travelTime.durationValue,
            distance: travelTime.distance,
            distanceValue: travelTime.distanceValue,
            estimatedArrivalTime: new Date(Date.now() + (travelTime.durationValue * 1000)).toISOString()
          } : null,
          createdAt: orderData.order.createdAt?.toISOString() || new Date().toISOString(),
          customerName: orderData.customer?.name || orderData.order.shippingFirstName || 'Customer',
          customerPhone: orderData.customer?.phone || orderData.order.phone || '',
          serviceDate: orderData.order.serviceDate,
          serviceTime: orderData.order.serviceTime,
          deliveryTime: orderData.order.deliveryTime
        };
      })
    );

    return NextResponse.json({
      success: true,
      orders: ordersWithItems,
      driverLocation: {
        latitude: driverLat,
        longitude: driverLng
      },
      searchRadius: radiusMiles,
      totalOrders: ordersWithItems.length
    });

  } catch (error) {
    console.error('Error fetching nearby orders:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch nearby orders',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST endpoint for driver to accept an order
export async function POST(req: NextRequest) {
  try {
    const { userId, orderId, action } = await req.json();

    if (!userId || !orderId || !action) {
      return NextResponse.json(
        { success: false, error: 'User ID, order ID, and action are required' },
        { status: 400 }
      );
    }

    // Get driver data
    const driverData = await db
      .select({ driverId: drivers.id })
      .from(drivers)
      .where(eq(drivers.userId, userId))
      .limit(1);

    if (driverData.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Driver not found' },
        { status: 404 }
      );
    }

    const driverId = driverData[0].driverId;

    if (action === 'accept') {
      // Check if order is still available (not already assigned)
      const orderCheck = await db
        .select({ assignedDriverId: orders.assignedDriverId })
        .from(orders)
        .where(eq(orders.id, orderId))
        .limit(1);

      if (orderCheck.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Order not found' },
          { status: 404 }
        );
      }

      if (orderCheck[0].assignedDriverId) {
        return NextResponse.json(
          { success: false, error: 'Order has already been assigned to another driver' },
          { status: 409 }
        );
      }

      // Assign the order to the driver
      await db
        .update(orders)
        .set({
          assignedDriverId: driverId,
          deliveryStatus: 'assigned',
          updatedAt: sql`CURRENT_TIMESTAMP`
        })
        .where(eq(orders.id, orderId));

      return NextResponse.json({
        success: true,
        message: 'Order accepted successfully',
        orderId: orderId
      });
    } else if (action === 'reject') {
      // Record the rejection so this order won't be shown to this driver again
      try {
        await db.insert(driverOrderRejections).values({
          id: randomUUID(),
          driverId: driverId,
          orderId: orderId,
          rejectedAt: sql`CURRENT_TIMESTAMP`,
          createdAt: sql`CURRENT_TIMESTAMP`
        });
      } catch (rejectionError) {
        // If the rejection already exists (duplicate key), that's fine
        // The order is already marked as rejected for this driver
        if ((rejectionError as any)?.code !== 'ER_DUP_ENTRY') {
          console.error('Error recording rejection:', rejectionError);
        }
      }

      // The order remains unassigned and available for other drivers (but not this one)
      return NextResponse.json({
        success: true,
        message: 'Order rejected',
        orderId: orderId
      });
    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid action. Use "accept" or "reject"' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Error handling order action:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to handle order action',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}