import { Pool } from 'pg';

// Supabase pooler uses self-signed certs; disable verification
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL || process.env.DATABASE_URL,
  max: 10,
});

export async function query<T = Record<string, unknown>>(
  text: string,
  params?: unknown[]
): Promise<T[]> {
  const result = await pool.query(text, params);
  return result.rows as T[];
}

export async function queryOne<T = Record<string, unknown>>(
  text: string,
  params?: unknown[]
): Promise<T | undefined> {
  const rows = await query<T>(text, params);
  return rows[0];
}

export async function execute(
  text: string,
  params?: unknown[]
): Promise<{ rowCount: number }> {
  const result = await pool.query(text, params);
  return { rowCount: result.rowCount ?? 0 };
}

export async function insertReturning<T = { id: number }>(
  text: string,
  params?: unknown[]
): Promise<T> {
  const result = await pool.query(text, params);
  return result.rows[0] as T;
}
