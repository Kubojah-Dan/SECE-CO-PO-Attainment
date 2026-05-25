import { z } from 'zod'

// saveMappingSchema — key = coId, value = PO/PSO level maps
export const saveMappingSchema = z.object({
  mapping: z.record(
    z.string().cuid(),
    z.object({
      poMappings:  z.record(z.string().cuid(), z.number().int().min(0).max(3)),
      psoMappings: z.record(z.string().cuid(), z.number().int().min(0).max(3)),
    })
  ),
})

export type SaveMappingDto = z.infer<typeof saveMappingSchema>

// ── Response type (documentation only — not Zod) ──────────────────────────────

export interface MappingCO {
  id:          string
  number:      number
  description: string
  mappings: {
    poMappings:  Record<string, number>
    psoMappings: Record<string, number>
  }
}

export interface MappingResponse {
  cos:  MappingCO[]
  pos:  { id: string; code: string; number: number; description: string }[]
  psos: { id: string; code: string; number: number; description: string }[]
}
