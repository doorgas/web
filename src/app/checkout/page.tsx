import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getLoyaltySettings, getCustomerPoints } from './actions';
import { CheckoutClientPage } from './checkout-client';

export default async function CheckoutPage() {
  // Get session on server side
  const session = await getServerSession(authOptions);
  
  if (!session) {
    redirect('/login');
  }

  // Fetch loyalty data directly from database
  const loyaltySettings = await getLoyaltySettings();
  const customerPoints = await getCustomerPoints(session.user.id);

  console.log('✅ Server-side loyalty data loaded for checkout:', {
    settings: loyaltySettings,
    points: customerPoints
  });

  // Pass server-side data to client component
  return (
    <CheckoutClientPage 
      loyaltySettings={loyaltySettings}
      customerPoints={customerPoints}
      user={session.user}
    />
  );
}