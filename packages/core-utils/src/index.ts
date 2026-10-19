export function isHttpsUrl(value: unknown): boolean {
  try { return new URL(String(value ?? "")).protocol === "https:"; } catch { return false; }
}
export function isSha256(value: unknown): boolean {
  return /^[a-f0-9]{64}$/i.test(String(value ?? ""));
}
export function compareVersions(left: string, right: string): number {
  const a = left.split(/[.+-]/).map(part => /^\d+$/.test(part) ? Number(part) : part.toLowerCase());
  const b = right.split(/[.+-]/).map(part => /^\d+$/.test(part) ? Number(part) : part.toLowerCase());
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = a[i] ?? 0, y = b[i] ?? 0;
    if (x === y) continue;
    if (typeof x === "number" && typeof y === "number") return x - y;
    return String(x).localeCompare(String(y), undefined, { numeric: true });
  }
  return 0;
}
export function formatBytes(size: number): string {
  if (!Number.isFinite(size) || size <= 0) return "—";
  const units = ["B", "KB", "MB", "GB"] as const;
  let value = size, unit = 0;
  while (value >= 1024 && unit < units.length - 1) { value /= 1024; unit++; }
  return value.toFixed(unit === 0 ? 0 : 1) + " " + units[unit];
}
