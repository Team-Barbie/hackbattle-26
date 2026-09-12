export function normalizeClinicCode(code: string | undefined): string {
  return code?.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 32) ?? "";
}
