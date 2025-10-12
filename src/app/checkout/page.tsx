import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getLoyaltySettings, getCustomerPoints, getOrderSettings, getShippingStatus } from './actions';
import { CheckoutClientPage } from './checkout-client';

export default async function CheckoutPage() {
  // Get session on server side
  const session = await getServerSession(authOptions);
  
  if (!session) {
    redirect('/login');
  }

  // Fetch loyalty data, order settings, and shipping status
  const loyaltySettings = await getLoyaltySettings();
  const customerPoints = await getCustomerPoints(session.user.id);
  const orderSettings = await getOrderSettings();
  const shippingStatus = await getShippingStatus();

  console.log('✅ Server-side data loaded for checkout:', {
    loyaltySettings,
    customerPoints,
    orderSettings,
    shippingStatus
  });

  // Pass server-side data to client component
  return (
    <CheckoutClientPage 
      loyaltySettings={loyaltySettings}
      customerPoints={customerPoints}
      orderSettings={orderSettings}
      shippingStatus={shippingStatus}
      user={session.user}
    />
  );
}