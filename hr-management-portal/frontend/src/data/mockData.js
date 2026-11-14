// ==============================================================================
// Mock Data Repository - Urja Foods & Agro ATS Portal
// Clean Production Configuration: All dynamic transactional entities are empty arrays.
// All business records, KPIs, candidates, requisitions, and statistics must be
// fetched dynamically from the live Spring Boot backend & MySQL database.
// ==============================================================================

export const INITIAL_ROLES = [
  { id: 'ROLE_HRBP', name: 'HRBP (Sanchita)', label: 'HR Business Partner (Urja Foods)' },
  { id: 'ROLE_HR_ADMIN', name: 'HR Admin', label: 'HR Administrator' },
  { id: 'ROLE_HR_RECRUITER', name: 'HR Recruiter', label: 'HR Recruiter' },
  { id: 'ROLE_DEPT_HEAD', name: 'Department Head', label: 'Department Head (Soya / Feedmill)' },
  { id: 'ROLE_APPROVING_MANAGER', name: 'Approving Manager', label: 'Approving Manager (Operations)' },
  { id: 'ROLE_SENIOR_MGMT', name: 'Senior Management', label: 'Senior Management (VP/Director)' },
  { id: 'ROLE_INTERVIEWER', name: 'Interviewer', label: 'Technical Interviewer' },
  { id: 'ROLE_IT_ADMIN', name: 'IT Admin', label: 'IT Administrator (Superuser)' }
];

export const INITIAL_DEPARTMENTS = [
  { id: 1, code: 'DIV-SOYA', name: 'Soya Division', head: 'Rajesh Kulkarni', active: true, vacancies: 0, totalEmployees: 0 },
  { id: 2, code: 'DIV-FEED', name: 'Feedmill', head: 'Ramesh Patil', active: true, vacancies: 0, totalEmployees: 0 },
  { id: 3, code: 'DIV-POUL', name: 'Poultry Integration', head: 'Suresh Deshmukh', active: true, vacancies: 0, totalEmployees: 0 },
  { id: 4, code: 'DIV-HATC', name: 'Hatchery', head: 'Mahesh Shinde', active: true, vacancies: 0, totalEmployees: 0 },
  { id: 5, code: 'DIV-BREED', name: 'Breeder Operation', head: 'Ganesh More', active: true, vacancies: 0, totalEmployees: 0 },
  { id: 6, code: 'DIV-QAQC', name: 'Quality Assurance', head: 'Dr. Sunita Kulkarni', active: true, vacancies: 0, totalEmployees: 0 },
  { id: 7, code: 'DIV-PURC', name: 'Purchase', head: 'Vikram Joshi', active: true, vacancies: 0, totalEmployees: 0 },
  { id: 8, code: 'DIV-PROJ', name: 'Projects', head: 'Sunil Jagtap', active: true, vacancies: 0, totalEmployees: 0 },
  { id: 9, code: 'DIV-CBF', name: 'CBF Division', head: 'Dr. A. Verma', active: true, vacancies: 0, totalEmployees: 0 },
  { id: 10, code: 'DIV-SALE', name: 'Cattle Feed Sales', head: 'Nitin Pawar', active: true, vacancies: 0, totalEmployees: 0 },
  { id: 11, code: 'DIV-HR', name: 'Human Resources', head: 'Priyanka Sen', active: true, vacancies: 0, totalEmployees: 0 }
];

export const INITIAL_LOCATIONS = [
  'Plant - Rahuri',
  'Plant - Nashik',
  'HO - Pune',
  'Multiple Sites',
  'Pune Region',
  'Solapur Plant'
];

export const INITIAL_USERS = [];
export const INITIAL_REQUISITIONS = [];
export const INITIAL_CANDIDATES = [];
export const INITIAL_INTERVIEWS = [];
export const INITIAL_OFFERS = [];
export const INITIAL_TASKS = [];
export const INITIAL_NOTIFICATIONS = [];
export const INITIAL_EMPLOYEES = [];
export const INITIAL_BACKUPS = [];
export const INITIAL_AUDIT_LOGS = [];
export const INITIAL_APPROVALS = [];
