'use client'

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Header } from '@/components/layout/Header';
import { MobileNav } from '@/components/layout/MobileNav';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useCart } from '@/hooks/useCart';
import { useToast } from '@/hooks/use-toast';
import { VariationSelectorV2 } from '@/components/products/VariationSelectorV2';
import { PriceMatrixEntry } from '@/hooks/useProductVariants';
import { 
  Plus, 
  Minus, 
  Share2, 
  Star, 
  Leaf, 
  Clock, 
  Shield,
  Copy,
  MessageCircle,
  Facebook,
  Twitter,
  ShoppingCart,
  Package
} from 'lucide-react';

interface TagItem {
  id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  customValue?: string;
}

interface ProductDetails {
  id: string;
  name: string;
  category: string;
  price: number;
  comparePrice?: number;
  image: string;
  images: string[];
  description: string;
  shortDescription: string;
  thc: number;
  cbd: number;
  strain: string;
  inStock: boolean;
  productType?: string;
  effects: TagItem[];
  flavors: TagItem[];
  medicalUses: TagItem[];
  tagGroups: Record<string, TagItem[]>;
  growInfo: {
    difficulty: string;
    flowering: string;
    yield: string;
  };
}

export default function ProductDetails() {
  const { data: session, status } = useSession();
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [product, setProduct] = useState<ProductDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [imageErrors, setImageErrors] = useState<Set<number>>(new Set());
  const [selectedVariant, setSelectedVariant] = useState<PriceMatrixEntry | null>(null);
  const [selectedAttributes, setSelectedAttributes] = useState<{ [key: string]: string }>({});
  const { addToCartWithToast, state } = useCart();
  const { toast } = useToast();

  // All hooks must be called before any conditional returns
  useEffect(() => {
    if (status === 'loading') return; // Still loading
    if (!session) {
      window.location.href = '/register';
      return;
    }
  }, [session, status]);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/products/${id}`);
        const result = await response.json();
        
        if (result.success) {
          setProduct(result.data);
          setImageErrors(new Set()); // Reset image errors for new product
        } else {
          console.error('Failed to load product:', result.error);
          router.push('/');
        }
      } catch (error) {
        console.error('Error fetching product:', error);
        router.push('/');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchProduct();
    }
  }, [id, router]);

  // Helper functions
  const handleImageError = (imageIndex: number) => {
    setImageErrors(prev => new Set([...prev, imageIndex]));
  };

  const handleVariantChange = useCallback((variant: PriceMatrixEntry | null, attributes: { [key: string]: string }) => {
    setSelectedVariant(variant);
    setSelectedAttributes(attributes);
  }, []);

  const handleAddToCart = () => {
    if (!product) return;

    // Use variant price if available, otherwise use base product price
    const effectivePrice = selectedVariant?.price || product.price;
    const effectiveInStock = selectedVariant ? 
      !selectedVariant.outOfStock : 
      product.inStock;

    // Convert ProductDetails to Product type for cart
    const productForCart = {
      id: product.id,
      name: product.name,
      category: product.category,
      price: effectivePrice,
      image: product.image,
      description: product.description,
      thc: product.thc,
      cbd: product.cbd,
      strain: product.strain as 'indica' | 'sativa' | 'hybrid',
      inStock: effectiveInStock,
      // Add variant information if available
      ...(selectedVariant && {
        variantId: selectedVariant.variantId,
        variantSku: selectedVariant.sku,
        selectedAttributes: selectedAttributes,
      }),
    };

    addToCartWithToast(productForCart, quantity);
  };

  const handleShare = async (platform?: string) => {
    if (!product) return;
    
    const url = window.location.href;
    // Strip HTML tags for sharing text
    const plainTextDescription = product.description.replace(/<[^>]*>/g, '');
    const text = `Check out ${product.name} - ${plainTextDescription.slice(0, 100)}...`;

    if (platform === 'copy') {
      await navigator.clipboard.writeText(url);
      toast({
        title: "Link copied",
        description: "Product link copied to clipboard",
      });
    } else if (platform === 'facebook') {
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`);
    } else if (platform === 'twitter') {
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`);
    } else if (navigator.share) {
      try {
        await navigator.share({
          title: product.name,
          text: text,
          url: url,
        });
      } catch (err) {
        console.log('Error sharing:', err);
      }
    } else {
      await navigator.clipboard.writeText(url);
      toast({
        title: "Link copied",
        description: "Product link copied to clipboard",
      });
    }
  };

  // Conditional returns after all hooks
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <Header title="Product Details" showBack />
        <main className="container mx-auto px-4 py-6">
          <div className="animate-pulse space-y-6">
            <div className="w-full h-64 bg-muted rounded-lg"></div>
            <div className="space-y-4">
              <div className="h-8 bg-muted rounded w-3/4"></div>
              <div className="h-4 bg-muted rounded w-1/2"></div>
              <div className="h-20 bg-muted rounded"></div>
            </div>
          </div>
        </main>
        <MobileNav />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <Header title="Product Details" showBack />
        <main className="container mx-auto px-4 py-6">
          <div className="text-center">
            <p className="text-muted-foreground">Product not found</p>
          </div>
        </main>
        <MobileNav />
      </div>
    );
  }

  const currentImage = product.images[selectedImageIndex] || product.image;
  const currentImageHasError = imageErrors.has(selectedImageIndex);
  const shouldShowPlaceholder = !currentImage || currentImageHasError;

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header title="Product Details" showBack />
      
      <main className="container mx-auto px-4 py-6">
        {/* Product Image Gallery */}
        <div className="relative mb-6">
          {shouldShowPlaceholder ? (
            <div className="w-full h-64 bg-muted flex items-center justify-center rounded-lg">
              <Package className="w-16 h-16 text-muted-foreground/50" />
            </div>
          ) : (
            <img
              src={currentImage}
              alt={product.name}
              className="rounded-lg"
              onError={() => handleImageError(selectedImageIndex)}
            />
          )}
          <Button
            size="icon"
            variant="secondary"
            className="absolute top-4 right-4 hidden"
            onClick={() => handleShare()}
          >
            <Share2 className="h-4 w-4" />
          </Button>
          
          {/* Image thumbnails */}
          {product.images.length > 1 && (
            <div className="flex gap-2 mt-4 overflow-x-auto">
              {product.images.map((image, index) => {
                const thumbnailHasError = imageErrors.has(index);
                const shouldShowThumbnailPlaceholder = !image || thumbnailHasError;
                
                return (
                  <button
                    key={index}
                    onClick={() => setSelectedImageIndex(index)}
                    className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 ${
                      selectedImageIndex === index ? 'border-primary' : 'border-transparent'
                    }`}
                  >
                    {shouldShowThumbnailPlaceholder ? (
                      <div className="w-full h-full bg-muted flex items-center justify-center">
                        <Package className="w-6 h-6 text-muted-foreground/50" />
                      </div>
                    ) : (
                      <img
                        src={image}
                        alt={`${product.name} ${index + 1}`}
                        className="w-full h-full object-cover"
                        onError={() => handleImageError(index)}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="space-y-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary">{product.category}</Badge>
               
                {!product.inStock && <Badge variant="destructive">Out of Stock</Badge>}
              </div>
              <h1 className="text-2xl font-bold mb-2">{product.name}</h1>
              <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4 hidden">
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-primary text-primary" />
                  <span>4.8 (24 reviews)</span>
                </div>
                <div className="flex items-center gap-1">
                  <Leaf className="h-4 w-4" />
                  <span>THC: {product.thc}%</span>
                </div>
                <div className="flex items-center gap-1">
                  <Shield className="h-4 w-4" />
                  <span>CBD: {product.cbd}%</span>
                </div>
              </div>
              <div 
                className="text-muted-foreground mb-4"
                dangerouslySetInnerHTML={{ __html: product.description }}
              />
            </div>
            <div className="text-right">
              <div className="flex flex-col items-end">
                {/* Show variant price if available, otherwise show base product price */}
                {selectedVariant ? (
                  <>
                    {selectedVariant.comparePrice && selectedVariant.comparePrice > selectedVariant.price && (
                      <p className="text-sm text-muted-foreground line-through">
                        ${selectedVariant.comparePrice.toFixed(2)}
                      </p>
                    )}
                    <p className="text-2xl font-bold text-primary">${selectedVariant.price.toFixed(2)}</p>
                  </>
                ) : (
                  <>
                    {product.comparePrice && (
                      <p className="text-sm text-muted-foreground line-through">
                        ${product.comparePrice.toFixed(2)}
                      </p>
                    )}
                    <p className="text-2xl font-bold text-primary">${product.price.toFixed(2)}</p>
                  </>
                )}
                
              </div>
            </div>
          </div>

          {/* Effects */}
          {product.effects.length > 0 && (
            <Card>
              <CardContent className="pt-6">
                <h3 className="font-semibold mb-3">Effects</h3>
                <div className="flex flex-wrap gap-2">
                  {product.effects.map((effect) => (
                    <Badge 
                      key={effect.id} 
                      variant="outline"
                      style={effect.color ? { borderColor: effect.color, color: effect.color } : undefined}
                      title={effect.description}
                    >
                      {effect.name}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Flavors */}
          {product.flavors.length > 0 && (
            <Card>
              <CardContent className="pt-6">
                <h3 className="font-semibold mb-3">Flavors</h3>
                <div className="flex flex-wrap gap-2">
                  {product.flavors.map((flavor) => (
                    <Badge 
                      key={flavor.id} 
                      variant="secondary"
                      style={flavor.color ? { backgroundColor: flavor.color, color: 'white' } : undefined}
                      title={flavor.description}
                    >
                      {flavor.name}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Medical Uses */}
          {product.medicalUses.length > 0 && (
            <Card>
              <CardContent className="pt-6">
                <h3 className="font-semibold mb-3">May Help With</h3>
                <div className="flex flex-wrap gap-2">
                  {product.medicalUses.map((use) => (
                    <Badge 
                      key={use.id} 
                      variant="outline"
                      style={use.color ? { borderColor: use.color, color: use.color } : undefined}
                      title={use.description}
                    >
                      {use.name}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Grow Info 
          <Card>
            <CardContent className="pt-6">
              <h3 className="font-semibold mb-3">Grow Information</h3>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-sm text-muted-foreground">Difficulty</p>
                  <p className="font-medium">{product.growInfo.difficulty}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Flowering Time</p>
                  <p className="font-medium flex items-center justify-center gap-1">
                    <Clock className="h-3 w-3" />
                    {product.growInfo.flowering}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Yield</p>
                  <p className="font-medium">{product.growInfo.yield}</p>
                </div>
              </div>
            </CardContent>
          </Card>*/}

          {/* Share Options 
          <Card>
            <CardContent className="pt-6">
              <h3 className="font-semibold mb-3">Share this product</h3>
              <div className="grid grid-cols-4 gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleShare('copy')}
                  className="flex flex-col gap-1 h-auto py-3"
                >
                  <Copy className="h-4 w-4" />
                  <span className="text-xs">Copy</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleShare('facebook')}
                  className="flex flex-col gap-1 h-auto py-3"
                >
                  <Facebook className="h-4 w-4" />
                  <span className="text-xs">Facebook</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleShare('twitter')}
                  className="flex flex-col gap-1 h-auto py-3"
                >
                  <Twitter className="h-4 w-4" />
                  <span className="text-xs">Twitter</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleShare()}
                  className="flex flex-col gap-1 h-auto py-3"
                >
                  <MessageCircle className="h-4 w-4" />
                  <span className="text-xs">More</span>
                </Button>
              </div>
            </CardContent>
          </Card>*/}

          {/* Variation Selector */}
          <VariationSelectorV2 
            productId={id}
            onVariantChange={handleVariantChange}
          />

          {/* Add to Cart */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <span className="font-medium">Quantity (grams)</span>
                <div className="flex items-center gap-3">
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-8 text-center font-medium">{quantity}</span>
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => setQuantity(quantity + 1)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <Separator className="mb-4" />
              
              <div className="flex items-center justify-between mb-4">
                <span className="font-medium">Total</span>
                <span className="text-xl font-bold text-primary">
                  ${((selectedVariant?.price || product.price) * quantity).toFixed(2)}
                </span>
              </div>
              
              <Button
                className="w-full gap-2"
                onClick={handleAddToCart}
                disabled={selectedVariant ? 
                  selectedVariant.outOfStock : 
                  !product.inStock
                }
              >
                <ShoppingCart className="h-4 w-4" />
                {(() => {
                  if (selectedVariant) {
                    return selectedVariant.outOfStock 
                      ? 'Out of Stock' 
                      : 'Add to Cart';
                  }
                  return product.inStock ? 'Add to Cart' : 'Out of Stock';
                })()}
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>

      <MobileNav />
    </div>
  );
}