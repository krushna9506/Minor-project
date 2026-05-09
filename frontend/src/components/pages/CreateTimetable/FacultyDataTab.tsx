import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Paper,
  Stack,
  Avatar,
  Typography,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Autocomplete,
  CircularProgress,
  Snackbar,
  Alert,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Warning as WarningIcon,
  Person as TeacherIcon
} from '@mui/icons-material';
import { useTheme, alpha } from '@mui/material/styles';
import { useTimetableContext } from '../../../contexts/TimetableContext';
import timetableService from '../../../services/timetableService';

interface Faculty {
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

const FacultyDataTab: React.FC = () => {
  const theme = useTheme();
  const { formData, updateFormData } = useTimetableContext();
  
  const selectedFaculty: Faculty[] = (formData.faculty || []).map((faculty: any) => ({
    id: faculty.id || '',
    name: faculty.name || '',
    employee_id: faculty.employee_id || '',
    department: faculty.department || '',
    designation: faculty.designation || 'Assistant Professor',
    email: faculty.email || '',
    subjects: faculty.subjects || [],
    max_hours_per_week: faculty.max_hours_per_week || 16,
    available_days: faculty.available_days || []
  }));

  const [availableFaculty, setAvailableFaculty] = useState<Faculty[]>([]);
  const [selectedImportFaculty, setSelectedImportFaculty] = useState<Faculty | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [availableCourses, setAvailableCourses] = useState<string[]>([]);
  
  // State for editing faculty
  const [editingFaculty, setEditingFaculty] = useState<Faculty | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<Faculty>>({});
  
  // Function to reload faculty data from backend
  const reloadFacultyData = async (showSuccessMessage = false) => {
    try {
      setLoading(true);
      const facultyData = await timetableService.getFaculty();
      
      // Update form data with fresh backend data
      const validFaculty = facultyData.map((faculty: any) => ({
        id: faculty.id || faculty._id || '',
        name: faculty.name || '',
        employee_id: faculty.employee_id || '',
        department: faculty.department || '',
        designation: faculty.designation || 'Assistant Professor',
        email: faculty.email || '',
        subjects: faculty.subjects || [],
        max_hours_per_week: faculty.max_hours_per_week || 16,
        available_days: faculty.available_days || []
      }));
      
      setAvailableFaculty(validFaculty);
      if (showSuccessMessage) {
        setSuccess('Faculty data refreshed from server');
      }
      
    } catch (err: unknown) {
      console.error('Reload faculty data error:', err);
      const error = err as { 
        message?: string; 
        response?: { 
          data?: { 
            detail?: string 
          } 
        } 
      };
      
      // Extract the most specific error message available
      let errorMessage = 'Unknown error';
      if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError('Failed to reload faculty data: ' + errorMessage);
    } finally {
      setLoading(false);
    }
  };
  
  // Function to load available courses from backend
  const loadAvailableCourses = async () => {
    try {
      const courses = await timetableService.getCourses();
      const courseNames = courses.map((course: any) => course.name || course.code).filter(Boolean);
      setAvailableCourses(courseNames);
    } catch (err) {
      console.warn('Failed to load courses:', err);
      // Fallback to some common subjects if courses can't be loaded
      setAvailableCourses([
        'Mathematics', 'Physics', 'Chemistry', 'Biology', 'Computer Science',
        'English', 'Hindi', 'History', 'Geography', 'Economics'
      ]);
    }
  };
  
  // Load faculty data when component mounts or when program changes
  useEffect(() => {
    const loadInitialData = async () => {
      // Always try to load available backend faculty on mount or when program changes
      try {
        await reloadFacultyData();
      } catch (err) {
        console.warn('Failed to load initial faculty data:', err);
      }
      
      // Load available courses for subject selection
      try {
        await loadAvailableCourses();
      } catch (err) {
        console.warn('Failed to load courses:', err);
      }
    };

    loadInitialData();
  }, [formData.program_id]); // Reload when program changes
  
  // State for adding new faculty
  const [newFaculty, setNewFaculty] = useState({
    name: '',
    employee_id: '',
    department: '',
    designation: 'Assistant Professor',
    email: '',
    subjects: [] as string[],
    max_hours_per_week: 16,
    available_days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
  });
  
  // Options for form fields
  const designationOptions = ['Professor', 'Associate Professor', 'Assistant Professor', 'Lecturer', 'Teaching Assistant', 'Visiting Faculty'];
  const availableDaysOptions = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const handleAddFaculty = async () => {
    if (!newFaculty.name.trim() || !newFaculty.employee_id.trim()) {
      setError('Name and Employee ID are required');
      return;
    }

    setLoading(true);
    try {
      // Create faculty in backend
      const createdFaculty = await timetableService.createFaculty(newFaculty as Omit<Faculty, 'id'>);
      
      console.log('✅ Faculty created:', createdFaculty);
      
      // Reset form first
      setNewFaculty({
        name: '',
        employee_id: '',
        department: '',
        designation: 'Assistant Professor',
        email: '',
        subjects: [],
        max_hours_per_week: 16,
        available_days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
      });

      // Add created faculty to selected form state
      updateFormData('faculty', [...selectedFaculty, createdFaculty]);
      setSuccess('Faculty member added successfully');
      
      // Refresh available backend data
      await reloadFacultyData();
      
    } catch (err: unknown) {
      console.error('Add faculty error:', err);
      const error = err as { 
        message?: string; 
        response?: { 
          data?: { 
            detail?: string 
          } 
        } 
      };
      
      // Extract the most specific error message available
      let errorMessage = 'Unknown error';
      if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError('Failed to add faculty: ' + errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFaculty = async (id: string) => {
    setLoading(true);
    try {
      // Delete from backend
      await timetableService.deleteFaculty(id);
      
      // Remove from local form data
      const updatedFaculty = selectedFaculty.filter(faculty => faculty.id !== id);
      updateFormData('faculty', updatedFaculty);
      
      setSuccess('Faculty member deleted successfully');
      
      // Automatically refresh data from backend to ensure consistency
      try {
        await reloadFacultyData();
      } catch (refreshError) {
        console.warn('Failed to refresh faculty data after delete:', refreshError);
      }
      
    } catch (err: unknown) {
      console.error('Delete faculty error:', err);
      const error = err as { 
        message?: string; 
        response?: { 
          data?: { 
            detail?: string 
          } 
        } 
      };
      
      // Extract the most specific error message available
      let errorMessage = 'Unknown error';
      if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError('Failed to delete faculty: ' + errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleEditFaculty = (faculty: Faculty) => {
    // Only allow editing of faculty with proper backend IDs
    if (!faculty.id || faculty.id.includes('.')) {
      alert('This faculty member needs to be recreated with a valid backend ID. Please delete and add again.');
      return;
    }
    
    setEditingFaculty(faculty);
    setEditFormData(faculty);
  };

  const handleSaveEdit = async () => {
    if (!editingFaculty) return;

    // Validate faculty ID before attempting update
    if (!editingFaculty.id || editingFaculty.id.includes('.')) {
      setError('Cannot update faculty: Invalid backend ID format. Please delete and recreate this faculty member.');
      return;
    }

    setLoading(true);
    try {
      // Update faculty in backend
      await timetableService.updateFaculty(editingFaculty.id, editFormData as Faculty);
      
      // Update local form data
      const updatedFaculty = selectedFaculty.map(faculty => 
        faculty.id === editingFaculty.id ? { ...faculty, ...editFormData } : faculty
      );
      updateFormData('faculty', updatedFaculty);
      
      setSuccess('Faculty member updated successfully');
      setEditingFaculty(null);
      setEditFormData({});
      
      // Automatically refresh data from backend to ensure consistency
      try {
        await reloadFacultyData();
      } catch (refreshError) {
        console.warn('Failed to refresh faculty data after update:', refreshError);
      }
      
    } catch (err: unknown) {
      console.error('Update faculty error:', err);
      const error = err as { 
        message?: string; 
        response?: { 
          data?: { 
            detail?: string 
          } 
        } 
      };
      
      // Extract the most specific error message available
      let errorMessage = 'Unknown error';
      if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      // Handle specific error cases
      if (errorMessage.includes('Invalid faculty ID format')) {
        setError('Cannot update faculty: Invalid ID format. This faculty member needs to be recreated. Please delete and add again.');
      } else {
        setError('Failed to update faculty: ' + errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingFaculty(null);
    setEditFormData({});
  };

  return (
    <Container maxWidth="xl" sx={{ py: 0 }}>
      {/* Main Header - Matching StudentGroups exactly */}
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
              <TeacherIcon />
            </Avatar>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 700, fontSize: '2rem' }}>
                Faculty Management
              </Typography>
              <Typography variant="body1" sx={{ opacity: 0.9, fontSize: '1.1rem' }}>
                Manage faculty members and their teaching assignments
              </Typography>
            </Box>
          </Stack>
          
          {/* Stats Cards */}
          <Box sx={{ display: 'flex', gap: 4, mt: 3, flexWrap: 'wrap' }}>
            <Box sx={{ textAlign: 'center', minWidth: 120 }}>
              <Typography variant="h3" sx={{ fontWeight: 700, fontSize: '2.5rem' }}>
                {selectedFaculty.length}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.8 }}>
                Selected Faculty
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'center', minWidth: 120 }}>
              <Typography variant="h3" sx={{ fontWeight: 700, fontSize: '2.5rem' }}>
                {selectedFaculty.filter(f => f.available_days.length > 0).length}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.8 }}>
                Available
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'center', minWidth: 120 }}>
              <Typography variant="h3" sx={{ fontWeight: 700, fontSize: '2.5rem' }}>
                {selectedFaculty.reduce((sum, f) => sum + (f.max_hours_per_week || 0), 0)}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.8 }}>
                Total Hours/Week
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

      <Card elevation={3} sx={{ mb: 4, borderRadius: 3, overflow: 'hidden' }}>
        <Box sx={{ p: 3, borderBottom: `1px solid ${theme.palette.divider}` }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
            Import Available Teacher
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <Autocomplete
              fullWidth
              options={availableFaculty}
              getOptionLabel={(option) => `${option.name} (${option.employee_id})`}
              value={selectedImportFaculty}
              onChange={(_, newValue) => setSelectedImportFaculty(newValue)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Select teacher to import"
                  placeholder="Choose a teacher"
                />
              )}
            />
            <Button
              variant="contained"
              disabled={!selectedImportFaculty}
              onClick={() => {
                if (!selectedImportFaculty) {
                  setError('Please select a faculty member to import');
                  return;
                }
                const exists = selectedFaculty.some((faculty) => faculty.id === selectedImportFaculty.id);
                if (exists) {
                  setError('This faculty member is already selected');
                  return;
                }
                updateFormData('faculty', [...selectedFaculty, selectedImportFaculty]);
                setSuccess(`Imported ${selectedImportFaculty.name}`);
                setSelectedImportFaculty(null);
              }}
            >
              Import Teacher
            </Button>
          </Box>
        </Box>
      </Card>

      {/* Add New Faculty Section - Full Width like StudentGroups */}
      <Card elevation={3} sx={{ mb: 4, borderRadius: 3, overflow: 'hidden' }}>
        <Box sx={{ 
          background: `linear-gradient(90deg, ${alpha(theme.palette.success.main, 0.1)}, ${alpha(theme.palette.info.main, 0.1)})`,
          p: 3,
          borderBottom: `1px solid ${theme.palette.divider}`
        }}>
          <Stack direction="row" alignItems="center" spacing={2}>
            <Avatar sx={{ bgcolor: 'success.main', width: 40, height: 40 }}>
              <AddIcon />
            </Avatar>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Add New Faculty
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Create new faculty members for your timetable
              </Typography>
            </Box>
          </Stack>
        </Box>
        
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Row 1: Faculty Name and Employee ID - Full Width */}
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Box sx={{ flex: 1, minWidth: 300 }}>
                <TextField
                  fullWidth
                  label="Full Name"
                  value={newFaculty.name}
                  onChange={(e) => setNewFaculty({ ...newFaculty, name: e.target.value })}
                  placeholder="e.g., Dr. Rajesh Kumar"
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
              </Box>
              <Box sx={{ flex: 1, minWidth: 250 }}>
                <TextField
                  fullWidth
                  label="Employee ID"
                  value={newFaculty.employee_id}
                  onChange={(e) => setNewFaculty({ ...newFaculty, employee_id: e.target.value })}
                  placeholder="e.g., FAC001"
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
              </Box>
            </Box>
            
            {/* Row 2: Email and Department - Full Width */}
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Box sx={{ flex: 1, minWidth: 300 }}>
                <TextField
                  fullWidth
                  label="Email"
                  type="email"
                  value={newFaculty.email}
                  onChange={(e) => setNewFaculty({ ...newFaculty, email: e.target.value })}
                  placeholder="e.g., rajesh.kumar@university.edu"
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
              </Box>
              <Box sx={{ flex: 1, minWidth: 250 }}>
                <TextField
                  fullWidth
                  label="Department"
                  value={newFaculty.department}
                  onChange={(e) => setNewFaculty({ ...newFaculty, department: e.target.value })}
                  placeholder="e.g., Education"
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
              </Box>
            </Box>
            
            {/* Row 3: Subjects to Teach and Available Days */}
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Box sx={{ flex: 1, minWidth: 300 }}>
                <Autocomplete
                  multiple
                  freeSolo
                  options={availableCourses}
                  value={newFaculty.subjects || []}
                  onChange={(_, newValue) => setNewFaculty({ ...newFaculty, subjects: newValue })}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Subjects to Teach"
                      placeholder={availableCourses.length > 0 ? "Select courses or type custom subjects" : "Loading courses..."}
                      helperText="Select from available courses or add custom subjects"
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    />
                  )}
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => (
                      <Chip
                        variant="outlined"
                        label={option}
                        size="small"
                        color="primary"
                        {...getTagProps({ index })}
                        key={option}
                      />
                    ))
                  }
                />
              </Box>
              <Box sx={{ flex: 1, minWidth: 300 }}>
                <Autocomplete
                  multiple
                  options={availableDaysOptions}
                  value={newFaculty.available_days || []}
                  onChange={(_, newValue) => setNewFaculty({ ...newFaculty, available_days: newValue })}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Available Days"
                      placeholder="Select available days"
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    />
                  )}
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => (
                      <Chip
                        variant="outlined"
                        label={option}
                        size="small"
                        {...getTagProps({ index })}
                        key={option}
                      />
                    ))
                  }
                />
              </Box>
            </Box>
            
            {/* Row 4: Designation, Max Hours/Week, and Add Button */}
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'end', flexWrap: 'wrap' }}>
              <Box sx={{ flex: 2, minWidth: 200 }}>
                <FormControl fullWidth>
                  <InputLabel>Designation</InputLabel>
                  <Select
                    value={newFaculty.designation}
                    label="Designation"
                    onChange={(e) => setNewFaculty({ ...newFaculty, designation: e.target.value })}
                    sx={{ borderRadius: 2 }}
                  >
                    {designationOptions.map((designation) => (
                      <MenuItem key={designation} value={designation}>
                        {designation}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
              <Box sx={{ flex: 1, minWidth: 120 }}>
                <TextField
                  fullWidth
                  label="Max Hours/Week"
                  type="number"
                  value={newFaculty.max_hours_per_week}
                  onChange={(e) => setNewFaculty({ ...newFaculty, max_hours_per_week: Number(e.target.value) })}
                  inputProps={{ min: 4, max: 40 }}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
              </Box>
              <Box sx={{ flexShrink: 0 }}>
                <Button
                  variant="contained"
                  onClick={handleAddFaculty}
                  disabled={loading}
                  startIcon={loading ? <CircularProgress size={20} /> : <AddIcon />}
                  sx={{
                    borderRadius: 3,
                    px: 4,
                    py: 0.6,
                    height: 38, // Even more reduced height for optimal proportion
                    background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
                    '&:hover': {
                      background: `linear-gradient(45deg, ${theme.palette.primary.dark}, ${theme.palette.primary.main})`,
                    }
                  }}
                >
                  {loading ? 'Adding...' : 'Add Faculty'}
                </Button>
              </Box>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Faculty Table - Full Width like StudentGroups */}
      <Card elevation={3} sx={{ borderRadius: 3, overflow: 'hidden' }}>
        <Box sx={{ 
          background: `linear-gradient(90deg, ${alpha(theme.palette.info.main, 0.1)}, ${alpha(theme.palette.primary.main, 0.1)})`,
          p: 3,
          borderBottom: `1px solid ${theme.palette.divider}`
        }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Faculty Members ({selectedFaculty.length})
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Manage and organize your teaching staff
              </Typography>
            </Box>
            
            {selectedFaculty.length > 0 && (
              <Chip
                icon={<TeacherIcon />}
                label={`${selectedFaculty.reduce((sum, faculty) => sum + faculty.max_hours_per_week, 0)} Total Hours/Week`}
                color="info"
                variant="outlined"
                sx={{ borderRadius: 2 }}
              />
            )}
          </Stack>
        </Box>
        
        {selectedFaculty.length === 0 ? (
          <Box sx={{ p: 8, textAlign: 'center' }}>
            <Avatar sx={{ mx: 'auto', mb: 2, width: 80, height: 80, bgcolor: alpha(theme.palette.primary.main, 0.1) }}>
              <TeacherIcon sx={{ fontSize: 40, color: 'primary.main' }} />
            </Avatar>
            <Typography variant="h6" sx={{ mb: 1, color: 'text.secondary' }}>
              No Faculty Members Yet
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Start by adding faculty members using the form above
            </Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.05) }}>
                  <TableCell sx={{ fontWeight: 600, py: 2 }}>Name</TableCell>
                  <TableCell sx={{ fontWeight: 600, py: 2 }}>Employee ID</TableCell>
                  <TableCell sx={{ fontWeight: 600, py: 2 }}>Department</TableCell>
                  <TableCell sx={{ fontWeight: 600, py: 2 }}>Designation</TableCell>
                  <TableCell sx={{ fontWeight: 600, py: 2 }}>Subjects</TableCell>
                  <TableCell sx={{ fontWeight: 600, py: 2 }}>Max Hours</TableCell>
                  <TableCell sx={{ fontWeight: 600, py: 2 }}>Available Days</TableCell>
                  <TableCell sx={{ fontWeight: 600, py: 2, textAlign: 'center' }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {selectedFaculty.map((faculty) => (
                  <TableRow 
                    key={faculty.id} 
                    sx={{
                      '&:hover': {
                        bgcolor: alpha(theme.palette.primary.main, 0.03),
                      },
                      '&:nth-of-type(even)': {
                        bgcolor: alpha(theme.palette.grey[500], 0.02),
                      }
                    }}
                  >
                    {editingFaculty?.id === faculty.id ? (
                      // Edit mode - render input fields
                      <>
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
                            value={editFormData.employee_id || ''}
                            onChange={(e) => setEditFormData({ ...editFormData, employee_id: e.target.value })}
                            fullWidth
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            size="small"
                            value={editFormData.department || ''}
                            onChange={(e) => setEditFormData({ ...editFormData, department: e.target.value })}
                            fullWidth
                          />
                        </TableCell>
                        <TableCell>
                          <FormControl fullWidth size="small">
                            <Select
                              value={editFormData.designation || ''}
                              onChange={(e) => setEditFormData({ ...editFormData, designation: e.target.value })}
                            >
                              {designationOptions.map((designation) => (
                                <MenuItem key={designation} value={designation}>
                                  {designation}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </TableCell>
                        <TableCell>
                          <Autocomplete
                            multiple
                            freeSolo
                            size="small"
                            options={availableCourses}
                            value={editFormData.subjects || []}
                            onChange={(_, newValue) => setEditFormData({ ...editFormData, subjects: newValue })}
                            renderInput={(params) => (
                              <TextField
                                {...params}
                                size="small"
                                placeholder={availableCourses.length > 0 ? "Select courses or add custom" : "Loading..."}
                              />
                            )}
                            renderTags={(value, getTagProps) =>
                              value.map((option, index) => (
                                <Chip
                                  variant="outlined"
                                  label={option}
                                  size="small"
                                  {...getTagProps({ index })}
                                  key={option}
                                />
                              ))
                            }
                            sx={{ minWidth: 200 }}
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            size="small"
                            type="number"
                            value={editFormData.max_hours_per_week || 16}
                            onChange={(e) => setEditFormData({ ...editFormData, max_hours_per_week: Number(e.target.value) })}
                            inputProps={{ min: 4, max: 40 }}
                            sx={{ width: 80 }}
                          />
                        </TableCell>
                        <TableCell>
                          <Autocomplete
                            multiple
                            size="small"
                            options={availableDaysOptions}
                            value={editFormData.available_days || []}
                            onChange={(_, newValue) => setEditFormData({ ...editFormData, available_days: newValue })}
                            renderInput={(params) => (
                              <TextField
                                {...params}
                                size="small"
                                placeholder="Select days"
                              />
                            )}
                            renderTags={(value, getTagProps) =>
                              value.map((option, index) => (
                                <Chip
                                  variant="outlined"
                                  label={option.substring(0, 3)}
                                  size="small"
                                  {...getTagProps({ index })}
                                  key={option}
                                />
                              ))
                            }
                            sx={{ minWidth: 200 }}
                          />
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <IconButton
                              size="small"
                              onClick={handleSaveEdit}
                              sx={{ color: 'success.main' }}
                              disabled={loading}
                            >
                              <SaveIcon />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={handleCancelEdit}
                              sx={{ color: 'text.secondary' }}
                              disabled={loading}
                            >
                              <CancelIcon />
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
                              {faculty.name.charAt(0).toUpperCase()}
                            </Avatar>
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                {faculty.name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {faculty.email || 'No email provided'}
                              </Typography>
                            </Box>
                            {(!faculty.id || faculty.id.includes('.')) && (
                              <Tooltip title="Invalid ID format - cannot edit. Delete and recreate this faculty member.">
                                <WarningIcon 
                                  fontSize="small" 
                                  sx={{ color: 'warning.main' }}
                                />
                              </Tooltip>
                            )}
                          </Box>
                        </TableCell>
                        <TableCell sx={{ py: 2 }}>{faculty.employee_id}</TableCell>
                        <TableCell sx={{ py: 2 }}>{faculty.department}</TableCell>
                        <TableCell sx={{ py: 2 }}>{faculty.designation}</TableCell>
                        <TableCell sx={{ py: 2 }}>
                          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                            {(faculty.subjects || []).map((subject) => (
                              <Chip
                                key={subject}
                                label={subject}
                                size="small"
                                variant="outlined"
                                color="primary"
                                sx={{ fontSize: '0.7rem', borderRadius: 2 }}
                              />
                            ))}
                            {(!faculty.subjects || faculty.subjects.length === 0) && (
                              <Typography variant="caption" color="text.secondary">
                                No subjects assigned
                              </Typography>
                            )}
                          </Box>
                        </TableCell>
                        <TableCell sx={{ py: 2 }}>{faculty.max_hours_per_week}/week</TableCell>
                        <TableCell sx={{ py: 2 }}>
                          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                            {faculty.available_days.map((day) => (
                              <Chip
                                key={day}
                                label={day.substring(0, 3)}
                                size="small"
                                variant="outlined"
                                color="info"
                                sx={{ fontSize: '0.7rem', borderRadius: 2 }}
                              />
                            ))}
                          </Box>
                        </TableCell>
                        <TableCell sx={{ py: 2, textAlign: 'center' }}>
                          <Stack direction="row" spacing={1} justifyContent="center">
                            <IconButton
                              size="small"
                              onClick={() => handleEditFaculty(faculty)}
                              disabled={loading || !!editingFaculty || !faculty.id || faculty.id.includes('.')}
                              title={!faculty.id || faculty.id.includes('.') ? 'Cannot edit: Invalid ID format. Delete and recreate this faculty member.' : 'Edit faculty'}
                              sx={{
                                bgcolor: alpha(theme.palette.warning.main, 0.1),
                                color: 'warning.main',
                                '&:hover': {
                                  bgcolor: alpha(theme.palette.warning.main, 0.2),
                                },
                                '&:disabled': {
                                  bgcolor: alpha(theme.palette.grey[500], 0.1),
                                  color: 'grey.400'
                                }
                              }}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => handleDeleteFaculty(faculty.id)}
                              disabled={loading}
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
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Card>

      {/* Notification Snackbars */}
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
        autoHideDuration={6000}
        onClose={() => setSuccess(null)}
      >
        <Alert severity="success" onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default FacultyDataTab;
