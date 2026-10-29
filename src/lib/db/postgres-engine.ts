import { PGlite } from '@electric-sql/pglite';
import fs from 'fs';
import path from 'path';

interface GlobalWithPg {
  __footbidPgInstance?: PGlite;
  __footbidPgInitPromise?: Promise<PGlite>;
  __footbidPgMutex?: Promise<unknown>;
}

const globalForPg = globalThis as unknown as GlobalWithPg;

/**
 * Serializes access to the embedded single-connection PostgreSQL engine
 * so concurrent requests/promises execute transactionally in order without protocol interleaving.
 */
export async function withPgLock<T>(fn: (db: PGlite) => Promise<T>): Promise<T> {
  const db = await getLocalPostgresEngine();
  const prev = globalForPg.__footbidPgMutex ?? Promise.resolve();
  let release!: () => void;
  globalForPg.__footbidPgMutex = new Promise<void>((resolve) => {
    release = resolve;
  });
  await prev;
  try {
    return await fn(db);
  } finally {
    release();
  }
}

export async function getLocalPostgresEngine(): Promise<PGlite> {
  if (globalForPg.__footbidPgInstance) {
    return globalForPg.__footbidPgInstance;
  }
  if (globalForPg.__footbidPgInitPromise) {
    return globalForPg.__footbidPgInitPromise;
  }

  globalForPg.__footbidPgInitPromise = initializePostgresEngine();
  globalForPg.__footbidPgInstance = await globalForPg.__footbidPgInitPromise;
  return globalForPg.__footbidPgInstance;
}

async function initializePostgresEngine(): Promise<PGlite> {
  const isTest = process.env.NODE_ENV === 'test' || Boolean(process.env.VITEST);
  let db: PGlite;

  if (isTest) {
    db = new PGlite();
  } else {
    try {
      const dataDir = path.join(process.cwd(), '.data', 'footbid-pg');
      fs.mkdirSync(path.dirname(dataDir), { recursive: true });
      db = new PGlite(dataDir);
    } catch {
      db = new PGlite();
    }
  }

  // Check if schema is already initialized
  const checkTable = await db.query<{ exists: boolean }>(`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'players'
    ) AS exists;
  `);

  if (!checkTable.rows[0]?.exists) {
    const migrationPath = path.join(process.cwd(), 'supabase', 'migrations', '0001_footbid_schema.sql');
    const seedPath = path.join(process.cwd(), 'supabase', 'seed.sql');

    const migrationSql = fs.readFileSync(migrationPath, 'utf8');
    await db.exec(migrationSql);

    if (fs.existsSync(seedPath)) {
      const seedSql = fs.readFileSync(seedPath, 'utf8');
      await db.exec(seedSql);
    }
  }

  return db;
}

/**
 * Creates a fresh isolated PostgreSQL engine initialized with `0001_footbid_schema.sql`
 * (and optionally `seed.sql`) for automated testing.
 */
export async function createIsolatedTestPostgresEngine(includeSeed = true): Promise<PGlite> {
  const db = new PGlite();
  const migrationPath = path.join(process.cwd(), 'supabase', 'migrations', '0001_footbid_schema.sql');
  const migrationSql = fs.readFileSync(migrationPath, 'utf8');
  await db.exec(migrationSql);

  if (includeSeed) {
    const seedPath = path.join(process.cwd(), 'supabase', 'seed.sql');
    if (fs.existsSync(seedPath)) {
      const seedSql = fs.readFileSync(seedPath, 'utf8');
      await db.exec(seedSql);
    }
  }
  return db;
}
