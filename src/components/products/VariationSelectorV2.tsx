'use client'

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

interface VariationSelectorV2Props {
  productId: string;
  onVariantChange: (variant: any | null, selectedAttributes: { [key: string]: string }) => void;
}

export function VariationSelectorV2({ productId, onVariantChange }: VariationSelectorV2Props) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAttributes, setSelectedAttributes] = useState<{ [key: string]: string }>({});

  // Fetch variant data
  useEffect(() => {
    const fetchVariants = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch(`/api/products/${productId}/variants`);
        if (!response.ok) {
          throw new Error('Failed to fetch variants');
        }
        
        const result = await response.json();
        if (result.success) {
          console.log('Raw API response:', result.data);
          setData(result.data);
        } else {
          throw new Error(result.error || 'Failed to fetch variants');
        }
      } catch (err) {
        console.error('Error fetching variants:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch variants');
      } finally {
        setLoading(false);
      }
    };

    if (productId) {
      fetchVariants();
    }
  }, [productId]);

  // Extract available attributes safely
  const getAvailableAttributes = () => {
    if (!data) {
      console.log('No data available');
      return {};
    }
    
    console.log('Processing data:', data);
    console.log('Product type:', data.product?.productType);
    console.log('Variants count:', data.variants?.length);
    console.log('VariationAttributes:', data.variationAttributes);
    console.log('VariationMatrix:', data.variationMatrix);
    
    // Try to get attributes from variation matrix first
    if (data.variationMatrix && data.variationMatrix.attributes) {
      console.log('Using variationMatrix.attributes:', data.variationMatrix.attributes);
      
      if (Array.isArray(data.variationMatrix.attributes)) {
        const result: { [key: string]: string[] } = {};
        
        data.variationMatrix.attributes.forEach((attr: any, index: number) => {
          console.log(`Processing attribute ${index}:`, attr);
          
          if (attr && typeof attr === 'object' && attr.name) {
            if (attr.values && Array.isArray(attr.values)) {
              result[attr.name] = attr.values.map((v: any) => {
                if (typeof v === 'string') return v;
                if (v && typeof v === 'object') return v.value || v.name || String(v);
                return String(v);
              }).filter((v: any) => v && typeof v === 'string');
              
              console.log(`Attribute ${attr.name} values:`, result[attr.name]);
            }
          }
        });
        
        console.log('Final result from variationMatrix:', result);
        return result;
      }
    }
    
    // Try variation attributes (normalized structure)
    if (data.variationAttributes && Array.isArray(data.variationAttributes)) {
      console.log('Using variationAttributes:', data.variationAttributes);
      
      const result: { [key: string]: string[] } = {};
      
      data.variationAttributes.forEach((attr: any, index: number) => {
        console.log(`Processing variationAttribute ${index}:`, attr);
        
        if (attr && typeof attr === 'object' && attr.name) {
          if (attr.values && Array.isArray(attr.values)) {
            // Handle normalized structure where values are objects with 'value' property
            result[attr.name] = attr.values.map((v: any) => {
              if (typeof v === 'string') return v;
              if (v && typeof v === 'object') {
                // Use the 'value' property from normalized structure
                return v.value || v.name || String(v.id || v);
              }
              return String(v);
            }).filter((v: any) => v && typeof v === 'string');
            
            console.log(`VariationAttribute ${attr.name} values:`, result[attr.name]);
          } else if (typeof attr.values === 'string') {
            // Handle case where values might be a JSON string
            try {
              const parsedValues = JSON.parse(attr.values);
              if (Array.isArray(parsedValues)) {
                result[attr.name] = parsedValues.map((v: any) => {
                  if (typeof v === 'string') return v;
                  if (v && typeof v === 'object') return v.value || v.name || String(v.id || v);
                  return String(v);
                }).filter((v: any) => v && typeof v === 'string');
              }
            } catch (e) {
              console.warn('Failed to parse values string:', e);
            }
          }
        }
      });
      
      console.log('Final result from variationAttributes:', result);
      return result;
    }
    
    // Fallback: extract from variants
    if (data.variants && Array.isArray(data.variants)) {
      console.log('Extracting from variants:', data.variants);
      
      const attributes: { [key: string]: Set<string> } = {};
      
      data.variants.forEach((variant: any) => {
        if (variant.attributes && typeof variant.attributes === 'object') {
          Object.entries(variant.attributes).forEach(([key, value]) => {
            if (!attributes[key]) {
              attributes[key] = new Set();
            }
            attributes[key].add(String(value));
          });
        }
      });
      
      const result: { [key: string]: string[] } = {};
      Object.entries(attributes).forEach(([key, valueSet]) => {
        result[key] = Array.from(valueSet).sort();
      });
      
      console.log('Final result from variants extraction:', result);
      return result;
    }
    
    console.log('No valid attributes found');
    return {};
  };

  const availableAttributes = getAvailableAttributes();

  // Set default selections
  useEffect(() => {
    if (Object.keys(availableAttributes).length > 0 && Object.keys(selectedAttributes).length === 0) {
      const defaultSelections: { [key: string]: string } = {};
      
      Object.entries(availableAttributes).forEach(([attributeName, values]) => {
        if (values.length > 0) {
          defaultSelections[attributeName] = values[0];
        }
      });
      
      console.log('Setting default selections:', defaultSelections);
      setSelectedAttributes(defaultSelections);
    }
  }, [availableAttributes, selectedAttributes]);

  // Notify parent of changes
  useEffect(() => {
    if (Object.keys(selectedAttributes).length > 0 && data?.priceMatrix) {
      // Find matching variant
      const attributeKey = Object.entries(selectedAttributes)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => `${key}:${value}`)
        .join('|');
      
      const variant = data.priceMatrix[attributeKey] || null;
      console.log('Selected variant:', variant, 'for attributes:', selectedAttributes);
      onVariantChange(variant, selectedAttributes);
    } else {
      onVariantChange(null, {});
    }
  }, [selectedAttributes, data]);

  const handleAttributeChange = (attributeName: string, value: string) => {
    setSelectedAttributes(prev => ({
      ...prev,
      [attributeName]: value
    }));
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
          <p className="text-sm text-red-600">Error: {error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return null;
  }

  // Debug information - always show this for debugging
  console.log('Final render decision:');
  console.log('- Product type:', data.product?.productType);
  console.log('- Available attributes:', availableAttributes);
  console.log('- Available attributes count:', Object.keys(availableAttributes).length);

  if (data.product?.productType !== 'variable') {
    return null; // Don't render anything for non-variable products
  }

  if (Object.keys(availableAttributes).length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">No variations available for this product.</p>
            <details className="text-xs">
              <summary className="cursor-pointer text-muted-foreground">Debug Info</summary>
              <pre className="mt-2 bg-muted p-2 rounded text-xs overflow-auto">
                {JSON.stringify({
                  productType: data.product?.productType,
                  hasVariationAttributes: !!data.variationAttributes,
                  variationAttributesLength: data.variationAttributes?.length,
                  hasVariants: !!data.variants,
                  variantsLength: data.variants?.length,
                }, null, 2)}
              </pre>
            </details>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <h3 className="font-semibold">Product Options</h3>
        
        {Object.entries(availableAttributes).map(([attributeName, values]) => {
          if (!Array.isArray(values) || values.length === 0) {
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
              
              {/* Use dropdown/select for all attributes */}
              <select
                value={selectedAttributes[attributeName] || ''}
                onChange={(e) => handleAttributeChange(attributeName, e.target.value)}
                className="w-full p-3 border border-input rounded-lg focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 bg-background"
              >
                <option value="">Select {attributeName}</option>
                {values.map((value) => {
                  return (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  );
                })}
              </select>
            </div>
          );
        })}

        {/* Always show variant pricing section when attributes are selected */}
        {Object.keys(selectedAttributes).length > 0 && (
          <>
            {/*<Separator />*/}
            <div className="space-y-3 hidden">
              <div className="text-sm font-medium">Selected Variant</div>
              {(() => {
                const attributeKey = Object.entries(selectedAttributes)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([key, value]) => `${key}:${value}`)
                  .join('|');
                
                console.log('=== VARIANT MATCHING DEBUG ===');
                console.log('Selected attributes:', selectedAttributes);
                console.log('Generated attribute key:', attributeKey);
                console.log('Available price matrix keys:', Object.keys(data?.priceMatrix || {}));
                console.log('Price matrix:', data?.priceMatrix);
                
                // Try exact match first
                let variant = data?.priceMatrix?.[attributeKey];
                
                // If no exact match, try to find a case-insensitive match or with different value formats
                if (!variant && data?.priceMatrix) {
                  console.log('Exact match failed, trying alternative matching...');
                  
                  const priceMatrixKeys = Object.keys(data.priceMatrix);
                  
                  // Try case-insensitive matching
                  const lowerAttributeKey = attributeKey.toLowerCase();
                  const matchingKey = priceMatrixKeys.find(key => key.toLowerCase() === lowerAttributeKey);
                  
                  if (matchingKey) {
                    variant = data.priceMatrix[matchingKey];
                    console.log('Found case-insensitive match:', matchingKey, variant);
                  } else {
                    // Try partial matching by checking if all selected attributes exist in any variant
                    console.log('Trying partial matching...');
                    for (const [key, matrixVariant] of Object.entries(data.priceMatrix)) {
                      const keyPairs = key.split('|');
                      const keyAttributes: { [k: string]: string } = {};
                      
                      keyPairs.forEach(pair => {
                        const [attrName, attrValue] = pair.split(':');
                        if (attrName && attrValue) {
                          keyAttributes[attrName] = attrValue;
                        }
                      });
                      
                      console.log('Checking matrix key:', key, 'attributes:', keyAttributes);
                      
                      // Check if all selected attributes match (case-insensitive)
                      const allMatch = Object.entries(selectedAttributes).every(([selAttr, selValue]) => {
                        const matrixValue = keyAttributes[selAttr];
                        const match = matrixValue && (
                          matrixValue === selValue || 
                          matrixValue.toLowerCase() === selValue.toLowerCase()
                        );
                        console.log(`Comparing ${selAttr}: "${selValue}" vs "${matrixValue}" = ${match}`);
                        return match;
                      });
                      
                      if (allMatch) {
                        variant = matrixVariant;
                        console.log('Found partial match:', key, variant);
                        break;
                      }
                    }
                  }
                }
                
                console.log('Final found variant:', variant);
                
                if (variant) {
                  return (
                    <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-muted-foreground">SKU:</span>
                        <Badge variant="outline" className="text-xs">
                          {variant.sku}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-muted-foreground">Price:</span>
                        <div className="text-right">
                          {variant.comparePrice && variant.comparePrice > variant.price && (
                            <div className="text-xs text-muted-foreground line-through">
                              ${variant.comparePrice.toFixed(2)}
                            </div>
                          )}
                          <div className="text-lg font-bold text-primary">
                            ${variant.price.toFixed(2)}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-muted-foreground">Stock:</span>
                        <Badge variant={!variant.outOfStock ? 'default' : 'destructive'}>
                          {!variant.outOfStock 
                            ? `In Stock${variant.inventoryQuantity > 0 ? ` (${variant.inventoryQuantity} available)` : ''}` 
                            : 'Out of Stock'}
                        </Badge>
                      </div>

                      {/* Show selected combination */}
                      <div className="pt-2 border-t border-border/50">
                        <div className="text-xs text-muted-foreground mb-1">Selected options:</div>
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(selectedAttributes).map(([key, value]) => (
                            <Badge key={key} variant="secondary" className="text-xs">
                              {key}: {value}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                } else {
                  return (
                    <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 text-center">
                      <Badge variant="destructive" className="mb-2">
                        This combination is not available
                      </Badge>
                      <div className="text-xs text-muted-foreground">
                        Please try a different combination
                      </div>
                    </div>
                  );
                }
              })()}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
