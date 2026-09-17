export function optionalHttpUrl(value: unknown, maximumLength = 1_500) {
  const text = String(value ?? '').trim();
  if (!text) return { value: null as string | null };
  if (text.length > maximumLength) return { error: 'URL is too long.' };
  try {
    const url = new URL(text);
    if (!['http:', 'https:'].includes(url.protocol)) return { error: 'URL must start with http:// or https://.' };
    return { value: url.toString() };
  } catch {
    return { error: 'Enter a valid URL.' };
  }
}

export function optionalDate(value: unknown) {
  const text = String(value ?? '').trim();
  if (!text) return { value: null as string | null };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text) || Number.isNaN(Date.parse(`${text}T00:00:00Z`))) {
    return { error: 'Enter a valid date.' };
  }
  return { value: text };
}
