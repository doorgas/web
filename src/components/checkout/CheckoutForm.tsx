'use client'

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Truck, DollarSign, Gift } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Address, LoyaltySettings, CustomerPoints } from '@/types';

interface CheckoutFormProps {
  total: number;
  onSubmit: (data: CheckoutData) => void;
}

export interface CheckoutData {
  paymentMethod: 'cod';
  deliveryAddress: Address;
  orderNotes: string;
  pointsToRedeem?: number;
  pointsDiscountAmount?: number;
  useAllPoints?: boolean;
}

export function CheckoutForm({ total, onSubmit }: CheckoutFormProps) {
  const { data: session } = useSession();
  const [paymentMethod, setPaymentMethod] = useState<'cod'>('cod');
  const [orderNotes, setOrderNotes] = useState('');
  const [address, setAddress] = useState<Address>({
    street: '',
    city: '',
    state: '',
    zipCode: '',
    instructions: ''
  });

  // Loyalty points state
  const [loyaltySettings, setLoyaltySettings] = useState<LoyaltySettings>({
    enabled: false,
    earningRate: 1,
    earningBasis: 'subtotal',
    redemptionValue: 0.01,
    expiryMonths: 12,
    minimumOrder: 0,
    maxRedemptionPercent: 50,
    redemptionMinimum: 100
  });
  const [customerPoints, setCustomerPoints] = useState<CustomerPoints>({
    availablePoints: 0,
    totalPointsEarned: 0,
    totalPointsRedeemed: 0
  });
  const [pointsToRedeem, setPointsToRedeem] = useState(0);
  const [pointsDiscountAmount, setPointsDiscountAmount] = useState(0);
  const [useAllPoints, setUseAllPoints] = useState(false);
  const [loadingLoyalty, setLoadingLoyalty] = useState(true);

  // Fetch loyalty settings and customer points
  useEffect(() => {
    const fetchLoyaltyData = async () => {
      try {
        // Fetch loyalty settings
        const settingsResponse = await fetch('/api/loyalty/settings');
        if (settingsResponse.ok) {
          const settingsData = await settingsResponse.json();
          if (settingsData.success) {
            setLoyaltySettings(settingsData.settings);
          }
        }

        // Fetch customer points if user is logged in
        if (session?.user?.id) {
          const pointsResponse = await fetch(`/api/loyalty/points?userId=${session.user.id}`);
          if (pointsResponse.ok) {
            const pointsData = await pointsResponse.json();
            if (pointsData.success) {
              setCustomerPoints(pointsData.points);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching loyalty data:', error);
      } finally {
        setLoadingLoyalty(false);
      }
    };

    fetchLoyaltyData();
  }, [session?.user?.id]);

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
      const subtotal = total; // No tax applied
      const maxAllowedDiscount = subtotal * (loyaltySettings.maxRedemptionPercent / 100);
      const maxPointsDiscount = customerPoints.availablePoints * loyaltySettings.redemptionValue;
      
      const finalDiscountAmount = Math.min(maxPointsDiscount, maxAllowedDiscount);
      const finalPointsToRedeem = Math.floor(finalDiscountAmount / loyaltySettings.redemptionValue);
      
      setPointsToRedeem(finalPointsToRedeem);
      setPointsDiscountAmount(finalDiscountAmount);
      setUseAllPoints(true);
    }
  };

  const calculatePointsToEarn = () => {
    if (!loyaltySettings.enabled) return 0;
    
    const subtotal = total; // No tax applied
    const baseAmount = loyaltySettings.earningBasis === 'total' ? total : subtotal;
    
    if (baseAmount < loyaltySettings.minimumOrder) return 0;
    
    return Math.floor(baseAmount * loyaltySettings.earningRate);
  };

  const finalTotal = total - pointsDiscountAmount;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      paymentMethod,
      deliveryAddress: address,
      orderNotes,
      pointsToRedeem,
      pointsDiscountAmount,
      useAllPoints
    });
  };

  const paymentMethods = [
    {
      id: 'cod',
      name: 'Cash on Delivery',
      icon: DollarSign,
      description: 'Pay when your order arrives'
    }
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Delivery Address */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Delivery Address
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="street">Street Address</Label>
            <Input
              id="street"
              value={address.street}
              onChange={(e) => setAddress({ ...address, street: e.target.value })}
              placeholder="123 Main Street"
              required
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={address.city}
                onChange={(e) => setAddress({ ...address, city: e.target.value })}
                placeholder="City"
              />
            </div>
            <div>
              <Label htmlFor="state">State</Label>
              <Input
                id="state"
                value={address.state}
                onChange={(e) => setAddress({ ...address, state: e.target.value })}
                placeholder="State"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="zipCode">ZIP Code</Label>
            <Input
              id="zipCode"
              value={address.zipCode}
              onChange={(e) => setAddress({ ...address, zipCode: e.target.value })}
              placeholder="12345"
            />
          </div>

          <div>
            <Label htmlFor="instructions">Delivery Instructions (Optional)</Label>
            <Textarea
              id="instructions"
              value={address.instructions}
              onChange={(e) => setAddress({ ...address, instructions: e.target.value })}
              placeholder="Gate code, apartment number, etc."
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Payment Method */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Method</CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup value={paymentMethod} onValueChange={(value: any) => setPaymentMethod(value)}>
            {paymentMethods.map((method) => (
              <div key={method.id} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-accent transition-colors">
                <RadioGroupItem value={method.id} id={method.id} />
                <div className="flex items-center gap-3 flex-1">
                  <method.icon className="h-5 w-5 text-primary" />
                  <div>
                    <Label htmlFor={method.id} className="font-medium cursor-pointer">
                      {method.name}
                    </Label>
                    <p className="text-sm text-muted-foreground">{method.description}</p>
                  </div>
                </div>
              </div>
            ))}
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
            placeholder="Any special requests or notes for your order..."
            rows={3}
          />
        </CardContent>
      </Card>*/}

      {/* Loyalty Points Redemption */}
      {!loadingLoyalty && loyaltySettings.enabled && session?.user?.id && customerPoints.availablePoints > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5" />
              Loyalty Points
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-purple-800">Available Points:</span>
                <span className="text-lg font-bold text-purple-600">{customerPoints.availablePoints}</span>
              </div>
              <div className="text-xs text-purple-600">
                Worth up to ${(customerPoints.availablePoints * loyaltySettings.redemptionValue).toFixed(2)} discount
              </div>
            </div>

            {/* Use All Points Toggle */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <label className="text-sm font-medium text-gray-700">Use All Available Points</label>
                <p className="text-xs text-gray-500">
                  Apply maximum discount (up to {loyaltySettings.maxRedemptionPercent}% of order)
                </p>
              </div>
              <button
                type="button"
                onClick={handleUseAllPoints}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${
                  useAllPoints ? 'bg-purple-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    useAllPoints ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Manual Points Input */}
            {!useAllPoints && (
              <div>
                <Label htmlFor="pointsToRedeem">Points to Redeem</Label>
                <div className="flex space-x-2">
                  <Input
                    id="pointsToRedeem"
                    type="number"
                    min="0"
                    max={customerPoints.availablePoints}
                    value={pointsToRedeem}
                    onChange={(e) => handlePointsRedemption(parseInt(e.target.value) || 0)}
                    placeholder={`Min: ${loyaltySettings.redemptionMinimum}`}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    onClick={() => handlePointsRedemption(customerPoints.availablePoints)}
                    variant="outline"
                    size="sm"
                  >
                    Max
                  </Button>
                </div>
                {pointsToRedeem > 0 && (
                  <div className="mt-2 text-sm text-green-600">
                    Discount: ${pointsDiscountAmount.toFixed(2)}
                  </div>
                )}
                {pointsToRedeem > 0 && pointsToRedeem < loyaltySettings.redemptionMinimum && (
                  <div className="mt-2 text-sm text-red-600">
                    Minimum {loyaltySettings.redemptionMinimum} points required for redemption
                  </div>
                )}
              </div>
            )}

            {/* Points Summary */}
            {pointsToRedeem > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="text-sm text-green-800">
                  <div className="flex justify-between">
                    <span>Points to redeem:</span>
                    <span className="font-medium">{pointsToRedeem}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Discount amount:</span>
                    <span className="font-medium">${pointsDiscountAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-green-600 mt-1">
                    <span>Remaining points:</span>
                    <span>{customerPoints.availablePoints - pointsToRedeem}</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Order Summary */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-3">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>${total.toFixed(2)}</span>
            </div>
            
            {pointsDiscountAmount > 0 && (
              <div className="flex justify-between text-purple-600">
                <span>Points Discount ({pointsToRedeem} pts):</span>
                <span>-${pointsDiscountAmount.toFixed(2)}</span>
              </div>
            )}
            
            <div className="flex justify-between">
              <span>Tax (0%):</span>
              <span>$0.00</span>
            </div>
            
            <div className="border-t pt-3">
              <div className="flex justify-between text-lg font-semibold">
                <span>Total Amount:</span>
                <span className="text-primary">${finalTotal.toFixed(2)}</span>
              </div>
            </div>

            {/* Points Preview */}
            {!loadingLoyalty && loyaltySettings.enabled && (
              <div className="border-t pt-3">
                <div className="bg-purple-50 p-3 rounded-lg">
                  <div className="text-sm font-medium text-purple-800 mb-1">🎁 Loyalty Points</div>
                  <div className="text-sm text-purple-700">
                    {session?.user?.id ? (
                      <>You will earn: <strong>{calculatePointsToEarn()} points</strong></>
                    ) : (
                      <>This order will earn: <strong>{calculatePointsToEarn()} points</strong> (requires login)</>
                    )}
                    {calculatePointsToEarn() === 0 && loyaltySettings.minimumOrder > 0 && (
                      <div className="text-xs text-purple-600 mt-1">
                        (Minimum order: ${loyaltySettings.minimumOrder})
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Button type="submit" size="lg" className="w-full" variant="premium">
        Place Order - ${finalTotal.toFixed(2)}
      </Button>
    </form>
  );
}