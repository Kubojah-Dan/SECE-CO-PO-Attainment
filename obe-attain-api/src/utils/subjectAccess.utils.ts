import { Prisma } from '@prisma/client'
import { prisma } from '@/config/prisma'
import { ApiError } from '@/utils/ApiError'

export interface RequestingUser {
  userId: string
  role: string
  email: string
}

type SubjectWithFacultyAndDept = Prisma.SubjectGetPayload<{
  include: {
    faculty: true
    department: true
  }
}>

/**
 * Verifies that the requesting user is allowed to access the given subject.
 * - FACULTY: must be in SubjectFaculty for this subject
 * - HOD: subject must belong to their department
 * - SUPER_ADMIN: always allowed
 * - IQAC: always allowed (read-only enforcement is at route level)
 *
 * Returns the fetched subject on success, throws ApiError on failure.
 */
export async function verifySubjectAccess(
  subjectId: string,
  requestingUser: RequestingUser
): Promise<SubjectWithFacultyAndDept> {
  let subject: SubjectWithFacultyAndDept

  try {
    subject = await prisma.subject.findUniqueOrThrow({
      where: { id: subjectId },
      include: { faculty: true, department: true },
    })
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === 'P2025'
    ) {
      throw ApiError.notFound('Subject not found')
    }
    throw err
  }

  const { role, userId } = requestingUser

  if (role === 'SUPER_ADMIN' || role === 'IQAC') {
    return subject
  }

  if (role === 'FACULTY') {
    const assigned = subject.faculty.some((sf) => sf.facultyId === userId)
    if (!assigned) {
      throw ApiError.forbidden('You are not assigned to this subject')
    }
    return subject
  }

  if (role === 'HOD') {
    // Fetch HOD's departmentId from DB (req.user only has userId/role/email)
    const hodUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { departmentId: true },
    })
    if (!hodUser?.departmentId || hodUser.departmentId !== subject.departmentId) {
      throw ApiError.forbidden('This subject belongs to a different department')
    }
    return subject
  }

  throw ApiError.forbidden('Insufficient permissions')
}
