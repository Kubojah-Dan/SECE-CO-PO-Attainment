/**
 * Direct Attainment Engine
 * Pure functions — ZERO Prisma imports, ZERO DB calls.
 * All values returned at full floating-point precision.
 * Rounding is applied at the service/persistence layer, not here.
 */

import type {
  MarkRecord,
  CORecord,
  AttainmentConfig,
  DirectAttainmentResult,
} from './engine.types'
import { safeDivide } from './engine.types'

// ─── calculateIAScore ─────────────────────────────────────────────────────────
/**
 * Computes a student's Internal Assessment score (out of 50).
 * - 3 components: best 2 of 3 (drop lowest), average the remaining
 * - 2 components: average both
 * - 1 component:  that value
 * - 0 components: null (no IA data)
 */
export function calculateIAScore(mark: MarkRecord): number | null {
  const values = [mark.ia1, mark.ia2, mark.ia3].filter(
    (v): v is number => v !== null
  )

  if (values.length === 0) return null
  if (values.length === 1) return values[0]!
  if (values.length === 2) return (values[0]! + values[1]!) / 2

  // 3 values — best 2 of 3: drop the minimum
  const sorted = [...values].sort((a, b) => a - b)
  // sorted[0] is lowest — drop it, average sorted[1] and sorted[2]
  return (sorted[1]! + sorted[2]!) / 2
}

// ─── calculateModelExamScore ──────────────────────────────────────────────────
/**
 * Model exam is out of 100 — scale to 50 for consistency with IA.
 */
export function calculateModelExamScore(mark: MarkRecord): number | null {
  if (mark.modelExam === null) return null
  return (mark.modelExam / 100) * 50
}

// ─── calculateESEScore ────────────────────────────────────────────────────────
/**
 * ESE is out of 100 — returned as-is for pass/fail threshold calculation.
 */
export function calculateESEScore(mark: MarkRecord): number | null {
  if (mark.ese === null) return null
  return mark.ese
}

// ─── calculateDirectAttainmentForCO ──────────────────────────────────────────
/**
 * Standard OBE direct attainment calculation for a single CO.
 *
 * NOTE: In the standard OBE model, ALL COs receive the same IA+ESE marks.
 * CO differentiation happens at the PO mapping level, not mark level.
 *
 * @param marks     All student mark records for the subject
 * @param co        The CO being calculated for
 * @param threshold Pass threshold as fraction (e.g. 0.5 = 50% of max)
 */
export function calculateDirectAttainmentForCO(
  marks: MarkRecord[],
  co: CORecord,
  threshold: number
): DirectAttainmentResult {
  const IA_MAX  = 50
  const ESE_MAX = 100

  // ── Step 1: IA attainment ──────────────────────────────────────────────────
  const iaThreshold = IA_MAX * threshold

  let iaTotal    = 0
  let iaPasses   = 0

  for (const m of marks) {
    const score = calculateIAScore(m)
    if (score !== null) {
      iaTotal++
      if (score >= iaThreshold) iaPasses++
    }
  }

  const iaAttainment = safeDivide(iaPasses, iaTotal) * 100

  // ── Step 2: ESE attainment ─────────────────────────────────────────────────
  const eseThreshold = ESE_MAX * threshold

  let eseTotal  = 0
  let esePasses = 0

  for (const m of marks) {
    const score = calculateESEScore(m)
    if (score !== null) {
      eseTotal++
      if (score >= eseThreshold) esePasses++
    }
  }

  const eseAttainment = safeDivide(esePasses, eseTotal) * 100

  // ── Step 3: Combined direct value — 50/50 IA:ESE split ────────────────────
  // This is the calculation-level IA:ESE weightage, separate from
  // the direct/indirect config weightage in AttainmentConfig.
  const directValue = (iaAttainment * 0.5) + (eseAttainment * 0.5)

  return {
    coId:          co.id,
    coNumber:      co.number,
    targetPercent: co.targetPercent,
    iaAttainment,
    eseAttainment,
    directValue,
  }
}

// ─── calculateAllCOsDirectAttainment ─────────────────────────────────────────
/**
 * Calculates direct attainment for all COs.
 * Uses 50% pass threshold (student must score ≥ 50% of max to count as attained).
 */
export function calculateAllCOsDirectAttainment(
  marks: MarkRecord[],
  cos: CORecord[],
  _config: AttainmentConfig
): DirectAttainmentResult[] {
  const PASS_THRESHOLD = 0.5 // 50% of max marks

  return cos
    .slice()
    .sort((a, b) => a.number - b.number)
    .map((co) => calculateDirectAttainmentForCO(marks, co, PASS_THRESHOLD))
}
