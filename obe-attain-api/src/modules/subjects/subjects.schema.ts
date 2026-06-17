import { z } from 'zod'

export const createSubjectSchema = z.object({
  code:           z.string().min(2).max(20).transform((v) => v.toUpperCase()),
  name:           z.string().min(2).max(150),
  semester:       z.number().int().min(1).max(8),
  type:           z.enum(['THEORY', 'LAB', 'BOTH']).default('THEORY'),
  departmentId:   z.string().cuid(),
  regulationId:   z.string().cuid(),
  academicYearId: z.string().cuid(),
})

export const updateSubjectSchema = createSubjectSchema
  .omit({ code: true, departmentId: true, regulationId: true, academicYearId: true })
  .partial()

export const assignFacultySchema = z.object({
  facultyIds: z.array(z.string().cuid()).min(1),
})

export const listSubjectsQuerySchema = z.object({
  departmentId:   z.string().cuid().optional(),
  regulationId:   z.string().cuid().optional(),
  academicYearId: z.string().cuid().optional(),
  semester:       z.coerce.number().int().min(1).max(8).optional(),
  status:         z.enum(['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED']).optional(),
  facultyId:      z.string().cuid().optional(),
  search:         z.string().optional(),
  page:           z.coerce.number().int().min(1).default(1),
  limit:          z.coerce.number().int().min(1).max(100).default(20),
})

export const idParamSchema = z.object({ id: z.string().cuid() })

export type CreateSubjectDto  = z.infer<typeof createSubjectSchema>
export type UpdateSubjectDto  = z.infer<typeof updateSubjectSchema>
export type AssignFacultyDto  = z.infer<typeof assignFacultySchema>
export type ListSubjectsQuery = z.infer<typeof listSubjectsQuerySchema>
