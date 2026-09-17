import { NextResponse } from 'next/server';

import { database } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [result] = await database<[{ timestamp: Date }]>`
      select now() as timestamp
    `;

    return NextResponse.json({ status: 'ok', timestamp: result.timestamp });
  } catch (error) {
    console.error('Database health check failed', error);

    return NextResponse.json(
      { status: 'error', message: 'Database connection failed' },
      { status: 503 },
    );
  }
}
