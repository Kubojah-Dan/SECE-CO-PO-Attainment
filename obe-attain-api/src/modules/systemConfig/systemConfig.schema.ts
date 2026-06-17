import { z } from 'zod'

export const updateThresholdsSchema = z
  .object({
    targetMet:      z.number().min(0).max(100),
    nearTarget:     z.number().min(0).max(100),
    directWeight:   z.number().min(0).max(1).optional(),
    indirectWeight: z.number().min(0).max(1).optional(),
  })
  .refine((d) => d.nearTarget < d.targetMet, {
    message: 'nearTarget must be less than targetMet',
  })

export const restoreSchema = z.object({
  filename:  z.string().regex(/^backup-\d+\.json$/, 'Invalid backup filename'),
  confirmed: z.literal(true, { message: 'Send { confirmed: true } to proceed with restore' }),
})

export type UpdateThresholdsDto = z.infer<typeof updateThresholdsSchema>
export type RestoreDto          = z.infer<typeof restoreSchema>
