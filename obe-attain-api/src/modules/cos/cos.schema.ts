import { z } from 'zod'

export const createCOSchema = z.object({
  number: z.number().int().min(1).max(6),
  description: z
    .string()
    .min(10, 'Description must be at least 10 characters')
    .max(250),
  bloomsLevel: z.enum([
    'L1_REMEMBER',
    'L2_UNDERSTAND',
    'L3_APPLY',
    'L4_ANALYZE',
    'L5_EVALUATE',
    'L6_CREATE',
  ]),
  targetPercent: z.number().min(0).max(100).default(60),
})

export const updateCOSchema = createCOSchema.partial()

export const setTargetSchema = z.object({
  targetPercent: z.number().min(0).max(100),
})

export const coIdParamSchema = z.object({
  subjectId: z.string().cuid(),
  coId:      z.string().cuid(),
})

export const subjectIdParamSchema = z.object({
  subjectId: z.string().cuid(),
})

export type CreateCODto  = z.infer<typeof createCOSchema>
export type UpdateCODto  = z.infer<typeof updateCOSchema>
export type SetTargetDto = z.infer<typeof setTargetSchema>
