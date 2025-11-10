import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { categories, products } from '@/lib/schema';
import { eq, and, count, desc } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  try {
    // Fetch active categories with product counts
    const categoriesWithCounts = await db
      .select({
        category: {
          id: categories.id,
          name: categories.name,
          slug: categories.slug,
          description: categories.description,
          image: categories.image,
          icon: categories.icon,
          iconName: categories.iconName,
          isFeatured: categories.isFeatured,
          sortOrder: categories.sortOrder,
        },
        productCount: count(products.id),
      })
      .from(categories)
      .leftJoin(
        products, 
        and(
          eq(products.categoryId, categories.id),
          eq(products.isActive, true)
        )
      )
      .where(eq(categories.isActive, true))
      .groupBy(categories.id)
      .orderBy(categories.sortOrder, categories.name);

    // Transform the data
    const transformedCategories = categoriesWithCounts.map(item => ({
      id: item.category.id,
      name: item.category.name,
      slug: item.category.slug,
      description: item.category.description,
      image: item.category.image,
      icon: item.category.icon,
      iconName: item.category.iconName,
      isFeatured: item.category.isFeatured || false,
      sortOrder: item.category.sortOrder || 0,
      productCount: item.productCount || 0,
    }));

    // Add "All" category at the beginning
    const allCategories = [
      {
        id: 'all',
        name: 'All',
        slug: 'all',
        description: 'All products',
        image: null,
        icon: null,
        iconName: null,
        isFeatured: false,
        sortOrder: -1,
        productCount: transformedCategories.reduce((sum, cat) => sum + cat.productCount, 0),
      },
      ...transformedCategories
    ];

    return NextResponse.json({
      success: true,
      data: allCategories
    });

  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch categories',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}