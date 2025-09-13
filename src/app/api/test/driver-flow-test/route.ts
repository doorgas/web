import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { drivers, driverOrderRejections, orders } from '@/lib/schema';
import { eq, sql } from 'drizzle-orm';

interface TestResult {
  test: string;
  status: 'PASS' | 'FAIL';
  details: string;
  data?: any;
}

async function makeRequest(url: string, options?: RequestInit) {
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const response = await fetch(`${baseUrl}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  
  return {
    status: response.status,
    data: await response.json()
  };
}

export async function POST(req: NextRequest) {
  const results: TestResult[] = [];
  let testDrivers: any = {};
  
  try {
    console.log('🧪 Starting Driver Flow Test Suite...\n');

    // Step 1: Setup test data
    console.log('1️⃣ Setting up test data...');
    const setupResult = await makeRequest('/api/test/setup-driver-test-data', {
      method: 'POST',
      body: JSON.stringify({ action: 'setup' })
    });

    if (setupResult.status !== 200 || !setupResult.data.success) {
      results.push({
        test: 'Setup Test Data',
        status: 'FAIL',
        details: 'Failed to setup test data: ' + setupResult.data.error
      });
      return NextResponse.json({ results, success: false });
    }

    testDrivers = setupResult.data.testData.drivers;
    results.push({
      test: 'Setup Test Data',
      status: 'PASS',
      details: `Created ${testDrivers.length} drivers and ${setupResult.data.testData.orders.length} orders`,
      data: setupResult.data.testData
    });

    // Wait a bit for data to be committed
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Step 2: Test Driver 1 fetching nearby orders (should see orders within 25km)
    console.log('2️⃣ Testing Driver 1 nearby orders fetch...');
    const driver1OrdersResult = await makeRequest(
      `/api/driver/nearby-orders?userId=${testDrivers[0].userId}&radius=25`
    );

    if (driver1OrdersResult.status !== 200) {
      results.push({
        test: 'Driver 1 Fetch Nearby Orders',
        status: 'FAIL',
        details: `API returned status ${driver1OrdersResult.status}: ${driver1OrdersResult.data.error}`
      });
    } else {
      const orders = driver1OrdersResult.data.orders || [];
      const expectedOrdersCount = 3; // TEST-001, TEST-003, TEST-004 should be visible (TEST-002 too far, TEST-005 too far)
      
      results.push({
        test: 'Driver 1 Fetch Nearby Orders',
        status: orders.length >= 2 ? 'PASS' : 'FAIL',
        details: `Driver 1 sees ${orders.length} orders (expected at least 2). Orders: ${orders.map((o: any) => `${o.orderNumber} (${o.distance}km)`).join(', ')}`,
        data: orders
      });
    }

    // Step 3: Test Driver 2 fetching nearby orders (should see different orders within 20km)  
    console.log('3️⃣ Testing Driver 2 nearby orders fetch...');
    const driver2OrdersResult = await makeRequest(
      `/api/driver/nearby-orders?userId=${testDrivers[1].userId}&radius=20`
    );

    if (driver2OrdersResult.status !== 200) {
      results.push({
        test: 'Driver 2 Fetch Nearby Orders',
        status: 'FAIL',
        details: `API returned status ${driver2OrdersResult.status}: ${driver2OrdersResult.data.error}`
      });
    } else {
      const orders = driver2OrdersResult.data.orders || [];
      
      results.push({
        test: 'Driver 2 Fetch Nearby Orders', 
        status: orders.length >= 2 ? 'PASS' : 'FAIL',
        details: `Driver 2 sees ${orders.length} orders (expected at least 2). Orders: ${orders.map((o: any) => `${o.orderNumber} (${o.distance}km)`).join(', ')}`,
        data: orders
      });
    }

    // Get the first order for rejection test
    const driver1Orders = driver1OrdersResult.data.orders || [];
    const driver2Orders = driver2OrdersResult.data.orders || [];
    
    if (driver1Orders.length === 0) {
      results.push({
        test: 'Test Data Validation',
        status: 'FAIL', 
        details: 'Driver 1 has no orders to test with'
      });
      return NextResponse.json({ results, success: false });
    }

    const testOrderId = driver1Orders[0].id;
    const testOrderNumber = driver1Orders[0].orderNumber;

    // Step 4: Driver 1 rejects the first order
    console.log('4️⃣ Testing Driver 1 rejecting an order...');
    const rejectResult = await makeRequest('/api/driver/nearby-orders', {
      method: 'POST',
      body: JSON.stringify({
        userId: testDrivers[0].userId,
        orderId: testOrderId,
        action: 'reject'
      })
    });

    if (rejectResult.status !== 200) {
      results.push({
        test: 'Driver 1 Reject Order',
        status: 'FAIL',
        details: `Rejection failed with status ${rejectResult.status}: ${rejectResult.data.error}`
      });
    } else {
      results.push({
        test: 'Driver 1 Reject Order',
        status: 'PASS',
        details: `Successfully rejected order ${testOrderNumber}`,
        data: rejectResult.data
      });
    }

    // Wait for rejection to be processed
    await new Promise(resolve => setTimeout(resolve, 500));

    // Step 5: Verify rejection was recorded in database
    console.log('5️⃣ Verifying rejection was recorded in database...');
    const driverInfo = await db
      .select({ driverId: drivers.id })
      .from(drivers)
      .where(eq(drivers.userId, testDrivers[0].userId))
      .limit(1);

    if (driverInfo.length > 0) {
      const rejectionRecord = await db
        .select()
        .from(driverOrderRejections)
        .where(eq(driverOrderRejections.driverId, driverInfo[0].driverId))
        .limit(1);

      results.push({
        test: 'Verify Rejection Recorded',
        status: rejectionRecord.length > 0 ? 'PASS' : 'FAIL',
        details: rejectionRecord.length > 0 
          ? `Rejection recorded in database for driver ${driverInfo[0].driverId}`
          : 'No rejection record found in database'
      });
    }

    // Step 6: Driver 1 fetches orders again - rejected order should NOT appear
    console.log('6️⃣ Testing that rejected order no longer appears for Driver 1...');
    const driver1OrdersAfterReject = await makeRequest(
      `/api/driver/nearby-orders?userId=${testDrivers[0].userId}&radius=25`
    );

    if (driver1OrdersAfterReject.status !== 200) {
      results.push({
        test: 'Driver 1 Orders After Rejection',
        status: 'FAIL',
        details: `API call failed: ${driver1OrdersAfterReject.data.error}`
      });
    } else {
      const ordersAfter = driver1OrdersAfterReject.data.orders || [];
      const rejectedOrderStillVisible = ordersAfter.some((order: any) => order.id === testOrderId);
      
      results.push({
        test: 'Driver 1 Orders After Rejection',
        status: !rejectedOrderStillVisible ? 'PASS' : 'FAIL',
        details: rejectedOrderStillVisible 
          ? `FAILED: Rejected order ${testOrderNumber} still visible to Driver 1`
          : `SUCCESS: Rejected order ${testOrderNumber} no longer visible to Driver 1. Now sees ${ordersAfter.length} orders`,
        data: ordersAfter.map((o: any) => ({ orderNumber: o.orderNumber, distance: o.distance }))
      });
    }

    // Step 7: Driver 2 should still see the rejected order (if it's in their radius)
    console.log('7️⃣ Testing that rejected order still appears for Driver 2...');
    const driver2OrdersAfterReject = await makeRequest(
      `/api/driver/nearby-orders?userId=${testDrivers[1].userId}&radius=20`
    );

    if (driver2OrdersAfterReject.status !== 200) {
      results.push({
        test: 'Driver 2 Orders After Driver 1 Rejection',
        status: 'FAIL',
        details: `API call failed: ${driver2OrdersAfterReject.data.error}`
      });
    } else {
      const driver2OrdersAfter = driver2OrdersAfterReject.data.orders || [];
      const rejectedOrderVisibleToDriver2 = driver2OrdersAfter.some((order: any) => order.id === testOrderId);
      
      // Check if the rejected order should be visible to Driver 2 based on original distance
      const originalDriver2Order = driver2Orders.find((order: any) => order.id === testOrderId);
      const shouldBeVisibleToDriver2 = originalDriver2Order !== undefined;
      
      results.push({
        test: 'Driver 2 Orders After Driver 1 Rejection',
        status: shouldBeVisibleToDriver2 ? (rejectedOrderVisibleToDriver2 ? 'PASS' : 'FAIL') : 'PASS',
        details: shouldBeVisibleToDriver2 
          ? (rejectedOrderVisibleToDriver2 
            ? `SUCCESS: Order ${testOrderNumber} still visible to Driver 2 after Driver 1 rejection`
            : `FAILED: Order ${testOrderNumber} should still be visible to Driver 2`)
          : `Order ${testOrderNumber} was not in Driver 2's radius anyway - this is expected`,
        data: driver2OrdersAfter.map((o: any) => ({ orderNumber: o.orderNumber, distance: o.distance }))
      });
    }

    // Step 8: Driver 2 accepts an order
    console.log('8️⃣ Testing Driver 2 accepting an order...');
    const driver2AvailableOrders = driver2OrdersAfterReject.data.orders || [];
    
    if (driver2AvailableOrders.length > 0) {
      const orderToAccept = driver2AvailableOrders[0];
      const acceptResult = await makeRequest('/api/driver/nearby-orders', {
        method: 'POST',
        body: JSON.stringify({
          userId: testDrivers[1].userId,
          orderId: orderToAccept.id,
          action: 'accept'
        })
      });

      if (acceptResult.status !== 200) {
        results.push({
          test: 'Driver 2 Accept Order',
          status: 'FAIL',
          details: `Accept failed with status ${acceptResult.status}: ${acceptResult.data.error}`
        });
      } else {
        results.push({
          test: 'Driver 2 Accept Order',
          status: 'PASS',
          details: `Successfully accepted order ${orderToAccept.orderNumber}`,
          data: acceptResult.data
        });

        // Wait for assignment to be processed
        await new Promise(resolve => setTimeout(resolve, 500));

        // Step 9: Verify order is assigned and no longer appears in nearby orders
        console.log('9️⃣ Verifying accepted order is assigned and removed from nearby orders...');
        
        // Check database assignment
        const assignedOrder = await db
          .select({ assignedDriverId: orders.assignedDriverId, deliveryStatus: orders.deliveryStatus })
          .from(orders)
          .where(eq(orders.id, orderToAccept.id))
          .limit(1);

        if (assignedOrder.length > 0) {
          const isAssigned = assignedOrder[0].assignedDriverId !== null;
          const isDeliveryStatusAssigned = assignedOrder[0].deliveryStatus === 'assigned';
          
          results.push({
            test: 'Verify Order Assignment in Database',
            status: (isAssigned && isDeliveryStatusAssigned) ? 'PASS' : 'FAIL',
            details: isAssigned && isDeliveryStatusAssigned
              ? `Order ${orderToAccept.orderNumber} correctly assigned in database`
              : `Order assignment failed: assignedDriverId=${assignedOrder[0].assignedDriverId}, deliveryStatus=${assignedOrder[0].deliveryStatus}`
          });
        }

        // Check that accepted order no longer appears in nearby orders for any driver
        const driver1FinalOrders = await makeRequest(`/api/driver/nearby-orders?userId=${testDrivers[0].userId}&radius=25`);
        const driver2FinalOrders = await makeRequest(`/api/driver/nearby-orders?userId=${testDrivers[1].userId}&radius=20`);

        const acceptedOrderStillInDriver1List = (driver1FinalOrders.data.orders || []).some((order: any) => order.id === orderToAccept.id);
        const acceptedOrderStillInDriver2List = (driver2FinalOrders.data.orders || []).some((order: any) => order.id === orderToAccept.id);

        results.push({
          test: 'Verify Accepted Order Removed from Nearby Lists',
          status: (!acceptedOrderStillInDriver1List && !acceptedOrderStillInDriver2List) ? 'PASS' : 'FAIL',
          details: (!acceptedOrderStillInDriver1List && !acceptedOrderStillInDriver2List)
            ? `Accepted order ${orderToAccept.orderNumber} correctly removed from all nearby order lists`
            : `Accepted order still appears in nearby lists: Driver1=${acceptedOrderStillInDriver1List}, Driver2=${acceptedOrderStillInDriver2List}`
        });
      }
    } else {
      results.push({
        test: 'Driver 2 Accept Order',
        status: 'FAIL',
        details: 'No orders available for Driver 2 to accept'
      });
    }

    // Step 10: Test radius filtering
    console.log('🔟 Testing radius filtering...');
    const smallRadiusResult = await makeRequest(
      `/api/driver/nearby-orders?userId=${testDrivers[0].userId}&radius=1`
    );

    const largeRadiusResult = await makeRequest(
      `/api/driver/nearby-orders?userId=${testDrivers[0].userId}&radius=50`
    );

    if (smallRadiusResult.status === 200 && largeRadiusResult.status === 200) {
      const smallRadiusOrders = smallRadiusResult.data.orders || [];
      const largeRadiusOrders = largeRadiusResult.data.orders || [];
      
      results.push({
        test: 'Radius Filtering Test',
        status: smallRadiusOrders.length <= largeRadiusOrders.length ? 'PASS' : 'FAIL',
        details: `Small radius (1km): ${smallRadiusOrders.length} orders, Large radius (50km): ${largeRadiusOrders.length} orders`,
        data: {
          smallRadius: smallRadiusOrders.map((o: any) => ({ orderNumber: o.orderNumber, distance: o.distance })),
          largeRadius: largeRadiusOrders.map((o: any) => ({ orderNumber: o.orderNumber, distance: o.distance }))
        }
      });
    }

    // Final cleanup
    console.log('🧹 Cleaning up test data...');
    await makeRequest('/api/test/setup-driver-test-data', {
      method: 'POST',
      body: JSON.stringify({ action: 'cleanup' })
    });

    // Summary
    const passCount = results.filter(r => r.status === 'PASS').length;
    const failCount = results.filter(r => r.status === 'FAIL').length;
    const totalTests = results.length;

    console.log(`\n🎯 Test Suite Complete: ${passCount}/${totalTests} tests passed`);

    return NextResponse.json({
      success: true,
      summary: {
        total: totalTests,
        passed: passCount,
        failed: failCount,
        passRate: `${Math.round((passCount / totalTests) * 100)}%`
      },
      results
    });

  } catch (error) {
    console.error('Test suite error:', error);
    
    // Try to cleanup on error
    try {
      await makeRequest('/api/test/setup-driver-test-data', {
        method: 'POST', 
        body: JSON.stringify({ action: 'cleanup' })
      });
    } catch (cleanupError) {
      console.error('Cleanup error:', cleanupError);
    }

    return NextResponse.json({
      success: false,
      error: 'Test suite failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      results
    }, { status: 500 });
  }
}