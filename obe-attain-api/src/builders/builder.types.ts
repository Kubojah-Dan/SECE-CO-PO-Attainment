// ─── Builder data types — zero Prisma imports ────────────────────────────────
// Data is always fetched in the service layer and passed as plain objects.

export interface COAttainmentReportData {
  institution:  string
  department:   string
  subject:      { code: string; name: string; semester: number; type: string }
  regulation:   string
  academicYear: string
  faculty:      string[]
  generatedAt:  Date
  cos: {
    number:          number
    description:     string
    bloomsLevel:     string
    targetPercent:   number
    iaAttainment:    number
    eseAttainment:   number
    directValue:     number
    indirectValue:   number
    finalValue:      number
    targetMet:       boolean
    attainmentLevel: 'met' | 'near' | 'below'
  }[]
  mapping: {
    coNumber:    number
    poMappings:  Record<string, number>
    psoMappings: Record<string, number>
  }[]
  poAttainment: {
    code:        string
    description: string
    attainment:  number
    targetMet:   boolean
  }[]
  psoAttainment: {
    code:        string
    description: string
    attainment:  number
    targetMet:   boolean
  }[]
  summary: {
    overallDirect:    number
    overallIndirect:  number
    overallFinal:     number
    cosMeetingTarget: number
    totalCOs:         number
  }
}

export interface StudentPerformanceReportData {
  institution:  string
  department:   string
  subject:      { code: string; name: string; semester: number }
  regulation:   string
  academicYear: string
  faculty:      string[]
  generatedAt:  Date
  students: {
    rollNumber:  string
    name:        string
    ia1:         number | null
    ia2:         number | null
    ia3:         number | null
    iaAverage:   number | null
    modelExam:   number | null
    ese:         number | null
    assignment:  number | null
    lab:         number | null
    total:       number | null
    percentage:  number | null
    result:      'Pass' | 'Fail' | 'Absent'
  }[]
  classStats: {
    totalStudents:  number
    appeared:       number
    passed:         number
    passPercentage: number
    classAverage:   number
    highest:        number
    lowest:         number
  }
}

export interface POAttainmentReportData {
  institution:  string
  department:   string
  regulation:   string
  academicYear: string
  generatedAt:  Date
  subjects: {
    code:     string
    name:     string
    semester: number
    faculty:  string
    coCount:  number
    avgFinal: number
  }[]
  poAttainment: {
    code:        string
    number:      number
    description: string
    attainment:  number
    targetMet:   boolean
  }[]
  psoAttainment: {
    code:        string
    number:      number
    description: string
    attainment:  number
    targetMet:   boolean
  }[]
  subjectMatrix: {
    subjectCode: string
    poValues:    Record<string, number>
  }[]
}

export interface NBAReportData {
  institution:  string
  generatedAt:  Date
  academicYear: string
  departments: {
    name:                string
    code:                string
    totalSubjects:       number
    approvedSubjects:    number
    poAttainment:        Record<string, number>
    psoAttainment:       Record<string, number>
    overallAvg:          number
    accreditationStatus: 'ready' | 'partial' | 'not-ready'
  }[]
  institutionSummary: {
    totalDepts:   number
    readyDepts:   number
    overallPOAvg: number
    overallPSOAvg: number
  }
}

export type ReportFormat = 'pdf' | 'excel'

export const MIME_TYPES: Record<ReportFormat, string> = {
  pdf:   'application/pdf',
  excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
}
