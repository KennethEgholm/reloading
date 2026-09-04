export const UPLOAD_KINDS = ['range-logs', 'factory-ammo'] as const
export type UploadKind = (typeof UPLOAD_KINDS)[number]

/** Browser URL for a stored upload. Served by GET /api/uploads (not the public/ folder). */
export function uploadUrl(kind: UploadKind, filename: string): string {
  return `/api/uploads/${kind}/${encodeURIComponent(filename)}`
}
