/**
 * PO / PSO Attainment Engine
 * Pure functions — ZERO Prisma imports, ZERO DB calls.
 * NBA standard weighted average method.
 *
 * Formula: attainment = Σ(level × coFinalValue) / Σ(level)
 * for all CO-PO mappings where level > 0.
 */

import type {
  FinalAttainmentResult,
  MappingRecord,
  POAttainmentResult,
  PSOAttainmentResult,
  AttainmentConfig,
  SubjectAttainmentSummary,
} from './engine.types'
import { safeDivide } from './engine.types'
import { calculateOverallAttainment, buildSubjectAttainmentSummary } from './finalAttainment.engine'

// ─── calculatePOAttainment ────────────────────────────────────────────────────
/**
 * NBA weighted average PO attainment.
 *
 * For each PO:
 *   numerator   = Σ (mapping.level × co.finalValue)
 *   denominator = Σ (mapping.level)
 *   attainment  = numerator / denominator
 *
 * POs with no CO mappings (level > 0) get attainment = 0.
 */
export function calculatePOAttainment(
  finalResults: FinalAttainmentResult[],
  mappings:     MappingRecord[],
  pos:          { id: string; code: string; number: number }[],
  config:       AttainmentConfig
): POAttainmentResult[] {
  // Build coId → finalValue lookup
  const finalByCOId = new Map<string, number>()
  for (const r of finalResults) {
    finalByCOId.set(r.coId, r.finalValue)
  }

  return pos
    .slice()
    .sort((a, b) => a.number - b.number)
    .map((po) => {
      const relevantMappings = mappings.filter(
        (m) => m.poId === po.id && m.level > 0
      )

      let numerator   = 0
      let denominator = 0

      for (const m of relevantMappings) {
        const coFinalValue = finalByCOId.get(m.coId) ?? 0
        numerator   += m.level * coFinalValue
        denominator += m.level
      }

      const attainment = safeDivide(numerator, denominator)
      const targetMet  = attainment >= config.targetMet

      return {
        poId:       po.id,
        poCode:     po.code,
        attainment,
        targetMet,
      }
    })
}

// ─── calculatePSOAttainment ───────────────────────────────────────────────────
/**
 * Identical formula to PO attainment, using psoId instead of poId.
 */
export function calculatePSOAttainment(
  finalResults: FinalAttainmentResult[],
  mappings:     MappingRecord[],
  psos:         { id: string; code: string; number: number }[],
  config:       AttainmentConfig
): PSOAttainmentResult[] {
  // Build coId → finalValue lookup
  const finalByCOId = new Map<string, number>()
  for (const r of finalResults) {
    finalByCOId.set(r.coId, r.finalValue)
  }

  return psos
    .slice()
    .sort((a, b) => a.number - b.number)
    .map((pso) => {
      const relevantMappings = mappings.filter(
        (m) => m.psoId === pso.id && m.level > 0
      )

      let numerator   = 0
      let denominator = 0

      for (const m of relevantMappings) {
        const coFinalValue = finalByCOId.get(m.coId) ?? 0
        numerator   += m.level * coFinalValue
        denominator += m.level
      }

      const attainment = safeDivide(numerator, denominator)
      const targetMet  = attainment >= config.targetMet

      return {
        psoId:      pso.id,
        psoCode:    pso.code,
        attainment,
        targetMet,
      }
    })
}

// ─── Re-export summary builder for service convenience ───────────────────────
export { calculateOverallAttainment, buildSubjectAttainmentSummary }
