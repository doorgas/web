'use client'

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
// TODO: Install @twilio/conversations package
// import { Client as ConversationsClient } from '@twilio/conversations';
import { MessageCircle, Phone, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
// TODO: Create MockChat component
// import { MockChat } from './MockChat';

interface TwilioChatProps {
  orderId: string;
  orderNumber: string;
  isDriver?: boolean;
}

interface Message {
  sid: string;
  body: string;
  author: string;
  dateCreated: Date;
  isOwnMessage: boolean;
}

export function TwilioChat({ orderId, orderNumber, isDriver = false }: TwilioChatProps) {
  // TODO: Implement when Twilio packages are installed
  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          Chat - Order #{orderNumber}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center text-gray-500 py-8">
          <MessageCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p>Twilio Chat component disabled</p>
          <p className="text-sm">Packages not installed</p>
        </div>
      </CardContent>
    </Card>
  );
}