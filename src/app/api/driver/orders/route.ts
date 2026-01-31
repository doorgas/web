import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { orders, orderItems, user, drivers, pickupLocations } from '@/lib/schema';
import { eq, desc, or, and } from 'drizzle-orm';

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

    // First get the driver ID from userId
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

    // Get orders for this driver:
    // 1. Delivery orders assigned to this driver
    // 2. Pickup orders (available to all drivers)
    const driverOrders = await db
      .select({
        order: orders,
        customer: user,
        pickupLocation: pickupLocations
      })
      .from(orders)
      .leftJoin(user, eq(orders.userId, user.id))
      .leftJoin(pickupLocations, eq(orders.pickupLocationId, pickupLocations.id))
      .where(
        or(
          // Delivery orders assigned to this driver
          and(
            eq(orders.orderType, 'delivery'),
            eq(orders.assignedDriverId, driverId)
          ),
          // Pickup orders (available to all drivers)
          eq(orders.orderType, 'pickup')
        )
      )
      .orderBy(desc(orders.createdAt));

    // Get order items for each order
    const ordersWithItems = await Promise.all(
      driverOrders.map(async (orderData) => {
        const items = await db
          .select()
          .from(orderItems)
          .where(eq(orderItems.orderId, orderData.order.id));

        // Build the order object based on order type
        const isPickupOrder = orderData.order.orderType === 'pickup';
        
        return {
          id: orderData.order.id,
          orderNumber: orderData.order.orderNumber,
          userId: orderData.order.userId || '',
          orderType: orderData.order.orderType || 'delivery',
          items: items.map(item => {
            // Parse stored variation data from addons JSON field
            let selectedAttributes = {};
            let variantSku = null;
            
            if (item.addons) {
              try {
                const addonData = typeof item.addons === 'string' ? JSON.parse(item.addons) : item.addons;
                if (addonData?.selectedAttributes) {
                  selectedAttributes = addonData.selectedAttributes;
                }
                if (addonData?.variantSku) {
                  variantSku = addonData.variantSku;
                }
              } catch (error) {
                console.error('Error parsing variation data for item:', item.id, error);
              }
            }

            return {
              id: item.id,
              productName: item.productName,
              quantity: item.quantity,
              price: parseFloat(item.price.toString()),
              totalPrice: parseFloat(item.totalPrice.toString()),
              selectedAttributes: Object.keys(selectedAttributes).length > 0 ? selectedAttributes : undefined,
              variantSku: variantSku || item.sku || undefined,
              productImage: item.productImage || undefined
            };
          }),
          total: parseFloat(orderData.order.totalAmount.toString()),
          status: orderData.order.status,
          deliveryStatus: orderData.order.deliveryStatus || 'pending',
          paymentMethod: 'cod', // Default since paymentMethod field doesn't exist in schema
          paymentStatus: orderData.order.paymentStatus,
          orderNotes: orderData.order.notes,
          // For pickup orders, show pickup location; for delivery orders, show delivery address
          deliveryAddress: isPickupOrder ? {
            street: orderData.pickupLocation?.address || 'Pickup Location',
            city: '',
            state: '',
            zipCode: '',
            instructions: orderData.pickupLocation?.instructions || '',
            latitude: orderData.pickupLocation?.latitude ? parseFloat(orderData.pickupLocation.latitude.toString()) : undefined,
            longitude: orderData.pickupLocation?.longitude ? parseFloat(orderData.pickupLocation.longitude.toString()) : undefined
          } : {
            street: orderData.order.shippingAddress1 || '',
            city: orderData.order.shippingCity || '',
            state: orderData.order.shippingState || '',
            zipCode: orderData.order.shippingPostalCode || '',
            instructions: orderData.order.shippingAddress2 || '',
            latitude: orderData.order.shippingLatitude ? parseFloat(orderData.order.shippingLatitude.toString()) : undefined,
            longitude: orderData.order.shippingLongitude ? parseFloat(orderData.order.shippingLongitude.toString()) : undefined
          },
          pickupLocation: isPickupOrder ? {
            id: orderData.pickupLocation?.id || '',
            name: orderData.pickupLocation?.name || 'Unknown Location',
            address: orderData.pickupLocation?.address || '',
            instructions: orderData.pickupLocation?.instructions || ''
          } : undefined,
          createdAt: orderData.order.createdAt?.toISOString() || new Date().toISOString(),
          customerName: orderData.customer?.name || 'Customer',
          customerPhone: orderData.customer?.phone || ''
        };
      })
    );

    return NextResponse.json({
      success: true,
      orders: ordersWithItems
    });

  } catch (error) {
    console.error('Error fetching driver orders:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch driver orders',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}