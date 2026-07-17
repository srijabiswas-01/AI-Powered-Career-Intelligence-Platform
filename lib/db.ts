import 'server-only';

import postgres from 'postgres';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is not configured');
}

const globalForDatabase = globalThis as typeof globalThis & {
  database?: ReturnType<typeof postgres>;
};

export const database =
  globalForDatabase.database ??
  postgres(databaseUrl, {
    // Use one client per serverless instance with Neon's pooled endpoint.
    max: 1,
    prepare: false,
    idle_timeout: 20,
    connect_timeout: 10,
  });

if (process.env.NODE_ENV !== 'production') {
  globalForDatabase.database = database;
}
