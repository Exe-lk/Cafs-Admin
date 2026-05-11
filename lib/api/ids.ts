export function newUuid(): string {
  // Node 20+ / Edge: crypto.randomUUID is available in Next route handlers (Node runtime).
  return crypto.randomUUID();
}

