import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { user, drivers, orders, orderItems, products } from '@/lib/schema';
import { eq, sql } from 'drizzle-orm';
import { randomUUID } from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const { action } = await req.json();

    if (action === 'setup') {
      // Create test customers
      const customerId1 = randomUUID();
      const customerId2 = randomUUID();
      const customerId3 = randomUUID();

      // Create test drivers
      const driverUserId1 = randomUUID();
      const driverUserId2 = randomUUID();
      const driverId1 = randomUUID();
      const driverId2 = randomUUID();

      // Test coordinates (San Francisco Bay Area)
      // Driver 1: Downtown SF (37.7749, -122.4194)
      // Driver 2: Oakland (37.8044, -122.2712)
      // Orders scattered around these areas

      // Insert test customers
      await db.insert(user).values([
        {
          id: customerId1,
          name: 'Test Customer 1',
          email: 'customer1@test.com',
          userType: 'customer',
          phone: '555-0001',
          createdAt: sql`CURRENT_TIMESTAMP`,
          updatedAt: sql`CURRENT_TIMESTAMP`
        },
        {
          id: customerId2,
          name: 'Test Customer 2', 
          email: 'customer2@test.com',
          userType: 'customer',
          phone: '555-0002',
          createdAt: sql`CURRENT_TIMESTAMP`,
          updatedAt: sql`CURRENT_TIMESTAMP`
        },
        {
          id: customerId3,
          name: 'Test Customer 3',
          email: 'customer3@test.com', 
          userType: 'customer',
          phone: '555-0003',
          createdAt: sql`CURRENT_TIMESTAMP`,
          updatedAt: sql`CURRENT_TIMESTAMP`
        },
        // Test driver users
        {
          id: driverUserId1,
          name: 'Test Driver 1',
          email: 'driver1@test.com',
          userType: 'driver',
          phone: '555-1001',
          createdAt: sql`CURRENT_TIMESTAMP`,
          updatedAt: sql`CURRENT_TIMESTAMP`
        },
        {
          id: driverUserId2,
          name: 'Test Driver 2',
          email: 'driver2@test.com',
          userType: 'driver', 
          phone: '555-1002',
          createdAt: sql`CURRENT_TIMESTAMP`,
          updatedAt: sql`CURRENT_TIMESTAMP`
        }
      ]);

      // Insert test drivers
      await db.insert(drivers).values([
        {
          id: driverId1,
          userId: driverUserId1,
          licenseNumber: 'TEST-LIC-001',
          vehicleType: 'car',
          vehicleMake: 'Toyota',
          vehicleModel: 'Camry',
          vehicleYear: 2020,
          vehiclePlateNumber: 'TEST001',
          vehicleColor: 'Blue',
          baseLocation: 'San Francisco, CA',
          baseLatitude: '37.7749',
          baseLongitude: '-122.4194',
          currentLatitude: '37.7749', // Downtown SF
          currentLongitude: '-122.4194',
          status: 'available',
          isActive: true,
          maxDeliveryRadius: 25,
          createdAt: sql`CURRENT_TIMESTAMP`,
          updatedAt: sql`CURRENT_TIMESTAMP`
        },
        {
          id: driverId2,
          userId: driverUserId2,
          licenseNumber: 'TEST-LIC-002',
          vehicleType: 'car', 
          vehicleMake: 'Honda',
          vehicleModel: 'Civic',
          vehicleYear: 2021,
          vehiclePlateNumber: 'TEST002',
          vehicleColor: 'Red',
          baseLocation: 'Oakland, CA',
          baseLatitude: '37.8044',
          baseLongitude: '-122.2712', 
          currentLatitude: '37.8044', // Oakland
          currentLongitude: '-122.2712',
          status: 'available',
          isActive: true,
          maxDeliveryRadius: 20,
          createdAt: sql`CURRENT_TIMESTAMP`,
          updatedAt: sql`CURRENT_TIMESTAMP`
        }
      ]);

      // Create test product
      const productId = randomUUID();
      await db.insert(products).values({
        id: productId,
        name: 'Test Cannabis Product',
        slug: 'test-cannabis-product',
        description: 'Test product for driver delivery testing',
        price: '25.99',
        isActive: true,
        productType: 'simple',
        stockManagementType: 'quantity',
        createdAt: sql`CURRENT_TIMESTAMP`,
        updatedAt: sql`CURRENT_TIMESTAMP`
      });

      // Create test orders at various locations
      const order1Id = randomUUID();
      const order2Id = randomUUID(); 
      const order3Id = randomUUID();
      const order4Id = randomUUID();
      const order5Id = randomUUID();

      await db.insert(orders).values([
        // Order 1: Close to Driver 1 (SF) - 2km away
        {
          id: order1Id,
          orderNumber: 'TEST-001',
          userId: customerId1,
          email: 'customer1@test.com',
          phone: '555-0001',
          status: 'confirmed',
          paymentStatus: 'paid',
          fulfillmentStatus: 'pending',
          deliveryStatus: 'pending',
          subtotal: '25.99',
          totalAmount: '30.99',
          shippingAmount: '5.00',
          shippingFirstName: 'Test',
          shippingLastName: 'Customer 1',
          shippingAddress1: '123 Mission St',
          shippingCity: 'San Francisco',
          shippingState: 'CA',
          shippingPostalCode: '94103',
          shippingLatitude: '37.7849', // ~1.1km from driver 1
          shippingLongitude: '-122.4094',
          deliveryInstructions: 'Ring doorbell twice',
          createdAt: sql`CURRENT_TIMESTAMP`,
          updatedAt: sql`CURRENT_TIMESTAMP`
        },
        // Order 2: Close to Driver 2 (Oakland) - 1.5km away  
        {
          id: order2Id,
          orderNumber: 'TEST-002',
          userId: customerId2,
          email: 'customer2@test.com', 
          phone: '555-0002',
          status: 'confirmed',
          paymentStatus: 'paid',
          fulfillmentStatus: 'pending',
          deliveryStatus: 'pending',
          subtotal: '35.99',
          totalAmount: '40.99',
          shippingAmount: '5.00',
          shippingFirstName: 'Test',
          shippingLastName: 'Customer 2',
          shippingAddress1: '456 Broadway',
          shippingCity: 'Oakland',
          shippingState: 'CA',
          shippingPostalCode: '94607',
          shippingLatitude: '37.8144', // ~1.5km from driver 2
          shippingLongitude: '-122.2612',
          deliveryInstructions: 'Leave at front desk',
          createdAt: sql`CURRENT_TIMESTAMP`,
          updatedAt: sql`CURRENT_TIMESTAMP`
        },
        // Order 3: Between both drivers - 8km from Driver 1, 12km from Driver 2
        {
          id: order3Id,
          orderNumber: 'TEST-003',
          userId: customerId3,
          email: 'customer3@test.com',
          phone: '555-0003', 
          status: 'confirmed',
          paymentStatus: 'paid',
          fulfillmentStatus: 'pending',
          deliveryStatus: 'pending',
          subtotal: '45.99',
          totalAmount: '50.99',
          shippingAmount: '5.00',
          shippingFirstName: 'Test',
          shippingLastName: 'Customer 3',
          shippingAddress1: '789 Bay Bridge',
          shippingCity: 'San Francisco',
          shippingState: 'CA',
          shippingPostalCode: '94105',
          shippingLatitude: '37.7949', // Between both drivers
          shippingLongitude: '-122.3794',
          deliveryInstructions: 'Call when arrived',
          createdAt: sql`CURRENT_TIMESTAMP`,
          updatedAt: sql`CURRENT_TIMESTAMP`
        },
        // Order 4: Far from Driver 1 (30km) but close to Driver 2 (5km)
        {
          id: order4Id,
          orderNumber: 'TEST-004',
          userId: customerId1,
          email: 'customer1@test.com',
          phone: '555-0001',
          status: 'confirmed', 
          paymentStatus: 'paid',
          fulfillmentStatus: 'pending',
          deliveryStatus: 'pending',
          subtotal: '29.99',
          totalAmount: '34.99',
          shippingAmount: '5.00',
          shippingFirstName: 'Test',
          shippingLastName: 'Customer 1B',
          shippingAddress1: '321 Telegraph Ave',
          shippingCity: 'Berkeley',
          shippingState: 'CA', 
          shippingPostalCode: '94705',
          shippingLatitude: '37.8699', // Close to Driver 2, far from Driver 1
          shippingLongitude: '-122.2585',
          deliveryInstructions: 'Apartment 2B',
          createdAt: sql`CURRENT_TIMESTAMP`,
          updatedAt: sql`CURRENT_TIMESTAMP`
        },
        // Order 5: Very far from both drivers (50km+) - should not appear
        {
          id: order5Id,
          orderNumber: 'TEST-005',
          userId: customerId2,
          email: 'customer2@test.com',
          phone: '555-0002',
          status: 'confirmed',
          paymentStatus: 'paid',
          fulfillmentStatus: 'pending', 
          deliveryStatus: 'pending',
          subtotal: '19.99',
          totalAmount: '24.99',
          shippingAmount: '5.00',
          shippingFirstName: 'Test',
          shippingLastName: 'Customer 2B',
          shippingAddress1: '999 Far Away St',
          shippingCity: 'San Jose',
          shippingState: 'CA',
          shippingPostalCode: '95110',
          shippingLatitude: '37.3541', // San Jose - 50+ km from both drivers
          shippingLongitude: '-121.9552',
          deliveryInstructions: 'Gate code 1234',
          createdAt: sql`CURRENT_TIMESTAMP`,
          updatedAt: sql`CURRENT_TIMESTAMP`
        }
      ]);

      // Create order items for each order
      const orderItemsData = [
        { orderId: order1Id, orderNumber: 'TEST-001' },
        { orderId: order2Id, orderNumber: 'TEST-002' },
        { orderId: order3Id, orderNumber: 'TEST-003' },
        { orderId: order4Id, orderNumber: 'TEST-004' },
        { orderId: order5Id, orderNumber: 'TEST-005' }
      ];

      for (const orderData of orderItemsData) {
        await db.insert(orderItems).values({
          id: randomUUID(),
          orderId: orderData.orderId,
          productId: productId,
          productName: 'Test Cannabis Product',
          quantity: 1,
          price: '25.99',
          totalPrice: '25.99',
          createdAt: sql`CURRENT_TIMESTAMP`
        });
      }

      return NextResponse.json({
        success: true,
        message: 'Test data created successfully',
        testData: {
          customers: [customerId1, customerId2, customerId3],
          drivers: [
            { userId: driverUserId1, driverId: driverId1, name: 'Test Driver 1', location: 'SF Downtown' },
            { userId: driverUserId2, driverId: driverId2, name: 'Test Driver 2', location: 'Oakland' }
          ],
          orders: [
            { id: order1Id, number: 'TEST-001', location: 'SF Mission (~1.1km from Driver 1)' },
            { id: order2Id, number: 'TEST-002', location: 'Oakland Broadway (~1.5km from Driver 2)' },
            { id: order3Id, number: 'TEST-003', location: 'SF Bay Bridge (~8km from Driver 1, ~12km from Driver 2)' },
            { id: order4Id, number: 'TEST-004', location: 'Berkeley (~30km from Driver 1, ~5km from Driver 2)' },
            { id: order5Id, number: 'TEST-005', location: 'San Jose (~50km+ from both drivers)' }
          ]
        }
      });
    } 
    
    else if (action === 'cleanup') {
      // Clean up test data
      await db.delete(orderItems).where(sql`product_name = 'Test Cannabis Product'`);
      await db.delete(orders).where(sql`order_number LIKE 'TEST-%'`);
      await db.delete(drivers).where(sql`license_number LIKE 'TEST-LIC-%'`);
      await db.delete(products).where(sql`name = 'Test Cannabis Product'`);
      await db.delete(user).where(sql`email LIKE '%@test.com'`);

      return NextResponse.json({
        success: true,
        message: 'Test data cleaned up successfully'
      });
    }
    
    else {
      return NextResponse.json(
        { success: false, error: 'Invalid action. Use "setup" or "cleanup"' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Error managing test data:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to manage test data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}