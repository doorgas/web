import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { products, productVariants, variationAttributes, variationAttributeValues } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';
import { normalizeVariationAttributes, normalizeVariantOptions } from '@/utils/jsonUtils';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: productId } = await params;

    if (!productId) {
      return NextResponse.json({ success: false, error: 'Product ID is required' }, { status: 400 });
    }

    // First, check if the product exists and is variable
    const product = await db
      .select({
        id: products.id,
        name: products.name,
        productType: products.productType,
        variationAttributes: products.variationAttributes,
        basePrice: products.price,
      })
      .from(products)
      .where(and(eq(products.id, productId), eq(products.isActive, true)))
      .limit(1);

    if (product.length === 0) {
      return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
    }

    const productData = product[0];

    // If it's not a variable product, return empty variants
    if (productData.productType !== 'variable') {
      return NextResponse.json({
        success: true,
        data: {
          product: {
            id: productData.id,
            name: productData.name,
            productType: productData.productType,
            basePrice: parseFloat(productData.basePrice?.toString() || '0'),
          },
          variants: [],
          priceMatrix: {},
          totalVariants: 0,
        },
      });
    }

    // Fetch all variants for this product
    const variants = await db
      .select({
        id: productVariants.id,
        title: productVariants.title,
        sku: productVariants.sku,
        price: productVariants.price,
        comparePrice: productVariants.comparePrice,
        costPrice: productVariants.costPrice,
        weight: productVariants.weight,
        image: productVariants.image,
        inventoryQuantity: productVariants.inventoryQuantity,
        variantOptions: productVariants.variantOptions,
        isActive: productVariants.isActive,
        outOfStock: productVariants.outOfStock,
      })
      .from(productVariants)
      .where(and(
        eq(productVariants.productId, productId),
        eq(productVariants.isActive, true)
      ))
      .orderBy(productVariants.position);

    // Parse variation attributes for frontend using utility function
    let variationAttributes = null;
    try {
      if (productData.variationAttributes) {
        variationAttributes = normalizeVariationAttributes(productData.variationAttributes);
        console.log('Normalized variation attributes:', variationAttributes);
      }
    } catch (e) {
      console.warn('Failed to parse variation attributes:', e);
    }

    // Transform variants data
    const transformedVariants = variants.map(variant => {
      let attributes = {};
      try {
        if (variant.variantOptions) {
          console.log('=== VARIANT OPTIONS PARSING ===');
          console.log('Raw variantOptions for', variant.title, ':', variant.variantOptions);
          
          // Use the normalizeVariantOptions utility function
          attributes = normalizeVariantOptions(variant.variantOptions);
          console.log('Normalized attributes:', attributes);
        }
      } catch (e) {
        console.warn('Failed to parse variant options:', e);
      }

      return {
        id: variant.id,
        title: variant.title,
        sku: variant.sku,
        price: parseFloat(variant.price?.toString() || '0'),
        comparePrice: variant.comparePrice ? parseFloat(variant.comparePrice.toString()) : null,
        costPrice: variant.costPrice ? parseFloat(variant.costPrice.toString()) : null,
        weight: variant.weight ? parseFloat(variant.weight.toString()) : null,
        image: variant.image || '',
        inventoryQuantity: variant.inventoryQuantity || 0,
        attributes,
        isActive: variant.isActive || false,
        outOfStock: Boolean(variant.outOfStock), // Convert to boolean (1 becomes true, 0/null becomes false)
      };
    });

    // Build price matrix for quick attribute-based lookups
    const priceMatrix: { [key: string]: any } = {};
    transformedVariants.forEach(variant => {
      // Create a key from sorted attributes
      const attributeKey = Object.entries(variant.attributes)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => `${key}:${value}`)
        .join('|');
      
      console.log('=== API PRICE MATRIX DEBUG ===');
      console.log('Variant:', variant.title, variant.sku);
      console.log('Variant attributes:', variant.attributes);
      console.log('Variant stock info - outOfStock:', variant.outOfStock, 'inventoryQuantity:', variant.inventoryQuantity);
      console.log('Generated key:', attributeKey);
      
      priceMatrix[attributeKey] = {
        price: variant.price,
        comparePrice: variant.comparePrice,
        variantId: variant.id,
        inventoryQuantity: variant.inventoryQuantity,
        sku: variant.sku,
        outOfStock: variant.outOfStock,
      };
    });
    
    console.log('Final price matrix:', priceMatrix);

    return NextResponse.json({
      success: true,
      data: {
        product: {
          id: productData.id,
          name: productData.name,
          productType: productData.productType,
          basePrice: parseFloat(productData.basePrice?.toString() || '0'),
        },
        variants: transformedVariants,
        variationAttributes,
        priceMatrix,
        totalVariants: transformedVariants.length,
      },
    });
  } catch (error) {
    console.error('Error fetching product variants:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch product variants' }, { status: 500 });
  }
}
