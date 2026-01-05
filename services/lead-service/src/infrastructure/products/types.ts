/**
 * Product Catalog Management Types
 *
 * Comprehensive product management:
 * - Product catalog with hierarchies
 * - Price books and pricing tiers
 * - Discount rules and promotions
 * - Product bundles and kits
 * - Cross-sell and upsell relationships
 * - Inventory tracking
 * - Product variants
 */

/**
 * Product Status
 */
export type ProductStatus = 'draft' | 'active' | 'inactive' | 'discontinued' | 'archived';

/**
 * Product Type
 */
export type ProductType =
  | 'physical'      // Physical goods
  | 'digital'       // Digital products
  | 'service'       // Services
  | 'subscription'  // Recurring subscriptions
  | 'bundle'        // Product bundles
  | 'kit';          // Product kits

/**
 * Billing Frequency for subscriptions
 */
export type BillingFrequency =
  | 'one_time'
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'quarterly'
  | 'semi_annually'
  | 'annually'
  | 'custom';

/**
 * Discount Type
 */
export type DiscountType =
  | 'percentage'     // Percentage off
  | 'fixed_amount'   // Fixed amount off
  | 'buy_x_get_y'    // Buy X get Y free/discounted
  | 'tiered'         // Volume-based tiers
  | 'bundle';        // Bundle discount

/**
 * Price Calculation Method
 */
export type PriceCalculationMethod =
  | 'flat'           // Single flat price
  | 'per_unit'       // Price per unit
  | 'tiered'         // Different prices at quantity thresholds
  | 'volume'         // Single price based on total volume
  | 'graduated';     // Different prices for each tier

/**
 * Product Relationship Type
 */
export type ProductRelationType =
  | 'cross_sell'     // Related products to cross-sell
  | 'upsell'         // Higher-tier alternatives
  | 'substitute'     // Alternative products
  | 'accessory'      // Accessories/add-ons
  | 'required'       // Required companion products
  | 'optional';      // Optional companion products

/**
 * Product Category
 */
export interface ProductCategory {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  description?: string;
  parentId?: string;

  // Hierarchy
  level: number;
  path: string;           // Materialized path: /parent/child/grandchild

  // Display
  displayOrder: number;
  imageUrl?: string;
  isVisible: boolean;

  // Metadata
  metadata: Record<string, unknown>;

  // Audit
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

/**
 * Product
 */
export interface Product {
  id: string;
  tenantId: string;

  // Identification
  sku: string;
  name: string;
  slug: string;
  description?: string;
  shortDescription?: string;

  // Classification
  type: ProductType;
  status: ProductStatus;
  categoryId?: string;
  categoryPath?: string;
  tags: string[];

  // Pricing
  basePrice: number;
  currency: string;
  costPrice?: number;
  msrp?: number;              // Manufacturer suggested retail price

  // Subscription specific
  billingFrequency?: BillingFrequency;
  billingCycleCount?: number; // Number of cycles (0 = infinite)
  trialDays?: number;
  setupFee?: number;

  // Units
  unitOfMeasure: string;      // each, hour, lb, kg, etc.
  minimumQuantity?: number;
  maximumQuantity?: number;
  quantityIncrement?: number;

  // Tax
  taxable: boolean;
  taxCode?: string;
  taxRate?: number;

  // Inventory
  trackInventory: boolean;
  stockQuantity?: number;
  lowStockThreshold?: number;
  allowBackorder: boolean;

  // Physical product attributes
  weight?: number;
  weightUnit?: string;
  dimensions?: ProductDimensions;

  // Digital/Service attributes
  deliveryMethod?: string;
  downloadUrl?: string;
  licenseType?: string;

  // Media
  imageUrl?: string;
  images: string[];
  documents: ProductDocument[];

  // Features and specifications
  features: string[];
  specifications: Record<string, string>;

  // Variants
  hasVariants: boolean;
  variantAttributes?: string[];  // e.g., ['size', 'color']

  // Related products
  relatedProducts: ProductRelation[];

  // Custom fields
  customFields: Record<string, unknown>;

  // SEO
  metaTitle?: string;
  metaDescription?: string;

  // Flags
  isFeatured: boolean;
  isNew: boolean;

  // Audit
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  publishedAt?: Date;
}

/**
 * Product Dimensions
 */
export interface ProductDimensions {
  length: number;
  width: number;
  height: number;
  unit: string;  // cm, in, etc.
}

/**
 * Product Document
 */
export interface ProductDocument {
  id: string;
  name: string;
  type: 'datasheet' | 'manual' | 'brochure' | 'specification' | 'certificate' | 'other';
  url: string;
  size?: number;
  mimeType?: string;
}

/**
 * Product Relation
 */
export interface ProductRelation {
  productId: string;
  relationType: ProductRelationType;
  displayOrder: number;
}

/**
 * Product Variant
 */
export interface ProductVariant {
  id: string;
  productId: string;
  tenantId: string;

  // Identification
  sku: string;
  name: string;

  // Variant attributes
  attributes: Record<string, string>;  // e.g., { size: 'L', color: 'Blue' }

  // Pricing (overrides base product if set)
  price?: number;
  costPrice?: number;

  // Inventory
  stockQuantity?: number;
  lowStockThreshold?: number;

  // Physical attributes
  weight?: number;
  dimensions?: ProductDimensions;

  // Media
  imageUrl?: string;

  // Status
  isActive: boolean;

  // Audit
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Price Book
 */
export interface PriceBook {
  id: string;
  tenantId: string;

  name: string;
  description?: string;

  // Settings
  isStandard: boolean;        // Is this the default price book?
  isActive: boolean;

  // Currency
  currency: string;

  // Validity
  validFrom?: Date;
  validTo?: Date;

  // Applicability
  applicableTo: PriceBookApplicability;

  // Adjustment
  adjustmentType?: 'percentage' | 'fixed';
  adjustmentValue?: number;   // Bulk adjust all prices

  // Audit
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

/**
 * Price Book Applicability
 */
export interface PriceBookApplicability {
  allCustomers: boolean;
  customerIds?: string[];
  customerSegments?: string[];
  territories?: string[];
  channels?: string[];
}

/**
 * Price Book Entry
 */
export interface PriceBookEntry {
  id: string;
  priceBookId: string;
  productId: string;
  tenantId: string;

  // Pricing
  listPrice: number;
  minimumPrice?: number;      // Floor price
  maximumDiscount?: number;   // Max discount percentage

  // Method
  calculationMethod: PriceCalculationMethod;

  // Tiers (for tiered/volume/graduated pricing)
  priceTiers?: PriceTier[];

  // Status
  isActive: boolean;

  // Validity
  validFrom?: Date;
  validTo?: Date;

  // Audit
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Price Tier
 */
export interface PriceTier {
  minQuantity: number;
  maxQuantity?: number;
  price: number;
  discountPercentage?: number;
}

/**
 * Discount Rule
 */
export interface DiscountRule {
  id: string;
  tenantId: string;

  name: string;
  description?: string;
  code?: string;              // Promo code

  // Type and value
  discountType: DiscountType;
  discountValue: number;      // Percentage or fixed amount

  // For buy X get Y
  buyQuantity?: number;
  getQuantity?: number;
  getDiscountPercentage?: number;

  // For tiered discounts
  tiers?: DiscountTier[];

  // Applicability
  applicability: DiscountApplicability;

  // Limits
  maxUses?: number;
  usesPerCustomer?: number;
  currentUses: number;
  minOrderAmount?: number;
  maxDiscountAmount?: number;

  // Validity
  validFrom: Date;
  validTo?: Date;

  // Status
  isActive: boolean;
  requiresCode: boolean;
  stackable: boolean;         // Can combine with other discounts?
  priority: number;           // Order of application

  // Audit
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

/**
 * Discount Tier
 */
export interface DiscountTier {
  minQuantity: number;
  maxQuantity?: number;
  discountPercentage: number;
}

/**
 * Discount Applicability
 */
export interface DiscountApplicability {
  allProducts?: boolean;
  productIds?: string[];
  categoryIds?: string[];
  excludeProductIds?: string[];

  allCustomers?: boolean;
  customerIds?: string[];
  customerSegments?: string[];

  channels?: string[];        // web, api, pos, etc.
}

/**
 * Product Bundle
 */
export interface ProductBundle {
  id: string;
  productId: string;          // The bundle product
  tenantId: string;

  name: string;
  description?: string;

  // Bundle type
  bundleType: 'fixed' | 'configurable';

  // Items
  items: BundleItem[];

  // Pricing
  pricingType: 'fixed' | 'calculated' | 'discounted';
  fixedPrice?: number;
  discountPercentage?: number;

  // Settings
  minItems?: number;
  maxItems?: number;

  // Status
  isActive: boolean;

  // Audit
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Bundle Item
 */
export interface BundleItem {
  productId: string;
  variantId?: string;

  quantity: number;
  isRequired: boolean;

  // For configurable bundles
  minQuantity?: number;
  maxQuantity?: number;

  // Item-specific pricing
  priceOverride?: number;
  discountPercentage?: number;

  displayOrder: number;
}

/**
 * Product Usage Record (for metered billing)
 */
export interface ProductUsage {
  id: string;
  tenantId: string;

  productId: string;
  customerId: string;
  subscriptionId?: string;

  quantity: number;
  unitOfMeasure: string;

  usageDate: Date;
  billingPeriodStart: Date;
  billingPeriodEnd: Date;

  // Billing
  unitPrice: number;
  totalAmount: number;
  billed: boolean;
  billedAt?: Date;
  invoiceId?: string;

  // Metadata
  metadata: Record<string, unknown>;

  createdAt: Date;
}

/**
 * Quote Line Item
 */
export interface QuoteLineItem {
  id: string;
  quoteId: string;
  tenantId: string;

  // Product
  productId: string;
  variantId?: string;
  productName: string;
  productSku: string;
  description?: string;

  // Quantity and pricing
  quantity: number;
  unitPrice: number;
  listPrice: number;

  // Discounts
  discountType?: 'percentage' | 'fixed';
  discountValue?: number;
  discountAmount: number;

  // Totals
  subtotal: number;
  taxRate?: number;
  taxAmount: number;
  total: number;

  // Cost for margin calculation
  costPrice?: number;
  margin?: number;
  marginPercentage?: number;

  // Subscription
  billingFrequency?: BillingFrequency;

  // Display
  displayOrder: number;

  // Status
  isOptional: boolean;
  isSelected: boolean;

  // Metadata
  customFields: Record<string, unknown>;

  createdAt: Date;
  updatedAt: Date;
}

/**
 * Order Line Item
 */
export interface OrderLineItem {
  id: string;
  orderId: string;
  tenantId: string;

  // Product reference
  productId: string;
  variantId?: string;
  productName: string;
  productSku: string;
  description?: string;

  // Quantity
  quantity: number;
  quantityFulfilled: number;
  quantityCancelled: number;

  // Pricing (snapshot at time of order)
  unitPrice: number;
  listPrice: number;
  discountAmount: number;
  subtotal: number;
  taxAmount: number;
  total: number;

  // Cost
  costPrice?: number;

  // Subscription
  billingFrequency?: BillingFrequency;
  subscriptionId?: string;

  // Fulfillment
  fulfillmentStatus: 'pending' | 'partial' | 'fulfilled' | 'cancelled';

  // Display
  displayOrder: number;

  createdAt: Date;
  updatedAt: Date;
}

/**
 * Inventory Transaction
 */
export interface InventoryTransaction {
  id: string;
  tenantId: string;

  productId: string;
  variantId?: string;

  type: 'adjustment' | 'sale' | 'purchase' | 'return' | 'transfer' | 'reserve' | 'release';

  quantity: number;           // Positive for increase, negative for decrease
  previousQuantity: number;
  newQuantity: number;

  // Reference
  referenceType?: string;     // order, purchase_order, etc.
  referenceId?: string;

  reason?: string;
  notes?: string;

  // Location (for multi-warehouse)
  locationId?: string;

  performedBy: string;
  performedAt: Date;
}

/**
 * Product Search Filters
 */
export interface ProductSearchFilters {
  search?: string;
  categoryId?: string;
  categoryIds?: string[];
  type?: ProductType[];
  status?: ProductStatus[];
  tags?: string[];
  priceMin?: number;
  priceMax?: number;
  inStock?: boolean;
  isFeatured?: boolean;
  isNew?: boolean;
  hasVariants?: boolean;
}

/**
 * Product Analytics
 */
export interface ProductAnalytics {
  productId: string;
  tenantId: string;
  period: 'day' | 'week' | 'month' | 'quarter' | 'year';
  periodStart: Date;
  periodEnd: Date;

  // Sales metrics
  quantitySold: number;
  revenue: number;
  cost: number;
  profit: number;
  marginPercentage: number;

  // Order metrics
  orderCount: number;
  averageOrderValue: number;
  averageQuantityPerOrder: number;

  // Performance
  conversionRate?: number;
  viewCount?: number;
  cartAdditions?: number;

  // Comparison
  previousPeriodRevenue?: number;
  revenueGrowth?: number;
}

/**
 * Catalog Dashboard
 */
export interface CatalogDashboard {
  tenantId: string;

  // Summary
  totalProducts: number;
  activeProducts: number;
  draftProducts: number;
  outOfStockProducts: number;
  lowStockProducts: number;

  // Categories
  totalCategories: number;

  // Price books
  totalPriceBooks: number;
  activePriceBooks: number;

  // Discounts
  activeDiscounts: number;

  // Top performers
  topSellingProducts: {
    productId: string;
    productName: string;
    revenue: number;
    quantity: number;
  }[];

  // Low performers
  lowPerformingProducts: {
    productId: string;
    productName: string;
    revenue: number;
    daysSinceLastSale: number;
  }[];

  // Inventory alerts
  inventoryAlerts: {
    productId: string;
    productName: string;
    currentStock: number;
    threshold: number;
  }[];
}
