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

interface OrderSettings {
  minimumOrderValue: number;
  deliveryFee: number;
  shippingFee: number;
}

interface ShippingStatus {
  enabled: boolean;
  message: string;
  timestamp: string;
}

interface CheckoutClientPageProps {
  loyaltySettings: LoyaltySettings;
  customerPoints: CustomerPoints;
  orderSettings: OrderSettings;
  shippingStatus: ShippingStatus;
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
  };
}

export function CheckoutClientPage({ loyaltySettings, customerPoints, orderSettings, shippingStatus, user }: CheckoutClientPageProps) {
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
      // Calculate fees
      const deliveryFee = data.orderType === 'delivery' ? orderSettings.deliveryFee : 0;
      const shippingFee = orderSettings.shippingFee;
      const totalWithFees = total + deliveryFee + shippingFee;
      const finalTotal = totalWithFees - (data.pointsDiscountAmount || 0);
      
      // Create FormData for server action
      const formData = new FormData();
      formData.append('items', JSON.stringify(state.items));
      formData.append('total', finalTotal.toString());
      formData.append('subtotal', subtotal.toString());
      formData.append('deliveryFee', deliveryFee.toString());
      formData.append('shippingFee', shippingFee.toString());
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
        {/* Show shipping disabled message if shipping is disabled */}
        {!shippingStatus.enabled && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center space-x-2 text-red-700 mb-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span className="font-medium">Checkout Currently Unavailable</span>
            </div>
            <p className="text-red-600 text-sm">{shippingStatus.message}</p>
          </div>
        )}

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
        ) : shippingStatus.enabled ? (
          <CheckoutFormWithData
            total={total}
            loyaltySettings={loyaltySettings}
            customerPoints={customerPoints}
            orderSettings={orderSettings}
            onSubmit={handleCheckoutSubmit}
          />
        ) : (
          <div className="text-center py-12 space-y-4">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-8 h-8 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Checkout Disabled</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              {shippingStatus.message}
            </p>
            <button
              onClick={() => router.push('/cart')}
              className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              ← Back to Cart
            </button>
          </div>
        )}
      </main>
      <MobileNav />
    </div>
  );
}