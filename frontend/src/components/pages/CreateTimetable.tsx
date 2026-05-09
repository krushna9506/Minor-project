import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Button,
  CircularProgress,
  Alert,
  Snackbar,
  Paper,
  LinearProgress,
} from '@mui/material';
import {
  MenuBook as SubjectsIcon,
  EmojiPeople as TeachersIcon,
  Class as ClassesIcon,
  Room as RoomsIcon,
  AccessTime as LessonsIcon,
  CheckCircle as GenerateIcon,
  Save as SaveIcon,
  SaveAlt as SaveDraftIcon,
  School as AcademicIcon,
} from '@mui/icons-material';
import { useParams, useLocation } from 'react-router-dom';

// Context and Components
import { TimetableProvider, useTimetableContext } from '../../contexts/TimetableContext';
import AcademicStructureTab from './CreateTimetable/AcademicStructureTab';
import CourseInformationTab from './CreateTimetable/CourseInformationTabNew';
import FacultyDataTab from './CreateTimetable/FacultyDataTab';
import StudentGroupsTab from './CreateTimetable/StudentGroupsTab';
import TimeRulesTab from './CreateTimetable/TimeRulesTab';
import InfrastructureDataTab from './CreateTimetable/RoomsTab';
import GenerateReviewTab from './CreateTimetable/GenerateReviewTab';
import TimetableDisplay from './CreateTimetable/TimetableDisplay';

// Tab configuration with icons and validation
const tabConfig = [
  {
    id: 'academic',
    label: 'Academic Setup',
    icon: <AcademicIcon />,
    component: AcademicStructureTab,
    description: 'Configure program, semester, and academic year'
  },
  {
    id: 'courses',
    label: 'Courses',
    icon: <SubjectsIcon />,
    component: CourseInformationTab,
    description: 'Add subjects and course information'
  },
  {
    id: 'faculty',
    label: 'Faculty',
    icon: <TeachersIcon />,
    component: FacultyDataTab,
    description: 'Manage teaching staff and their availability'
  },
  {
    id: 'students',
    label: 'Student Groups',
    icon: <ClassesIcon />,
    component: StudentGroupsTab,
    description: 'Configure classes and student groups'
  },
  {
    id: 'infrastructure',
    label: 'Rooms',
    icon: <RoomsIcon />,
    component: InfrastructureDataTab,
    description: 'Set up classrooms and facilities'
  },
  {
    id: 'constraints',
    label: 'Time & Rules',
    icon: <LessonsIcon />,
    component: TimeRulesTab,
    description: 'Define time slots and scheduling constraints'
  },
  {
    id: 'generate',
    label: 'Generate',
    icon: <GenerateIcon />,
    component: GenerateReviewTab,
    description: 'Review and generate final timetable'
  }
];

const CreateTimetableInner: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [notification, setNotification] = useState<{
    message: string;
    type: 'success' | 'error' | 'info' | 'warning'
  } | null>(null);
  const [completedTabs, setCompletedTabs] = useState<number[]>([]);

  const { id: timetableId } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  // Determine if we're in view mode
  const isViewMode = timetableId && timetableId !== 'new' && timetableId !== 'create' && !location.pathname.includes('/edit/');

  const {
    formData,
    loading,
    saving,
    loadTimetable,
    saveDraft,
    saveTimetable,
    loadPrograms,
    validateCurrentTab,
    getValidationErrors,
    currentTimetable,
  } = useTimetableContext();

  // Load initial data and existing timetable
  useEffect(() => {
    console.log('🚀 CreateTimetable useEffect - timetableId:', timetableId);
    console.log('🚀 Loading initial data...');
    loadPrograms();

    if (timetableId && timetableId !== 'new') {
      console.log('📝 EDIT MODE - Loading existing timetable:', timetableId);
      console.log('📝 Current form data before loading:', formData);
      loadTimetable(timetableId).then(() => {
        console.log('📝 Timetable loaded, new form data:', formData);
      });
    } else {
      console.log('🆕 CREATE MODE - Starting with new timetable');
    }
  }, [timetableId, loadTimetable, loadPrograms]);

  // Update completed tabs based on validation
  useEffect(() => {
    const completed = tabConfig.map((_, index) => validateCurrentTab(index))
      .map((isValid, index) => isValid ? index : -1)
      .filter(index => index !== -1);

    setCompletedTabs(completed);
  }, [formData, validateCurrentTab]);

  const handleTabChange = async (_event: React.SyntheticEvent, newValue: number) => {
    // Auto-save current tab data before switching
    if (activeTab !== newValue) {
      try {
        // Temporarily disable auto-save to isolate CORS issue
        // await saveDraft();
        console.log('Auto-save disabled temporarily');
      } catch (error) {
        console.warn('Auto-save failed:', error);
      }
    }

    // Validate current tab before allowing navigation forward
    if (newValue > activeTab && !validateCurrentTab(activeTab)) {
      const errors = getValidationErrors(activeTab);
      setNotification({
        message: `Please complete the current step: ${errors.join(', ')}`,
        type: 'warning'
      });
      return;
    }

    setActiveTab(newValue);
  };

  const handleSaveDraft = async () => {
    try {
      const result = await saveDraft();
      if (result?.id && !location.pathname.includes('/edit/')) {
        navigate(`/timetables/edit/${result.id}`, { replace: true });
      }
      setNotification({
        message: 'Draft saved successfully',
        type: 'success'
      });
    } catch (error) {
      console.error('Save draft error:', error);
      setNotification({
        message: 'Failed to save draft',
        type: 'error'
      });
    }
  };

  const handleSave = async () => {
    try {
      const result = await saveTimetable();
      if (result?.id && !location.pathname.includes('/edit/')) {
        navigate(`/timetables/edit/${result.id}`, { replace: true });
      }
      setNotification({
        message: 'Timetable saved successfully',
        type: 'success'
      });
    } catch (error) {
      console.error('Save error:', error);
      setNotification({
        message: 'Failed to save timetable',
        type: 'error'
      });
    }
  };


  const handleCloseNotification = () => {
    setNotification(null);
  };

  // Calculate overall progress based on completed tabs
  const progress = (completedTabs.length / tabConfig.length) * 100;
  const currentTabData = tabConfig[activeTab];

  if (loading) {
    return (
      <Box sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: '#0a0a0a',
        color: 'white'
      }}>
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress size={60} />
          <Typography sx={{ mt: 2, color: '#b0b0b0' }}>
            Loading timetable data...
          </Typography>
        </Box>
      </Box>
    );
  }

  // View mode: Show read-only timetable display
  if (isViewMode && currentTimetable) {
    return (
      <Box sx={{
        minHeight: '100vh',
        backgroundColor: 'background.default',
        p: 3
      }}>
        <TimetableDisplay
          timetableData={currentTimetable}
          onExport={(format) => {
            // TODO: Implement export functionality
            console.log('Export requested:', format);
          }}
        />
      </Box>
    );
  }

  return (
    <Box sx={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: 'background.default',
    }}>

      {/* Navigation Tabs */}
      <Paper sx={{
        position: 'sticky',
        top: 0,
        zIndex: 1100,
        backgroundColor: 'background.paper',
        borderRadius: 0,
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
      }}>
        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2,
          py: 1
        }}>
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              flex: 1,
              '& .MuiTab-root': {
                minHeight: 72,
                textTransform: 'none',
                fontSize: '0.875rem',
                fontWeight: 600,
                color: '#8898aa',
                px: 3,
                py: 2,
                transition: 'all 0.2s ease-in-out',
                '&.Mui-selected': {
                  color: '#5e72e4', // Argon Primary
                  backgroundColor: 'rgba(94, 114, 228, 0.1)',
                },
                '&:hover': {
                  color: '#525f7f',
                  backgroundColor: 'rgba(0, 0, 0, 0.05)',
                },
              },
              '& .MuiTabs-indicator': {
                height: 3,
                backgroundColor: 'primary.main',
                borderRadius: '2px 2px 0 0',
              },
            }}
          >
            {tabConfig.map((tab, index) => (
              <Tab
                key={tab.id}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{ position: 'relative' }}>
                      {tab.icon}
                      {completedTabs.includes(index) && (
                        <GenerateIcon
                          sx={{
                            position: 'absolute',
                            top: -4,
                            right: -4,
                            fontSize: 16,
                            color: 'success.main',
                            backgroundColor: '#1a1a1a',
                            borderRadius: '50%'
                          }}
                        />
                      )}
                    </Box>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 'inherit', color: 'inherit' }}>
                        {tab.label}
                      </Typography>
                      {activeTab === index && (
                        <Typography variant="caption" sx={{ color: activeTab === index ? '#5e72e4' : '#8898aa', opacity: 0.8 }}>
                          {tab.description}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                }
              />
            ))}
          </Tabs>

          {/* Progress Indicator and Action Buttons */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {/* Progress Indicator */}
            <Box sx={{ minWidth: 120 }}>
              <Typography variant="caption" sx={{ color: '#8898aa', fontSize: '0.75rem', fontWeight: 600 }}>
                Progress: {Math.round(progress)}%
              </Typography>
              <LinearProgress
                variant="determinate"
                value={progress}
                sx={{
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  '& .MuiLinearProgress-bar': {
                    backgroundColor: progress === 100 ? '#4caf50' : '#2196f3'
                  }
                }}
              />
            </Box>

            {/* Action Buttons */}
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                size="small"
                startIcon={saving ? <CircularProgress size={14} /> : <SaveDraftIcon />}
                onClick={handleSaveDraft}
                disabled={saving}
                sx={{
                  color: '#5e72e4',
                  borderColor: '#5e72e4',
                  '&:hover': { borderColor: '#233dd2', backgroundColor: 'rgba(94, 114, 228, 0.05)' },
                  fontSize: '0.75rem',
                  py: 0.5,
                  px: 1.5
                }}
              >
                {saving ? 'Saving...' : 'Save Draft'}
              </Button>

              <Button
                variant="contained"
                size="small"
                startIcon={saving ? <CircularProgress size={14} /> : <SaveIcon />}
                onClick={handleSave}
                disabled={saving}
                sx={{
                  fontSize: '0.75rem',
                  py: 0.5,
                  px: 1.5
                }}
              >
                Save
              </Button>
            </Box>
          </Box>
        </Box>
      </Paper>

      {/* Tab Content */}
      <Box sx={{
        flex: 1,
        overflow: 'auto',
        backgroundColor: 'background.default',
        pt: 4,
        pb: 6,
        px: 3
      }}>
        <Box sx={{ maxWidth: '1400px', mx: 'auto' }}>
          {React.createElement(currentTabData.component)}
        </Box>
      </Box>


      {/* Notification Snackbar */}
      <Snackbar
        open={!!notification}
        autoHideDuration={5000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        sx={{ mb: 8 }}
      >
        <Alert
          onClose={handleCloseNotification}
          severity={notification?.type || 'info'}
          sx={{
            width: '100%',
            '& .MuiAlert-icon': {
              fontSize: 20
            }
          }}
        >
          {notification?.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

// Main component with context provider
const CreateTimetableNew: React.FC = () => {
  console.log('CreateTimetableNew component rendering');
  return (
    <TimetableProvider>
      <CreateTimetableInner />
    </TimetableProvider>
  );
};

export default CreateTimetableNew;
