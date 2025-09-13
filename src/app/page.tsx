'use client'

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Header } from '@/components/layout/Header';
import { MobileNav } from '@/components/layout/MobileNav';
import { Footer } from '@/components/layout/Footer';
import { ProductCard } from '@/components/products/ProductCard';
import { NearbyOrders } from '@/components/driver/NearbyOrders';
import { Button } from '@/components/ui/button';
import { ThemedButton } from '@/components/ui/themed-button';
import { Badge } from '@/components/ui/badge';
import { Product } from '@/types';
import { useCart } from '@/hooks/useCart';
import { Toaster } from '@/components/ui/toaster';
import { DynamicTitle } from '@/components/DynamicTitle';

interface Category {
  id: string;
  name: string;
  slug: string;
  productCount: number;
}

export default function Home() {
  const { data: session, status } = useSession();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const { addToCartWithToast, state } = useCart();

  // Check if user is a driver (define this early to use in hooks)
  const isDriver = session?.user?.userType === 'driver';

  // Redirect to register if not authenticated
  useEffect(() => {
    if (status === 'loading') return; // Still loading
    if (!session) {
      window.location.href = '/register';
      return;
    }
  }, [session, status]);

  // Reset loading state when user type changes to driver
  useEffect(() => {
    if (isDriver) {
      setLoading(false);
      setCategories([]);
      setProducts([]);
    }
  }, [isDriver]);

  // Fetch categories on component mount (only for non-driver users)
  useEffect(() => {
    if (!isDriver && session) {
      fetchCategories();
    }
  }, [isDriver, session]);

  // Fetch products when category changes (only for non-driver users)
  useEffect(() => {
    if (!isDriver && session) {
      fetchProducts();
    }
  }, [selectedCategory, isDriver, session]);

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

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories');
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setCategories(result.data);
        }
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const url = selectedCategory === 'all' 
        ? '/api/products' 
        : `/api/products?category=${selectedCategory}`;
      
      const response = await fetch(url);
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setProducts(result.data);
        }
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = (product: Product, quantity: number) => {
    addToCartWithToast(product, quantity);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <DynamicTitle pageTitle="Home" />
      <Header title="Store name" showSearch notifications={2} />
      
      <main className="container mx-auto px-4 py-6 flex-1 mb-6">
        {/* Driver Dashboard - Show Nearby Orders at top if user is a driver */}
        {isDriver && session?.user?.id && (
          <div className="mb-6">
            <NearbyOrders userId={session.user.id} />
          </div>
        )} 

        {/* Categories - Only show for non-driver users */}
        {!isDriver && (
          <div className="flex gap-2 overflow-x-auto pb-4 mb-6">
            {categories.map((category) => (
              <ThemedButton
                key={category.id}
                variant={selectedCategory === category.slug ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(category.slug)}
                className="whitespace-nowrap"
              >
                {category.name}
                {category.productCount > 0 && (
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {category.productCount}
                  </Badge>
                )}
              </ThemedButton>
            ))}
          </div>
        )}

        {/* Products Section - Only show for non-driver users */}
        {!isDriver && (
          <>
            {/* Loading State */}
            {loading && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="bg-card rounded-lg p-4 animate-pulse">
                    <div className="aspect-square bg-muted rounded-lg mb-4"></div>
                    <div className="space-y-2">
                      <div className="h-4 bg-muted rounded w-3/4"></div>
                      <div className="h-3 bg-muted rounded w-1/2"></div>
                      <div className="h-6 bg-muted rounded w-1/4"></div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Products Grid */}
            {!loading && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {products.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onAddToCart={handleAddToCart}
                  />
                ))}
              </div>
            )}

            {!loading && products.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No products found in this category.</p>
              </div>
            )}
          </>
        )}
      </main>

      <Footer />
      <MobileNav />
      <Toaster />
    </div>
  );
}
