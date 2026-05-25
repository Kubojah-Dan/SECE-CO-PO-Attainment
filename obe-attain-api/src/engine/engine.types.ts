// ─── Pure data types — zero Prisma imports ───────────────────────────────────

export interface MarkRecord {
  studentId:  string
  ia1:        number | null
  ia2:        number | null
  ia3:        number | null
  modelExam:  number | null
  ese:        number | null
  assignment: number | null
  lab:        number | null
}

export interface CORecord {
  id:            string
  number:        number
  targetPercent: number
}

export interface MappingRecord {
  coId:  string
  poId:  string | null
  psoId: string | null
  level: number // 0, 1, 2, 3
}

export interface AttainmentConfig {
  directWeight:   number // e.g. 0.8
  indirectWeight: number // e.g. 0.2
  targetMet:      number // e.g. 60 (percentage threshold)
  nearTarget:     number // e.g. 50
}

export interface COMarkSplit {
  coId:     string
  coNumber: number
  iaWeight: number  // fraction of IA contributing to this CO (0–1)
  eseWeight: number // fraction of ESE contributing to this CO (0–1)
}

export interface DirectAttainmentResult {
  coId:          string
  coNumber:      number
  targetPercent: number
  iaAttainment:  number // percentage of students meeting IA threshold
  eseAttainment: number // percentage of students meeting ESE threshold
  directValue:   number // weighted combination
}

export interface IndirectAttainmentResult {
  coNumber:   number
  avgScore:   number // average of Q1–Q5 Likert scores (1–5)
  attainment: number // scaled to 0–100
}

export interface FinalAttainmentResult {
  coId:            string
  coNumber:        number
  targetPercent:   number
  directValue:     number
  indirectValue:   number
  directWeight:    number
  indirectWeight:  number
  finalValue:      number
  targetMet:       boolean
  attainmentLevel: 'met' | 'near' | 'below'
}

export interface POAttainmentResult {
  poId:       string
  poCode:     string
  attainment: number  // weighted average of contributing CO attainments
  targetMet:  boolean
}

export interface PSOAttainmentResult {
  psoId:      string
  psoCode:    string
  attainment: number
  targetMet:  boolean
}

export interface SubjectAttainmentSummary {
  subjectId:        string
  cos:              FinalAttainmentResult[]
  poAttainment:     POAttainmentResult[]
  psoAttainment:    PSOAttainmentResult[]
  overallDirect:    number // average direct across all COs
  overallIndirect:  number // average indirect across all COs
  overallFinal:     number // average final across all COs
  cosMeetingTarget: number // count of COs where targetMet=true
  calculatedAt:     Date
}

// ─── Precision helpers ────────────────────────────────────────────────────────

/** Round to 2 decimal places — for API response display */
export const round2 = (n: number): number => Math.round(n * 100) / 100

/** Round to 4 decimal places — for DB persistence */
export const round4 = (n: number): number => Math.round(n * 10000) / 10000

/** Safe division — returns 0 if denominator is 0 */
export const safeDivide = (num: number, den: number): number =>
  den === 0 ? 0 : num / den

/** Sanitise — replaces NaN/Infinity with 0 for API safety */
export const sanitise = (v: number): number =>
  isFinite(v) && !isNaN(v) ? v : 0
