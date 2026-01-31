'use client'

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, Phone, MessageCircle, Clock, CheckCircle, Navigation, Car, Truck, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatTimeAMPM } from '@/lib/maps-utils';

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

interface DriverOrder {
  id: string;
  orderNumber: string;
  userId: string;
  orderType?: 'delivery' | 'pickup';
  items: OrderItem[];
  total: number;
  status: 'pending' | 'confirmed' | 'preparing' | 'out_for_delivery' | 'delivered' | 'completed' | 'cancelled';
  deliveryStatus: 'pending' | 'assigned' | 'out_for_delivery' | 'delivered' | 'failed';
  paymentMethod: 'cod' | 'gateway';
  paymentStatus: string;
  orderNotes?: string;
  deliveryAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    instructions?: string;
    latitude?: number;
    longitude?: number;
  };
  pickupLocation?: {
    id: string;
    name: string;
    address: string;
    instructions?: string;
  };
  createdAt: string;
  eta?: string;
  customerName?: string;
  customerPhone?: string;
}

interface DriverInfo {
  id: string;
  name: string;
  email: string;
  phone?: string;
  status: 'available' | 'busy' | 'offline';
  vehicleType: string;
  vehiclePlateNumber: string;
  baseLocation: string;
  currentLatitude?: number;
  currentLongitude?: number;
}

interface DeliveryListProps {
  session: any;
}

export function DeliveryList({ session }: DeliveryListProps) {
  const router = useRouter();
  const [driverInfo, setDriverInfo] = useState<DriverInfo | null>(null);
  const [orders, setOrders] = useState<DriverOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [etaInputs, setEtaInputs] = useState<{ [orderId: string]: string }>({});
  const [updatingStatus, setUpdatingStatus] = useState<{ [orderId: string]: boolean }>({});
  const [updatingEta, setUpdatingEta] = useState<{ [orderId: string]: boolean }>({});

  useEffect(() => {
    fetchDriverInfo();
    fetchDriverOrders();
  }, [session?.user?.id]);

  const fetchDriverInfo = async () => {
    try {
      const response = await fetch(`/api/driver/info?userId=${session?.user?.id}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setDriverInfo(data.driver);
        }
      }
    } catch (error) {
      console.error('Error fetching driver info:', error);
    }
  };

  const fetchDriverOrders = async () => {
    try {
      const response = await fetch(`/api/driver/orders?userId=${session?.user?.id}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setOrders(data.orders);
        }
      }
    } catch (error) {
      console.error('Error fetching driver orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateDeliveryStatus = useCallback(async (orderId: string, newStatus: DriverOrder['deliveryStatus'], eta?: string) => {
    // Set loading state for the specific order
    if (eta) {
      setUpdatingEta(prev => ({ ...prev, [orderId]: true }));
    } else {
      setUpdatingStatus(prev => ({ ...prev, [orderId]: true }));
    }

    try {
      const response = await fetch('/api/driver/delivery-status', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          orderId, 
          deliveryStatus: newStatus,
          driverId: driverInfo?.id,
          deliveryTime: eta
        })
      });

      if (response.ok) {
        setOrders(prevOrders => prevOrders.map(order =>
          order.id === orderId ? { ...order, deliveryStatus: newStatus } : order
        ));
      }
    } catch (error) {
      console.error('Error updating delivery status:', error);
    } finally {
      // Clear loading state
      if (eta) {
        setUpdatingEta(prev => ({ ...prev, [orderId]: false }));
      } else {
        setUpdatingStatus(prev => ({ ...prev, [orderId]: false }));
      }
    }
  }, [driverInfo?.id]);

  const activeOrders = orders.filter(order => 
    ['assigned', 'out_for_delivery'].includes(order.deliveryStatus)
  );

  const completedOrders = orders.filter(order => 
    ['delivered', 'failed'].includes(order.deliveryStatus)
  );

  const getDeliveryStatusColor = useCallback((status: string) => {
    switch (status) {
      case 'assigned': return 'bg-blue-100 text-blue-800';
      case 'out_for_delivery': return 'bg-orange-100 text-orange-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }, []);

  const formatStatus = useCallback((status: string) => {
    return status.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  }, []);

  const getNextDeliveryStatus = useCallback((currentStatus: DriverOrder['deliveryStatus']) => {
    switch (currentStatus) {
      case 'assigned': return 'out_for_delivery';
      case 'out_for_delivery': return 'delivered';
      default: return null;
    }
  }, []);

  const handleEtaInputChange = useCallback((orderId: string, value: string) => {
    setEtaInputs(prev => ({ ...prev, [orderId]: value }));
  }, []);

  const handleStatusUpdateWithEta = useCallback((orderId: string, newStatus: DriverOrder['deliveryStatus'], providedEta?: string) => {
    const eta = providedEta || etaInputs[orderId];
    
    updateDeliveryStatus(orderId, newStatus, eta);
  }, [etaInputs, updateDeliveryStatus]);

  const handleStartChat = useCallback(async (customerId: string, orderId: string) => {
    try {
      // Create or get existing conversation (driver initiating chat with customer)
      const response = await fetch('/api/chat/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerId: customerId,      // Customer to chat with
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
  }, [router]);

  const handleNavigation = useCallback((deliveryAddress: DriverOrder['deliveryAddress']) => {
    let mapUrl = '';
    
    // Use coordinates if available, otherwise use address
    if (deliveryAddress.latitude && deliveryAddress.longitude) {
      const coords = `${deliveryAddress.latitude},${deliveryAddress.longitude}`;
      mapUrl = `https://www.google.com/maps/search/?api=1&query=${coords}`;
    } else {
      // Fallback to address if coordinates not available
      const address = `${deliveryAddress.street}, ${deliveryAddress.city}, ${deliveryAddress.state} ${deliveryAddress.zipCode}`;
      const encodedAddress = encodeURIComponent(address);
      mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
    }
    
    // Detect if mobile device
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile) {
      // On mobile, try to open native app first, fallback to web
      const nativeUrl = deliveryAddress.latitude && deliveryAddress.longitude 
        ? `google.navigation:q=${deliveryAddress.latitude},${deliveryAddress.longitude}&mode=d`
        : `google.navigation:q=${encodeURIComponent(`${deliveryAddress.street}, ${deliveryAddress.city}, ${deliveryAddress.state} ${deliveryAddress.zipCode}`)}&mode=d`;
      
      // Try native app first
      window.location.href = nativeUrl;
      
      // Fallback to web after a short delay
      setTimeout(() => {
        window.open(mapUrl, '_blank', 'noopener,noreferrer');
      }, 1000);
    } else {
      // On desktop, open in new tab
      window.open(mapUrl, '_blank', 'noopener,noreferrer');
    }
  }, []);

  const formatDateTime = useCallback((dateString: string) => {
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    };
    return date.toLocaleDateString('en-US', options).replace(',', ' at');
  }, []);

  const OrderCard = React.memo(({ order }: { order: DriverOrder }) => {
    // Local state for ETA input to prevent parent re-renders
    const [localEta, setLocalEta] = useState(etaInputs[order.id] || '');
    // Local ref to maintain focus on input field
    const etaInputRef = React.useRef<HTMLInputElement>(null);
    
    // Update local ETA when parent state changes (e.g., after successful update)
    useEffect(() => {
      setLocalEta(etaInputs[order.id] || '');
    }, [etaInputs[order.id]]);
    
    return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">Order #{order.orderNumber}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {formatDateTime(order.createdAt)} • ${order.total.toFixed(2)}
            </p>
            {order.eta && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                <Clock className="h-4 w-4" />
                ETA: {order.eta}
              </div>
            )}
          </div>
          <Badge className={getDeliveryStatusColor(order.deliveryStatus)}>
            {formatStatus(order.deliveryStatus)}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Customer Info */}
        <div className="flex justify-between items-center p-3 bg-accent rounded-lg">
          <div>
            <p className="font-medium">{order.customerName || 'Customer'}</p>
            {order.customerPhone && (
              <p className="text-sm text-muted-foreground">{order.customerPhone}</p>
            )}
          </div>
          {order.deliveryStatus !== 'delivered' && (
            <div className="flex gap-2">
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => handleStartChat(order.userId, order.id)}
              >
                <MessageCircle className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="outline">
                <Phone className="h-4 w-4" />
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => handleNavigation(order.deliveryAddress)}
                title="Navigate to delivery address"
              >
                <Navigation className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Address - Delivery or Pickup Location */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">
              {order.orderType === 'pickup' ? 'Pickup Location' : 'Delivery Address'}
            </span>
            {order.orderType === 'pickup' && (
              <Badge variant="outline" className="text-xs">
                Pickup
              </Badge>
            )}
          </div>
          <div className="text-sm text-muted-foreground pl-6">
            {order.orderType === 'pickup' && order.pickupLocation ? (
              <>
                <p className="font-medium">{order.pickupLocation.name}</p>
                <p>{order.pickupLocation.address}</p>
                {order.pickupLocation.instructions && (
                  <p className="mt-1 text-xs italic text-blue-600">
                    Instructions: {order.pickupLocation.instructions}
                  </p>
                )}
              </>
            ) : (
              <>
                <p>{order.deliveryAddress.street}</p>
                <p>{order.deliveryAddress.city}, {order.deliveryAddress.state} {order.deliveryAddress.zipCode}</p>
                {order.deliveryAddress.instructions && (
                  <p className="mt-1 text-xs italic">Instructions: {order.deliveryAddress.instructions}</p>
                )}
              </>
            )}
          </div>
        </div>

        {/* Order Items */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Items ({order.items.length})</p>
          <div className="space-y-2">
            {order.items.slice(0, 2).map((item) => (
              <div key={item.id} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>{item.quantity}x {item.productName}</span>
                  <span>${item.totalPrice.toFixed(2)}</span>
                </div>
                
                {/* Show selected variant information */}
                {item.selectedAttributes && Object.keys(item.selectedAttributes).length > 0 && (
                  <div className="flex flex-wrap gap-1 ml-2">
                    {Object.entries(item.selectedAttributes).map(([key, value]) => (
                      <span key={key} className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-muted text-muted-foreground">
                        {key}: {value}
                      </span>
                    ))}
                  </div>
                )}
                
                {/* Show variant SKU if available */}
                {item.variantSku && (
                  <p className="text-xs text-muted-foreground ml-2">SKU: {item.variantSku}</p>
                )}
              </div>
            ))}
            {order.items.length > 2 && (
              <p className="text-sm text-muted-foreground">
                +{order.items.length - 2} more items
              </p>
            )}
          </div>
        </div>

        {/* Order Notes */}
        {order.orderNotes && (
          <div className="text-sm">
            <span className="font-medium">Notes: </span>
            <span className="text-muted-foreground">{order.orderNotes}</span>
          </div>
        )}

        {/* ETA Input */}
        {order.deliveryStatus === 'out_for_delivery' && (
          <div className="space-y-2">
            <Label htmlFor={`eta-${order.id}`}>Update ETA</Label>
            <div className="flex gap-2">
              <Input
                ref={etaInputRef}
                id={`eta-${order.id}`}
                type="text"
                value={localEta}
                onChange={(e) => {
                  setLocalEta(e.target.value);
                }}
                placeholder="e.g., 5:30 PM"
                className="flex-1"
                disabled={updatingEta[order.id]}
              />
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => updateDeliveryStatus(order.id, order.deliveryStatus, localEta)}
                disabled={updatingEta[order.id]}
              >
                {updatingEta[order.id] ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-1"></div>
                    Updating...
                  </>
                ) : (
                  <>
                    <Clock className="h-4 w-4 mr-1" />
                    Update
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {order.deliveryStatus !== 'delivered' && order.deliveryStatus !== 'failed' && (
          <div className="flex gap-2 pt-2">
            {getNextDeliveryStatus(order.deliveryStatus) && (
              <Button 
                size="sm" 
                onClick={() => handleStatusUpdateWithEta(order.id, getNextDeliveryStatus(order.deliveryStatus)!, localEta)}
                className="flex-1"
                disabled={updatingStatus[order.id]}
              >
                {updatingStatus[order.id] ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-1"></div>
                    Updating...
                  </>
                ) : (
                  <>
                    <Clock className="h-4 w-4 mr-1" />
                    Mark as {formatStatus(getNextDeliveryStatus(order.deliveryStatus)!)}
                  </>
                )}
              </Button>
            )}
            {order.deliveryStatus === 'out_for_delivery' && (
              <Button 
                size="sm" 
                variant="destructive"
                onClick={() => updateDeliveryStatus(order.id, 'failed')}
                disabled={updatingStatus[order.id]}
              >
                {updatingStatus[order.id] ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-1"></div>
                    Updating...
                  </>
                ) : (
                  'Mark Failed'
                )}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
    );
  }, (prevProps, nextProps) => {
    // Only re-render if the order data actually changes
    return (
      prevProps.order.id === nextProps.order.id &&
      prevProps.order.deliveryStatus === nextProps.order.deliveryStatus &&
      prevProps.order.orderNumber === nextProps.order.orderNumber &&
      prevProps.order.total === nextProps.order.total &&
      prevProps.order.createdAt === nextProps.order.createdAt
    );
  });

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-muted-foreground">Loading deliveries...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Delivery Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-2xl font-bold text-primary">{activeOrders.length}</div>
            <p className="text-sm text-muted-foreground">Active Deliveries</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-2xl font-bold text-green-600">{completedOrders.length}</div>
            <p className="text-sm text-muted-foreground">Completed Today</p>
          </CardContent>
        </Card>
      </div>

      {/* Orders Tabs */}
      <Tabs defaultValue="active" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="active" className="flex items-center gap-2">
            Active Orders ({activeOrders.length})
          </TabsTrigger>
          <TabsTrigger value="completed" className="flex items-center gap-2">
            Completed ({completedOrders.length})
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="active" className="space-y-4">
          {activeOrders.length > 0 ? (
            activeOrders.map(order => (
              <OrderCard key={order.id} order={order} />
            ))
          ) : (
            <Card>
              <CardContent className="pt-6 text-center py-12">
                <div className="text-6xl mb-4">🚗</div>
                <h3 className="text-lg font-semibold mb-2">No active deliveries</h3>
                <p className="text-muted-foreground">
                  Waiting for new orders...
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          {completedOrders.length > 0 ? (
            completedOrders.map(order => (
              <OrderCard key={order.id} order={order} />
            ))
          ) : (
            <Card>
              <CardContent className="pt-6 text-center py-12">
                <div className="text-6xl mb-4">📦</div>
                <h3 className="text-lg font-semibold mb-2">No completed deliveries</h3>
                <p className="text-muted-foreground">
                  Completed orders will appear here
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}