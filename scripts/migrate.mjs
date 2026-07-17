import { readFile, readdir } from 'node:fs/promises';
import postgres from 'postgres';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not configured');
}

const sql = postgres(process.env.DATABASE_URL, { max: 1, prepare: false });

try {
  const directory = new URL('../database/', import.meta.url);
  const files = (await readdir(directory)).filter(file => file.endsWith('.sql')).sort();
  for (const file of files) {
    const migration = await readFile(new URL(file, directory), 'utf8');
    await sql.unsafe(migration);
  }
  console.log('Database migration completed.');
} finally {
  await sql.end();
}
