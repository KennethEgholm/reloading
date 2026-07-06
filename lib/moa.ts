/**
 * Minute-of-Angle (MOA) computation for target-group measurements.
 *
 * The user enters the group's extreme spread in millimeters and the target
 * distance in meters. MOA is an angular unit: 1 MOA ≈ 1.047 inches at 100
 * yards, which equals ~29.1 mm at 91.44 m. Because 1 MOA subtends linearly
 * with distance, we compute the angle from the recorded linear spread and
 * the distance, then express it in MOA.
 *
 * Derivation (millimeters / meters → MOA):
 *   1 MOA = 1/60 degree = π/10800 rad ≈ 0.000290888 rad
 *   angleRad = (groupSizeMm / 1000) / distanceM            (small-angle)
 *   moa = angleRad / (π / 10800) = (groupSizeMm / 1000) / distanceM × 3437.75
 *   ≈ groupSizeMm / distanceM / 1000 × 3437.75
 *
 * We round to 2 decimals — sub-0.01 MOA differences are below measurement
 * precision and only add noise.
 */

export const MOA_PER_RADIAN = 3437.7467707849396

export function computeMoa(groupSizeMm: number, distanceM: number): number {
  if (!Number.isFinite(groupSizeMm) || !Number.isFinite(distanceM)) {
    throw new Error('MOA inputs must be finite numbers')
  }
  if (groupSizeMm < 0) {
    throw new Error('Group size cannot be negative')
  }
  if (distanceM <= 0) {
    throw new Error('Distance must be greater than zero')
  }
  const angleRad = groupSizeMm / 1000 / distanceM
  const moa = (angleRad * MOA_PER_RADIAN)
  return Math.round(moa * 100) / 100
}

/**
 * Mean MOA across a set of groups. Returns null for an empty list so callers
 * can render "no data" without confusing 0 with "no groups".
 */
export function averageMoa(moas: number[]): number | null {
  if (moas.length === 0) return null
  const sum = moas.reduce((acc, v) => acc + v, 0)
  return Math.round((sum / moas.length) * 100) / 100
}