import React, { useState, useEffect } from 'react';
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
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  CircularProgress,
  Snackbar,
  Chip,
  Autocomplete,
  Container,
  Avatar,
  Stack,
  Card,
  CardContent,
  alpha,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
  Groups as GroupIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  School as SchoolIcon,
  Class as ClassIcon,
} from '@mui/icons-material';
import { useTimetableContext } from '../../../contexts/TimetableContext';
import timetableService from '../../../services/timetableService';
import type { StudentGroup, Course } from '../../../services/timetableService';

const StudentGroupsTab: React.FC = () => {
  const theme = useTheme();
  const { formData, updateFormData } = useTimetableContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [availableCourses, setAvailableCourses] = useState<Course[]>([]);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [availableGroups, setAvailableGroups] = useState<StudentGroup[]>([]);
  const [selectedImportGroup, setSelectedImportGroup] = useState<StudentGroup | null>(null);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);

  // Student groups from form data - cast to our new interface
  const studentGroups: StudentGroup[] = (formData.student_groups || []).map((group: any) => ({
    id: group.id || '',
    name: group.name || '',
    course_ids: group.course_ids || [],
    year: group.year || 1,
    semester: group.semester || 'Odd',
    section: group.section || 'A',
    student_strength: group.student_strength || 40,
    group_type: group.group_type || 'Regular Class',
    program_id: group.program_id || formData.program_id || '',
    created_by: group.created_by || '',
    created_at: group.created_at || new Date().toISOString(),
    updated_at: group.updated_at
  }));

  const [newGroup, setNewGroup] = useState<{
    name: string;
    selectedCourses: Course[];
    year: number | '';
    semester: string;
    section: string;
    student_strength: number;
    group_type: string;
  }>({
    name: '',
    selectedCourses: [],
    year: '',
    semester: 'Odd',
    section: 'A',
    student_strength: 40,
    group_type: 'Regular Class'
  });

  // Load available courses and years when program changes
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const courses = await timetableService.getCourses(
          formData.program_id || undefined,
          undefined
        );
        setAvailableCourses(courses);
        
        // Load available years
        const years = [1, 2, 3, 4]; // Standard years
        setAvailableYears(years);
        
        const groups = await timetableService.getStudentGroups(formData.program_id || undefined);
        setAvailableGroups(groups);
        
      } catch (err: unknown) {
        console.error('Failed to load data:', err);
        const error = err as { message?: string };
        setError('Failed to load data: ' + (error.message || 'Unknown error'));
      } finally {
        setLoading(false);
      }
    };

    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.program_id]);

  const handleSaveGroup = async () => {
    if (!formData.program_id) {
      setError('Please select a program first');
      return;
    }

    if (!newGroup.name.trim()) {
      setError('Please enter a group name');
      return;
    }

    if (newGroup.selectedCourses.length === 0) {
      setError('Please select at least one course');
      return;
    }

    if (!newGroup.year) {
      setError('Please select a year');
      return;
    }

    setLoading(true);
    try {
      const groupData = {
        name: newGroup.name.trim(),
        course_ids: newGroup.selectedCourses.map(course => course.id!),
        year: newGroup.year as number,
        semester: newGroup.semester,
        section: newGroup.section,
        student_strength: newGroup.student_strength,
        group_type: newGroup.group_type,
        program_id: formData.program_id
      };

      if (editingGroupId) {
        // Update existing group
        const updatedGroup = await timetableService.updateStudentGroup(editingGroupId, groupData);
        
        // Update in local state
        const updatedGroups = studentGroups.map(group => 
          group.id === editingGroupId ? updatedGroup : group
        );
        updateFormData('student_groups', updatedGroups);
        
        setSuccess('Student group updated successfully');
      } else {
        // Create new group
        const createdGroup = await timetableService.createStudentGroup(groupData);
        
        // Add to local state
        updateFormData('student_groups', [...studentGroups, createdGroup]);
        
        setSuccess('Student group added successfully');
      }
      
      // Reset form
      resetForm();
      
    } catch (err: unknown) {
      console.error('Save student group error:', err);
      const error = err as { message?: string; response?: { data?: { detail?: string } } };
      const errorMessage = error.response?.data?.detail || error.message || 'Unknown error';
      setError(`Failed to ${editingGroupId ? 'update' : 'add'} student group: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setNewGroup({
      name: '',
      selectedCourses: [],
      year: '',
      semester: 'Odd',
      section: 'A',
      student_strength: 40,
      group_type: 'Regular Class'
    });
    setEditingGroupId(null);
  };

  const handleImportGroup = () => {
    if (!selectedImportGroup) {
      setError('Please select a group to import');
      return;
    }

    const selectedGroups = formData.student_groups || [];
    const exists = selectedGroups.some((group: any) => group.id === selectedImportGroup.id);
    if (exists) {
      setError('This student group is already selected');
      return;
    }

    updateFormData('student_groups', [...selectedGroups, selectedImportGroup]);
    setSuccess(`Imported student group "${selectedImportGroup.name}"`);
    setSelectedImportGroup(null);
  };

  const handleEditGroup = (groupId: string) => {
    const groupToEdit = studentGroups.find(group => group.id === groupId);
    if (groupToEdit) {
      // Find selected courses
      const selectedCourses = availableCourses.filter(course => 
        groupToEdit.course_ids.includes(course.id!)
      );
      
      setEditingGroupId(groupId);
      setNewGroup({
        name: groupToEdit.name,
        selectedCourses: selectedCourses,
        year: groupToEdit.year,
        semester: groupToEdit.semester,
        section: groupToEdit.section,
        student_strength: groupToEdit.student_strength,
        group_type: groupToEdit.group_type
      });
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    setLoading(true);
    try {
      await timetableService.deleteStudentGroup(groupId);
      
      // Remove from local state
      const filteredGroups = studentGroups.filter(group => group.id !== groupId);
      updateFormData('student_groups', filteredGroups);
      
      setSuccess('Student group deleted successfully');
      
    } catch (err: unknown) {
      const error = err as { message?: string; response?: { data?: { detail?: string } } };
      const errorMessage = error.response?.data?.detail || error.message || 'Unknown error';
      setError('Failed to delete student group: ' + errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Header Section */}
      <Paper
        elevation={0}
        sx={{
          background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
          color: 'white',
          p: 4,
          borderRadius: 3,
          mb: 4,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Box sx={{ position: 'relative', zIndex: 1 }}>
          <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
            <Avatar sx={{ bgcolor: 'white', color: 'primary.main', width: 48, height: 48 }}>
              <GroupIcon />
            </Avatar>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 700, fontSize: '2rem' }}>
                Student Groups & Sections
              </Typography>
              <Typography variant="body1" sx={{ opacity: 0.9, fontSize: '1.1rem' }}>
                Configure classes and student groups for your program
              </Typography>
            </Box>
          </Stack>
          
          {/* Stats Cards */}
          <Box sx={{ display: 'flex', gap: 4, mt: 3, flexWrap: 'wrap' }}>
            <Box sx={{ textAlign: 'center', minWidth: 120 }}>
              <Typography variant="h3" sx={{ fontWeight: 700, fontSize: '2.5rem' }}>
                {studentGroups.length}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.8 }}>
                Total Groups
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'center', minWidth: 120 }}>
              <Typography variant="h3" sx={{ fontWeight: 700, fontSize: '2.5rem' }}>
                {studentGroups.reduce((sum, group) => sum + group.student_strength, 0)}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.8 }}>
                Total Students
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

      {/* Import Existing Student Group from Available Data */}
      <Card elevation={3} sx={{ mb: 4, borderRadius: 3, overflow: 'hidden' }}>
        <Box sx={{ p: 3, borderBottom: `1px solid ${theme.palette.divider}` }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
            Import Existing Group
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <Autocomplete
              fullWidth
              options={availableGroups}
              getOptionLabel={(group) => group.name || ''}
              value={selectedImportGroup}
              onChange={(_, newValue) => setSelectedImportGroup(newValue)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Select existing student group"
                  placeholder="Choose a group from available data"
                />
              )}
              disabled={availableGroups.length === 0}
            />
            <Button
              variant="contained"
              onClick={handleImportGroup}
              disabled={!selectedImportGroup}
              sx={{ whiteSpace: 'nowrap' }}
            >
              Import Group
            </Button>
          </Box>
        </Box>
      </Card>

      {/* Add New Group Section */}
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
                {editingGroupId ? 'Edit Student Group' : 'Add New Student Group'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {editingGroupId ? 'Update the selected group details' : 'Create a new student group or class section'}
              </Typography>
            </Box>
          </Stack>
        </Box>
        
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Row 1: Group Name and Courses */}
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Box sx={{ flex: 1, minWidth: 300 }}>
                <TextField
                  fullWidth
                  label="Group/Class Name"
                  value={newGroup.name}
                  onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                  placeholder="e.g., CSE Year 3 Section A"
                  variant="outlined"
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
              </Box>
              <Box sx={{ flex: 1, minWidth: 300 }}>
                <Autocomplete
                  multiple
                  options={availableCourses}
                  getOptionLabel={(course) => `${course.code} - ${course.name}`}
                  value={newGroup.selectedCourses}
                  onChange={(_, newValue) => setNewGroup({ ...newGroup, selectedCourses: newValue })}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Select Courses"
                      placeholder="Choose multiple courses"
                      variant="outlined"
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    />
                  )}
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => (
                      <Chip
                        {...getTagProps({ index })}
                        key={option.id}
                        label={option.code}
                        size="small"
                        color="primary"
                        variant="outlined"
                        sx={{ borderRadius: 2 }}
                      />
                    ))
                  }
                  loading={loading}
                  disabled={loading}
                />
              </Box>
            </Box>
            
            {/* Row 2: Year, Semester, Section, Student Strength */}
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Box sx={{ minWidth: 150, flex: 1 }}>
                <FormControl fullWidth>
                  <InputLabel>Year</InputLabel>
                  <Select
                    value={newGroup.year}
                    onChange={(e) => setNewGroup({ ...newGroup, year: e.target.value as number })}
                    label="Year"
                    sx={{ borderRadius: 2 }}
                  >
                    {availableYears.map((year) => (
                      <MenuItem key={year} value={year}>
                        Year {year}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
              <Box sx={{ minWidth: 150, flex: 1 }}>
                <FormControl fullWidth>
                  <InputLabel>Semester</InputLabel>
                  <Select
                    value={newGroup.semester}
                    onChange={(e) => setNewGroup({ ...newGroup, semester: e.target.value })}
                    label="Semester"
                    sx={{ borderRadius: 2 }}
                  >
                    <MenuItem value="Odd">Odd Semester</MenuItem>
                    <MenuItem value="Even">Even Semester</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              <Box sx={{ minWidth: 150, flex: 1 }}>
                <FormControl fullWidth>
                  <InputLabel>Section</InputLabel>
                  <Select
                    value={newGroup.section}
                    onChange={(e) => setNewGroup({ ...newGroup, section: e.target.value })}
                    label="Section"
                    sx={{ borderRadius: 2 }}
                  >
                    {['A', 'B', 'C', 'D', 'Group1', 'Group2'].map((section) => (
                      <MenuItem key={section} value={section}>
                        {section}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
              <Box sx={{ minWidth: 150, flex: 1 }}>
                <TextField
                  fullWidth
                  type="number"
                  label="Student Strength"
                  value={newGroup.student_strength}
                  onChange={(e) => setNewGroup({ ...newGroup, student_strength: parseInt(e.target.value) || 0 })}
                  inputProps={{ min: 1, max: 200 }}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
              </Box>
            </Box>
            
            {/* Row 3: Group Type and Action Buttons */}
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'end', flexWrap: 'wrap' }}>
              <Box sx={{ flex: 1, minWidth: 250 }}>
                <FormControl fullWidth>
                  <InputLabel>Group Type</InputLabel>
                  <Select
                    value={newGroup.group_type}
                    onChange={(e) => setNewGroup({ ...newGroup, group_type: e.target.value })}
                    label="Group Type"
                    sx={{ borderRadius: 2 }}
                  >
                    <MenuItem value="Regular Class">
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <SchoolIcon fontSize="small" />
                        <span>Regular Class</span>
                      </Stack>
                    </MenuItem>
                    <MenuItem value="Practical Lab">
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <ClassIcon fontSize="small" />
                        <span>Practical Lab</span>
                      </Stack>
                    </MenuItem>
                  </Select>
                </FormControl>
              </Box>
              
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button
                  variant="contained"
                  onClick={handleSaveGroup}
                  disabled={loading}
                  startIcon={loading ? <CircularProgress size={20} /> : <AddIcon />}
                  sx={{
                    borderRadius: 3,
                    px: 4,
                    py: 0.6,
                    height: 38, // Match Faculty button height
                    background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
                    '&:hover': {
                      background: `linear-gradient(45deg, ${theme.palette.primary.dark}, ${theme.palette.primary.main})`,
                    }
                  }}
                >
                  {editingGroupId ? 'Update Group' : 'Add Student Group'}
                </Button>
                
                {editingGroupId && (
                  <Button
                    variant="outlined"
                    onClick={resetForm}
                    sx={{ 
                      borderRadius: 3, 
                      px: 4, 
                      py: 0.6,
                      height: 38 // Match Faculty button height
                    }}
                  >
                    Cancel
                  </Button>
                )}
              </Box>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Student Groups Table */}
      <Card elevation={3} sx={{ borderRadius: 3, overflow: 'hidden' }}>
        <Box sx={{ 
          background: `linear-gradient(90deg, ${alpha(theme.palette.info.main, 0.1)}, ${alpha(theme.palette.primary.main, 0.1)})`,
          p: 3,
          borderBottom: `1px solid ${theme.palette.divider}`
        }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Student Groups ({studentGroups.length})
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Manage and organize your student groups and class sections
              </Typography>
            </Box>
            
            {studentGroups.length > 0 && (
              <Chip
                icon={<GroupIcon />}
                label={`${studentGroups.reduce((sum, group) => sum + group.student_strength, 0)} Total Students`}
                color="info"
                variant="outlined"
                sx={{ borderRadius: 2 }}
              />
            )}
          </Stack>
        </Box>
        
        {studentGroups.length === 0 ? (
          <Box sx={{ p: 8, textAlign: 'center' }}>
            <Avatar sx={{ mx: 'auto', mb: 2, width: 80, height: 80, bgcolor: alpha(theme.palette.primary.main, 0.1) }}>
              <GroupIcon sx={{ fontSize: 40, color: 'primary.main' }} />
            </Avatar>
            <Typography variant="h6" sx={{ mb: 1, color: 'text.secondary' }}>
              No Student Groups Yet
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Create your first student group to get started with organizing classes
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={resetForm}
              sx={{
                borderRadius: 3,
                px: 4,
                py: 0.6,
                height: 38, // Match Faculty button height
                background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
              }}
            >
              Create First Group
            </Button>
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.05) }}>
                  <TableCell sx={{ fontWeight: 600, py: 2 }}>Group/Class Name</TableCell>
                  <TableCell sx={{ fontWeight: 600, py: 2 }}>Selected Courses</TableCell>
                  <TableCell sx={{ fontWeight: 600, py: 2 }}>Year</TableCell>
                  <TableCell sx={{ fontWeight: 600, py: 2 }}>Semester</TableCell>
                  <TableCell sx={{ fontWeight: 600, py: 2 }}>Section</TableCell>
                  <TableCell sx={{ fontWeight: 600, py: 2 }}>Students</TableCell>
                  <TableCell sx={{ fontWeight: 600, py: 2 }}>Type</TableCell>
                  <TableCell sx={{ fontWeight: 600, py: 2, textAlign: 'center' }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {studentGroups.map((group) => (
                  <TableRow
                    key={group.id}
                    sx={{
                      '&:hover': {
                        bgcolor: alpha(theme.palette.primary.main, 0.03),
                      },
                      '&:nth-of-type(even)': {
                        bgcolor: alpha(theme.palette.grey[500], 0.02),
                      }
                    }}
                  >
                    <TableCell sx={{ py: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: '0.875rem' }}>
                          {group.name.charAt(0).toUpperCase()}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {group.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            ID: {group.id}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ py: 2, maxWidth: 300 }}>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {group.course_ids.slice(0, 3).map((courseId) => {
                          const course = availableCourses.find(c => c.id === courseId);
                          return (
                            <Chip
                              key={courseId}
                              label={course ? course.code : 'Unknown'}
                              size="small"
                              variant="outlined"
                              color="primary"
                              sx={{ borderRadius: 1, fontSize: '0.75rem' }}
                            />
                          );
                        })}
                        {group.course_ids.length > 3 && (
                          <Chip
                            label={`+${group.course_ids.length - 3} more`}
                            size="small"
                            variant="outlined"
                            color="default"
                            sx={{ borderRadius: 1, fontSize: '0.75rem' }}
                          />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell sx={{ py: 2 }}>
                      <Chip
                        label={`Year ${group.year}`}
                        size="small"
                        color="info"
                        variant="outlined"
                        sx={{ borderRadius: 2 }}
                      />
                    </TableCell>
                    <TableCell sx={{ py: 2 }}>
                      <Chip
                        label={group.semester}
                        size="small"
                        color={group.semester === 'Odd' ? 'warning' : 'success'}
                        variant="outlined"
                        sx={{ borderRadius: 2 }}
                      />
                    </TableCell>
                    <TableCell sx={{ py: 2 }}>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {group.section}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ py: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <GroupIcon fontSize="small" color="action" />
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {group.student_strength}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ py: 2 }}>
                      <Chip
                        label={group.group_type}
                        size="small"
                        color={group.group_type === 'Regular Class' ? 'primary' : 'secondary'}
                        sx={{ borderRadius: 2 }}
                      />
                    </TableCell>
                    <TableCell sx={{ py: 2, textAlign: 'center' }}>
                      <Stack direction="row" spacing={1} justifyContent="center">
                        <IconButton
                          size="small"
                          onClick={() => handleEditGroup(group.id!)}
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
                          onClick={() => handleDeleteGroup(group.id!)}
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
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Card>

      {/* Snackbars for notifications */}
      <Snackbar 
        open={!!error} 
        autoHideDuration={6000} 
        onClose={() => setError(null)}
      >
        <Alert severity="error" onClose={() => setError(null)} sx={{ borderRadius: 2 }}>
          {error}
        </Alert>
      </Snackbar>

      <Snackbar 
        open={!!success} 
        autoHideDuration={3000} 
        onClose={() => setSuccess(null)}
      >
        <Alert severity="success" onClose={() => setSuccess(null)} sx={{ borderRadius: 2 }}>
          {success}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default StudentGroupsTab;
