import React, { useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Container,
  Paper,
  Avatar,
  Stack,
  Card,
  CardContent,
} from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import {
  CalendarMonth as CalendarIcon,
  School as SchoolIcon,
  AccountBalance as DepartmentIcon,
} from '@mui/icons-material';
import { useTimetableContext } from '../../../contexts/TimetableContext';

const AcademicStructureTab: React.FC = () => {
  const theme = useTheme();
  const {
    formData,
    updateFormData,
    programs,
    loadPrograms,
  } = useTimetableContext();

  useEffect(() => {
    console.log('🎯 AcademicStructureTab - Loading programs...');
    loadPrograms();
  }, [loadPrograms]);

  useEffect(() => {
    console.log('🎯 AcademicStructureTab - Programs loaded:', programs);
    console.log('🎯 AcademicStructureTab - Current formData.program_id:', formData.program_id);
    console.log('🎯 AcademicStructureTab - Current formData.department:', formData.department);
  }, [programs, formData.program_id, formData.department]);

  const handleProgramChange = (value: string) => {
    const selectedProgram = programs.find((program) => program.id === value || (program as any)._id === value);
    updateFormData('program_id', value);

    if (selectedProgram && selectedProgram.department) {
      updateFormData('department', selectedProgram.department);
    }
  };

  const handleSemesterChange = (value: number) => {
    updateFormData('semester', value);
  };

  const handleAcademicYearChange = (value: string) => {
    updateFormData('academic_year', value);
  };

  const handleDepartmentChange = (value: string) => {
    updateFormData('department', value);
  };

  const handleWorkingDayChange = (day: keyof typeof formData.working_days, value: boolean) => {
    updateFormData('working_days', {
      ...formData.working_days,
      [day]: value,
    });
  };

  const enabledDaysCount = Object.values(formData.working_days).filter(Boolean).length;

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
              <SchoolIcon />
            </Avatar>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 700, fontSize: '2rem' }}>
                Academic Structure
              </Typography>
              <Typography variant="body1" sx={{ opacity: 0.9, fontSize: '1.1rem' }}>
                Configure program, semester, and academic year settings
              </Typography>
            </Box>
          </Stack>
          
          {/* Stats Cards */}
          <Box sx={{ display: 'flex', gap: 4, mt: 3, flexWrap: 'wrap' }}>
            <Box sx={{ textAlign: 'center', minWidth: 120 }}>
              <Typography variant="h3" sx={{ fontWeight: 700, fontSize: '2.5rem' }}>
                {programs.length}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.8 }}>
                Available Programs
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'center', minWidth: 120 }}>
              <Typography variant="h3" sx={{ fontWeight: 700, fontSize: '2.5rem' }}>
                {formData.semester || '-'}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.8 }}>
                Current Semester
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'center', minWidth: 120 }}>
              <Typography variant="h3" sx={{ fontWeight: 700, fontSize: '2.5rem' }}>
                {enabledDaysCount}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.8 }}>
                Working Days
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

      {/* Basic Information Section - Full Width like other tabs */}
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
              <CalendarIcon />
            </Avatar>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Basic Information
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Set up your timetable title and academic year
              </Typography>
            </Box>
          </Stack>
        </Box>
        
        <CardContent sx={{ p: 4 }}>
          {/* Form Layout - Row-based like other tabs */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Row 1: Timetable Title - Full Width */}
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Box sx={{ flex: 1, minWidth: 400 }}>
                <TextField
                  fullWidth
                  label="Timetable Title"
                  value={formData.title}
                  onChange={(e) => updateFormData('title', e.target.value)}
                  placeholder="e.g., Computer Science Semester 1 Timetable"
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

            {/* Row 2: Academic Year and Semester */}
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Box sx={{ flex: 1, minWidth: 200 }}>
                <TextField
                  fullWidth
                  label="Academic Year"
                  value={formData.academic_year}
                  onChange={(e) => handleAcademicYearChange(e.target.value)}
                  placeholder="e.g., 2024-25"
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
                  <InputLabel>Semester</InputLabel>
                  <Select
                    value={formData.semester}
                    label="Semester"
                    onChange={(e) => handleSemesterChange(Number(e.target.value))}
                    sx={{ 
                      borderRadius: 2,
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'primary.main'
                      }
                    }}
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
                      <MenuItem key={sem} value={sem}>Semester {sem}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Program Information Section - Full Width */}
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
              <DepartmentIcon />
            </Avatar>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Program Information
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Select your program and department details
              </Typography>
            </Box>
          </Stack>
        </Box>
        
        <CardContent sx={{ p: 4 }}>
          {/* Form Layout - Row-based */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Row 1: Program and Department */}
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Box sx={{ flex: 1, minWidth: 300 }}>
                <FormControl fullWidth>
                  <InputLabel>Program</InputLabel>
                  <Select
                    value={formData.program_id}
                    label="Program"
                    onChange={(e) => {
                      const selectedValue = e.target.value;
                      console.log('🎯 Program Select onChange - selected value:', selectedValue);
                      console.log('🎯 Current formData.program_id:', formData.program_id);
                      
                      handleProgramChange(selectedValue);
                      
                      console.log('🎯 After handleProgramChange called');
                    }}
                    sx={{ 
                      borderRadius: 2,
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'primary.main'
                      }
                    }}
                  >
                    {programs.map((program) => {
                      const programId = program.id || (program as any)._id;
                      console.log('🎯 Rendering program:', { 
                        name: program.name, 
                        id: program.id, 
                        _id: (program as any)._id, 
                        resolvedId: programId 
                      });
                      
                      return (
                        <MenuItem key={programId} value={programId}>
                          {program.name} ({program.code})
                        </MenuItem>
                      );
                    })}
                  </Select>
                </FormControl>
              </Box>
              <Box sx={{ flex: 1, minWidth: 300 }}>
                <TextField
                  fullWidth
                  label="Department/College"
                  value={formData.department}
                  onChange={(e) => handleDepartmentChange(e.target.value)}
                  placeholder="e.g., College of Vocational Studies"
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

            {/* Row 2: Working Days Configuration */}
            <Box sx={{ mt: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                Working Days Configuration
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Click to toggle working days for this academic program
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {Object.entries(formData.working_days).map(([day, enabled]) => (
                  <Chip
                    key={day}
                    label={day.charAt(0).toUpperCase() + day.slice(1)}
                    color={enabled ? "primary" : "default"}
                    onClick={() => handleWorkingDayChange(day as keyof typeof formData.working_days, !enabled)}
                    sx={{ 
                      cursor: 'pointer',
                      fontWeight: enabled ? 600 : 400,
                      borderRadius: 2,
                      '&:hover': {
                        backgroundColor: enabled ? 'primary.dark' : alpha(theme.palette.primary.main, 0.1)
                      }
                    }}
                  />
                ))}
              </Box>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
};

export default AcademicStructureTab;
