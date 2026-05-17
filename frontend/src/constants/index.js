/**
 * SECE CO-PO Platform — Application Constants
 */

export const ROLES = {
  ADMIN: 'admin',
  HOD: 'hod',
  FACULTY: 'faculty',
  IQAC: 'iqac',
};

export const ASSESSMENT_TYPES = {
  CIA1: 'CIA1',
  CIA2: 'CIA2',
  CIA3: 'CIA3',
  ESE: 'ESE',
};

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login/',
    LOGOUT: '/auth/logout/',
    ME: '/auth/me/',
    REFRESH: '/auth/refresh/',
  },
  ADMIN: {
    USERS: '/admin/users/',
    DEPARTMENTS: '/admin/departments/',
    SUBJECTS: '/subjects/',
  },
  FACULTY: {
    MY_SUBJECTS: '/faculty/my-subjects/',
    MARKS: '/faculty/subjects/:id/marks/',
  }
};

export const DESIGN_TOKENS = {
  PRIMARY: '#1e4a8a',
  SECONDARY: '#3b82f6',
  SUCCESS: '#10b981',
  DANGER: '#ef4444',
  WARNING: '#f59e0b',
};
