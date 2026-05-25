/**
 * Indirect Attainment Engine
 * Pure functions — ZERO Prisma imports, ZERO DB calls.
 * Likert scale (1–5) → 0–100 percentage.
 */

import type { IndirectAttainmentResult } from './engine.types'
import { safeDivide } from './engine.types'

interface SurveyInput {
  coNumber: number
  q1:       number | null
  q2:       number | null
  q3:       number | null
  q4:       number | null
  q5:       number | null
}

// ─── calculateIndirectAttainmentForCO ────────────────────────────────────────
/**
 * Converts Likert scale survey responses (1–5) to a 0–100 attainment value.
 *
 * Formula:
 *   avgScore  = mean of non-null Q1–Q5 values
 *   attainment = ((avgScore - 1) / 4) * 100
 *
 * Rationale:
 *   min Likert = 1 → 0%
 *   max Likert = 5 → 100%
 *   score 3    → 50%
 */
export function calculateIndirectAttainmentForCO(
  survey: SurveyInput
): IndirectAttainmentResult {
  const scores = [survey.q1, survey.q2, survey.q3, survey.q4, survey.q5].filter(
    (v): v is number => v !== null
  )

  if (scores.length === 0) {
    return { coNumber: survey.coNumber, avgScore: 0, attainment: 0 }
  }

  const sum      = scores.reduce((acc, v) => acc + v, 0)
  const avgScore = safeDivide(sum, scores.length)

  // Scale Likert (1–5) to percentage (0–100)
  const attainment = safeDivide(avgScore - 1, 4) * 100

  return {
    coNumber: survey.coNumber,
    avgScore,
    attainment,
  }
}

// ─── calculateAllCOsIndirectAttainment ───────────────────────────────────────
/**
 * Computes indirect attainment for all COs that have survey data.
 */
export function calculateAllCOsIndirectAttainment(
  surveys: SurveyInput[]
): IndirectAttainmentResult[] {
  return surveys.map(calculateIndirectAttainmentForCO)
}
