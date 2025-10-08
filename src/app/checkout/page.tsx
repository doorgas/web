import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getLoyaltySettings, getCustomerPoints, getOrderSettings } from './actions';
import { CheckoutClientPage } from './checkout-client';

export default async function CheckoutPage() {
  // Get session on server side
  const session = await getServerSession(authOptions);
  
  if (!session) {
    redirect('/login');
  }

  // Fetch loyalty data and order settings directly from database
  const loyaltySettings = await getLoyaltySettings();
  const customerPoints = await getCustomerPoints(session.user.id);
  const orderSettings = await getOrderSettings();

  console.log('✅ Server-side data loaded for checkout:', {
    loyaltySettings,
    customerPoints,
    orderSettings
  });

  // Pass server-side data to client component
  return (
    <CheckoutClientPage 
      loyaltySettings={loyaltySettings}
      customerPoints={customerPoints}
      orderSettings={orderSettings}
      user={session.user}
    />
  );
}