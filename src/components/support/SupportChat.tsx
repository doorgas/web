'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { MobileNav } from '@/components/layout/MobileNav';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MessageCircle, HeadphonesIcon } from 'lucide-react';

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  total: number;
  createdAt: string;
}

interface SupportChatProps {
  userId: string;
  userType?: string;
}

const SupportChat: React.FC<SupportChatProps> = ({ userId, userType = 'customer' }) => {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    fetchActiveOrders();
  }, [userId]);

  const fetchActiveOrders = async () => {
    try {
      let response;
      if (userType === 'driver') {
        // For drivers, fetch their assigned orders
        response = await fetch('/api/driver/orders');
      } else {
        // For customers, fetch their orders
        response = await fetch(`/api/orders/user/${userId}`);
      }
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          const activeOrders = data.orders.filter((order: Order) => 
            !['completed', 'cancelled'].includes(order.status)
          );
          setOrders(activeOrders);
        }
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartSupportChat = async (withOrderId = true) => {
    if (withOrderId && !selectedOrderId) return;

    setStarting(true);
    try {
      const response = await fetch('/api/chat/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          driverId: null,
          orderId: withOrderId ? selectedOrderId : null,
          isSupport: true,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        router.push(`/chat/${data.conversation.id}`);
      } else {
        const errorData = await response.json();
        console.error('Failed to create support conversation:', errorData);
      }
    } catch (error) {
      console.error('Error starting support chat:', error);
    } finally {
      setStarting(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header title="Support" />
      
      <main className="container mx-auto px-4 py-6">
        <div className="max-w-md mx-auto space-y-6">
          <Card>
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <HeadphonesIcon className="w-8 h-8 text-blue-600" />
              </div>
              <CardTitle className="text-xl">Contact Support</CardTitle>
              <p className="text-sm text-muted-foreground">
                {userType === 'driver' 
                  ? 'Need help with a delivery? Chat with our support team.'
                  : 'Need help with an order? Chat with our support team.'
                }
              </p>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {/* General Support Chat Option */}
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h3 className="font-semibold text-blue-900 mb-2">General Support</h3>
                  <p className="text-sm text-blue-700 mb-3">
                    Need help with something not related to a specific order? Start a general support chat.
                  </p>
                  <Button
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    onClick={() => handleStartSupportChat(false)}
                    disabled={starting}
                  >
                    {starting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                        Starting chat...
                      </>
                    ) : (
                      <>
                        <MessageCircle className="w-4 h-4 mr-2" />
                        Start General Support Chat
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Order-Specific Support */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Or get help with a specific {userType === 'driver' ? 'delivery' : 'order'}
                  </span>
                </div>
              </div>

              {loading ? (
                <div className="text-center py-8">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Loading your {userType === 'driver' ? 'deliveries' : 'orders'}...</p>
                </div>
              ) : orders.length === 0 ? (
                <div className="text-center py-6">
                  <MessageCircle className="w-8 h-8 text-gray-400 mx-auto mb-3" />
                  <h4 className="font-medium mb-2 text-sm">{userType === 'driver' ? 'No Active Deliveries' : 'No Active Orders'}</h4>
                  <p className="text-xs text-muted-foreground">
                    {userType === 'driver'
                      ? 'No deliveries to get specific support for at the moment.'
                      : 'No orders to get specific support for at the moment.'
                    }
                  </p>
                  {userType !== 'driver' && (
                    <Button 
                      variant="outline"
                      size="sm"
                      className="mt-3" 
                      onClick={() => router.push('/')}
                    >
                      Start Shopping
                    </Button>
                  )}
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    <label htmlFor="order-select" className="text-sm font-medium">
                      {userType === 'driver' 
                        ? 'Select a delivery to get support for:'
                        : 'Select an order to get support for:'
                      }
                    </label>
                    <Select value={selectedOrderId} onValueChange={setSelectedOrderId}>
                      <SelectTrigger>
                        <SelectValue placeholder={userType === 'driver' ? 'Choose a delivery...' : 'Choose an order...'} />
                      </SelectTrigger>
                      <SelectContent>
                        {orders.map((order) => (
                          <SelectItem key={order.id} value={order.id}>
                            <div className="flex justify-between items-center w-full">
                              <span>Order #{order.orderNumber}</span>
                              <span className="text-xs text-muted-foreground ml-2">
                                ${order.total.toFixed(2)} • {formatDate(order.createdAt)}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    className="w-full"
                    onClick={() => handleStartSupportChat(true)}
                    disabled={!selectedOrderId || starting}
                  >
                    {starting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                        Starting chat...
                      </>
                    ) : (
                      <>
                        <MessageCircle className="w-4 h-4 mr-2" />
                        Start Order Support Chat
                      </>
                    )}
                  </Button>

                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">
                      {userType === 'driver'
                        ? 'Our support team will help you with delivery-related questions.'
                        : 'Our support team will help you with your order-related questions.'
                      }
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <MobileNav userRole={userType === 'driver' ? 'driver' : 'customer'} />
    </div>
  );
};

export default SupportChat;