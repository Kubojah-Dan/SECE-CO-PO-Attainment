import { z } from 'zod'

export const submitIndirectSchema = z.object({
  surveys: z
    .array(
      z.object({
        coNumber: z.number().int().min(1).max(6),
        q1: z.number().min(1).max(5).nullable(),
        q2: z.number().min(1).max(5).nullable(),
        q3: z.number().min(1).max(5).nullable(),
        q4: z.number().min(1).max(5).nullable(),
        q5: z.number().min(1).max(5).nullable(),
      })
    )
    .min(1),
})

export const updateConfigSchema = z
  .object({
    directWeight:   z.number().min(0).max(1),
    indirectWeight: z.number().min(0).max(1),
    targetMet:      z.number().min(0).max(100),
    nearTarget:     z.number().min(0).max(100),
  })
  .superRefine((d, ctx) => {
    if (Math.abs(d.directWeight + d.indirectWeight - 1) >= 0.0001) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'directWeight and indirectWeight must sum to 1.0',
        path: ['directWeight'],
      })
    }
    if (d.nearTarget >= d.targetMet) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'nearTarget must be less than targetMet',
        path: ['nearTarget'],
      })
    }
  })

export const deptAttainmentQuerySchema = z.object({
  academicYearId: z.string().cuid().optional(),
})

export type SubmitIndirectDto = z.infer<typeof submitIndirectSchema>
export type UpdateConfigDto   = z.infer<typeof updateConfigSchema>
