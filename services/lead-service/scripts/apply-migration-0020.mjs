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
    console.log('=== Migration 0020: Add ALL missing columns ===\n');

    // ==================== PRODUCTS TABLE ====================
    console.log('1. Adding ALL products columns...');
    const prodCols = [
      "status varchar(20) DEFAULT 'draft'",
      "category_path varchar(1000)",
      "base_price integer DEFAULT 0",
      "currency varchar(3) DEFAULT 'USD'",
      "cost_price integer",
      "msrp integer",
      "billing_cycle_count integer",
      "trial_days integer",
      "setup_fee integer",
      "unit_of_measure varchar(50) DEFAULT 'each'",
      "minimum_quantity integer",
      "maximum_quantity integer",
      "quantity_increment integer",
      "taxable boolean DEFAULT true",
      "tax_code varchar(50)",
      "tax_rate real",
      "track_inventory boolean DEFAULT false",
      "allow_backorder boolean DEFAULT false",
      "weight decimal(10,3)",
      "width decimal(10,2)",
      "height decimal(10,2)",
      "depth decimal(10,2)",
      "shippable boolean DEFAULT true",
      "shipping_class varchar(50)",
      "display_order integer DEFAULT 0",
      "is_featured boolean DEFAULT false",
      "custom_fields jsonb DEFAULT '{}'",
      "metadata jsonb DEFAULT '{}'",
      "images jsonb DEFAULT '[]'",
      "primary_image_url varchar(500)",
      "has_variants boolean DEFAULT false",
      "variant_attributes jsonb DEFAULT '[]'",
      "related_products jsonb DEFAULT '[]'",
      "up_sell_ids jsonb DEFAULT '[]'",
      "cross_sell_ids jsonb DEFAULT '[]'",
      "created_at timestamp with time zone DEFAULT now()",
      "updated_at timestamp with time zone DEFAULT now()",
      "published_at timestamp with time zone",
      "created_by uuid",
      "updated_by uuid",
    ];

    for (const col of prodCols) {
      try {
        await client.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS ${col}`);
      } catch (e) {}
    }
    console.log('   Products columns: done');

    // ==================== FORECASTS TABLE ====================
    console.log('2. Adding ALL forecasts columns...');
    const forecastCols = [
      "total_pipeline integer DEFAULT 0",
      "weighted_pipeline integer DEFAULT 0",
      "coverage_ratio decimal(5,2)",
      "submitted_at timestamp with time zone",
      "approved_at timestamp with time zone",
      "approved_by uuid",
      "locked_at timestamp with time zone",
      "locked_by uuid",
      "snapshot_data jsonb DEFAULT '{}'",
      "history jsonb DEFAULT '[]'",
      "created_at timestamp with time zone DEFAULT now()",
      "updated_at timestamp with time zone DEFAULT now()",
    ];

    for (const col of forecastCols) {
      try {
        await client.query(`ALTER TABLE forecasts ADD COLUMN IF NOT EXISTS ${col}`);
      } catch (e) {}
    }
    console.log('   Forecasts columns: done');

    // ==================== VERIFICATION ====================
    console.log('\n=== Verification ===');

    const prodCheck = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'products' AND column_name = 'status'
    `);
    console.log('Products status:', prodCheck.rows.length > 0 ? 'OK' : 'MISSING');

    const fcCheck = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'forecasts' AND column_name = 'total_pipeline'
    `);
    console.log('Forecasts total_pipeline:', fcCheck.rows.length > 0 ? 'OK' : 'MISSING');

    console.log('\n=== MIGRATION 0020 COMPLETED ===\n');

  } catch (error) {
    console.error('Migration error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
