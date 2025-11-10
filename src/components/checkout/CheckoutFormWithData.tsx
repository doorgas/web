'use client'

import { useState, useEffect } from 'react';
import { Truck, DollarSign, Gift, Star, User, Mail, Phone, MapPin, Package, Store, Package2 } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { GoogleMapsLocationPicker } from '@/components/maps/GoogleMapsLocationPicker';

interface LoyaltySettings {
  enabled: boolean;
  earningRate: number;
  earningBasis: string;
  redemptionValue: number;
  expiryMonths: number;
  minimumOrder: number;
  maxRedemptionPercent: number;
  redemptionMinimum: number;
}

interface OrderSettings {
  minimumOrderValue: number;
  deliveryFee: number;
  shippingFee: number;
}

interface CustomerPoints {
  availablePoints: number;
  totalPointsEarned: number;
  totalPointsRedeemed: number;
}

interface CheckoutData {
  paymentMethod: 'cod';
  orderType: 'delivery' | 'pickup' | 'shipping';
  customerInfo: {
    name: string;
    email: string;
    phone: string;
  };
  deliveryAddress?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    latitude?: number;
    longitude?: number;
    instructions?: string;
  };
  pickupLocationId?: string;
  orderNotes: string;
  pointsToRedeem?: number;
  pointsDiscountAmount?: number;
  useAllPoints?: boolean;
}

interface ShippingStatus {
  enabled: boolean;
  message: string;
  timestamp: string;
}

interface DeliveryStatus {
  enabled: boolean;
  message: string;
  timestamp: string;
}

interface CheckoutFormWithDataProps {
  total: number;
  loyaltySettings: LoyaltySettings;
  customerPoints: CustomerPoints;
  orderSettings: OrderSettings;
  shippingStatus: ShippingStatus;
  deliveryStatus: DeliveryStatus;
  onSubmit: (data: CheckoutData) => void;
}

interface PickupLocation {
  id: string;
  name: string;
  address: string;
  instructions?: string;
  latitude?: string;
  longitude?: string;
  isActive: boolean;
}

export function CheckoutFormWithData({ total, loyaltySettings, customerPoints, orderSettings, shippingStatus, deliveryStatus, onSubmit }: CheckoutFormWithDataProps) {
  const { state } = useCart();
  const [paymentMethod, setPaymentMethod] = useState<'cod'>('cod');
  const [orderType, setOrderType] = useState<'delivery' | 'pickup' | 'shipping'>('pickup');

  // Set initial order type to pickup (always available) and handle disabled options
  useEffect(() => {
    // If current order type is disabled, switch to pickup (always available)
    if (orderType === 'delivery' && !deliveryStatus.enabled) {
      setOrderType('pickup');
    } else if (orderType === 'shipping' && !shippingStatus.enabled) {
      setOrderType('pickup');
    }
  }, [orderType, shippingStatus.enabled, deliveryStatus.enabled]);
  const [pickupLocations, setPickupLocations] = useState<PickupLocation[]>([]);
  const [selectedPickupLocationId, setSelectedPickupLocationId] = useState<string>('');
  const [orderNotes, setOrderNotes] = useState('');
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    email: '',
    phone: ''
  });
  const [address, setAddress] = useState({
    street: '',
    city: '',
    state: '',
    zipCode: '',
    latitude: undefined as number | undefined,
    longitude: undefined as number | undefined,
    instructions: ''
  });
  const [loading, setLoading] = useState(true);
  const [showLocationPicker, setShowLocationPicker] = useState(false);

  // Loyalty points state
  const [pointsToRedeem, setPointsToRedeem] = useState(0);
  const [pointsDiscountAmount, setPointsDiscountAmount] = useState(0);
  const [useAllPoints, setUseAllPoints] = useState(false);
  
  // Order validation state
  const [orderValidationError, setOrderValidationError] = useState<string>('');

  // Fetch pickup locations when pickup is selected
  useEffect(() => {
    const fetchPickupLocations = async () => {
      if (orderType !== 'pickup') return;
      
      try {
        const response = await fetch('/api/pickup-locations');
        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            setPickupLocations(result.data);
            // Auto-select first location if available
            if (result.data.length > 0 && !selectedPickupLocationId) {
              setSelectedPickupLocationId(result.data[0].id);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching pickup locations:', error);
      }
    };

    fetchPickupLocations();
  }, [orderType, selectedPickupLocationId]);

  // Fetch user data on component mount
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await fetch('/api/settings/user');
        if (response.ok) {
          const userData = await response.json();
          
          // Auto-fill customer info
          setCustomerInfo({
            name: userData.name || '',
            email: userData.email || '',
            phone: userData.phone || ''
          });
          
          // Auto-fill address if available
          setAddress({
            street: userData.address || '',
            city: userData.city || '',
            state: userData.state || '',
            zipCode: userData.postalCode || '', // Auto-fill from postalCode
            latitude: userData.latitude ? parseFloat(userData.latitude) : undefined,
            longitude: userData.longitude ? parseFloat(userData.longitude) : undefined,
            instructions: ''
          });
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  // Handle location selection from Google Maps
  const handleLocationSelect = (location: { address: string; latitude: number; longitude: number }) => {
    // Parse the Google Maps address to extract components
    const addressParts = location.address.split(', ');
    let street = '';
    let city = '';
    let state = '';
    let zipCode = '';

    if (addressParts.length >= 4) {
      street = addressParts[0];
      city = addressParts[1];
      const stateZip = addressParts[2].split(' ');
      state = stateZip[0];
      zipCode = stateZip.slice(1).join(' ');
    } else {
      // Fallback: use full address as street
      street = location.address;
    }

    setAddress({
      ...address,
      street,
      city,
      state,
      zipCode,
      latitude: location.latitude,
      longitude: location.longitude
    });
  };

  // Calculate points that will be earned from this order
  const pointsToEarn = loyaltySettings.enabled 
    ? Math.floor((loyaltySettings.earningBasis === 'total' ? total : total) * loyaltySettings.earningRate)
    : 0;

  // Points redemption functions
  const handlePointsRedemption = (pointsToRedeem: number) => {
    if (pointsToRedeem < 0) pointsToRedeem = 0;
    if (pointsToRedeem > customerPoints.availablePoints) {
      pointsToRedeem = customerPoints.availablePoints;
    }

    // Calculate discount amount based on points
    const discountAmount = pointsToRedeem * loyaltySettings.redemptionValue;
    
    // Calculate subtotal (total - tax)
    const subtotal = total; // No tax applied
    const maxAllowedDiscount = subtotal * (loyaltySettings.maxRedemptionPercent / 100);
    
    const finalDiscountAmount = Math.min(discountAmount, maxAllowedDiscount);
    const finalPointsToRedeem = Math.floor(finalDiscountAmount / loyaltySettings.redemptionValue);

    setPointsToRedeem(finalPointsToRedeem);
    setPointsDiscountAmount(finalDiscountAmount);
    setUseAllPoints(false);
  };

  const handleUseAllPoints = () => {
    if (useAllPoints) {
      setPointsToRedeem(0);
      setPointsDiscountAmount(0);
      setUseAllPoints(false);
    } else {
      const maxPointsBasedOnPercent = Math.floor((total * loyaltySettings.maxRedemptionPercent / 100) / loyaltySettings.redemptionValue);
      const pointsToUse = Math.min(customerPoints.availablePoints, maxPointsBasedOnPercent);
      
      if (pointsToUse >= loyaltySettings.redemptionMinimum) {
        setPointsToRedeem(pointsToUse);
        setPointsDiscountAmount(pointsToUse * loyaltySettings.redemptionValue);
        setUseAllPoints(true);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const checkoutData: CheckoutData = {
      paymentMethod,
      orderType,
      customerInfo,
      deliveryAddress: (orderType === 'delivery' || orderType === 'shipping') ? address : undefined,
      pickupLocationId: orderType === 'pickup' ? selectedPickupLocationId : undefined,
      orderNotes,
      pointsToRedeem,
      pointsDiscountAmount,
      useAllPoints
    };

    onSubmit(checkoutData);
  };

  // Calculate fees based on order type - only one fee applies
  const deliveryFee = orderType === 'delivery' ? orderSettings.deliveryFee : 0;
  const shippingFee = orderType === 'shipping' ? orderSettings.shippingFee : 0;
  const subtotal = total;
  const totalWithFees = subtotal + deliveryFee + shippingFee;
  const finalTotal = totalWithFees - pointsDiscountAmount;
  
  // Validate minimum order value - only for delivery orders
  const meetsMinimumOrder = orderType !== 'delivery' || subtotal >= orderSettings.minimumOrderValue;
  
  const canUsePoints = loyaltySettings.enabled && 
                       customerPoints.availablePoints >= loyaltySettings.redemptionMinimum &&
                       total >= loyaltySettings.minimumOrder;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-6">
          <div className="h-32 bg-gray-200 rounded-lg"></div>
          <div className="h-48 bg-gray-200 rounded-lg"></div>
          <div className="h-64 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Cart Items */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Your Items ({state.itemCount})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {state.items.map((item) => (
            <div key={item.product.id} className="flex gap-3 p-3 bg-muted/50 rounded-lg">
              <img
                src={item.product.image}
                alt={item.product.name}
                className="w-12 h-12 object-cover rounded"
              />
              <div className="flex-1 min-w-0">
                <h4 className="font-medium truncate">{item.product.name}</h4>
                <p className="text-sm text-muted-foreground">{item.product.category}</p>
                
                {/* Show selected variant information */}
                {item.product.selectedAttributes && Object.keys(item.product.selectedAttributes).length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {Object.entries(item.product.selectedAttributes).map(([key, value]) => (
                      <span key={key} className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-background border">
                        {key}: {value}
                      </span>
                    ))}
                  </div>
                )}
                
                {/* Show variant SKU if available */}
                {item.product.variantSku && (
                  <p className="text-xs text-muted-foreground mt-1">SKU: {item.product.variantSku}</p>
                )}
              </div>
              <div className="text-right">
                <p className="font-medium">${(item.product.price * item.quantity).toFixed(2)}</p>
                <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                <p className="text-xs text-muted-foreground">${item.product.price.toFixed(2)} each</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>


      {/* Loyalty Points Section */}
      {loyaltySettings.enabled && (
        <Card className="border-yellow-200 bg-yellow-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-700">
              <Star className="h-5 w-5" />
              Loyalty Rewards
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Points Available */}
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium">Available Points</p>
                <p className="text-sm text-muted-foreground">
                  Worth ${(customerPoints.availablePoints * loyaltySettings.redemptionValue).toFixed(2)} in rewards
                </p>
              </div>
              <Badge variant="secondary" className="text-lg px-3 py-1">
                {customerPoints.availablePoints}
              </Badge>
            </div>

            {/* Points to Earn */}
            {pointsToEarn > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="flex items-center gap-2 text-green-700">
                  <Gift className="h-4 w-4" />
                  <span className="font-medium">You'll earn {pointsToEarn} points from this order!</span>
                </div>
                <p className="text-sm text-green-600 mt-1">
                  Points will be available when your order is completed (${(pointsToEarn * loyaltySettings.redemptionValue).toFixed(2)} reward value)
                </p>
              </div>
            )}

            {/* Points Redemption */}
            {canUsePoints && (
              <div className="space-y-3">
                <Label htmlFor="pointsToRedeem">Redeem Points (Min: {loyaltySettings.redemptionMinimum})</Label>
                <div className="flex gap-2">
                  <Input
                    id="pointsToRedeem"
                    type="number"
                    min="0"
                    max={customerPoints.availablePoints}
                    value={pointsToRedeem}
                    onChange={(e) => handlePointsRedemption(parseInt(e.target.value) || 0)}
                    placeholder="0"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleUseAllPoints}
                    className="whitespace-nowrap"
                  >
                    {useAllPoints ? 'Clear' : 'Use Max'}
                  </Button>
                </div>
                {pointsToRedeem > 0 && (
                  <p className="text-sm text-green-600">
                    💰 You'll save ${pointsDiscountAmount.toFixed(2)} with {pointsToRedeem} points
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Max {loyaltySettings.maxRedemptionPercent}% of order value (${(total * loyaltySettings.maxRedemptionPercent / 100).toFixed(2)})
                </p>
              </div>
            )}

            {!canUsePoints && customerPoints.availablePoints > 0 && (
              <div className="text-sm text-muted-foreground">
                {customerPoints.availablePoints < loyaltySettings.redemptionMinimum 
                  ? `Need ${loyaltySettings.redemptionMinimum} points minimum to redeem`
                  : `Minimum order of $${loyaltySettings.minimumOrder} required for points redemption`
                }
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Order Type Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Order Type</CardTitle>
          {(!deliveryStatus.enabled || !shippingStatus.enabled) && (
            <p className="text-sm text-muted-foreground mt-1">
              {!deliveryStatus.enabled && !shippingStatus.enabled 
                ? 'Only pickup is currently available'
                : !deliveryStatus.enabled 
                ? 'Delivery is currently unavailable'
                : 'Shipping is currently unavailable'
              }
            </p>
          )}
        </CardHeader>
        <CardContent>
          <RadioGroup value={orderType} onValueChange={(value) => setOrderType(value as 'delivery' | 'pickup' | 'shipping')}>            {/* Pickup option - always available - moved to top as default */}
            <div className="flex items-center space-x-2 p-2 rounded-md transition-colors hover:bg-gray-50">
              <RadioGroupItem value="pickup" id="pickup" />
              <Label htmlFor="pickup" className="flex items-center gap-2 cursor-pointer">
                <Store className="h-4 w-4" />
                Pickup
              </Label>
            </div>
            {/* Delivery option - show only if enabled or show as disabled */}
            <div className={`flex items-center space-x-2 p-2 rounded-md transition-colors ${
              !deliveryStatus.enabled ? 'bg-gray-50 opacity-60' : 'hover:bg-gray-50'
            }`}>
              <RadioGroupItem 
                value="delivery" 
                id="delivery" 
                disabled={!deliveryStatus.enabled}
              />
              <Label 
                htmlFor="delivery" 
                className={`flex items-center gap-2 ${
                  !deliveryStatus.enabled ? 'text-muted-foreground cursor-not-allowed' : 'cursor-pointer'
                }`}
              >
                <Truck className={`h-4 w-4 ${
                  !deliveryStatus.enabled ? 'text-gray-400' : ''
                }`} />
                Delivery
                {!deliveryStatus.enabled && (
                  <span className="text-xs text-red-500 ml-1 font-medium">(Disabled)</span>
                )}
              </Label>
            </div>
            {/* Shipping option - show only if enabled or show as disabled */}
            <div className={`flex items-center space-x-2 p-2 rounded-md transition-colors ${
              !shippingStatus.enabled ? 'bg-gray-50 opacity-60' : 'hover:bg-gray-50'
            }`}>
              <RadioGroupItem 
                value="shipping" 
                id="shipping" 
                disabled={!shippingStatus.enabled}
              />
              <Label 
                htmlFor="shipping" 
                className={`flex items-center gap-2 ${
                  !shippingStatus.enabled ? 'text-muted-foreground cursor-not-allowed' : 'cursor-pointer'
                }`}
              >
                <Package2 className={`h-4 w-4 ${
                  !shippingStatus.enabled ? 'text-gray-400' : ''
                }`} />
                Shipping
                {!shippingStatus.enabled && (
                  <span className="text-xs text-red-500 ml-1 font-medium">(Disabled)</span>
                )}
              </Label>
            </div>
          </RadioGroup>
          {/* Show delivery status message if delivery is disabled and selected */}
          {!deliveryStatus.enabled && orderType === 'delivery' && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{deliveryStatus.message}</p>
            </div>
          )}
          {/* Show shipping status message if shipping is disabled and selected */}
          {!shippingStatus.enabled && orderType === 'shipping' && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{shippingStatus.message}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pickup Location Selection */}
      {orderType === 'pickup' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Select Pickup Location
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {pickupLocations.length > 0 ? (
              <RadioGroup value={selectedPickupLocationId} onValueChange={setSelectedPickupLocationId}>
                {pickupLocations.map((location) => (
                  <div key={location.id} className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-muted/50">
                    <RadioGroupItem value={location.id} id={location.id} className="mt-1" />
                    <div className="flex-1">
                      <Label htmlFor={location.id} className="font-medium cursor-pointer">
                        {location.name}
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">{location.address}</p>
                      {location.instructions && (
                        <p className="text-sm text-blue-600 mt-1 flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {location.instructions}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </RadioGroup>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Store className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No pickup locations available at this time.</p>
                <p className="text-sm">Please select delivery instead.</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Customer Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Customer Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="name">Full Name *</Label>
            <Input
              id="name"
              required
              value={customerInfo.name}
              className="bg-gray-100 cursor-not-allowed"
              readOnly
              onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
              placeholder="John Doe"
            />
          </div>
          <div>
            <Label htmlFor="email">Email Address *</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                required
                className="pl-10 bg-gray-100 cursor-not-allowed"
                value={customerInfo.email}
                readOnly
                onChange={(e) => setCustomerInfo({ ...customerInfo, email: e.target.value })}
                placeholder="john@example.com"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="phone">Phone Number *</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="phone"
                type="tel"
                required
                className="pl-10 bg-gray-100 cursor-not-allowed"
                value={customerInfo.phone}
                readOnly
                onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
                placeholder="+1 (555) 123-4567"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delivery/Shipping Address - Show for delivery and shipping orders */}
      {(orderType === 'delivery' || orderType === 'shipping') && (
        <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {orderType === 'delivery' ? (
                <Truck className="h-5 w-5" />
              ) : (
                <Package2 className="h-5 w-5" />
              )}
              {orderType === 'delivery' ? 'Delivery Address' : 'Shipping Address'}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowLocationPicker(!showLocationPicker)}
              className="flex items-center gap-2"
            >
              <MapPin className="h-4 w-4" />
              {showLocationPicker ? 'Manual Entry' : 'Use Map'}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {showLocationPicker ? (
            <div className="space-y-4">
              {address.latitude && address.longitude && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm">
                  <div className="font-medium text-green-700 mb-1 flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Using Your Saved Location
                  </div>
                  <div className="text-green-600">{address.street}</div>
                  {address.city && <div className="text-green-600">{address.city}, {address.state} {address.zipCode}</div>}
                  <div className="text-green-500 text-xs mt-1">
                    Coordinates: {address.latitude?.toFixed(6)}, {address.longitude?.toFixed(6)}
                  </div>
                </div>
              )}
              <GoogleMapsLocationPicker
                onLocationSelect={handleLocationSelect}
                initialAddress={address.street + (address.city ? `, ${address.city}` : '') + (address.state ? `, ${address.state}` : '') + (address.zipCode ? ` ${address.zipCode}` : '')}
                initialLatitude={address.latitude}
                initialLongitude={address.longitude}
                height="350px"
                required={true}
              />
            </div>
          ) : (
            <>
              {address.latitude && address.longitude && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm">
                  <div className="font-medium text-green-700 mb-1 flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Using Your Saved Location
                  </div>
                  <div className="text-green-600">GPS coordinates available for accurate delivery</div>
                </div>
              )}
              <div>
                <Label htmlFor="street">Street Address *</Label>
                <Input
                  id="street"
                  required
                  value={address.street}
                  onChange={(e) => setAddress({ ...address, street: e.target.value })}
                  placeholder="123 Main St"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={address.city}
                    onChange={(e) => setAddress({ ...address, city: e.target.value })}
                    placeholder="New York"
                  />
                </div>
                <div>
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    value={address.state}
                    onChange={(e) => setAddress({ ...address, state: e.target.value })}
                    placeholder="NY"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="zipCode">ZIP Code</Label>
                <Input
                  id="zipCode"
                  value={address.zipCode}
                  onChange={(e) => setAddress({ ...address, zipCode: e.target.value })}
                  placeholder="10001"
                />
              </div>
            </>
          )}
          <div>
            <Label htmlFor="instructions">Delivery Instructions</Label>
            <Textarea
              id="instructions"
              value={address.instructions}
              onChange={(e) => setAddress({ ...address, instructions: e.target.value })}
              placeholder="Leave at door, ring bell, etc."
            />
          </div>
        </CardContent>
      </Card>
      )}

      {/* Payment Method */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Method</CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as 'cod')}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="cod" id="cod" />
              <Label htmlFor="cod">Cash on Delivery</Label>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Order Notes 
      <Card>
        <CardHeader>
          <CardTitle>Order Notes (Optional)</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={orderNotes}
            onChange={(e) => setOrderNotes(e.target.value)}
            placeholder="Any special instructions for your order..."
          />
        </CardContent>
      </Card>*/}

      {/* Order Summary - Moved before Submit Button */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Order Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>
          {deliveryFee > 0 && (
            <div className="flex justify-between">
              <span>Delivery Fee</span>
              <span>${deliveryFee.toFixed(2)}</span>
            </div>
          )}
          {shippingFee > 0 && orderType === 'shipping' && (
            <div className="flex justify-between">
              <span>Shipping Fee</span>
              <span>${shippingFee.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span>Tax</span>
            <span>$0.00</span>
          </div>
          {pointsDiscountAmount > 0 && (
            <div className="flex justify-between text-green-600">
              <span>Points Discount (-{pointsToRedeem} pts)</span>
              <span>-${pointsDiscountAmount.toFixed(2)}</span>
            </div>
          )}
          <div className="border-t pt-2">
            <div className="flex justify-between font-bold text-lg">
              <span>Total</span>
              <span>${finalTotal.toFixed(2)}</span>
            </div>
          </div>
          {!meetsMinimumOrder && orderType === 'delivery' && orderSettings.minimumOrderValue > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-4">
              <p className="text-red-700 text-sm font-medium">
                Minimum order value for delivery: ${orderSettings.minimumOrderValue.toFixed(2)}
              </p>
              <p className="text-red-600 text-xs mt-1">
                Add ${(orderSettings.minimumOrderValue - subtotal).toFixed(2)} more to proceed
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Submit Button */}
      <Button 
        type="submit" 
        className="w-full" 
        size="lg"
        disabled={!meetsMinimumOrder}
      >
        {meetsMinimumOrder ? (
          <>
            Place Order - ${finalTotal.toFixed(2)}
            {pointsToEarn > 0 && (
              <span className="ml-2 text-xs">
                (+{pointsToEarn} pts)
              </span>
            )}
          </>
        ) : (
          `Minimum order: $${orderSettings.minimumOrderValue.toFixed(2)}`
        )}
      </Button>
    </form>
  );
}