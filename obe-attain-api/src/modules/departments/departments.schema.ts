import { z } from 'zod'

export const createDepartmentSchema = z.object({
  name: z.string().min(2).max(100),
  code: z.string().min(2).max(10).toUpperCase(),
  description: z.string().max(500).optional(),
  hodId: z.string().cuid().optional(),
})

export const updateDepartmentSchema = createDepartmentSchema.partial()
export const idParamSchema = z.object({ id: z.string().cuid() })

export type CreateDepartmentDto = z.infer<typeof createDepartmentSchema>
export type UpdateDepartmentDto = z.infer<typeof updateDepartmentSchema>
