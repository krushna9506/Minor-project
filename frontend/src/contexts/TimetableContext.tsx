import React, { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import timetableService from '../services/timetableService';
import type { 
  Timetable, 
  TimetableCreate, 
  Program,
  Course,
  Faculty,
  Room 
} from '../services/timetableService';

// Combined form data structure that matches all tabs
export interface TimetableFormData {
  // Basic Info (from Academic Structure)
  title: string;
  program_id: string;
  semester: number;
  academic_year: string;
  department: string;
  
  // Working Days Configuration
  working_days: {
    monday: boolean;
    tuesday: boolean;
    wednesday: boolean;
    thursday: boolean;
    friday: boolean;
    saturday: boolean;
    sunday: boolean;
  };

  // Time Configuration
  time_slots: {
    start_time: string;
    end_time: string;
    slot_duration: number;
    break_duration: number;
    lunch_break: boolean;
    lunch_start: string;
    lunch_end: string;
  };

  // Courses
  courses: Array<{
    id?: string;
    code: string;
    name: string;
    credits: number;
    type: string;
    hours_per_week: number;
    min_per_session: number;
    faculty_id?: string;
  }>;

  // Faculty
  faculty: Array<{
    id?: string;
    name: string;
    employee_id: string;
    department: string;
    designation: string;
    email: string;
    subjects: string[];
    max_hours_per_week: number;
    available_days: string[];
  }>;

  // Student Groups
  student_groups: Array<{
    id?: string;
    name: string;
    course_ids: string[];
    year: number;
    semester: string;
    section: string;
    student_strength: number;
    group_type: string;
    program_id: string;
    created_by?: string;
    created_at?: string;
    updated_at?: string;
  }>;

  // Rooms
  rooms: Room[];

  // Constraints
  constraints: {
    max_periods_per_day: number;
    max_consecutive_hours: number;
    min_break_between_subjects: number;
    avoid_first_last_slot: boolean;
    balance_workload: boolean;
    prefer_morning_slots: boolean;
  };

  // Draft and generation settings
  is_draft: boolean;
  auto_save: boolean;
}

interface TimetableContextType {
  // Form Data
  formData: TimetableFormData;
  setFormData: (data: Partial<TimetableFormData>) => void;
  updateFormData: (section: keyof TimetableFormData, data: any) => void;

  // Current Timetable
  currentTimetable: Timetable | null;
  setCurrentTimetable: (timetable: Timetable | null) => void;

  // Loading States
  loading: boolean;
  saving: boolean;
  generating: boolean;

  // Available Data
  programs: Program[];
  availableCourses: Course[];
  availableFaculty: Faculty[];
  availableRooms: Room[];

  // Actions
  loadTimetable: (id: string) => Promise<void>;
  saveDraft: () => Promise<Timetable | null>;
  saveTimetable: () => Promise<Timetable | null>;
  generateTimetable: () => Promise<void>;
  exportTimetable: (format: 'excel' | 'pdf' | 'json') => Promise<void>;

  // Data Loading
  loadPrograms: () => Promise<void>;
  loadCourses: (programId: string, semester: number) => Promise<void>;
  loadFaculty: () => Promise<void>;
  loadRooms: () => Promise<void>;

  // Validation
  validateCurrentTab: (tabIndex: number) => boolean;
  getValidationErrors: (tabIndex: number) => string[];
}

const defaultFormData: TimetableFormData = {
  title: '',
  program_id: '',
  semester: 1,
  academic_year: '2024-25',
  department: '',
  
  working_days: {
    monday: true,
    tuesday: true,
    wednesday: true,
    thursday: true,
    friday: true,
    saturday: false,
    sunday: false,
  },

  time_slots: {
    start_time: '09:00',
    end_time: '17:00',
    slot_duration: 50,
    break_duration: 10,
    lunch_break: true,
    lunch_start: '13:00',
    lunch_end: '14:00',
  },

  courses: [],
  faculty: [],
  student_groups: [],
  rooms: [],

  constraints: {
    max_periods_per_day: 8,
    max_consecutive_hours: 3,
    min_break_between_subjects: 1,
    avoid_first_last_slot: false,
    balance_workload: true,
    prefer_morning_slots: false,
  },

  is_draft: true,
  auto_save: true,
};

const defaultWorkingDays: TimetableFormData['working_days'] = {
  monday: true,
  tuesday: true,
  wednesday: true,
  thursday: true,
  friday: true,
  saturday: false,
  sunday: false,
};

const defaultTimeSettings: TimetableFormData['time_slots'] = {
  start_time: '09:00',
  end_time: '17:00',
  slot_duration: 60,
  break_duration: 15,
  lunch_break: true,
  lunch_start: '12:00',
  lunch_end: '13:00',
};

const isPlainObject = (value: unknown): value is Record<string, any> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const extractFormWorkingDays = (metadata: Record<string, any>) => {
  if (isPlainObject(metadata.form_working_days)) {
    return {
      ...defaultWorkingDays,
      ...metadata.form_working_days,
    };
  }

  if (isPlainObject(metadata.working_days)) {
    return {
      ...defaultWorkingDays,
      ...metadata.working_days,
    };
  }

  return defaultWorkingDays;
};

const extractFormTimeSettings = (metadata: Record<string, any>) => {
  if (isPlainObject(metadata.form_time_settings)) {
    return {
      ...defaultTimeSettings,
      ...metadata.form_time_settings,
    };
  }

  if (isPlainObject(metadata.time_slots)) {
    return {
      ...defaultTimeSettings,
      ...metadata.time_slots,
    };
  }

  return defaultTimeSettings;
};

const TimetableContext = createContext<TimetableContextType | undefined>(undefined);

export const useTimetableContext = () => {
  const context = useContext(TimetableContext);
  if (!context) {
    throw new Error('useTimetableContext must be used within a TimetableProvider');
  }
  return context;
};

interface TimetableProviderProps {
  children: ReactNode;
}

export const TimetableProvider: React.FC<TimetableProviderProps> = ({ children }) => {
  const [formData, setFormDataState] = useState<TimetableFormData>(defaultFormData);
  const [currentTimetable, setCurrentTimetable] = useState<Timetable | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  const [programs, setPrograms] = useState<Program[]>([]);
  const [availableCourses, setAvailableCourses] = useState<Course[]>([]);
  const [availableFaculty, setAvailableFaculty] = useState<Faculty[]>([]);
  const [availableRooms, setAvailableRooms] = useState<Room[]>([]);

  const setFormData = useCallback((data: Partial<TimetableFormData>) => {
    setFormDataState(prev => ({ ...prev, ...data }));
  }, []);

  const updateFormData = useCallback((section: keyof TimetableFormData, data: any) => {
    setFormDataState(prev => ({ ...prev, [section]: data }));
  }, []);

  const buildPersistedMetadata = useCallback(() => {
    const existingMetadata = ((currentTimetable?.metadata || {}) as Record<string, any>);
    const preservedWorkingDays = Array.isArray(existingMetadata.working_days)
      ? existingMetadata.working_days
      : formData.working_days;
    const preservedTimeSlots = Array.isArray(existingMetadata.time_slots)
      ? existingMetadata.time_slots
      : formData.time_slots;

    return {
      ...existingMetadata,
      department: formData.department,
      working_days: preservedWorkingDays,
      time_slots: preservedTimeSlots,
      form_working_days: formData.working_days,
      form_time_settings: formData.time_slots,
      courses: formData.courses,
      faculty: formData.faculty,
      student_groups: formData.student_groups,
      rooms: formData.rooms,
      constraints: formData.constraints,
    };
  }, [currentTimetable, formData]);

  const loadTimetable = useCallback(async (id: string) => {
    setLoading(true);
    try {
      console.log('📥 Loading timetable with ID:', id);
      const timetable = await timetableService.getTimetable(id);
      console.log('📦 Loaded timetable data:', timetable);
      
      // Ensure the timetable has an id field - fix backend inconsistency
      if (!timetable.id && (timetable as any)._id) {
        console.log('🔧 Converting _id to id field');
        (timetable as any).id = (timetable as any)._id;
      }
      
      setCurrentTimetable(timetable);
      
      // Convert timetable data to form data
      const metadata = (timetable.metadata || {}) as Record<string, any>;
      console.log('📋 Timetable metadata:', metadata);
      
      const loadedFormData: TimetableFormData = {
        // Basic info
        title: timetable.title || '',
        program_id: timetable.program_id || '',
        semester: timetable.semester || 1,
        academic_year: timetable.academic_year || '',
        department: metadata.department || '', // Check metadata for department
        
        // Status
        is_draft: timetable.is_draft ?? true,
        auto_save: metadata.auto_save ?? true,
        
        // Working days from metadata
        working_days: extractFormWorkingDays(metadata),
        
        // Time slots from metadata
        time_slots: extractFormTimeSettings(metadata),
        
        // All other data from metadata
        courses: metadata.courses || [],
        faculty: metadata.faculty || [],
        student_groups: metadata.student_groups || [],
        rooms: metadata.rooms || [],
        
        constraints: metadata.constraints || {
          max_periods_per_day: 8,
          max_consecutive_hours: 3,
          min_break_between_subjects: 15,
          avoid_first_last_slot: false,
          balance_workload: true,
          priority_subjects: [],
          faculty_preferences: {},
          room_preferences: {},
          time_preferences: {},
        },
      };
      
      console.log('📋 Converted form data:', loadedFormData);
      setFormData(loadedFormData);
      
    } catch (error) {
      console.error('❌ Error loading timetable:', error);
    } finally {
      setLoading(false);
    }
  }, [setFormData]);

  const saveDraft = useCallback(async (): Promise<Timetable | null> => {
    setSaving(true);
    try {
      // Get the timetable ID - handle both id and _id fields
      const timetableId = currentTimetable?.id || (currentTimetable as any)?._id;
      
      const draftData = {
        title: formData.title,
        program_id: formData.program_id,
        semester: formData.semester,
        academic_year: formData.academic_year,
        is_draft: true,
        metadata: buildPersistedMetadata(),
      };

      let result: Timetable;
      
      // Check if we're editing an existing timetable
      if (timetableId) {
        console.log('📝 Updating existing timetable:', timetableId);
        result = await timetableService.updateTimetable(timetableId, draftData);
      } else {
        console.log('🆕 Creating new draft timetable');
        result = await timetableService.saveDraft(draftData);
      }
      
      setCurrentTimetable(result);
      console.log('📄 Draft saved successfully');
      return result;
    } catch (error) {
      console.error('❌ Error saving draft:', error);
      throw error;
    } finally {
      setSaving(false);
    }
  }, [buildPersistedMetadata, currentTimetable, formData.academic_year, formData.program_id, formData.semester, formData.title]);

  const saveTimetable = useCallback(async (): Promise<Timetable | null> => {
    setSaving(true);
    try {
      const timetableData: TimetableCreate = {
        title: formData.title,
        program_id: formData.program_id,
        semester: formData.semester,
        academic_year: formData.academic_year,
        metadata: buildPersistedMetadata(),
      };

      // Get the timetable ID - handle both id and _id fields
      const timetableId = currentTimetable?.id || (currentTimetable as any)?._id;

      let result: Timetable;
      if (timetableId) {
        console.log('📝 Updating existing timetable:', timetableId);
        result = await timetableService.updateTimetable(timetableId, {
          ...timetableData,
          is_draft: false,
        });
      } else {
        console.log('🆕 Creating new timetable');
        result = await timetableService.createTimetable(timetableData);
      }
      
      setCurrentTimetable(result);
      console.log('Timetable saved successfully');
      return result;
    } catch (error) {
      console.error('Error saving timetable:', error);
      throw error;
    } finally {
      setSaving(false);
    }
  }, [buildPersistedMetadata, currentTimetable, formData.academic_year, formData.program_id, formData.semester, formData.title]);

  const generateTimetable = useCallback(async () => {
    setGenerating(true);
    try {
      const result = await timetableService.generateAdvancedTimetable({
        program_id: formData.program_id,
        semester: formData.semester,
        academic_year: formData.academic_year,
        title: formData.title || `AI Generated Timetable - ${formData.academic_year}`,
      });
      setCurrentTimetable(result?.timetable ?? result);
      console.log('Timetable generated successfully');
    } catch (error) {
      console.error('Error generating timetable:', error);
    } finally {
      setGenerating(false);
    }
  }, [formData]);

  const exportTimetable = useCallback(async (format: 'excel' | 'pdf' | 'json') => {
    if (!currentTimetable?.id) return;

    try {
      const blob = await timetableService.exportTimetable(currentTimetable.id, format);
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `timetable_${currentTimetable.id}.${format === 'excel' ? 'xlsx' : format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting timetable:', error);
    }
  }, [currentTimetable]);

  const loadPrograms = useCallback(async () => {
    console.log('🎯 TimetableContext - Starting to load programs...');
    
    // Debug auth state before making API call
    const authStorage = localStorage.getItem('auth-storage');
    console.log('🎯 TimetableContext - Auth storage check:', authStorage);
    
    // Parse and show detailed auth info
    if (authStorage) {
      try {
        const parsed = JSON.parse(authStorage);
        console.log('🎯 TimetableContext - Parsed auth data:', parsed);
        console.log('🎯 TimetableContext - User:', parsed?.state?.user);
        console.log('🎯 TimetableContext - User email:', parsed?.state?.user?.email);
        console.log('🎯 TimetableContext - User is_admin:', parsed?.state?.user?.is_admin);
        console.log('🎯 TimetableContext - Token exists:', !!parsed?.state?.token);
        console.log('🎯 TimetableContext - Is authenticated:', parsed?.state?.isAuthenticated);
      } catch (e) {
        console.error('🎯 TimetableContext - Failed to parse auth storage:', e);
      }
    }
    
    try {
      console.log('🎯 TimetableContext - Calling timetableService.getPrograms()...');
      const programsData = await timetableService.getPrograms();
      console.log('🎯 TimetableContext - Programs loaded successfully:', programsData);
      setPrograms(programsData);
    } catch (error: any) {
      console.error('🎯 TimetableContext - Error loading programs:', error);
      console.error('🎯 TimetableContext - Error details:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data
      });
    }
  }, []);

  const loadCourses = useCallback(async (programId: string, semester: number) => {
    try {
      const coursesData = await timetableService.getCourses(programId, semester);
      setAvailableCourses(coursesData);
    } catch (error) {
      console.error('Error loading courses:', error);
    }
  }, []);

  const loadFaculty = useCallback(async () => {
    try {
      const facultyData = await timetableService.getFaculty();
      setAvailableFaculty(facultyData);
    } catch (error) {
      console.error('Error loading faculty:', error);
    }
  }, []);

  const loadRooms = useCallback(async () => {
    try {
      const roomsData = await timetableService.getRooms();
      setAvailableRooms(roomsData);
    } catch (error) {
      console.error('Error loading rooms:', error);
    }
  }, []);

  const validateCurrentTab = useCallback((tabIndex: number): boolean => {
    switch (tabIndex) {
      case 0: // Academic Structure
        return !!(formData.program_id && formData.semester && formData.academic_year);
      case 1: // Courses
        return formData.courses.length > 0;
      case 2: // Faculty
        return formData.faculty.length > 0;
      case 3: // Student Groups
        return formData.student_groups.length > 0;
      case 4: // Rooms
        return formData.rooms.length > 0;
      case 5: // Time Constraints (Handled dynamically via rules in Generate tab)
        return true;
      default:
        return true;
    }
  }, [formData]);

  const getValidationErrors = useCallback((tabIndex: number): string[] => {
    const errors: string[] = [];
    
    switch (tabIndex) {
      case 0:
        if (!formData.program_id) errors.push('Program is required');
        if (!formData.semester) errors.push('Semester is required');
        if (!formData.academic_year) errors.push('Academic year is required');
        break;
      case 1:
        if (formData.courses.length === 0) errors.push('At least one course is required');
        break;
      case 2:
        if (formData.faculty.length === 0) errors.push('At least one faculty member is required');
        break;
      case 3:
        if (formData.student_groups.length === 0) errors.push('At least one student group is required');
        break;
      case 4:
        if (formData.rooms.length === 0) errors.push('At least one room is required');
        break;
      case 5:
        // Validation now handled externally via Rules Dropdown logic
        break;
    }
    
    return errors;
  }, [formData]);

  const value: TimetableContextType = {
    formData,
    setFormData,
    updateFormData,
    currentTimetable,
    setCurrentTimetable,
    loading,
    saving,
    generating,
    programs,
    availableCourses,
    availableFaculty,
    availableRooms,
    loadTimetable,
    saveDraft,
    saveTimetable,
    generateTimetable,
    exportTimetable,
    loadPrograms,
    loadCourses,
    loadFaculty,
    loadRooms,
    validateCurrentTab,
    getValidationErrors,
  };

  return (
    <TimetableContext.Provider value={value}>
      {children}
    </TimetableContext.Provider>
  );
};

export default TimetableContext;
