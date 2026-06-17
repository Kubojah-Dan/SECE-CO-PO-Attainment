import { Router } from 'express'
import { authorize } from '@/middleware/rbac.middleware'
import * as analyticsService from './analytics.service'
import { sendSuccess } from '@/utils/ApiResponse'
import type { Request, Response } from 'express'

export const analyticsRouter = Router()

analyticsRouter.get(
  '/admin/overview',
  authorize('SUPER_ADMIN'),
  async (_req: Request, res: Response) => {
    const result = await analyticsService.getAdminOverview()
    return sendSuccess(res, result)
  }
)

analyticsRouter.get(
  '/hod/department',
  authorize('HOD'),
  async (req: Request, res: Response) => {
    const result = await analyticsService.getHODDepartmentOverview(req.user!)
    return sendSuccess(res, result)
  }
)

analyticsRouter.get(
  '/faculty/subjects',
  authorize('FACULTY'),
  async (req: Request, res: Response) => {
    const result = await analyticsService.getFacultySubjectOverview(req.user!)
    return sendSuccess(res, result)
  }
)

analyticsRouter.get(
  '/iqac/institution',
  authorize('IQAC', 'SUPER_ADMIN'),
  async (_req: Request, res: Response) => {
    const result = await analyticsService.getIQACInstitutionOverview()
    return sendSuccess(res, result)
  }
)
