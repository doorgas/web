'use client'

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MessageCircle, Phone, MapPin, Clock, Star, CheckCircle } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { MobileNav } from '@/components/layout/MobileNav';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DateDisplay } from '@/components/ui/date-display';
import { formatTimeAMPM } from '@/lib/maps-utils';
import { useTheme } from '@/components/providers/ThemeProvider';
import { Skeleton } from '@/components/ui/skeleton';

interface OrderItem {
  id: string;
  productName: string;
  quantity: number;
  price: number;
  totalPrice: number;
  // Variation information
  selectedAttributes?: { [key: string]: string };
  variantSku?: string;
  productImage?: string;
}

interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  orderType?: 'delivery' | 'pickup';
  items: OrderItem[];
  total: number;
  status: 'pending' | 'confirmed' | 'preparing' | 'out_for_delivery' | 'delivered' | 'completed' | 'cancelled';
  deliveryStatus?: 'pending' | 'assigned' | 'picked_up' | 'out_for_delivery' | 'delivered' | 'failed';
  paymentMethod: 'cod' | 'gateway';
  paymentStatus: string;
  orderNotes?: string;
  deliveryAddress?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    instructions?: string;
  };
  pickupLocation?: {
    id: string;
    name: string;
    address: string;
    instructions?: string;
  };
  createdAt: string;
  eta?: string;
  assignedDriver?: {
    id: string;
    userId: string; // Add userId for chat functionality
    name: string;
    phone: string;
    vehicleType: string;
    vehiclePlateNumber: string;
    status: string;
    rating: number;
  };
  loyaltyPointsEarned: number;
}

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  preparing: 'bg-orange-100 text-orange-800',
  out_for_delivery: 'bg-purple-100 text-purple-800',
  delivered: 'bg-green-100 text-green-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800'
};

// Helper function to get status color with fallback for unknown statuses
const getStatusColor = (status: string) => {
  return statusColors[status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800';
};

interface OrdersClientProps {
  userId: string;
}

export function OrdersClient({ userId }: OrdersClientProps) {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [completingOrder, setCompletingOrder] = useState<{ [orderId: string]: boolean }>({});
  const { isLoading: themeLoading } = useTheme();

  useEffect(() => {
    fetchOrders();
  }, [userId]);

  const fetchOrders = async () => {
    try {
      const response = await fetch(`/api/orders/user/${userId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          console.log('Fetched orders data:', data.orders);
          // Debug first order's items
          if (data.orders.length > 0) {
            console.log('First order items:', data.orders[0].items);
            data.orders[0].items.forEach((item: any, index: number) => {
              console.log(`Item ${index}:`, {
                productName: item.productName,
                selectedAttributes: item.selectedAttributes,
                variantSku: item.variantSku,
                hasSelectedAttributes: !!item.selectedAttributes,
                selectedAttributesKeys: item.selectedAttributes ? Object.keys(item.selectedAttributes) : []
              });
            });
          }
          setOrders(data.orders);
        }
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartChat = async (driverId: string, orderId: string) => {
    try {
      // Create or get existing conversation
      const response = await fetch('/api/chat/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          driverId,
          orderId,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        router.push(`/chat/${data.conversation.id}`);
      } else {
        console.error('Failed to create conversation');
      }
    } catch (error) {
      console.error('Error starting chat:', error);
    }
  };

  const handleMarkCompleted = async (orderId: string) => {
    setCompletingOrder(prev => ({ ...prev, [orderId]: true }));
    
    try {
      const response = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'completed',
        }),
      });

      if (response.ok) {
        // Refresh orders list to reflect the change
        fetchOrders();
      } else {
        console.error('Failed to mark order as completed');
      }
    } catch (error) {
      console.error('Error marking order as completed:', error);
    } finally {
      setCompletingOrder(prev => ({ ...prev, [orderId]: false }));
    }
  };

  // Define completed status array
  const completedStatuses = ['completed', 'cancelled'];
  
  // Active orders: All orders that are NOT completed or cancelled
  const activeOrders = orders.filter(order => 
    !completedStatuses.includes(order.status)
  );
  
  // Past orders: Only completed or cancelled orders
  const pastOrders = orders.filter(order => 
    completedStatuses.includes(order.status)
  );

  const formatStatus = (status: string) => {
    return status.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getDriverInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const OrderCard = ({ order, showActions = true }: { order: Order; showActions?: boolean }) => (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">Order #{order.orderNumber}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {formatDate(order.createdAt)} at {formatTime(order.createdAt)}
            </p>
          </div>
          <Badge className={getStatusColor(order.status)}>
            {formatStatus(order.status)}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="flex justify-between">
          <span className="font-medium">Total: ${order.total.toFixed(2)}</span>
          <span className="text-sm text-muted-foreground capitalize">
            {order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Card Payment'}
          </span>
        </div>

        {/* Driver Assignment Section */}
        {order.assignedDriver && (
          <div className="border rounded-lg p-4 bg-accent/50">
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-semibold flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Driver Assigned
              </h4>
              {order.eta && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  ETA: {order.eta}
                </div>
              )}
            </div>
            
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                {themeLoading ? (
                  <Skeleton className="w-8 h-8 rounded-full" />
                ) : (
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                    <span className="text-xs text-primary-foreground font-bold">
                      {getDriverInitials(order.assignedDriver.name)}
                    </span>
                  </div>
                )}
                <div>
                  <p className="font-medium">{order.assignedDriver.name}</p>
                  <div className="flex items-center gap-1">
                    {/*<Star className="h-3 w-3 fill-yellow-400 text-yellow-400 mr-2" />
                    <span className="text-xs">{order.assignedDriver.rating}</span> */}
                    <span className="text-xs text-muted-foreground">
                      {order.assignedDriver.vehicleType} • {order.assignedDriver.vehiclePlateNumber}
                    </span>
                    <span className={`text-xs ml-2 px-2 py-1 rounded-full ${
                      order.assignedDriver.status === 'available' ? 'bg-green-100 text-green-800' :
                      order.assignedDriver.status === 'busy' ? 'bg-orange-100 text-orange-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {order.assignedDriver.status}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-between items-center mt-3">
              
              {/* Delivery Status */}
              {order.deliveryStatus && (
                <div className="mt-2">
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    order.deliveryStatus === 'assigned' ? 'bg-blue-100 text-blue-800' :
                    order.deliveryStatus === 'picked_up' ? 'bg-purple-100 text-purple-800' :
                    order.deliveryStatus === 'out_for_delivery' ? 'bg-orange-100 text-orange-800' :
                    order.deliveryStatus === 'delivered' ? 'bg-green-100 text-green-800' :
                    order.deliveryStatus === 'failed' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    Delivery: {formatStatus(order.deliveryStatus)}
                  </span>
                </div>
              )}
              
              {showActions && (
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => order.assignedDriver && handleStartChat(order.assignedDriver.userId, order.id)}
                  >
                    <MessageCircle className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="outline">
                    <Phone className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {order.orderNotes && (
          <div className="text-sm">
            <span className="font-medium">Notes: </span>
            <span className="text-muted-foreground">{order.orderNotes}</span>
          </div>
        )}

        {/* Address Information - Delivery or Pickup */}
        <div className="text-sm text-muted-foreground">
          {order.orderType === 'pickup' && order.pickupLocation ? (
            <div className="flex items-start gap-2">
              <div className="flex items-center gap-1 text-blue-600 font-medium">
                <MapPin className="h-4 w-4" />
                <span>Pickup Location</span>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-2">
              <div className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                <span>Delivery Address</span>
              </div>
            </div>
          )}
          
          {order.orderType === 'pickup' && order.pickupLocation ? (
            <div className="mt-1 pl-5">
              <p className="font-medium">{order.pickupLocation.name}</p>
              <p>{order.pickupLocation.address}</p>
              {order.pickupLocation.instructions && (
                <p className="text-xs italic text-blue-600 mt-1">
                  Instructions: {order.pickupLocation.instructions}
                </p>
              )}
            </div>
          ) : order.deliveryAddress ? (
            <div className="mt-1 pl-5">
              <p>{order.deliveryAddress.street}</p>
              <p>{order.deliveryAddress.city}, {order.deliveryAddress.state} {order.deliveryAddress.zipCode}</p>
              {order.deliveryAddress.instructions && (
                <p className="text-xs italic mt-1">
                  Instructions: {order.deliveryAddress.instructions}
                </p>
              )}
            </div>
          ) : null}
        </div>

        {/* Order Items Summary */}
        <div className="border-t pt-3">
          <p className="text-sm font-medium mb-2">Items ({order.items.length})</p>
          <div className="space-y-2">
            {order.items.slice(0, 2).map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <div className="flex-1">
                  <div className="flex justify-between">
                    <span>{item.quantity}x {item.productName}</span>
                    <span>${item.totalPrice.toFixed(2)}</span>
                  </div>
                  
                  {/* Show selected variant information */}
                  {item.selectedAttributes && Object.keys(item.selectedAttributes).length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {Object.entries(item.selectedAttributes).map(([key, value]) => (
                        <span key={key} className="inline-flex items-center px-1 py-0.5 rounded text-xs bg-muted text-muted-foreground">
                          {key}: {value}
                        </span>
                      ))}
                    </div>
                  )}
                  
                  {/* Show variant SKU if available */}
                  {item.variantSku && (
                    <p className="text-xs text-muted-foreground mt-1">SKU: {item.variantSku}</p>
                  )}
                </div>
              </div>
            ))}
            {order.items.length > 2 && (
              <p className="text-sm text-muted-foreground">
                +{order.items.length - 2} more items
              </p>
            )}
          </div>
        </div>

        {/* Mark as Completed Button - Show for delivered delivery orders or all pickup orders */}
        {showActions && (
          (order.orderType === 'delivery' && order.deliveryStatus === 'delivered') || 
          (order.orderType === 'pickup')
        ) && (
          <div className="border-t pt-4">
            <Button 
              className="w-full bg-green-600 hover:bg-green-700 text-white"
              onClick={() => handleMarkCompleted(order.id)}
              disabled={completingOrder[order.id]}
            >
              {completingOrder[order.id] ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                  Completing...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {order.orderType === 'pickup' ? 'Confirm Pickup Complete' : 'Mark as Completed'}
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <Header title="My Orders" />
        <main className="container mx-auto px-4 py-6">
          <div className="text-center py-12">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading your orders...</p>
          </div>
        </main>
        <MobileNav userRole="customer" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header title="My Orders" notifications={activeOrders.length} />
      
      <main className="container mx-auto px-4 py-6">
        <Tabs defaultValue="active" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="active" className="flex items-center gap-2">
              Active ({activeOrders.length})
            </TabsTrigger>
            <TabsTrigger value="past" className="flex items-center gap-2">
              Past Orders ({pastOrders.length})
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="active" className="space-y-4">
            {activeOrders.length > 0 ? (
              <>
                {activeOrders.map(order => (
                  <OrderCard key={order.id} order={order} />
                ))}
                <Card>
                  <CardContent className="pt-6 pb-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">Need help with your order?</h3>
                        <p className="text-sm text-muted-foreground">Chat with our support team</p>
                      </div>
                      <Button 
                        variant="outline"
                        onClick={() => router.push('/support')}
                      >
                        <MessageCircle className="w-4 h-4 mr-2" />
                        Get Support
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardContent className="pt-6 text-center py-12">
                  <div className="text-6xl mb-4">📦</div>
                  <h3 className="text-lg font-semibold mb-2">No active orders</h3>
                  <p className="text-muted-foreground">Start shopping to place your first order!</p>
                  <Button 
                    className="mt-4" 
                    onClick={() => router.push('/')}
                  >
                    Start Shopping
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
          
          <TabsContent value="past" className="space-y-4">
            {pastOrders.length > 0 ? (
              pastOrders.map(order => (
                <OrderCard key={order.id} order={order} showActions={false} />
              ))
            ) : (
              <Card>
                <CardContent className="pt-6 text-center py-12">
                  <div className="text-6xl mb-4">📜</div>
                  <h3 className="text-lg font-semibold mb-2">No past orders</h3>
                  <p className="text-muted-foreground">Your order history will appear here.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>

      <MobileNav userRole="customer" />
    </div>
  );
}