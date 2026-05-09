import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

// Types based on backend models
export interface TimeSlot {
  day: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
}

export interface TimetableEntry {
  course_id: string;
  faculty_id: string;
  room_id: string;
  time_slot: TimeSlot;
  entry_type?: string;
  is_mandatory?: boolean;
}

export interface TimetableBase {
  title: string;
  program_id: string;
  semester: number;
  academic_year: string;
  entries?: TimetableEntry[];
  is_draft?: boolean;
  metadata?: Record<string, any>;
}

export interface TimetableCreate {
  title: string;
  program_id: string;
  semester: number;
  academic_year: string;
  metadata?: Record<string, any>;
}

export interface TimetableUpdate {
  title?: string;
  program_id?: string;
  semester?: number;
  academic_year?: string;
  entries?: TimetableEntry[];
  is_draft?: boolean;
  metadata?: Record<string, any>;
}

export interface Timetable extends TimetableBase {
  id: string;
  created_by: string;
  created_at: string;
  updated_at?: string;
  generated_at?: string;
  validation_status: string;
  optimization_score?: number;
}

export interface TimetableGenerationRequest {
  program_id: string;
  semester: number;
  academic_year: string;
  constraints?: Record<string, any>;
  preferences?: Record<string, any>;
}

export interface Program {
  id: string;
  name: string;
  code: string;
  type: string;
  department: string;
  duration_years: number;
  total_semesters: number;
  credits_required: number;
  description?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Course {
  id?: string;
  code: string;
  name: string;
  credits: number;
  type: string; // Core, Elective, Minor, Practical
  hours_per_week: number;
  min_per_session: number;
  semester?: number;
  program_id?: string;
  description?: string;
  prerequisites?: string[];
  is_lab?: boolean;
  lab_hours?: number;
  faculty_id?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Faculty {
  id: string;
  name: string;
  employee_id: string;
  department: string;
  designation: string;
  email: string;
  subjects: string[];
  max_hours_per_week: number;
  available_days: string[];
}

export interface StudentGroup {
  id: string;
  name: string;
  course_ids: string[]; // Array of course IDs
  year: number; // 1, 2, 3, 4
  semester: string; // "Odd", "Even"
  section: string; // "A", "B", "C", "D", "Group1", "Group2"
  student_strength: number;
  group_type: string; // "Regular Class", "Practical Lab"
  program_id: string;
  created_by: string;
  created_at: string;
  updated_at?: string;
}

export interface Room {
  id: string;
  name: string;
  building: string;
  floor: number;
  capacity: number;
  room_type: string;
  facilities: string[];
  is_lab: boolean;
  is_accessible: boolean;
  has_projector: boolean;
  has_ac: boolean;
  has_wifi: boolean;
  location_notes?: string;
  is_active: boolean;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Rule {
  id: string;
  name: string;
  description?: string;
  rule_type: string; // e.g., 'no_overlap', 'min_gap', 'max_hours_per_day'
  params?: Record<string, any>;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

class TimetableService {
  private api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  constructor() {
    console.log('🚨 TimetableService constructor called - Setting up interceptor');

    // Add request interceptor to this instance
    this.api.interceptors.request.use((config) => {
      console.log('🚨 TIMETABLE SERVICE INTERCEPTOR TRIGGERED!');
      console.log('🚨 Request URL:', config.url);
      console.log('🚨 Request method:', config.method);

      // Get auth data from localStorage directly since we can't import useAuthStore here
      const authStorage = localStorage.getItem('auth-storage');
      console.log('🚨 Raw auth storage:', authStorage);

      let token = null;
      let isAuthenticated = false;

      if (authStorage) {
        try {
          const parsed = JSON.parse(authStorage);
          console.log('🚨 Parsed auth storage:', parsed);
          token = parsed?.state?.token;
          isAuthenticated = parsed?.state?.isAuthenticated;
          console.log('🚨 Extracted token:', token ? `${token.substring(0, 20)}...` : 'NULL');
          console.log('🚨 Extracted isAuthenticated:', isAuthenticated);
        } catch (e) {
          console.error('🚨 Failed to parse auth storage:', e);
        }
      } else {
        console.warn('🚨 No auth storage found in localStorage!');
      }

      console.log('🔐 TimetableService - Auth state:', {
        isAuthenticated,
        hasToken: !!token,
        tokenPreview: token ? `${token.substring(0, 20)}...` : 'None'
      });

      if (token && isAuthenticated) {
        config.headers.Authorization = `Bearer ${token}`;
        console.log('🔐 TimetableService - Added Authorization header:', `Bearer ${token.substring(0, 20)}...`);
      } else {
        console.warn('🔐 TimetableService - No token or not authenticated!');
      }

      console.log('🔐 TimetableService - Final headers:', config.headers);
      console.log('🔐 TimetableService - Final Authorization header:', config.headers.Authorization);
      return config;
    }, (error) => {
      console.error('🚨 TimetableService interceptor error:', error);
      return Promise.reject(error);
    });

    console.log('🚨 TimetableService interceptor setup complete');

    // Add response interceptor to handle 401 errors
    this.api.interceptors.response.use(
      (response) => {
        console.log('🚨 Response interceptor - Success:', response.status);
        return response;
      },
      async (error) => {
        console.error('🚨 Response interceptor - Error:', error.response?.status, error.response?.data);

        // Handle 401 Unauthorized errors
        if (error.response?.status === 401) {
          console.warn('🚨 Token expired or invalid - attempting refresh');

          try {
            // Try to refresh the session by re-authenticating with stored credentials
            await this.handleTokenRefresh();

            // Retry the original request with the new token
            const originalRequest = error.config;
            return this.api.request(originalRequest);
          } catch (refreshError) {
            console.error('🚨 Token refresh failed - redirecting to login');

            // Clear invalid auth data
            localStorage.removeItem('auth-storage');

            // Redirect to login page
            if (window.location.pathname !== '/login') {
              window.location.href = '/login';
            }

            return Promise.reject(error);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  private async handleTokenRefresh(): Promise<void> {
    console.log('🔄 Attempting to refresh token');

    // Get stored user credentials if available
    const authStorage = localStorage.getItem('auth-storage');
    if (!authStorage) {
      throw new Error('No auth data available for refresh');
    }

    const parsed = JSON.parse(authStorage);
    const user = parsed?.state?.user;

    if (!user?.email) {
      throw new Error('No user email available for refresh');
    }

    // For admin users, we'll use the known admin password
    // In production, you might want to implement refresh tokens or re-prompt for password
    const isAdmin = user.is_admin;
    if (!isAdmin) {
      throw new Error('Auto-refresh only supported for admin users');
    }

    // Re-authenticate with admin credentials
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      username: user.email,
      password: 'admin123' // This should ideally be stored securely or use refresh tokens
    });

    const { access_token, user: userData } = loginResponse.data;

    // Update localStorage with new token
    const newAuthData = {
      state: {
        user: userData,
        token: access_token,
        isAuthenticated: true
      }
    };

    localStorage.setItem('auth-storage', JSON.stringify(newAuthData));
    console.log('✅ Token refreshed successfully');
  }

  // Timetable CRUD operations
  async createTimetable(data: TimetableCreate): Promise<Timetable> {
    console.log('TimetableService - Creating timetable:', data);
    const response = await this.api.post('/timetable/', data);
    return response.data;
  }

  async getTimetable(id: string): Promise<Timetable> {
    const response = await this.api.get(`/timetable/${id}`);
    return response.data;
  }

  async updateTimetable(id: string, data: TimetableUpdate): Promise<Timetable> {
    const response = await this.api.put(`/timetable/${id}`, data);
    return response.data;
  }

  async deleteTimetable(id: string): Promise<void> {
    await this.api.delete(`/timetable/${id}`);
  }

  async getAllTimetables(): Promise<Timetable[]> {
    const response = await this.api.get('/timetable/');
    return response.data;
  }

  // Draft operations
  async saveDraft(data: TimetableBase): Promise<Timetable> {
    const response = await this.api.post('/timetable/draft', data);
    return response.data;
  }

  // AI-powered generation
  async generateTimetable(data: TimetableGenerationRequest): Promise<Timetable> {
    const response = await this.api.post('/timetable/generate', data);
    return response.data;
  }

  // Advanced AI-powered generation
  async generateAdvancedTimetable(data: {
    program_id: string;
    semester: number;
    academic_year: string;
    title?: string;
    rule_id?: string;
    courses?: any[];
    faculty?: any[];
    student_groups?: any[];
    rooms?: any[];
  }): Promise<any> {
    const response = await this.api.post('/timetable/generate-advanced', data);
    return response.data;
  }

  async optimizeTimetable(id: string, preferences?: Record<string, any>): Promise<Timetable> {
    const response = await this.api.post(`/timetable/${id}/optimize`, { preferences });
    return response.data;
  }

  // Export functionality
  async exportTimetable(id: string, format: 'excel' | 'pdf' | 'json' = 'excel'): Promise<Blob> {
    const response = await this.api.get(`/timetable/${id}/export`, {
      params: { format },
      responseType: 'blob',
    });
    return response.data;
  }

  // Programs
  async getPrograms(): Promise<Program[]> {
    console.log('🚨 TIMETABLE SERVICE - Getting programs...');
    const response = await this.api.get('/programs/');
    console.log('📋 Programs API response:', response.data);
    if (response.data && response.data.length > 0) {
      console.log('📋 First program structure:', response.data[0]);
      console.log('📋 First program id field:', response.data[0].id);
      console.log('📋 First program _id field:', response.data[0]._id);
    }
    return response.data;
  }

  async getProgram(id: string): Promise<Program> {
    const response = await this.api.get(`/programs/${id}`);
    return response.data;
  }

  async createProgram(data: Omit<Program, 'id'>): Promise<Program> {
    const response = await this.api.post('/programs/', data);
    return response.data;
  }

  async updateProgram(id: string, data: Partial<Program>): Promise<Program> {
    const response = await this.api.put(`/programs/${id}`, data);
    return response.data;
  }

  async deleteProgram(id: string): Promise<void> {
    await this.api.delete(`/programs/${id}`);
  }

  async getProgramCourses(programId: string, semester?: number): Promise<Course[]> {
    const params: any = {};
    if (semester) params.semester = semester;

    const response = await this.api.get(`/programs/${programId}/courses`, {
      params,
    });
    return response.data;
  }

  async getProgramStatistics(programId: string): Promise<any> {
    const response = await this.api.get(`/programs/${programId}/statistics`);
    return response.data;
  }

  // Courses
  async getCourses(programId?: string, semester?: number): Promise<Course[]> {
    const params: any = {};
    if (programId) params.program_id = programId;
    if (semester) params.semester = semester;

    const response = await this.api.get('/courses/', {
      params,
    });
    return response.data;
  }

  async getCourse(courseId: string): Promise<Course> {
    const response = await this.api.get(`/courses/${courseId}`);
    return response.data;
  }

  async createCourse(data: Omit<Course, 'id' | 'created_at' | 'updated_at'>): Promise<Course> {
    console.log('🚨 Creating course with data:', data);
    console.log('🚨 Data type check:', typeof data);
    console.log('🚨 Data keys:', Object.keys(data));
    console.log('🚨 Data values:', Object.values(data));
    try {
      const response = await this.api.post('/courses/', data);
      console.log('✅ Course creation successful:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Course creation failed:', error);
      console.error('❌ Error response:', error.response?.data);
      console.error('❌ Error status:', error.response?.status);
      throw error;
    }
  }

  async updateCourse(courseId: string, data: Partial<Course>): Promise<Course> {
    const response = await this.api.put(`/courses/${courseId}`, data);
    return response.data;
  }

  async deleteCourse(courseId: string): Promise<void> {
    await this.api.delete(`/courses/${courseId}`);
  }

  async createCoursesBulk(courses: Omit<Course, 'id' | 'created_at' | 'updated_at'>[]): Promise<Course[]> {
    const response = await this.api.post('/courses/bulk', courses);
    return response.data;
  }

  // Faculty
  async getFaculty(): Promise<Faculty[]> {
    const response = await this.api.get('/faculty/');
    return response.data;
  }

  async createFaculty(data: Omit<Faculty, 'id'>): Promise<Faculty> {
    const response = await this.api.post('/faculty/', data);
    return response.data;
  }

  async updateFaculty(id: string, data: Partial<Omit<Faculty, 'id'>>): Promise<Faculty> {
    const response = await this.api.put(`/faculty/${id}`, data);
    return response.data;
  }

  async deleteFaculty(id: string): Promise<void> {
    await this.api.delete(`/faculty/${id}`);
  }

  async getFacultyById(id: string): Promise<Faculty> {
    const response = await this.api.get(`/faculty/${id}`);
    return response.data;
  }

  // Student Groups
  async getStudentGroups(programId?: string): Promise<StudentGroup[]> {
    const params: any = {};
    if (programId) params.program_id = programId;

    const response = await this.api.get('/student-groups/', {
      params,
    });
    return response.data;
  }

  async createStudentGroup(data: Omit<StudentGroup, 'id' | 'created_by' | 'created_at' | 'updated_at'>): Promise<StudentGroup> {
    const response = await this.api.post('/student-groups/', data);
    return response.data;
  }

  async updateStudentGroup(id: string, data: Partial<Omit<StudentGroup, 'id' | 'created_by' | 'created_at' | 'updated_at'>>): Promise<StudentGroup> {
    const response = await this.api.put(`/student-groups/${id}`, data);
    return response.data;
  }

  async deleteStudentGroup(id: string): Promise<void> {
    await this.api.delete(`/student-groups/${id}`);
  }

  async getStudentGroupById(id: string): Promise<StudentGroup> {
    const response = await this.api.get(`/student-groups/${id}`);
    return response.data;
  }

  async getAvailableYearsForProgram(programId: string): Promise<number[]> {
    const response = await this.api.get(`/student-groups/program/${programId}/available-years`);
    return response.data;
  }

  // Rooms
  async getRooms(building?: string, roomType?: string, minCapacity?: number): Promise<Room[]> {
    const params: any = {};
    if (building) params.building = building;
    if (roomType) params.room_type = roomType;
    if (minCapacity) params.min_capacity = minCapacity;

    const response = await this.api.get('/rooms/', {
      params,
    });
    return response.data;
  }

  async createRoom(data: Omit<Room, 'id' | 'created_by' | 'created_at' | 'updated_at'>): Promise<Room> {
    const response = await this.api.post('/rooms/', data);
    return response.data;
  }

  async updateRoom(id: string, data: Partial<Omit<Room, 'id' | 'created_by' | 'created_at' | 'updated_at'>>): Promise<Room> {
    const response = await this.api.put(`/rooms/${id}`, data);
    return response.data;
  }

  async deleteRoom(id: string): Promise<void> {
    await this.api.delete(`/rooms/${id}`);
  }

  async getRoomById(id: string): Promise<Room> {
    const response = await this.api.get(`/rooms/${id}`);
    return response.data;
  }

  // Rules
  async getRules(): Promise<Rule[]> {
    const response = await this.api.get('/rules/');
    return response.data;
  }

  async createRule(data: Omit<Rule, 'id' | 'created_at' | 'updated_at'>): Promise<Rule> {
    const response = await this.api.post('/rules/', data);
    return response.data;
  }

  async updateRule(id: string, data: Partial<Rule>): Promise<Rule> {
    const response = await this.api.put(`/rules/${id}`, data);
    return response.data;
  }

  async deleteRule(id: string): Promise<void> {
    await this.api.delete(`/rules/${id}`);
  }

  // AI Services
  async getAIOptimization(timetableId: string, optimizationGoals?: Record<string, boolean>): Promise<any> {
    const response = await this.api.post('/ai/optimize', {
      timetable_id: timetableId,
      optimization_goals: optimizationGoals || {}
    });
    return response.data;
  }

  async getAISuggestions(timetableId: string, focusAreas?: string[]): Promise<any> {
    const response = await this.api.post('/ai/suggest', {
      timetable_id: timetableId,
      focus_areas: focusAreas || []
    });
    return response.data;
  }

  async getAIAnalysis(timetableId: string, analysisType: string = 'comprehensive'): Promise<any> {
    const response = await this.api.post('/ai/analysis', {
      timetable_id: timetableId,
      analysis_type: analysisType
    });
    return response.data;
  }

  async getAICompliance(timetableId: string): Promise<any> {
    const response = await this.api.post('/ai/validate-schedule', {
      timetable_id: timetableId
    });
    return response.data;
  }

  async queryAI(query: string, context: Record<string, any> = {}): Promise<any> {
    const response = await this.api.post('/ai/query', {
      query,
      context
    });
    return response.data;
  }

  // Constraints
  async getConstraints(params?: any): Promise<Constraint[]> {
    const response = await this.api.get('/constraints/', { params });
    return response.data;
  }

  async createConstraint(data: Omit<Constraint, '_id' | 'id' | 'created_at' | 'updated_at'>): Promise<Constraint> {
    const response = await this.api.post('/constraints/', data);
    return response.data;
  }

  async updateConstraint(id: string, data: Partial<Constraint>): Promise<Constraint> {
    const response = await this.api.put(`/constraints/${id}`, data);
    return response.data;
  }

  async deleteConstraint(id: string): Promise<void> {
    await this.api.delete(`/constraints/${id}`);
  }

  async validateConstraints(constraints: Constraint[]): Promise<any> {
    const response = await this.api.post('/constraints/validate', { constraints });
    return response.data;
  }
}

export interface Constraint {
  _id: string;
  id?: string;
  name: string;
  type: string;
  description?: string;
  parameters: Record<string, any>;
  priority: number;
  is_active: boolean;
  program_id?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

// Mock implementation extensions
class MockTimetableService {
  private constraints: Constraint[] = [];

  private programs: Program[] = [
    { id: 'prog1', name: 'B.Ed (Demo)', code: 'BED', type: 'UG', department: 'Education', duration_years: 2, total_semesters: 4, credits_required: 80, is_active: true },
    { id: 'prog2', name: 'FYUP (Demo)', code: 'FYUP', type: 'UG', department: 'Multidisciplinary', duration_years: 4, total_semesters: 8, credits_required: 160, is_active: true },
  ];

  private courses: Course[] = [
    { id: 'c1', code: 'ED101', name: 'Foundations of Education', credits: 3, type: 'Core', hours_per_week: 3, min_per_session: 60 },
    { id: 'c2', code: 'ED102', name: 'Teaching Practice', credits: 2, type: 'Practical', hours_per_week: 2, min_per_session: 60 },
  ];

  private faculty: Faculty[] = [
    { id: 'f1', name: 'Dr. Demo', employee_id: 'EMP001', department: 'Education', designation: 'Professor', email: 'demo@example.com', subjects: ['ED101'], max_hours_per_week: 20, available_days: ['Mon', 'Tue'] },
  ];

  private rooms: Room[] = [
    { id: 'r1', name: 'Room A', building: 'Main', floor: 1, capacity: 40, room_type: 'Classroom', facilities: [], is_lab: false, is_accessible: true, has_projector: true, has_ac: false, has_wifi: true, is_active: true },
  ];

  async getConstraints(): Promise<Constraint[]> { return this.constraints; }
  async createConstraint(data: any): Promise<Constraint> {
    const newConstraint = { ...data, _id: Math.random().toString(36).substr(2, 9), created_at: new Date().toISOString() };
    this.constraints.push(newConstraint);
    return newConstraint;
  }
  async updateConstraint(id: string, data: any): Promise<Constraint> {
    const index = this.constraints.findIndex(c => c._id === id || c.id === id);
    if (index !== -1) {
      this.constraints[index] = { ...this.constraints[index], ...data };
      return this.constraints[index];
    }
    throw new Error('Constraint not found');
  }
  async deleteConstraint(id: string): Promise<void> {
    this.constraints = this.constraints.filter(c => c._id !== id && c.id !== id);
  }
  async validateConstraints(): Promise<any> { return { valid: true }; }

  async getPrograms(): Promise<Program[]> { return this.programs; }
  async getCourses(programId?: string, semester?: number): Promise<Course[]> { return this.courses; }
  async getFaculty(): Promise<Faculty[]> { return this.faculty; }
  async getRooms(): Promise<Room[]> { return this.rooms; }

  private timetables: Timetable[] = [];

  async getAllTimetables(): Promise<Timetable[]> { return this.timetables; }

  async getTimetable(id: string): Promise<Timetable> {
    const found = this.timetables.find(t => t.id === id);
    if (!found) throw new Error('Timetable not found');
    return found;
  }

  async createTimetable(data: TimetableCreate): Promise<Timetable> {
    const newTimetable = {
      ...(data as any),
      id: `tt_${Date.now()}`,
      created_by: 'demo',
      created_at: new Date().toISOString(),
      validation_status: 'draft'
    };
    this.timetables.push(newTimetable);
    return newTimetable;
  }

  async saveDraft(data: TimetableBase): Promise<Timetable> {
    const newDraft = {
      ...(data as any),
      id: `draft_${Date.now()}`,
      created_by: 'demo',
      created_at: new Date().toISOString(),
      validation_status: 'draft'
    };
    this.timetables.push(newDraft);
    return newDraft;
  }

  async generateTimetable(data: TimetableGenerationRequest): Promise<Timetable> {
    const generated = {
      ...(data as any),
      id: `gen_${Date.now()}`,
      title: `Generated Timetable ${new Date().toLocaleTimeString()}`,
      created_by: 'demo',
      created_at: new Date().toISOString(),
      validation_status: 'generated'
    };
    this.timetables.push(generated);
    return generated;
  }

  async generateAdvancedTimetable(data: any): Promise<any> { return { id: 'gen1', title: data.title || 'Generated Demo Timetable' }; }
  async optimizeTimetable(id: string, preferences?: any): Promise<Timetable> { return { id, title: 'Optimized Timetable', program_id: 'p1', semester: 1, academic_year: '2024', validation_status: 'optimized', created_by: 'ai', created_at: new Date().toISOString() }; }
  async exportTimetable(id: string, format: 'excel' | 'pdf' | 'json' = 'excel'): Promise<Blob> { const blob = new Blob([JSON.stringify({ id, format })], { type: 'application/json' }); return blob; }

  // AI mocks
  async getAIOptimization(timetableId: string): Promise<any> { return { score: 85, issues: [] }; }
  async getAISuggestions(timetableId: string): Promise<any> { return { suggestions: [] }; }
  async getAIAnalysis(timetableId: string): Promise<any> { return { conflicts: 0, utilization: 80 }; }
}

// Decide which implementation to export based on Vite env variable.
// Force real backend implementation by default for actual DB data.
const useMocks = false;

export const timetableService = useMocks ? (new MockTimetableService() as any) : new TimetableService();
export default timetableService;
