import React, { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  CircularProgress,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Container,
  Paper,
  Avatar,
  Stack,
  Card,
  CardContent,
  Chip,
} from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import {
  MenuBook as CourseIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  CloudDownload as ImportIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import { useTimetableContext } from '../../../contexts/TimetableContext';
import timetableService from '../../../services/timetableService';
import type { Course } from '../../../services/timetableService';

const CourseInformationTab: React.FC = () => {
  const theme = useTheme();
  const { formData, updateFormData, availableFaculty, loadFaculty } = useTimetableContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [availableCourses, setAvailableCourses] = useState<Course[]>([]);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<Course>>({});
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  React.useEffect(() => {
    loadFaculty();
    loadAvailableCourses();
  }, [loadFaculty, formData.program_id, formData.semester]);

  const [newCourse, setNewCourse] = useState<Partial<Course>>({
    code: '',
    name: '',
    credits: 0,
    type: 'Core',
    hours_per_week: 0,
    min_per_session: 50,
    faculty_id: ''
  });

  // Load available courses from backend
  const loadAvailableCourses = async () => {
    setLoading(true);
    try {
      const courses = await timetableService.getCourses(
        formData.program_id || undefined,
        formData.semester || undefined
      );
      setAvailableCourses(courses);
    } catch (err: any) {
      setError('Failed to load courses: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleAddCourse = async () => {
    if (!newCourse.code || !newCourse.name) {
      setError('Course code and name are required');
      return;
    }

    if (!formData.program_id) {
      setError('Please complete the Academic Setup tab first to select a program');
      return;
    }

    if (!formData.semester) {
      setError('Please complete the Academic Setup tab first to select a semester');
      return;
    }

    setLoading(true);
    try {
      // Prepare course data for backend - use dummy values for testing
      const courseData: Partial<Course> = {
        ...newCourse,
        program_id: formData.program_id || undefined,  // Use undefined if not set
        semester: formData.semester || 1,              // Use 1 if not set
      };

      console.log('🚨 Frontend: Sending course data:', courseData);
      console.log('🚨 Frontend: formData.program_id:', formData.program_id);
      console.log('🚨 Frontend: formData.semester:', formData.semester);

      // Create course in backend
      const createdCourse = await timetableService.createCourse(courseData as Course);
      
      console.log('✅ Frontend: Course created successfully:', createdCourse);
      console.log('✅ Frontend: Current formData.courses length:', formData.courses.length);
      
      // Add to local form data
      const course: Course = {
        id: createdCourse.id || Date.now().toString(),
        code: newCourse.code || '',
        name: newCourse.name || '',
        credits: newCourse.credits || 0,
        type: newCourse.type || 'Core',
        hours_per_week: newCourse.hours_per_week || 0,
        min_per_session: newCourse.min_per_session || 50,
        faculty_id: newCourse.faculty_id || ''
      };
      
      console.log('✅ Frontend: Adding course to state:', course);
      
      updateFormData('courses', [...formData.courses, course]);
      
      console.log('✅ Frontend: New courses array length should be:', formData.courses.length + 1);
      
      // Reset form
      setNewCourse({
        code: '',
        name: '',
        credits: 0,
        type: 'Core',
        hours_per_week: 0,
        min_per_session: 50,
        faculty_id: ''
      });

      setSuccess('Course added successfully');
      loadAvailableCourses(); // Refresh available courses
      
    } catch (err: any) {
      setError('Failed to add course: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCourse = async (id: string, courseId?: string) => {
    setLoading(true);
    try {
      // Delete from backend if it has a backend ID
      if (courseId) {
        await timetableService.deleteCourse(courseId);
      }
      
      // Remove from local form data
      updateFormData('courses', formData.courses.filter(course => course.id !== id));
      
      setSuccess('Course deleted successfully');
      loadAvailableCourses(); // Refresh available courses
      
    } catch (err: any) {
      setError('Failed to delete course: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleEditCourse = (course: Course) => {
    setEditingCourse(course);
    setEditFormData({
      code: course.code,
      name: course.name,
      credits: course.credits,
      type: course.type,
      hours_per_week: course.hours_per_week,
      min_per_session: course.min_per_session,
      faculty_id: course.faculty_id || ''
    });
  };

  const handleSaveEdit = async () => {
    if (!editingCourse || !editFormData.code || !editFormData.name) {
      setError('Course code and name are required');
      return;
    }

    setLoading(true);
    try {
      // Check if this course exists in the backend (has a proper MongoDB ObjectId)
      // MongoDB ObjectIds are 24-character hex strings, timestamp IDs are longer numbers
      const isBackendCourse = editingCourse.id && 
        editingCourse.id.length === 24 && 
        /^[0-9a-fA-F]{24}$/.test(editingCourse.id);
      
      console.log('🔧 Frontend: Editing course:', editingCourse);
      console.log('🔧 Frontend: Is backend course?', isBackendCourse);
      console.log('🔧 Frontend: Course ID:', editingCourse.id);
      
      if (isBackendCourse) {
        // Update in backend if it's a real backend course
        const updatedCourseData = {
          ...editingCourse,
          ...editFormData,
        };
        console.log('🔧 Frontend: Updating backend course with data:', updatedCourseData);
        await timetableService.updateCourse(editingCourse.id!, updatedCourseData);
      } else {
        console.log('🔧 Frontend: Skipping backend update for local course');
      }
      
      // Update in local form data regardless
      const updatedCourses = formData.courses.map(course => 
        course.id === editingCourse.id 
          ? { ...course, ...editFormData }
          : course
      );
      
      updateFormData('courses', updatedCourses);
      
      setEditingCourse(null);
      setEditFormData({});
      setSuccess('Course updated successfully');
      
      // Only refresh available courses if we updated a backend course
      if (isBackendCourse) {
        loadAvailableCourses();
      }
      
    } catch (err: any) {
      console.error('🔧 Frontend: Update error:', err);
      setError('Failed to update course: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingCourse(null);
    setEditFormData({});
  };

  const handleImportCourse = (course: Course) => {
    const importedCourse: Course = {
      id: course.id,
      code: course.code,
      name: course.name,
      credits: course.credits,
      type: course.type,
      hours_per_week: course.hours_per_week,
      min_per_session: course.min_per_session || 50,
      faculty_id: course.faculty_id || '',
      semester: course.semester,
      program_id: course.program_id
    };
    
    updateFormData('courses', [...formData.courses, importedCourse]);
    setSuccess(`Course "${course.code}" imported successfully`);
  };

  const handleOpenImportDialog = () => {
    setImportDialogOpen(true);
    loadAvailableCourses(); // Load courses when dialog opens
  };

  const handleCloseImportDialog = () => {
    setImportDialogOpen(false);
  };

  const handleImportAndClose = (course: Course) => {
    handleImportCourse(course);
    // Don't close dialog immediately, let user import multiple courses
  };

  return (
    <Container maxWidth="xl" sx={{ py: 0 }}>
      {/* Main Header */}
      <Paper
        elevation={6}
        sx={{
          p: 4,
          mb: 4,
          borderRadius: 4,
          background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.8)}, ${alpha(theme.palette.secondary.main, 0.9)})`,
          color: 'white',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Box sx={{ position: 'relative', zIndex: 1 }}>
          <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
            <Avatar sx={{ bgcolor: 'white', color: 'primary.main', width: 48, height: 48 }}>
              <CourseIcon />
            </Avatar>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 700, fontSize: '2rem' }}>
                Course Information
              </Typography>
              <Typography variant="body1" sx={{ opacity: 0.9, fontSize: '1.1rem' }}>
                Add subjects and course information for your program
              </Typography>
            </Box>
          </Stack>
          
          {/* Stats Cards */}
          <Box sx={{ display: 'flex', gap: 4, mt: 3, flexWrap: 'wrap' }}>
            <Box sx={{ textAlign: 'center', minWidth: 120 }}>
              <Typography variant="h3" sx={{ fontWeight: 700, fontSize: '2.5rem' }}>
                {formData.courses.length}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.8 }}>
                Total Courses
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'center', minWidth: 120 }}>
              <Typography variant="h3" sx={{ fontWeight: 700, fontSize: '2.5rem' }}>
                {formData.courses.reduce((sum, course) => sum + course.credits, 0)}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.8 }}>
                Total Credits
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'center', minWidth: 120 }}>
              <Typography variant="h3" sx={{ fontWeight: 700, fontSize: '2.5rem' }}>
                {availableCourses.length}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.8 }}>
                Available Courses
              </Typography>
            </Box>
          </Box>
        </Box>
        
        {/* Background Pattern */}
        <Box
          sx={{
            position: 'absolute',
            top: -50,
            right: -50,
            width: 200,
            height: 200,
            borderRadius: '50%',
            background: alpha('#ffffff', 0.1),
            zIndex: 0,
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            bottom: -30,
            left: -30,
            width: 150,
            height: 150,
            borderRadius: '50%',
            background: alpha('#ffffff', 0.05),
            zIndex: 0,
          }}
        />
      </Paper>

      {/* Add New Course Section - Full Width like StudentGroups */}
      <Card elevation={3} sx={{ mb: 4, borderRadius: 3, overflow: 'hidden' }}>
        <Box sx={{ 
          background: `linear-gradient(90deg, ${alpha(theme.palette.success.main, 0.1)}, ${alpha(theme.palette.info.main, 0.1)})`,
          p: 3, 
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}` 
        }}>
          <Stack direction="row" alignItems="center" spacing={2}>
            <Avatar sx={{ 
              bgcolor: 'success.main', 
              width: 40, 
              height: 40 
            }}>
              <AddIcon />
            </Avatar>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Add New Course
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Create new courses or import from available course catalog
              </Typography>
            </Box>
          </Stack>
        </Box>
        
        <CardContent sx={{ p: 4 }}>
          {/* Import from Available Courses Button */}
          <Box sx={{ mb: 4, display: 'flex', justifyContent: 'flex-start' }}>
            <Button
              variant="outlined"
              startIcon={<ImportIcon />}
              onClick={handleOpenImportDialog}
              size="small"
              sx={{ 
                mr: 2,
                borderColor: 'info.main',
                color: 'info.main',
                '&:hover': {
                  borderColor: 'info.dark',
                  bgcolor: alpha(theme.palette.info.main, 0.04)
                }
              }}
            >
              Import from Available Courses
            </Button>
            <Typography variant="caption" sx={{ alignSelf: 'center', color: 'text.secondary' }}>
              Browse and import pre-existing courses for this program
            </Typography>
          </Box>

          {/* Form Layout - Row-based like Faculty Tab */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Row 1: Course Code and Name */}
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Box sx={{ flex: 1, minWidth: 300 }}>
                <TextField
                  fullWidth
                  label="Course Code"
                  value={newCourse.code}
                  onChange={(e) => setNewCourse({ ...newCourse, code: e.target.value })}
                  placeholder="e.g., EDU101"
                  variant="outlined"
                  sx={{ 
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'primary.main'
                      }
                    }
                  }}
                />
              </Box>
              <Box sx={{ flex: 2, minWidth: 400 }}>
                <TextField
                  fullWidth
                  label="Course Name"
                  value={newCourse.name}
                  onChange={(e) => setNewCourse({ ...newCourse, name: e.target.value })}
                  placeholder="e.g., Introduction to Education"
                  variant="outlined"
                  sx={{ 
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'primary.main'
                      }
                    }
                  }}
                />
              </Box>
            </Box>

            {/* Row 2: Credits, Course Type, Hours/Week */}
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Box sx={{ flex: 1, minWidth: 150 }}>
                <TextField
                  fullWidth
                  label="Credits"
                  type="number"
                  value={newCourse.credits}
                  onChange={(e) => setNewCourse({ ...newCourse, credits: Number(e.target.value) })}
                  inputProps={{ min: 0, max: 10 }}
                  sx={{ 
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'primary.main'
                      }
                    }
                  }}
                />
              </Box>
              <Box sx={{ flex: 1, minWidth: 200 }}>
                <FormControl fullWidth>
                  <InputLabel>Course Type</InputLabel>
                  <Select
                    value={newCourse.type}
                    label="Course Type"
                    onChange={(e) => setNewCourse({ ...newCourse, type: e.target.value })}
                    sx={{ 
                      borderRadius: 2,
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'primary.main'
                      }
                    }}
                  >
                    <MenuItem value="Core">Core</MenuItem>
                    <MenuItem value="Elective">Elective</MenuItem>
                    <MenuItem value="Minor">Minor</MenuItem>
                    <MenuItem value="Practical">Practical</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              <Box sx={{ flex: 1, minWidth: 150 }}>
                <TextField
                  fullWidth
                  label="Hours/Week"
                  type="number"
                  value={newCourse.hours_per_week}
                  onChange={(e) => setNewCourse({ ...newCourse, hours_per_week: Number(e.target.value) })}
                  inputProps={{ min: 0, max: 20 }}
                  sx={{ 
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'primary.main'
                      }
                    }
                  }}
                />
              </Box>
              <Box sx={{ flex: 1, minWidth: 150 }}>
                <TextField
                  fullWidth
                  label="Minutes/Session"
                  type="number"
                  value={newCourse.min_per_session}
                  onChange={(e) => setNewCourse({ ...newCourse, min_per_session: Number(e.target.value) })}
                  inputProps={{ min: 30, max: 180 }}
                  sx={{ 
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'primary.main'
                      }
                    }
                  }}
                />
              </Box>
            </Box>

            {/* Row 3: Add Button & Faculty Field */}
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
              <Box sx={{ flex: 1, minWidth: 200 }}>
                <FormControl fullWidth>
                  <InputLabel>Primary Faculty (Optional)</InputLabel>
                  <Select
                    value={newCourse.faculty_id || ''}
                    label="Primary Faculty (Optional)"
                    onChange={(e) => setNewCourse({ ...newCourse, faculty_id: e.target.value })}
                    sx={{
                      borderRadius: 2,
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'primary.main'
                      }
                    }}
                  >
                    <MenuItem value=""><em>-- None / TBD --</em></MenuItem>
                    {availableFaculty.map(f => (
                      <MenuItem key={f.id} value={f.id}>{f.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'flex-end', flex: 1 }}>
                <Button
                  variant="contained"
                  startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <AddIcon />}
                  onClick={handleAddCourse}
                  disabled={loading}
                  sx={{
                    px: 4,
                    py: 1.5,
                    background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
                    '&:hover': {
                      background: `linear-gradient(45deg, ${theme.palette.primary.dark}, ${theme.palette.primary.main})`,
                    }
                  }}
                >
                  {loading ? 'Adding...' : 'Add Course'}
                </Button>
              </Box>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Added Courses Section - Full Width */}
      <Card elevation={3} sx={{ mb: 4, borderRadius: 3, overflow: 'hidden' }}>
        <Box sx={{ 
          background: `linear-gradient(90deg, ${alpha(theme.palette.info.main, 0.1)}, ${alpha(theme.palette.primary.main, 0.1)})`,
          p: 3, 
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}` 
        }}>
          <Stack direction="row" alignItems="center" spacing={2}>
            <Avatar sx={{ 
              bgcolor: 'info.main', 
              width: 40, 
              height: 40 
            }}>
              <CourseIcon />
            </Avatar>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Added Courses ({formData.courses.length})
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Manage and edit your course curriculum
              </Typography>
            </Box>
          </Stack>
        </Box>
        
        <CardContent sx={{ p: 0 }}>
          <TableContainer sx={{ backgroundColor: 'background.paper' }}>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.05) }}>
                  <TableCell sx={{ fontWeight: 600, py: 2 }}>Course Code</TableCell>
                  <TableCell sx={{ fontWeight: 600, py: 2 }}>Course Name</TableCell>
                  <TableCell sx={{ fontWeight: 600, py: 2 }}>Credits</TableCell>
                  <TableCell sx={{ fontWeight: 600, py: 2 }}>Type</TableCell>
                  <TableCell sx={{ fontWeight: 600, py: 2 }}>Hours/Week</TableCell>
                  <TableCell sx={{ fontWeight: 600, py: 2 }}>Min/Session</TableCell>
                  <TableCell sx={{ fontWeight: 600, py: 2 }}>Faculty</TableCell>
                  <TableCell sx={{ fontWeight: 600, py: 2, textAlign: 'center' }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
              {formData.courses.map((course) => (
                <TableRow 
                  key={course.id} 
                  sx={{
                    '&:hover': {
                      bgcolor: alpha(theme.palette.primary.main, 0.03),
                    },
                    '&:nth-of-type(even)': {
                      bgcolor: alpha(theme.palette.grey[500], 0.02),
                    }
                  }}
                >
                  {editingCourse?.id === course.id ? (
                    // Edit mode - render input fields
                    <>
                      <TableCell>
                        <TextField
                          size="small"
                          value={editFormData.code || ''}
                          onChange={(e) => setEditFormData({ ...editFormData, code: e.target.value })}
                          fullWidth
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          value={editFormData.name || ''}
                          onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                          fullWidth
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          type="number"
                          value={editFormData.credits || 0}
                          onChange={(e) => setEditFormData({ ...editFormData, credits: Number(e.target.value) })}
                          inputProps={{ min: 0, max: 10 }}
                          fullWidth
                        />
                      </TableCell>
                      <TableCell>
                        <FormControl fullWidth size="small">
                          <Select
                            value={editFormData.type || 'Core'}
                            onChange={(e) => setEditFormData({ ...editFormData, type: e.target.value })}
                          >
                            <MenuItem value="Core">Core</MenuItem>
                            <MenuItem value="Elective">Elective</MenuItem>
                            <MenuItem value="Minor">Minor</MenuItem>
                            <MenuItem value="Practical">Practical</MenuItem>
                          </Select>
                        </FormControl>
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          type="number"
                          value={editFormData.hours_per_week || 0}
                          onChange={(e) => setEditFormData({ ...editFormData, hours_per_week: Number(e.target.value) })}
                          inputProps={{ min: 0, max: 20 }}
                          fullWidth
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          type="number"
                          value={editFormData.min_per_session || 50}
                          onChange={(e) => setEditFormData({ ...editFormData, min_per_session: Number(e.target.value) })}
                          inputProps={{ min: 30, max: 180 }}
                          fullWidth
                        />
                      </TableCell>
                      <TableCell>
                        <FormControl fullWidth size="small">
                          <Select
                            value={editFormData.faculty_id || ''}
                            onChange={(e) => setEditFormData({ ...editFormData, faculty_id: e.target.value })}
                            displayEmpty
                          >
                            <MenuItem value=""><em>None</em></MenuItem>
                            {availableFaculty.map(f => (
                              <MenuItem key={f.id} value={f.id}>{f.name}</MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <IconButton
                            size="small"
                            onClick={handleSaveEdit}
                            sx={{ color: 'success.main' }}
                            disabled={loading}
                          >
                            <SaveIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={handleCancelEdit}
                            sx={{ color: 'text.secondary' }}
                            disabled={loading}
                          >
                            <CancelIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </TableCell>
                    </>
                  ) : (
                    // Normal mode - render text
                    <>
                      <TableCell sx={{ py: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: '0.875rem' }}>
                            {course.code.charAt(0).toUpperCase()}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                              {course.code}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {course.type}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ py: 2 }}>{course.name}</TableCell>
                      <TableCell sx={{ py: 2 }}>{course.credits}</TableCell>
                      <TableCell sx={{ py: 2 }}>
                        <Chip
                          label={course.type}
                          size="small"
                          color={course.type === 'Core' ? 'primary' : course.type === 'Elective' ? 'secondary' : 'default'}
                          sx={{ borderRadius: 2 }}
                        />
                      </TableCell>
                      <TableCell sx={{ py: 2 }}>{course.hours_per_week}</TableCell>
                      <TableCell sx={{ py: 2 }}>{course.min_per_session}</TableCell>
                      <TableCell sx={{ py: 2 }}>
                        {course.faculty_id 
                          ? (availableFaculty.find(f => f.id === course.faculty_id)?.name || 'Unknown')
                          : 'TBD'
                        }
                      </TableCell>
                      <TableCell sx={{ py: 2, textAlign: 'center' }}>
                        <Stack direction="row" spacing={1} justifyContent="center">
                          <IconButton
                            size="small"
                            onClick={() => handleEditCourse(course)}
                            disabled={loading || !!editingCourse}
                            sx={{
                              bgcolor: alpha(theme.palette.warning.main, 0.1),
                              color: 'warning.main',
                              '&:hover': {
                                bgcolor: alpha(theme.palette.warning.main, 0.2),
                              }
                            }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteCourse(course.id || '', course.id)}
                            disabled={loading || !!editingCourse}
                            sx={{
                              bgcolor: alpha(theme.palette.error.main, 0.1),
                              color: 'error.main',
                              '&:hover': {
                                bgcolor: alpha(theme.palette.error.main, 0.2),
                              }
                            }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Stack>
                      </TableCell>
                    </>
                  )}
                </TableRow>
              ))}
              {formData.courses.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 3, fontSize: '0.875rem', color: 'text.secondary', backgroundColor: 'background.paper' }}>
                    No courses added yet. Add courses using the form above or import from available courses.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

            <Box sx={{ mt: 3, p: 2, backgroundColor: 'primary.dark', borderRadius: 1, border: '1px solid', borderColor: 'primary.main' }}>
              <Typography variant="body2" sx={{ fontSize: '0.875rem', color: 'primary.contrastText', fontWeight: 600 }}>
                <strong>Total Credits:</strong> {formData.courses.reduce((sum, course) => sum + course.credits, 0)} |{' '}
                <strong>Total Hours/Week:</strong> {formData.courses.reduce((sum, course) => sum + course.hours_per_week, 0)}
              </Typography>
            </Box>
          </CardContent>
        </Card>

      {/* Error/Success Messages */}
      <Snackbar 
        open={!!error} 
        autoHideDuration={6000} 
        onClose={() => setError(null)}
      >
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      </Snackbar>

      <Snackbar 
        open={!!success} 
        autoHideDuration={3000} 
        onClose={() => setSuccess(null)}
      >
        <Alert severity="success" onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      </Snackbar>

      {/* Import Courses Dialog */}
      <Dialog 
        open={importDialogOpen} 
        onClose={handleCloseImportDialog}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { height: '80vh' }
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <ImportIcon sx={{ mr: 1, color: 'primary.main' }} />
            Import from Available Courses
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Select courses to add to your timetable. You can import multiple courses.
          </Typography>
        </DialogTitle>
        
        <DialogContent sx={{ px: 0 }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
              <CircularProgress />
            </Box>
          ) : availableCourses.length === 0 ? (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography color="text.secondary">
                No available courses found for this program and semester.
              </Typography>
            </Box>
          ) : (
            <List sx={{ pt: 0 }}>
              {availableCourses.map((course) => {
                const isAlreadyAdded = formData.courses.some(c => c.code === course.code);
                return (
                  <ListItem 
                    key={course.id}
                    sx={{ 
                      borderBottom: '1px solid',
                      borderColor: 'divider',
                      py: 2,
                      opacity: isAlreadyAdded ? 0.5 : 1
                    }}
                  >
                    <ListItemText
                      primary={
                        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                          {course.code} - {course.name}
                        </Typography>
                      }
                      secondary={
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            {course.credits} credits • {course.hours_per_week} hrs/week • {course.type}
                          </Typography>
                          {course.description && (
                            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                              {course.description}
                            </Typography>
                          )}
                          {isAlreadyAdded && (
                            <Typography variant="caption" color="warning.main" sx={{ fontWeight: 600, mt: 0.5, display: 'block' }}>
                              Already added to timetable
                            </Typography>
                          )}
                        </Box>
                      }
                    />
                    <ListItemSecondaryAction>
                      <Button
                        variant="contained"
                        size="small"
                        startIcon={<ImportIcon />}
                        onClick={() => handleImportAndClose(course)}
                        disabled={isAlreadyAdded}
                      >
                        Import
                      </Button>
                    </ListItemSecondaryAction>
                  </ListItem>
                );
              })}
            </List>
          )}
        </DialogContent>
        
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleCloseImportDialog} variant="outlined">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default CourseInformationTab;
