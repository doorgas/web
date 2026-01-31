import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { orders, orderItems, user, drivers, pickupLocations } from '@/lib/schema';
import { eq, desc, and } from 'drizzle-orm';
import { deepParseJSON, safeJsonParse } from '@/utils/jsonUtils';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Get user orders with order items, pickup locations, and assigned drivers
    const userOrders = await db
      .select({
        order: orders,
        items: orderItems,
        pickupLocation: pickupLocations,
        assignedDriver: drivers
      })
      .from(orders)
      .leftJoin(orderItems, eq(orders.id, orderItems.orderId))
      .leftJoin(pickupLocations, eq(orders.pickupLocationId, pickupLocations.id))
      .leftJoin(drivers, eq(orders.assignedDriverId, drivers.id))
      .where(eq(orders.userId, userId))
      .orderBy(desc(orders.createdAt));

    // Group orders and items
    const ordersMap = new Map();
    
    userOrders.forEach(row => {
      const order = row.order;
      const item = row.items;
      const pickupLocation = row.pickupLocation;
      const assignedDriver = row.assignedDriver;
      
      if (!ordersMap.has(order.id)) {
        ordersMap.set(order.id, {
          ...order,
          items: [],
          pickupLocation: pickupLocation,
          assignedDriver: assignedDriver
        });
      }
      
      if (item) {
        ordersMap.get(order.id).items.push(item);
      }
    });

    const ordersArray = Array.from(ordersMap.values());

    // Get driver assignments for orders that have assigned drivers
    const ordersWithDrivers = await Promise.all(
      ordersArray.map(async (order) => {
        let assignedDriver = null;
        
        if (order.assignedDriverId) {
          try {
            // Get driver details directly (same approach as admin)
            const driverData = await db
              .select({
                id: drivers.id,
                userId: drivers.userId, // Add user ID for chat functionality
                user: {
                  name: user.name,
                  phone: user.phone,
                },
                driver: {
                  licenseNumber: drivers.licenseNumber,
                  vehicleType: drivers.vehicleType,
                  vehiclePlateNumber: drivers.vehiclePlateNumber,
                  status: drivers.status,
                }
              })
              .from(drivers)
              .innerJoin(user, eq(drivers.userId, user.id))
              .where(eq(drivers.id, order.assignedDriverId))
              .limit(1);

            if (driverData.length > 0) {
              const driver = driverData[0];
              assignedDriver = {
                id: driver.id,
                userId: driver.userId, // Include user ID for chat
                name: driver.user.name || 'Unknown Driver',
                phone: driver.user.phone || '',
                vehicleType: driver.driver.vehicleType || 'Vehicle',
                vehiclePlateNumber: driver.driver.vehiclePlateNumber || '',
                status: driver.driver.status || 'offline',
                rating: 4.8 // Default rating - you can add this to driver schema later
              };
            }
          } catch (error) {
            console.error('Error fetching driver for order:', order.id, error);
          }
        }

        // Format the order data
        return {
          id: order.id,
          orderNumber: order.orderNumber,
          userId: order.userId,
          items: order.items.map((item: any) => {
            // Parse stored variation data from addons JSON field
            let selectedAttributes = {};
            let variantSku = null;
            
            console.log('Processing item:', item.id, 'productName:', item.productName);
            console.log('Raw addons data:', item.addons);
            console.log('Addons type:', typeof item.addons);
            
            if (item.addons) {
              try {
                // Use robust JSON parsing
                const addonData = deepParseJSON(item.addons);
                console.log('Parsed addon data:', addonData);
                
                if (addonData && typeof addonData === 'object') {
                  if (addonData.selectedAttributes && typeof addonData.selectedAttributes === 'object') {
                    selectedAttributes = addonData.selectedAttributes;
                    console.log('Found selectedAttributes:', selectedAttributes);
                  }
                  if (addonData.variantSku) {
                    variantSku = addonData.variantSku;
                    console.log('Found variantSku:', variantSku);
                  }
                }
              } catch (error) {
                console.error('Error parsing variation data for item:', item.id, error);
                console.error('Raw addons data:', item.addons);
              }
            } else {
              console.log('No addons data found for item:', item.id);
            }

            const finalItem = {
              id: item.id,
              productName: item.productName,
              quantity: item.quantity,
              price: parseFloat(item.price.toString()),
              totalPrice: parseFloat(item.totalPrice.toString()),
              selectedAttributes: Object.keys(selectedAttributes).length > 0 ? selectedAttributes : undefined,
              variantSku: variantSku || item.sku || undefined,
              productImage: item.productImage || undefined
            };
            
            console.log('Final item object:', finalItem);
            console.log('Has selectedAttributes?', !!finalItem.selectedAttributes);
            console.log('selectedAttributes count:', finalItem.selectedAttributes ? Object.keys(finalItem.selectedAttributes).length : 0);
            
            return finalItem;
          }),
          total: parseFloat(order.totalAmount.toString()),
          status: order.status,
          orderType: order.orderType || 'delivery',
          deliveryStatus: order.deliveryStatus, // Include delivery status for button visibility
          paymentMethod: 'cod', // Default since paymentMethod field doesn't exist in schema
          paymentStatus: order.paymentStatus,
          orderNotes: order.notes,
          deliveryAddress: order.orderType !== 'pickup' ? {
            street: order.shippingAddress1 || '',
            city: order.shippingCity || '',
            state: order.shippingState || '',
            zipCode: order.shippingPostalCode || '',
            instructions: order.deliveryInstructions || ''
          } : undefined,
          pickupLocation: order.orderType === 'pickup' && order.pickupLocation ? {
            id: order.pickupLocation.id,
            name: order.pickupLocation.name,
            address: order.pickupLocation.address,
            instructions: order.pickupLocation.instructions || ''
          } : undefined,
          createdAt: order.createdAt.toISOString(),
          eta: order.deliveryTime || null,
          assignedDriver,
          loyaltyPointsEarned: 0 // Calculate based on loyalty settings if needed
        };
      })
    );

    return NextResponse.json({
      success: true,
      orders: ordersWithDrivers
    });

  } catch (error) {
    console.error('Error fetching user orders:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch orders',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}