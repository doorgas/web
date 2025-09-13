import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from './schema'; // ✅ ensure this imports all table definitions

// Check if database environment variables are set
if (!process.env.DB_HOST || !process.env.DB_USER || !process.env.DB_PASS || !process.env.DB_NAME) {
  console.warn('Database environment variables not configured. Some features may not work.');
}

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || '',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || '',
  port: 3306,
});

export const db = drizzle(pool, { schema, mode: "default" });
