import { NextResponse } from 'next/server';

export function apiError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

