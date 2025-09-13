'use client';

import { useEffect } from 'react';
import { signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    const logout = async () => {
      try {
        // Clear any local storage data
        localStorage.clear();
        
        // Sign out from NextAuth
        await signOut({ 
          redirect: false,
          callbackUrl: '/register'
        });
        
        // Redirect to register page
        router.push('/register');
      } catch (error) {
        console.error('Logout error:', error);
        // Force redirect even if signOut fails
        router.push('/register');
      }
    };

    logout();
  }, [router]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="text-muted-foreground">Logging out...</p>
      </div>
    </div>
  );
}
