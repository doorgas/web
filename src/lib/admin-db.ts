import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { saasClients } from './schema';

// Check if admin database environment variables are set
if (!process.env.ADMIN_DB_HOST || !process.env.ADMIN_DB_USER || !process.env.ADMIN_DB_PASS || !process.env.ADMIN_DB_NAME) {
  console.warn('Admin database environment variables not configured. License verification may not work.');
}

const adminPool = mysql.createPool({
  host: process.env.ADMIN_DB_HOST || process.env.DB_HOST || 'localhost',
  user: process.env.ADMIN_DB_USER || process.env.DB_USER || '',
  password: process.env.ADMIN_DB_PASS || process.env.DB_PASS || '',
  database: process.env.ADMIN_DB_NAME || process.env.DB_NAME || '',
  port: 3306,
});

export const adminDb = drizzle(adminPool, { 
  schema: { saasClients }, 
  mode: "default" 
});