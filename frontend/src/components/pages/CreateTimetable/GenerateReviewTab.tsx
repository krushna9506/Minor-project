import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Snackbar,
  Fab,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  Schedule as ScheduleIcon,
  School as SchoolIcon,
  People as PeopleIcon,
  Room as RoomIcon,
  Assessment as AssessmentIcon,
} from '@mui/icons-material';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  LineChart,
  Line,
  ResponsiveContainer,
} from 'recharts';
import { useTimetableContext } from '../../../contexts/TimetableContext';
import { timetableService } from '../../../services/timetableService';
import TimetableDisplay from './TimetableDisplay';

const GenerateReviewTab: React.FC = () => {
  const {
    formData,
    availableCourses,
    availableFaculty,
    availableRooms,
    currentTimetable,
    setCurrentTimetable,
    loadCourses,
    loadFaculty,
    loadRooms
  } = useTimetableContext();

  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [generationResult, setGenerationResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const activeTimetable = generationResult?.timetable ?? generationResult ?? currentTimetable;
  const activeEntries = activeTimetable?.entries ?? [];
  const activeScheduleDetails = React.useMemo(() => {
    const scheduleDetails = activeTimetable?.metadata?.schedule_details ?? activeTimetable?.schedule_details;
    if (Array.isArray(scheduleDetails) && scheduleDetails.length > 0) {
      return scheduleDetails;
    }

    if (!Array.isArray(activeEntries) || activeEntries.length === 0) {
      return [];
    }

    return activeEntries.map((entry: any) => ({
      day: entry?.time_slot?.day,
      start_time: entry?.time_slot?.start_time,
      end_time: entry?.time_slot?.end_time,
      course_name: entry?.course_name || entry?.course_code || 'Course',
      course_code: entry?.course_code || entry?.course_name || 'Course',
      faculty: entry?.faculty_name || entry?.faculty || 'TBD',
      room: entry?.room_name || entry?.room || 'TBD',
      is_lab: entry?.is_lab || entry?.entry_type === 'lab' || false,
      duration: entry?.time_slot?.duration_minutes || entry?.duration || 50,
    }));
  }, [activeEntries, activeTimetable]);
  const hasRenderableTimetable =
    (Array.isArray(activeScheduleDetails) && activeScheduleDetails.length > 0) ||
    (Array.isArray(activeEntries) && activeEntries.length > 0);

  // If a pre-existing timetable is loaded via context (edit/view mode), display it
  React.useEffect(() => {
    const currentScheduleDetails = currentTimetable?.metadata?.schedule_details ?? [];
    const currentEntries = currentTimetable?.entries ?? [];
    const hasCurrentTimetableData =
      (Array.isArray(currentScheduleDetails) && currentScheduleDetails.length > 0) ||
      (Array.isArray(currentEntries) && currentEntries.length > 0);

    if (!generationResult && currentTimetable && hasCurrentTimetableData) {
      setGenerationResult({ timetable: currentTimetable });
    }
  }, [currentTimetable, generationResult]);
  
  const [availableRules, setAvailableRules] = useState<any[]>([]);
  const [selectedRuleId, setSelectedRuleId] = useState<string>('');

  // Load data when component mounts
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);

        // Load courses for the current program and semester
        if (formData.program_id && formData.semester) {
          await loadCourses(formData.program_id, formData.semester);
        }

        // Load faculty, rooms, and available rules
        await Promise.all([
          loadFaculty(),
          loadRooms()
        ]);
        
        const fetchedRules = await timetableService.getRules();
        setAvailableRules(fetchedRules || []);
        if (fetchedRules && fetchedRules.length > 0) {
          setSelectedRuleId(fetchedRules[0].id);
        }

      } catch (err) {
        console.error('Error loading data:', err);
        setError('Failed to load data for timetable generation');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [formData.program_id, formData.semester, loadCourses, loadFaculty, loadRooms]);

  // Process real data for charts
  const processCoursesData = () => {
    // If we have generated timetable data, use it
    if (Array.isArray(activeScheduleDetails) && activeScheduleDetails.length > 0) {
      const scheduleDetails = activeScheduleDetails;

      // Count unique courses by type
      const courseTypes: Record<string, Set<string>> = {
        theory: new Set(),
        lab: new Set(),
        elective: new Set(),
        minor: new Set()
      };

      scheduleDetails.forEach((entry: any) => {
        const courseCode = entry.course_code;
        if (entry.is_lab) {
          courseTypes.lab.add(courseCode);
        } else {
          courseTypes.theory.add(courseCode);
        }
      });

      return [
        { name: 'Theory', value: courseTypes.theory.size || 1, color: '#2196f3' },
        { name: 'Lab', value: courseTypes.lab.size || 1, color: '#4caf50' },
        { name: 'Elective', value: courseTypes.elective.size || 1, color: '#ff9800' },
        { name: 'Minor', value: courseTypes.minor.size || 1, color: '#e91e63' },
      ];
    }

    // Fallback to availableCourses if no timetable generated yet
    const theoryCount = availableCourses.filter(course =>
      course.type?.toLowerCase() === 'theory' ||
      course.type?.toLowerCase() === 'core' ||
      !course.type?.toLowerCase().includes('lab')
    ).length;

    const labCount = availableCourses.filter(course =>
      course.type?.toLowerCase().includes('lab')
    ).length;

    const electiveCount = availableCourses.filter(course =>
      course.type?.toLowerCase() === 'elective'
    ).length;

    const minorCount = availableCourses.filter(course =>
      course.type?.toLowerCase() === 'minor'
    ).length;

    return [
      { name: 'Theory', value: theoryCount || 1, color: '#2196f3' },
      { name: 'Lab', value: labCount || 2, color: '#4caf50' },
      { name: 'Elective', value: electiveCount || 1, color: '#ff9800' },
      { name: 'Minor', value: minorCount || 1, color: '#e91e63' },
    ];
  };

  // Process course to credit distribution for radar chart
  const processCourseCreditsData = () => {
    // Define a proper type for the credit distribution object
    interface CreditData {
      count: number;
      codes: string[];
    }

    const creditDistribution: Record<string, CreditData> = {};

    availableCourses.forEach(course => {
      const credits = course.credits || 0;
      const courseCode = course.code || 'Unknown';
      const key = `${credits}`;

      if (!creditDistribution[key]) {
        creditDistribution[key] = {
          count: 0,
          codes: []
        };
      }

      creditDistribution[key].count += 1;
      creditDistribution[key].codes.push(courseCode);
    });

    // Ensure we have data for the radar chart and include course codes
    const result = Object.entries(creditDistribution).map(([credit, data]: [string, CreditData]) => ({
      credit: `${credit} Credits`,
      count: data.count,
      codes: data.codes.join(', ')
    }));

    // Add sample data if no courses are available
    if (result.length === 0) {
      return [
        { credit: '3 Credits', count: 4, codes: 'CS101, CS102, CS103, CS104' },
        { credit: '4 Credits', count: 2, codes: 'CS201, CS202' },
        { credit: '2 Credits', count: 3, codes: 'CS301, CS302, CS303' }
      ];
    }

    return result;
  };

  // This function is moved below to avoid duplication
  // The implementation at line ~226 is used instead

  // Process faculty weekly workload data for line chart
  const processFacultyData = () => {
    interface FacultyWorkloadData {
      name: string;
      weeklyHours: number;
      fullName: string;
    }

    // If we have generated timetable data, use it
    if (Array.isArray(activeScheduleDetails) && activeScheduleDetails.length > 0) {
      const scheduleDetails = activeScheduleDetails;

      // Count hours per faculty
      const facultyHours: Record<string, number> = {};
      scheduleDetails.forEach((entry: any) => {
        const faculty = entry.faculty || 'TBD';
        if (faculty !== 'TBD') {
          const hours = (entry.duration || 50) / 60;
          facultyHours[faculty] = (facultyHours[faculty] || 0) + hours;
        }
      });

      return Object.entries(facultyHours).map(([name, hours]) => ({
        name: name.substring(0, 10), // Shorten name for display
        weeklyHours: Math.round(hours * 10) / 10,
        fullName: name
      }));
    }

    // Fallback to dummy data
    const facultyWorkload: FacultyWorkloadData[] = availableFaculty.slice(0, 10).map(faculty => {
      const courseCount = Math.max(1, availableCourses.filter(course =>
        faculty.subjects?.includes(course.id || '')
      ).length);

      let weeklyHours = Math.min(
        courseCount * 3,
        faculty.max_hours_per_week || 15
      );

      // Ensure non-zero weekly hours with a random fallback if needed
      if (weeklyHours <= 0) {
        weeklyHours = Math.floor(Math.random() * 10) + 5; // Random value between 5-14
      }

      return {
        name: faculty.name?.split(' ')[0] || 'Unknown', // First name only for better display
        weeklyHours, // Using shorthand property
        fullName: faculty.name || 'Unknown Faculty' // Add full name for tooltip
      };
    });

    // If no faculty data, create sample data
    if (facultyWorkload.length === 0) {
      return [
        { name: 'Dr. Smith', weeklyHours: 12, fullName: 'Dr. John Smith' },
        { name: 'Prof. Jones', weeklyHours: 15, fullName: 'Professor Sarah Jones' },
        { name: 'Dr. Lee', weeklyHours: 9, fullName: 'Dr. David Lee' },
        { name: 'Prof. Garcia', weeklyHours: 18, fullName: 'Professor Maria Garcia' },
        { name: 'Dr. Patel', weeklyHours: 14, fullName: 'Dr. Raj Patel' }
      ];
    }

    return facultyWorkload;
  };

  // Process daily college hours data for bar chart
  const processDailyHoursData = () => {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

    // Helper map for day normalization
    const dayMap: { [key: string]: string } = {
      'mon': 'Monday', 'tue': 'Tuesday', 'wed': 'Wednesday', 'thu': 'Thursday', 'fri': 'Friday',
      'monday': 'Monday', 'tuesday': 'Tuesday', 'wednesday': 'Wednesday', 'thursday': 'Thursday', 'friday': 'Friday'
    };

    // If we have generated timetable data, use it
    if (Array.isArray(activeScheduleDetails) && activeScheduleDetails.length > 0) {
      const dailyHours: Record<string, number> = {};
      days.forEach(day => dailyHours[day] = 0);

      // Count actual hours from schedule_details
      activeScheduleDetails.forEach((entry: any) => {
        const rawDay = (entry.day || '').toLowerCase();
        const normalizedDay = dayMap[rawDay];

        if (normalizedDay && dailyHours.hasOwnProperty(normalizedDay)) {
          // Add duration in hours (convert from minutes)
          const hours = (entry.duration || 50) / 60;
          dailyHours[normalizedDay] += hours;
        }
      });

      return days.map(day => ({
        day,
        hours: Math.round(dailyHours[day] * 10) / 10 // Round to 1 decimal
      }));
    }

    // Fallback to dummy data if no timetable generated yet
    const dailyHours: Record<string, number> = {};
    days.forEach(day => {
      const coursesPerDay = Math.ceil(availableCourses.length / 5);
      const hoursPerDay = coursesPerDay * 1.5;
      let variation = (Math.random() * 2 - 1);
      dailyHours[day] = Math.max(1, Math.round(hoursPerDay + variation));
    });

    return days.map(day => ({
      day,
      hours: dailyHours[day] || 1
    }));
  };

  const handleGenerateTimetable = async () => {
    if (!formData.program_id || !formData.semester || !formData.academic_year) {
      setError('Please complete all required fields before generating timetable');
      return;
    }

    if (!formData.courses || formData.courses.length === 0) {
      setError('Please add at least one course before generating the timetable');
      return;
    }

    if (!formData.rooms || formData.rooms.length === 0) {
      setError('Please add at least one room before generating the timetable');
      return;
    }

    setGenerating(true);
    setError(null);

    try {
      console.log('🚀 Starting timetable generation with data:', {
        program_id: formData.program_id,
        semester: formData.semester,
        academic_year: formData.academic_year,
      });

      const result = await timetableService.generateAdvancedTimetable({
        program_id: formData.program_id,
        semester: formData.semester,
        academic_year: formData.academic_year,
        title: formData.title || `AI Generated Timetable - ${formData.academic_year}`,
        rule_id: selectedRuleId || undefined,
        courses: formData.courses,
        faculty: formData.faculty,
        student_groups: formData.student_groups,
        rooms: formData.rooms,
      });

      console.log('✅ Generation successful:', result);
      setGenerationResult(result);
      setCurrentTimetable(result?.timetable ?? result);
      setSuccess('Timetable generated successfully!');

    } catch (err: any) {
      console.error('❌ Generation failed:', err);
      let errorMessage = 'Failed to generate timetable';

      if (err.response?.data?.detail) {
        if (Array.isArray(err.response.data.detail)) {
          // Handle validation error array
          errorMessage = err.response.data.detail.map((e: any) => e.msg || e).join(', ');
        } else {
          errorMessage = err.response.data.detail;
        }
      } else if (err.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);
    } finally {
      setGenerating(false);
    }
  };

  const handleExport = async (format: 'csv' | 'pdf') => {
    if (!activeTimetable) {
      setError('No timetable data to export');
      return;
    }

    try {
      const timetableId =
        generationResult?.timetable?.id ||
        generationResult?.id ||
        generationResult?._id ||
        activeTimetable?.id ||
        activeTimetable?._id;
      if (!timetableId) {
        setError('Generated timetable ID not found');
        return;
      }

      // Map csv to excel for the backend service
      const exportFormat = format === 'csv' ? 'excel' : format;
      await timetableService.exportTimetable(timetableId, exportFormat);
      setSuccess(`Timetable exported as ${format.toUpperCase()} successfully!`);
    } catch (err: any) {
      setError(`Failed to export timetable: ${err.message}`);
    }
  };

  // Get processed data
  const coursesData = processCoursesData();
  const facultyData = processFacultyData();
  const dailyHoursData = processDailyHoursData();
  const courseCreditsData = processCourseCreditsData();

  const pieData = coursesData.map((entry) => ({
    ...entry,
    fill: entry.color
  }));

  if (loading) {
    return (
      <Box sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '50vh',
        backgroundColor: '#0a0a0a'
      }}>
        <CircularProgress size={60} sx={{ color: '#2196f3' }} />
        <Typography variant="h6" sx={{ color: 'white', ml: 2 }}>
          Loading data...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, minHeight: '100vh', backgroundColor: '#0a0a0a' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h4" sx={{ color: 'white', fontWeight: 'bold' }}>
          Generate AI Timetable
        </Typography>
        <FormControl variant="outlined" sx={{ minWidth: 250 }}>
          <InputLabel sx={{ color: '#b0b0b0' }}>Timetable Rule</InputLabel>
          <Select
            value={selectedRuleId || ''}
            onChange={(e) => setSelectedRuleId(e.target.value)}
            label="Timetable Rule"
            sx={{
              color: 'white',
              '.MuiOutlinedInput-notchedOutline': { borderColor: '#444' },
              '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#888' },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#2196f3' },
            }}
          >
            {availableRules.length === 0 && <MenuItem value=""><em>No Rules Available</em></MenuItem>}
            {availableRules.map(rule => (
              <MenuItem key={rule.id} value={rule.id}>{rule.name}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {/* Summary Cards */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 4 }}>
        <Box sx={{ flex: '1 1 200px', minWidth: 200 }}>
          <Card sx={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <SchoolIcon sx={{ fontSize: 40, color: '#2196f3', mb: 1 }} />
              <Typography variant="h6" sx={{ color: 'white', fontWeight: 'bold' }}>
                {availableCourses.length}
              </Typography>
              <Typography variant="body2" sx={{ color: '#b0b0b0' }}>
                Courses
              </Typography>
            </CardContent>
          </Card>
        </Box>

        <Box sx={{ flex: '1 1 200px', minWidth: 200 }}>
          <Card sx={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <PeopleIcon sx={{ fontSize: 40, color: '#4caf50', mb: 1 }} />
              <Typography variant="h6" sx={{ color: 'white', fontWeight: 'bold' }}>
                {availableFaculty.length}
              </Typography>
              <Typography variant="body2" sx={{ color: '#b0b0b0' }}>
                Faculty
              </Typography>
            </CardContent>
          </Card>
        </Box>

        <Box sx={{ flex: '1 1 200px', minWidth: 200 }}>
          <Card sx={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <AssessmentIcon sx={{ fontSize: 40, color: '#ff9800', mb: 1 }} />
              <Typography variant="h6" sx={{ color: 'white', fontWeight: 'bold' }}>
                {formData.student_groups.length}
              </Typography>
              <Typography variant="body2" sx={{ color: '#b0b0b0' }}>
                Student Groups
              </Typography>
            </CardContent>
          </Card>
        </Box>

        <Box sx={{ flex: '1 1 200px', minWidth: 200 }}>
          <Card sx={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <RoomIcon sx={{ fontSize: 40, color: '#f44336', mb: 1 }} />
              <Typography variant="h6" sx={{ color: 'white', fontWeight: 'bold' }}>
                {availableRooms.length}
              </Typography>
              <Typography variant="body2" sx={{ color: '#b0b0b0' }}>
                Rooms
              </Typography>
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* Charts Section */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 4 }}>
        {/* Course Distribution Pie Chart */}
        <Box sx={{ flex: '1 1 400px', minWidth: 400 }}>
          <Card sx={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}>
            <CardContent>
              <Typography variant="h6" sx={{ color: 'white', mb: 2 }}>
                Course Distribution
              </Typography>
              {coursesData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${percent ? (percent * 100).toFixed(0) : 0}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieData.map((_entry, index) => (
                        <Cell key={`cell-${index}`} fill={pieData[index].fill} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
                  <Typography variant="body2" sx={{ color: '#b0b0b0' }}>
                    No course data available
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Box>

        {/* Daily College Hours Bar Chart */}
        <Box sx={{ flex: '1 1 400px', minWidth: 400 }}>
          <Card sx={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}>
            <CardContent>
              <Typography variant="h6" sx={{ color: 'white', mb: 2 }}>
                Daily College Hours
              </Typography>
              {dailyHoursData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={dailyHoursData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                    <XAxis dataKey="day" stroke="#b0b0b0" />
                    <YAxis stroke="#b0b0b0" />
                    <Tooltip contentStyle={{ backgroundColor: '#2a2a2a', border: '1px solid #444' }} />
                    <Bar dataKey="hours" fill="#4caf50" name="Hours" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
                  <Typography variant="body2" sx={{ color: '#b0b0b0' }}>
                    No daily hours data available
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Box>

        {/* Course-to-Credit Distribution Radar Chart */}
        <Box sx={{ flex: '1 1 400px', minWidth: 400 }}>
          <Card sx={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}>
            <CardContent>
              <Typography variant="h6" sx={{ color: 'white', mb: 2 }}>
                Course-to-Credit Distribution
              </Typography>
              {courseCreditsData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={courseCreditsData}>
                    <PolarGrid stroke="#444" />
                    <PolarAngleAxis
                      dataKey="credit"
                      stroke="#b0b0b0"
                    />
                    <PolarRadiusAxis stroke="#b0b0b0" />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#2a2a2a', border: '1px solid #444' }}
                      formatter={(value, name) => {
                        const item = courseCreditsData.find(d => d.count === value);
                        return [
                          `${value} courses\nCodes: ${item?.codes || 'N/A'}`,
                          name
                        ];
                      }}
                    />
                    <Radar
                      name="Courses"
                      dataKey="count"
                      stroke="#ff9800"
                      fill="#ff9800"
                      fillOpacity={0.6}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              ) : (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
                  <Typography variant="body2" sx={{ color: '#b0b0b0' }}>
                    No course credit data available
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Box>

        {/* Faculty Weekly Workload Line Chart */}
        <Box sx={{ flex: '1 1 400px', minWidth: 400 }}>
          <Card sx={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}>
            <CardContent>
              <Typography variant="h6" sx={{ color: 'white', mb: 2 }}>
                Faculty Weekly Workload
              </Typography>
              {facultyData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={facultyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                    <XAxis dataKey="name" stroke="#b0b0b0" />
                    <YAxis stroke="#b0b0b0" />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#2a2a2a', border: '1px solid #444' }}
                      formatter={(value) => {
                        const item = facultyData.find(d => d.weeklyHours === value);
                        return [
                          `${value} hours\nFaculty: ${item?.fullName || 'Unknown'}`,
                          'Weekly Hours'
                        ];
                      }}
                    />
                    <Line type="monotone" dataKey="weeklyHours" name="Weekly Hours" stroke="#f44336" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
                  <Typography variant="body2" sx={{ color: '#b0b0b0' }}>
                    No faculty workload data available
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* Timetable Display */}
      {hasRenderableTimetable && (
        <TimetableDisplay
          timetableData={generationResult || activeTimetable}
          onExport={handleExport}
        />
      )}

      {!hasRenderableTimetable && !loading && (
        <Card sx={{ backgroundColor: '#1a1a1a', border: '1px solid #333', mt: 2 }}>
          <CardContent>
            <Typography variant="h6" sx={{ color: 'white', mb: 1 }}>
              No Generated Timetable Yet
            </Typography>
            <Typography variant="body2" sx={{ color: '#b0b0b0' }}>
              Use the blue generate button to create the timetable. Once generation finishes, it will appear in the grid below automatically.
            </Typography>
          </CardContent>
        </Card>
      )}

      {/* Floating Action Button */}
      <Fab
        color="primary"
        aria-label="generate"
        onClick={handleGenerateTimetable}
        disabled={generating || loading}
        sx={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          backgroundColor: '#2196f3',
          '&:hover': {
            backgroundColor: '#1976d2',
          },
        }}
      >
        {generating ? (
          <CircularProgress size={24} color="inherit" />
        ) : (
          <ScheduleIcon />
        )}
      </Fab>

      {/* Error Snackbar */}
      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert onClose={() => setError(null)} severity="error" sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>

      {/* Success Snackbar */}
      <Snackbar
        open={!!success}
        autoHideDuration={4000}
        onClose={() => setSuccess(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert onClose={() => setSuccess(null)} severity="success" sx={{ width: '100%' }}>
          {success}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default GenerateReviewTab;
