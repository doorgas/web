import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { products, categories, productInventory, productTags, tags, tagGroups, productVariants } from '@/lib/schema';
import { eq, and, sql } from 'drizzle-orm';
import { normalizeProductImages, normalizeProductTags } from '@/utils/jsonUtils';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: productId } = await params;

    if (!productId) {
      return NextResponse.json({ success: false, error: 'Product ID is required' }, { status: 400 });
    }

    // Fetch product with category and inventory details
    const productWithDetails = await db
      .select({
        product: {
          id: products.id,
          name: products.name,
          slug: products.slug,
          description: products.description,
          shortDescription: products.shortDescription,
          price: products.price,
          comparePrice: products.comparePrice,
          images: products.images,
          thc: products.thc,
          cbd: products.cbd,
          isActive: products.isActive,
          isFeatured: products.isFeatured,
          productType: products.productType,
          outOfStock: products.outOfStock,
          tags: products.tags,
          difficulty: products.difficulty,
          floweringTime: products.floweringTime,
          yieldAmount: products.yieldAmount,
          createdAt: products.createdAt,
        },
        category: {
          name: categories.name,
          slug: categories.slug,
        },
        inventory: {
          quantity: productInventory.quantity,
          availableQuantity: productInventory.availableQuantity,
        },
        // Get variant stock information for variable products
        variantStock: {
          totalVariants: sql<number>`COUNT(CASE WHEN ${products.productType} = 'variable' AND ${productVariants.isActive} = 1 THEN 1 END)`,
          outOfStockVariants: sql<number>`COUNT(CASE WHEN ${products.productType} = 'variable' AND ${productVariants.isActive} = 1 AND ${productVariants.outOfStock} = 1 THEN 1 END)`,
        },
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .leftJoin(productInventory, eq(productInventory.productId, products.id))
      .leftJoin(productVariants, and(
        eq(productVariants.productId, products.id),
        eq(productVariants.isActive, true)
      ))
      .where(and(eq(products.id, productId), eq(products.isActive, true)))
      .groupBy(products.id, categories.id)
      .limit(1);

    if (productWithDetails.length === 0) {
      return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
    }

    const item = productWithDetails[0];

    // Fetch product tags with their groups
    const productTagsWithGroups = await db
      .select({
        tag: {
          id: tags.id,
          name: tags.name,
          slug: tags.slug,
          description: tags.description,
          color: tags.color,
          icon: tags.icon,
          isCustom: tags.isCustom,
          customValue: tags.customValue,
          sortOrder: tags.sortOrder,
        },
        group: {
          id: tagGroups.id,
          name: tagGroups.name,
          slug: tagGroups.slug,
          description: tagGroups.description,
          color: tagGroups.color,
          icon: tagGroups.icon,
        },
        productTag: {
          customValue: productTags.customValue,
          sortOrder: productTags.sortOrder,
        },
      })
      .from(productTags)
      .innerJoin(tags, eq(productTags.tagId, tags.id))
      .innerJoin(tagGroups, eq(tags.groupId, tagGroups.id))
      .where(and(
        eq(productTags.productId, productId),
        eq(tags.isActive, true),
        eq(tagGroups.isActive, true)
      ))
      .orderBy(tagGroups.sortOrder, tags.sortOrder);

    // Parse JSON fields safely
    let images: string[] = [];
    let legacyTags: string[] = [];
    
    // Process tags by group
    const tagsByGroup: Record<string, Array<{
      id: string;
      name: string;
      description?: string;
      color?: string;
      icon?: string;
      customValue?: string;
    }>> = {};
    
    productTagsWithGroups.forEach(item => {
      const groupSlug = item.group.slug;
      if (!tagsByGroup[groupSlug]) {
        tagsByGroup[groupSlug] = [];
      }
      
      tagsByGroup[groupSlug].push({
        id: item.tag.id,
        name: item.productTag.customValue || item.tag.customValue || item.tag.name,
        description: item.tag.description || undefined,
        color: item.tag.color || item.group.color || undefined,
        icon: item.tag.icon || item.group.icon || undefined,
        customValue: item.productTag.customValue || undefined,
      });
    });

    // Parse images using the normalization utility
    images = normalizeProductImages(item.product.images);

    // Parse legacy tags using the normalization utility
    legacyTags = normalizeProductTags(item.product.tags);

    // Calculate stock status based on product type
    let inStock = false;
    if (item.product.productType === 'variable') {
      // For variable products: in stock if has variants and not ALL variants are out of stock
      const hasVariants = (item.variantStock?.totalVariants || 0) > 0;
      const allVariantsOutOfStock = hasVariants && 
        item.variantStock?.totalVariants === item.variantStock?.outOfStockVariants;
      inStock = hasVariants && !allVariantsOutOfStock;
    } else {
      // For simple products: only check outOfStock column, ignore inventory
      const isMarkedOutOfStock = item.product.outOfStock === true;
      inStock = !isMarkedOutOfStock;
      
      console.log(`=== SIMPLE PRODUCT DETAILS STOCK DEBUG (${item.product.name}) ===`);
      console.log('Product Type:', item.product.productType);
      console.log('OutOfStock Column:', item.product.outOfStock);
      console.log('Is Marked Out of Stock:', isMarkedOutOfStock);
      console.log('Final inStock:', inStock);
    }

    // Transform the data
    const transformedProduct = {
      id: item.product.id,
      name: item.product.name,
      category: item.category?.name || 'Uncategorized',
      categorySlug: item.category?.slug || 'uncategorized',
      price: parseFloat(item.product.price?.toString() || '0'),
      comparePrice: item.product.comparePrice ? parseFloat(item.product.comparePrice.toString()) : null,
      image: images[0] || null, // First image or null for placeholder
      images: images,
      description: item.product.description || item.product.shortDescription || '',
      shortDescription: item.product.shortDescription || '',
      thc: parseFloat(item.product.thc?.toString() || '0'),
      cbd: parseFloat(item.product.cbd?.toString() || '0'),
      strain: legacyTags.find(tag => ['indica', 'sativa', 'hybrid'].includes(tag.toLowerCase())) || 'hybrid',
      inStock: inStock,
      isFeatured: item.product.isFeatured || false,
      productType: item.product.productType || 'simple',
      tags: legacyTags,
      // Dynamic tags organized by group
      effects: tagsByGroup['effects'] || tagsByGroup['effect'] || [],
      flavors: tagsByGroup['flavors'] || tagsByGroup['flavor'] || [],
      medicalUses: tagsByGroup['medical-uses'] || tagsByGroup['medical'] || tagsByGroup['benefits'] || tagsByGroup['may-help-with'] || [],
      // All tags organized by group for flexibility
      tagGroups: tagsByGroup,
      growInfo: {
        difficulty: item.product.difficulty || 'Medium',
        flowering: item.product.floweringTime || '8-10 weeks',
        yield: item.product.yieldAmount || 'Medium'
      },
      createdAt: item.product.createdAt,
    };

    return NextResponse.json({
      success: true,
      data: transformedProduct,
    });
  } catch (error) {
    console.error('Error fetching product:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch product' }, { status: 500 });
  }
}