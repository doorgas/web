'use client'

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Trash2, Plus, Minus } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { MobileNav } from '@/components/layout/MobileNav';
import { Button } from '@/components/ui/button';
import { ThemedButton } from '@/components/ui/themed-button';
import { Card, CardContent } from '@/components/ui/card';
import { useCart } from '@/contexts/CartContext';
import { DynamicTitle } from '@/components/DynamicTitle';

export default function CartPage() {
  const { data: session, status } = useSession();
  const { state, removeFromCart, updateQuantity } = useCart();
  const router = useRouter();

  // Redirect to register if not authenticated
  useEffect(() => {
    if (status === 'loading') return; // Still loading
    if (!session) {
      window.location.href = '/register';
      return;
    }
  }, [session, status]);

  // Show loading while checking authentication
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render content if not authenticated
  if (!session) {
    return null;
  }

  const updateItemQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity === 0) {
      removeFromCart(productId);
    } else {
      updateQuantity(productId, newQuantity);
    }
  };

  const removeItem = (productId: string) => {
    removeFromCart(productId);
  };

  const subtotal = state.total;
  const tax = subtotal * 0.00; // 8% tax
  const total = subtotal + tax;
  const cartCount = state.itemCount;

  const handleCheckout = () => {
    router.push('/checkout');
  };

  if (state.isLoading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <Header title="Your Cart" />
        
        <main className="container mx-auto px-4 py-12">
          <div className="text-center space-y-4">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-muted-foreground">Loading your cart...</p>
          </div>
        </main>

        <MobileNav  />
      </div>
    );
  }

  if (state.items.length === 0) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <Header title="Your Cart" />
        
        <main className="container mx-auto px-4 py-12">
          <div className="text-center space-y-4">
            <div className="text-6xl mb-4">🛒</div>
            <h2 className="text-2xl font-bold">Your cart is empty</h2>
            <p className="text-muted-foreground">Add some products to get started!</p>
            <ThemedButton onClick={() => router.push('/')} className="mt-6">
              Continue Shopping
            </ThemedButton>
          </div>
        </main>

        <MobileNav  />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <DynamicTitle pageTitle="Cart" />
      <Header title="Your Cart" />
      
      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Cart Items */}
        <div className="space-y-4">
          {state.items.map((item) => (
            <Card key={item.product.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex gap-4">
                  <img
                    src={item.product.image}
                    alt={item.product.name}
                    className="w-20 h-20 object-cover rounded-lg"
                  />
                  
                  <div className="flex-1 space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold">{item.product.name}</h3>
                        <p className="text-sm text-muted-foreground">{item.product.category}</p>
                        
                        {/* Show selected variant information */}
                        {item.product.selectedAttributes && Object.keys(item.product.selectedAttributes).length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {Object.entries(item.product.selectedAttributes).map(([key, value]) => (
                              <span key={key} className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-muted text-muted-foreground">
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
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(item.product.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <div className="flex items-center border rounded-lg">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => updateItemQuantity(item.product.id, item.quantity - 1)}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="px-3 py-1 text-sm font-medium">{item.quantity}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => updateItemQuantity(item.product.id, item.quantity + 1)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <div className="text-right">
                        <p className="font-semibold">${(item.product.price * item.quantity).toFixed(2)}</p>
                        <p className="text-sm text-muted-foreground">${item.product.price}/each</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Order Summary */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <h3 className="text-lg font-semibold">Order Summary</h3>
            
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Subtotal ({cartCount} items)</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax</span>
                <span>${tax.toFixed(2)}</span>
              </div>
              <div className="border-t pt-2">
                <div className="flex justify-between text-lg font-semibold">
                  <span>Total</span>
                  <span className="text-primary">${total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <ThemedButton 
              onClick={handleCheckout} 
              size="lg" 
              className="w-full" 
              variant="premium"
            >
              Proceed to Checkout
            </ThemedButton>
          </CardContent>
        </Card>
      </main>

      <MobileNav />
    </div>
  );
}