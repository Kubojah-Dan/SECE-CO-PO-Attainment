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
  PRIMARY:       '#1E4A8A',
  PRIMARY_DARK:  '#0D1F3C',
  PRIMARY_LIGHT: '#EFF6FF',
  ACCENT:        '#F59E0B',
  ACCENT_LIGHT:  '#FFFBEB',
  SUCCESS:       '#059669',
  DANGER:        '#DC2626',
  WARNING:       '#D97706',
  INFO:          '#2563EB',
  SURFACE:       '#FFFFFF',
  PAGE_BG:       '#F4F6FB',
  TEXT:          '#0F172A',
  TEXT_MUTED:    '#94A3B8',
};
