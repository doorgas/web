# Database Verification Steps

If the order_type is still being saved as 'delivery' instead of 'shipping', follow these steps:

## Step 1: Check the actual database column definition

Run this SQL query in your MySQL database:

```sql
SHOW CREATE TABLE orders;
```

Look for the `order_type` column definition. Check if it has:
- A CHECK constraint limiting values
- A TRIGGER that modifies the value on INSERT
- An ENUM type with limited values

## Step 2: Check current column definition

```sql
DESCRIBE orders;
```

Look for the `order_type` row and note:
- Type (should be VARCHAR(20))
- Default (should be 'delivery')
- Any constraints

## Step 3: Verify what's in the database

After placing a test order with "shipping" selected, run:

```sql
SELECT id, order_number, order_type, created_at 
FROM orders 
ORDER BY created_at DESC 
LIMIT 5;
```

## Step 4: If column needs to be altered

If the column is an ENUM type instead of VARCHAR, you need to alter it:

```sql
-- Check if it's an ENUM
SELECT COLUMN_TYPE 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'orders' 
AND COLUMN_NAME = 'order_type';

-- If it's ENUM('delivery','pickup'), alter it to include shipping:
ALTER TABLE orders 
MODIFY COLUMN order_type ENUM('delivery', 'pickup', 'shipping') 
DEFAULT 'delivery';

-- OR change it to VARCHAR to allow any value:
ALTER TABLE orders 
MODIFY COLUMN order_type VARCHAR(20) 
DEFAULT 'delivery';
```

## Step 5: Check for triggers

```sql
SHOW TRIGGERS LIKE 'orders';
```

If there's a BEFORE INSERT or BEFORE UPDATE trigger modifying order_type, you'll need to update or drop it.

## Step 6: Run Drizzle migrations

If the database schema is out of sync, generate and run a migration:

```bash
cd /Users/musaver/Desktop/distro-demo/frontend
npx drizzle-kit push:mysql
```

This will sync the database with your schema definition in `src/lib/schema.ts`.

