type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export function rateLimit(request: Request, scope: string, limit: number, windowMs: number) {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const client = forwarded || request.headers.get('x-real-ip') || 'unknown';
  const key = `${scope}:${client}`;
  const now = Date.now();
  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return null;
  }
  current.count += 1;
  if (current.count <= limit) return null;
  return new Response(JSON.stringify({ error: 'Too many requests. Please wait and try again.' }), {
    status: 429,
    headers: { 'content-type': 'application/json', 'retry-after': String(Math.ceil((current.resetAt - now) / 1000)) },
  });
}
