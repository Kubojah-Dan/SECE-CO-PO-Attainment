/**
 * Final Attainment Engine
 * Pure functions — ZERO Prisma imports, ZERO DB calls.
 * Combines direct + indirect with configured weights.
 */

import type {
  DirectAttainmentResult,
  IndirectAttainmentResult,
  FinalAttainmentResult,
  CORecord,
  AttainmentConfig,
  SubjectAttainmentSummary,
  POAttainmentResult,
  PSOAttainmentResult,
} from './engine.types'
import { safeDivide } from './engine.types'

// ─── calculateFinalAttainmentForCO ───────────────────────────────────────────
/**
 * Weighted combination of direct and indirect attainment.
 *
 * finalValue = (directValue × directWeight) + (indirectValue × indirectWeight)
 *
 * If no indirect survey submitted, indirectValue = 0.
 */
export function calculateFinalAttainmentForCO(
  direct:   DirectAttainmentResult,
  indirect: IndirectAttainmentResult | null,
  config:   AttainmentConfig
): FinalAttainmentResult {
  const directValue   = direct.directValue
  const indirectValue = indirect?.attainment ?? 0

  const finalValue =
    directValue   * config.directWeight +
    indirectValue * config.indirectWeight

  const targetMet = finalValue >= direct.targetPercent

  let attainmentLevel: 'met' | 'near' | 'below'
  if (finalValue >= direct.targetPercent) {
    attainmentLevel = 'met'
  } else if (finalValue >= config.nearTarget) {
    attainmentLevel = 'near'
  } else {
    attainmentLevel = 'below'
  }

  return {
    coId:            direct.coId,
    coNumber:        direct.coNumber,
    targetPercent:   direct.targetPercent,
    directValue,
    indirectValue,
    directWeight:    config.directWeight,
    indirectWeight:  config.indirectWeight,
    finalValue,
    targetMet,
    attainmentLevel,
  }
}

// ─── calculateAllCOsFinalAttainment ───────────────────────────────────────────
/**
 * Calculates final attainment for all COs.
 * Matches direct results to indirect results by CO number.
 */
export function calculateAllCOsFinalAttainment(
  directResults:   DirectAttainmentResult[],
  indirectResults: IndirectAttainmentResult[],
  cos:             CORecord[],
  config:          AttainmentConfig
): FinalAttainmentResult[] {
  // Build a lookup map: coNumber → indirect result
  const indirectByCoNumber = new Map<number, IndirectAttainmentResult>()
  for (const r of indirectResults) {
    indirectByCoNumber.set(r.coNumber, r)
  }

  // Build a direct lookup map: coNumber → direct result
  const directByCoNumber = new Map<number, DirectAttainmentResult>()
  for (const r of directResults) {
    directByCoNumber.set(r.coNumber, r)
  }

  return cos
    .slice()
    .sort((a, b) => a.number - b.number)
    .map((co) => {
      const direct   = directByCoNumber.get(co.number)
      const indirect = indirectByCoNumber.get(co.number) ?? null

      if (!direct) {
        // No direct attainment computed — return zeroed result
        return {
          coId:            co.id,
          coNumber:        co.number,
          targetPercent:   co.targetPercent,
          directValue:     0,
          indirectValue:   indirect?.attainment ?? 0,
          directWeight:    config.directWeight,
          indirectWeight:  config.indirectWeight,
          finalValue:      0,
          targetMet:       false,
          attainmentLevel: 'below' as const,
        }
      }

      return calculateFinalAttainmentForCO(direct, indirect, config)
    })
}

// ─── calculateOverallAttainment ───────────────────────────────────────────────
/**
 * Computes summary statistics across all CO final attainment results.
 */
export function calculateOverallAttainment(finals: FinalAttainmentResult[]): {
  overallDirect:    number
  overallIndirect:  number
  overallFinal:     number
  cosMeetingTarget: number
} {
  if (finals.length === 0) {
    return {
      overallDirect:    0,
      overallIndirect:  0,
      overallFinal:     0,
      cosMeetingTarget: 0,
    }
  }

  const sumDirect   = finals.reduce((a, f) => a + f.directValue,   0)
  const sumIndirect = finals.reduce((a, f) => a + f.indirectValue, 0)
  const sumFinal    = finals.reduce((a, f) => a + f.finalValue,    0)
  const meeting     = finals.filter((f) => f.targetMet).length

  return {
    overallDirect:    safeDivide(sumDirect,   finals.length),
    overallIndirect:  safeDivide(sumIndirect, finals.length),
    overallFinal:     safeDivide(sumFinal,    finals.length),
    cosMeetingTarget: meeting,
  }
}

// ─── buildSubjectAttainmentSummary ────────────────────────────────────────────
/**
 * Assembles all engine results into the final summary object.
 */
export function buildSubjectAttainmentSummary(
  subjectId:    string,
  finals:       FinalAttainmentResult[],
  poAttainment: POAttainmentResult[],
  psoAttainment: PSOAttainmentResult[],
  overall:      ReturnType<typeof calculateOverallAttainment>
): SubjectAttainmentSummary {
  return {
    subjectId,
    cos:              finals,
    poAttainment,
    psoAttainment,
    overallDirect:    overall.overallDirect,
    overallIndirect:  overall.overallIndirect,
    overallFinal:     overall.overallFinal,
    cosMeetingTarget: overall.cosMeetingTarget,
    calculatedAt:     new Date(),
  }
}
