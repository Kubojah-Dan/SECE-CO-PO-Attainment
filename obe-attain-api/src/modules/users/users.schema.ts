import { z } from 'zod'

export const createUserSchema = z
  .object({
    employeeId: z.string().min(2).max(20),
    email: z.string().email().toLowerCase(),
    name: z.string().min(2).max(100),
    role: z.enum(['SUPER_ADMIN', 'HOD', 'FACULTY', 'IQAC']),
    departmentId: z.string().cuid().optional(),
    password: z.string().min(8).optional(),
  })
  .refine(
    (data) => !['HOD', 'FACULTY'].includes(data.role) || !!data.departmentId,
    {
      message: 'departmentId is required for HOD and FACULTY roles',
      path: ['departmentId'],
    }
  )

export const updateUserSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  departmentId: z.string().cuid().optional().nullable(),
  isActive: z.boolean().optional(),
})

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z
    .string()
    .min(8)
    .regex(/[A-Z]/, 'Must contain uppercase')
    .regex(/[0-9]/, 'Must contain number'),
})

export const listUsersQuerySchema = z.object({
  role: z.enum(['SUPER_ADMIN', 'HOD', 'FACULTY', 'IQAC']).optional(),
  departmentId: z.string().optional(),
  search: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export const idParamSchema = z.object({ id: z.string().cuid() })

export type CreateUserDto = z.infer<typeof createUserSchema>
export type UpdateUserDto = z.infer<typeof updateUserSchema>
export type ChangePasswordDto = z.infer<typeof changePasswordSchema>
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>
