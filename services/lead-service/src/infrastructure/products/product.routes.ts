/**
 * Product Catalog API Routes
 *
 * RESTful endpoints for product management:
 * - Categories
 * - Products
 * - Variants
 * - Price Books
 * - Discounts
 * - Bundles
 * - Inventory
 * - Usage & Analytics
 */

import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { container } from 'tsyringe';
import { z } from 'zod';
import { ProductService } from './product.service';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const productTypeEnum = z.enum(['physical', 'digital', 'service', 'subscription', 'bundle', 'kit']);
const productStatusEnum = z.enum(['draft', 'active', 'inactive', 'discontinued', 'archived']);
const billingFrequencyEnum = z.enum([
  'one_time',
  'daily',
  'weekly',
  'monthly',
  'quarterly',
  'semi_annually',
  'annually',
  'custom',
]);
const discountTypeEnum = z.enum(['percentage', 'fixed_amount', 'buy_x_get_y', 'tiered', 'bundle']);
const priceCalculationMethodEnum = z.enum(['flat', 'per_unit', 'tiered', 'volume', 'graduated']);
const productRelationTypeEnum = z.enum(['cross_sell', 'upsell', 'substitute', 'accessory', 'required', 'optional']);
const inventoryTypeEnum = z.enum(['adjustment', 'sale', 'purchase', 'return', 'transfer', 'reserve', 'release']);
const analyticsPeriodEnum = z.enum(['day', 'week', 'month', 'quarter', 'year']);

// Category schemas
const createCategorySchema = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(255),
  description: z.string().optional(),
  parentId: z.string().uuid().optional(),
  displayOrder: z.number().int().optional(),
  imageUrl: z.string().url().optional(),
  isVisible: z.boolean().optional(),
  metadata: z.record(z.unknown()).optional(),
});

const updateCategorySchema = z.object({
  name: z.string().min(1).max(255).optional(),
  slug: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  displayOrder: z.number().int().optional(),
  imageUrl: z.string().url().optional(),
  isVisible: z.boolean().optional(),
  metadata: z.record(z.unknown()).optional(),
});

// Product schemas
const dimensionsSchema = z.object({
  length: z.number(),
  width: z.number(),
  height: z.number(),
  unit: z.string(),
});

const documentSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  url: z.string(),
});

const relatedProductSchema = z.object({
  productId: z.string().uuid(),
  relationType: productRelationTypeEnum,
  displayOrder: z.number().int(),
});

const createProductSchema = z.object({
  sku: z.string().min(1).max(100),
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(255),
  description: z.string().optional(),
  shortDescription: z.string().max(500).optional(),
  type: productTypeEnum,
  categoryId: z.string().uuid().optional(),
  tags: z.array(z.string()).optional(),
  basePrice: z.number().int().min(0),
  currency: z.string().length(3).optional(),
  costPrice: z.number().int().min(0).optional(),
  msrp: z.number().int().min(0).optional(),
  billingFrequency: billingFrequencyEnum.optional(),
  billingCycleCount: z.number().int().optional(),
  trialDays: z.number().int().optional(),
  setupFee: z.number().int().optional(),
  unitOfMeasure: z.string().optional(),
  minimumQuantity: z.number().int().optional(),
  maximumQuantity: z.number().int().optional(),
  quantityIncrement: z.number().int().optional(),
  taxable: z.boolean().optional(),
  taxCode: z.string().optional(),
  taxRate: z.number().optional(),
  trackInventory: z.boolean().optional(),
  stockQuantity: z.number().int().optional(),
  lowStockThreshold: z.number().int().optional(),
  allowBackorder: z.boolean().optional(),
  weight: z.number().optional(),
  weightUnit: z.string().optional(),
  dimensions: dimensionsSchema.optional(),
  deliveryMethod: z.string().optional(),
  downloadUrl: z.string().url().optional(),
  licenseType: z.string().optional(),
  imageUrl: z.string().url().optional(),
  images: z.array(z.string()).optional(),
  documents: z.array(documentSchema).optional(),
  features: z.array(z.string()).optional(),
  specifications: z.record(z.string()).optional(),
  hasVariants: z.boolean().optional(),
  variantAttributes: z.array(z.string()).optional(),
  relatedProducts: z.array(relatedProductSchema).optional(),
  customFields: z.record(z.unknown()).optional(),
  metaTitle: z.string().max(255).optional(),
  metaDescription: z.string().max(500).optional(),
  isFeatured: z.boolean().optional(),
  isNew: z.boolean().optional(),
});

const updateProductSchema = createProductSchema.partial().omit({ sku: true, type: true });

const searchProductsSchema = z.object({
  search: z.string().optional(),
  categoryId: z.string().uuid().optional(),
  categoryIds: z.array(z.string().uuid()).optional(),
  type: z.array(productTypeEnum).optional(),
  status: z.array(productStatusEnum).optional(),
  tags: z.array(z.string()).optional(),
  priceMin: z.number().int().optional(),
  priceMax: z.number().int().optional(),
  inStock: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  isNew: z.boolean().optional(),
  hasVariants: z.boolean().optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

// Variant schemas
const createVariantSchema = z.object({
  sku: z.string().min(1).max(100),
  name: z.string().min(1).max(255),
  attributes: z.record(z.string()),
  price: z.number().int().min(0).optional(),
  costPrice: z.number().int().min(0).optional(),
  stockQuantity: z.number().int().optional(),
  lowStockThreshold: z.number().int().optional(),
  weight: z.number().optional(),
  dimensions: dimensionsSchema.optional(),
  imageUrl: z.string().url().optional(),
});

const updateVariantSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  attributes: z.record(z.string()).optional(),
  price: z.number().int().min(0).optional(),
  costPrice: z.number().int().min(0).optional(),
  lowStockThreshold: z.number().int().optional(),
  weight: z.number().optional(),
  dimensions: dimensionsSchema.optional(),
  imageUrl: z.string().url().optional(),
  isActive: z.boolean().optional(),
});

// Price book schemas
const priceBookApplicabilitySchema = z.object({
  allCustomers: z.boolean().optional(),
  customerIds: z.array(z.string().uuid()).optional(),
  customerSegments: z.array(z.string()).optional(),
  territories: z.array(z.string()).optional(),
  channels: z.array(z.string()).optional(),
});

const createPriceBookSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  isStandard: z.boolean().optional(),
  currency: z.string().length(3).optional(),
  validFrom: z.string().datetime().optional(),
  validTo: z.string().datetime().optional(),
  applicableTo: priceBookApplicabilitySchema.optional(),
  adjustmentType: z.enum(['percentage', 'fixed']).optional(),
  adjustmentValue: z.number().optional(),
});

const priceTierSchema = z.object({
  minQuantity: z.number().int().min(1),
  maxQuantity: z.number().int().optional(),
  price: z.number().int().min(0),
  discountPercentage: z.number().optional(),
});

const addPriceBookEntrySchema = z.object({
  productId: z.string().uuid(),
  listPrice: z.number().int().min(0),
  minimumPrice: z.number().int().min(0).optional(),
  maximumDiscount: z.number().min(0).max(100).optional(),
  calculationMethod: priceCalculationMethodEnum.optional(),
  priceTiers: z.array(priceTierSchema).optional(),
  validFrom: z.string().datetime().optional(),
  validTo: z.string().datetime().optional(),
});

// Discount schemas
const discountApplicabilitySchema = z.object({
  allProducts: z.boolean().optional(),
  productIds: z.array(z.string().uuid()).optional(),
  categoryIds: z.array(z.string().uuid()).optional(),
  excludeProductIds: z.array(z.string().uuid()).optional(),
  allCustomers: z.boolean().optional(),
  customerIds: z.array(z.string().uuid()).optional(),
  customerSegments: z.array(z.string()).optional(),
  channels: z.array(z.string()).optional(),
});

const discountTierSchema = z.object({
  minQuantity: z.number().int().min(1),
  maxQuantity: z.number().int().optional(),
  discountPercentage: z.number().min(0).max(100),
});

const createDiscountRuleSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  code: z.string().max(50).optional(),
  discountType: discountTypeEnum,
  discountValue: z.number().min(0),
  buyQuantity: z.number().int().optional(),
  getQuantity: z.number().int().optional(),
  getDiscountPercentage: z.number().optional(),
  tiers: z.array(discountTierSchema).optional(),
  applicability: discountApplicabilitySchema.optional(),
  maxUses: z.number().int().optional(),
  usesPerCustomer: z.number().int().optional(),
  minOrderAmount: z.number().int().optional(),
  maxDiscountAmount: z.number().int().optional(),
  validFrom: z.string().datetime(),
  validTo: z.string().datetime().optional(),
  requiresCode: z.boolean().optional(),
  stackable: z.boolean().optional(),
  priority: z.number().int().optional(),
});

// Bundle schemas
const bundleItemSchema = z.object({
  productId: z.string().uuid(),
  variantId: z.string().uuid().optional(),
  quantity: z.number().int().min(1),
  isRequired: z.boolean(),
  minQuantity: z.number().int().optional(),
  maxQuantity: z.number().int().optional(),
  priceOverride: z.number().int().optional(),
  discountPercentage: z.number().optional(),
  displayOrder: z.number().int(),
});

const createBundleSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  bundleType: z.enum(['fixed', 'configurable']),
  items: z.array(bundleItemSchema).min(1),
  pricingType: z.enum(['fixed', 'calculated', 'discounted']),
  fixedPrice: z.number().int().optional(),
  discountPercentage: z.number().optional(),
  minItems: z.number().int().optional(),
  maxItems: z.number().int().optional(),
});

// Inventory schemas
const adjustInventorySchema = z.object({
  productId: z.string().uuid(),
  variantId: z.string().uuid().optional(),
  quantity: z.number().int(),
  type: inventoryTypeEnum,
  referenceType: z.string().optional(),
  referenceId: z.string().uuid().optional(),
  reason: z.string().max(255).optional(),
  notes: z.string().optional(),
  locationId: z.string().uuid().optional(),
});

// Usage schemas
const recordUsageSchema = z.object({
  productId: z.string().uuid(),
  customerId: z.string().uuid(),
  subscriptionId: z.string().uuid().optional(),
  quantity: z.number().min(0),
  unitOfMeasure: z.string(),
  usageDate: z.string().datetime(),
  billingPeriodStart: z.string().datetime(),
  billingPeriodEnd: z.string().datetime(),
  unitPrice: z.number().int().min(0),
  metadata: z.record(z.unknown()).optional(),
});

// ============================================================================
// ROUTES
// ============================================================================

export async function productRoutes(fastify: FastifyInstance, _options: FastifyPluginOptions): Promise<void> {
  const productService = container.resolve(ProductService);

  // Helper to get tenant and user from request
  const getContext = (request: any) => ({
    tenantId: request.headers['x-tenant-id'] as string || 'default-tenant',
    userId: request.headers['x-user-id'] as string || 'system',
  });

  // ============================================================================
  // CATEGORY ENDPOINTS
  // ============================================================================

  // Create category
  fastify.post('/categories', async (request, reply) => {
    const { tenantId, userId } = getContext(request);
    const input = createCategorySchema.parse(request.body);

    const result = await productService.createCategory(tenantId, userId, input);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.status(201).send(result.value);
  });

  // Get category by ID
  fastify.get('/categories/:categoryId', async (request, reply) => {
    const { tenantId } = getContext(request);
    const { categoryId } = request.params as { categoryId: string };

    const result = await productService.getCategoryById(tenantId, categoryId);

    if (result.isFailure) {
      return reply.status(500).send({ error: result.error });
    }

    if (!result.value) {
      return reply.status(404).send({ error: 'Category not found' });
    }

    return result.value;
  });

  // Get category tree
  fastify.get('/categories', async (request, reply) => {
    const { tenantId } = getContext(request);
    const { parentId } = request.query as { parentId?: string };

    const result = await productService.getCategoryTree(tenantId, parentId);

    if (result.isFailure) {
      return reply.status(500).send({ error: result.error });
    }

    return result.value;
  });

  // Update category
  fastify.patch('/categories/:categoryId', async (request, reply) => {
    const { tenantId } = getContext(request);
    const { categoryId } = request.params as { categoryId: string };
    const updates = updateCategorySchema.parse(request.body);

    const result = await productService.updateCategory(tenantId, categoryId, updates);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return result.value;
  });

  // Delete category
  fastify.delete('/categories/:categoryId', async (request, reply) => {
    const { tenantId } = getContext(request);
    const { categoryId } = request.params as { categoryId: string };

    const result = await productService.deleteCategory(tenantId, categoryId);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.status(204).send();
  });

  // ============================================================================
  // PRODUCT ENDPOINTS
  // ============================================================================

  // Create product
  fastify.post('/', async (request, reply) => {
    const { tenantId, userId } = getContext(request);
    const input = createProductSchema.parse(request.body);

    const result = await productService.createProduct(tenantId, userId, input);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.status(201).send(result.value);
  });

  // Get product by ID
  fastify.get('/:productId', async (request, reply) => {
    const { tenantId } = getContext(request);
    const { productId } = request.params as { productId: string };

    const result = await productService.getProductById(tenantId, productId);

    if (result.isFailure) {
      return reply.status(500).send({ error: result.error });
    }

    if (!result.value) {
      return reply.status(404).send({ error: 'Product not found' });
    }

    return result.value;
  });

  // Get product by SKU
  fastify.get('/sku/:sku', async (request, reply) => {
    const { tenantId } = getContext(request);
    const { sku } = request.params as { sku: string };

    const result = await productService.getProductBySku(tenantId, sku);

    if (result.isFailure) {
      return reply.status(500).send({ error: result.error });
    }

    if (!result.value) {
      return reply.status(404).send({ error: 'Product not found' });
    }

    return result.value;
  });

  // Search products
  fastify.get('/', async (request, reply) => {
    const { tenantId } = getContext(request);
    const filters = searchProductsSchema.parse(request.query);
    const { page, limit, ...searchFilters } = filters;

    const result = await productService.searchProducts(tenantId, searchFilters, { page, limit });

    if (result.isFailure) {
      return reply.status(500).send({ error: result.error });
    }

    return result.value;
  });

  // Update product
  fastify.patch('/:productId', async (request, reply) => {
    const { tenantId } = getContext(request);
    const { productId } = request.params as { productId: string };
    const updates = updateProductSchema.parse(request.body);

    const result = await productService.updateProduct(tenantId, productId, updates);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return result.value;
  });

  // Update product status
  fastify.patch('/:productId/status', async (request, reply) => {
    const { tenantId } = getContext(request);
    const { productId } = request.params as { productId: string };
    const { status } = z.object({ status: productStatusEnum }).parse(request.body);

    const result = await productService.updateProductStatus(tenantId, productId, status);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return result.value;
  });

  // Delete product
  fastify.delete('/:productId', async (request, reply) => {
    const { tenantId } = getContext(request);
    const { productId } = request.params as { productId: string };

    const result = await productService.deleteProduct(tenantId, productId);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.status(204).send();
  });

  // Get product price
  fastify.get('/:productId/price', async (request, reply) => {
    const { tenantId } = getContext(request);
    const { productId } = request.params as { productId: string };
    const { customerId, priceBookId, quantity } = request.query as {
      customerId?: string;
      priceBookId?: string;
      quantity?: string;
    };

    const result = await productService.getProductPrice(tenantId, productId, {
      customerId,
      priceBookId,
      quantity: quantity ? parseInt(quantity, 10) : undefined,
    });

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return result.value;
  });

  // ============================================================================
  // VARIANT ENDPOINTS
  // ============================================================================

  // Create variant
  fastify.post('/:productId/variants', async (request, reply) => {
    const { tenantId } = getContext(request);
    const { productId } = request.params as { productId: string };
    const input = createVariantSchema.parse(request.body);

    const result = await productService.createVariant(tenantId, productId, input);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.status(201).send(result.value);
  });

  // Get product variants
  fastify.get('/:productId/variants', async (request, reply) => {
    const { tenantId } = getContext(request);
    const { productId } = request.params as { productId: string };

    const result = await productService.getProductVariants(tenantId, productId);

    if (result.isFailure) {
      return reply.status(500).send({ error: result.error });
    }

    return result.value;
  });

  // Update variant
  fastify.patch('/variants/:variantId', async (request, reply) => {
    const { tenantId } = getContext(request);
    const { variantId } = request.params as { variantId: string };
    const updates = updateVariantSchema.parse(request.body);

    const result = await productService.updateVariant(tenantId, variantId, updates);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return result.value;
  });

  // Delete variant
  fastify.delete('/variants/:variantId', async (request, reply) => {
    const { tenantId } = getContext(request);
    const { variantId } = request.params as { variantId: string };

    const result = await productService.deleteVariant(tenantId, variantId);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.status(204).send();
  });

  // ============================================================================
  // PRICE BOOK ENDPOINTS
  // ============================================================================

  // Create price book
  fastify.post('/price-books', async (request, reply) => {
    const { tenantId, userId } = getContext(request);
    const input = createPriceBookSchema.parse(request.body);

    const result = await productService.createPriceBook(tenantId, userId, {
      ...input,
      validFrom: input.validFrom ? new Date(input.validFrom) : undefined,
      validTo: input.validTo ? new Date(input.validTo) : undefined,
    });

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.status(201).send(result.value);
  });

  // Get price books
  fastify.get('/price-books', async (request, reply) => {
    const { tenantId } = getContext(request);
    const { activeOnly } = request.query as { activeOnly?: string };

    const result = await productService.getPriceBooks(tenantId, {
      activeOnly: activeOnly === 'true',
    });

    if (result.isFailure) {
      return reply.status(500).send({ error: result.error });
    }

    return result.value;
  });

  // Add price book entry
  fastify.post('/price-books/:priceBookId/entries', async (request, reply) => {
    const { tenantId } = getContext(request);
    const { priceBookId } = request.params as { priceBookId: string };
    const input = addPriceBookEntrySchema.parse(request.body);

    const result = await productService.addPriceBookEntry(tenantId, priceBookId, {
      ...input,
      validFrom: input.validFrom ? new Date(input.validFrom) : undefined,
      validTo: input.validTo ? new Date(input.validTo) : undefined,
    });

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.status(201).send(result.value);
  });

  // ============================================================================
  // DISCOUNT ENDPOINTS
  // ============================================================================

  // Create discount rule
  fastify.post('/discounts', async (request, reply) => {
    const { tenantId, userId } = getContext(request);
    const input = createDiscountRuleSchema.parse(request.body);

    const result = await productService.createDiscountRule(tenantId, userId, {
      ...input,
      validFrom: new Date(input.validFrom),
      validTo: input.validTo ? new Date(input.validTo) : undefined,
    });

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.status(201).send(result.value);
  });

  // Get active discount rules
  fastify.get('/discounts', async (request, reply) => {
    const { tenantId } = getContext(request);

    const result = await productService.getActiveDiscountRules(tenantId);

    if (result.isFailure) {
      return reply.status(500).send({ error: result.error });
    }

    return result.value;
  });

  // Validate discount code
  fastify.post('/discounts/validate', async (request, reply) => {
    const { tenantId } = getContext(request);
    const { code, customerId } = z
      .object({
        code: z.string(),
        customerId: z.string().uuid().optional(),
      })
      .parse(request.body);

    const result = await productService.validateDiscountCode(tenantId, code, customerId);

    if (result.isFailure) {
      return reply.status(500).send({ error: result.error });
    }

    if (!result.value) {
      return reply.status(404).send({ valid: false, error: 'Invalid or expired discount code' });
    }

    return { valid: true, discount: result.value };
  });

  // ============================================================================
  // BUNDLE ENDPOINTS
  // ============================================================================

  // Create bundle
  fastify.post('/:productId/bundle', async (request, reply) => {
    const { tenantId } = getContext(request);
    const { productId } = request.params as { productId: string };
    const input = createBundleSchema.parse(request.body);

    const result = await productService.createBundle(tenantId, productId, input);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.status(201).send(result.value);
  });

  // Get bundle by product ID
  fastify.get('/:productId/bundle', async (request, reply) => {
    const { tenantId } = getContext(request);
    const { productId } = request.params as { productId: string };

    const result = await productService.getBundleByProductId(tenantId, productId);

    if (result.isFailure) {
      return reply.status(500).send({ error: result.error });
    }

    if (!result.value) {
      return reply.status(404).send({ error: 'Bundle not found' });
    }

    return result.value;
  });

  // Calculate bundle price
  fastify.post('/bundles/:bundleId/calculate', async (request, reply) => {
    const { tenantId } = getContext(request);
    const { bundleId } = request.params as { bundleId: string };
    const { items } = z
      .object({
        items: z
          .array(
            z.object({
              productId: z.string().uuid(),
              quantity: z.number().int().min(1),
            })
          )
          .optional(),
      })
      .parse(request.body);

    const result = await productService.calculateBundlePrice(tenantId, bundleId, items);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return result.value;
  });

  // ============================================================================
  // INVENTORY ENDPOINTS
  // ============================================================================

  // Adjust inventory
  fastify.post('/inventory/adjust', async (request, reply) => {
    const { tenantId, userId } = getContext(request);
    const input = adjustInventorySchema.parse(request.body);

    const result = await productService.adjustInventory(tenantId, userId, input);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.status(201).send(result.value);
  });

  // Get inventory transactions
  fastify.get('/:productId/inventory', async (request, reply) => {
    const { tenantId } = getContext(request);
    const { productId } = request.params as { productId: string };
    const { variantId, limit } = request.query as { variantId?: string; limit?: string };

    const result = await productService.getInventoryTransactions(tenantId, productId, {
      variantId,
      limit: limit ? parseInt(limit, 10) : undefined,
    });

    if (result.isFailure) {
      return reply.status(500).send({ error: result.error });
    }

    return result.value;
  });

  // Get low stock products
  fastify.get('/inventory/low-stock', async (request, reply) => {
    const { tenantId } = getContext(request);

    const result = await productService.getLowStockProducts(tenantId);

    if (result.isFailure) {
      return reply.status(500).send({ error: result.error });
    }

    return result.value;
  });

  // ============================================================================
  // USAGE ENDPOINTS (METERED BILLING)
  // ============================================================================

  // Record usage
  fastify.post('/usage', async (request, reply) => {
    const { tenantId } = getContext(request);
    const input = recordUsageSchema.parse(request.body);

    const result = await productService.recordUsage(tenantId, {
      ...input,
      usageDate: new Date(input.usageDate),
      billingPeriodStart: new Date(input.billingPeriodStart),
      billingPeriodEnd: new Date(input.billingPeriodEnd),
    });

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.status(201).send(result.value);
  });

  // Get unbilled usage
  fastify.get('/usage/unbilled/:customerId', async (request, reply) => {
    const { tenantId } = getContext(request);
    const { customerId } = request.params as { customerId: string };
    const { billingPeriodEnd } = z
      .object({ billingPeriodEnd: z.string().datetime() })
      .parse(request.query);

    const result = await productService.getUnbilledUsage(tenantId, customerId, new Date(billingPeriodEnd));

    if (result.isFailure) {
      return reply.status(500).send({ error: result.error });
    }

    return result.value;
  });

  // Mark usage as billed
  fastify.post('/usage/mark-billed', async (request, reply) => {
    const { tenantId } = getContext(request);
    const { usageIds, invoiceId } = z
      .object({
        usageIds: z.array(z.string().uuid()),
        invoiceId: z.string().uuid(),
      })
      .parse(request.body);

    const result = await productService.markUsageAsBilled(tenantId, usageIds, invoiceId);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return { success: true };
  });

  // ============================================================================
  // ANALYTICS ENDPOINTS
  // ============================================================================

  // Get catalog dashboard
  fastify.get('/dashboard', async (request, reply) => {
    const { tenantId } = getContext(request);

    const result = await productService.getCatalogDashboard(tenantId);

    if (result.isFailure) {
      return reply.status(500).send({ error: result.error });
    }

    return result.value;
  });

  // Get product analytics
  fastify.get('/:productId/analytics', async (request, reply) => {
    const { tenantId } = getContext(request);
    const { productId } = request.params as { productId: string };
    const { period, startDate, endDate } = z
      .object({
        period: analyticsPeriodEnum,
        startDate: z.string().datetime(),
        endDate: z.string().datetime(),
      })
      .parse(request.query);

    const result = await productService.getProductAnalytics(
      tenantId,
      productId,
      period,
      new Date(startDate),
      new Date(endDate)
    );

    if (result.isFailure) {
      return reply.status(500).send({ error: result.error });
    }

    return result.value;
  });

  // Record product analytics (typically called by background jobs)
  fastify.post('/:productId/analytics', async (request, reply) => {
    const { tenantId } = getContext(request);
    const { productId } = request.params as { productId: string };
    const input = z
      .object({
        period: analyticsPeriodEnum,
        periodStart: z.string().datetime(),
        periodEnd: z.string().datetime(),
        quantitySold: z.number().int().min(0),
        revenue: z.number().int().min(0),
        cost: z.number().int().min(0),
        orderCount: z.number().int().min(0),
        viewCount: z.number().int().optional(),
        cartAdditions: z.number().int().optional(),
      })
      .parse(request.body);

    const result = await productService.recordProductAnalytics(
      tenantId,
      productId,
      input.period,
      new Date(input.periodStart),
      new Date(input.periodEnd),
      {
        quantitySold: input.quantitySold,
        revenue: input.revenue,
        cost: input.cost,
        orderCount: input.orderCount,
        viewCount: input.viewCount,
        cartAdditions: input.cartAdditions,
      }
    );

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.status(201).send(result.value);
  });
}
