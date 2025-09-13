'use client'

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useProductVariants, PriceMatrixEntry } from '@/hooks/useProductVariants';

interface VariationSelectorProps {
  productId: string;
  onVariantChange: (variant: PriceMatrixEntry | null, selectedAttributes: { [key: string]: string }) => void;
}

export function VariationSelector({ productId, onVariantChange }: VariationSelectorProps) {
  const { data, loading, error, getPriceByAttributes, getAvailableAttributes, isInStock } = useProductVariants(productId);
  const [selectedAttributes, setSelectedAttributes] = useState<{ [key: string]: string }>({});

  const availableAttributes = getAvailableAttributes();

  // Set default selections when data loads
  useEffect(() => {
    if (data && Object.keys(availableAttributes).length > 0 && Object.keys(selectedAttributes).length === 0) {
      const defaultSelections: { [key: string]: string } = {};
      
      // Set first available value for each attribute
      Object.entries(availableAttributes).forEach(([attributeName, values]) => {
        if (values.length > 0) {
          defaultSelections[attributeName] = values[0];
        }
      });
      
      setSelectedAttributes(defaultSelections);
    }
  }, [data, availableAttributes, selectedAttributes]);

  // Notify parent when selection changes
  useEffect(() => {
    if (Object.keys(selectedAttributes).length > 0) {
      const variant = getPriceByAttributes(selectedAttributes);
      onVariantChange(variant, selectedAttributes);
    } else {
      onVariantChange(null, {});
    }
  }, [selectedAttributes, getPriceByAttributes, onVariantChange]);

  const handleAttributeChange = (attributeName: string, value: string) => {
    setSelectedAttributes(prev => ({
      ...prev,
      [attributeName]: value
    }));
  };

  const getAttributeType = (attributeName: string): string => {
    // Prefer variation matrix structure if available
    if (data?.variationMatrix?.attributes) {
      const attr = data.variationMatrix.attributes.find((a: any) => a.name === attributeName);
      return attr?.type || 'select';
    }
    
    // Check if we have normalized variation attributes with type information
    if (data?.variationAttributes && Array.isArray(data.variationAttributes)) {
      const attr = data.variationAttributes.find((a: any) => a.name === attributeName);
      return attr?.type || 'select';
    }
    
    // Fallback logic based on attribute name
    const lowerName = attributeName.toLowerCase();
    if (lowerName.includes('color') || lowerName.includes('colour')) {
      return 'color';
    }
    
    const values = availableAttributes[attributeName] || [];
    return values.length > 5 ? 'select' : 'button';
  };

  const getColorCode = (attributeName: string, value: string): string | undefined => {
    // Prefer variation matrix structure if available
    if (data?.variationMatrix?.attributes) {
      const attr = data.variationMatrix.attributes.find((a: any) => a.name === attributeName);
      if (attr?.values && Array.isArray(attr.values)) {
        const valueObj = attr.values.find((v: any) => {
          const vValue = typeof v === 'string' ? v : (v.value || v.name);
          return vValue === value;
        });
        return valueObj?.colorCode;
      }
    }
    
    if (data?.variationAttributes && Array.isArray(data.variationAttributes)) {
      const attr = data.variationAttributes.find((a: any) => a.name === attributeName);
      if (attr?.values && Array.isArray(attr.values)) {
        const valueObj = attr.values.find((v: any) => {
          const vValue = typeof v === 'string' ? v : (v.value || v.name);
          return vValue === value;
        });
        return valueObj?.colorCode;
      }
    }
    return undefined;
  };

  const renderAttributeSelector = (attributeName: string, values: string[]) => {
    const type = getAttributeType(attributeName);
    const selectedValue = selectedAttributes[attributeName];

    if (type === 'color') {
      return (
        <div className="flex flex-wrap gap-2">
          {values.map((value) => {
            const colorCode = getColorCode(attributeName, value);
            const isSelected = selectedValue === value;
            const inStock = isInStock({ ...selectedAttributes, [attributeName]: value });
            
            return (
              <button
                key={value}
                onClick={() => handleAttributeChange(attributeName, value)}
                disabled={!inStock}
                className={`
                  w-8 h-8 rounded-full border-2 transition-all duration-200
                  ${isSelected ? 'border-primary ring-2 ring-primary/20' : 'border-gray-300'}
                  ${!inStock ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}
                `}
                style={{ backgroundColor: colorCode || '#ccc' }}
                title={`${value}${!inStock ? ' (Out of Stock)' : ''}`}
              >
                {!inStock && (
                  <div className="w-full h-full rounded-full bg-black/20 flex items-center justify-center">
                    <span className="text-white text-xs">×</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      );
    }

    if (type === 'select') {
      return (
        <select
          value={selectedValue || ''}
          onChange={(e) => handleAttributeChange(attributeName, e.target.value)}
          className="w-full p-2 border rounded-lg focus:border-primary focus:outline-none"
        >
          <option value="">Select {attributeName}</option>
          {values.map((value) => {
            const inStock = isInStock({ ...selectedAttributes, [attributeName]: value });
            return (
              <option key={value} value={value} disabled={!inStock}>
                {value}{!inStock ? ' (Out of Stock)' : ''}
              </option>
            );
          })}
        </select>
      );
    }

    // Default to button/badge style
    return (
      <div className="flex flex-wrap gap-2">
        {values.map((value) => {
          const isSelected = selectedValue === value;
          const inStock = isInStock({ ...selectedAttributes, [attributeName]: value });
          
          return (
            <Button
              key={value}
              variant={isSelected ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleAttributeChange(attributeName, value)}
              disabled={!inStock}
              className={`
                ${!inStock ? 'opacity-50' : ''}
                ${isSelected ? 'ring-2 ring-primary/20' : ''}
              `}
            >
              {value}
              {!inStock && <span className="ml-1 text-xs">(Out)</span>}
            </Button>
          );
        })}
      </div>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/4"></div>
            <div className="flex gap-2">
              <div className="h-8 bg-muted rounded w-16"></div>
              <div className="h-8 bg-muted rounded w-16"></div>
              <div className="h-8 bg-muted rounded w-16"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-red-600">Failed to load variations: {error}</p>
        </CardContent>
      </Card>
    );
  }

  // Add safety checks
  if (!data || data.product.productType !== 'variable') {
    return null;
  }

  // Ensure availableAttributes is a proper object and not empty
  if (!availableAttributes || typeof availableAttributes !== 'object' || Object.keys(availableAttributes).length === 0) {
    return null;
  }

  const currentVariant = getPriceByAttributes(selectedAttributes);
  const allAttributesSelected = Object.keys(availableAttributes).every(attr => selectedAttributes[attr]);

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <h3 className="font-semibold">Product Options</h3>
        
        {Object.entries(availableAttributes).map(([attributeName, values]) => {
          // Safety check: ensure values is an array
          if (!Array.isArray(values)) {
            console.warn('Values is not an array for attribute:', attributeName, values);
            return null;
          }
          
          return (
          <div key={attributeName} className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-muted-foreground">
                {attributeName}
              </label>
              {selectedAttributes[attributeName] && (
                <Badge variant="secondary" className="text-xs">
                  {selectedAttributes[attributeName]}
                </Badge>
              )}
            </div>
            {renderAttributeSelector(attributeName, values)}
          </div>
          );
        }).filter(Boolean)}

        {allAttributesSelected && currentVariant && (
          <>
            <Separator />
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Selected Variant:</span>
                <Badge variant="outline">{currentVariant.sku}</Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Price:</span>
                <div className="text-right">
                  {currentVariant.comparePrice && currentVariant.comparePrice > currentVariant.price && (
                    <p className="text-sm text-muted-foreground line-through">
                      ${currentVariant.comparePrice.toFixed(2)}
                    </p>
                  )}
                  <p className="font-semibold text-primary">${currentVariant.price.toFixed(2)}</p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Stock:</span>
                <Badge variant={!currentVariant.outOfStock ? 'default' : 'destructive'}>
                  {!currentVariant.outOfStock 
                    ? `In Stock${currentVariant.inventoryQuantity > 0 ? ` (${currentVariant.inventoryQuantity} available)` : ''}` 
                    : 'Out of Stock'}
                </Badge>
              </div>
            </div>
          </>
        )}

        {allAttributesSelected && !currentVariant && (
          <>
            <Separator />
            <div className="text-center py-2">
              <Badge variant="destructive">This combination is not available</Badge>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
