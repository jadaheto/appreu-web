/**
 * Interpreta la respuesta de `GET /api/auth/permissions` (contrato en
 * construcción). Acepta, en orden:
 * - `string[]` → `['students', 'finance']`
 * - `{ modules: (string | { key | id | code | module })[] }`
 * - `{ permissions: string[] }` → `'students.read'` se reduce al módulo `students`.
 * Devuelve `null` si el formato no se reconoce (la UI usa la matriz local).
 */
export function parsePermissions(body: unknown): ReadonlySet<string> | null {
  const list = extractList(body);
  if (!list) return null;
  const keys = new Set<string>();
  for (const entry of list) {
    const key = entryKey(entry);
    if (!key) continue;
    keys.add(key);
    const dot = key.indexOf('.');
    if (dot > 0) keys.add(key.slice(0, dot));
  }
  return keys;
}

function extractList(body: unknown): unknown[] | null {
  if (Array.isArray(body)) return body;
  if (typeof body === 'object' && body !== null) {
    const rec = body as Record<string, unknown>;
    for (const field of ['modules', 'permissions', 'items', 'data']) {
      if (Array.isArray(rec[field])) return rec[field] as unknown[];
    }
  }
  return null;
}

function entryKey(entry: unknown): string | null {
  if (typeof entry === 'string') return entry.trim() || null;
  if (typeof entry === 'object' && entry !== null) {
    const rec = entry as Record<string, unknown>;
    if (rec['allowed'] === false || rec['enabled'] === false) return null;
    for (const field of ['key', 'module', 'id', 'code', 'name']) {
      if (typeof rec[field] === 'string') return (rec[field] as string).trim() || null;
    }
  }
  return null;
}
