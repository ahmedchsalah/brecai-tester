// ── User ─────────────────────────────────────────────────────────────────────
export interface User {
  id: number;
  name: string;
  email: string;
  phone_number: string | null;
  is_active: boolean;
  role: string;
  organization: {
    id: number;
    name: string;
    type: string;
    status: string;
  } | null;
}

// ── Endpoint definition ───────────────────────────────────────────────────────
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

export interface PathParam {
  key: string;      // e.g. "id"
  example: string;  // e.g. "1"
}

export interface Endpoint {
  id: string;
  method: HttpMethod;
  path: string;           // may contain :id style tokens
  label: string;
  description: string;
  pathParams?: PathParam[];
  defaultBody?: Record<string, unknown>;
  queryParams?: Record<string, string>;
}

export interface EndpointGroup {
  id: string;
  label: string;
  icon: string;
  role: string;           // informational only
  accent: string;         // tailwind color class prefix for styling
  endpoints: Endpoint[];
}

// ── All endpoint groups ───────────────────────────────────────────────────────
export const ENDPOINT_GROUPS: EndpointGroup[] = [
  {
    id: 'auth',
    label: 'Authentication',
    icon: '🔐',
    role: 'public / any',
    accent: 'violet',
    endpoints: [
      {
        id: 'auth-organizations',
        method: 'GET',
        path: '/auth/organizations',
        label: 'List Organizations',
        description: 'Public list of active organizations for the registration dropdown.',
        queryParams: { type: '', search: '' },
      },
      {
        id: 'auth-login',
        method: 'POST',
        path: '/auth/login',
        label: 'Login',
        description: 'Validate credentials. If OK, proceed to send-otp → verify-otp.',
        defaultBody: { email: '', password: '' },
      },
      {
        id: 'auth-send-otp',
        method: 'POST',
        path: '/auth/send-otp',
        label: 'Send OTP',
        description: 'Sends a 6-digit code to the user\'s email.',
        defaultBody: { email: '', method: 'email' },
      },
      {
        id: 'auth-verify-otp',
        method: 'POST',
        path: '/auth/verify-otp',
        label: 'Verify OTP',
        description: 'Validates OTP and sets the HttpOnly auth_token cookie.',
        defaultBody: { email: '', otp: '' },
        queryParams: { context: 'login' },
      },
      {
        id: 'auth-me',
        method: 'GET',
        path: '/auth/me',
        label: 'Me',
        description: 'Returns the currently authenticated user profile.',
      },
      {
        id: 'auth-logout',
        method: 'POST',
        path: '/auth/logout',
        label: 'Logout',
        description: 'Revokes the Sanctum token and clears the cookie.',
      },
    ],
  },

  {
    id: 'admin-insights',
    label: 'Admin — Insights',
    icon: '📊',
    role: 'admin',
    accent: 'red',
    endpoints: [
      { id: 'admin-kpis', method: 'GET', path: '/admin/insights/kpis', label: 'KPIs', description: 'Platform-wide KPI cards.' },
      { id: 'admin-user-growth', method: 'GET', path: '/admin/insights/user-growth', label: 'User Growth', description: 'New users per month (12 months).' },
      { id: 'admin-org-dist', method: 'GET', path: '/admin/insights/organization-distribution', label: 'Org Distribution', description: 'Organization type pie chart data.' },
      { id: 'admin-org-status', method: 'GET', path: '/admin/insights/organization-status-breakdown', label: 'Org Status Breakdown', description: 'Approval status bar chart.' },
      { id: 'admin-preds-time', method: 'GET', path: '/admin/insights/predictions-over-time', label: 'Predictions Over Time', description: 'Predictions per month (12 months).' },
      { id: 'admin-pred-results', method: 'GET', path: '/admin/insights/prediction-results', label: 'Prediction Results', description: 'Luminal-A vs Non-Luminal-A.' },
      { id: 'admin-patient-age', method: 'GET', path: '/admin/insights/patient-age-distribution', label: 'Patient Age Distribution', description: 'Age histogram buckets.' },
      { id: 'admin-receptor', method: 'GET', path: '/admin/insights/receptor-status', label: 'Receptor Status', description: 'ER/PR/HER2 breakdown.' },
      { id: 'admin-model-perf', method: 'GET', path: '/admin/insights/model-performance', label: 'Model Performance', description: 'AI model performance over FL rounds.' },
      { id: 'admin-top-orgs', method: 'GET', path: '/admin/insights/top-organizations', label: 'Top Organizations', description: 'Most active organizations.' },
    ],
  },

  {
    id: 'admin-orgs',
    label: 'Admin — Organizations',
    icon: '🏢',
    role: 'admin',
    accent: 'orange',
    endpoints: [
      { id: 'admin-orgs-list', method: 'GET', path: '/admin/organizations', label: 'List Organizations', description: 'Paginated list of all organizations.' },
      { id: 'admin-orgs-show', method: 'GET', path: '/admin/organizations/:id', label: 'Show Organization', description: 'Get a single organization.', pathParams: [{ key: 'id', example: '1' }] },
      {
        id: 'admin-orgs-create', method: 'POST', path: '/admin/organizations', label: 'Create Organization', description: 'Create a new organization.',
        defaultBody: { name: 'Test Clinic', type: 'clinic', contact_email: 'test@clinic.dz', address: '123 Main St' },
      },
      {
        id: 'admin-orgs-update', method: 'PUT', path: '/admin/organizations/:id', label: 'Update Organization', description: 'Update organization details.',
        pathParams: [{ key: 'id', example: '1' }],
        defaultBody: { name: 'Updated Clinic' },
      },
      { id: 'admin-orgs-delete', method: 'DELETE', path: '/admin/organizations/:id', label: 'Delete Organization', description: 'Delete an organization.', pathParams: [{ key: 'id', example: '1' }] },
      { id: 'admin-orgs-approve', method: 'POST', path: '/admin/organizations/:id/approve', label: 'Approve Organization', description: 'Approve a pending organization.', pathParams: [{ key: 'id', example: '1' }] },
      { id: 'admin-orgs-reject', method: 'POST', path: '/admin/organizations/:id/reject', label: 'Reject Organization', description: 'Reject a pending organization.', pathParams: [{ key: 'id', example: '1' }] },
      { id: 'admin-orgs-suspend', method: 'POST', path: '/admin/organizations/:id/suspend', label: 'Suspend Organization', description: 'Suspend an active organization.', pathParams: [{ key: 'id', example: '1' }] },
    ],
  },

  {
    id: 'admin-users',
    label: 'Admin — Users',
    icon: '👥',
    role: 'admin',
    accent: 'amber',
    endpoints: [
      { id: 'admin-users-list', method: 'GET', path: '/admin/users', label: 'List Users', description: 'Paginated list of all users.' },
      { id: 'admin-users-show', method: 'GET', path: '/admin/users/:id', label: 'Show User', description: 'Get a single user.', pathParams: [{ key: 'id', example: '1' }] },
      { id: 'admin-users-activate', method: 'POST', path: '/admin/users/:id/activate', label: 'Activate User', description: 'Activate a user account.', pathParams: [{ key: 'id', example: '1' }] },
      { id: 'admin-users-deactivate', method: 'POST', path: '/admin/users/:id/deactivate', label: 'Deactivate User', description: 'Deactivate a user account.', pathParams: [{ key: 'id', example: '1' }] },
    ],
  },

  {
    id: 'admin-ai-models',
    label: 'Admin — AI Models',
    icon: '🤖',
    role: 'admin',
    accent: 'cyan',
    endpoints: [
      { id: 'admin-ai-list', method: 'GET', path: '/admin/ai-models', label: 'List AI Models', description: 'List all registered AI models.' },
      { id: 'admin-ai-show', method: 'GET', path: '/admin/ai-models/:id', label: 'Show AI Model', description: 'Model details with FL round history.', pathParams: [{ key: 'id', example: '1' }] },
      {
        id: 'admin-ai-create', method: 'POST', path: '/admin/ai-models', label: 'Create AI Model', description: 'Register a new model.',
        defaultBody: { name: 'BrCa-LumA-v3', version: '3.0.1', file_path: 'models/brca_v3.pt', is_active: false },
      },
      {
        id: 'admin-ai-update', method: 'PUT', path: '/admin/ai-models/:id', label: 'Update AI Model', description: 'Update model metadata.',
        pathParams: [{ key: 'id', example: '1' }],
        defaultBody: { name: 'BrCa-LumA-v3', version: '3.0.2' },
      },
      { id: 'admin-ai-delete', method: 'DELETE', path: '/admin/ai-models/:id', label: 'Delete AI Model', description: 'Delete model (blocked if it has predictions).', pathParams: [{ key: 'id', example: '1' }] },
      { id: 'admin-ai-activate', method: 'POST', path: '/admin/ai-models/:id/activate', label: 'Activate Model', description: 'Activate model, deactivate all others.', pathParams: [{ key: 'id', example: '1' }] },
      { id: 'admin-ai-deactivate', method: 'POST', path: '/admin/ai-models/:id/deactivate', label: 'Deactivate Model', description: 'Deactivate this model.', pathParams: [{ key: 'id', example: '1' }] },
    ],
  },

  {
    id: 'admin-audit',
    label: 'Admin — Audit Logs',
    icon: '📋',
    role: 'admin',
    accent: 'slate',
    endpoints: [
      { id: 'audit-list', method: 'GET', path: '/admin/audit-logs', label: 'List Audit Logs', description: 'Filterable audit log list.', queryParams: { user_id: '', organization_id: '', action: '', from: '', to: '' } },
      { id: 'audit-show', method: 'GET', path: '/admin/audit-logs/:id', label: 'Show Audit Log', description: 'Single audit log entry.', pathParams: [{ key: 'id', example: '1' }] },
    ],
  },

  {
    id: 'org-manager',
    label: 'Org Manager',
    icon: '🏥',
    role: 'org_manager',
    accent: 'emerald',
    endpoints: [
      { id: 'org-dashboard', method: 'GET', path: '/org/dashboard', label: 'Dashboard Summary', description: 'Combined summary card for org manager.' },
      { id: 'org-kpis', method: 'GET', path: '/org/insights/kpis', label: 'Org KPIs', description: 'Organization-scoped KPI cards.' },
      { id: 'org-patient-growth', method: 'GET', path: '/org/insights/patient-growth', label: 'Patient Growth', description: 'Patient growth per month.' },
      { id: 'org-preds-time', method: 'GET', path: '/org/insights/predictions-over-time', label: 'Predictions Over Time', description: 'Predictions trend for this org.' },
      { id: 'org-pred-results', method: 'GET', path: '/org/insights/prediction-results', label: 'Prediction Results', description: 'Luminal-A vs Non-Luminal-A for this org.' },
      { id: 'org-age-dist', method: 'GET', path: '/org/insights/patient-age-distribution', label: 'Patient Age Distribution', description: 'Patient age histogram for this org.' },
      { id: 'org-receptor', method: 'GET', path: '/org/insights/receptor-status', label: 'Receptor Status', description: 'ER/PR/HER2 for this org.' },
      { id: 'org-leaderboard', method: 'GET', path: '/org/insights/doctor-leaderboard', label: 'Doctor Leaderboard', description: 'Most active doctors in this org.' },
      { id: 'org-model-perf', method: 'GET', path: '/org/insights/model-performance', label: 'Model Performance', description: 'AI model accuracy for this org.' },
      { id: 'org-members', method: 'GET', path: '/org/members', label: 'List Members', description: 'Doctors in this organization.' },
      { id: 'org-members-show', method: 'GET', path: '/org/members/:id', label: 'Show Member', description: 'Single doctor details.', pathParams: [{ key: 'id', example: '1' }] },
      { id: 'org-members-approve', method: 'POST', path: '/org/members/:id/approve', label: 'Approve Member', description: 'Approve a doctor\'s membership.', pathParams: [{ key: 'id', example: '1' }] },
      { id: 'org-members-deactivate', method: 'POST', path: '/org/members/:id/deactivate', label: 'Deactivate Member', description: 'Deactivate a doctor.', pathParams: [{ key: 'id', example: '1' }] },
      { id: 'org-members-delete', method: 'DELETE', path: '/org/members/:id', label: 'Remove Member', description: 'Remove a doctor from org.', pathParams: [{ key: 'id', example: '1' }] },
      { id: 'org-patients', method: 'GET', path: '/org/patients', label: 'List Patients', description: 'Read-only patient list for this org.' },
      { id: 'org-patients-show', method: 'GET', path: '/org/patients/:id', label: 'Show Patient', description: 'Single patient details.', pathParams: [{ key: 'id', example: '1' }] },
      { id: 'org-reports', method: 'GET', path: '/org/reports', label: 'List Reports', description: 'Read-only reports for this org.' },
      { id: 'org-reports-show', method: 'GET', path: '/org/reports/:id', label: 'Show Report', description: 'Single report details.', pathParams: [{ key: 'id', example: '1' }] },
      { id: 'org-plans', method: 'GET', path: '/org/plans', label: 'List Plans', description: 'Available subscription plans.' },
      { id: 'org-subscription', method: 'GET', path: '/org/subscription', label: 'Current Subscription', description: 'Current subscription status.' },
      { id: 'org-payments', method: 'GET', path: '/org/payments', label: 'Payment History', description: 'Payment history for this org.' },
      {
        id: 'org-subscribe', method: 'POST', path: '/org/subscribe', label: 'Subscribe', description: 'Initiate Chargily checkout.',
        defaultBody: { plan_id: 1 },
      },
    ],
  },

  {
    id: 'doctor',
    label: 'Doctor',
    icon: '👨‍⚕️',
    role: 'doctor',
    accent: 'blue',
    endpoints: [
      { id: 'doc-kpis', method: 'GET', path: '/doctor/insights/kpis', label: 'Doctor KPIs', description: 'Personal dashboard KPIs.' },
      { id: 'doc-exams-time', method: 'GET', path: '/doctor/insights/examinations-over-time', label: 'Examinations Over Time', description: 'Examinations trend.' },
      { id: 'doc-pred-results', method: 'GET', path: '/doctor/insights/prediction-results', label: 'My Prediction Results', description: 'Luminal-A distribution for this doctor.' },
      { id: 'doc-confidence', method: 'GET', path: '/doctor/insights/average-confidence', label: 'Average Confidence', description: 'Average AI prediction confidence.' },
      { id: 'doc-age-dist', method: 'GET', path: '/doctor/insights/patient-age-distribution', label: 'Patient Age Distribution', description: 'Age histogram for my patients.' },
      { id: 'doc-activity', method: 'GET', path: '/doctor/insights/recent-activity', label: 'Recent Activity', description: 'Latest actions by this doctor.' },
      { id: 'doc-patients', method: 'GET', path: '/doctor/patients', label: 'List Patients', description: 'All patients belonging to this doctor.' },
      { id: 'doc-patients-show', method: 'GET', path: '/doctor/patients/:id', label: 'Show Patient', description: 'Single patient.', pathParams: [{ key: 'id', example: '1' }] },
      {
        id: 'doc-patients-create', method: 'POST', path: '/doctor/patients', label: 'Create Patient', description: 'Add a new patient.',
        defaultBody: { name: 'Jane Doe', date_of_birth: '1980-05-15', gender: 'female', national_id: '19800515123' },
      },
      {
        id: 'doc-patients-update', method: 'PUT', path: '/doctor/patients/:id', label: 'Update Patient', description: 'Update patient info.',
        pathParams: [{ key: 'id', example: '1' }],
        defaultBody: { name: 'Jane Updated' },
      },
      { id: 'doc-patients-delete', method: 'DELETE', path: '/doctor/patients/:id', label: 'Delete Patient', description: 'Delete a patient.', pathParams: [{ key: 'id', example: '1' }] },
      { id: 'doc-exams', method: 'GET', path: '/doctor/examinations', label: 'List Examinations', description: 'All examinations.' },
      { id: 'doc-exams-show', method: 'GET', path: '/doctor/examinations/:id', label: 'Show Examination', description: 'Single examination.', pathParams: [{ key: 'id', example: '1' }] },
      {
        id: 'doc-exams-create', method: 'POST', path: '/doctor/examinations', label: 'Create Examination', description: 'Start a new examination.',
        defaultBody: { patient_id: 1, notes: 'Initial examination' },
      },
      { id: 'doc-exams-submit', method: 'POST', path: '/doctor/examinations/:id/submit', label: 'Submit Examination', description: 'Submit examination for review.', pathParams: [{ key: 'id', example: '1' }] },
      { id: 'doc-exams-conclude', method: 'POST', path: '/doctor/examinations/:id/conclude', label: 'Conclude Examination', description: 'Mark examination as concluded.', pathParams: [{ key: 'id', example: '1' }] },
      { id: 'doc-wsi', method: 'GET', path: '/doctor/wsi-uploads', label: 'List WSI Uploads', description: 'Whole-slide image uploads.' },
      { id: 'doc-wsi-show', method: 'GET', path: '/doctor/wsi-uploads/:id', label: 'Show WSI Upload', description: 'Single WSI upload details.', pathParams: [{ key: 'id', example: '1' }] },
      { id: 'doc-predictions', method: 'GET', path: '/doctor/predictions', label: 'List Predictions', description: 'All AI predictions for this doctor.' },
      { id: 'doc-predictions-show', method: 'GET', path: '/doctor/predictions/:id', label: 'Show Prediction', description: 'Single prediction result.', pathParams: [{ key: 'id', example: '1' }] },
      { id: 'doc-predictions-status', method: 'GET', path: '/doctor/predictions/:id/status', label: 'Prediction Status', description: 'Poll prediction job status.', pathParams: [{ key: 'id', example: '1' }] },
      {
        id: 'doc-predict', method: 'POST', path: '/doctor/predictions/predict', label: 'Run Prediction', description: 'Submit a WSI for AI classification.',
        defaultBody: { wsi_upload_id: 1, examination_id: 1 },
      },
      { id: 'doc-predict-retry', method: 'POST', path: '/doctor/predictions/:id/retry', label: 'Retry Prediction', description: 'Retry a failed prediction.', pathParams: [{ key: 'id', example: '1' }] },
      { id: 'doc-xai', method: 'GET', path: '/doctor/predictions/:id/xai', label: 'XAI Result', description: 'Explainability result for a prediction.', pathParams: [{ key: 'id', example: '1' }] },
      { id: 'doc-reports', method: 'GET', path: '/doctor/reports', label: 'List Reports', description: 'All clinical reports.' },
      { id: 'doc-reports-show', method: 'GET', path: '/doctor/reports/:id', label: 'Show Report', description: 'Single report.', pathParams: [{ key: 'id', example: '1' }] },
      {
        id: 'doc-reports-create', method: 'POST', path: '/doctor/reports', label: 'Create Report', description: 'Create a new clinical report.',
        defaultBody: { examination_id: 1, title: 'Pathology Report', content: 'Findings...' },
      },
      { id: 'doc-reports-finalize', method: 'POST', path: '/doctor/reports/:id/finalize', label: 'Finalize Report', description: 'Lock report as final.', pathParams: [{ key: 'id', example: '1' }] },
    ],
  },

  {
    id: 'fl',
    label: 'Federated Learning',
    icon: '🧠',
    role: 'admin / instructor',
    accent: 'purple',
    endpoints: [
      { id: 'fl-kpis', method: 'GET', path: '/fl/insights/kpis', label: 'FL KPIs', description: 'Federated learning KPI cards.' },
      { id: 'fl-accuracy', method: 'GET', path: '/fl/insights/accuracy-over-rounds', label: 'Accuracy Over Rounds', description: 'Model accuracy per FL round.' },
      { id: 'fl-contributions', method: 'GET', path: '/fl/insights/contributions-per-round', label: 'Contributions Per Round', description: 'Organization contributions per round.' },
      { id: 'fl-models', method: 'GET', path: '/fl/models', label: 'List FL Models', description: 'All FL model records.' },
      { id: 'fl-models-show', method: 'GET', path: '/fl/models/:id', label: 'Show FL Model', description: 'Single FL model.', pathParams: [{ key: 'id', example: '1' }] },
      {
        id: 'fl-models-create', method: 'POST', path: '/fl/models', label: 'Create FL Model', description: 'Register a new FL model.',
        defaultBody: { name: 'BrCa-FL-v1', version: '1.0.0', file_path: 'fl/model_v1.pt' },
      },
      { id: 'fl-rounds', method: 'GET', path: '/fl/rounds', label: 'List FL Rounds', description: 'All federated learning rounds.' },
      { id: 'fl-rounds-show', method: 'GET', path: '/fl/rounds/:id', label: 'Show FL Round', description: 'Single FL round details.', pathParams: [{ key: 'id', example: '1' }] },
      {
        id: 'fl-rounds-create', method: 'POST', path: '/fl/rounds', label: 'Create FL Round', description: 'Start a new FL round.',
        defaultBody: { model_id: 1, round_number: 1 },
      },
      { id: 'fl-rounds-complete', method: 'POST', path: '/fl/rounds/:id/complete', label: 'Complete FL Round', description: 'Mark a round as completed.', pathParams: [{ key: 'id', example: '1' }] },
      { id: 'fl-contrib-list', method: 'GET', path: '/fl/contributions', label: 'List Contributions', description: 'All organization contributions.' },
      {
        id: 'fl-contrib-create', method: 'POST', path: '/fl/contributions', label: 'Submit Contribution', description: 'Submit a model contribution.',
        defaultBody: { fl_round_id: 1, organization_id: 1, model_weights_path: 'contrib/weights.pt' },
      },
    ],
  },
];
