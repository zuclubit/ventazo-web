import pg from 'pg';

const pool = new pg.Pool({
  host: 'aws-0-us-west-2.pooler.supabase.com',
  port: 6543,
  database: 'postgres',
  user: 'postgres.fngdlxipgrkpbutiqjhw',
  password: 'miZhuxtehvar9wyxfa',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  const client = await pool.connect();
  try {
    console.log('=== Migration 0021: Complete Products and Forecasts sync ===\n');

    // ==================== PRODUCTS TABLE - FULL SYNC ====================
    console.log('1. Syncing ALL products columns...');
    const prodCols = [
      // Identification
      "sku varchar(100)",
      "name varchar(255)",
      "slug varchar(255)",
      "description text",
      "short_description varchar(500)",
      // Classification
      "type varchar(20) DEFAULT 'physical'",
      "status varchar(20) DEFAULT 'draft'",
      "category_id uuid",
      "category_path varchar(1000)",
      "tags jsonb DEFAULT '[]'",
      // Pricing
      "base_price integer DEFAULT 0",
      "currency varchar(3) DEFAULT 'USD'",
      "cost_price integer",
      "msrp integer",
      // Subscription
      "billing_frequency varchar(20)",
      "billing_cycle_count integer",
      "trial_days integer",
      "setup_fee integer",
      // Units
      "unit_of_measure varchar(50) DEFAULT 'each'",
      "minimum_quantity integer",
      "maximum_quantity integer",
      "quantity_increment integer",
      // Tax
      "taxable boolean DEFAULT true",
      "tax_code varchar(50)",
      "tax_rate real",
      // Inventory
      "track_inventory boolean DEFAULT false",
      "stock_quantity integer",
      "low_stock_threshold integer",
      "allow_backorder boolean DEFAULT false",
      // Physical
      "weight real",
      "weight_unit varchar(10)",
      "dimensions jsonb",
      // Digital/Service
      "delivery_method varchar(50)",
      "download_url varchar(500)",
      "license_type varchar(50)",
      // Media
      "image_url varchar(500)",
      "images jsonb DEFAULT '[]'",
      "documents jsonb DEFAULT '[]'",
      // Features
      "features jsonb DEFAULT '[]'",
      "specifications jsonb DEFAULT '{}'",
      // Variants
      "has_variants boolean DEFAULT false",
      "variant_attributes jsonb DEFAULT '[]'",
      // Related
      "related_products jsonb DEFAULT '[]'",
      // Custom
      "custom_fields jsonb DEFAULT '{}'",
      // SEO
      "meta_title varchar(255)",
      "meta_description varchar(500)",
      // Flags
      "is_featured boolean DEFAULT false",
      "is_new boolean DEFAULT false",
      // Timestamps
      "created_at timestamp with time zone DEFAULT now()",
      "updated_at timestamp with time zone DEFAULT now()",
      "created_by uuid",
      "published_at timestamp with time zone",
    ];

    for (const col of prodCols) {
      try {
        await client.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS ${col}`);
      } catch (e) {}
    }
    console.log('   Products: done');

    // ==================== FORECASTS TABLE - FULL SYNC ====================
    console.log('2. Syncing ALL forecasts columns...');
    const forecastCols = [
      "user_id uuid",
      "name varchar(255)",
      "period varchar(20)",
      "period_start timestamp with time zone",
      "period_end timestamp with time zone",
      "total_pipeline integer DEFAULT 0",
      "weighted_pipeline integer DEFAULT 0",
      "committed integer DEFAULT 0",
      "best_case integer DEFAULT 0",
      "closed_won integer DEFAULT 0",
      "closed_lost integer DEFAULT 0",
      "quota integer DEFAULT 0",
      "quota_attainment integer DEFAULT 0",
      "status varchar(50) DEFAULT 'draft'",
      "submitted_at timestamp with time zone",
      "approved_at timestamp with time zone",
      "approved_by uuid",
      "notes text",
      "currency varchar(3) DEFAULT 'USD'",
      "created_at timestamp with time zone DEFAULT now()",
      "updated_at timestamp with time zone DEFAULT now()",
    ];

    for (const col of forecastCols) {
      try {
        await client.query(`ALTER TABLE forecasts ADD COLUMN IF NOT EXISTS ${col}`);
      } catch (e) {}
    }
    console.log('   Forecasts: done');

    // ==================== VERIFY ====================
    console.log('\n=== Verification ===');

    const prodCheck = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'products' AND column_name IN ('delivery_method', 'status', 'weight_unit')
      ORDER BY column_name
    `);
    console.log('Products columns:', prodCheck.rows.map(r => r.column_name).join(', '));

    const fcCheck = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'forecasts' AND column_name IN ('quota_attainment', 'committed', 'total_pipeline')
      ORDER BY column_name
    `);
    console.log('Forecasts columns:', fcCheck.rows.map(r => r.column_name).join(', '));

    console.log('\n=== MIGRATION 0021 COMPLETED ===\n');

  } catch (error) {
    console.error('Migration error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
