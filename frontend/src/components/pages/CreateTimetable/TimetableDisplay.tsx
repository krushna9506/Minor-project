import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Stack,
  Card,
  CardContent,
} from '@mui/material';
import {
  PictureAsPdf as PdfIcon,
  TableChart as CsvIcon,
} from '@mui/icons-material';

interface TimetableEntry {
  day: string;
  time: string;
  course_name: string;
  course_code: string;
  group: string;
  room: string;
  faculty: string;
  is_lab: boolean;
  duration: number;
}

interface TimetableDisplayProps {
  timetableData: any;
  onExport: (format: 'csv' | 'pdf') => void;
}

const TimetableDisplay: React.FC<TimetableDisplayProps> = ({ timetableData, onExport }) => {
  const timetable = timetableData?.timetable ?? timetableData ?? {};
  const metadata = timetable?.metadata ?? {};

  const parseSchoolTimeToMinutes = React.useCallback((timeStr: string): number => {
    if (!timeStr || !timeStr.includes(':')) return Number.MAX_SAFE_INTEGER;

    const [rawHours, rawMinutes] = timeStr.trim().split(':');
    let hours = Number(rawHours);
    const minutes = Number(rawMinutes);

    if (Number.isNaN(hours) || Number.isNaN(minutes)) {
      return Number.MAX_SAFE_INTEGER;
    }

    if (hours > 0 && hours < 7) {
      hours += 12;
    }

    return hours * 60 + minutes;
  }, []);

  const scheduleDetails = React.useMemo(() => {
    const directSchedule = metadata?.schedule_details ?? timetable?.schedule_details;
    if (Array.isArray(directSchedule) && directSchedule.length > 0) {
      return directSchedule;
    }

    if (!Array.isArray(timetable?.entries) || timetable.entries.length === 0) {
      return [];
    }

    return timetable.entries.map((entry: any) => ({
      day: entry?.time_slot?.day,
      start_time: entry?.time_slot?.start_time,
      end_time: entry?.time_slot?.end_time,
      course_name: entry?.course_name || entry?.course_code || 'Course',
      course_code: entry?.course_code || entry?.course_name || 'Course',
      group: entry?.group_name || entry?.group || 'All',
      room: entry?.room_name || entry?.room || 'TBD',
      faculty: entry?.faculty_name || entry?.faculty || 'TBD',
      is_lab: entry?.is_lab || entry?.entry_type === 'lab' || false,
      duration: entry?.time_slot?.duration_minutes || entry?.duration || 50,
      time_slot_formatted: entry?.time_slot
        ? `${entry.time_slot.start_time} - ${entry.time_slot.end_time}`
        : undefined,
    }));
  }, [metadata?.schedule_details, timetable]);

  // Dynamically extract working days
  const baseDays = metadata?.working_days;
  const days = (() => {
    if (Array.isArray(baseDays) && baseDays.length > 0) {
      return baseDays;
    }

    if (Array.isArray(scheduleDetails) && scheduleDetails.length > 0) {
      const orderedDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      const normalizedDays = new Set(
        scheduleDetails
          .map((entry: any) => entry?.day)
          .filter(Boolean)
          .map((day: string) => {
            const normalized = day.toLowerCase();
            const mapping: Record<string, string> = {
              mon: 'Monday',
              tue: 'Tuesday',
              wed: 'Wednesday',
              thu: 'Thursday',
              fri: 'Friday',
              sat: 'Saturday',
              sun: 'Sunday',
              monday: 'Monday',
              tuesday: 'Tuesday',
              wednesday: 'Wednesday',
              thursday: 'Thursday',
              friday: 'Friday',
              saturday: 'Saturday',
              sunday: 'Sunday',
            };
            return mapping[normalized];
          })
          .filter(Boolean)
      );

      const derivedDays = orderedDays.filter(day => normalizedDays.has(day));
      if (derivedDays.length > 0) {
        return derivedDays;
      }
    }

    return ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  })();

  // Dynamically extract time slots
  const timeSlots = (() => {
    const metaSlots = metadata?.time_slots;
    if (metaSlots && Array.isArray(metaSlots) && metaSlots.length > 0) {
      const slots: string[] = [];
      const uniqueSlots = new Set<string>();

      const sorted = [...metaSlots].sort(
        (a, b) => parseSchoolTimeToMinutes(a.start_time) - parseSchoolTimeToMinutes(b.start_time)
      );
      
      sorted.forEach(s => {
        // Standardize output formats, mark breaks explicitly
        const isBreak = s.slot_type === 'break' || s.slot_type === 'lunch';
        const formatted = `${s.start_time} - ${s.end_time}${isBreak ? ' (Break)' : ''}`;
        const plain = `${s.start_time} - ${s.end_time}`;
        
        // Exclude lab slots from generating base rows to avoid grid duplication since labs span multiple standard lecture slots
        if (s.slot_type !== 'lab' && !uniqueSlots.has(plain)) {
          slots.push(formatted);
          uniqueSlots.add(plain);
        }
      });
      
      // If no valid theory classes or breaks were found, fallback
      if (slots.length > 0) return slots; 
    }

    if (Array.isArray(scheduleDetails) && scheduleDetails.length > 0) {
      const uniqueSlots = new Set<string>();
      const derivedSlots = scheduleDetails
        .map((entry: any) => ({
          slot: `${entry.start_time} - ${entry.end_time}`,
          isBreak: Boolean(entry.is_break),
          start: parseSchoolTimeToMinutes(entry.start_time),
        }))
        .filter((entry: any) => entry.slot && !uniqueSlots.has(entry.slot) && uniqueSlots.add(entry.slot))
        .sort((a: any, b: any) => a.start - b.start)
        .map((entry: any) => `${entry.slot}${entry.isBreak ? ' (Break)' : ''}`);

      if (derivedSlots.length > 0) {
        return derivedSlots;
      }
    }

    // Default Fallback
    return [
      '10:00 - 10:50',
      '10:50 - 11:40',
      '11:40 - 12:30',
      '12:30 - 1:00 (Break)',
      '1:00 - 1:50',
      '1:50 - 2:40',
      '2:40 - 3:30',
      '3:30 - 4:20',
      '4:20 - 5:10',
      '5:10 - 6:00'
    ];
  })();

  const isBreakSlot = (slotStr: string) => {
    return slotStr.toLowerCase().includes('break');
  };

  // Normalize times to a consistent school-day display format.
  const normalizeTime = (timeStr: string): string => {
    if (!timeStr) return '';
    try {
      const cleanTime = timeStr.trim().replace(/\s/g, '');
      if (cleanTime.includes(':')) {
        const totalMinutes = parseSchoolTimeToMinutes(cleanTime);
        if (totalMinutes === Number.MAX_SAFE_INTEGER) return cleanTime;

        const hours24 = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        const hours12 = hours24 > 12 ? hours24 - 12 : hours24;

        return `${hours12}:${String(minutes).padStart(2, '0')}`;
      }
      return cleanTime;
    } catch (e) {
      console.warn('Error normalizing time:', timeStr, e);
      return timeStr;
    }
  };

  // Helper to normalize full slot string "10:00 - 10:50" -> "10:00-10:50"
  const normalizeSlot = (slotStr: string): string => {
    if (!slotStr) return '';
    const parts = slotStr.split('-');
    if (parts.length !== 2) return slotStr.replace(/\s/g, '');

    return `${normalizeTime(parts[0])}-${normalizeTime(parts[1])}`;
  };

  // Process the timetable data into a grid format
  const processScheduleData = () => {
    const grid: { [key: string]: { [key: string]: TimetableEntry | null } } = {};

    // Initialize empty grid
    days.forEach(day => {
      grid[day] = {};
      timeSlots.forEach(slot => {
        grid[day][slot] = null;
      });
    });

    // Helper map for day normalization
    const dayMap: { [key: string]: string } = {
      'mon': 'Monday', 'tue': 'Tuesday', 'wed': 'Wednesday', 'thu': 'Thursday', 'fri': 'Friday',
      'monday': 'Monday', 'tuesday': 'Tuesday', 'wednesday': 'Wednesday', 'thursday': 'Thursday', 'friday': 'Friday'
    };

    // Fill the grid with actual data
    if (Array.isArray(scheduleDetails) && scheduleDetails.length > 0) {
      console.log('📊 Processing schedule details for grid...');

      scheduleDetails.forEach((entry: any) => {
        // Normalize day
        const rawDay = (entry.day || '').toLowerCase();
        const entryDay = dayMap[rawDay];

        if (!entryDay || !grid[entryDay]) {
          console.warn(`⚠️ Could not map day: ${entry.day}`);
          return;
        }

        // Construct the time slot string from entry data
        const entryStart = entry.start_time;
        const entryEnd = entry.end_time;
        const entrySlotNormal = `${normalizeTime(entryStart)}-${normalizeTime(entryEnd)}`;

        // Try to find a matching slot in our defined timeSlots
        // We compare normalized versions
        let matchedSlot = timeSlots.find(slot => {
          const slotNormal = normalizeSlot(slot);
          return slotNormal === entrySlotNormal;
        });

        // 2nd pass: Loose matching for labs or overlapping slots
        // If entry is 13:20-16:30 (Lab), we want to show it in 1:00, 1:50, etc.
        if (!matchedSlot) {
          // Find just the start time match
          matchedSlot = timeSlots.find(slot => {
            const slotStart = slot.split('-')[0].trim();
            return normalizeTime(slotStart) === normalizeTime(entryStart);
          });
        }

        // 3rd pass: Check if entry starts within a slot (overlap)
        if (!matchedSlot) {
          matchedSlot = timeSlots.find(slot => {
            try {
              const [slotStartRaw, slotEndRaw] = slot.split('-').map(t => t.trim().replace('(Break)', '').trim());
              const slotStartMin = parseSchoolTimeToMinutes(slotStartRaw);
              const slotEndMin = parseSchoolTimeToMinutes(slotEndRaw);
              const entryStartMin = parseSchoolTimeToMinutes(entryStart);

              return entryStartMin >= slotStartMin && entryStartMin < slotEndMin;
            } catch (e) { return false; }
          });
        }

        if (matchedSlot && grid[entryDay]) {
          const cellData = {
            day: entryDay,
            time: matchedSlot,
            course_name: entry.course_name,
            course_code: entry.course_code || entry.course_name,
            group: entry.group,
            room: entry.room,
            faculty: entry.faculty || 'TBD',
            is_lab: entry.is_lab || false,
            duration: entry.duration || 50
          };

          // Only overwrite if empty or if we want to show the latest
          if (!grid[entryDay][matchedSlot]) {
            grid[entryDay][matchedSlot] = cellData;
          }

          // CRITICAL FIX: Fill subsequent slots for Labs/Long sessions
          // Logic: If duration > 55, find next slots and fill them too
          if (entry.duration > 55) {
            let slotsToFill = Math.ceil(entry.duration / 50) - 1;
            let currentSlotIdx = timeSlots.indexOf(matchedSlot);

            while (slotsToFill > 0 && currentSlotIdx + 1 < timeSlots.length) {
              currentSlotIdx++;
              const nextSlot = timeSlots[currentSlotIdx];

              // If next slot is a Break, skip it 
              if (isBreakSlot(nextSlot)) {
                continue;
              }

              if (grid[entryDay][nextSlot] === null) {
                grid[entryDay][nextSlot] = { ...cellData, time: nextSlot };
              }
              slotsToFill--;
            }
          }

        } else {
          console.log(`❌ Could not match slot: ${entryStart}-${entryEnd} on ${entryDay}`);
        }
      });
    }

    return grid;
  };

  const scheduleGrid = processScheduleData();

  // Extract course information for the summary table
  const extractCourseInfo = () => {
    const courses: { [key: string]: any } = {};

    if (Array.isArray(scheduleDetails) && scheduleDetails.length > 0) {
      scheduleDetails.forEach((entry: any) => {
        const courseCode = entry.course_code || entry.course_name;
        if (!courses[courseCode]) {
          courses[courseCode] = {
            name: entry.course_name,
            code: courseCode,
            periods: 0,
            faculty: entry.faculty || 'TBD',
            type: entry.is_lab ? 'Lab' : 'Theory'
          };
        }
        courses[courseCode].periods += 1;
      });
    }

    return Object.values(courses);
  };

  const courseInfo = extractCourseInfo();

  // Get cell content with proper styling
  const getCellContent = (entry: TimetableEntry | null, isBreak: boolean = false) => {
    if (isBreak) {
      return (
        <Box sx={{
          textAlign: 'center',
          py: 1,
          backgroundColor: 'action.hover',
          color: 'text.secondary',
          fontWeight: 'bold',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          BREAK
        </Box>
      );
    }

    if (!entry) {
      return <Box sx={{ height: 40 }}></Box>;
    }

    const isLab = entry.is_lab;
    const backgroundColor = isLab ? '#fff3cd' : '#e3f2fd'; // Different color for theory
    const borderColor = isLab ? '#ffc107' : '#90caf9';
    const textColor = isLab ? '#664d03' : '#0d47a1';

    return (
      <Box sx={{
        p: 0.5,
        backgroundColor,
        border: `1px solid ${borderColor}`,
        borderRadius: 1,
        minHeight: 40,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center'
      }}>
        <Typography variant="body2" sx={{ fontWeight: 'bold', fontSize: '0.7rem', color: textColor, lineHeight: 1.1 }}>
          {entry.course_name}
        </Typography>
        <Typography variant="caption" sx={{ color: textColor, fontSize: '0.65rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {entry.room || 'TBD'}
        </Typography>
        {entry.faculty && entry.faculty !== 'TBD' && (
          <Typography variant="caption" sx={{ color: textColor, fontSize: '0.6rem', fontStyle: 'italic' }}>
            {entry.faculty.split(' ')[0]} {/* Show first name only to save space */}
          </Typography>
        )}
      </Box>
    );
  };

  const handleExport = (format: 'csv' | 'pdf') => {
    onExport(format);
  };

  return (
    <Box sx={{ width: '100%', mb: 4 }}>
      {/* Header */}
      <Card sx={{ mb: 3, backgroundColor: 'background.paper' }}>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'text.primary', mb: 1 }}>
                {timetable?.title || 'Class Routine'}
              </Typography>
              <Typography variant="subtitle1" sx={{ color: 'text.secondary' }}>
                Academic Year: {timetable?.academic_year || '2025-2026'} | Semester: {timetable?.semester || 'N/A'}
              </Typography>
            </Box>

            <Stack direction="row" spacing={2}>
              <Button
                variant="contained"
                startIcon={<CsvIcon />}
                onClick={() => handleExport('csv')}
                sx={{ backgroundColor: '#4CAF50' }}
              >
                Export CSV
              </Button>
              <Button
                variant="contained"
                startIcon={<PdfIcon />}
                onClick={() => handleExport('pdf')}
                sx={{ backgroundColor: '#f44336' }}
              >
                Export PDF
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {/* Main Timetable */}
      <TableContainer component={Paper} sx={{ mb: 3, backgroundColor: 'background.paper', boxShadow: 3 }}>
        <Table size="small" sx={{ minWidth: 1000 }}>
          <TableHead>
            <TableRow sx={{ backgroundColor: 'primary.main' }}>
              <TableCell sx={{ color: 'primary.contrastText', fontWeight: 'bold', width: 100, border: '1px solid rgba(0,0,0,0.1)' }}>
                Time
              </TableCell>
              {days.map((day) => (
                <TableCell
                  key={day}
                  sx={{
                    color: 'primary.contrastText',
                    fontWeight: 'bold',
                    textAlign: 'center',
                    border: '1px solid rgba(0,0,0,0.1)',
                    minWidth: 150
                  }}
                >
                  {day}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {timeSlots.map((slot) => (
              <TableRow key={slot} sx={{ '&:nth-of-type(odd)': { backgroundColor: 'action.hover' } }}>
                <TableCell sx={{
                  color: 'text.primary',
                  fontWeight: 'bold',
                  border: '1px solid rgba(0,0,0,0.1)',
                  backgroundColor: 'background.default',
                  fontSize: '0.75rem'
                }}>
                  {slot}
                </TableCell>
                {days.map((day) => (
                  <TableCell
                    key={`${day}-${slot}`}
                    sx={{
                      border: '1px solid rgba(0,0,0,0.1)',
                      p: 0.5,
                      verticalAlign: 'middle',
                      height: 50
                    }}
                  >
                    {isBreakSlot(slot) ?
                      getCellContent(null, true) :
                      getCellContent(scheduleGrid[day][slot])
                    }
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Course Information Table */}
      <Card sx={{ backgroundColor: 'background.paper', boxShadow: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ color: 'text.primary', mb: 2, fontWeight: 'bold' }}>
            Course Information
          </Typography>

          <TableContainer component={Paper} sx={{ backgroundColor: 'background.default', boxShadow: 1 }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ backgroundColor: 'primary.light' }}>
                  <TableCell sx={{ color: 'primary.contrastText', fontWeight: 'bold', border: '1px solid rgba(0,0,0,0.05)' }}>
                    Paper Name
                  </TableCell>
                  <TableCell sx={{ color: 'primary.contrastText', fontWeight: 'bold', border: '1px solid rgba(0,0,0,0.05)' }}>
                    Paper Code
                  </TableCell>
                  <TableCell sx={{ color: 'primary.contrastText', fontWeight: 'bold', border: '1px solid rgba(0,0,0,0.05)' }}>
                    Total Sessions
                  </TableCell>
                  <TableCell sx={{ color: 'primary.contrastText', fontWeight: 'bold', border: '1px solid rgba(0,0,0,0.05)' }}>
                    Faculty Name
                  </TableCell>
                  <TableCell sx={{ color: 'primary.contrastText', fontWeight: 'bold', border: '1px solid rgba(0,0,0,0.05)' }}>
                    Type
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {courseInfo.length > 0 ? (
                  courseInfo.map((course: any, index: number) => (
                    <TableRow key={index}>
                      <TableCell sx={{ color: 'text.primary', border: '1px solid rgba(0,0,0,0.05)' }}>
                        {course.name}
                      </TableCell>
                      <TableCell sx={{ color: 'text.primary', border: '1px solid rgba(0,0,0,0.05)' }}>
                        {course.code}
                      </TableCell>
                      <TableCell sx={{ color: 'text.primary', border: '1px solid rgba(0,0,0,0.05)' }}>
                        {course.periods}
                      </TableCell>
                      <TableCell sx={{ color: 'text.primary', border: '1px solid rgba(0,0,0,0.05)' }}>
                        {course.faculty}
                      </TableCell>
                      <TableCell sx={{ color: 'text.primary', border: '1px solid rgba(0,0,0,0.05)' }}>
                        <Box sx={{
                          display: 'inline-block',
                          px: 1,
                          py: 0.2,
                          borderRadius: 4,
                          fontSize: '0.75rem',
                          backgroundColor: course.type === 'Lab' ? 'rgba(255, 193, 7, 0.2)' : 'rgba(33, 150, 243, 0.2)',
                          color: course.type === 'Lab' ? '#ffc107' : '#2196f3',
                          border: `1px solid ${course.type === 'Lab' ? '#ffc107' : '#2196f3'}`
                        }}>
                          {course.type}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} sx={{ color: 'text.secondary', textAlign: 'center', py: 3, border: '1px solid rgba(0,0,0,0.05)' }}>
                      No course information available
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Generation Statistics */}
      {timetableData?.generation_details && (
        <Card sx={{ mt: 3, backgroundColor: 'background.paper', boxShadow: 3 }}>
          <CardContent>
            <Typography variant="h6" sx={{ color: 'text.primary', mb: 2, fontWeight: 'bold' }}>
              Generation Statistics
            </Typography>

            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
              <Box sx={{ flex: '1 1 200px' }}>
                <Box sx={{ textAlign: 'center', p: 2, backgroundColor: 'background.default', borderRadius: 1, border: '1px solid rgba(0,0,0,0.05)' }}>
                  <Typography variant="h4" sx={{ color: '#4CAF50', fontWeight: 'bold' }}>
                    {timetableData.generation_details.score || 100}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    Optimization Score
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ flex: '1 1 200px' }}>
                <Box sx={{ textAlign: 'center', p: 2, backgroundColor: 'background.default', borderRadius: 1, border: '1px solid rgba(0,0,0,0.05)' }}>
                  <Typography variant="h4" sx={{ color: '#2196F3', fontWeight: 'bold' }}>
                    {timetableData.generation_details.statistics?.total_sessions || 0}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    Total Sessions
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ flex: '1 1 200px' }}>
                <Box sx={{ textAlign: 'center', p: 2, backgroundColor: 'background.default', borderRadius: 1, border: '1px solid rgba(0,0,0,0.05)' }}>
                  <Typography variant="h4" sx={{ color: '#FF9800', fontWeight: 'bold' }}>
                    {timetableData.generation_details.statistics?.lab_sessions || 0}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    Lab Sessions
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ flex: '1 1 200px' }}>
                <Box sx={{ textAlign: 'center', p: 2, backgroundColor: 'background.default', borderRadius: 1, border: '1px solid rgba(0,0,0,0.05)' }}>
                  <Typography variant="h4" sx={{ color: '#9C27B0', fontWeight: 'bold' }}>
                    {timetableData.generation_details.statistics?.theory_sessions || 0}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    Theory Sessions
                  </Typography>
                </Box>
              </Box>
            </Box>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default TimetableDisplay;
