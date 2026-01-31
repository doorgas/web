'use client'

import { useState } from 'react';
import { MessageCircle, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

interface ChatButtonProps {
  orderId: string;
  orderStatus: string;
  hasAssignedDriver: boolean;
  isDriver?: boolean;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
}

export function ChatButton({ 
  orderId, 
  orderStatus, 
  hasAssignedDriver,
  isDriver = false,
  variant = 'outline',
  size = 'sm'
}: ChatButtonProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Check if chat is available
  const isChatAvailable = hasAssignedDriver && 
    !['delivered', 'cancelled'].includes(orderStatus);

  const handleChatClick = async () => {
    if (!isChatAvailable) {
      toast({
        title: 'Chat not available',
        description: !hasAssignedDriver 
          ? 'No driver assigned yet' 
          : 'Chat is only available for active orders',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      // Create or get chat conversation for this order
      const response = await fetch('/api/chat/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ orderId }),
      });

      if (response.ok) {
        const { conversation } = await response.json();
        // Navigate to chat page with order ID
        router.push(`/chat?orderId=${orderId}`);
      } else {
        const error = await response.json();
        toast({
          title: 'Error',
          description: error.error || 'Failed to start chat',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error starting chat:', error);
      toast({
        title: 'Error',
        description: 'Failed to start chat',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isChatAvailable) {
    return (
      <Button 
        variant="ghost" 
        size={size} 
        disabled 
        className="opacity-50"
      >
        <MessageCircle className="h-4 w-4 mr-2" />
        Chat
      </Button>
    );
  }

  return (
    <Button 
      variant={variant} 
      size={size} 
      onClick={handleChatClick}
      disabled={loading}
    >
      {loading ? (
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
      ) : (
        <MessageCircle className="h-4 w-4 mr-2" />
      )}
      Chat {isDriver ? 'Customer' : 'Driver'}
    </Button>
  );
}

interface CallButtonProps {
  orderId: string;
  orderStatus: string;
  hasAssignedDriver: boolean;
  callType: 'voice';
  isDriver?: boolean;
}

export function CallButton({ 
  orderId, 
  orderStatus, 
  hasAssignedDriver,
  callType,
  isDriver = false 
}: CallButtonProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const isCallAvailable = hasAssignedDriver && 
    !['delivered', 'cancelled'].includes(orderStatus);

  const handleCallClick = async () => {
    if (!isCallAvailable) {
      toast({
        title: 'Call not available',
        description: !hasAssignedDriver 
          ? 'No driver assigned yet' 
          : 'Calls are only available for active orders',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      // Get or create chat conversation first
      const chatResponse = await fetch('/api/chat/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ orderId }),
      });

      if (!chatResponse.ok) {
        throw new Error('Failed to get conversation');
      }

      const { conversation } = await chatResponse.json();

      // Initiate call
      const callResponse = await fetch('/api/chat/calls', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversationId: conversation.id,
        }),
      });

      if (callResponse.ok) {
        toast({
          title: 'Call initiated',
          description: 'Voice call started',
        });
      } else {
        const error = await callResponse.json();
        toast({
          title: 'Error',
          description: error.error || 'Failed to initiate call',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error initiating call:', error);
      toast({
        title: 'Error',
        description: 'Failed to initiate call',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button 
      variant="outline" 
      size="sm" 
      onClick={handleCallClick}
      disabled={loading || !isCallAvailable}
      className={!isCallAvailable ? 'opacity-50' : ''}
    >
      {loading ? (
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
      ) : (
        <Phone className="h-4 w-4 mr-2" />
      )}
      Call
    </Button>
  );
}