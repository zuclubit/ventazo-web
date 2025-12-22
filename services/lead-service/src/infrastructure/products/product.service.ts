/**
 * Product Catalog Management Service
 *
 * Comprehensive product management:
 * - Product CRUD operations
 * - Category management with hierarchies
 * - Product variants
 * - Price books and pricing tiers
 * - Discount rules and promotions
 * - Product bundles and kits
 * - Inventory tracking
 * - Product analytics
 */

import { injectable, inject } from 'tsyringe';
import { eq, and, desc, gte, lte, sql, asc, or, inArray, like, isNull } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { Result } from '@zuclubit/domain';
import {
  productCategories,
  products,
  productVariants,
  priceBooks,
  priceBookEntries,
  discountRules,
  productBundles,
  inventoryTransactions,
  productUsage,
  productAnalytics,
  ProductCategoryRow,
  ProductRow,
  ProductVariantRow,
  PriceBookRow,
  PriceBookEntryRow,
  DiscountRuleRow,
  ProductBundleRow,
  InventoryTransactionRow,
  ProductUsageRow,
  ProductAnalyticsRow,
} from '../database/schema';
import type {
  ProductStatus,
  ProductType,
  BillingFrequency,
  DiscountType,
  PriceCalculationMethod,
  ProductRelationType,
  ProductCategory,
  Product,
  ProductVariant,
  PriceBook,
  PriceBookEntry,
  PriceTier,
  DiscountRule,
  DiscountApplicability,
  ProductBundle,
  BundleItem,
  InventoryTransaction,
  ProductUsage as ProductUsageType,
  ProductAnalytics as ProductAnalyticsType,
  ProductSearchFilters,
  CatalogDashboard,
} from './types';

@injectable()
export class ProductService {
  private db: any;

  constructor(@inject('Database') db: any) {
    this.db = db;
  }

  // ============================================================================
  // CATEGORY MANAGEMENT
  // ============================================================================

  /**
   * Create a product category
   */
  async createCategory(
    tenantId: string,
    userId: string,
    input: {
      name: string;
      slug: string;
      description?: string;
      parentId?: string;
      displayOrder?: number;
      imageUrl?: string;
      isVisible?: boolean;
      metadata?: Record<string, unknown>;
    }
  ): Promise<Result<ProductCategoryRow>> {
    try {
      // Calculate hierarchy
      let level = 0;
      let path = '/';

      if (input.parentId) {
        const [parent] = await this.db
          .select()
          .from(productCategories)
          .where(and(eq(productCategories.tenantId, tenantId), eq(productCategories.id, input.parentId)));

        if (parent) {
          level = parent.level + 1;
          path = `${parent.path}${parent.id}/`;
        }
      }

      const [category] = await this.db
        .insert(productCategories)
        .values({
          id: uuidv4(),
          tenantId,
          name: input.name,
          slug: input.slug,
          description: input.description,
          parentId: input.parentId,
          level,
          path,
          displayOrder: input.displayOrder ?? 0,
          imageUrl: input.imageUrl,
          isVisible: input.isVisible ?? true,
          metadata: input.metadata ?? {},
          createdBy: userId,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      return Result.ok(category);
    } catch (error) {
      return Result.fail(`Failed to create category: ${error}`);
    }
  }

  /**
   * Get category by ID
   */
  async getCategoryById(tenantId: string, categoryId: string): Promise<Result<ProductCategoryRow | null>> {
    try {
      const [category] = await this.db
        .select()
        .from(productCategories)
        .where(and(eq(productCategories.tenantId, tenantId), eq(productCategories.id, categoryId)));

      return Result.ok(category || null);
    } catch (error) {
      return Result.fail(`Failed to get category: ${error}`);
    }
  }

  /**
   * Get category tree (hierarchical)
   */
  async getCategoryTree(tenantId: string, parentId?: string): Promise<Result<ProductCategoryRow[]>> {
    try {
      const conditions = [eq(productCategories.tenantId, tenantId)];

      if (parentId) {
        conditions.push(eq(productCategories.parentId, parentId));
      } else {
        conditions.push(isNull(productCategories.parentId));
      }

      const categories = await this.db
        .select()
        .from(productCategories)
        .where(and(...conditions))
        .orderBy(asc(productCategories.displayOrder), asc(productCategories.name));

      return Result.ok(categories);
    } catch (error) {
      return Result.fail(`Failed to get category tree: ${error}`);
    }
  }

  /**
   * Update a category
   */
  async updateCategory(
    tenantId: string,
    categoryId: string,
    updates: Partial<{
      name: string;
      slug: string;
      description: string;
      displayOrder: number;
      imageUrl: string;
      isVisible: boolean;
      metadata: Record<string, unknown>;
    }>
  ): Promise<Result<ProductCategoryRow>> {
    try {
      const [category] = await this.db
        .update(productCategories)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(and(eq(productCategories.tenantId, tenantId), eq(productCategories.id, categoryId)))
        .returning();

      if (!category) {
        return Result.fail('Category not found');
      }

      return Result.ok(category);
    } catch (error) {
      return Result.fail(`Failed to update category: ${error}`);
    }
  }

  /**
   * Delete a category
   */
  async deleteCategory(tenantId: string, categoryId: string): Promise<Result<void>> {
    try {
      // Check for child categories
      const children = await this.db
        .select()
        .from(productCategories)
        .where(and(eq(productCategories.tenantId, tenantId), eq(productCategories.parentId, categoryId)));

      if (children.length > 0) {
        return Result.fail('Cannot delete category with subcategories');
      }

      // Check for products in this category
      const productCount = await this.db
        .select({ count: sql<number>`count(*)` })
        .from(products)
        .where(and(eq(products.tenantId, tenantId), eq(products.categoryId, categoryId)));

      if (productCount[0]?.count > 0) {
        return Result.fail('Cannot delete category with products');
      }

      await this.db
        .delete(productCategories)
        .where(and(eq(productCategories.tenantId, tenantId), eq(productCategories.id, categoryId)));

      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(`Failed to delete category: ${error}`);
    }
  }

  // ============================================================================
  // PRODUCT CRUD
  // ============================================================================

  /**
   * Create a product
   */
  async createProduct(
    tenantId: string,
    userId: string,
    input: {
      sku: string;
      name: string;
      slug: string;
      description?: string;
      shortDescription?: string;
      type: ProductType;
      categoryId?: string;
      tags?: string[];
      basePrice: number;
      currency?: string;
      costPrice?: number;
      msrp?: number;
      billingFrequency?: BillingFrequency;
      billingCycleCount?: number;
      trialDays?: number;
      setupFee?: number;
      unitOfMeasure?: string;
      minimumQuantity?: number;
      maximumQuantity?: number;
      quantityIncrement?: number;
      taxable?: boolean;
      taxCode?: string;
      taxRate?: number;
      trackInventory?: boolean;
      stockQuantity?: number;
      lowStockThreshold?: number;
      allowBackorder?: boolean;
      weight?: number;
      weightUnit?: string;
      dimensions?: { length: number; width: number; height: number; unit: string };
      deliveryMethod?: string;
      downloadUrl?: string;
      licenseType?: string;
      imageUrl?: string;
      images?: string[];
      documents?: { id: string; name: string; type: string; url: string }[];
      features?: string[];
      specifications?: Record<string, string>;
      hasVariants?: boolean;
      variantAttributes?: string[];
      relatedProducts?: { productId: string; relationType: ProductRelationType; displayOrder: number }[];
      customFields?: Record<string, unknown>;
      metaTitle?: string;
      metaDescription?: string;
      isFeatured?: boolean;
      isNew?: boolean;
    }
  ): Promise<Result<ProductRow>> {
    try {
      // Get category path if categoryId provided
      let categoryPath: string | undefined;
      if (input.categoryId) {
        const [category] = await this.db
          .select()
          .from(productCategories)
          .where(and(eq(productCategories.tenantId, tenantId), eq(productCategories.id, input.categoryId)));
        if (category) {
          categoryPath = `${category.path}${category.id}`;
        }
      }

      const [product] = await this.db
        .insert(products)
        .values({
          id: uuidv4(),
          tenantId,
          sku: input.sku,
          name: input.name,
          slug: input.slug,
          description: input.description,
          shortDescription: input.shortDescription,
          type: input.type,
          status: 'draft',
          categoryId: input.categoryId,
          categoryPath,
          tags: input.tags ?? [],
          basePrice: input.basePrice,
          currency: input.currency ?? 'USD',
          costPrice: input.costPrice,
          msrp: input.msrp,
          billingFrequency: input.billingFrequency,
          billingCycleCount: input.billingCycleCount,
          trialDays: input.trialDays,
          setupFee: input.setupFee,
          unitOfMeasure: input.unitOfMeasure ?? 'each',
          minimumQuantity: input.minimumQuantity,
          maximumQuantity: input.maximumQuantity,
          quantityIncrement: input.quantityIncrement,
          taxable: input.taxable ?? true,
          taxCode: input.taxCode,
          taxRate: input.taxRate,
          trackInventory: input.trackInventory ?? false,
          stockQuantity: input.stockQuantity,
          lowStockThreshold: input.lowStockThreshold,
          allowBackorder: input.allowBackorder ?? false,
          weight: input.weight,
          weightUnit: input.weightUnit,
          dimensions: input.dimensions,
          deliveryMethod: input.deliveryMethod,
          downloadUrl: input.downloadUrl,
          licenseType: input.licenseType,
          imageUrl: input.imageUrl,
          images: input.images ?? [],
          documents: input.documents ?? [],
          features: input.features ?? [],
          specifications: input.specifications ?? {},
          hasVariants: input.hasVariants ?? false,
          variantAttributes: input.variantAttributes ?? [],
          relatedProducts: input.relatedProducts ?? [],
          customFields: input.customFields ?? {},
          metaTitle: input.metaTitle,
          metaDescription: input.metaDescription,
          isFeatured: input.isFeatured ?? false,
          isNew: input.isNew ?? false,
          createdBy: userId,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      return Result.ok(product);
    } catch (error) {
      return Result.fail(`Failed to create product: ${error}`);
    }
  }

  /**
   * Get product by ID
   */
  async getProductById(tenantId: string, productId: string): Promise<Result<ProductRow | null>> {
    try {
      const [product] = await this.db
        .select()
        .from(products)
        .where(and(eq(products.tenantId, tenantId), eq(products.id, productId)));

      return Result.ok(product || null);
    } catch (error) {
      return Result.fail(`Failed to get product: ${error}`);
    }
  }

  /**
   * Get product by SKU
   */
  async getProductBySku(tenantId: string, sku: string): Promise<Result<ProductRow | null>> {
    try {
      const [product] = await this.db
        .select()
        .from(products)
        .where(and(eq(products.tenantId, tenantId), eq(products.sku, sku)));

      return Result.ok(product || null);
    } catch (error) {
      return Result.fail(`Failed to get product: ${error}`);
    }
  }

  /**
   * Search products with filters
   */
  async searchProducts(
    tenantId: string,
    filters: ProductSearchFilters,
    pagination: { page: number; limit: number }
  ): Promise<Result<{ products: ProductRow[]; total: number }>> {
    try {
      const conditions = [eq(products.tenantId, tenantId)];

      if (filters.search) {
        conditions.push(
          or(
            like(products.name, `%${filters.search}%`),
            like(products.sku, `%${filters.search}%`),
            like(products.description, `%${filters.search}%`)
          )!
        );
      }

      if (filters.categoryId) {
        conditions.push(eq(products.categoryId, filters.categoryId));
      }

      if (filters.categoryIds && filters.categoryIds.length > 0) {
        conditions.push(inArray(products.categoryId, filters.categoryIds));
      }

      if (filters.type && filters.type.length > 0) {
        conditions.push(inArray(products.type, filters.type));
      }

      if (filters.status && filters.status.length > 0) {
        conditions.push(inArray(products.status, filters.status));
      }

      if (filters.priceMin !== undefined) {
        conditions.push(gte(products.basePrice, filters.priceMin));
      }

      if (filters.priceMax !== undefined) {
        conditions.push(lte(products.basePrice, filters.priceMax));
      }

      if (filters.inStock === true) {
        conditions.push(
          or(eq(products.trackInventory, false), gte(products.stockQuantity, 1))!
        );
      }

      if (filters.isFeatured !== undefined) {
        conditions.push(eq(products.isFeatured, filters.isFeatured));
      }

      if (filters.isNew !== undefined) {
        conditions.push(eq(products.isNew, filters.isNew));
      }

      if (filters.hasVariants !== undefined) {
        conditions.push(eq(products.hasVariants, filters.hasVariants));
      }

      const offset = (pagination.page - 1) * pagination.limit;

      const [productList, countResult] = await Promise.all([
        this.db
          .select()
          .from(products)
          .where(and(...conditions))
          .orderBy(desc(products.createdAt))
          .limit(pagination.limit)
          .offset(offset),
        this.db
          .select({ count: sql<number>`count(*)` })
          .from(products)
          .where(and(...conditions)),
      ]);

      return Result.ok({
        products: productList,
        total: Number(countResult[0]?.count ?? 0),
      });
    } catch (error) {
      return Result.fail(`Failed to search products: ${error}`);
    }
  }

  /**
   * Update a product
   */
  async updateProduct(
    tenantId: string,
    productId: string,
    updates: Partial<{
      name: string;
      slug: string;
      description: string;
      shortDescription: string;
      categoryId: string;
      tags: string[];
      basePrice: number;
      costPrice: number;
      msrp: number;
      billingFrequency: BillingFrequency;
      billingCycleCount: number;
      trialDays: number;
      setupFee: number;
      unitOfMeasure: string;
      minimumQuantity: number;
      maximumQuantity: number;
      quantityIncrement: number;
      taxable: boolean;
      taxCode: string;
      taxRate: number;
      trackInventory: boolean;
      lowStockThreshold: number;
      allowBackorder: boolean;
      weight: number;
      weightUnit: string;
      dimensions: { length: number; width: number; height: number; unit: string };
      deliveryMethod: string;
      downloadUrl: string;
      licenseType: string;
      imageUrl: string;
      images: string[];
      documents: { id: string; name: string; type: string; url: string }[];
      features: string[];
      specifications: Record<string, string>;
      variantAttributes: string[];
      relatedProducts: { productId: string; relationType: ProductRelationType; displayOrder: number }[];
      customFields: Record<string, unknown>;
      metaTitle: string;
      metaDescription: string;
      isFeatured: boolean;
      isNew: boolean;
    }>
  ): Promise<Result<ProductRow>> {
    try {
      // Update category path if categoryId changed
      if (updates.categoryId) {
        const [category] = await this.db
          .select()
          .from(productCategories)
          .where(and(eq(productCategories.tenantId, tenantId), eq(productCategories.id, updates.categoryId)));
        if (category) {
          (updates as any).categoryPath = `${category.path}${category.id}`;
        }
      }

      const [product] = await this.db
        .update(products)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(and(eq(products.tenantId, tenantId), eq(products.id, productId)))
        .returning();

      if (!product) {
        return Result.fail('Product not found');
      }

      return Result.ok(product);
    } catch (error) {
      return Result.fail(`Failed to update product: ${error}`);
    }
  }

  /**
   * Update product status
   */
  async updateProductStatus(
    tenantId: string,
    productId: string,
    status: ProductStatus
  ): Promise<Result<ProductRow>> {
    try {
      const updates: any = {
        status,
        updatedAt: new Date(),
      };

      if (status === 'active') {
        updates.publishedAt = new Date();
      }

      const [product] = await this.db
        .update(products)
        .set(updates)
        .where(and(eq(products.tenantId, tenantId), eq(products.id, productId)))
        .returning();

      if (!product) {
        return Result.fail('Product not found');
      }

      return Result.ok(product);
    } catch (error) {
      return Result.fail(`Failed to update product status: ${error}`);
    }
  }

  /**
   * Delete a product
   */
  async deleteProduct(tenantId: string, productId: string): Promise<Result<void>> {
    try {
      await this.db.delete(products).where(and(eq(products.tenantId, tenantId), eq(products.id, productId)));

      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(`Failed to delete product: ${error}`);
    }
  }

  // ============================================================================
  // PRODUCT VARIANTS
  // ============================================================================

  /**
   * Create a product variant
   */
  async createVariant(
    tenantId: string,
    productId: string,
    input: {
      sku: string;
      name: string;
      attributes: Record<string, string>;
      price?: number;
      costPrice?: number;
      stockQuantity?: number;
      lowStockThreshold?: number;
      weight?: number;
      dimensions?: { length: number; width: number; height: number; unit: string };
      imageUrl?: string;
    }
  ): Promise<Result<ProductVariantRow>> {
    try {
      // Update product to have variants
      await this.db
        .update(products)
        .set({ hasVariants: true, updatedAt: new Date() })
        .where(and(eq(products.tenantId, tenantId), eq(products.id, productId)));

      const [variant] = await this.db
        .insert(productVariants)
        .values({
          id: uuidv4(),
          productId,
          tenantId,
          sku: input.sku,
          name: input.name,
          attributes: input.attributes,
          price: input.price,
          costPrice: input.costPrice,
          stockQuantity: input.stockQuantity,
          lowStockThreshold: input.lowStockThreshold,
          weight: input.weight,
          dimensions: input.dimensions,
          imageUrl: input.imageUrl,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      return Result.ok(variant);
    } catch (error) {
      return Result.fail(`Failed to create variant: ${error}`);
    }
  }

  /**
   * Get variants for a product
   */
  async getProductVariants(tenantId: string, productId: string): Promise<Result<ProductVariantRow[]>> {
    try {
      const variants = await this.db
        .select()
        .from(productVariants)
        .where(and(eq(productVariants.tenantId, tenantId), eq(productVariants.productId, productId)))
        .orderBy(asc(productVariants.name));

      return Result.ok(variants);
    } catch (error) {
      return Result.fail(`Failed to get variants: ${error}`);
    }
  }

  /**
   * Update a variant
   */
  async updateVariant(
    tenantId: string,
    variantId: string,
    updates: Partial<{
      name: string;
      attributes: Record<string, string>;
      price: number;
      costPrice: number;
      lowStockThreshold: number;
      weight: number;
      dimensions: { length: number; width: number; height: number; unit: string };
      imageUrl: string;
      isActive: boolean;
    }>
  ): Promise<Result<ProductVariantRow>> {
    try {
      const [variant] = await this.db
        .update(productVariants)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(and(eq(productVariants.tenantId, tenantId), eq(productVariants.id, variantId)))
        .returning();

      if (!variant) {
        return Result.fail('Variant not found');
      }

      return Result.ok(variant);
    } catch (error) {
      return Result.fail(`Failed to update variant: ${error}`);
    }
  }

  /**
   * Delete a variant
   */
  async deleteVariant(tenantId: string, variantId: string): Promise<Result<void>> {
    try {
      // Get variant to find product
      const [variant] = await this.db
        .select()
        .from(productVariants)
        .where(and(eq(productVariants.tenantId, tenantId), eq(productVariants.id, variantId)));

      if (!variant) {
        return Result.fail('Variant not found');
      }

      await this.db.delete(productVariants).where(eq(productVariants.id, variantId));

      // Check if product still has variants
      const remainingVariants = await this.db
        .select({ count: sql<number>`count(*)` })
        .from(productVariants)
        .where(eq(productVariants.productId, variant.productId));

      if (Number(remainingVariants[0]?.count ?? 0) === 0) {
        await this.db
          .update(products)
          .set({ hasVariants: false, updatedAt: new Date() })
          .where(eq(products.id, variant.productId));
      }

      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(`Failed to delete variant: ${error}`);
    }
  }

  // ============================================================================
  // PRICE BOOKS
  // ============================================================================

  /**
   * Create a price book
   */
  async createPriceBook(
    tenantId: string,
    userId: string,
    input: {
      name: string;
      description?: string;
      isStandard?: boolean;
      currency?: string;
      validFrom?: Date;
      validTo?: Date;
      applicableTo?: {
        allCustomers?: boolean;
        customerIds?: string[];
        customerSegments?: string[];
        territories?: string[];
        channels?: string[];
      };
      adjustmentType?: 'percentage' | 'fixed';
      adjustmentValue?: number;
    }
  ): Promise<Result<PriceBookRow>> {
    try {
      // If this is standard, unset other standard price books
      if (input.isStandard) {
        await this.db
          .update(priceBooks)
          .set({ isStandard: false, updatedAt: new Date() })
          .where(and(eq(priceBooks.tenantId, tenantId), eq(priceBooks.isStandard, true)));
      }

      const [priceBook] = await this.db
        .insert(priceBooks)
        .values({
          id: uuidv4(),
          tenantId,
          name: input.name,
          description: input.description,
          isStandard: input.isStandard ?? false,
          isActive: true,
          currency: input.currency ?? 'USD',
          validFrom: input.validFrom,
          validTo: input.validTo,
          applicableTo: input.applicableTo ?? { allCustomers: true },
          adjustmentType: input.adjustmentType,
          adjustmentValue: input.adjustmentValue,
          createdBy: userId,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      return Result.ok(priceBook);
    } catch (error) {
      return Result.fail(`Failed to create price book: ${error}`);
    }
  }

  /**
   * Get price books
   */
  async getPriceBooks(
    tenantId: string,
    options?: { activeOnly?: boolean }
  ): Promise<Result<PriceBookRow[]>> {
    try {
      const conditions = [eq(priceBooks.tenantId, tenantId)];

      if (options?.activeOnly) {
        conditions.push(eq(priceBooks.isActive, true));
      }

      const books = await this.db
        .select()
        .from(priceBooks)
        .where(and(...conditions))
        .orderBy(desc(priceBooks.isStandard), asc(priceBooks.name));

      return Result.ok(books);
    } catch (error) {
      return Result.fail(`Failed to get price books: ${error}`);
    }
  }

  /**
   * Add product to price book
   */
  async addPriceBookEntry(
    tenantId: string,
    priceBookId: string,
    input: {
      productId: string;
      listPrice: number;
      minimumPrice?: number;
      maximumDiscount?: number;
      calculationMethod?: PriceCalculationMethod;
      priceTiers?: PriceTier[];
      validFrom?: Date;
      validTo?: Date;
    }
  ): Promise<Result<PriceBookEntryRow>> {
    try {
      const [entry] = await this.db
        .insert(priceBookEntries)
        .values({
          id: uuidv4(),
          priceBookId,
          productId: input.productId,
          tenantId,
          listPrice: input.listPrice,
          minimumPrice: input.minimumPrice,
          maximumDiscount: input.maximumDiscount,
          calculationMethod: input.calculationMethod ?? 'flat',
          priceTiers: input.priceTiers ?? [],
          isActive: true,
          validFrom: input.validFrom,
          validTo: input.validTo,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      return Result.ok(entry);
    } catch (error) {
      return Result.fail(`Failed to add price book entry: ${error}`);
    }
  }

  /**
   * Get price for product (considering price books)
   */
  async getProductPrice(
    tenantId: string,
    productId: string,
    options?: {
      customerId?: string;
      priceBookId?: string;
      quantity?: number;
    }
  ): Promise<Result<{ price: number; priceBookId?: string; calculationMethod: string }>> {
    try {
      // Get product base price
      const [product] = await this.db
        .select()
        .from(products)
        .where(and(eq(products.tenantId, tenantId), eq(products.id, productId)));

      if (!product) {
        return Result.fail('Product not found');
      }

      // If specific price book requested
      if (options?.priceBookId) {
        const [entry] = await this.db
          .select()
          .from(priceBookEntries)
          .where(
            and(
              eq(priceBookEntries.tenantId, tenantId),
              eq(priceBookEntries.priceBookId, options.priceBookId),
              eq(priceBookEntries.productId, productId),
              eq(priceBookEntries.isActive, true)
            )
          );

        if (entry) {
          const price = this.calculateTieredPrice(entry, options?.quantity ?? 1);
          return Result.ok({
            price,
            priceBookId: options.priceBookId,
            calculationMethod: entry.calculationMethod,
          });
        }
      }

      // Try to find applicable price book
      const now = new Date();
      const activePriceBooks = await this.db
        .select()
        .from(priceBooks)
        .where(
          and(
            eq(priceBooks.tenantId, tenantId),
            eq(priceBooks.isActive, true),
            or(isNull(priceBooks.validFrom), lte(priceBooks.validFrom, now)),
            or(isNull(priceBooks.validTo), gte(priceBooks.validTo, now))
          )
        )
        .orderBy(desc(priceBooks.isStandard));

      for (const pb of activePriceBooks) {
        const [entry] = await this.db
          .select()
          .from(priceBookEntries)
          .where(
            and(
              eq(priceBookEntries.priceBookId, pb.id),
              eq(priceBookEntries.productId, productId),
              eq(priceBookEntries.isActive, true)
            )
          );

        if (entry) {
          const price = this.calculateTieredPrice(entry, options?.quantity ?? 1);
          return Result.ok({
            price,
            priceBookId: pb.id,
            calculationMethod: entry.calculationMethod,
          });
        }
      }

      // Return base product price
      return Result.ok({
        price: product.basePrice,
        calculationMethod: 'flat',
      });
    } catch (error) {
      return Result.fail(`Failed to get product price: ${error}`);
    }
  }

  private calculateTieredPrice(entry: PriceBookEntryRow, quantity: number): number {
    if (entry.calculationMethod === 'flat' || !entry.priceTiers || (entry.priceTiers as PriceTier[]).length === 0) {
      return entry.listPrice;
    }

    const tiers = entry.priceTiers as PriceTier[];
    const sortedTiers = [...tiers].sort((a, b) => a.minQuantity - b.minQuantity);

    for (let i = sortedTiers.length - 1; i >= 0; i--) {
      if (quantity >= sortedTiers[i].minQuantity) {
        return sortedTiers[i].price;
      }
    }

    return entry.listPrice;
  }

  // ============================================================================
  // DISCOUNT RULES
  // ============================================================================

  /**
   * Create a discount rule
   */
  async createDiscountRule(
    tenantId: string,
    userId: string,
    input: {
      name: string;
      description?: string;
      code?: string;
      discountType: DiscountType;
      discountValue: number;
      buyQuantity?: number;
      getQuantity?: number;
      getDiscountPercentage?: number;
      tiers?: { minQuantity: number; maxQuantity?: number; discountPercentage: number }[];
      applicability?: DiscountApplicability;
      maxUses?: number;
      usesPerCustomer?: number;
      minOrderAmount?: number;
      maxDiscountAmount?: number;
      validFrom: Date;
      validTo?: Date;
      requiresCode?: boolean;
      stackable?: boolean;
      priority?: number;
    }
  ): Promise<Result<DiscountRuleRow>> {
    try {
      const [rule] = await this.db
        .insert(discountRules)
        .values({
          id: uuidv4(),
          tenantId,
          name: input.name,
          description: input.description,
          code: input.code,
          discountType: input.discountType,
          discountValue: input.discountValue,
          buyQuantity: input.buyQuantity,
          getQuantity: input.getQuantity,
          getDiscountPercentage: input.getDiscountPercentage,
          tiers: input.tiers ?? [],
          applicability: input.applicability ?? { allProducts: true, allCustomers: true },
          maxUses: input.maxUses,
          usesPerCustomer: input.usesPerCustomer,
          currentUses: 0,
          minOrderAmount: input.minOrderAmount,
          maxDiscountAmount: input.maxDiscountAmount,
          validFrom: input.validFrom,
          validTo: input.validTo,
          isActive: true,
          requiresCode: input.requiresCode ?? false,
          stackable: input.stackable ?? false,
          priority: input.priority ?? 0,
          createdBy: userId,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      return Result.ok(rule);
    } catch (error) {
      return Result.fail(`Failed to create discount rule: ${error}`);
    }
  }

  /**
   * Get active discount rules
   */
  async getActiveDiscountRules(tenantId: string): Promise<Result<DiscountRuleRow[]>> {
    try {
      const now = new Date();
      const rules = await this.db
        .select()
        .from(discountRules)
        .where(
          and(
            eq(discountRules.tenantId, tenantId),
            eq(discountRules.isActive, true),
            lte(discountRules.validFrom, now),
            or(isNull(discountRules.validTo), gte(discountRules.validTo, now))
          )
        )
        .orderBy(desc(discountRules.priority));

      return Result.ok(rules);
    } catch (error) {
      return Result.fail(`Failed to get discount rules: ${error}`);
    }
  }

  /**
   * Validate discount code
   */
  async validateDiscountCode(
    tenantId: string,
    code: string,
    customerId?: string
  ): Promise<Result<DiscountRuleRow | null>> {
    try {
      const now = new Date();
      const [rule] = await this.db
        .select()
        .from(discountRules)
        .where(
          and(
            eq(discountRules.tenantId, tenantId),
            eq(discountRules.code, code),
            eq(discountRules.isActive, true),
            eq(discountRules.requiresCode, true),
            lte(discountRules.validFrom, now),
            or(isNull(discountRules.validTo), gte(discountRules.validTo, now))
          )
        );

      if (!rule) {
        return Result.ok(null);
      }

      // Check usage limits
      if (rule.maxUses && rule.currentUses >= rule.maxUses) {
        return Result.ok(null);
      }

      // TODO: Check per-customer usage if customerId provided

      return Result.ok(rule);
    } catch (error) {
      return Result.fail(`Failed to validate discount code: ${error}`);
    }
  }

  /**
   * Increment discount usage
   */
  async incrementDiscountUsage(tenantId: string, discountId: string): Promise<Result<void>> {
    try {
      await this.db
        .update(discountRules)
        .set({
          currentUses: sql`${discountRules.currentUses} + 1`,
          updatedAt: new Date(),
        })
        .where(and(eq(discountRules.tenantId, tenantId), eq(discountRules.id, discountId)));

      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(`Failed to increment discount usage: ${error}`);
    }
  }

  // ============================================================================
  // PRODUCT BUNDLES
  // ============================================================================

  /**
   * Create a product bundle
   */
  async createBundle(
    tenantId: string,
    productId: string,
    input: {
      name: string;
      description?: string;
      bundleType: 'fixed' | 'configurable';
      items: BundleItem[];
      pricingType: 'fixed' | 'calculated' | 'discounted';
      fixedPrice?: number;
      discountPercentage?: number;
      minItems?: number;
      maxItems?: number;
    }
  ): Promise<Result<ProductBundleRow>> {
    try {
      const [bundle] = await this.db
        .insert(productBundles)
        .values({
          id: uuidv4(),
          productId,
          tenantId,
          name: input.name,
          description: input.description,
          bundleType: input.bundleType,
          items: input.items,
          pricingType: input.pricingType,
          fixedPrice: input.fixedPrice,
          discountPercentage: input.discountPercentage,
          minItems: input.minItems,
          maxItems: input.maxItems,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      // Update product type to bundle
      await this.db
        .update(products)
        .set({ type: 'bundle', updatedAt: new Date() })
        .where(eq(products.id, productId));

      return Result.ok(bundle);
    } catch (error) {
      return Result.fail(`Failed to create bundle: ${error}`);
    }
  }

  /**
   * Get bundle by product ID
   */
  async getBundleByProductId(tenantId: string, productId: string): Promise<Result<ProductBundleRow | null>> {
    try {
      const [bundle] = await this.db
        .select()
        .from(productBundles)
        .where(and(eq(productBundles.tenantId, tenantId), eq(productBundles.productId, productId)));

      return Result.ok(bundle || null);
    } catch (error) {
      return Result.fail(`Failed to get bundle: ${error}`);
    }
  }

  /**
   * Calculate bundle price
   */
  async calculateBundlePrice(
    tenantId: string,
    bundleId: string,
    selectedItems?: { productId: string; quantity: number }[]
  ): Promise<Result<{ total: number; itemPrices: { productId: string; price: number; quantity: number }[] }>> {
    try {
      const [bundle] = await this.db
        .select()
        .from(productBundles)
        .where(and(eq(productBundles.tenantId, tenantId), eq(productBundles.id, bundleId)));

      if (!bundle) {
        return Result.fail('Bundle not found');
      }

      const bundleItems = bundle.items as BundleItem[];

      // For fixed bundles, use all items
      const itemsToPrice =
        bundle.bundleType === 'fixed'
          ? bundleItems.map((i) => ({ productId: i.productId, quantity: i.quantity }))
          : selectedItems ?? [];

      const itemPrices: { productId: string; price: number; quantity: number }[] = [];
      let total = 0;

      for (const item of itemsToPrice) {
        const priceResult = await this.getProductPrice(tenantId, item.productId, { quantity: item.quantity });
        if (priceResult.isSuccess && priceResult.value) {
          const itemPrice = priceResult.value.price * item.quantity;
          itemPrices.push({
            productId: item.productId,
            price: priceResult.value.price,
            quantity: item.quantity,
          });
          total += itemPrice;
        }
      }

      // Apply bundle pricing
      if (bundle.pricingType === 'fixed' && bundle.fixedPrice) {
        total = bundle.fixedPrice;
      } else if (bundle.pricingType === 'discounted' && bundle.discountPercentage) {
        total = Math.round(total * (1 - bundle.discountPercentage / 100));
      }

      return Result.ok({ total, itemPrices });
    } catch (error) {
      return Result.fail(`Failed to calculate bundle price: ${error}`);
    }
  }

  // ============================================================================
  // INVENTORY MANAGEMENT
  // ============================================================================

  /**
   * Adjust inventory
   */
  async adjustInventory(
    tenantId: string,
    userId: string,
    input: {
      productId: string;
      variantId?: string;
      quantity: number;
      type: 'adjustment' | 'sale' | 'purchase' | 'return' | 'transfer' | 'reserve' | 'release';
      referenceType?: string;
      referenceId?: string;
      reason?: string;
      notes?: string;
      locationId?: string;
    }
  ): Promise<Result<InventoryTransactionRow>> {
    try {
      // Get current quantity
      let currentQuantity = 0;
      if (input.variantId) {
        const [variant] = await this.db
          .select()
          .from(productVariants)
          .where(and(eq(productVariants.tenantId, tenantId), eq(productVariants.id, input.variantId)));
        currentQuantity = variant?.stockQuantity ?? 0;
      } else {
        const [product] = await this.db
          .select()
          .from(products)
          .where(and(eq(products.tenantId, tenantId), eq(products.id, input.productId)));
        currentQuantity = product?.stockQuantity ?? 0;
      }

      const newQuantity = currentQuantity + input.quantity;

      // Create transaction
      const [transaction] = await this.db
        .insert(inventoryTransactions)
        .values({
          id: uuidv4(),
          tenantId,
          productId: input.productId,
          variantId: input.variantId,
          type: input.type,
          quantity: input.quantity,
          previousQuantity: currentQuantity,
          newQuantity,
          referenceType: input.referenceType,
          referenceId: input.referenceId,
          reason: input.reason,
          notes: input.notes,
          locationId: input.locationId,
          performedBy: userId,
          performedAt: new Date(),
        })
        .returning();

      // Update stock quantity
      if (input.variantId) {
        await this.db
          .update(productVariants)
          .set({ stockQuantity: newQuantity, updatedAt: new Date() })
          .where(eq(productVariants.id, input.variantId));
      } else {
        await this.db
          .update(products)
          .set({ stockQuantity: newQuantity, updatedAt: new Date() })
          .where(eq(products.id, input.productId));
      }

      return Result.ok(transaction);
    } catch (error) {
      return Result.fail(`Failed to adjust inventory: ${error}`);
    }
  }

  /**
   * Get inventory transactions
   */
  async getInventoryTransactions(
    tenantId: string,
    productId: string,
    options?: { variantId?: string; limit?: number }
  ): Promise<Result<InventoryTransactionRow[]>> {
    try {
      const conditions = [
        eq(inventoryTransactions.tenantId, tenantId),
        eq(inventoryTransactions.productId, productId),
      ];

      if (options?.variantId) {
        conditions.push(eq(inventoryTransactions.variantId, options.variantId));
      }

      const transactions = await this.db
        .select()
        .from(inventoryTransactions)
        .where(and(...conditions))
        .orderBy(desc(inventoryTransactions.performedAt))
        .limit(options?.limit ?? 100);

      return Result.ok(transactions);
    } catch (error) {
      return Result.fail(`Failed to get inventory transactions: ${error}`);
    }
  }

  /**
   * Get low stock products
   */
  async getLowStockProducts(tenantId: string): Promise<Result<ProductRow[]>> {
    try {
      const lowStockProducts = await this.db
        .select()
        .from(products)
        .where(
          and(
            eq(products.tenantId, tenantId),
            eq(products.trackInventory, true),
            sql`${products.stockQuantity} <= ${products.lowStockThreshold}`
          )
        )
        .orderBy(asc(products.stockQuantity));

      return Result.ok(lowStockProducts);
    } catch (error) {
      return Result.fail(`Failed to get low stock products: ${error}`);
    }
  }

  // ============================================================================
  // PRODUCT USAGE (METERED BILLING)
  // ============================================================================

  /**
   * Record product usage
   */
  async recordUsage(
    tenantId: string,
    input: {
      productId: string;
      customerId: string;
      subscriptionId?: string;
      quantity: number;
      unitOfMeasure: string;
      usageDate: Date;
      billingPeriodStart: Date;
      billingPeriodEnd: Date;
      unitPrice: number;
      metadata?: Record<string, unknown>;
    }
  ): Promise<Result<ProductUsageRow>> {
    try {
      const totalAmount = Math.round(input.quantity * input.unitPrice);

      const [usage] = await this.db
        .insert(productUsage)
        .values({
          id: uuidv4(),
          tenantId,
          productId: input.productId,
          customerId: input.customerId,
          subscriptionId: input.subscriptionId,
          quantity: input.quantity,
          unitOfMeasure: input.unitOfMeasure,
          usageDate: input.usageDate,
          billingPeriodStart: input.billingPeriodStart,
          billingPeriodEnd: input.billingPeriodEnd,
          unitPrice: input.unitPrice,
          totalAmount,
          billed: false,
          metadata: input.metadata ?? {},
          createdAt: new Date(),
        })
        .returning();

      return Result.ok(usage);
    } catch (error) {
      return Result.fail(`Failed to record usage: ${error}`);
    }
  }

  /**
   * Get unbilled usage for billing period
   */
  async getUnbilledUsage(
    tenantId: string,
    customerId: string,
    billingPeriodEnd: Date
  ): Promise<Result<ProductUsageRow[]>> {
    try {
      const usage = await this.db
        .select()
        .from(productUsage)
        .where(
          and(
            eq(productUsage.tenantId, tenantId),
            eq(productUsage.customerId, customerId),
            eq(productUsage.billed, false),
            lte(productUsage.billingPeriodEnd, billingPeriodEnd)
          )
        )
        .orderBy(asc(productUsage.usageDate));

      return Result.ok(usage);
    } catch (error) {
      return Result.fail(`Failed to get unbilled usage: ${error}`);
    }
  }

  /**
   * Mark usage as billed
   */
  async markUsageAsBilled(
    tenantId: string,
    usageIds: string[],
    invoiceId: string
  ): Promise<Result<void>> {
    try {
      await this.db
        .update(productUsage)
        .set({
          billed: true,
          billedAt: new Date(),
          invoiceId,
        })
        .where(and(eq(productUsage.tenantId, tenantId), inArray(productUsage.id, usageIds)));

      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(`Failed to mark usage as billed: ${error}`);
    }
  }

  // ============================================================================
  // ANALYTICS & DASHBOARD
  // ============================================================================

  /**
   * Get catalog dashboard
   */
  async getCatalogDashboard(tenantId: string): Promise<Result<CatalogDashboard>> {
    try {
      // Product counts
      const productCounts = await this.db
        .select({
          total: sql<number>`count(*)`,
          active: sql<number>`sum(case when status = 'active' then 1 else 0 end)`,
          draft: sql<number>`sum(case when status = 'draft' then 1 else 0 end)`,
          outOfStock: sql<number>`sum(case when track_inventory = true and stock_quantity <= 0 then 1 else 0 end)`,
          lowStock: sql<number>`sum(case when track_inventory = true and stock_quantity > 0 and stock_quantity <= low_stock_threshold then 1 else 0 end)`,
        })
        .from(products)
        .where(eq(products.tenantId, tenantId));

      // Category count
      const categoryCount = await this.db
        .select({ count: sql<number>`count(*)` })
        .from(productCategories)
        .where(eq(productCategories.tenantId, tenantId));

      // Price book counts
      const priceBookCounts = await this.db
        .select({
          total: sql<number>`count(*)`,
          active: sql<number>`sum(case when is_active = true then 1 else 0 end)`,
        })
        .from(priceBooks)
        .where(eq(priceBooks.tenantId, tenantId));

      // Active discount count
      const now = new Date();
      const discountCount = await this.db
        .select({ count: sql<number>`count(*)` })
        .from(discountRules)
        .where(
          and(
            eq(discountRules.tenantId, tenantId),
            eq(discountRules.isActive, true),
            lte(discountRules.validFrom, now),
            or(isNull(discountRules.validTo), gte(discountRules.validTo, now))
          )
        );

      // Low stock products
      const lowStockResult = await this.getLowStockProducts(tenantId);
      const inventoryAlerts = lowStockResult.isSuccess
        ? (lowStockResult.value ?? []).slice(0, 10).map((p) => ({
            productId: p.id,
            productName: p.name,
            currentStock: p.stockQuantity ?? 0,
            threshold: p.lowStockThreshold ?? 0,
          }))
        : [];

      return Result.ok({
        tenantId,
        totalProducts: Number(productCounts[0]?.total ?? 0),
        activeProducts: Number(productCounts[0]?.active ?? 0),
        draftProducts: Number(productCounts[0]?.draft ?? 0),
        outOfStockProducts: Number(productCounts[0]?.outOfStock ?? 0),
        lowStockProducts: Number(productCounts[0]?.lowStock ?? 0),
        totalCategories: Number(categoryCount[0]?.count ?? 0),
        totalPriceBooks: Number(priceBookCounts[0]?.total ?? 0),
        activePriceBooks: Number(priceBookCounts[0]?.active ?? 0),
        activeDiscounts: Number(discountCount[0]?.count ?? 0),
        topSellingProducts: [], // Would require order data integration
        lowPerformingProducts: [], // Would require analytics data
        inventoryAlerts,
      });
    } catch (error) {
      return Result.fail(`Failed to get catalog dashboard: ${error}`);
    }
  }

  /**
   * Record product analytics
   */
  async recordProductAnalytics(
    tenantId: string,
    productId: string,
    period: 'day' | 'week' | 'month' | 'quarter' | 'year',
    periodStart: Date,
    periodEnd: Date,
    metrics: {
      quantitySold: number;
      revenue: number;
      cost: number;
      orderCount: number;
      viewCount?: number;
      cartAdditions?: number;
    }
  ): Promise<Result<ProductAnalyticsRow>> {
    try {
      const profit = metrics.revenue - metrics.cost;
      const marginPercentage = metrics.revenue > 0 ? (profit / metrics.revenue) * 100 : 0;
      const averageOrderValue = metrics.orderCount > 0 ? Math.round(metrics.revenue / metrics.orderCount) : 0;
      const averageQuantityPerOrder = metrics.orderCount > 0 ? metrics.quantitySold / metrics.orderCount : 0;
      const conversionRate =
        metrics.viewCount && metrics.viewCount > 0 ? (metrics.orderCount / metrics.viewCount) * 100 : undefined;

      const [analytics] = await this.db
        .insert(productAnalytics)
        .values({
          id: uuidv4(),
          productId,
          tenantId,
          period,
          periodStart,
          periodEnd,
          quantitySold: metrics.quantitySold,
          revenue: metrics.revenue,
          cost: metrics.cost,
          profit,
          marginPercentage,
          orderCount: metrics.orderCount,
          averageOrderValue,
          averageQuantityPerOrder,
          conversionRate,
          viewCount: metrics.viewCount,
          cartAdditions: metrics.cartAdditions,
          createdAt: new Date(),
        })
        .returning();

      return Result.ok(analytics);
    } catch (error) {
      return Result.fail(`Failed to record product analytics: ${error}`);
    }
  }

  /**
   * Get product analytics
   */
  async getProductAnalytics(
    tenantId: string,
    productId: string,
    period: 'day' | 'week' | 'month' | 'quarter' | 'year',
    startDate: Date,
    endDate: Date
  ): Promise<Result<ProductAnalyticsRow[]>> {
    try {
      const analytics = await this.db
        .select()
        .from(productAnalytics)
        .where(
          and(
            eq(productAnalytics.tenantId, tenantId),
            eq(productAnalytics.productId, productId),
            eq(productAnalytics.period, period),
            gte(productAnalytics.periodStart, startDate),
            lte(productAnalytics.periodEnd, endDate)
          )
        )
        .orderBy(asc(productAnalytics.periodStart));

      return Result.ok(analytics);
    } catch (error) {
      return Result.fail(`Failed to get product analytics: ${error}`);
    }
  }
}
