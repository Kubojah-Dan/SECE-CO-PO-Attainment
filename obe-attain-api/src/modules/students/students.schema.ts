import { z } from 'zod'

export const createStudentSchema = z.object({
  rollNumber:   z.string().min(2).max(20),
  name:         z.string().min(2).max(100),
  email:        z.string().email().optional(),
  batch:        z.string().regex(/^\d{4}-\d{2}$/, 'Batch must be in format YYYY-YY (e.g. 2022-26)'),
  departmentId: z.string().cuid(),
})

export const updateStudentSchema = createStudentSchema
  .omit({ departmentId: true })
  .partial()

export const listStudentsQuerySchema = z.object({
  departmentId: z.string().cuid().optional(),
  batch:        z.string().optional(),
  search:       z.string().optional(),
  page:         z.coerce.number().int().min(1).default(1),
  limit:        z.coerce.number().int().min(1).max(200).default(50),
})

export const idParamSchema = z.object({ id: z.string().cuid() })

export type CreateStudentDto  = z.infer<typeof createStudentSchema>
export type UpdateStudentDto  = z.infer<typeof updateStudentSchema>
export type ListStudentsQuery = z.infer<typeof listStudentsQuerySchema>
