'use client'

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { MobileNav } from '@/components/layout/MobileNav';
import { CheckoutFormWithData } from '@/components/checkout/CheckoutFormWithData';
import { useCart } from '@/hooks/useCart';
import { useToast } from '@/hooks/use-toast';
import { processCheckout } from './actions';

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

interface CustomerPoints {
  availablePoints: number;
  totalPointsEarned: number;
  totalPointsRedeemed: number;
}

export interface CheckoutData {
  paymentMethod: 'cod';
  orderType: 'delivery' | 'pickup';
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

interface CheckoutClientPageProps {
  loyaltySettings: LoyaltySettings;
  customerPoints: CustomerPoints;
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
  };
}

export function CheckoutClientPage({ loyaltySettings, customerPoints, user }: CheckoutClientPageProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { state, clearCartWithToast } = useCart();
  const [isProcessing, setIsProcessing] = useState(false);
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);

  // Calculate total with tax
  const subtotal = state.total;
  const tax = subtotal * 0.00;
  const total = subtotal + tax;

  const handleCheckoutSubmit = async (data: CheckoutData) => {
    setIsProcessing(true);
    
    try {
      // Create FormData for server action
      const formData = new FormData();
      formData.append('items', JSON.stringify(state.items));
      formData.append('total', total.toString());
      formData.append('subtotal', subtotal.toString());
      formData.append('paymentMethod', data.paymentMethod);
      formData.append('orderType', data.orderType);
      formData.append('customerInfo', JSON.stringify(data.customerInfo));
      if (data.deliveryAddress) {
        formData.append('deliveryAddress', JSON.stringify(data.deliveryAddress));
      }
      if (data.pickupLocationId) {
        formData.append('pickupLocationId', data.pickupLocationId);
      }
      formData.append('orderNotes', data.orderNotes);
      formData.append('pointsToRedeem', (data.pointsToRedeem || 0).toString());
      formData.append('pointsDiscountAmount', (data.pointsDiscountAmount || 0).toString());

      console.log('📝 Submitting checkout with data:', {
        items: state.items.length,
        total,
        pointsToRedeem: data.pointsToRedeem,
        pointsDiscount: data.pointsDiscountAmount
      });

      // Process checkout via server action
      const result = await processCheckout(formData);
      
      if (result.success) {
        // Save order data to localStorage for the thank you page
        const orderData = {
          orderId: result.orderNumber,
          total: result.total,
          originalTotal: total,
          pointsRedeemed: data.pointsToRedeem || 0,
          pointsDiscount: data.pointsDiscountAmount || 0,
          pointsEarned: result.pointsEarned || 0,
          paymentMethod: data.paymentMethod,
          orderNotes: data.orderNotes,
          customerInfo: data.customerInfo,
          deliveryAddress: data.deliveryAddress,
          items: state.items // Include cart items with variation data
        };
        
        localStorage.setItem('lastOrder', JSON.stringify(orderData));
        
        toast({
          title: "Order placed successfully! 🎉",
          description: `Your order #${result.orderNumber} has been confirmed. ${result.pointsEarned ? `You earned ${result.pointsEarned} loyalty points!` : ''}`,
        });
        
        // Mark checkout as successful to prevent cart redirect
        setCheckoutSuccess(true);
        
        // Navigate to thank you page (cart will be cleared there)
        router.push('/thank-you');
      } else {
        throw new Error('Order processing failed');
      }
      
    } catch (error: any) {
      console.error('Order processing error:', error);
      toast({
        title: "Order failed",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Redirect to cart if empty (but not after successful checkout)
  if (state.items.length === 0 && !state.isLoading && !checkoutSuccess) {
    router.push('/cart');
    return null;
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header title="Checkout" />
      
      <main className="container mx-auto px-4 py-6 max-w-2xl">
        {isProcessing ? (
          <div className="text-center py-12 space-y-4">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
            <h2 className="text-xl font-semibold">Processing your order...</h2>
            <p className="text-muted-foreground">Please wait while we confirm your order</p>
            {loyaltySettings.enabled && (
              <p className="text-sm text-muted-foreground">
                🎁 Loyalty points will be awarded when your order is completed!
              </p>
            )}
          </div>
        ) : (
          <CheckoutFormWithData
            total={total}
            loyaltySettings={loyaltySettings}
            customerPoints={customerPoints}
            onSubmit={handleCheckoutSubmit}
          />
        )}
      </main>
      <MobileNav />
    </div>
  );
}