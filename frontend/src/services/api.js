/**
 * SECE CO-PO Platform — Axios API Service Layer
 * Centralized HTTP client with JWT interceptors
 */
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Accept': 'application/json',
  },
});

// ── Request Interceptor: Attach JWT ──────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response Interceptor: Auto-refresh on 401 ───────────────
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) {
        // No refresh token — force logout
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        const response = await axios.post(`${API_BASE_URL}/auth/refresh/`, {
          refresh: refreshToken,
        });
        const newAccess = response.data.access;
        localStorage.setItem('access_token', newAccess);
        processQueue(null, newAccess);
        originalRequest.headers.Authorization = `Bearer ${newAccess}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;

// ── Domain-Specific Service Modules ─────────────────────────

export const authService = {
  login: (credentials) => api.post('/auth/login/', credentials),
  logout: (refresh) => api.post('/auth/logout/', { refresh }),
  me: () => api.get('/auth/me/'),
  updateMe: (data) => {
    if (data instanceof FormData) {
      return api.patch('/auth/me/', data, {
        headers: { 'Content-Type': undefined } // Let Axios handle it
      });
    }
    return api.patch('/auth/me/', data);
  },
  changePassword: (data) => api.patch('/auth/change-password/', data),
  refreshToken: (refresh) => api.post('/auth/refresh/', { refresh }),
};

export const departmentService = {
  list: (params) => api.get('/admin/departments/', { params }),
  get: (id) => api.get(`/admin/departments/${id}/`),
  create: (data) => api.post('/admin/departments/', data),
  update: (id, data) => api.patch(`/admin/departments/${id}/`, data),
  delete: (id) => api.delete(`/admin/departments/${id}/`),
  programmes: (deptId) => api.get(`/admin/departments/${deptId}/programmes/`),
  listProgrammes: (params) => api.get('/admin/programmes/', { params }),
  createProgramme: (data) => api.post('/admin/programmes/', data),
  updateProgramme: (id, data) => api.patch(`/admin/programmes/${id}/`, data),
  deleteProgramme: (id) => api.delete(`/admin/programmes/${id}/`),
  
  listBatches: (params) => api.get('/admin/batches/', { params }),
  createBatch: (data) => api.post('/admin/batches/', data),
  updateBatch: (id, data) => api.patch(`/admin/batches/${id}/`, data),
  deleteBatch: (id) => api.delete(`/admin/batches/${id}/`),

  listSections: (params) => api.get('/admin/sections/', { params }),
  createSection: (data) => api.post('/admin/sections/', data),
  updateSection: (id, data) => api.patch(`/admin/sections/${id}/`, data),
  deleteSection: (id) => api.delete(`/admin/sections/${id}/`),
};

export const regulationService = {
  list: (params) => api.get('/admin/regulations/', { params }),
  get: (id) => api.get(`/admin/regulations/${id}/`),
  create: (data) => api.post('/admin/regulations/', data),
  update: (id, data) => api.patch(`/admin/regulations/${id}/`, data),
  delete: (id) => api.delete(`/admin/regulations/${id}/`),
};

export const userService = {
  list: (params) => api.get('/admin/users/', { params }),
  get: (id) => api.get(`/admin/users/${id}/`),
  create: (data) => {
    if (data instanceof FormData) {
      return api.post('/admin/users/', data, { headers: { 'Content-Type': undefined } });
    }
    return api.post('/admin/users/', data);
  },
  update: (id, data) => {
    if (data instanceof FormData) {
      return api.patch(`/admin/users/${id}/`, data, { headers: { 'Content-Type': undefined } });
    }
    return api.patch(`/admin/users/${id}/`, data);
  },
  delete: (id) => api.delete(`/admin/users/${id}/`),
  resetPassword: (id) => api.post(`/admin/users/${id}/reset-password/`),
  getFaculty: (params) => api.get('/admin/users/', { params: { ...params, role: 'faculty' } }),
  bulkCreate: (file) => {
    const form = new FormData();
    form.append('file', file);
    return api.post('/admin/users/bulk-create/', form, {
      headers: { 'Content-Type': undefined },
    });
  },
};

export const subjectService = {
  // Academic Years
  listYears: () => api.get('/academic-years/'),
  getYear: (id) => api.get(`/academic-years/${id}/`),
  createYear: (data) => api.post('/academic-years/', data),
  updateYear: (id, data) => api.patch(`/academic-years/${id}/`, data),
  deleteYear: (id) => api.delete(`/academic-years/${id}/`),
  setCurrentYear: (id) => api.patch(`/academic-years/${id}/set_current/`),
  
  list: (params) => api.get('/subjects/', { params }),
  get: (id) => api.get(`/subjects/${id}/`),
  create: (data) => api.post('/subjects/', data),
  update: (id, data) => api.patch(`/subjects/${id}/`, data),
  delete: (id) => api.delete(`/subjects/${id}/`),
  // COs
  getCOs: (allocId) => api.get('/faculty/subjects/cos/', { params: { subject_allocation: allocId } }),
  saveCOs: (allocId, data) => api.post(`/faculty/subjects/${allocId}/save-cos/`, { cos: data }),
  // CO-PO Mapping
  getCOPOMapping: (allocId) => api.get(`/faculty/subjects/${allocId}/co-po-mapping/`),
  saveCOPOMappings: (allocId, data) => api.post(`/faculty/subjects/${allocId}/save-mappings/`, { mappings: data }),
  // Details
  getAllocationDetail: (allocId) => api.get(`/faculty/subjects/${allocId}/`),
  getAllocationStudents: (allocId) => api.get(`/faculty/subjects/${allocId}/students/`),
  getProgrammePOs: (progId) => api.get('/admin/program-outcomes/', { params: { programme: progId } }),
  getProgrammePSOs: (progId) => api.get('/admin/psos/', { params: { programme: progId } }),
};

export const allocationService = {
  mySubjects: (params) => api.get('/faculty/my-subjects/', { params }),
  getSubject: (allocId) => api.get(`/faculty/subjects/${allocId}/`),
  getAssessments: (allocId) => api.get(`/faculty/subjects/${allocId}/assessments/`),
  updateAssessment: (allocId, typeId, data) =>
    api.patch(`/allocations/assessment-configs/${typeId}/`, data),
  createAssessmentConfig: (data) => api.post('/allocations/assessment-configs/', data),
  getStudents: (allocId) => api.get(`/faculty/subjects/${allocId}/students/`),
  approve: (allocId, data) => api.post(`/allocations/allocations/${allocId}/approve/`, data),
  list: (params) => api.get('/allocations/allocations/', { params }),
  create: (data) => api.post('/allocations/allocations/', data),
  getAllocations: (params) => api.get('/allocations/allocations/', { params }),
};

export const assessmentTypeService = {
  list: (params) => api.get('/allocations/assessment-types/', { params }),
  create: (data) => api.post('/allocations/assessment-types/', data),
  update: (id, data) => api.patch(`/allocations/assessment-types/${id}/`, data),
  delete: (id) => api.delete(`/allocations/assessment-types/${id}/`),
};

export const attainmentConfigService = {
  // Returns the list; filter by ?department= to get department-specific or global
  list: (params) => api.get('/attainment/configs/', { params }),
  update: (id, data) => api.patch(`/attainment/configs/${id}/`, data),
};

export const marksService = {
  get: (allocId, type) => api.get('/marks/student-marks/', { params: { subject_allocation: allocId, assessment_type: type } }),
  saveMarks: (allocId, type, data) => api.post('/marks/student-marks/bulk_update/', { subject_allocation: allocId, assessment_type: type, marks: data }),
  bulkSave: (allocId, data) => api.post('/marks/student-marks/bulk_update/', { subject_allocation: allocId, ...data }),
  downloadTemplate: (allocId, type) =>
    api.get('/marks/excel-uploads/download-template/', {
      params: { allocation: allocId, assessment: type },
      responseType: 'blob',
    }),
  uploadExcel: (allocId, type, file, onProgress) => {
    const form = new FormData();
    form.append('file', file);
    form.append('subject_allocation', allocId);
    form.append('assessment_type', type);
    return api.post('/marks/excel-uploads/', form, {
      headers: { 'Content-Type': undefined },
      onUploadProgress: onProgress,
    });
  },
  getUploadStatus: (logId) => api.get(`/marks/excel-uploads/${logId}/`),
  // Question Mapping
  getQuestionMappings: (params) => api.get('/marks/question-mappings/', { params }),
  saveQuestionMapping: (data) => api.post('/marks/question-mappings/', data),
  deleteQuestionMapping: (id) => api.delete(`/marks/question-mappings/${id}/`),
  // Question Marks
  getQuestionMarks: (params) => api.get('/marks/question-marks/', { params }),
  saveQuestionMarks: (data) => api.post('/marks/question-marks/bulk_update/', data),
};

export const attainmentService = {
  calculate: (allocId) => api.post('/attainment/co-attainment/calculate/', { subject_allocation: allocId }),
  getCOAttainment: (allocId) => api.get('/attainment/co-attainment/', { params: { subject_allocation: allocId } }),
  getPOAttainment: (allocId) => api.get('/attainment/po-attainment/', { params: { subject_allocation: allocId } }),
  getATR: (allocId) => api.get('/attainment/action-taken-reports/', { params: { subject_allocation: allocId } }),
  saveATR: (allocId, data) => api.post('/attainment/action-taken-reports/', { subject_allocation: allocId, ...data }),
  // HOD
  hodCOAttainment: (params) => api.get('/attainment/co-attainment/', { params: { ...params, department_only: true } }),
  hodPOAttainment: (params) => api.get('/attainment/po-attainment/', { params: { ...params, department_only: true } }),
  // IQAC
  iqacCollegeSummary: (params) => api.get('/attainment/po-attainment/', { params: { ...params, institutional_only: true } }),
  // ATR Review
  getPendingATRs: () => api.get('/attainment/action-taken-reports/', { params: { implementation_status: 'SUBMITTED' } }),
  // Configuration
  getConfigs: () => api.get('/attainment/configs/'),
  updateConfig: (id, data) => api.patch(`/attainment/configs/${id}/`, data),
  createConfig: (data) => api.post('/attainment/configs/', data),
  getGlobalConfig: () => api.get('/attainment/configs/').then(res => {
    const data = res.data.results || res.data;
    const configs = Array.isArray(data) ? data : [];
    return configs.find(c => !c.department) || configs[0];
  }),
};

export const reportService = {
  getDepartmentReports: (academicYear) => api.get('/hod/department-reports/', { params: { academic_year: academicYear } }),
  exportFaculty: (allocId, format, type) =>
    api.post(
      `/faculty/subjects/${allocId}/reports/export/`,
      { format, type },
      { responseType: 'blob' }
    ),
  exportHOD: (format, type, params) =>
    api.post('/hod/reports/export/', { format, type, ...params }, { responseType: 'blob' }),
  exportIQAC: (format, academicYear) =>
    api.post('/iqac/export-accreditation-report/', { format, academic_year: academicYear }, {
      responseType: 'blob',
    }),
  generateReport: (allocId, type) => 
    api.post(`/reports/generate/${allocId}/`, { type }, { responseType: 'blob' }),
  getTemplate: (type) => api.get(`/reports/generate/template/?type=${type}`, { responseType: 'blob' }),
  exportMasterReport: () => api.post('/reports/generate/master/', {}, { responseType: 'blob' }),
};

export const analyticsService = {
  adminOverview: (params) => api.get('/admin/analytics/college-overview/', { params }),
  hodDashboard: (params) => api.get('/hod/dashboard/', { params }),
  hodAttainmentSummary: (params) => api.get('/hod/attainment-summary/', { params }),
  iqacDashboard: (params) => api.get('/iqac/dashboard/', { params }),
  iqacCollegeSummary: (params) => api.get('/iqac/dashboard/', { params }), // For now same as dashboard
};

export const notificationService = {
  list: () => api.get('/notifications/'),
  markRead: (id) => api.post(`/notifications/${id}/mark-read/`),
  markAllRead: () => api.post('/notifications/mark-all-read/'),
};

export const staffService = {
  // Staff subject list (staff users only)
  fetchSubjects: (params) => api.get('/faculty/staff/subjects/', { params }),
  // Admin management of staff users
  createUser: (data) => api.post('/auth/staff-users/', data),
  listUsers: (params) => api.get('/auth/staff-users/', { params }),
  updateDepartments: (id, department_ids) =>
    api.patch(`/auth/staff-users/${id}/departments/`, { department_ids }),
  // HOD: view staff in their department
  getDeptStaff: (deptId) => api.get(`/auth/departments/${deptId}/staff/`),
  // Toggle staff mark entry on a subject allocation
  toggleStaffEntry: (allocId, enabled) =>
    api.patch(`/allocations/allocations/${allocId}/toggle-staff-entry/`, { enabled }),
};
