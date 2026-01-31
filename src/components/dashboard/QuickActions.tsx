'use client'

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Phone, MessageCircle, Settings } from 'lucide-react';
import { LogoutButton } from '@/components/auth/LogoutButton';
import { useRouter } from 'next/navigation';

export function QuickActions() {
  const router = useRouter();

  const handleSettingsClick = () => {
    router.push('/settings');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        
        <Button variant="outline" className="w-full justify-start gap-3 hidden">
          <Phone className="h-4 w-4" />
          Contact Support
        </Button>
        
        <Button variant="outline" className="w-full justify-start gap-3 hidden">
          <MessageCircle className="h-4 w-4" />
          Live Chat
        </Button>
        
        <Separator className="hidden" />
        
        <Button 
          variant="outline" 
          className="w-full justify-start gap-3"
          onClick={handleSettingsClick}
        >
          <Settings className="h-4 w-4" />
          Account Settings
        </Button>
        
        <LogoutButton />
      </CardContent>
    </Card>
  );
}