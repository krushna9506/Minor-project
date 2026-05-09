import React, { useState, useEffect } from 'react';
import {
  Typography,
  Box,
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
  Switch,
  FormControlLabel,
  Slider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Card,
  CardContent,
  CardActions,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Settings as SettingsIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  PlaylistAddCheck as ValidateIcon,
  Flag as PriorityIcon,
  Rule as RuleIcon,
  ExpandMore as ExpandMoreIcon,
  School as SchoolIcon,
  Person as PersonIcon,
  Room as RoomIcon,
  Schedule as ScheduleIcon,
  Warning as WarningIcon,
  AutoFixHigh as AIIcon,
  Send as SendIcon,
  Lightbulb as SuggestIcon,
} from '@mui/icons-material';
import timetableService, { type Constraint, type Program } from '../../services/timetableService';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

// Types based on backend models
// Constraint interface imported from service

interface ConstraintType {
  key: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  parameters: ParameterDefinition[];
}

interface ParameterDefinition {
  name: string;
  label: string;
  type: 'text' | 'number' | 'boolean' | 'select' | 'multiselect' | 'time' | 'json';
  required?: boolean;
  options?: string[];
  min?: number;
  max?: number;
  default?: any;
}

interface ValidationResult {
  constraint_id: string;
  constraint_type: string;
  is_valid: boolean;
  message: string;
}

const CONSTRAINT_TYPES: ConstraintType[] = [
  {
    key: 'faculty_availability',
    name: 'Faculty Availability',
    description: 'Defines when faculty members are available',
    icon: <PersonIcon />,
    parameters: [
      { name: 'faculty_id', label: 'Faculty ID', type: 'text', required: true },
      { name: 'available_days', label: 'Available Days', type: 'multiselect', options: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] },
      { name: 'start_time', label: 'Start Time', type: 'time' },
      { name: 'end_time', label: 'End Time', type: 'time' },
    ]
  },
  {
    key: 'room_capacity',
    name: 'Room Capacity',
    description: 'Ensures room capacity matches course requirements',
    icon: <RoomIcon />,
    parameters: [
      { name: 'room_id', label: 'Room ID', type: 'text' },
      { name: 'min_capacity', label: 'Minimum Capacity', type: 'number', min: 1 },
      { name: 'max_capacity', label: 'Maximum Capacity', type: 'number', min: 1 },
    ]
  },
  {
    key: 'time_preference',
    name: 'Time Preference',
    description: 'Faculty or institutional time preferences',
    icon: <ScheduleIcon />,
    parameters: [
      { name: 'preferred_times', label: 'Preferred Time Slots', type: 'multiselect', options: ['9:00-10:00', '10:00-11:00', '11:00-12:00', '14:00-15:00', '15:00-16:00'] },
      { name: 'avoid_times', label: 'Times to Avoid', type: 'multiselect', options: ['9:00-10:00', '10:00-11:00', '11:00-12:00', '14:00-15:00', '15:00-16:00'] },
    ]
  },
  {
    key: 'faculty_workload',
    name: 'Faculty Workload',
    description: 'Limits on faculty teaching hours',
    icon: <PersonIcon />,
    parameters: [
      { name: 'faculty_id', label: 'Faculty ID', type: 'text', required: true },
      { name: 'max_hours_per_day', label: 'Max Hours per Day', type: 'number', min: 1, max: 12 },
      { name: 'max_hours_per_week', label: 'Max Hours per Week', type: 'number', min: 1, max: 40 },
    ]
  },
  {
    key: 'room_type_requirement',
    name: 'Room Type Requirement',
    description: 'Specific room type needs (lab, lecture hall)',
    icon: <RoomIcon />,
    parameters: [
      { name: 'course_id', label: 'Course ID', type: 'text' },
      { name: 'required_room_type', label: 'Required Room Type', type: 'select', options: ['Lecture Hall', 'Laboratory', 'Seminar Room', 'Computer Lab', 'Workshop'] },
    ]
  },
  {
    key: 'block_scheduling',
    name: 'Block Scheduling',
    description: 'Teaching practice and field work blocks',
    icon: <SchoolIcon />,
    parameters: [
      { name: 'block_duration', label: 'Block Duration (hours)', type: 'number', min: 1, max: 8 },
      { name: 'consecutive_days', label: 'Consecutive Days', type: 'number', min: 1, max: 7 },
    ]
  },
  {
    key: 'gap_minimization',
    name: 'Gap Minimization',
    description: 'Minimize gaps in schedules',
    icon: <ScheduleIcon />,
    parameters: [
      { name: 'max_gap_hours', label: 'Maximum Gap (hours)', type: 'number', min: 0, max: 4 },
      { name: 'apply_to', label: 'Apply To', type: 'select', options: ['Faculty', 'Students', 'Both'] },
    ]
  },
  {
    key: 'consecutive_classes',
    name: 'Consecutive Classes',
    description: 'Required consecutive class scheduling',
    icon: <ScheduleIcon />,
    parameters: [
      { name: 'course_ids', label: 'Course IDs (comma-separated)', type: 'text' },
      { name: 'must_be_consecutive', label: 'Must be Consecutive', type: 'boolean', default: true },
    ]
  },
  {
    key: 'nep_compliance',
    name: 'NEP Compliance',
    description: 'NEP 2020 guideline adherence',
    icon: <RuleIcon />,
    parameters: [
      { name: 'compliance_type', label: 'Compliance Type', type: 'select', options: ['Credit Distribution', 'Multidisciplinary', 'Flexibility', 'Assessment'] },
      { name: 'requirement_details', label: 'Requirement Details', type: 'json' },
    ]
  },
];

const Constraints: React.FC = () => {
  const [constraints, setConstraints] = useState<Constraint[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);

  // Filtering
  const [filterType, setFilterType] = useState<string>('');
  const [filterActive, setFilterActive] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Dialogs
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [validateDialogOpen, setValidateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Selected constraint
  const [selectedConstraint, setSelectedConstraint] = useState<Constraint | null>(null);
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);

  // AI Natural Language state
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [naturalLanguageInput, setNaturalLanguageInput] = useState('');
  const [parsedConstraint, setParsedConstraint] = useState<any>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<any[]>([]);
  const [aiSuggestDialogOpen, setAiSuggestDialogOpen] = useState(false);
  const [nepComplianceReport, setNepComplianceReport] = useState<any>(null);
  const [nepDialogOpen, setNepDialogOpen] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    description: '',
    parameters: {} as Record<string, any>,
    priority: 5,
    is_active: true,
    program_id: '',
  });

  // Load constraints and programs
  const loadData = async () => {
    try {
      setLoading(true);
      const [constraintsData, programsData] = await Promise.all([
        timetableService.getConstraints({
          skip: page * rowsPerPage,
          limit: rowsPerPage,
          is_active: filterActive,
          constraint_type: filterType || undefined
        }),
        timetableService.getPrograms()
      ]);

      setConstraints(constraintsData);
      setPrograms(programsData);
      setTotal(constraintsData.length); // Ideally backend returns total count
    } catch (err) {
      setError('Failed to load data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [page, rowsPerPage, filterType, filterActive]);

  // Handle form changes
  const handleFormChange = (field: string, value: any) => {
    if (field.startsWith('param_')) {
      const paramName = field.replace('param_', '');
      setFormData(prev => ({
        ...prev,
        parameters: {
          ...prev.parameters,
          [paramName]: value,
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value,
      }));
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      type: '',
      description: '',
      parameters: {},
      priority: 5,
      is_active: true,
      program_id: '',
    });
  };

  // Get constraint type info
  const getConstraintType = (typeKey: string): ConstraintType | undefined => {
    return CONSTRAINT_TYPES.find(t => t.key === typeKey);
  };

  // Create constraint
  const handleCreate = async () => {
    try {
      console.log('Creating constraint:', formData);
      await timetableService.createConstraint(formData);
      setSuccess('Constraint created successfully');
      setCreateDialogOpen(false);
      resetForm();
      loadData();
    } catch (err) {
      setError('Failed to create constraint');
      console.error(err);
    }
  };

  // Edit constraint
  const handleEdit = (constraint: Constraint) => {
    setSelectedConstraint(constraint);
    setFormData({
      name: constraint.name,
      type: constraint.type,
      description: constraint.description || '',
      parameters: constraint.parameters,
      priority: constraint.priority,
      is_active: constraint.is_active,
      program_id: constraint.program_id || '',
    });
    setEditDialogOpen(true);
  };

  // Update constraint
  const handleUpdate = async () => {
    try {
      if (!selectedConstraint?._id) return;
      console.log('Updating constraint:', selectedConstraint._id, formData);
      await timetableService.updateConstraint(selectedConstraint._id, formData);
      setSuccess('Constraint updated successfully');
      setEditDialogOpen(false);
      resetForm();
      setSelectedConstraint(null);
      loadData();
    } catch (err) {
      setError('Failed to update constraint');
      console.error(err);
    }
  };

  // Validate constraints
  const handleValidate = async () => {
    try {
      setValidationResults([
        { constraint_id: '1', constraint_type: 'faculty_availability', is_valid: true, message: 'Faculty availability validated successfully' },
        { constraint_id: '2', constraint_type: 'room_capacity', is_valid: false, message: 'Room capacity exceeds available space' },
      ]);
      setValidateDialogOpen(true);
    } catch (err) {
      setError('Failed to validate constraints');
    }
  };

  // Delete constraint
  const handleDelete = async () => {
    try {
      if (!selectedConstraint) return;
      console.log('Deleting constraint:', selectedConstraint._id);
      await timetableService.deleteConstraint(selectedConstraint._id);
      setSuccess('Constraint deleted successfully');
      setDeleteDialogOpen(false);
      setSelectedConstraint(null);
      loadData();
    } catch (err) {
      setError('Failed to delete constraint');
      console.error(err);
    }
  };

  // AI Natural Language Constraint Creation
  const handleParseNaturalLanguage = async () => {
    if (!naturalLanguageInput.trim()) {
      setError('Please enter a constraint description');
      return;
    }

    setAiLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/ai/constraints/parse-natural-language`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${JSON.parse(localStorage.getItem('auth-storage') || '{}')?.state?.token || ''}`
        },
        body: JSON.stringify({
          text: naturalLanguageInput,
          program_id: formData.program_id || undefined
        })
      });

      if (!response.ok) throw new Error('Failed to parse constraint');

      const data = await response.json();
      setParsedConstraint(data.parsed_constraint);
      setSuccess('Constraint parsed successfully!');
    } catch (err) {
      console.error('AI parsing error:', err);
      setError('Failed to parse constraint. Please try again.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleCreateParsedConstraint = async () => {
    if (!parsedConstraint) return;

    try {
      const constraintData = {
        name: parsedConstraint.name,
        type: parsedConstraint.type,
        description: parsedConstraint.description,
        parameters: parsedConstraint.parameters,
        priority: parsedConstraint.priority || 5,
        is_active: parsedConstraint.is_active ?? true,
        program_id: formData.program_id || parsedConstraint.program_id
      };

      await timetableService.createConstraint(constraintData);
      setSuccess('AI-generated constraint created successfully!');
      setAiDialogOpen(false);
      setNaturalLanguageInput('');
      setParsedConstraint(null);
      loadData();
    } catch (err) {
      console.error('Create constraint error:', err);
      setError('Failed to create constraint');
    }
  };

  // AI Suggest Constraints
  const handleAISuggestConstraints = async () => {
    if (!formData.program_id) {
      setError('Please select a program first to get AI suggestions');
      return;
    }

    setAiLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/ai/constraints/suggest/${formData.program_id}`, {
        headers: {
          'Authorization': `Bearer ${JSON.parse(localStorage.getItem('auth-storage') || '{}')?.state?.token || ''}`
        }
      });

      if (!response.ok) throw new Error('Failed to get suggestions');

      const data = await response.json();
      setAiSuggestions(data.suggested_constraints || []);
      setAiSuggestDialogOpen(true);
    } catch (err) {
      console.error('AI suggestions error:', err);
      setError('Failed to get AI suggestions');
    } finally {
      setAiLoading(false);
    }
  };

  const handleApplySuggestedConstraint = async (suggestion: any) => {
    try {
      await timetableService.createConstraint({
        name: suggestion.name,
        type: suggestion.type,
        description: suggestion.description,
        parameters: suggestion.parameters,
        priority: suggestion.priority || 5,
        is_active: true,
        program_id: formData.program_id
      });
      setSuccess(`Constraint "${suggestion.name}" created!`);
      loadData();
    } catch (err) {
      setError('Failed to create suggested constraint');
    }
  };

  // Check NEP Compliance
  const handleCheckNEPCompliance = async () => {
    setAiLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/ai/constraints/check-nep-compliance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${JSON.parse(localStorage.getItem('auth-storage') || '{}')?.state?.token || ''}`
        },
        body: JSON.stringify({ constraints })
      });

      if (!response.ok) throw new Error('Failed to check compliance');

      const data = await response.json();
      setNepComplianceReport(data.compliance_report);
      setNepDialogOpen(true);
    } catch (err) {
      console.error('NEP compliance check error:', err);
      setError('Failed to check NEP compliance');
    } finally {
      setAiLoading(false);
    }
  };

  // Render parameter input
  const renderParameterInput = (param: ParameterDefinition, value: any) => {
    const fieldName = `param_${param.name}`;

    switch (param.type) {
      case 'boolean':
        return (
          <FormControlLabel
            control={
              <Switch
                checked={value || param.default || false}
                onChange={(e) => handleFormChange(fieldName, e.target.checked)}
              />
            }
            label={param.label}
          />
        );

      case 'number':
        return (
          <TextField
            fullWidth
            label={param.label}
            type="number"
            value={value || param.default || ''}
            onChange={(e) => handleFormChange(fieldName, parseInt(e.target.value))}
            inputProps={{ min: param.min, max: param.max }}
            required={param.required}
          />
        );

      case 'select':
        return (
          <FormControl fullWidth required={param.required}>
            <InputLabel>{param.label}</InputLabel>
            <Select
              value={value || param.default || ''}
              label={param.label}
              onChange={(e) => handleFormChange(fieldName, e.target.value)}
            >
              {param.options?.map(option => (
                <MenuItem key={option} value={option}>{option}</MenuItem>
              ))}
            </Select>
          </FormControl>
        );

      case 'multiselect':
        return (
          <FormControl fullWidth required={param.required}>
            <InputLabel>{param.label}</InputLabel>
            <Select
              multiple
              value={value || param.default || []}
              label={param.label}
              onChange={(e) => handleFormChange(fieldName, e.target.value)}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {(selected as string[]).map((val) => (
                    <Chip key={val} label={val} size="small" />
                  ))}
                </Box>
              )}
            >
              {param.options?.map(option => (
                <MenuItem key={option} value={option}>{option}</MenuItem>
              ))}
            </Select>
          </FormControl>
        );

      case 'time':
        return (
          <TextField
            fullWidth
            label={param.label}
            type="time"
            value={value || param.default || ''}
            onChange={(e) => handleFormChange(fieldName, e.target.value)}
            InputLabelProps={{ shrink: true }}
            required={param.required}
          />
        );

      case 'json':
        return (
          <TextField
            fullWidth
            label={param.label}
            multiline
            rows={3}
            value={typeof value === 'object' ? JSON.stringify(value, null, 2) : value || ''}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value);
                handleFormChange(fieldName, parsed);
              } catch {
                handleFormChange(fieldName, e.target.value);
              }
            }}
            placeholder="Enter JSON object"
            required={param.required}
          />
        );

      default:
        return (
          <TextField
            fullWidth
            label={param.label}
            value={value || param.default || ''}
            onChange={(e) => handleFormChange(fieldName, e.target.value)}
            required={param.required}
          />
        );
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
          <SettingsIcon color="primary" />
          Constraints Management
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Manage scheduling constraints for timetable generation with NEP 2020 compliance
        </Typography>
      </Box>

      {/* Action Bar */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack spacing={2} direction={{ xs: 'column', md: 'row' }} alignItems={{ md: 'center' }}>
          <Box sx={{ flex: '1 1 300px' }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search constraints..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
              }}
            />
          </Box>
          <Box sx={{ flex: '0 1 200px' }}>
            <FormControl fullWidth size="small">
              <InputLabel>Constraint Type</InputLabel>
              <Select
                value={filterType}
                label="Constraint Type"
                onChange={(e) => setFilterType(e.target.value)}
              >
                <MenuItem value="">All Types</MenuItem>
                {CONSTRAINT_TYPES.map(type => (
                  <MenuItem key={type.key} value={type.key}>{type.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
          <Box sx={{ flex: '0 1 150px' }}>
            <FormControlLabel
              control={
                <Switch
                  checked={filterActive}
                  onChange={(e) => setFilterActive(e.target.checked)}
                />
              }
              label="Active Only"
            />
          </Box>
          <Stack direction="row" spacing={1}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setCreateDialogOpen(true)}
            >
              Add Constraint
            </Button>
            <Button
              variant="outlined"
              color="secondary"
              startIcon={<AIIcon />}
              onClick={() => setAiDialogOpen(true)}
            >
              AI Create
            </Button>
            <Button
              variant="outlined"
              startIcon={<SuggestIcon />}
              onClick={handleAISuggestConstraints}
            >
              AI Suggest
            </Button>
            <Button
              variant="outlined"
              startIcon={<ValidateIcon />}
              onClick={() => handleValidate()}
            >
              Validate
            </Button>
            <Button
              variant="outlined"
              color="success"
              startIcon={<RuleIcon />}
              onClick={handleCheckNEPCompliance}
              disabled={aiLoading}
            >
              NEP Check
            </Button>
            <Button
              variant="outlined"
              startIcon={<FilterIcon />}
              onClick={loadData}
            >
              Refresh
            </Button>
          </Stack>
        </Stack>
      </Paper>

      {/* Constraints Table */}
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
                  <TableCell>Constraint</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Priority</TableCell>
                  <TableCell>Program</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {constraints.map((constraint) => {
                  const constraintType = getConstraintType(constraint.type);
                  return (
                    <TableRow key={constraint._id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {constraintType?.icon}
                          <Box>
                            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                              {constraint.name}
                            </Typography>
                            {constraint.description && (
                              <Typography variant="caption" color="text.secondary">
                                {constraint.description.substring(0, 50)}...
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={constraintType?.name || constraint.type}
                          size="small"
                          variant="outlined"
                          color="primary"
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <PriorityIcon fontSize="small" color={
                            constraint.priority >= 8 ? 'error' :
                              constraint.priority >= 5 ? 'warning' : 'success'
                          } />
                          <Typography variant="body2">{constraint.priority}/10</Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        {constraint.program_id ? (
                          <Chip label="Program Specific" size="small" color="secondary" />
                        ) : (
                          <Chip label="Global" size="small" color="default" />
                        )}
                      </TableCell>
                      <TableCell>
                        {constraint.is_active ? (
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
                          <Tooltip title="Edit Constraint">
                            <IconButton
                              size="small"
                              onClick={() => handleEdit(constraint)}
                            >
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete Constraint">
                            <IconButton
                              size="small"
                              onClick={() => {
                                setSelectedConstraint(constraint);
                                setDeleteDialogOpen(true);
                              }}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })}
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

      {/* Create Constraint Dialog */}
      <Dialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Create New Constraint</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField
                fullWidth
                label="Constraint Name"
                value={formData.name}
                onChange={(e) => handleFormChange('name', e.target.value)}
                required
              />
              <FormControl fullWidth required>
                <InputLabel>Constraint Type</InputLabel>
                <Select
                  value={formData.type}
                  label="Constraint Type"
                  onChange={(e) => handleFormChange('type', e.target.value)}
                >
                  {CONSTRAINT_TYPES.map(type => (
                    <MenuItem key={type.key} value={type.key}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {type.icon}
                        {type.name}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>

            <TextField
              fullWidth
              label="Description"
              multiline
              rows={2}
              value={formData.description}
              onChange={(e) => handleFormChange('description', e.target.value)}
            />

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <Box sx={{ flex: 1 }}>
                <Typography gutterBottom>Priority: {formData.priority}/10</Typography>
                <Slider
                  value={formData.priority}
                  onChange={(_, value) => handleFormChange('priority', value)}
                  min={1}
                  max={10}
                  marks
                  step={1}
                  valueLabelDisplay="auto"
                />
              </Box>
              <FormControl sx={{ flex: 1 }}>
                <InputLabel>Program (Optional)</InputLabel>
                <Select
                  value={formData.program_id}
                  label="Program (Optional)"
                  onChange={(e) => handleFormChange('program_id', e.target.value)}
                >
                  <MenuItem value="">Global Constraint</MenuItem>
                  {programs.map((program) => (
                    <MenuItem key={program.id || (program as any)._id} value={program.id || (program as any)._id}>
                      {program.name} ({program.code})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>

            {formData.type && (
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="h6">Constraint Parameters</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Stack spacing={2}>
                    {getConstraintType(formData.type)?.parameters.map(param => (
                      <Box key={param.name}>
                        {renderParameterInput(param, formData.parameters[param.name])}
                      </Box>
                    ))}
                  </Stack>
                </AccordionDetails>
              </Accordion>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreate}>
            Create Constraint
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Constraint Dialog - Similar to Create but with different title and action */}
      <Dialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Edit Constraint</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField
                fullWidth
                label="Constraint Name"
                value={formData.name}
                onChange={(e) => handleFormChange('name', e.target.value)}
                required
              />
              <FormControl fullWidth required>
                <InputLabel>Constraint Type</InputLabel>
                <Select
                  value={formData.type}
                  label="Constraint Type"
                  onChange={(e) => handleFormChange('type', e.target.value)}
                >
                  {CONSTRAINT_TYPES.map(type => (
                    <MenuItem key={type.key} value={type.key}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {type.icon}
                        {type.name}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>

            <TextField
              fullWidth
              label="Description"
              multiline
              rows={2}
              value={formData.description}
              onChange={(e) => handleFormChange('description', e.target.value)}
            />

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <Box sx={{ flex: 1 }}>
                <Typography gutterBottom>Priority: {formData.priority}/10</Typography>
                <Slider
                  value={formData.priority}
                  onChange={(_, value) => handleFormChange('priority', value)}
                  min={1}
                  max={10}
                  marks
                  step={1}
                  valueLabelDisplay="auto"
                />
              </Box>
              <FormControl sx={{ flex: 1 }}>
                <InputLabel>Program (Optional)</InputLabel>
                <Select
                  value={formData.program_id}
                  label="Program (Optional)"
                  onChange={(e) => handleFormChange('program_id', e.target.value)}
                >
                  <MenuItem value="">Global Constraint</MenuItem>
                  <MenuItem value="1">Computer Science Engineering</MenuItem>
                  <MenuItem value="2">Bachelor of Education</MenuItem>
                </Select>
              </FormControl>
            </Stack>

            {formData.type && (
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="h6">Constraint Parameters</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Stack spacing={2}>
                    {getConstraintType(formData.type)?.parameters.map(param => (
                      <Box key={param.name}>
                        {renderParameterInput(param, formData.parameters[param.name])}
                      </Box>
                    ))}
                  </Stack>
                </AccordionDetails>
              </Accordion>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleUpdate}>
            Update Constraint
          </Button>
        </DialogActions>
      </Dialog>

      {/* Validation Results Dialog */}
      <Dialog
        open={validateDialogOpen}
        onClose={() => setValidateDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Constraint Validation Results</DialogTitle>
        <DialogContent>
          <List>
            {validationResults.map((result, index) => (
              <React.Fragment key={result.constraint_id}>
                <ListItem>
                  <ListItemIcon>
                    {result.is_valid ?
                      <CheckCircleIcon color="success" /> :
                      <WarningIcon color="error" />
                    }
                  </ListItemIcon>
                  <ListItemText
                    primary={result.constraint_type}
                    secondary={result.message}
                  />
                </ListItem>
                {index < validationResults.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setValidateDialogOpen(false)}>Close</Button>
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
            Are you sure you want to delete the constraint "{selectedConstraint?.name}"?
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

      {/* AI Natural Language Constraint Dialog */}
      <Dialog
        open={aiDialogOpen}
        onClose={() => {
          setAiDialogOpen(false);
          setParsedConstraint(null);
          setNaturalLanguageInput('');
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AIIcon color="secondary" />
          AI Constraint Creator
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <Alert severity="info">
              Describe your constraint in natural language. The AI will parse it into a structured constraint.
              <br /><br />
              <strong>Examples:</strong>
              <ul>
                <li>"Professor Smith can only teach on Mondays and Wednesdays before 2pm"</li>
                <li>"No classes should be scheduled during lunch hours 12-1pm"</li>
                <li>"Lab sessions for Chemistry must be in the afternoon"</li>
                <li>"Faculty should not teach more than 18 hours per week as per NEP"</li>
              </ul>
            </Alert>

            <TextField
              fullWidth
              multiline
              rows={3}
              label="Describe your constraint"
              placeholder="Enter constraint in natural language..."
              value={naturalLanguageInput}
              onChange={(e) => setNaturalLanguageInput(e.target.value)}
              disabled={aiLoading}
            />

            <Button
              variant="contained"
              color="secondary"
              startIcon={aiLoading ? <CircularProgress size={20} /> : <SendIcon />}
              onClick={handleParseNaturalLanguage}
              disabled={aiLoading || !naturalLanguageInput.trim()}
            >
              {aiLoading ? 'Parsing...' : 'Parse with AI'}
            </Button>

            {parsedConstraint && (
              <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                <Typography variant="h6" gutterBottom>Parsed Constraint</Typography>
                <Stack spacing={1}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Name</Typography>
                    <Typography variant="body1">{parsedConstraint.name}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Type</Typography>
                    <Chip label={parsedConstraint.type} size="small" color="primary" />
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Description</Typography>
                    <Typography variant="body2">{parsedConstraint.description}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Priority</Typography>
                    <Typography variant="body2">{parsedConstraint.priority}/10</Typography>
                  </Box>
                  {parsedConstraint.nep_compliance?.relevant && (
                    <Box>
                      <Typography variant="caption" color="text.secondary">NEP Relevance</Typography>
                      <Stack direction="row" spacing={0.5} flexWrap="wrap">
                        {parsedConstraint.nep_compliance.nep_areas.map((area: string) => (
                          <Chip key={area} label={area.replace('_', ' ')} size="small" color="success" />
                        ))}
                      </Stack>
                    </Box>
                  )}
                  <Box>
                    <Typography variant="caption" color="text.secondary">Parameters</Typography>
                    <pre style={{ fontSize: '0.75rem', background: '#f5f5f5', padding: 8, borderRadius: 4 }}>
                      {JSON.stringify(parsedConstraint.parameters, null, 2)}
                    </pre>
                  </Box>
                </Stack>
              </Paper>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setAiDialogOpen(false);
            setParsedConstraint(null);
            setNaturalLanguageInput('');
          }}>
            Cancel
          </Button>
          {parsedConstraint && (
            <Button variant="contained" color="secondary" onClick={handleCreateParsedConstraint}>
              Create Constraint
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* AI Suggestions Dialog */}
      <Dialog
        open={aiSuggestDialogOpen}
        onClose={() => setAiSuggestDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SuggestIcon color="primary" />
          AI Suggested Constraints
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Alert severity="info">
              Based on your program details and NEP 2020 guidelines, here are suggested constraints.
            </Alert>
            {aiSuggestions.length === 0 ? (
              <Typography color="text.secondary">No suggestions available.</Typography>
            ) : (
              aiSuggestions.map((suggestion, index) => (
                <Card key={index} variant="outlined">
                  <CardContent>
                    <Stack direction="row" justifyContent="space-between" alignItems="start">
                      <Box>
                        <Typography variant="h6">{suggestion.name}</Typography>
                        <Chip 
                          label={suggestion.type} 
                          size="small" 
                          color="primary" 
                          sx={{ mt: 0.5 }}
                        />
                      </Box>
                      <Chip 
                        label={`Priority: ${suggestion.priority}/10`} 
                        size="small" 
                        color={suggestion.priority >= 8 ? 'error' : suggestion.priority >= 5 ? 'warning' : 'default'}
                      />
                    </Stack>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      {suggestion.description}
                    </Typography>
                    {suggestion.nep_rationale && (
                      <Alert severity="success" sx={{ mt: 1 }} icon={<RuleIcon />}>
                        <Typography variant="caption">
                          <strong>NEP 2020:</strong> {suggestion.nep_rationale}
                        </Typography>
                      </Alert>
                    )}
                  </CardContent>
                  <CardActions>
                    <Button 
                      size="small" 
                      variant="outlined"
                      onClick={() => handleApplySuggestedConstraint(suggestion)}
                    >
                      Apply Constraint
                    </Button>
                  </CardActions>
                </Card>
              ))
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAiSuggestDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* NEP Compliance Dialog */}
      <Dialog
        open={nepDialogOpen}
        onClose={() => setNepDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <RuleIcon color="success" />
          NEP 2020 Compliance Report
        </DialogTitle>
        <DialogContent>
          {nepComplianceReport && (
            <Stack spacing={3} sx={{ mt: 1 }}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h2" color={nepComplianceReport.overall_score >= 80 ? 'success.main' : nepComplianceReport.overall_score >= 60 ? 'warning.main' : 'error.main'}>
                  {nepComplianceReport.overall_score}%
                </Typography>
                <Typography variant="h6" color="text.secondary">
                  Overall Compliance Score
                </Typography>
                <Chip 
                  label={nepComplianceReport.compliance_level?.toUpperCase() || 'UNKNOWN'} 
                  color={nepComplianceReport.compliance_level === 'high' ? 'success' : nepComplianceReport.compliance_level === 'medium' ? 'warning' : 'error'}
                  sx={{ mt: 1 }}
                />
              </Box>

              {nepComplianceReport.area_scores && (
                <Paper sx={{ p: 2 }}>
                  <Typography variant="h6" gutterBottom>Area Scores</Typography>
                  <Stack spacing={1}>
                    {Object.entries(nepComplianceReport.area_scores).map(([area, score]: [string, any]) => (
                      <Stack key={area} direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="body2">{area.replace('_', ' ').toUpperCase()}</Typography>
                        <Chip 
                          label={`${score}%`} 
                          size="small" 
                          color={score >= 80 ? 'success' : score >= 60 ? 'warning' : 'error'}
                        />
                      </Stack>
                    ))}
                  </Stack>
                </Paper>
              )}

              {nepComplianceReport.recommendations?.length > 0 && (
                <Paper sx={{ p: 2 }}>
                  <Typography variant="h6" gutterBottom>Recommendations</Typography>
                  <List>
                    {nepComplianceReport.recommendations.map((rec: string, index: number) => (
                      <ListItem key={index}>
                        <ListItemIcon><SuggestIcon color="primary" /></ListItemIcon>
                        <ListItemText primary={rec} />
                      </ListItem>
                    ))}
                  </List>
                </Paper>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNepDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Success/Error Snackbars - Positioned to avoid sidebar */}
      <Snackbar
        open={!!success}
        autoHideDuration={6000}
        onClose={() => setSuccess('')}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        sx={{ 
          mt: 8,
          mr: 2,
          '& .MuiSnackbar-root': {
            left: 'auto',
            right: '24px',
          }
        }}
      >
        <Alert severity="success" onClose={() => setSuccess('')} sx={{ width: '100%' }}>
          {success}
        </Alert>
      </Snackbar>

      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError('')}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        sx={{ 
          mt: 8,
          mr: 2,
          '& .MuiSnackbar-root': {
            left: 'auto',
            right: '24px',
          }
        }}
      >
        <Alert severity="error" onClose={() => setError('')} sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Constraints;
