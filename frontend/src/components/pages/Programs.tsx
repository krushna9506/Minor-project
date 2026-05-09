import React, { useState, useEffect } from 'react';
import {
  Typography,
  Box,
  Card,
  CardContent,
  Button,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Stack,
  Tooltip,
  Snackbar,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  School as SchoolIcon,
  Analytics as AnalyticsIcon,
  MenuBook as CoursesIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
} from '@mui/icons-material';

import timetableService from '../../services/timetableService';
import type { Program } from '../../services/timetableService';
import { useAuthStore } from '../../store/authStore';

// Types based on backend models
interface ProgramStats {
  program_id: string;
  total_courses: number;
  total_timetables: number;
  courses_by_semester: { _id: number; count: number }[];
  program_info: Program;
}

const PROGRAM_TYPES = ['FYUP', 'B.Ed', 'M.Ed', 'ITEP'];

const Programs: React.FC = () => {
  const { user } = useAuthStore();
  const isAdmin = user?.is_admin || false;
  
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  
  console.log('👤 Current user:', user);
  console.log('🔐 Is admin:', isAdmin);
  
  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  
  // Filtering
  const [filterType, setFilterType] = useState<string>('');
  const [filterDepartment, setFilterDepartment] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  // Dialogs
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [statsDialogOpen, setStatsDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  
  // Selected program
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  const [programStats, setProgramStats] = useState<ProgramStats | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    type: '',
    department: '',
    duration_years: 4,
    total_semesters: 8,
    credits_required: 160,
    description: '',
    is_active: true,
  });

  // Load programs
  const loadPrograms = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Try to load programs from the backend
      const programsData = await timetableService.getPrograms();
      console.log('📋 Programs loaded from backend:', programsData.length);
      console.log('📋 Full programs array:', programsData);
      console.log('📋 First program structure:', programsData[0]);
      
      // Check if programs have id field
      programsData.forEach((program, index) => {
        if (!program.id) {
          console.error(`❌ Program at index ${index} missing id field:`, program);
        }
      });
      
      // Apply local filtering if needed
      let filteredPrograms = programsData;
      
      if (filterType) {
        filteredPrograms = filteredPrograms.filter(p => p.type === filterType);
      }
      
      if (filterDepartment) {
        filteredPrograms = filteredPrograms.filter(p => p.department === filterDepartment);
      }
      
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filteredPrograms = filteredPrograms.filter(p => 
          p.name.toLowerCase().includes(term) ||
          p.code.toLowerCase().includes(term) ||
          p.department.toLowerCase().includes(term)
        );
      }
      
      // Apply pagination
      const start = page * rowsPerPage;
      const paginatedPrograms = filteredPrograms.slice(start, start + rowsPerPage);
      
      setPrograms(paginatedPrograms);
      setTotal(filteredPrograms.length);
      
    } catch (err) {
      console.error('❌ Failed to load programs from backend:', err);
      setError('Failed to load programs from backend. Please check your API/server and try again.');
      setPrograms([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPrograms();
  }, [page, rowsPerPage, filterType, filterDepartment, searchTerm]);

  // Handle form changes
  const handleFormChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      type: '',
      department: '',
      duration_years: 4,
      total_semesters: 8,
      credits_required: 160,
      description: '',
      is_active: true,
    });
  };

  // Create program
  const handleCreate = async () => {
    try {
      console.log('Creating program with data:', JSON.stringify(formData, null, 2));
      
      // Validate required fields
      if (!formData.name || !formData.code || !formData.type || !formData.department) {
        setError('Please fill in all required fields');
        return;
      }
      
      await timetableService.createProgram(formData);
      setSuccess('Program created successfully');
      setCreateDialogOpen(false);
      resetForm();
      loadPrograms();
    } catch (err: any) {
      console.error('Failed to create program:', err);
      
      // Extract error message from response
      let errorMessage = 'Failed to create program';
      if (err.response?.data?.detail) {
        errorMessage = err.response.data.detail;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    }
  };

  // Edit program
  const handleEdit = (program: Program) => {
    console.log('🖊️ Edit button clicked for program:', program);
    console.log('🖊️ Program ID:', program.id);
    console.log('🖊️ Program _id:', (program as any)._id);
    console.log('🖊️ Program object keys:', Object.keys(program));
    
    // Handle both id and _id cases
    const programId = program.id || (program as any)._id;
    console.log('🖊️ Resolved program ID:', programId);
    
    if (!programId) {
      console.error('🖊️ No ID found in program object!');
      setError('Program ID is missing from the data');
      return;
    }
    
    // Create a program object with proper id field
    const programWithId = {
      ...program,
      id: programId
    };
    
    setSelectedProgram(programWithId);
    setFormData({
      name: program.name,
      code: program.code,
      type: program.type,
      department: program.department,
      duration_years: program.duration_years,
      total_semesters: program.total_semesters,
      credits_required: program.credits_required,
      description: program.description || '',
      is_active: program.is_active,
    });
    setEditDialogOpen(true);
    
    console.log('🖊️ Selected program set to:', programWithId);
  };

  // Update program
  const handleUpdate = async () => {
    try {
      if (!selectedProgram) {
        console.error('No selected program!');
        setError('No program selected for update');
        return;
      }
      
      console.log('🔄 Updating program:');
      console.log('🔄 selectedProgram:', selectedProgram);
      console.log('🔄 selectedProgram.id:', selectedProgram.id);
      console.log('🔄 formData:', formData);
      
      if (!selectedProgram.id) {
        console.error('Selected program has no ID!');
        setError('Program ID is missing');
        return;
      }
      
      await timetableService.updateProgram(selectedProgram.id, formData);
      setSuccess('Program updated successfully');
      setEditDialogOpen(false);
      resetForm();
      setSelectedProgram(null);
      loadPrograms();
    } catch (err) {
      console.error('❌ Failed to update program:', err);
      setError('Failed to update program');
    }
  };

  // Load program statistics
  const loadProgramStats = async (programId: string) => {
    try {
      console.log('Loading program statistics for:', programId);
      const stats = await timetableService.getProgramStatistics(programId);
      setProgramStats(stats);
      setStatsDialogOpen(true);
    } catch (err) {
      console.error('Failed to load program statistics:', err);
      setError('Failed to load program statistics from backend. Please check backend connectivity.');
      setProgramStats(null);
    }
  };

  // Delete program
  const handleDelete = async () => {
    try {
      if (!selectedProgram) {
        console.error('❌ No selectedProgram found');
        return;
      }
      
      console.log('🗑️ Attempting to delete program:', selectedProgram);
      console.log('🗑️ Program ID to delete:', selectedProgram.id);
      console.log('🗑️ Program _id (if exists):', (selectedProgram as any)._id);
      
      // Use id or _id as fallback
      const programId = selectedProgram.id || (selectedProgram as any)._id;
      
      if (!programId) {
        console.error('❌ Program ID is undefined or null');
        setError('Cannot delete program: Invalid program ID');
        return;
      }
      
      console.log('🗑️ Using program ID:', programId);
      await timetableService.deleteProgram(programId);
      setSuccess('Program deleted successfully');
      setDeleteDialogOpen(false);
      setSelectedProgram(null);
      loadPrograms();
    } catch (err) {
      console.error('Failed to delete program:', err);
      setError('Failed to delete program');
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
          <SchoolIcon color="primary" />
          Programs Management
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Manage academic programs - FYUP, B.Ed, M.Ed, and ITEP programs with NEP 2020 compliance
        </Typography>
      </Box>

      {/* Permission Alert for Non-Admin Users */}
      {!isAdmin && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <strong>View Only Mode:</strong> You can view programs but need administrator privileges to create, edit, or delete programs. Current user: {user?.email} (Role: {user?.role})
        </Alert>
      )}

      {/* Action Bar */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack spacing={2} direction={{ xs: 'column', md: 'row' }} alignItems={{ md: 'center' }}>
          <Box sx={{ flex: '1 1 300px' }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search programs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
              }}
            />
          </Box>
          <Box sx={{ flex: '0 1 200px' }}>
            <FormControl fullWidth size="small">
              <InputLabel>Program Type</InputLabel>
              <Select
                value={filterType}
                label="Program Type"
                onChange={(e) => setFilterType(e.target.value)}
              >
                <MenuItem value="">All Types</MenuItem>
                {PROGRAM_TYPES.map(type => (
                  <MenuItem key={type} value={type}>{type}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
          <Box sx={{ flex: '0 1 200px' }}>
            <TextField
              fullWidth
              size="small"
              label="Department"
              value={filterDepartment}
              onChange={(e) => setFilterDepartment(e.target.value)}
            />
          </Box>
          <Stack direction="row" spacing={1}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setCreateDialogOpen(true)}
              disabled={!isAdmin}
            >
              Add Program
            </Button>
            <Button
              variant="outlined"
              startIcon={<FilterIcon />}
              onClick={loadPrograms}
            >
              Refresh
            </Button>
          </Stack>
        </Stack>
      </Paper>

      {/* Programs Table */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Paper>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Program</TableCell>
                  <TableCell>Code</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Department</TableCell>
                  <TableCell>Duration</TableCell>
                  <TableCell>Credits</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {programs.map((program) => (
                  <TableRow key={program.id} hover>
                    <TableCell>
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                          {program.name}
                        </Typography>
                        {program.description && (
                          <Typography variant="caption" color="text.secondary">
                            {program.description.substring(0, 60)}...
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={program.code}
                        size="small"
                        variant="outlined"
                        color="primary"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={program.type}
                        size="small"
                        color={
                          program.type === 'FYUP' ? 'primary' :
                          program.type === 'B.Ed' ? 'secondary' :
                          program.type === 'M.Ed' ? 'success' : 'warning'
                        }
                      />
                    </TableCell>
                    <TableCell>{program.department}</TableCell>
                    <TableCell>
                      {program.duration_years} years / {program.total_semesters} semesters
                    </TableCell>
                    <TableCell>{program.credits_required}</TableCell>
                    <TableCell>
                      {program.is_active ? (
                        <Chip
                          icon={<CheckCircleIcon />}
                          label="Active"
                          size="small"
                          color="success"
                        />
                      ) : (
                        <Chip
                          icon={<CancelIcon />}
                          label="Inactive"
                          size="small"
                          color="error"
                        />
                      )}
                    </TableCell>
                    <TableCell align="center">
                      <Stack direction="row" spacing={0.5} justifyContent="center">
                        <Tooltip title="View Statistics">
                          <IconButton
                            size="small"
                            onClick={() => loadProgramStats(program.id)}
                          >
                            <AnalyticsIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="View Courses">
                          <IconButton size="small">
                            <CoursesIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit Program">
                          <IconButton
                            size="small"
                            onClick={() => handleEdit(program)}
                            disabled={!isAdmin}
                          >
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete Program">
                          <IconButton
                            size="small"
                            onClick={() => {
                              console.log('🗑️ Delete button clicked for program:', program);
                              console.log('🗑️ Program ID:', program.id);
                              setSelectedProgram(program);
                              setDeleteDialogOpen(true);
                            }}
                            disabled={!isAdmin}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            rowsPerPageOptions={[5, 10, 25, 50]}
            component="div"
            count={total}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={(_, newPage) => setPage(newPage)}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
          />
        </Paper>
      )}

      {/* Create Program Dialog */}
      <Dialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Create New Program</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField
                fullWidth
                label="Program Name"
                value={formData.name}
                onChange={(e) => handleFormChange('name', e.target.value)}
                required
              />
              <TextField
                fullWidth
                label="Program Code"
                value={formData.code}
                onChange={(e) => handleFormChange('code', e.target.value)}
                required
              />
            </Stack>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <FormControl fullWidth required>
                <InputLabel>Program Type</InputLabel>
                <Select
                  value={formData.type}
                  label="Program Type"
                  onChange={(e) => handleFormChange('type', e.target.value)}
                >
                  {PROGRAM_TYPES.map(type => (
                    <MenuItem key={type} value={type}>{type}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                fullWidth
                label="Department"
                value={formData.department}
                onChange={(e) => handleFormChange('department', e.target.value)}
                required
              />
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                fullWidth
                label="Duration (Years)"
                type="number"
                value={formData.duration_years}
                onChange={(e) => handleFormChange('duration_years', parseInt(e.target.value))}
                required
              />
              <TextField
                fullWidth
                label="Total Semesters"
                type="number"
                value={formData.total_semesters}
                onChange={(e) => handleFormChange('total_semesters', parseInt(e.target.value))}
                required
              />
              <TextField
                fullWidth
                label="Credits Required"
                type="number"
                value={formData.credits_required}
                onChange={(e) => handleFormChange('credits_required', parseInt(e.target.value))}
                required
              />
            </Stack>
            <TextField
              fullWidth
              label="Description"
              multiline
              rows={3}
              value={formData.description}
              onChange={(e) => handleFormChange('description', e.target.value)}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreate}>
            Create Program
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Program Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Edit Program</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField
                fullWidth
                label="Program Name"
                value={formData.name}
                onChange={(e) => handleFormChange('name', e.target.value)}
                required
              />
              <TextField
                fullWidth
                label="Program Code"
                value={formData.code}
                onChange={(e) => handleFormChange('code', e.target.value)}
                required
              />
            </Stack>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <FormControl fullWidth required>
                <InputLabel>Program Type</InputLabel>
                <Select
                  value={formData.type}
                  label="Program Type"
                  onChange={(e) => handleFormChange('type', e.target.value)}
                >
                  {PROGRAM_TYPES.map(type => (
                    <MenuItem key={type} value={type}>{type}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                fullWidth
                label="Department"
                value={formData.department}
                onChange={(e) => handleFormChange('department', e.target.value)}
                required
              />
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                fullWidth
                label="Duration (Years)"
                type="number"
                value={formData.duration_years}
                onChange={(e) => handleFormChange('duration_years', parseInt(e.target.value))}
                required
              />
              <TextField
                fullWidth
                label="Total Semesters"
                type="number"
                value={formData.total_semesters}
                onChange={(e) => handleFormChange('total_semesters', parseInt(e.target.value))}
                required
              />
              <TextField
                fullWidth
                label="Credits Required"
                type="number"
                value={formData.credits_required}
                onChange={(e) => handleFormChange('credits_required', parseInt(e.target.value))}
                required
              />
            </Stack>
            <TextField
              fullWidth
              label="Description"
              multiline
              rows={3}
              value={formData.description}
              onChange={(e) => handleFormChange('description', e.target.value)}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleUpdate}>
            Update Program
          </Button>
        </DialogActions>
      </Dialog>

      {/* Statistics Dialog */}
      <Dialog
        open={statsDialogOpen}
        onClose={() => setStatsDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Program Statistics</DialogTitle>
        <DialogContent>
          {programStats && (
            <Stack spacing={3}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" sx={{ mb: 1 }}>
                  {programStats.program_info.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Code: {programStats.program_info.code} | Type: {programStats.program_info.type}
                </Typography>
              </Paper>
              
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
                <Card sx={{ flex: 1 }}>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h3" color="primary" sx={{ fontWeight: 'bold' }}>
                      {programStats.total_courses}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Courses
                    </Typography>
                  </CardContent>
                </Card>
                
                <Card sx={{ flex: 1 }}>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h3" color="secondary" sx={{ fontWeight: 'bold' }}>
                      {programStats.total_timetables}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Active Timetables
                    </Typography>
                  </CardContent>
                </Card>
                
                <Card sx={{ flex: 1 }}>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h3" color="success.main" sx={{ fontWeight: 'bold' }}>
                      {programStats.courses_by_semester.length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Active Semesters
                    </Typography>
                  </CardContent>
                </Card>
              </Stack>
              
              <Box>
                <Typography variant="h6" sx={{ mb: 2 }}>Courses by Semester</Typography>
                <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
                  {programStats.courses_by_semester.map(sem => (
                    <Paper key={sem._id} sx={{ p: 2, textAlign: 'center', minWidth: 120 }}>
                      <Typography variant="h5" color="primary">
                        {sem.count}
                      </Typography>
                      <Typography variant="body2">
                        Semester {sem._id}
                      </Typography>
                    </Paper>
                  ))}
                </Stack>
              </Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStatsDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the program "{selectedProgram?.name}"?
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDelete}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success/Error Snackbars */}
      <Snackbar
        open={!!success}
        autoHideDuration={6000}
        onClose={() => setSuccess('')}
      >
        <Alert severity="success" onClose={() => setSuccess('')}>
          {success}
        </Alert>
      </Snackbar>

      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError('')}
      >
        <Alert severity="error" onClose={() => setError('')}>
          {error}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Programs;
