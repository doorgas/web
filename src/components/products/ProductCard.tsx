'use client'

import { useState } from 'react';
import { Plus, Minus, ShoppingCart, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Product } from '@/types';
import { useRouter } from 'next/navigation';

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product, quantity: number) => void;
}

export function ProductCard({ product, onAddToCart }: ProductCardProps) {
  const [quantity, setQuantity] = useState(1);
  const [imageError, setImageError] = useState(false);
  const router = useRouter();

  const handleAddToCart = () => {
    onAddToCart(product, quantity);
    setQuantity(1);
  };

  const getStrainColor = (strain: string) => {
    switch (strain) {
      case 'indica': return 'bg-purple-100 text-purple-800';
      case 'sativa': return 'bg-orange-100 text-orange-800';
      case 'hybrid': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card className="overflow-hidden hover:shadow-card transition-all duration-300 hover:scale-[1.02] bg-gradient-card">
      <div 
        className="aspect-square relative overflow-hidden cursor-pointer"
        onClick={() => router.push(`/product/${product.id}`)}
      >
        {product.image && !imageError ? (
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center">
            <Package className="w-16 h-16 text-muted-foreground/50" />
          </div>
        )}
        {!product.inStock && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <Badge variant="destructive">Out of Stock</Badge>
          </div>
        )}
        <Badge 
          className="absolute top-2 right-2 bg-blue-100 text-blue-800"
        >
          {product.category}
        </Badge>
      </div>
      
      <CardContent className="p-4">
        <div className="space-y-3">
          <div>
            <h3 className="font-semibold text-lg text-foreground">{product.name}</h3>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {product.description.replace(/<[^>]*>/g, '')}
            </p>
          </div>

          <div className="flex justify-between items-center text-sm hidden">
            <div className="flex gap-2">
              <Badge variant="outline">THC: {product.thc}%</Badge>
              <Badge variant="outline">CBD: {product.cbd}%</Badge>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <div>
              <div className="text-2xl font-bold text-primary">
                {product.isVariableProduct && product.minPrice && product.maxPrice ? (
                  product.minPrice === product.maxPrice ? (
                    `$${product.minPrice.toFixed(2)}`
                  ) : (
                    `$${product.minPrice.toFixed(2)} - $${product.maxPrice.toFixed(2)}`
                  )
                ) : (
                  `$${product.price.toFixed(2)}`
                )}
              </div>
              {product.isVariableProduct && product.minPrice && product.maxPrice && product.minPrice !== product.maxPrice && (
                <div className="text-xs text-muted-foreground">Price varies by option</div>
              )}
            </div>
            
            {product.inStock && (
              <div className="flex items-center gap-2">
                {/* Hide quantity selector and add to cart for variable products */}
                {!product.isVariableProduct && (
                  <>
                    <div className="flex items-center border rounded-lg">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="px-3 py-1 text-sm font-medium">{quantity}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setQuantity(quantity + 1)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <Button 
                      size="sm" 
                      onClick={handleAddToCart}
                      className="gap-1"
                    >
                      <ShoppingCart className="h-4 w-4" />
                      Add
                    </Button>
                  </>
                )}
                
                {/* Show "Select Options" button for variable products */}
                {product.isVariableProduct && (
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => router.push(`/product/${product.id}`)}
                    className="gap-1 w-full"
                  >
                    Select Options
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}