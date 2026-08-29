/** True when both twists are set and differ by more than `epsilon` inches/rev. */
export function twistsDiffer(
  preferredIn: number | null | undefined,
  rifleIn: number | null | undefined,
  epsilon = 0.05,
): boolean {
  if (preferredIn == null || rifleIn == null) return false
  if (!(preferredIn > 0) || !(rifleIn > 0)) return false
  return Math.abs(preferredIn - rifleIn) > epsilon
}
