import axios from 'axios';
import type {
  AuthResponse,
  LoginCredentials,
  User,
  Department,
  ReviewCycle,
  Review,
  PeerFeedback,
  CompetencyComment,
  GoalComment,
  SummaryComments,
  Goal,
  GoalTemplate,
  OneOnOne,
  CalendarConnectionStatus,
  DevelopmentPlan,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      // Only redirect if not already on login page (prevents infinite loop)
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth API
export const auth = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const { data } = await api.post('/auth/login', credentials);
    return data;
  },
  getCurrentUser: async (): Promise<User> => {
    const { data } = await api.get('/auth/me');
    return data;
  },
};

// Onboarding API
export const onboarding = {
  register: async (data: {
    organizationName: string;
    adminName: string;
    adminEmail: string;
    adminPassword: string;
  }): Promise<AuthResponse> => {
    const response = await api.post('/onboarding/register', data);
    return response.data;
  },
};

// Users API
export const users = {
  getAll: async (): Promise<User[]> => {
    const { data } = await api.get('/users');
    return data;
  },
  getById: async (id: string): Promise<User> => {
    const { data } = await api.get(`/users/${id}`);
    return data;
  },
  getOrgChart: async (): Promise<User[]> => {
    const { data } = await api.get('/users/org/chart');
    return data;
  },
  getDirectReports: async (id: string): Promise<User[]> => {
    const { data } = await api.get(`/users/${id}/reports`);
    return data;
  },
  create: async (user: Partial<User>): Promise<User> => {
    const { data } = await api.post('/users', user);
    return data;
  },
  update: async (id: string, updates: Partial<User>): Promise<User> => {
    const { data } = await api.patch(`/users/${id}`, updates);
    return data;
  },
};

// Profile API
export const profile = {
  updateProfile: async (updates: { bio?: string; phoneNumber?: string; location?: string }): Promise<User> => {
    const { data } = await api.patch('/profile/me', updates);
    return data;
  },
  changePassword: async (currentPassword: string, newPassword: string): Promise<{ message: string }> => {
    const { data } = await api.put('/profile/me/password', {
      currentPassword,
      newPassword,
    });
    return data;
  },
  uploadProfilePicture: async (file: File): Promise<User> => {
    const formData = new FormData();
    formData.append('profilePicture', file);

    const { data } = await api.post('/profile/me/profile-picture', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return data;
  },
  deleteProfilePicture: async (): Promise<User> => {
    const { data } = await api.delete('/profile/me/profile-picture');
    return data;
  },
};

// Departments API
export const departments = {
  getAll: async (): Promise<Department[]> => {
    const { data } = await api.get('/departments');
    return data;
  },
  getTree: async (): Promise<Department[]> => {
    const { data } = await api.get('/departments/tree');
    return data;
  },
  getById: async (id: string): Promise<Department> => {
    const { data } = await api.get(`/departments/${id}`);
    return data;
  },
  create: async (department: Partial<Department>): Promise<Department> => {
    const { data } = await api.post('/departments', department);
    return data;
  },
  update: async (id: string, updates: Partial<Department>): Promise<Department> => {
    const { data } = await api.patch(`/departments/${id}`, updates);
    return data;
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`/departments/${id}`);
  },
};

// Review Cycles API
export const reviewCycles = {
  getAll: async (): Promise<ReviewCycle[]> => {
    const { data } = await api.get('/reviews/cycles');
    return data;
  },
  getById: async (id: string): Promise<ReviewCycle> => {
    const { data } = await api.get(`/reviews/cycles/${id}`);
    return data;
  },
  create: async (cycle: Partial<ReviewCycle>): Promise<ReviewCycle> => {
    const { data } = await api.post('/reviews/cycles', cycle);
    return data;
  },
  update: async (id: string, updates: Partial<ReviewCycle>): Promise<ReviewCycle> => {
    const { data } = await api.patch(`/reviews/cycles/${id}`, updates);
    return data;
  },
};

// Reviews API
export const reviews = {
  getAll: async (): Promise<Review[]> => {
    const { data } = await api.get('/reviews/all-reviews');
    return data;
  },
  getMyReviews: async (): Promise<Review[]> => {
    const { data } = await api.get('/reviews/my-reviews');
    return data;
  },
  getById: async (id: string): Promise<Review> => {
    const { data } = await api.get(`/reviews/${id}`);
    return data;
  },
  create: async (review: Partial<Review>): Promise<Review> => {
    const { data } = await api.post('/reviews', review);
    return data;
  },
  submitSelfAssessment: async (id: string, assessment: string): Promise<Review> => {
    const { data } = await api.patch(`/reviews/${id}/self-assessment`, {
      selfAssessment: assessment,
    });
    return data;
  },
  submitManagerAssessment: async (
    id: string,
    assessment: string,
    rating: number
  ): Promise<Review> => {
    const { data } = await api.patch(`/reviews/${id}/manager-assessment`, {
      managerAssessment: assessment,
      overallRating: rating,
    });
    return data;
  },
  submitPeerFeedback: async (
    reviewId: string,
    feedback: string,
    rating?: number
  ): Promise<PeerFeedback> => {
    const { data } = await api.post(`/reviews/${reviewId}/peer-feedback`, {
      feedback,
      rating,
    });
    return data;
  },
  getPeerFeedback: async (reviewId: string): Promise<PeerFeedback[]> => {
    const { data} = await api.get(`/reviews/${reviewId}/peer-feedback`);
    return data;
  },
  submitCompetencySelfRatings: async (
    id: string,
    competencies: any[],
    overallSelfRating?: number
  ): Promise<Review> => {
    const { data } = await api.patch(`/reviews/${id}/competency-self-ratings`, {
      competencies,
      overallSelfRating,
    });
    return data;
  },
  submitCompetencyManagerRatings: async (
    id: string,
    competencies: any[],
    overallManagerRating?: number
  ): Promise<Review> => {
    const { data } = await api.patch(`/reviews/${id}/competency-manager-ratings`, {
      competencies,
      overallManagerRating,
    });
    return data;
  },
  submitSelfReflections: async (id: string, selfReflections: any[]): Promise<Review> => {
    const { data } = await api.patch(`/reviews/${id}/self-reflections`, {
      selfReflections,
    });
    return data;
  },
  assignGoals: async (id: string, assignedGoals: any[]): Promise<Review> => {
    const { data } = await api.patch(`/reviews/${id}/assign-goals`, {
      assignedGoals,
    });
    return data;
  },
  getHistory: async (userId: string): Promise<Review[]> => {
    const { data } = await api.get(`/reviews/history/${userId}`);
    return data;
  },
  bulkAssign: async (cycleId: string, employeeIds: string[]): Promise<any> => {
    const { data } = await api.post('/reviews/bulk-assign', {
      cycleId,
      employeeIds,
    });
    return data;
  },
  getCompetencyComments: async (
    reviewId: string,
    competencyName: string
  ): Promise<CompetencyComment[]> => {
    const { data } = await api.get(
      `/reviews/${reviewId}/competency-comments/${encodeURIComponent(competencyName)}`
    );
    return data;
  },
  createCompetencyComment: async (
    reviewId: string,
    competencyName: string,
    content: string
  ): Promise<CompetencyComment> => {
    const { data } = await api.post(`/reviews/${reviewId}/competency-comments`, {
      competencyName,
      content,
    });
    return data;
  },
  updateCompetencyComment: async (
    reviewId: string,
    commentId: string,
    content: string
  ): Promise<CompetencyComment> => {
    const { data } = await api.patch(
      `/reviews/${reviewId}/competency-comments/${commentId}`,
      { content }
    );
    return data;
  },
  deleteCompetencyComment: async (
    reviewId: string,
    commentId: string
  ): Promise<void> => {
    await api.delete(`/reviews/${reviewId}/competency-comments/${commentId}`);
  },
  getGoalComments: async (
    reviewId: string,
    goalId: string
  ): Promise<GoalComment[]> => {
    const { data } = await api.get(
      `/reviews/${reviewId}/goal-comments/${encodeURIComponent(goalId)}`
    );
    return data;
  },
  createGoalComment: async (
    reviewId: string,
    goalId: string,
    content: string
  ): Promise<GoalComment> => {
    const { data } = await api.post(`/reviews/${reviewId}/goal-comments`, {
      goalId,
      content,
    });
    return data;
  },
  updateGoalComment: async (
    reviewId: string,
    commentId: string,
    content: string
  ): Promise<GoalComment> => {
    const { data } = await api.patch(
      `/reviews/${reviewId}/goal-comments/${commentId}`,
      { content }
    );
    return data;
  },
  deleteGoalComment: async (
    reviewId: string,
    commentId: string
  ): Promise<void> => {
    await api.delete(`/reviews/${reviewId}/goal-comments/${commentId}`);
  },
  updateSummaryComments: async (
    id: string,
    summaryComments: SummaryComments
  ): Promise<Review> => {
    const { data } = await api.patch(`/reviews/${id}/summary-comments`, {
      summaryComments,
    });
    return data;
  },
};

// Goals API
export const goals = {
  getMyGoals: async (): Promise<Goal[]> => {
    const { data } = await api.get('/goals/my-goals');
    return data;
  },
  getUserGoals: async (userId: string): Promise<Goal[]> => {
    const { data } = await api.get(`/goals/user/${userId}`);
    return data;
  },
  getCompanyGoals: async (): Promise<Goal[]> => {
    const { data } = await api.get('/goals/company');
    return data;
  },
  getById: async (id: string): Promise<Goal> => {
    const { data } = await api.get(`/goals/${id}`);
    return data;
  },
  getTree: async (id: string): Promise<Goal> => {
    const { data } = await api.get(`/goals/${id}/tree`);
    return data;
  },
  create: async (goal: Partial<Goal>): Promise<Goal> => {
    const { data } = await api.post('/goals', goal);
    return data;
  },
  update: async (id: string, updates: Partial<Goal>): Promise<Goal> => {
    const { data } = await api.patch(`/goals/${id}`, updates);
    return data;
  },
  updateProgress: async (id: string, currentValue: number): Promise<Goal> => {
    const { data } = await api.patch(`/goals/${id}/progress`, { currentValue });
    return data;
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`/goals/${id}`);
  },
};

// Goal Templates API
export const goalTemplates = {
  getAll: async (category?: string): Promise<GoalTemplate[]> => {
    const { data } = await api.get('/goal-templates', {
      params: category ? { category } : {},
    });
    return data;
  },
  getById: async (id: string): Promise<GoalTemplate> => {
    const { data } = await api.get(`/goal-templates/${id}`);
    return data;
  },
  create: async (template: Partial<GoalTemplate>): Promise<GoalTemplate> => {
    const { data } = await api.post('/goal-templates', template);
    return data;
  },
  update: async (id: string, updates: Partial<GoalTemplate>): Promise<GoalTemplate> => {
    const { data } = await api.patch(`/goal-templates/${id}`, updates);
    return data;
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`/goal-templates/${id}`);
  },
  useTemplate: async (
    id: string,
    employeeId: string,
    targetValue?: number,
    dueDate?: string,
    visibility?: string
  ): Promise<Goal> => {
    const { data } = await api.post(`/goal-templates/${id}/use`, {
      employeeId,
      targetValue,
      dueDate,
      visibility,
    });
    return data;
  },
};

// Google Calendar API
export const googleCalendar = {
  getConnectionStatus: async (): Promise<CalendarConnectionStatus> => {
    const { data } = await api.get('/calendar/status');
    return data;
  },
  connect: async (): Promise<{ authUrl: string }> => {
    const { data } = await api.get('/calendar/connect');
    return data;
  },
  disconnect: async (): Promise<void> => {
    await api.post('/calendar/disconnect');
  },
  getEvents: async (maxResults?: number): Promise<{ events: any[] }> => {
    const { data } = await api.get('/calendar/events', {
      params: { maxResults },
    });
    return data;
  },
};

// One-on-Ones API
export const oneOnOnes = {
  getMyMeetings: async (): Promise<OneOnOne[]> => {
    const { data } = await api.get('/one-on-ones/my-meetings');
    return data;
  },
  getUpcoming: async (): Promise<OneOnOne[]> => {
    const { data } = await api.get('/one-on-ones/upcoming');
    return data;
  },
  getById: async (id: string): Promise<OneOnOne> => {
    const { data } = await api.get(`/one-on-ones/${id}`);
    return data;
  },
  create: async (meeting: Partial<OneOnOne> & { syncToCalendar?: boolean }): Promise<OneOnOne> => {
    const { data } = await api.post('/one-on-ones', meeting);
    return data;
  },
  update: async (id: string, updates: Partial<OneOnOne>): Promise<OneOnOne> => {
    const { data } = await api.patch(`/one-on-ones/${id}`, updates);
    return data;
  },
  updateSharedNotes: async (id: string, notes: string): Promise<OneOnOne> => {
    const { data } = await api.patch(`/one-on-ones/${id}/shared-notes`, {
      sharedNotes: notes,
    });
    return data;
  },
  updateManagerNotes: async (id: string, notes: string): Promise<OneOnOne> => {
    const { data } = await api.patch(`/one-on-ones/${id}/manager-notes`, {
      managerNotes: notes,
    });
    return data;
  },
  updateActionItems: async (id: string, items: string): Promise<OneOnOne> => {
    const { data } = await api.patch(`/one-on-ones/${id}/action-items`, {
      actionItems: items,
    });
    return data;
  },
  uploadTranscript: async (id: string, file: File): Promise<OneOnOne> => {
    const formData = new FormData();
    formData.append('file', file);

    const { data } = await api.post(`/one-on-ones/${id}/transcript/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return data;
  },
  updateTranscript: async (id: string, transcript: string): Promise<OneOnOne> => {
    const { data } = await api.patch(`/one-on-ones/${id}/transcript`, {
      transcript,
    });
    return data;
  },
  updateDocumentUrl: async (id: string, documentUrl: string): Promise<OneOnOne> => {
    const { data } = await api.patch(`/one-on-ones/${id}/document-url`, {
      documentUrl,
    });
    return data;
  },
  complete: async (id: string): Promise<OneOnOne> => {
    const { data } = await api.patch(`/one-on-ones/${id}/complete`);
    return data;
  },
  cancel: async (id: string): Promise<OneOnOne> => {
    const { data } = await api.patch(`/one-on-ones/${id}/cancel`);
    return data;
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`/one-on-ones/${id}`);
  },
  linkCalendarEvent: async (eventData: {
    googleEventId: string;
    googleEventUrl?: string;
    employeeId: string;
    scheduledAt: string;
    title?: string;
  }): Promise<OneOnOne> => {
    const { data } = await api.post('/one-on-ones/link-calendar-event', eventData);
    return data;
  },
  getDocuments: async (id: string): Promise<any[]> => {
    const { data } = await api.get(`/one-on-ones/${id}/documents`);
    return data;
  },
  addDocument: async (id: string, documentData: {
    title: string;
    url: string;
    isRecurring?: boolean;
  }): Promise<any> => {
    const { data } = await api.post(`/one-on-ones/${id}/documents`, documentData);
    return data;
  },
  deleteDocument: async (id: string, docId: string): Promise<void> => {
    await api.delete(`/one-on-ones/${id}/documents/${docId}`);
  },
};

// Development Plans API
export const developmentPlans = {
  getMyPlan: async (): Promise<DevelopmentPlan> => {
    const { data } = await api.get('/development-plans/my-plan');
    return data;
  },
  getUserPlan: async (userId: string): Promise<DevelopmentPlan> => {
    const { data } = await api.get(`/development-plans/user/${userId}`);
    return data;
  },
  getById: async (id: string): Promise<DevelopmentPlan> => {
    const { data } = await api.get(`/development-plans/${id}`);
    return data;
  },
  create: async (plan: Partial<DevelopmentPlan>): Promise<DevelopmentPlan> => {
    const { data } = await api.post('/development-plans', plan);
    return data;
  },
  update: async (id: string, updates: Partial<DevelopmentPlan>): Promise<DevelopmentPlan> => {
    const { data } = await api.patch(`/development-plans/${id}`, updates);
    return data;
  },
  updateProgress: async (id: string, progress: number): Promise<DevelopmentPlan> => {
    const { data } = await api.patch(`/development-plans/${id}/progress`, { progress });
    return data;
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`/development-plans/${id}`);
  },
};

// Manager API
export const manager = {
  getTodos: async (): Promise<any> => {
    const { data } = await api.get('/manager/todos');
    return data;
  },
  getTeamActivity: async (limit?: number): Promise<any[]> => {
    const { data } = await api.get('/manager/team-activity', {
      params: { limit },
    });
    return data;
  },
  getTeamSummary: async (): Promise<any> => {
    const { data } = await api.get('/manager/team-summary');
    return data;
  },
};

export default api;
