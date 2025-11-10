import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { OrdersClient } from '@/components/orders/OrdersClient';

export default async function Orders() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/register');
  }

  // Redirect drivers to the dedicated deliveries page
  if (session.user.userType === 'driver') {
    redirect('/deliveries');
  }

  // Default to customer orders view
  return <OrdersClient userId={session.user.id} />;
}