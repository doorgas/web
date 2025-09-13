'use client'

import { useCart as useCartContext } from '@/contexts/CartContext';
import { Product } from '@/types';
import { useToast } from '@/hooks/use-toast';

export function useCart() {
  const cart = useCartContext();
  const { toast } = useToast();

  const addToCartWithToast = (product: Product, quantity: number = 1) => {
    cart.addToCart(product, quantity);
    
    toast({
      title: "Added to cart",
      description: `${product.name} has been added to your cart`,
      duration: 2000,
    });
  };

  const removeFromCartWithToast = (productId: string, productName?: string) => {
    cart.removeFromCart(productId);
    
    toast({
      title: "Removed from cart",
      description: productName ? `${productName} has been removed from your cart` : "Item removed from cart",
      duration: 2000,
    });
  };

  const updateQuantityWithToast = (productId: string, quantity: number, productName?: string) => {
    const oldQuantity = cart.state.items.find(item => item.product.id === productId)?.quantity || 0;
    cart.updateQuantity(productId, quantity);
    
    if (quantity === 0) {
      toast({
        title: "Removed from cart",
        description: productName ? `${productName} has been removed from your cart` : "Item removed from cart",
        duration: 2000,
      });
    } else if (quantity > oldQuantity) {
      toast({
        title: "Quantity updated",
        description: `Increased quantity to ${quantity}`,
        duration: 1500,
      });
    } else if (quantity < oldQuantity) {
      toast({
        title: "Quantity updated", 
        description: `Decreased quantity to ${quantity}`,
        duration: 1500,
      });
    }
  };

  const clearCartWithToast = () => {
    const itemCount = cart.state.itemCount;
    cart.clearCart();
    
    toast({
      title: "Cart cleared",
      description: `Removed ${itemCount} item${itemCount !== 1 ? 's' : ''} from your cart`,
      duration: 2000,
    });
  };

  const isInCart = (productId: string): boolean => {
    return cart.state.items.some(item => item.product.id === productId);
  };

  const getItemQuantity = (productId: string): number => {
    const item = cart.state.items.find(item => item.product.id === productId);
    return item?.quantity || 0;
  };

  const getItemSubtotal = (productId: string): number => {
    const item = cart.state.items.find(item => item.product.id === productId);
    return item ? item.product.price * item.quantity : 0;
  };

  const getCartSummary = () => {
    const subtotal = cart.state.total;
    const deliveryFee = subtotal > 0 ? 5.99 : 0;
    const tax = subtotal * 0.08;
    const total = subtotal + deliveryFee + tax;

    return {
      subtotal,
      deliveryFee,
      tax,
      total,
      itemCount: cart.state.itemCount,
    };
  };

  return {
    // Original cart context methods
    ...cart,
    // Enhanced methods with toast notifications
    addToCartWithToast,
    removeFromCartWithToast,
    updateQuantityWithToast,
    clearCartWithToast,
    // Utility methods
    isInCart,
    getItemQuantity,
    getItemSubtotal,
    getCartSummary,
  };
}