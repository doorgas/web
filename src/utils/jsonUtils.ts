/**
 * Deep JSON parsing utilities to handle double/triple encoded JSON strings
 */

/**
 * Recursively parse JSON until we get a non-string value
 * Handles cases where JSON has been encoded multiple times
 */
export function deepParseJSON(value: any): any {
  // If it's not a string, return as-is
  if (typeof value !== 'string') {
    return value;
  }

  // If it's an empty string, return null
  if (value === '') {
    return null;
  }

  try {
    // Try to parse the JSON
    const parsed = JSON.parse(value);
    
    // If the result is still a string, parse it again recursively
    if (typeof parsed === 'string') {
      return deepParseJSON(parsed);
    }
    
    // Return the parsed value
    return parsed;
  } catch (error) {
    // If parsing fails, return the original value
    return value;
  }
}

/**
 * Safely parse JSON with fallback value
 */
export function safeJsonParse<T>(value: any, fallback: T): T {
  try {
    const parsed = deepParseJSON(value);
    return parsed !== null && parsed !== undefined ? parsed : fallback;
  } catch {
    return fallback;
  }
}

/**
 * Parse potentially encoded arrays
 */
export function parseJsonArray(value: any): any[] {
  const parsed = deepParseJSON(value);
  return Array.isArray(parsed) ? parsed : [];
}

/**
 * Parse potentially encoded objects
 */
export function parseJsonObject(value: any): object {
  const parsed = deepParseJSON(value);
  return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
}

/**
 * Normalize variation attributes data structure
 * Handles various formats and ensures consistent output
 */
export function normalizeVariationAttributes(variationAttributes: any): any[] {
  // First, deep parse the JSON
  const parsed = deepParseJSON(variationAttributes);
  
  // If it's not an array, return empty array
  if (!Array.isArray(parsed)) {
    return [];
  }
  
  // Normalize each attribute in the array
  return parsed.map((attr: any) => {
    // Handle case where attr itself might be JSON encoded
    const normalizedAttr = deepParseJSON(attr);
    
    // Parse values array properly
    let values: any[] = [];
    if (normalizedAttr.values) {
      const parsedValues = parseJsonArray(normalizedAttr.values);
      values = parsedValues.map((value: any) => {
        // Handle case where value might be JSON encoded
        const normalizedValue = deepParseJSON(value);
        
        // Ensure consistent value structure
        return {
          id: normalizedValue.id || normalizedValue.value || normalizedValue,
          value: normalizedValue.value || normalizedValue.name || normalizedValue,
          slug: normalizedValue.slug || (normalizedValue.value || normalizedValue)?.toString().toLowerCase().replace(/[^a-z0-9]/g, '-') || '',
          colorCode: normalizedValue.colorCode,
          image: normalizedValue.image
        };
      });
    }
    
    // Ensure consistent structure
    return {
      id: normalizedAttr.id || normalizedAttr.name,
      name: normalizedAttr.name || '',
      type: normalizedAttr.type || 'select',
      slug: normalizedAttr.slug || normalizedAttr.name?.toLowerCase().replace(/[^a-z0-9]/g, '-') || '',
      values: values
    };
  });
}

/**
 * Normalize variant options (attribute combinations)
 * Handles various formats from database
 */
export function normalizeVariantOptions(variantOptions: any): { [key: string]: string } {
  const parsed = deepParseJSON(variantOptions);
  
  // Handle array format (admin panel format: [{attributeName: "Color", value: "Red"}, ...])
  if (Array.isArray(parsed)) {
    const normalized: { [key: string]: string } = {};
    parsed.forEach((item: any) => {
      if (item && typeof item === 'object') {
        // Handle different possible property names
        const attributeName = item.attributeName || item.name || item.attribute;
        const value = item.value;
        
        if (attributeName && value !== undefined) {
          normalized[attributeName] = String(value);
        }
      }
    });
    return normalized;
  }
  
  // Handle object format (simple key-value pairs)
  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
    const normalized: { [key: string]: string } = {};
    Object.entries(parsed).forEach(([key, value]) => {
      normalized[key] = String(value);
    });
    return normalized;
  }
  
  // If it's not a valid format, return empty object
  return {};
}

/**
 * Normalize product images array
 */
export function normalizeProductImages(images: any): string[] {
  const parsed = deepParseJSON(images);
  
  if (Array.isArray(parsed)) {
    return parsed.filter(img => typeof img === 'string' && img.trim() !== '');
  }
  
  return [];
}

/**
 * Normalize product tags array
 */
export function normalizeProductTags(tags: any): string[] {
  const parsed = deepParseJSON(tags);
  
  if (Array.isArray(parsed)) {
    return parsed.filter(tag => typeof tag === 'string' && tag.trim() !== '');
  }
  
  return [];
}

export default {
  deepParseJSON,
  safeJsonParse,
  parseJsonArray,
  parseJsonObject,
  normalizeVariationAttributes,
  normalizeVariantOptions,
  normalizeProductImages,
  normalizeProductTags,
};
