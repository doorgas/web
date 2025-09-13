import { useState, useEffect, useCallback } from 'react';

export interface VariantData {
  id: string;
  title: string;
  sku: string;
  price: number;
  comparePrice: number | null;
  costPrice: number | null;
  weight: number | null;
  image: string;
  inventoryQuantity: number;
  attributes: { [key: string]: string };
  isActive: boolean;
  outOfStock: boolean;
}

export interface PriceMatrixEntry {
  price: number;
  comparePrice: number | null;
  variantId: string;
  inventoryQuantity: number;
  sku: string;
  outOfStock: boolean;
}

export interface ProductVariantsData {
  product: {
    id: string;
    name: string;
    productType: string;
    basePrice: number;
  };
  variants: VariantData[];
  variationAttributes: any;
  variationMatrix: any;
  priceMatrix: { [key: string]: PriceMatrixEntry };
  totalVariants: number;
}

export const useProductVariants = (productId: string | null) => {
  const [data, setData] = useState<ProductVariantsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchVariants = useCallback(async () => {
    if (!productId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/products/${productId}/variants`);
      if (!response.ok) {
        throw new Error('Failed to fetch variants');
      }
      
      const result = await response.json();
      if (result.success) {
        setData(result.data);
      } else {
        throw new Error(result.error || 'Failed to fetch variants');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch variants');
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    fetchVariants();
  }, [fetchVariants]);

  // Helper function to get price by attribute combination
  const getPriceByAttributes = useCallback((attributes: { [key: string]: string }): PriceMatrixEntry | null => {
    if (!data) return null;
    
    const attributeKey = Object.entries(attributes)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}:${value}`)
      .join('|');
    
    return data.priceMatrix[attributeKey] || null;
  }, [data]);

  // Helper function to get all available attribute values
  const getAvailableAttributes = useCallback(() => {
    if (!data) return {};
    
    // Prefer variation matrix structure if available
    if (data.variationMatrix && data.variationMatrix.attributes) {
      const result: { [key: string]: string[] } = {};
      
      // Ensure attributes is an array
      const attributes = Array.isArray(data.variationMatrix.attributes) 
        ? data.variationMatrix.attributes 
        : [];
        
      attributes.forEach((attr: any) => {
        if (attr && attr.name && attr.values && Array.isArray(attr.values)) {
          result[attr.name] = attr.values.map((v: any) => {
            // Handle different value formats
            return typeof v === 'string' ? v : (v.value || v.name || String(v));
          }).filter((v: any) => v && typeof v === 'string'); // Filter out invalid values
        }
      });
      return result;
    }
    
    // If we have normalized variation attributes, use them
    if (data.variationAttributes && Array.isArray(data.variationAttributes)) {
      const result: { [key: string]: string[] } = {};
      
      data.variationAttributes.forEach((attr: any) => {
        if (attr && attr.name && attr.values && Array.isArray(attr.values)) {
          result[attr.name] = attr.values.map((v: any) => {
            // Handle different value formats
            return typeof v === 'string' ? v : (v.value || v.name || String(v));
          }).filter((v: any) => v && typeof v === 'string'); // Filter out invalid values
        }
      });
      return result;
    }
    
    // Otherwise, extract from variants
    const attributes: { [key: string]: Set<string> } = {};
    
    data.variants.forEach(variant => {
      Object.entries(variant.attributes).forEach(([key, value]) => {
        if (!attributes[key]) {
          attributes[key] = new Set();
        }
        attributes[key].add(value);
      });
    });
    
    // Convert Sets to arrays
    const result: { [key: string]: string[] } = {};
    Object.entries(attributes).forEach(([key, valueSet]) => {
      result[key] = Array.from(valueSet).sort();
    });
    
    return result;
  }, [data]);

  // Helper function to check if variant combination exists
  const variantExists = useCallback((attributes: { [key: string]: string }): boolean => {
    return getPriceByAttributes(attributes) !== null;
  }, [getPriceByAttributes]);

  // Helper function to get inventory for specific combination
  const getInventoryByAttributes = useCallback((attributes: { [key: string]: string }): number => {
    const priceData = getPriceByAttributes(attributes);
    return priceData?.inventoryQuantity || 0;
  }, [getPriceByAttributes]);

  // Helper function to check if combination is in stock
  const isInStock = useCallback((attributes: { [key: string]: string }): boolean => {
    const priceData = getPriceByAttributes(attributes);
    return priceData ? !priceData.outOfStock : false;
  }, [getPriceByAttributes]);

  return {
    data,
    loading,
    error,
    refetch: fetchVariants,
    getPriceByAttributes,
    getAvailableAttributes,
    variantExists,
    getInventoryByAttributes,
    isInStock,
  };
};
