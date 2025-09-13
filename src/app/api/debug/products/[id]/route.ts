import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { products, productVariants } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';
import { normalizeVariantOptions, normalizeVariationAttributes } from '@/utils/jsonUtils';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: productId } = await params;

    // Get product details
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
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const productData = product[0];

    // Get variants
    const variants = await db
      .select({
        id: productVariants.id,
        title: productVariants.title,
        variantOptions: productVariants.variantOptions,
      })
      .from(productVariants)
      .where(and(
        eq(productVariants.productId, productId),
        eq(productVariants.isActive, true)
      ));

    return NextResponse.json({
      success: true,
      debug: {
        productType: productData.productType,
        rawVariationAttributes: productData.variationAttributes,
        normalizedVariationAttributes: normalizeVariationAttributes(productData.variationAttributes),
        variants: variants.map(v => ({
          title: v.title,
          rawOptions: v.variantOptions,
          normalizedOptions: normalizeVariantOptions(v.variantOptions)
        }))
      }
    });
  } catch (error) {
    console.error('Debug error:', error);
    return NextResponse.json({ error: 'Debug failed' }, { status: 500 });
  }
}
