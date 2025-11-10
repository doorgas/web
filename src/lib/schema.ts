import { relations, sql } from 'drizzle-orm';
import {
  mysqlTable,
  varchar,
  datetime,
  text,
  primaryKey,
  boolean,
  int,
  decimal,
  json,
} from 'drizzle-orm/mysql-core';

// ✅ User table (customers)
export const user = mysqlTable('user', {
  id: varchar('id', { length: 255 }).primaryKey(),
  name: varchar('name', { length: 255 }),
  firstName: varchar('first_name', { length: 100 }),
  lastName: varchar('last_name', { length: 100 }),
  email: varchar('email', { length: 255 }).notNull().unique(),
  emailVerified: datetime('emailVerified'),
  image: text('image'),
  profilePicture: varchar("profile_picture", { length: 255 }),
  username: varchar("username", { length: 100 }),
  displayName: varchar("display_name", { length: 100 }),
  phone: varchar("phone", { length: 20 }),
  country: varchar("country", { length: 100 }),
  city: varchar("city", { length: 100 }),
  address: varchar("address", { length: 255 }),
  state: varchar("state", { length: 100 }),
  postalCode: varchar("postal_code", { length: 20 }),
  latitude: decimal("latitude", { precision: 10, scale: 8 }),
  longitude: decimal("longitude", { precision: 11, scale: 8 }),
  userType: varchar("user_type", { length: 20 }).default("customer"), // customer, driver, admin
  status: varchar("status", { length: 20 }).default("pending"), // pending, approved, suspended
  newsletter: boolean("newsletter").default(false),
  dateOfBirth: datetime("date_of_birth"),
  otp: varchar("otp", { length: 6 }),
  otpExpiry: datetime("otp_expiry"),
  // Notification preferences
  notifyOrderUpdates: boolean("notify_order_updates").default(true),
  notifyPromotions: boolean("notify_promotions").default(false),
  notifyDriverMessages: boolean("notify_driver_messages").default(true),
  note: text("note"), // Additional user note field
  createdAt: datetime("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: datetime("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

// ✅ Accounts table (OAuth support: Google, Facebook)
export const account = mysqlTable(
  'account',
  {
    userId: varchar('userId', { length: 255 }).notNull(),
    type: varchar('type', { length: 255 }).notNull(),
    provider: varchar('provider', { length: 255 }).notNull(),
    providerAccountId: varchar('providerAccountId', { length: 255 }).notNull(),
    refresh_token: text('refresh_token'),
    access_token: text('access_token'),
    expires_at: datetime('expires_at'),
    token_type: varchar('token_type', { length: 255 }),
    scope: varchar('scope', { length: 255 }),
    id_token: text('id_token'),
    session_state: varchar('session_state', { length: 255 }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.provider, table.providerAccountId] }),
  })
);

// ✅ Sessions table
export const sessions = mysqlTable('sessions', {
  sessionToken: varchar('sessionToken', { length: 255 }).primaryKey(),
  userId: varchar('userId', { length: 255 }).notNull(),
  expires: datetime('expires').notNull(),
});

// ✅ Verification tokens
export const verification_tokens = mysqlTable(
  'verification_tokens',
  {
    identifier: varchar('identifier', { length: 255 }).notNull(),
    token: varchar('token', { length: 255 }).notNull(),
    otp: varchar('otp', { length: 255 }).notNull(),
    expires: datetime('expires').notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.identifier, table.token, table.otp] }),
  })
);

// Global Magic Link Settings
export const globalMagicLink = mysqlTable("global_magic_link", {
  id: varchar("id", { length: 255 }).primaryKey(),
  token: varchar("token", { length: 255 }).notNull().unique(),
  isEnabled: boolean("is_enabled").default(true),
  description: text("description"),
  createdBy: varchar("created_by", { length: 255 }),
  createdAt: datetime("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: datetime("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

// Magic Link Usage Tracking
export const magicLinkUsage = mysqlTable("magic_link_usage", {
  id: varchar("id", { length: 255 }).primaryKey(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  magicLinkId: varchar("magic_link_id", { length: 255 }).notNull(),
  usedAt: datetime("used_at").default(sql`CURRENT_TIMESTAMP`),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
});

// Product Categories
export const categories = mysqlTable("categories", {
  id: varchar("id", { length: 255 }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  description: text("description"),
  image: varchar("image", { length: 500 }),
  icon: varchar("icon", { length: 500 }), // For uploaded category icon files
  iconName: varchar("icon_name", { length: 100 }), // For category icons (e.g., FontAwesome icon names)
  isFeatured: boolean("is_featured").default(false), // For featured categories
  parentId: varchar("parent_id", { length: 255 }), // For hierarchical categories
  sortOrder: int("sort_order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: datetime("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: datetime("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

// Product Subcategories
export const subcategories = mysqlTable("subcategories", {
  id: varchar("id", { length: 255 }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  description: text("description"),
  image: varchar("image", { length: 500 }),
  categoryId: varchar("category_id", { length: 255 }).notNull(),
  sortOrder: int("sort_order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: datetime("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: datetime("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

// Products
export const products = mysqlTable("products", {
  id: varchar("id", { length: 255 }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  description: text("description"),
  shortDescription: text("short_description"),
  sku: varchar("sku", { length: 100 }).unique(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  comparePrice: decimal("compare_price", { precision: 10, scale: 2 }),
  costPrice: decimal("cost_price", { precision: 10, scale: 2 }),
  images: json("images"), // Array of image URLs
  banner: varchar("banner", { length: 500 }), // Banner image URL
  categoryId: varchar("category_id", { length: 255 }),
  subcategoryId: varchar("subcategory_id", { length: 255 }),
  tags: json("tags"), // Array of tags
  weight: decimal("weight", { precision: 8, scale: 2 }),
  dimensions: json("dimensions"), // {length, width, height}
  isFeatured: boolean("is_featured").default(false),
  isActive: boolean("is_active").default(true),
  isDigital: boolean("is_digital").default(false),
  requiresShipping: boolean("requires_shipping").default(true),
  taxable: boolean("taxable").default(true),
  outOfStock: boolean("out_of_stock").default(false),
  metaTitle: varchar("meta_title", { length: 255 }),
  metaDescription: text("meta_description"),

  
  // Variable Product Fields
  productType: varchar("product_type", { length: 50 }).default("simple"), // 'simple' or 'variable'
  variationAttributes: json("variation_attributes"), // Array of {name: string, values: string[]}
  
  // Stock Management Fields
  stockManagementType: varchar("stock_management_type", { length: 20 }).default("quantity"), // 'quantity' or 'weight'
  pricePerUnit: decimal("price_per_unit", { precision: 10, scale: 2 }), // Price per gram for weight-based products
  baseWeightUnit: varchar("base_weight_unit", { length: 10 }).default("grams"), // 'grams' or 'kg'
  
  // Cannabis-specific fields
  thc: decimal("thc", { precision: 5, scale: 2 }), // THC percentage (0.00 - 100.00)
  cbd: decimal("cbd", { precision: 5, scale: 2 }), // CBD percentage (0.00 - 100.00)
  difficulty: varchar("difficulty", { length: 50 }), // Growing difficulty level
  floweringTime: varchar("flowering_time", { length: 100 }), // Time to flower
  yieldAmount: varchar("yield_amount", { length: 100 }), // Expected yield
  
  createdAt: datetime("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: datetime("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

// Product Variants (Size, Color, etc.)
export const productVariants = mysqlTable("product_variants", {
  id: varchar("id", { length: 255 }).primaryKey(),
  productId: varchar("product_id", { length: 255 }).notNull(),
  sku: varchar("sku", { length: 100 }).unique(),
  title: varchar("title", { length: 255 }).notNull(), // e.g., "Red / Large"
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  comparePrice: decimal("compare_price", { precision: 10, scale: 2 }),
  costPrice: decimal("cost_price", { precision: 10, scale: 2 }),
  weight: decimal("weight", { precision: 8, scale: 2 }),
  image: varchar("image", { length: 500 }),
  position: int("position").default(0),
  inventoryQuantity: int("inventory_quantity").default(0),
  inventoryManagement: boolean("inventory_management").default(true),
  allowBackorder: boolean("allow_backorder").default(false),
  variantOptions: json("variant_options"), // {color: "Red", size: "Large"}
  isActive: boolean("is_active").default(true),
  outOfStock: boolean("out_of_stock").default(false),
  createdAt: datetime("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: datetime("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

// Variation Attributes (Color, Size, Material, etc.)
export const variationAttributes = mysqlTable("variation_attributes", {
  id: varchar("id", { length: 255 }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull().unique(), // Color, Size, Material
  slug: varchar("slug", { length: 255 }).notNull().unique(), // color, size, material
  description: text("description"),
  type: varchar("type", { length: 50 }).default("select"), // select, color, image, button
  isActive: boolean("is_active").default(true),
  sortOrder: int("sort_order").default(0),
  createdAt: datetime("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: datetime("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

// Variation Attribute Values (Red, Blue, Green for Color; S, M, L for Size)
export const variationAttributeValues = mysqlTable("variation_attribute_values", {
  id: varchar("id", { length: 255 }).primaryKey(),
  attributeId: varchar("attribute_id", { length: 255 }).notNull(),
  value: varchar("value", { length: 255 }).notNull(), // Red, Blue, Small, Large
  slug: varchar("slug", { length: 255 }).notNull(), // red, blue, small, large
  colorCode: varchar("color_code", { length: 7 }), // #FF0000 for color attributes
  image: varchar("image", { length: 500 }), // Optional image for the value
  description: text("description"),
  isActive: boolean("is_active").default(true),
  sortOrder: int("sort_order").default(0),
  createdAt: datetime("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: datetime("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

// Addon Groups (for organizing addons)
export const addonGroups = mysqlTable("addon_groups", {
  id: varchar("id", { length: 255 }).primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  sortOrder: int("sort_order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: datetime("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: datetime("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

// Addons (for group products)
export const addons = mysqlTable("addons", {
  id: varchar("id", { length: 255 }).primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  description: text("description"),
  image: varchar("image", { length: 500 }),
  groupId: varchar("group_id", { length: 255 }), // Reference to addon_groups
  isActive: boolean("is_active").default(true),
  sortOrder: int("sort_order").default(0),
  createdAt: datetime("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: datetime("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

// Product Addons (junction table for group products)
export const productAddons = mysqlTable("product_addons", {
  id: varchar("id", { length: 255 }).primaryKey(),
  productId: varchar("product_id", { length: 255 }).notNull(),
  addonId: varchar("addon_id", { length: 255 }).notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(), // Override price for this product
  isRequired: boolean("is_required").default(false),
  sortOrder: int("sort_order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: datetime("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: datetime("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

// Product Inventory
export const productInventory = mysqlTable("product_inventory", {
  id: varchar("id", { length: 255 }).primaryKey(),
  productId: varchar("product_id", { length: 255 }),
  variantId: varchar("variant_id", { length: 255 }),
  
  // Quantity-based inventory fields
  quantity: int("quantity").notNull().default(0),
  reservedQuantity: int("reserved_quantity").default(0),
  availableQuantity: int("available_quantity").default(0),
  reorderPoint: int("reorder_point").default(0),
  reorderQuantity: int("reorder_quantity").default(0),
  
  // Weight-based inventory fields (stored in grams for consistency)
  weightQuantity: decimal("weight_quantity", { precision: 12, scale: 2 }).default('0.00'), // Total weight in grams
  reservedWeight: decimal("reserved_weight", { precision: 12, scale: 2 }).default('0.00'), // Reserved weight in grams
  availableWeight: decimal("available_weight", { precision: 12, scale: 2 }).default('0.00'), // Available weight in grams
  reorderWeightPoint: decimal("reorder_weight_point", { precision: 12, scale: 2 }).default('0.00'), // Reorder point in grams
  reorderWeightQuantity: decimal("reorder_weight_quantity", { precision: 12, scale: 2 }).default('0.00'), // Reorder quantity in grams
  
  location: varchar("location", { length: 255 }),
  supplier: varchar("supplier", { length: 255 }),
  lastRestockDate: datetime("last_restock_date"),
  createdAt: datetime("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: datetime("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

// Stock Movements (Audit trail for all inventory changes)
export const stockMovements = mysqlTable("stock_movements", {
  id: varchar("id", { length: 255 }).primaryKey(),
  inventoryId: varchar("inventory_id", { length: 255 }).notNull(),
  productId: varchar("product_id", { length: 255 }).notNull(),
  variantId: varchar("variant_id", { length: 255 }),
  movementType: varchar("movement_type", { length: 50 }).notNull(), // 'in', 'out', 'adjustment'
  
  // Quantity-based movement fields
  quantity: int("quantity").notNull().default(0),
  previousQuantity: int("previous_quantity").notNull().default(0),
  newQuantity: int("new_quantity").notNull().default(0),
  
  // Weight-based movement fields (stored in grams)
  weightQuantity: decimal("weight_quantity", { precision: 12, scale: 2 }).default('0.00'), // Weight moved in grams
  previousWeightQuantity: decimal("previous_weight_quantity", { precision: 12, scale: 2 }).default('0.00'), // Previous weight in grams
  newWeightQuantity: decimal("new_weight_quantity", { precision: 12, scale: 2 }).default('0.00'), // New weight in grams
  
  reason: varchar("reason", { length: 255 }).notNull(),
  location: varchar("location", { length: 255 }),
  reference: varchar("reference", { length: 255 }), // PO number, invoice, etc.
  notes: text("notes"),
  costPrice: decimal("cost_price", { precision: 10, scale: 2 }),
  supplier: varchar("supplier", { length: 255 }),
  processedBy: varchar("processed_by", { length: 255 }), // Admin user who made the change
  createdAt: datetime("created_at").default(sql`CURRENT_TIMESTAMP`),
});

// Orders
export const orders = mysqlTable("orders", {
  id: varchar("id", { length: 255 }).primaryKey(),
  orderNumber: varchar("order_number", { length: 100 }).notNull().unique(),
  userId: varchar("user_id", { length: 255 }),
  email: varchar("email", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 20 }),
  status: varchar("status", { length: 50 }).notNull().default("pending"), // pending, confirmed, processing, shipped, delivered, cancelled
  paymentStatus: varchar("payment_status", { length: 50 }).default("pending"), // pending, paid, failed, refunded
  fulfillmentStatus: varchar("fulfillment_status", { length: 50 }).default("pending"), // pending, fulfilled, partially_fulfilled
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  taxAmount: decimal("tax_amount", { precision: 10, scale: 2 }).default('0.00'),
  shippingAmount: decimal("shipping_amount", { precision: 10, scale: 2 }).default('0.00'),
  discountAmount: decimal("discount_amount", { precision: 10, scale: 2 }).default('0.00'),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).default("USD"),
  
  deliveryTime: varchar("delivery_time", { length: 255 }),
  // Billing Address
  billingFirstName: varchar("billing_first_name", { length: 100 }),
  billingLastName: varchar("billing_last_name", { length: 100 }),
  billingAddress1: varchar("billing_address1", { length: 255 }),
  billingAddress2: varchar("billing_address2", { length: 255 }),
  billingCity: varchar("billing_city", { length: 100 }),
  billingState: varchar("billing_state", { length: 100 }),
  billingPostalCode: varchar("billing_postal_code", { length: 20 }),
  billingCountry: varchar("billing_country", { length: 100 }),
  
  // Shipping Address
  shippingFirstName: varchar("shipping_first_name", { length: 100 }),
  shippingLastName: varchar("shipping_last_name", { length: 100 }),
  shippingAddress1: varchar("shipping_address1", { length: 255 }),
  shippingAddress2: varchar("shipping_address2", { length: 255 }),
  shippingCity: varchar("shipping_city", { length: 100 }),
  shippingState: varchar("shipping_state", { length: 100 }),
  shippingPostalCode: varchar("shipping_postal_code", { length: 20 }),
  shippingCountry: varchar("shipping_country", { length: 100 }),
  shippingLatitude: decimal("shipping_latitude", { precision: 10, scale: 8 }),
  shippingLongitude: decimal("shipping_longitude", { precision: 11, scale: 8 }),
  
  shippingMethod: varchar("shipping_method", { length: 100 }),
  trackingNumber: varchar("tracking_number", { length: 255 }),
  notes: text("notes"),
  deliveryInstructions: text("delivery_instructions"),
  cancelReason: text("cancel_reason"),
  
  // Service scheduling fields
  serviceDate: varchar("service_date", { length: 10 }), // YYYY-MM-DD format
  serviceTime: varchar("service_time", { length: 8 }), // HH:MM format
  
  // Order type and pickup location fields
  orderType: varchar("order_type", { length: 20 }).default("delivery"), // delivery, pickup, shipping
  pickupLocationId: varchar("pickup_location_id", { length: 255 }), // Reference to pickup_locations
  
  // Driver assignment fields
  assignedDriverId: varchar("assigned_driver_id", { length: 255 }), // Current assigned driver
  deliveryStatus: varchar("delivery_status", { length: 30 }).default("pending"), // pending, assigned, out_for_delivery, delivered, failed
  
  // Loyalty points fields
  pointsToRedeem: int("points_to_redeem").default(0), // Points redeemed for this order
  pointsDiscountAmount: decimal("points_discount_amount", { precision: 10, scale: 2 }).default('0.00'), // Discount amount from points
  
  createdAt: datetime("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: datetime("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

// Order Items
export const orderItems = mysqlTable("order_items", {
  id: varchar("id", { length: 255 }).primaryKey(),
  orderId: varchar("order_id", { length: 255 }).notNull(),
  productId: varchar("product_id", { length: 255 }).notNull(),
  variantId: varchar("variant_id", { length: 255 }),
  productName: varchar("product_name", { length: 255 }).notNull(),
  variantTitle: varchar("variant_title", { length: 255 }),
  sku: varchar("sku", { length: 100 }),
  
  // Quantity-based order fields
  quantity: int("quantity").notNull().default(0),
  
  // Weight-based order fields (stored in grams)
  weightQuantity: decimal("weight_quantity", { precision: 12, scale: 2 }).default('0.00'), // Ordered weight in grams
  weightUnit: varchar("weight_unit", { length: 10 }), // Display unit (grams, kg)
  
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  costPrice: decimal("cost_price", { precision: 10, scale: 2 }), // Cost price at time of sale
  comparePrice: decimal("compare_price", { precision: 10, scale: 2 }), // Compare price at time of sale
  totalPrice: decimal("total_price", { precision: 10, scale: 2 }).notNull(),
  totalCost: decimal("total_cost", { precision: 10, scale: 2 }), // Total cost (costPrice * quantity/weight)
  productImage: varchar("product_image", { length: 500 }),
  addons: json("addons"), // Store selected addons as JSON
  groupTitle: varchar("group_title", { length: 255 }), // Add group title for addon groups
  createdAt: datetime("created_at").default(sql`CURRENT_TIMESTAMP`),
});

// Returns
export const returns = mysqlTable("returns", {
  id: varchar("id", { length: 255 }).primaryKey(),
  returnNumber: varchar("return_number", { length: 100 }).notNull().unique(),
  orderId: varchar("order_id", { length: 255 }).notNull(),
  userId: varchar("user_id", { length: 255 }),
  status: varchar("status", { length: 50 }).default("pending"), // pending, approved, rejected, completed
  reason: varchar("reason", { length: 255 }).notNull(),
  description: text("description"),
  refundAmount: decimal("refund_amount", { precision: 10, scale: 2 }),
  restockFee: decimal("restock_fee", { precision: 10, scale: 2 }).default('0.00'),
  adminNotes: text("admin_notes"),
  createdAt: datetime("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: datetime("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

// Return Items
export const returnItems = mysqlTable("return_items", {
  id: varchar("id", { length: 255 }).primaryKey(),
  returnId: varchar("return_id", { length: 255 }).notNull(),
  orderItemId: varchar("order_item_id", { length: 255 }).notNull(),
  productId: varchar("product_id", { length: 255 }).notNull(),
  variantId: varchar("variant_id", { length: 255 }),
  quantity: int("quantity").notNull(),
  condition: varchar("condition", { length: 50 }), // new, used, damaged
  createdAt: datetime("created_at").default(sql`CURRENT_TIMESTAMP`),
});

// Refunds
export const refunds = mysqlTable("refunds", {
  id: varchar("id", { length: 255 }).primaryKey(),
  orderId: varchar("order_id", { length: 255 }).notNull(),
  returnId: varchar("return_id", { length: 255 }),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  reason: varchar("reason", { length: 255 }),
  method: varchar("method", { length: 50 }), // original_payment, store_credit, manual
  transactionId: varchar("transaction_id", { length: 255 }),
  status: varchar("status", { length: 50 }).default("pending"), // pending, completed, failed
  processedBy: varchar("processed_by", { length: 255 }),
  notes: text("notes"),
  createdAt: datetime("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: datetime("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

// Shipping Labels
export const shippingLabels = mysqlTable("shipping_labels", {
  id: varchar("id", { length: 255 }).primaryKey(),
  orderId: varchar("order_id", { length: 255 }).notNull(),
  carrier: varchar("carrier", { length: 100 }).notNull(), // ups, fedex, usps, dhl
  service: varchar("service", { length: 100 }), // ground, express, overnight
  trackingNumber: varchar("tracking_number", { length: 255 }).notNull(),
  labelUrl: varchar("label_url", { length: 500 }),
  cost: decimal("cost", { precision: 10, scale: 2 }),
  weight: decimal("weight", { precision: 8, scale: 2 }),
  dimensions: json("dimensions"), // {length, width, height}
  status: varchar("status", { length: 50 }).default("created"), // created, printed, shipped, delivered
  createdAt: datetime("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: datetime("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

// Pickup Locations
export const pickupLocations = mysqlTable("pickup_locations", {
  id: varchar("id", { length: 255 }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  address: text("address").notNull(),
  instructions: text("instructions"), // Special instructions for pickup
  latitude: decimal("latitude", { precision: 10, scale: 8 }),
  longitude: decimal("longitude", { precision: 11, scale: 8 }),
  isActive: boolean("is_active").default(true),
  createdAt: datetime("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: datetime("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

// Admin users
export const adminUsers = mysqlTable("admin_users", {
  id: varchar("id", { length: 255 }).primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }),
  roleId: varchar("roleId", { length: 255 }).notNull(),
  role: varchar('role', { length: 255 }).notNull(),
  createdAt: datetime("createdAt").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: datetime("updatedAt").default(sql`CURRENT_TIMESTAMP`),
});
// Admin roles
export const adminRoles = mysqlTable("admin_roles", {
  id: varchar("id", { length: 255 }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  permissions: text("permissions").notNull(),
  createdAt: datetime("createdAt").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: datetime("updatedAt").default(sql`CURRENT_TIMESTAMP`),
});

// Admin logs
export const adminLogs = mysqlTable("admin_logs", {
  id: varchar("id", { length: 255 }).primaryKey(),
  adminId: varchar("adminId", { length: 255 }).notNull(),
  action: varchar("action", { length: 255 }).notNull(),
  details: text("details"),
  createdAt: datetime("createdAt").default(sql`CURRENT_TIMESTAMP`),
});

// Drivers (extends users with driver-specific fields)
export const drivers = mysqlTable("drivers", {
  id: varchar("id", { length: 255 }).primaryKey(),
  userId: varchar("user_id", { length: 255 }).notNull().unique(), // Reference to user table
  licenseNumber: varchar("license_number", { length: 100 }).notNull().unique(),
  vehicleType: varchar("vehicle_type", { length: 100 }).notNull(), // car, motorcycle, truck, van
  vehicleMake: varchar("vehicle_make", { length: 100 }),
  vehicleModel: varchar("vehicle_model", { length: 100 }),
  vehicleYear: int("vehicle_year"),
  vehiclePlateNumber: varchar("vehicle_plate_number", { length: 50 }).notNull(),
  vehicleColor: varchar("vehicle_color", { length: 50 }),
  
  // Location fields
  baseLocation: varchar("base_location", { length: 255 }).notNull(), // Fixed base location address
  baseLatitude: decimal("base_latitude", { precision: 10, scale: 8 }), // GPS coordinates
  baseLongitude: decimal("base_longitude", { precision: 11, scale: 8 }),
  currentLatitude: decimal("current_latitude", { precision: 10, scale: 8 }), // Current location
  currentLongitude: decimal("current_longitude", { precision: 11, scale: 8 }),
  currentAddress: varchar("current_address", { length: 500 }), // Current location address
  
  // Status and availability
  status: varchar("status", { length: 20 }).default("offline"), // available, busy, offline
  isActive: boolean("is_active").default(true),
  maxDeliveryRadius: int("max_delivery_radius").default(50), // in kilometers
  
  // Additional info
  emergencyContact: varchar("emergency_contact", { length: 20 }),
  emergencyContactName: varchar("emergency_contact_name", { length: 255 }),
  dateOfJoining: datetime("date_of_joining").default(sql`CURRENT_TIMESTAMP`),
  
  createdAt: datetime("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: datetime("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

// Driver Assignments (tracks which driver is assigned to which order)
export const driverAssignments = mysqlTable("driver_assignments", {
  id: varchar("id", { length: 255 }).primaryKey(),
  orderId: varchar("order_id", { length: 255 }).notNull(),
  driverId: varchar("driver_id", { length: 255 }).notNull(),
  assignedBy: varchar("assigned_by", { length: 255 }).notNull(), // Admin user who assigned
  assignedAt: datetime("assigned_at").default(sql`CURRENT_TIMESTAMP`),
  
  // Assignment details
  assignmentType: varchar("assignment_type", { length: 20 }).default("manual"), // manual, automatic
  estimatedDistance: decimal("estimated_distance", { precision: 8, scale: 2 }), // in kilometers
  estimatedDuration: int("estimated_duration"), // in minutes
  priority: varchar("priority", { length: 20 }).default("normal"), // low, normal, high, urgent
  
  // Delivery status tracking
  deliveryStatus: varchar("delivery_status", { length: 30 }).default("assigned"), // assigned, out_for_delivery, delivered, failed
  pickedUpAt: datetime("picked_up_at"),
  outForDeliveryAt: datetime("out_for_delivery_at"),
  deliveredAt: datetime("delivered_at"),
  failedAt: datetime("failed_at"),
  
  // Delivery details
  deliveryNotes: text("delivery_notes"),
  deliveryProof: varchar("delivery_proof", { length: 500 }), // Image URL for delivery proof
  customerSignature: varchar("customer_signature", { length: 500 }), // Signature image URL
  failureReason: text("failure_reason"),
  
  isActive: boolean("is_active").default(true), // For tracking reassignments
  createdAt: datetime("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: datetime("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

// Driver Assignment History (audit trail for all assignment changes)
export const driverAssignmentHistory = mysqlTable("driver_assignment_history", {
  id: varchar("id", { length: 255 }).primaryKey(),
  orderId: varchar("order_id", { length: 255 }).notNull(),
  assignmentId: varchar("assignment_id", { length: 255 }), // Reference to current assignment
  
  // Previous assignment details
  previousDriverId: varchar("previous_driver_id", { length: 255 }),
  newDriverId: varchar("new_driver_id", { length: 255 }),
  
  // Change details
  changeType: varchar("change_type", { length: 30 }).notNull(), // assigned, reassigned, unassigned
  changeReason: text("change_reason"),
  changedBy: varchar("changed_by", { length: 255 }).notNull(), // Admin user who made the change
  
  createdAt: datetime("created_at").default(sql`CURRENT_TIMESTAMP`),
});

// Application Settings
export const settings = mysqlTable("settings", {
  id: varchar("id", { length: 255 }).primaryKey(),
  key: varchar("key", { length: 255 }).notNull().unique(), // e.g., 'stock_management_enabled'
  value: text("value").notNull(), // JSON string for complex values
  type: varchar("type", { length: 50 }).default("string"), // string, boolean, number, json
  description: text("description"),
  isActive: boolean("is_active").default(true),
  createdAt: datetime("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: datetime("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

// ✅ User Loyalty Points
export const userLoyaltyPoints = mysqlTable("user_loyalty_points", {
  id: varchar("id", { length: 255 }).primaryKey(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  totalPointsEarned: int("total_points_earned").default(0),
  totalPointsRedeemed: int("total_points_redeemed").default(0),
  availablePoints: int("available_points").default(0), // points that can be redeemed
  pendingPoints: int("pending_points").default(0), // points waiting for order delivery
  pointsExpiringSoon: int("points_expiring_soon").default(0), // points expiring in next 30 days
  lastEarnedAt: datetime("last_earned_at"),
  lastRedeemedAt: datetime("last_redeemed_at"),
  createdAt: datetime("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: datetime("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

// ✅ Loyalty Points History
export const loyaltyPointsHistory = mysqlTable("loyalty_points_history", {
  id: varchar("id", { length: 255 }).primaryKey(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  orderId: varchar("order_id", { length: 255 }), // reference to order when earned/redeemed
  transactionType: varchar("transaction_type", { length: 20 }).notNull(), // earned, redeemed, expired, manual_adjustment
  status: varchar("status", { length: 20 }).default("available"), // pending, available, expired, cancelled
  points: int("points").notNull(), // positive for earned, negative for redeemed/expired
  pointsBalance: int("points_balance").notNull(), // user's total available points after this transaction
  description: text("description"), // e.g., "Earned from order #ORD-123", "Redeemed at checkout"
  orderAmount: decimal("order_amount", { precision: 10, scale: 2 }), // order amount when points were earned
  discountAmount: decimal("discount_amount", { precision: 10, scale: 2 }), // discount amount when redeemed
  expiresAt: datetime("expires_at"), // when these points expire (only for earned points)
  isExpired: boolean("is_expired").default(false),
  processedBy: varchar("processed_by", { length: 255 }), // admin user ID for manual adjustments
  metadata: json("metadata"), // additional data like conversion rates, settings used
  createdAt: datetime("created_at").default(sql`CURRENT_TIMESTAMP`),
});

// Relations
export const usersRelations = relations(user, ({ many, one }) => ({
  orders: many(orders),
  returns: many(returns),
  loyaltyPoints: one(userLoyaltyPoints),
  loyaltyHistory: many(loyaltyPointsHistory),
  magicLinkUsage: many(magicLinkUsage),
}));

export const globalMagicLinkRelations = relations(globalMagicLink, ({ many }) => ({
  usage: many(magicLinkUsage),
}));

export const magicLinkUsageRelations = relations(magicLinkUsage, ({ one }) => ({
  user: one(user, {
    fields: [magicLinkUsage.userId],
    references: [user.id],
  }),
  magicLink: one(globalMagicLink, {
    fields: [magicLinkUsage.magicLinkId],
    references: [globalMagicLink.id],
  }),
}));

export const userLoyaltyPointsRelations = relations(userLoyaltyPoints, ({ one, many }) => ({
  user: one(user, {
    fields: [userLoyaltyPoints.userId],
    references: [user.id],
  }),
  history: many(loyaltyPointsHistory),
}));

export const loyaltyPointsHistoryRelations = relations(loyaltyPointsHistory, ({ one }) => ({
  user: one(user, {
    fields: [loyaltyPointsHistory.userId],
    references: [user.id],
  }),
  order: one(orders, {
    fields: [loyaltyPointsHistory.orderId],
    references: [orders.id],
  }),
  userLoyaltyPoints: one(userLoyaltyPoints, {
    fields: [loyaltyPointsHistory.userId],
    references: [userLoyaltyPoints.userId],
  }),
}));

export const categoriesRelations = relations(categories, ({ many, one }) => ({
  subcategories: many(subcategories),
  products: many(products),
  parent: one(categories, {
    fields: [categories.parentId],
    references: [categories.id],
  }),
  children: many(categories),
}));

export const subcategoriesRelations = relations(subcategories, ({ one, many }) => ({
  category: one(categories, {
    fields: [subcategories.categoryId],
    references: [categories.id],
  }),
  products: many(products),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  subcategory: one(subcategories, {
    fields: [products.subcategoryId],
    references: [subcategories.id],
  }),
  variants: many(productVariants),
  inventory: many(productInventory),
  orderItems: many(orderItems),
  productAddons: many(productAddons),
}));

export const productVariantsRelations = relations(productVariants, ({ one, many }) => ({
  product: one(products, {
    fields: [productVariants.productId],
    references: [products.id],
  }),
  inventory: many(productInventory),
  orderItems: many(orderItems),
}));

export const productInventoryRelations = relations(productInventory, ({ one, many }) => ({
  product: one(products, {
    fields: [productInventory.productId],
    references: [products.id],
  }),
  variant: one(productVariants, {
    fields: [productInventory.variantId],
    references: [productVariants.id],
  }),
  stockMovements: many(stockMovements),
}));

export const stockMovementsRelations = relations(stockMovements, ({ one }) => ({
  inventory: one(productInventory, {
    fields: [stockMovements.inventoryId],
    references: [productInventory.id],
  }),
  product: one(products, {
    fields: [stockMovements.productId],
    references: [products.id],
  }),
  variant: one(productVariants, {
    fields: [stockMovements.variantId],
    references: [productVariants.id],
  }),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(user, {
    fields: [orders.userId],
    references: [user.id],
  }),
  assignedDriver: one(drivers, {
    fields: [orders.assignedDriverId],
    references: [drivers.id],
  }),
  pickupLocation: one(pickupLocations, {
    fields: [orders.pickupLocationId],
    references: [pickupLocations.id],
  }),
  orderItems: many(orderItems),
  returns: many(returns),
  refunds: many(refunds),
  shippingLabels: many(shippingLabels),
  driverAssignments: many(driverAssignments),
  driverAssignmentHistory: many(driverAssignmentHistory),
}));

export const orderItemsRelations = relations(orderItems, ({ one, many }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
  variant: one(productVariants, {
    fields: [orderItems.variantId],
    references: [productVariants.id],
  }),
  returnItems: many(returnItems),
}));

export const returnsRelations = relations(returns, ({ one, many }) => ({
  order: one(orders, {
    fields: [returns.orderId],
    references: [orders.id],
  }),
  user: one(user, {
    fields: [returns.userId],
    references: [user.id],
  }),
  returnItems: many(returnItems),
  refunds: many(refunds),
}));

export const returnItemsRelations = relations(returnItems, ({ one }) => ({
  return: one(returns, {
    fields: [returnItems.returnId],
    references: [returns.id],
  }),
  orderItem: one(orderItems, {
    fields: [returnItems.orderItemId],
    references: [orderItems.id],
  }),
  product: one(products, {
    fields: [returnItems.productId],
    references: [products.id],
  }),
  variant: one(productVariants, {
    fields: [returnItems.variantId],
    references: [productVariants.id],
  }),
}));

export const refundsRelations = relations(refunds, ({ one }) => ({
  order: one(orders, {
    fields: [refunds.orderId],
    references: [orders.id],
  }),
  return: one(returns, {
    fields: [refunds.returnId],
    references: [returns.id],
  }),
}));

export const shippingLabelsRelations = relations(shippingLabels, ({ one }) => ({
  order: one(orders, {
    fields: [shippingLabels.orderId],
    references: [orders.id],
  }),
}));

export const variationAttributesRelations = relations(variationAttributes, ({ many }) => ({
  values: many(variationAttributeValues),
}));

export const variationAttributeValuesRelations = relations(variationAttributeValues, ({ one }) => ({
  attribute: one(variationAttributes, {
    fields: [variationAttributeValues.attributeId],
    references: [variationAttributes.id],
  }),
}));

export const addonGroupsRelations = relations(addonGroups, ({ many }) => ({
  addons: many(addons),
}));

export const addonsRelations = relations(addons, ({ many, one }) => ({
  productAddons: many(productAddons),
  group: one(addonGroups, {
    fields: [addons.groupId],
    references: [addonGroups.id],
  }),
}));

export const productAddonsRelations = relations(productAddons, ({ one }) => ({
  product: one(products, {
    fields: [productAddons.productId],
    references: [products.id],
  }),
  addon: one(addons, {
    fields: [productAddons.addonId],
    references: [addons.id],
  }),
}));

export const adminUsersRelations = relations(adminUsers, ({ one, many }) => ({
  role: one(adminRoles, {
    fields: [adminUsers.roleId],
    references: [adminRoles.id],
  }),
  logs: many(adminLogs),
}));

export const adminRolesRelations = relations(adminRoles, ({ many }) => ({
  users: many(adminUsers),
}));

export const adminLogsRelations = relations(adminLogs, ({ one }) => ({
  admin: one(adminUsers, {
    fields: [adminLogs.adminId],
    references: [adminUsers.id],
  }),
}));

export const driversRelations = relations(drivers, ({ one, many }) => ({
  user: one(user, {
    fields: [drivers.userId],
    references: [user.id],
  }),
  assignments: many(driverAssignments),
  assignmentHistory: many(driverAssignmentHistory),
}));

export const driverAssignmentsRelations = relations(driverAssignments, ({ one, many }) => ({
  order: one(orders, {
    fields: [driverAssignments.orderId],
    references: [orders.id],
  }),
  driver: one(drivers, {
    fields: [driverAssignments.driverId],
    references: [drivers.id],
  }),
  assignedByUser: one(adminUsers, {
    fields: [driverAssignments.assignedBy],
    references: [adminUsers.id],
  }),
  history: many(driverAssignmentHistory),
}));

export const driverAssignmentHistoryRelations = relations(driverAssignmentHistory, ({ one }) => ({
  order: one(orders, {
    fields: [driverAssignmentHistory.orderId],
    references: [orders.id],
  }),
  assignment: one(driverAssignments, {
    fields: [driverAssignmentHistory.assignmentId],
    references: [driverAssignments.id],
  }),
  previousDriver: one(drivers, {
    fields: [driverAssignmentHistory.previousDriverId],
    references: [drivers.id],
  }),
  newDriver: one(drivers, {
    fields: [driverAssignmentHistory.newDriverId],
    references: [drivers.id],
  }),
  changedByUser: one(adminUsers, {
    fields: [driverAssignmentHistory.changedBy],
    references: [adminUsers.id],
  }),
}));

// Tag Groups - for organizing tags into categories
export const tagGroups = mysqlTable("tag_groups", {
  id: varchar("id", { length: 255 }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  description: text("description"),
  color: varchar("color", { length: 7 }), // Hex color code
  icon: varchar("icon", { length: 100 }), // Icon name/class
  allowCustomValues: boolean("allow_custom_values").default(false),
  isRequired: boolean("is_required").default(false), // If true, products must have at least one tag from this group
  maxSelections: int("max_selections").default(0), // 0 = unlimited, >0 = limit selections
  sortOrder: int("sort_order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: datetime("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: datetime("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

// Tags - individual tags that belong to groups
export const tags = mysqlTable("tags", {
  id: varchar("id", { length: 255 }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull(),
  description: text("description"),
  color: varchar("color", { length: 7 }), // Override group color if needed
  icon: varchar("icon", { length: 100 }), // Override group icon if needed
  groupId: varchar("group_id", { length: 255 }).notNull(),
  isCustom: boolean("is_custom").default(false), // True if this was a custom value created by user
  customValue: text("custom_value"), // Store custom input value if different from name
  sortOrder: int("sort_order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: datetime("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: datetime("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

// Product Tags - junction table linking products to tags with custom values
export const productTags = mysqlTable("product_tags", {
  id: varchar("id", { length: 255 }).primaryKey(),
  productId: varchar("product_id", { length: 255 }).notNull(),
  tagId: varchar("tag_id", { length: 255 }).notNull(),
  customValue: text("custom_value"), // For storing custom values when tag allows it
  sortOrder: int("sort_order").default(0),
  createdAt: datetime("created_at").default(sql`CURRENT_TIMESTAMP`),
});

// Tag Groups Relations
export const tagGroupsRelations = relations(tagGroups, ({ many }) => ({
  tags: many(tags),
}));

// Tags Relations
export const tagsRelations = relations(tags, ({ one, many }) => ({
  group: one(tagGroups, {
    fields: [tags.groupId],
    references: [tagGroups.id],
  }),
  productTags: many(productTags),
}));

// Product Tags Relations
export const productTagsRelations = relations(productTags, ({ one }) => ({
  product: one(products, {
    fields: [productTags.productId],
    references: [products.id],
  }),
  tag: one(tags, {
    fields: [productTags.tagId],
    references: [tags.id],
  }),
}));

// Update Products Relations to include tags
export const updatedProductsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  subcategory: one(subcategories, {
    fields: [products.subcategoryId],
    references: [subcategories.id],
  }),
  variants: many(productVariants),
  inventory: many(productInventory),
  orderItems: many(orderItems),
  productAddons: many(productAddons),
  productTags: many(productTags),
}));

// Twilio Conversations - for managing Twilio chat sessions between drivers and users
export const twilioConversations = mysqlTable("twilio_conversations", {
  id: varchar("id", { length: 255 }).primaryKey(),
  orderId: varchar("order_id", { length: 255 }).notNull(), // Reference to active order
  userId: varchar("user_id", { length: 255 }).notNull(), // Customer
  driverId: varchar("driver_id", { length: 255 }).notNull(), // Assigned driver
  twilioConversationSid: varchar("twilio_conversation_sid", { length: 255 }).notNull().unique(), // Twilio conversation SID
  status: varchar("status", { length: 20 }).default("active"), // active, closed
  createdAt: datetime("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: datetime("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

// Twilio Call Sessions - for managing voice calls between drivers and users
export const twilioCallSessions = mysqlTable("twilio_call_sessions", {
  id: varchar("id", { length: 255 }).primaryKey(),
  conversationId: varchar("conversation_id", { length: 255 }).notNull(), // Reference to twilio_conversations
  callerId: varchar("caller_id", { length: 255 }).notNull(), // Who initiated the call
  receiverId: varchar("receiver_id", { length: 255 }).notNull(), // Who received the call
  callType: varchar("call_type", { length: 10 }).default("voice"), // voice or video
  twilioCallSid: varchar("twilio_call_sid", { length: 255 }), // Twilio call SID
  status: varchar("status", { length: 20 }).default("initiated"), // initiated, ringing, answered, ended, missed
  startedAt: datetime("started_at"),
  endedAt: datetime("ended_at"),
  duration: int("duration").default(0), // in seconds
  createdAt: datetime("created_at").default(sql`CURRENT_TIMESTAMP`),
});

// Twilio Conversations Relations
export const twilioConversationsRelations = relations(twilioConversations, ({ one, many }) => ({
  order: one(orders, {
    fields: [twilioConversations.orderId],
    references: [orders.id],
  }),
  user: one(user, {
    fields: [twilioConversations.userId],
    references: [user.id],
  }),
  driver: one(drivers, {
    fields: [twilioConversations.driverId],
    references: [drivers.id],
  }),
  callSessions: many(twilioCallSessions),
}));

// Twilio Call Sessions Relations
export const twilioCallSessionsRelations = relations(twilioCallSessions, ({ one }) => ({
  conversation: one(twilioConversations, {
    fields: [twilioCallSessions.conversationId],
    references: [twilioConversations.id],
  }),
  caller: one(user, {
    fields: [twilioCallSessions.callerId],
    references: [user.id],
  }),
  receiver: one(user, {
    fields: [twilioCallSessions.receiverId],
    references: [user.id],
  }),
}));

// ✅ Chat Conversations (1-on-1 between customer and driver)
export const chatConversations = mysqlTable("chat_conversations", {
  id: varchar("id", { length: 255 }).primaryKey(),
  customerId: varchar("customer_id", { length: 255 }).notNull(),
  driverId: varchar("driver_id", { length: 255 }), // Made nullable for support conversations
  orderId: varchar("order_id", { length: 255 }), // Optional: link to specific order
  agoraChannelName: varchar("agora_channel_name", { length: 255 }).notNull(),
  isActive: boolean("is_active").default(true),
  lastMessageAt: datetime("last_message_at"),
  createdAt: datetime("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: datetime("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

// ✅ Chat Messages
export const chatMessages = mysqlTable("chat_messages", {
  id: varchar("id", { length: 255 }).primaryKey(),
  conversationId: varchar("conversation_id", { length: 255 }).notNull(),
  senderId: varchar("sender_id", { length: 255 }), // Nullable for admin/system messages
  senderKind: varchar("sender_kind", { length: 20 }).notNull().default("user"), // 'user', 'system', 'support_bot'
  message: text("message").notNull(),
  messageType: varchar("message_type", { length: 50 }).default("text"), // text, system
  isRead: boolean("is_read").default(false),
  createdAt: datetime("created_at").default(sql`CURRENT_TIMESTAMP`),
});

// Chat Relations
export const chatConversationsRelations = relations(chatConversations, ({ one, many }) => ({
  customer: one(user, {
    fields: [chatConversations.customerId],
    references: [user.id],
  }),
  driver: one(user, {
    fields: [chatConversations.driverId],
    references: [user.id],
  }),
  order: one(orders, {
    fields: [chatConversations.orderId],
    references: [orders.id],
  }),
  messages: many(chatMessages),
}));

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  conversation: one(chatConversations, {
    fields: [chatMessages.conversationId],
    references: [chatConversations.id],
  }),
  sender: one(user, {
    fields: [chatMessages.senderId],
    references: [user.id],
  }),
}));

// Pickup Locations Relations
export const pickupLocationsRelations = relations(pickupLocations, ({ many }) => ({
  orders: many(orders),
}));

// Driver Order Rejections - track which orders drivers have rejected
export const driverOrderRejections = mysqlTable("driver_order_rejections", {
  id: varchar("id", { length: 255 }).primaryKey(),
  driverId: varchar("driver_id", { length: 255 }).notNull(), // Reference to drivers table
  orderId: varchar("order_id", { length: 255 }).notNull(), // Reference to orders table
  rejectedAt: datetime("rejected_at").default(sql`CURRENT_TIMESTAMP`),
  reason: text("reason"), // Optional reason for rejection
  createdAt: datetime("created_at").default(sql`CURRENT_TIMESTAMP`),
});

// Driver Order Rejections Relations
export const driverOrderRejectionsRelations = relations(driverOrderRejections, ({ one }) => ({
  driver: one(drivers, {
    fields: [driverOrderRejections.driverId],
    references: [drivers.id],
  }),
  order: one(orders, {
    fields: [driverOrderRejections.orderId],
    references: [orders.id],
  }),
}));

