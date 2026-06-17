/* Phase 4 type additions — append to existing api.ts */

/* ── PO/PSO Attainment ── */
export interface POAttainmentItem {
  po: string
  description: string
  attainment: number
  target: number
  trend?: number
}

export interface PSOAttainmentItem {
  pso: string
  description: string
  attainment: number
  target: number
  trend?: number
}

export interface POTrendPoint {
  year: string
  po: Record<string, number>
}

export interface DeptPOAttainment {
  poAttainment: POAttainmentItem[]
  psoAttainment: PSOAttainmentItem[]
  coPoMatrix: Record<string, Record<string, number>>
  trends: POTrendPoint[]
}

/* ── Reports ── */
export type ReportJobStatus = 'pending' | 'done' | 'failed'

export interface ReportJob {
  id: string
  filename: string
  type: string
  status: ReportJobStatus
  createdAt: string
  downloadUrl?: string
}

/* ── Admin: Users ── */
export interface AdminUser {
  id: string
  name: string
  email: string
  employeeId?: string
  role: string
  departmentId?: string
  departmentName?: string
  status: 'active' | 'inactive'
  lastLogin?: string
}

/* ── Admin: Students ── */
export interface Student {
  id: string
  rollNo: string
  name: string
  departmentId: string
  departmentName?: string
  batch: string
  email?: string
}

/* ── Admin: Regulations ── */
export interface Regulation {
  id: string
  code: string
  name: string
  subjectCount?: number
}

export interface AcademicYear {
  id: string
  label: string
  isCurrent: boolean
}

/* ── Admin: Attainment Settings ── */
export interface AttainmentSettings {
  directWeight: number
  indirectWeight: number
  targetMetThreshold: number
  nearTargetThreshold: number
}

/* ── Admin: Backup ── */
export interface BackupEntry {
  id: string
  filename: string
  createdAt: string
  sizeKb: number
}

/* ── Admin: Audit Logs ── */
export interface AuditLog {
  id: string
  timestamp: string
  userName: string
  userRole: string
  action: string
  entity: string
  details: string
  ipAddress: string
}

/* ── IQAC Analytics ── */
export interface IqacDeptComparison {
  deptId: string
  name: string
  poAvg: number
  psoAvg: number
  subjects: number
  status: 'met' | 'partial' | 'below'
  yoyChange: number
}

export interface IqacInstitutionAnalytics {
  poAvg: number
  psoAvg: number
  deptsReporting: number
  subjectsComplete: number
  poTrend: number
  psoTrend: number
  poBars: { po: string; current: number; previous: number }[]
  psoBars: { pso: string; depts: Record<string, number> }[]
  deptComparison: IqacDeptComparison[]
}

/* ── IQAC Accreditation ── */
export interface ChecklistItem {
  id: string
  label: string
  passed: boolean
  deptBreakdown?: { deptName: string; passed: boolean; details?: string }[]
}

export interface DeptReadiness {
  deptId: string
  name: string
  expanded?: boolean
  checklist: ChecklistItem[]
}

export interface AccreditationStatus {
  readiness: 'ready' | 'partial' | 'not-ready'
  totalDepts: number
  completeDepts: number
  blockingItems: string[]
  checklist: ChecklistItem[]
  deptReadiness: DeptReadiness[]
}
