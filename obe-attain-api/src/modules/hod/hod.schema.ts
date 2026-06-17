import { z } from 'zod'

export const rejectSchema = z.object({
  remark: z.string().min(10).max(1000),
})

export const approvalStatusSchema = z.object({
  status: z.enum(['SUBMITTED', 'APPROVED', 'REJECTED']).optional(),
})

export type RejectDto           = z.infer<typeof rejectSchema>
export type ApprovalStatusQuery = z.infer<typeof approvalStatusSchema>
