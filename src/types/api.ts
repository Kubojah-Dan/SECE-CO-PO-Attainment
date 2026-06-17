/* ─────────────────────────────────────────────
   OBE Attain — API Response Type Definitions
   ───────────────────────────────────────────── */

/* ── Admin Analytics ── */
export interface DepartmentBreakdown {
  name: string
  subjects: number
  avgAttainment: number
}

export interface AdminOverview {
  totalDepartments: number
  totalSubjects: number
  totalFaculty: number
  totalStudents: number
  submissionsComplete: number
  submissionsPending: number
  avgDirectAttainment: number
  avgFinalAttainment: number
  departmentBreakdown: DepartmentBreakdown[]
}

/* ── HOD Analytics ── */
export interface FacultyProgress {
  name: string
  subjectsAssigned: number
  submitted: number
}

export type SubjectStatus = 'draft' | 'submitted' | 'approved' | 'rejected' | 'pending'

export interface HodSubjectStatus {
  code: string
  name: string
  faculty: string
  status: SubjectStatus
}

export interface HodDepartmentData {
  departmentName: string
  totalSubjects: number
  completedSubjects: number
  pendingApprovals: number
  facultyList: FacultyProgress[]
  subjectStatus: HodSubjectStatus[]
}

/* ── Faculty Analytics ── */
export interface AssignedSubject {
  id: string
  code: string
  name: string
  semester: number
  cosDefined: number
  marksUploaded: boolean
  attainmentCalculated: boolean
  status: SubjectStatus
  rejectionRemark?: string
}

export interface FacultySubjectsData {
  facultyName: string
  assignedSubjects: AssignedSubject[]
}

/* ── IQAC Analytics ── */
export type AccreditationReadiness = 'ready' | 'partial' | 'not-ready'

export interface DeptSummary {
  name: string
  poAttainment: number
  psoAttainment: number
  subjectsReported: number
}

export interface IqacInstitutionData {
  totalDepartments: number
  overallPOAttainment: number
  overallPSOAttainment: number
  departmentSummary: DeptSummary[]
  accreditationReadiness: AccreditationReadiness
}

/* ── Generic ── */
export interface ApiErrorBody {
  status: number
  message: string
}

export interface Department {
  id: string
  name: string
  code: string
}

export interface Subject {
  id: string
  code: string
  name: string
  semester: number
  departmentId: string
  facultyId?: string
  facultyName?: string
  regulation?: string
  status: SubjectStatus
  isLab?: boolean
}

export interface UserRecord {
  id: string
  name: string
  email: string
  role: string
  departmentId?: string
}

/* ── Phase 3: Course Outcomes ── */
export type BloomsLevel = 'L1' | 'L2' | 'L3' | 'L4' | 'L5' | 'L6'

export interface CourseOutcome {
  id: string
  coNumber: string   // e.g. "CO1"
  description: string
  bloomsLevel: BloomsLevel
  targetPercentage: number
}

/* ── Phase 3: CO-PO Mapping ── */
export type MappingWeight = 0 | 1 | 2 | 3

export interface COPOMapping {
  // keyed by coId → { PO1: weight, PO2: weight, … PSO1: weight, PSO2: weight }
  mapping: Record<string, Record<string, MappingWeight>>
  poList: POItem[]
  psoList: PSOItem[]
}

export interface POItem {
  id: string
  code: string   // "PO1"…"PO12"
  description: string
}

export interface PSOItem {
  id: string
  code: string   // "PSO1" / "PSO2"
  description: string
}

/* ── Phase 3: Marks ── */
export type MarkComponent = 'internal' | 'model' | 'ese' | 'assignment' | 'lab'

export interface StudentMark {
  rollNo: string
  name: string
  marks: Record<string, number | null>   // componentKey → mark value
}

export interface MarksData {
  subjectId: string
  components: MarkComponentDef[]
  students: StudentMark[]
}

export interface MarkComponentDef {
  key: string
  label: string
  maxMarks: number
  type: MarkComponent
  coMappings: string[]  // ["CO1","CO2"]
}

/* ── Phase 3: Attainment ── */
export interface COAttainmentRow {
  coId: string
  coNumber: string
  description: string
  targetPercentage: number
  directAttainment: number
  indirectAttainment: number | null
  finalAttainment: number | null
}

export interface AttainmentData {
  subjectId: string
  subjectCode: string
  subjectName: string
  coAttainment: COAttainmentRow[]
  indirectSubmitted: boolean
  allCalculated: boolean
}

export interface SurveyQuestion {
  id: string
  text: string
  coId: string
}

/* ── Phase 3: HOD Approvals ── */
export interface PendingApproval {
  id: string
  subjectCode: string
  subjectName: string
  facultyName: string
  submittedAt: string
  avgCOAttainment: number
  status: SubjectStatus
  remark?: string
}

export interface ApprovalDetail {
  subject: Subject
  coAttainment: COAttainmentRow[]
  mapping: COPOMapping
}
