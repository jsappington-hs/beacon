// User types
export type UserRole = 'EMPLOYEE' | 'MANAGER' | 'HR_ADMIN' | 'SUPER_ADMIN';

// Organization type for multi-tenancy
export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  title?: string;
  role: UserRole;
  organizationId?: string;
  managerId?: string;
  departmentId?: string;
  hireDate?: string;
  // Profile fields
  profilePicture?: string;
  bio?: string;
  phoneNumber?: string;
  location?: string;
  // Admin fields
  isActive?: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
  // Relations
  organization?: Organization;
}

export interface Department {
  id: string;
  name: string;
  parentDepartmentId?: string;
  createdAt: string;
  updatedAt: string;
}

// Review types
export type ReviewCycleType = 'QUARTERLY' | 'SEMI_ANNUAL' | 'ANNUAL';
export type ReviewStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CALIBRATED';

export interface ReviewCycle {
  id: string;
  name: string;
  type: ReviewCycleType;
  startDate: string;
  endDate: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface Competency {
  name: string;
  description: string;
  selfRating?: number; // 1-4
  managerRating?: number; // 1-4
}

export interface SelfReflection {
  question: string;
  answer: string;
}

export interface Review {
  id: string;
  revieweeId: string;
  reviewerId: string;
  cycleId: string;
  competencies?: string; // JSON string
  selfReflections?: string; // JSON string
  assignedGoals?: string; // JSON string
  overallSelfRating?: number; // 1-4
  overallManagerRating?: number; // 1-4
  // Legacy fields
  overallRating?: number; // 1-4
  selfAssessment?: string;
  managerAssessment?: string;
  summaryComments?: string; // JSON string
  status: ReviewStatus;
  createdAt: string;
  updatedAt: string;
  // Populated relations
  reviewee?: User;
  reviewer?: User;
  cycle?: ReviewCycle;
  peerFeedback?: PeerFeedback[];
  competencyComments?: CompetencyComment[];
}

export interface PeerFeedback {
  id: string;
  feedback: string;
  rating?: number; // 1-4
  createdAt: string;
}

export interface CompetencyComment {
  id: string;
  reviewId: string;
  competencyName: string;
  authorId: string;
  author?: { id: string; name: string };
  authorRole: 'EMPLOYEE' | 'MANAGER';
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface GoalComment {
  id: string;
  reviewId: string;
  goalId: string;
  authorId: string;
  author?: { id: string; name: string };
  authorRole: 'EMPLOYEE' | 'MANAGER';
  content: string;
  createdAt: string;
  updatedAt: string;
}

export type AssignedGoalStatus = 'not_achieved' | 'partially_achieved' | 'almost_done' | 'achieved';

export interface AssignedGoal {
  id?: string;
  title: string;
  description?: string;
  status: AssignedGoalStatus;
  dueDate?: string;
  selfRating?: number; // 1-4
  managerRating?: number; // 1-4
}

export interface SummaryComments {
  employeeComment?: string;
  managerComment?: string;
}

// Goal types
export type GoalStatus = 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
export type GoalVisibility = 'PRIVATE' | 'TEAM' | 'COMPANY';

export interface Goal {
  id: string;
  ownerId: string;
  parentGoalId?: string;
  title: string;
  description: string;
  targetValue?: number;
  currentValue?: number;
  unit?: string;
  dueDate?: string;
  status: GoalStatus;
  visibility: GoalVisibility;
  createdAt: string;
  updatedAt: string;
}

export interface GoalTemplate {
  id: string;
  title: string;
  description: string;
  category: string;
  targetValue?: number;
  unit?: string;
  suggestedDuration?: number; // in days
  visibility: GoalVisibility;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// One-on-one types
export interface OneOnOne {
  id: string;
  managerId: string;
  employeeId: string;
  scheduledAt: string;
  agenda?: string;
  managerNotes?: string; // Only visible to manager
  sharedNotes?: string;
  actionItems?: string; // JSON string
  status: string;
  // Transcript fields
  transcript?: string;
  transcriptFileUrl?: string;
  // Document linking
  documentUrl?: string;
  // Calendar integration
  googleEventId?: string;
  googleEventUrl?: string;
  googleCalendarSynced?: boolean;
  lastSyncedAt?: string;
  createdAt: string;
  updatedAt: string;
  // Populated relations
  manager?: { id: string; name: string; email: string; title?: string };
  employee?: { id: string; name: string; email: string; title?: string };
}

export interface CalendarConnectionStatus {
  connected: boolean;
}

// Development plan types
export interface DevelopmentPlan {
  id: string;
  userId: string;
  careerGoals: string;
  skillsToAdd: string; // JSON string
  milestones: string; // JSON string
  progress: number; // 0-100
  createdAt: string;
  updatedAt: string;
}

// Auth types
export interface AuthResponse {
  token: string;
  user: User;
  organization?: Organization;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterOrganizationData {
  organizationName: string;
  adminEmail: string;
  adminName: string;
  adminPassword: string;
}

// Admin types
export interface SystemSettings {
  category: string;
  settings: Record<string, any>;
}

export interface Integration {
  id: string;
  type: 'gusto' | 'google_calendar' | 'hris';
  isConnected: boolean;
  lastSyncAt?: string;
  syncStatus?: 'success' | 'failed' | 'pending';
  syncError?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  userId?: string;
  user?: { id: string; name: string; email: string };
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  resourceType: string;
  resourceId: string;
  changes?: string; // JSON string
  metadata?: string; // JSON string
  status?: 'success' | 'failed';
  errorMessage?: string;
  description?: string;
  createdAt: string;
}

export interface AuditLogQueryParams {
  userId?: string;
  action?: string;
  resourceType?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export interface BulkImportResult {
  success: number;
  errors: Array<{
    row: number;
    error: string;
    data: any;
  }>;
}
