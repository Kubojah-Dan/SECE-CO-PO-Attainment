import { Router } from 'express'
import type { Request, Response } from 'express'
import * as departmentsController from './departments.controller'
import { authorize } from '@/middleware/rbac.middleware'
import { validateBody, validateParams, validateQuery } from '@/middleware/validate.middleware'
import {
  createDepartmentSchema,
  updateDepartmentSchema,
  idParamSchema,
} from './departments.schema'
import {
  getDepartmentPOAttainment,
  getMultiYearPOTrends,
} from '@/modules/attainment/attainment.service'
import { sendSuccess } from '@/utils/ApiResponse'
import { deptAttainmentQuerySchema } from '@/modules/attainment/attainment.schema'

const router = Router()

// ── Standard CRUD ─────────────────────────────────────────────────────────────
router.get('/', authorize('SUPER_ADMIN', 'HOD', 'IQAC'), departmentsController.listDepartments)
router.post('/', authorize('SUPER_ADMIN'), validateBody(createDepartmentSchema), departmentsController.createDepartment)
router.get('/:id', authorize('SUPER_ADMIN', 'HOD', 'IQAC'), validateParams(idParamSchema), departmentsController.getDepartmentById)
router.put('/:id', authorize('SUPER_ADMIN'), validateParams(idParamSchema), validateBody(updateDepartmentSchema), departmentsController.updateDepartment)
router.delete('/:id', authorize('SUPER_ADMIN'), validateParams(idParamSchema), departmentsController.deleteDepartment)

// ── PO/PSO attainment (Phase 3) ───────────────────────────────────────────────
const deptAttainmentAuth = authorize('SUPER_ADMIN', 'HOD', 'IQAC')

router.get(
  '/:id/po-attainment',
  deptAttainmentAuth,
  validateQuery(deptAttainmentQuerySchema),
  async (req: Request, res: Response) => {
    const result = await getDepartmentPOAttainment(
      req.params['id'] as string,
      req.query['academicYearId'] as string | undefined,
      req.user!
    )
    return sendSuccess(res, result)
  }
)

router.get(
  '/:id/po-attainment/trends',
  deptAttainmentAuth,
  async (req: Request, res: Response) => {
    const result = await getMultiYearPOTrends(
      req.params['id'] as string,
      req.user!
    )
    return sendSuccess(res, result)
  }
)

router.get(
  '/:id/po-attainment/year/:year',
  deptAttainmentAuth,
  async (req: Request, res: Response) => {
    // Resolve year name to academicYearId
    const { prisma } = await import('@/config/prisma')
    const yearRecord = await prisma.academicYear.findFirst({
      where: { name: req.params['year'] as string },
    })
    const result = await getDepartmentPOAttainment(
      req.params['id'] as string,
      yearRecord?.id,
      req.user!
    )
    return sendSuccess(res, result)
  }
)

router.get(
  '/:id/pso-attainment',
  deptAttainmentAuth,
  validateQuery(deptAttainmentQuerySchema),
  async (req: Request, res: Response) => {
    const result = await getDepartmentPOAttainment(
      req.params['id'] as string,
      req.query['academicYearId'] as string | undefined,
      req.user!
    )
    // Return only PSO portion
    return sendSuccess(res, {
      departmentId:  result.departmentId,
      academicYear:  result.academicYear,
      psoAttainment: result.psoAttainment,
      subjectCount:  result.subjectCount,
      calculatedAt:  result.calculatedAt,
    })
  }
)

export { router as departmentsRouter }

