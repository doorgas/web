'use client'

import React, { useState, useEffect } from 'react';
import { MapPin, Clock, Phone, MessageCircle, DollarSign, Package, Navigation, CheckCircle, X, Timer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatTimeAMPM } from '@/lib/maps-utils';

interface OrderItem {
  id: string;
  productName: string;
  quantity: number;
  price: number;
  totalPrice: number;
}

interface DeliveryAddress {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  instructions?: string;
  latitude?: number;
  longitude?: number;
}

interface TravelTime {
  duration: string;
  durationValue: number;
  distance: string;
  distanceValue: number;
  estimatedArrivalTime: string;
}

interface NearbyOrder {
  id: string;
  orderNumber: string;
  userId: string;
  items: OrderItem[];
  total: number;
  status: string;
  deliveryStatus: string;
  paymentStatus: string;
  orderNotes?: string;
  deliveryInstructions?: string;
  deliveryAddress: DeliveryAddress;
  distance: number;
  travelTime?: TravelTime | null;
  createdAt: string;
  customerName: string;
  customerPhone: string;
  serviceDate?: string;
  serviceTime?: string;
  deliveryTime?: string;
}

interface NearbyOrdersProps {
  userId: string;
}

export function NearbyOrders({ userId }: NearbyOrdersProps) {
  const [orders, setOrders] = useState<NearbyOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchRadius, setSearchRadius] = useState(6); // Default 6 miles (approximately 10km)
  const [processingOrderId, setProcessingOrderId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchNearbyOrders();
  }, [userId, searchRadius]);

  const fetchNearbyOrders = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/driver/nearby-orders?userId=${userId}&radius=${searchRadius}`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setOrders(data.orders);
        } else {
          toast({
            title: "Info",
            description: data.message || data.error,
            variant: data.error ? "destructive" : "default",
          });
        }
      } else {
        const errorData = await response.json();
        toast({
          title: "Error",
          description: errorData.error || 'Failed to fetch nearby orders',
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error fetching nearby orders:', error);
      toast({
        title: "Error",
        description: 'Failed to fetch nearby orders',
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOrderAction = async (orderId: string, action: 'accept' | 'reject') => {
    setProcessingOrderId(orderId);
    try {
      const response = await fetch('/api/driver/nearby-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          orderId,
          action
        })
      });

      if (response.ok) {
        const data = await response.json();
        toast({
          title: "Success",
          description: data.message,
          variant: "default",
        });

        // Remove the order from the list regardless of action
        setOrders(prev => prev.filter(order => order.id !== orderId));
      } else {
        const errorData = await response.json();
        toast({
          title: "Error",
          description: errorData.error || `Failed to ${action} order`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error(`Error ${action}ing order:`, error);
      toast({
        title: "Error",
        description: `Failed to ${action} order`,
        variant: "destructive",
      });
    } finally {
      setProcessingOrderId(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'confirmed': return 'bg-blue-100 text-blue-800';
      case 'processing': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Navigation className="h-5 w-5" />
            Nearby Orders
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading nearby orders...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Navigation className="h-5 w-5" />
            Nearby Orders
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="radius" className="text-sm font-normal">Radius:</Label>
            <div className="flex items-center gap-1">
              <Input
                id="radius"
                type="number"
                value={searchRadius}
                onChange={(e) => setSearchRadius(parseInt(e.target.value) || 10)}
                min="1"
                max="50"
                className="w-16 h-8"
              />
              <span className="text-sm text-muted-foreground">mi</span>
            </div>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {orders.length === 0 ? (
          <div className="text-center py-8">
            <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No nearby orders</h3>
            <p className="text-muted-foreground">
              There are no orders within {searchRadius} miles of your current location.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={fetchNearbyOrders}
            >
              Refresh
            </Button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>{orders.length} order{orders.length !== 1 ? 's' : ''} found</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-green-600">📡 Live traffic data</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={fetchNearbyOrders}
                  disabled={loading}
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin mr-1" />
                  ) : null}
                  Refresh
                </Button>
              </div>
            </div>
            
            <div className="space-y-4">
              {orders.map((order) => (
                <Card key={order.id} className="border border-border">
                  <CardContent className="pt-4">
                    <div className="space-y-4">
                      {/* Order Header */}
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold">{order.orderNumber}</h4>
                            <Badge className={getStatusColor(order.status)}>
                              {order.status}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            {order.travelTime ? (
                              <>
                                <div className="flex items-center gap-1">
                                  <MapPin className="h-4 w-4 text-green-500" />
                                  <span className="font-medium">{order.distance.toFixed(1)} mi away</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Timer className="h-4 w-4 text-blue-500" />
                                  <span className="text-blue-600 font-medium">{order.travelTime.duration} drive</span>
                                </div>
                                <div className="flex items-center gap-1 text-xs bg-blue-50 px-2 py-1 rounded">
                                  <span className="text-blue-700">ETA: {formatTimeAMPM(new Date(order.travelTime.estimatedArrivalTime))}</span>
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="flex items-center gap-1">
                                  <MapPin className="h-4 w-4" />
                                  <span>{order.distance.toFixed(1)} mi away</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Clock className="h-4 w-4" />
                                  <span>{formatTimeAMPM(new Date(order.createdAt))}</span>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-lg">{formatCurrency(order.total)}</div>
                          <div className="text-sm text-muted-foreground">
                            {order.paymentStatus}
                          </div>
                        </div>
                      </div>

                      {/* Customer Info */}
                      <div className="bg-muted/30 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <h5 className="font-medium">{order.customerName}</h5>
                          {order.customerPhone && (
                            <Button variant="ghost" size="sm" className="h-8 px-2">
                              <Phone className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                        <div className="space-y-1 text-sm text-muted-foreground">
                          <div>{order.deliveryAddress.street}</div>
                          <div>{order.deliveryAddress.city}, {order.deliveryAddress.state} {order.deliveryAddress.zipCode}</div>
                          {order.deliveryInstructions && (
                            <div className="bg-blue-50 border border-blue-200 rounded p-2 mt-2">
                              <span className="text-blue-700 text-xs font-medium">Delivery Instructions:</span>
                              <div className="text-blue-600 text-xs">{order.deliveryInstructions}</div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Order Items */}
                      <div>
                        <h6 className="font-medium mb-2">Items ({order.items.length})</h6>
                        <div className="space-y-1">
                          {order.items.slice(0, 3).map((item) => (
                            <div key={item.id} className="flex justify-between text-sm">
                              <span>{item.quantity}x {item.productName}</span>
                              <span>{formatCurrency(item.totalPrice)}</span>
                            </div>
                          ))}
                          {order.items.length > 3 && (
                            <div className="text-sm text-muted-foreground">
                              +{order.items.length - 3} more items
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Travel Time Details */}
                      {order.travelTime && (
                        <div className="bg-green-50 border border-green-200 rounded p-2">
                          <div className="flex items-center justify-between text-xs">
                            <div>
                              <span className="text-green-700 font-medium">🗺️ Google Maps Route:</span>
                              <div className="text-green-600">
                                {order.travelTime.distance} via fastest route
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="text-green-700 font-medium">Real-time estimate</span>
                              <div className="text-green-600 font-semibold">
                                {order.travelTime.duration}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Service Time */}
                      {(order.serviceDate || order.serviceTime || order.deliveryTime) && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded p-2">
                          <span className="text-yellow-700 text-xs font-medium">Requested Delivery Time:</span>
                          <div className="text-yellow-600 text-xs">
                            {order.serviceDate && `Date: ${order.serviceDate}`}
                            {order.serviceTime && ` Time: ${order.serviceTime}`}
                            {order.deliveryTime && ` ${order.deliveryTime}`}
                          </div>
                        </div>
                      )}

                      <Separator />

                      {/* Action Buttons */}
                      <div className="flex gap-3">
                        <Button
                          onClick={() => handleOrderAction(order.id, 'accept')}
                          disabled={processingOrderId === order.id}
                          className="flex-1"
                        >
                          {processingOrderId === order.id ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                          ) : (
                            <CheckCircle className="h-4 w-4 mr-2" />
                          )}
                          Accept Order
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => handleOrderAction(order.id, 'reject')}
                          disabled={processingOrderId === order.id}
                        >
                          <X className="h-4 w-4 mr-2" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}