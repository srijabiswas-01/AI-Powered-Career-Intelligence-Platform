import { NextResponse } from 'next/server';

import { database } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [result] = await database<[{ database: string; timestamp: Date }]>`
      select current_database() as database, now() as timestamp
    `;

    return NextResponse.json({
      status: 'ok',
      database: result.database,
      timestamp: result.timestamp,
    });
  } catch (error) {
    console.error('Database health check failed', error);

    return NextResponse.json(
      { status: 'error', message: 'Database connection failed' },
      { status: 503 },
    );
  }
}
