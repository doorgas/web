// Test script to verify order_type column in database
// Run this with: node test-order-type.js

require('dotenv').config({ path: '.env.local' });
const mysql = require('mysql2/promise');

async function checkOrderTypeColumn() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME,
    });

    console.log('✅ Connected to database\n');

    // Check column definition
    console.log('📋 Checking order_type column definition:');
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME, COLUMN_TYPE, COLUMN_DEFAULT, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'orders' 
      AND COLUMN_NAME = 'order_type'
    `);
    console.table(columns);

    // Check recent orders
    console.log('\n📦 Recent orders with order_type:');
    const [orders] = await connection.execute(`
      SELECT order_number, order_type, status, total_amount, created_at 
      FROM orders 
      ORDER BY created_at DESC 
      LIMIT 10
    `);
    console.table(orders);

    // Check if there are any triggers
    console.log('\n🔧 Checking for triggers on orders table:');
    const [triggers] = await connection.execute(`
      SHOW TRIGGERS LIKE 'orders'
    `);
    if (triggers.length > 0) {
      console.table(triggers);
    } else {
      console.log('No triggers found');
    }

    await connection.end();
    console.log('\n✅ Test complete');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkOrderTypeColumn();

