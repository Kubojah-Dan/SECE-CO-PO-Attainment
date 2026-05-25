import { z } from 'zod'

export const markComponentEnum = z.enum([
  'ia1', 'ia2', 'ia3', 'modelExam', 'ese', 'assignment', 'lab',
])

export type MarkComponent = z.infer<typeof markComponentEnum>

export const MAX_MARKS = {
  ia1:        50,
  ia2:        50,
  ia3:        50,
  modelExam:  100,
  ese:        100,
  assignment: 10,
  lab:        25,
} as const satisfies Record<MarkComponent, number>

export const singleMarkEntrySchema = z
  .object({
    studentId: z.string().cuid(),
    component: markComponentEnum,
    value:     z.number().min(0),
  })
  .superRefine((data, ctx) => {
    const max = MAX_MARKS[data.component as MarkComponent]
    if (data.value > max) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${data.component} mark cannot exceed ${max}`,
        path: ['value'],
      })
    }
  })

export const bulkSaveMarksSchema = z.object({
  marks: z
    .array(
      z.object({
        studentId:  z.string().cuid(),
        ia1:        z.number().min(0).max(50).nullable().optional(),
        ia2:        z.number().min(0).max(50).nullable().optional(),
        ia3:        z.number().min(0).max(50).nullable().optional(),
        modelExam:  z.number().min(0).max(100).nullable().optional(),
        ese:        z.number().min(0).max(100).nullable().optional(),
        assignment: z.number().min(0).max(10).nullable().optional(),
        lab:        z.number().min(0).max(25).nullable().optional(),
      })
    )
    .min(1)
    .max(500),
})

export const importMarksQuerySchema = z.object({
  component: markComponentEnum,
})

export const marksTemplateQuerySchema = z.object({
  component: markComponentEnum,
})

export type SingleMarkEntryDto = z.infer<typeof singleMarkEntrySchema>
export type BulkSaveMarksDto   = z.infer<typeof bulkSaveMarksSchema>
