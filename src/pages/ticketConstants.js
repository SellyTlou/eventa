// ============ TICKET CONSTANTS ============
// Single source of truth for all ticket-related values

export const DEPARTMENTS = {
  // User-facing values (what they select)
  GENERAL: 'General Support',
  TECHNICAL: 'Technical Support',
  ACCOUNTS: 'Accounts & Billing',
  SALES: 'Sales',
  RSVP: 'RSVP Issues',
  EVENT: 'Event Management Help'
};

// For dropdown options in forms
export const DEPARTMENT_OPTIONS = [
  { value: DEPARTMENTS.GENERAL, label: 'General Support' },
  { value: DEPARTMENTS.TECHNICAL, label: 'Technical Issues' },
  { value: DEPARTMENTS.ACCOUNTS, label: 'Billing & Accounts' },
  { value: DEPARTMENTS.SALES, label: 'Sales' },
  { value: DEPARTMENTS.RSVP, label: 'RSVP Problems' },
  { value: DEPARTMENTS.EVENT, label: 'Event Setup Help' }
];

export const PRIORITIES = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high'
};

export const TICKET_STATUS = {
  OPEN: 'Open',
  IN_PROGRESS: 'In Progress',
  RESOLVED: 'Resolved'
};

// Map URL params to actual department values
export const URL_DEPT_MAP = {
  'general': DEPARTMENTS.GENERAL,
  'technical': DEPARTMENTS.TECHNICAL,
  'accounts': DEPARTMENTS.ACCOUNTS,
  'sales': DEPARTMENTS.SALES,
  'rsvp': DEPARTMENTS.RSVP,
  'event': DEPARTMENTS.EVENT,
  'support': DEPARTMENTS.GENERAL // fallback
};