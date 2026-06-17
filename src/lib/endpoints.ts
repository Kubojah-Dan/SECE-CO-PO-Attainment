/* ─────────────────────────────────────────────
   OBE Attain — API Endpoint Constants
   ───────────────────────────────────────────── */

export const EP = {
  /* Auth */
  AUTH_LOGIN:   '/api/auth/login',
  AUTH_LOGOUT:  '/api/auth/logout',
  AUTH_ME:      '/api/auth/me',
  AUTH_REFRESH: '/api/auth/refresh',

  /* Analytics */
  ANALYTICS_ADMIN:    '/api/analytics/admin/overview',
  ANALYTICS_HOD:      '/api/analytics/hod/department',
  ANALYTICS_FACULTY:  '/api/analytics/faculty/subjects',
  ANALYTICS_IQAC:     '/api/analytics/iqac/institution',

  /* Departments */
  DEPARTMENTS:            '/api/departments',
  DEPARTMENT_BY_ID:       (id: string) => `/api/departments/${id}`,
  DEPARTMENT_CREATE:      '/api/departments',
  DEPARTMENT_UPDATE:      (id: string) => `/api/departments/${id}`,
  DEPARTMENT_DELETE:      (id: string) => `/api/departments/${id}`,
  DEPARTMENT_SUBJECTS:    (id: string) => `/api/departments/${id}/subjects`,
  DEPARTMENT_FACULTY:     (id: string) => `/api/departments/${id}/faculty`,
  DEPT_PO_ATTAINMENT:     (deptId: string) => `/api/departments/${deptId}/po-attainment`,
  DEPT_PO_ATTAINMENT_YEAR:(deptId: string, year: string) => `/api/departments/${deptId}/po-attainment/year/${year}`,
  DEPT_PO_TRENDS:         (deptId: string) => `/api/departments/${deptId}/po-attainment/trends`,
  DEPT_PSO_ATTAINMENT:    (deptId: string) => `/api/departments/${deptId}/pso-attainment`,

  /* Subjects */
  SUBJECTS:               '/api/subjects',
  SUBJECT_BY_ID:          (id: string) => `/api/subjects/${id}`,
  SUBJECT_CREATE:         '/api/subjects',
  SUBJECT_UPDATE:         (id: string) => `/api/subjects/${id}`,
  SUBJECT_DELETE:         (id: string) => `/api/subjects/${id}`,
  SUBJECT_ASSIGN_FACULTY: (id: string) => `/api/subjects/${id}/assign`,
  SUBJECT_COS:            (id: string) => `/api/subjects/${id}/cos`,
  SUBJECT_MARKS:          (id: string) => `/api/subjects/${id}/marks`,
  SUBJECT_ATTAINMENT:     (id: string) => `/api/subjects/${id}/attainment`,
  SUBJECT_SUBMIT:         (id: string) => `/api/subjects/${id}/submit`,
  SUBJECT_APPROVE:        (id: string) => `/api/subjects/${id}/approve`,
  SUBJECT_REJECT:         (id: string) => `/api/subjects/${id}/reject`,
  SUBJECT_FACULTY:        (id: string) => `/api/subjects/${id}/faculty`,

  /* Course Outcomes */
  COS_BY_SUBJECT:   (subjectId: string) => `/api/subjects/${subjectId}/cos`,
  CO_CREATE:        (subjectId: string) => `/api/subjects/${subjectId}/cos`,
  CO_UPDATE:        (subjectId: string, coId: string) => `/api/subjects/${subjectId}/cos/${coId}`,
  CO_DELETE:        (subjectId: string, coId: string) => `/api/subjects/${subjectId}/cos/${coId}`,
  CO_PO_MAPPING:    (subjectId: string) => `/api/subjects/${subjectId}/co-po-mapping`,

  /* Marks */
  MARKS_UPLOAD:     (subjectId: string) => `/api/subjects/${subjectId}/marks/upload`,
  MARKS_TEMPLATE:   (subjectId: string) => `/api/subjects/${subjectId}/marks/template`,
  MARKS_DIRECT:     (subjectId: string) => `/api/subjects/${subjectId}/marks/direct`,
  MARKS_INDIRECT:   (subjectId: string) => `/api/subjects/${subjectId}/marks/indirect`,

  /* Attainment */
  ATTAINMENT_CALCULATE:   (subjectId: string) => `/api/subjects/${subjectId}/attainment/calculate`,
  ATTAINMENT_CO:          (subjectId: string) => `/api/subjects/${subjectId}/attainment/co`,
  ATTAINMENT_PO:          (subjectId: string) => `/api/subjects/${subjectId}/attainment/po`,
  ATTAINMENT_DEPT_PO:     (deptId: string)    => `/api/departments/${deptId}/attainment/po`,
  ATTAINMENT_DEPT_PSO:    (deptId: string)    => `/api/departments/${deptId}/attainment/pso`,
  ATTAINMENT_INSTITUTION: '/api/attainment/institution',
  ATTAINMENT_SETTINGS:    '/api/attainment/settings',

  /* PO / PSO */
  PO_LIST:        '/api/pos',
  PO_BY_ID:       (id: string) => `/api/pos/${id}`,
  PO_UPDATE:      (id: string) => `/api/pos/${id}`,
  PSO_LIST:       '/api/psos',
  PSO_BY_ID:      (id: string) => `/api/psos/${id}`,
  PSO_UPDATE:     (id: string) => `/api/psos/${id}`,

  /* Students */
  STUDENTS:           '/api/students',
  STUDENT_BY_ID:      (id: string) => `/api/students/${id}`,
  STUDENT_CREATE:     '/api/students',
  STUDENT_UPDATE:     (id: string) => `/api/students/${id}`,
  STUDENT_DELETE:     (id: string) => `/api/students/${id}`,
  STUDENTS_IMPORT:    '/api/students/import',
  STUDENTS_TEMPLATE:  '/api/students/template',

  /* Users */
  USERS:          '/api/users',
  USER_BY_ID:     (id: string) => `/api/users/${id}`,
  USER_CREATE:    '/api/users',
  USER_UPDATE:    (id: string) => `/api/users/${id}`,
  USER_DELETE:    (id: string) => `/api/users/${id}`,

  /* Regulations */
  REGULATIONS:        '/api/regulations',
  REGULATION_BY_ID:   (id: string) => `/api/regulations/${id}`,
  REGULATION_CREATE:  '/api/regulations',
  REGULATION_UPDATE:  (id: string) => `/api/regulations/${id}`,
  ACADEMIC_YEARS:     '/api/academic-years',
  ACADEMIC_YEAR_UPDATE: (id: string) => `/api/academic-years/${id}`,

  /* Reports */
  REPORTS_JOBS:       '/api/reports/jobs',
  REPORT_JOB_BY_ID:   (jobId: string) => `/api/reports/jobs/${jobId}`,
  REPORT_JOB_DOWNLOAD:(jobId: string) => `/api/reports/jobs/${jobId}/download`,
  REPORT_SUBJECT_CO:  (subjectId: string) => `/api/reports/subjects/${subjectId}/co-attainment`,
  REPORT_SUBJECT_PERF:(subjectId: string) => `/api/reports/subjects/${subjectId}/student-performance`,
  REPORT_DEPT_PO:     (deptId: string)    => `/api/reports/departments/${deptId}/po-attainment`,
  REPORT_NBA:         '/api/reports/nba',
  REPORT_NAAC:        '/api/reports/naac',
  REPORT_HISTORY:     '/api/reports/history',

  /* HOD Approvals */
  HOD_PENDING:        '/api/hod/pending-approvals',

  /* Audit Logs */
  AUDIT_LOGS:         '/api/audit-logs',
  AUDIT_EXPORT:       '/api/audit-logs/export',

  /* Settings / Config */
  SETTINGS:           '/api/attainment/settings',
  CONFIG_THRESHOLDS:  '/api/config/thresholds',
  CONFIG_BACKUP:      '/api/config/backup',
  CONFIG_BACKUP_LIST: '/api/config/backup/list',
} as const
