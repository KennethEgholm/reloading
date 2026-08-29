/**
 * Exterior ballistics: remaining velocity, energy, and drop at range.
 *
 * Point-mass, ICAO sea-level atmosphere (15 °C, 1013.25 hPa, ρ = 1.225 kg/m³).
 * Uses the published G1 / G7 Cd-vs-Mach curves (McCoy) scaled by the
 * projectile's BC. G7 is preferred when both BCs are present.
 *
 * Drop is centimetres below the line of sight (positive = low). Requires both
 * a zero distance and a positive sightHeightCm; otherwise drop is omitted.
 */

export const DEFAULT_SIGHT_HEIGHT_CM = 5
/** Turret click value: 1 cm of POI shift at 100 m. */
export const CLICK_CM_AT_100M = 1

export const RANGE_TABLE_DISTANCES_M: readonly number[] = [
  50, 100, 150, 200, 250, 300, 350, 400, 450, 500, 550, 600, 650, 700, 750, 800,
]

const GRAIN_KG = 6.479891e-5
const SPEED_OF_SOUND_MPS = 340.294
const RHO = 1.225
const G = 9.80665
const DT = 0.001
const MAX_STEPS = 40_000
const BC_LB_IN2_TO_KG_M2 = 703.06957964
const DRAG_K = (Math.PI / 8) / BC_LB_IN2_TO_KG_M2

type MachCd = readonly [number, number]

// McCoy G1 standard-projectile Cd vs Mach.
const G1_CD: readonly MachCd[] = [
  [0.00, 0.2629], [0.05, 0.2558], [0.10, 0.2487], [0.15, 0.2413],
  [0.20, 0.2344], [0.25, 0.2278], [0.30, 0.2214], [0.35, 0.2155],
  [0.40, 0.2104], [0.45, 0.2061], [0.50, 0.2032], [0.55, 0.2020],
  [0.60, 0.2034], [0.70, 0.2165], [0.725, 0.2230], [0.75, 0.2313],
  [0.775, 0.2417], [0.80, 0.2546], [0.825, 0.2706], [0.85, 0.2901],
  [0.875, 0.3136], [0.90, 0.3415], [0.925, 0.3734], [0.95, 0.4084],
  [0.975, 0.4448], [1.00, 0.4805], [1.025, 0.5136], [1.05, 0.5427],
  [1.075, 0.5677], [1.10, 0.5883], [1.125, 0.6053], [1.15, 0.6191],
  [1.20, 0.6393], [1.25, 0.6518], [1.30, 0.6589], [1.35, 0.6621],
  [1.40, 0.6625], [1.45, 0.6607], [1.50, 0.6573], [1.55, 0.6526],
  [1.60, 0.6470], [1.65, 0.6409], [1.70, 0.6346], [1.75, 0.6280],
  [1.80, 0.6210], [1.85, 0.6141], [1.90, 0.6072], [1.95, 0.6003],
  [2.00, 0.5934], [2.10, 0.5804], [2.20, 0.5681], [2.30, 0.5562],
  [2.40, 0.5447], [2.50, 0.5336], [2.60, 0.5229], [2.80, 0.5027],
  [3.00, 0.4841], [3.20, 0.4673], [3.50, 0.4451],
]

// McCoy G7 standard-projectile Cd vs Mach.
const G7_CD: readonly MachCd[] = [
  [0.00, 0.1198], [0.05, 0.1197], [0.10, 0.1196], [0.15, 0.1194],
  [0.20, 0.1193], [0.25, 0.1194], [0.30, 0.1194], [0.40, 0.1193],
  [0.50, 0.1194], [0.60, 0.1194], [0.70, 0.1198], [0.80, 0.1200],
  [0.825, 0.1235], [0.85, 0.1310], [0.875, 0.1443], [0.90, 0.1637],
  [0.925, 0.1895], [0.95, 0.2222], [0.975, 0.2591], [1.00, 0.2977],
  [1.025, 0.3349], [1.05, 0.3678], [1.075, 0.3945], [1.10, 0.4149],
  [1.125, 0.4298], [1.15, 0.4397], [1.20, 0.4502], [1.25, 0.4525],
  [1.30, 0.4509], [1.35, 0.4472], [1.40, 0.4422], [1.50, 0.4306],
  [1.60, 0.4186], [1.70, 0.4072], [1.80, 0.3965], [1.90, 0.3867],
  [2.00, 0.3776], [2.10, 0.3693], [2.20, 0.3615], [2.40, 0.3477],
  [2.60, 0.3357], [2.80, 0.3251], [3.00, 0.3156], [3.20, 0.3072],
  [3.50, 0.2961],
]

export type DragModel = 'G1' | 'G7'

export interface BallisticsInput {
  measuredV0: number | null | undefined
  weightGr: number
  bcG1?: number | null
  bcG7?: number | null
  zeroDistanceM?: number | null
  sightHeightCm?: number | null
  clickCmAt100m?: number | null
}

export interface RangeTableRow {
  distanceM: number
  velocityMs: number
  energyJ: number
  dropCm: number | null
  clicks: number | null
}

export function resolveDrag(bcG1?: number | null, bcG7?: number | null): { model: DragModel; bc: number } | null {
  if (bcG7 != null && bcG7 > 0) return { model: 'G7', bc: bcG7 }
  if (bcG1 != null && bcG1 > 0) return { model: 'G1', bc: bcG1 }
  return null
}

export function kineticEnergyJ(weightGr: number, velocityMs: number): number {
  return 0.5 * weightGr * GRAIN_KG * velocityMs * velocityMs
}

/** Elevation clicks to counter drop. Positive = up. clickCmAt100m is POI shift per click at 100 m. */
export function elevationClicks(dropCm: number, distanceM: number, clickCmAt100m: number = CLICK_CM_AT_100M): number {
  if (!(clickCmAt100m > 0) || !(distanceM > 0)) return 0
  const n = Math.round(dropCm * 100 / distanceM / clickCmAt100m)
  return n === 0 ? 0 : n
}

export function canComputeBallistics(input: BallisticsInput): boolean {
  return (
    input.measuredV0 != null &&
    input.measuredV0 > 0 &&
    input.weightGr > 0 &&
    resolveDrag(input.bcG1, input.bcG7) != null
  )
}

function lookupCd(table: readonly MachCd[], mach: number): number {
  if (mach <= table[0][0]) return table[0][1]
  const last = table[table.length - 1]
  if (mach >= last[0]) return last[1]
  for (let i = 1; i < table.length; i++) {
    if (mach <= table[i][0]) {
      const [m0, c0] = table[i - 1]
      const [m1, c1] = table[i]
      return c0 + (c1 - c0) * (mach - m0) / (m1 - m0)
    }
  }
  return last[1]
}

type State = { x: number; y: number; vx: number; vy: number }

function cdTable(model: DragModel): readonly MachCd[] {
  return model === 'G7' ? G7_CD : G1_CD
}

function step(s: State, bc: number, model: DragModel): State {
  const v = Math.hypot(s.vx, s.vy)
  if (v < 30) return s
  const cd = lookupCd(cdTable(model), v / SPEED_OF_SOUND_MPS)
  const a = RHO * v * v * cd * DRAG_K / bc
  const ax = -a * s.vx / v
  const ay = -a * s.vy / v - G
  return {
    x: s.x + s.vx * DT,
    y: s.y + s.vy * DT,
    vx: s.vx + ax * DT,
    vy: s.vy + ay * DT,
  }
}

function launch(v0: number, angle: number, sightHeightM: number): State {
  return {
    x: 0,
    y: -sightHeightM,
    vx: v0 * Math.cos(angle),
    vy: v0 * Math.sin(angle),
  }
}

function heightAt(v0: number, bc: number, model: DragModel, angle: number, rangeM: number, sightHeightM: number): number {
  let s = launch(v0, angle, sightHeightM)
  for (let i = 0; i < MAX_STEPS && s.x < rangeM && Math.hypot(s.vx, s.vy) > 30; i++) {
    const n = step(s, bc, model)
    if (n.x <= s.x) break
    if (n.x >= rangeM) {
      const t = (rangeM - s.x) / (n.x - s.x)
      return s.y + t * (n.y - s.y)
    }
    s = n
  }
  return s.y
}

function solveAngle(v0: number, bc: number, model: DragModel, zeroM: number, sightHeightM: number): number {
  let lo = -0.02
  let hi = 0.08
  for (let i = 0; i < 28; i++) {
    const mid = (lo + hi) / 2
    if (heightAt(v0, bc, model, mid, zeroM, sightHeightM) > 0) hi = mid
    else lo = mid
  }
  return (lo + hi) / 2
}

function fly(v0: number, bc: number, model: DragModel, angle: number, withDrop: boolean, sightHeightM: number): RangeTableRow[] {
  const rows: RangeTableRow[] = []
  let s = launch(v0, angle, sightHeightM)
  let si = 0
  const stations = RANGE_TABLE_DISTANCES_M
  for (let i = 0; i < MAX_STEPS && si < stations.length && Math.hypot(s.vx, s.vy) > 30; i++) {
    const n = step(s, bc, model)
    if (n.x <= s.x) break
    while (si < stations.length && n.x >= stations[si]) {
      const t = (stations[si] - s.x) / (n.x - s.x)
      const vx = s.vx + t * (n.vx - s.vx)
      const vy = s.vy + t * (n.vy - s.vy)
      const y = s.y + t * (n.y - s.y)
      const velocityMs = Math.hypot(vx, vy)
      rows.push({
        distanceM: stations[si],
        velocityMs: Math.round(velocityMs),
        energyJ: 0,
        dropCm: withDrop ? Math.round(-y * 1000) / 10 : null,
        clicks: null,
      })
      si++
    }
    s = n
  }
  return rows
}

export function computeRangeTable(input: BallisticsInput): RangeTableRow[] {
  if (!canComputeBallistics(input)) return []
  const drag = resolveDrag(input.bcG1, input.bcG7)
  if (!drag) return []
  const v0 = input.measuredV0 as number
  const zero = input.zeroDistanceM != null && input.zeroDistanceM > 0 ? input.zeroDistanceM : null
  const hasSight = input.sightHeightCm != null && input.sightHeightCm > 0
  const sightHeightM = (hasSight ? input.sightHeightCm! : DEFAULT_SIGHT_HEIGHT_CM) / 100
  const withDrop = zero != null && hasSight
  const angle = withDrop ? solveAngle(v0, drag.bc, drag.model, zero, sightHeightM) : 0
  return fly(v0, drag.bc, drag.model, angle, withDrop, sightHeightM).map((row) => ({
    ...row,
    energyJ: Math.round(kineticEnergyJ(input.weightGr, row.velocityMs)),
    clicks: row.dropCm == null ? null : elevationClicks(row.dropCm, row.distanceM, input.clickCmAt100m ?? CLICK_CM_AT_100M),
  }))
}
