import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

// Lazily initialized: importing this module (e.g. while `next build` collects
// page data on Vercel/Netlify, where env vars may only exist at runtime) must
// never throw. The Postgres connection is opened on the first actual query.
type Db = NodePgDatabase<Record<string, never>>;

let cachedPool: Pool | null = null;
let cachedDb: Db | null = null;

export function getPool(): Pool {
  if (!cachedPool) {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error("DATABASE_URL is required");
    }
    const globalForDb = globalThis as typeof globalThis & {
      __shadeshPgPool?: Pool;
    };
    cachedPool =
      globalForDb.__shadeshPgPool ??
      new Pool({
        connectionString: databaseUrl,
        max: 8,
        idleTimeoutMillis: 30_000,
        connectionTimeoutMillis: 10_000,
      });
    if (process.env.NODE_ENV !== "production") {
      globalForDb.__shadeshPgPool = cachedPool;
    }
  }
  return cachedPool;
}

export function getDb(): Db {
  if (!cachedDb) {
    cachedDb = drizzle(getPool());
  }
  return cachedDb;
}

// Compatibility proxies — `db` and `pool` still behave exactly like before,
// but only open a connection upon first use.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const pool = new Proxy({} as Pool, {
  get(_t, prop) {
    const real = getPool() as any;
    const value = real[prop];
    return typeof value === "function" ? value.bind(real) : value;
  },
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const db = new Proxy({} as Db, {
  get(_t, prop) {
    const real = getDb() as any;
    const value = real[prop];
    return typeof value === "function" ? value.bind(real) : value;
  },
});
