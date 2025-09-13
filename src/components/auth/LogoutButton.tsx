'use client'

import { signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';

export function LogoutButton() {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      // Use signOut with redirect to ensure proper logout
      await signOut({ 
        callbackUrl: '/register',
        redirect: true
      });
    } catch (error) {
      console.error('Logout error:', error);
      // Fallback: redirect to logout page which will handle the signOut
      router.push('/logout');
    }
  };

  return (
    <Button 
      variant="outline" 
      className="w-full justify-start gap-3 text-destructive hover:text-destructive"
      onClick={handleLogout}
    >
      <LogOut className="h-4 w-4" />
      Sign Out
    </Button>
  );
}