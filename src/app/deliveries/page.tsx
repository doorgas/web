'use client'

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { user } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { MobileNav } from '@/components/layout/MobileNav';
import { DeliveryList } from '@/components/driver/DeliveryList';
import { Button } from '@/components/ui/button';
import { HeadphonesIcon } from 'lucide-react';

export default function DeliveriesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [userType, setUserType] = useState<string>('customer');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserType = async () => {
      if (!session?.user?.id) return;
      
      try {
        const response = await fetch(`/api/user/type?userId=${session.user.id}`);
        if (response.ok) {
          const data = await response.json();
          setUserType(data.userType || 'customer');
        }
      } catch (error) {
        console.error('Error fetching user type:', error);
      } finally {
        setLoading(false);
      }
    };

    if (status === 'loading') return;
    
    if (!session) {
      redirect('/register');
      return;
    }

    fetchUserType();
  }, [session, status]);

  // If not a driver, redirect to orders page
  useEffect(() => {
    if (!loading && userType !== 'driver') {
      redirect('/orders');
    }
  }, [userType, loading]);

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <Header title="Deliveries" />
        <main className="container mx-auto px-4 py-6">
          <div className="text-center py-12">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading deliveries...</p>
          </div>
        </main>
        <MobileNav userRole="driver" />
      </div>
    );
  }

  if (!session) {
    return null; // This should not happen due to redirect, but keeps TypeScript happy
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header title="Deliveries" />
      
      <main className="container mx-auto px-4 py-6">
        <DeliveryList session={session} />
      </main>

      {/* Floating Support Button */}
      <Button
        className="fixed bottom-24 right-4 h-14 w-14 rounded-full shadow-lg bg-green-600 hover:bg-green-700"
        onClick={() => router.push('/support')}
        title="Contact Support"
      >
        <HeadphonesIcon className="h-6 w-6" />
      </Button>

      <MobileNav userRole="driver" />
    </div>
  );
}