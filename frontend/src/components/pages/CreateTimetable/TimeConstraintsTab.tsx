import React from 'react';
import {
  Box,
  Typography,
  TextField,
  Grid,
  Divider,
  FormControlLabel,
  Switch,
  Slider,
  Alert,
} from '@mui/material';
import {
  Schedule as TimeIcon,
} from '@mui/icons-material';
import { useTimetableContext } from '../../../contexts/TimetableContext';

const TimeConstraintsTab: React.FC = () => {
  const { formData, updateFormData } = useTimetableContext();

  const dayLabels = {
    monday: 'Monday',
    tuesday: 'Tuesday', 
    wednesday: 'Wednesday',
    thursday: 'Thursday',
    friday: 'Friday',
    saturday: 'Saturday',
    sunday: 'Sunday'
  };

  // Handle time slots changes
  const handleTimeSlotChange = (field: keyof typeof formData.time_slots, value: string | number | boolean) => {
    updateFormData('time_slots', {
      ...formData.time_slots,
      [field]: value
    });
  };

  // Handle working days changes
  const handleWorkingDayChange = (day: keyof typeof formData.working_days, value: boolean) => {
    updateFormData('working_days', {
      ...formData.working_days,
      [day]: value
    });
  };

  // Handle constraints changes
  const handleConstraintChange = (field: keyof typeof formData.constraints, value: number | boolean) => {
    updateFormData('constraints', {
      ...formData.constraints,
      [field]: value
    });
  };

  const workingDaysCount = Object.values(formData.working_days).filter(Boolean).length;
  const dailyHours = (
    (parseInt(formData.time_slots.end_time.split(':')[0]) * 60 + parseInt(formData.time_slots.end_time.split(':')[1])) -
    (parseInt(formData.time_slots.start_time.split(':')[0]) * 60 + parseInt(formData.time_slots.start_time.split(':')[1])) -
    (formData.time_slots.lunch_break ? 60 : 0)
  ) / 60;
  const periodsPerDay = Math.floor(dailyHours * 60 / (formData.time_slots.slot_duration + formData.time_slots.break_duration));

  return (
    <Box>
      <div style={{ padding: '24px' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <TimeIcon sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="h6" sx={{ fontSize: '1.125rem', fontWeight: 600 }}>
              Time Constraints & Preferences
            </Typography>
          </Box>

          {/* Time Slots Configuration */}
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, fontSize: '1rem' }}>
            Daily Time Schedule
          </Typography>
          
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={6} md={3}>
              <TextField
                fullWidth
                label="Start Time"
                type="time"
                value={formData.time_slots.start_time}
                onChange={(e) => handleTimeSlotChange('start_time', e.target.value)}
                InputLabelProps={{ shrink: true }}
                size="small"
                sx={{ '& .MuiOutlinedInput-root': { fontSize: '0.875rem' } }}
              />
            </Grid>
            
            <Grid item xs={6} md={3}>
              <TextField
                fullWidth
                label="End Time"
                type="time"
                value={formData.time_slots.end_time}
                onChange={(e) => handleTimeSlotChange('end_time', e.target.value)}
                InputLabelProps={{ shrink: true }}
                size="small"
                sx={{ '& .MuiOutlinedInput-root': { fontSize: '0.875rem' } }}
              />
            </Grid>
            
            <Grid item xs={6} md={3}>
              <TextField
                fullWidth
                label="Period Duration (min)"
                type="number"
                value={formData.time_slots.slot_duration}
                onChange={(e) => handleTimeSlotChange('slot_duration', Number(e.target.value))}
                inputProps={{ min: 30, max: 90, step: 5 }}
                size="small"
                sx={{ '& .MuiOutlinedInput-root': { fontSize: '0.875rem' } }}
              />
            </Grid>
            
            <Grid item xs={6} md={3}>
              <TextField
                fullWidth
                label="Break Duration (min)"
                type="number"
                value={formData.time_slots.break_duration}
                onChange={(e) => handleTimeSlotChange('break_duration', Number(e.target.value))}
                inputProps={{ min: 5, max: 30, step: 5 }}
                size="small"
                sx={{ '& .MuiOutlinedInput-root': { fontSize: '0.875rem' } }}
              />
            </Grid>

            {/* Lunch Break Configuration */}
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.time_slots.lunch_break}
                    onChange={(e) => handleTimeSlotChange('lunch_break', e.target.checked)}
                  />
                }
                label={<Typography sx={{ fontSize: '0.875rem', fontWeight: 500 }}>Include Lunch Break</Typography>}
              />
            </Grid>

            {formData.time_slots.lunch_break && (
              <>
                <Grid item xs={6} md={3}>
                  <TextField
                    fullWidth
                    label="Lunch Start"
                    type="time"
                    value={formData.time_slots.lunch_start}
                    onChange={(e) => handleTimeSlotChange('lunch_start', e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    size="small"
                    sx={{ '& .MuiOutlinedInput-root': { fontSize: '0.875rem' } }}
                  />
                </Grid>
                
                <Grid item xs={6} md={3}>
                  <TextField
                    fullWidth
                    label="Lunch End"
                    type="time"
                    value={formData.time_slots.lunch_end}
                    onChange={(e) => handleTimeSlotChange('lunch_end', e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    size="small"
                    sx={{ '& .MuiOutlinedInput-root': { fontSize: '0.875rem' } }}
                  />
                </Grid>
              </>
            )}
          </Grid>

          <Divider sx={{ my: 3 }} />

          {/* Working Days Configuration */}
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, fontSize: '1rem' }}>
            Working Days Configuration
          </Typography>
          
          <Box sx={{ mb: 4 }}>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2 }}>
              {Object.entries(formData.working_days).map(([day, enabled]) => (
                <FormControlLabel
                  key={day}
                  control={
                    <Switch
                      size="small"
                      checked={enabled}
                      onChange={(e) => handleWorkingDayChange(day as keyof typeof formData.working_days, e.target.checked)}
                    />
                  }
                  label={
                    <Typography sx={{ fontSize: '0.875rem' }}>
                      {dayLabels[day as keyof typeof dayLabels]}
                    </Typography>
                  }
                />
              ))}
            </Box>
            
            <div style={{ padding: '16px', backgroundColor: '#f5f5f5' }}>
              <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                <strong>Active Working Days:</strong> {workingDaysCount} days per week
              </Typography>
            </div>
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* Scheduling Constraints */}
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, fontSize: '1rem' }}>
            Scheduling Constraints & Limits
          </Typography>
          
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} md={6}>
              <Box sx={{ px: 1 }}>
                <Typography variant="body2" sx={{ fontSize: '0.875rem', mb: 1 }}>
                  Maximum Periods Per Day: {formData.constraints.max_periods_per_day}
                </Typography>
                <Slider
                  value={formData.constraints.max_periods_per_day}
                  onChange={(_, value) => handleConstraintChange('max_periods_per_day', value as number)}
                  min={4}
                  max={10}
                  step={1}
                  marks
                  size="small"
                />
              </Box>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Box sx={{ px: 1 }}>
                <Typography variant="body2" sx={{ fontSize: '0.875rem', mb: 1 }}>
                  Maximum Consecutive Hours: {formData.constraints.max_consecutive_hours}
                </Typography>
                <Slider
                  value={formData.constraints.max_consecutive_hours}
                  onChange={(_, value) => handleConstraintChange('max_consecutive_hours', value as number)}
                  min={1}
                  max={4}
                  step={1}
                  marks
                  size="small"
                />
              </Box>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Box sx={{ px: 1 }}>
                <Typography variant="body2" sx={{ fontSize: '0.875rem', mb: 1 }}>
                  Minimum Break Between Same Subject: {formData.constraints.min_break_between_subjects} period(s)
                </Typography>
                <Slider
                  value={formData.constraints.min_break_between_subjects}
                  onChange={(_, value) => handleConstraintChange('min_break_between_subjects', value as number)}
                  min={0}
                  max={3}
                  step={1}
                  marks
                  size="small"
                />
              </Box>
            </Grid>
          </Grid>

          <Divider sx={{ my: 3 }} />

          {/* Scheduling Preferences */}
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, fontSize: '1rem' }}>
            Scheduling Preferences
          </Typography>
          
          <Box sx={{ mb: 4 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.constraints.avoid_first_last_slot}
                      onChange={(e) => handleConstraintChange('avoid_first_last_slot', e.target.checked)}
                    />
                  }
                  label={
                    <Box>
                      <Typography sx={{ fontSize: '0.875rem', fontWeight: 500 }}>
                        Avoid First & Last Slots
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                        Minimize scheduling in extreme time slots
                      </Typography>
                    </Box>
                  }
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.constraints.balance_workload}
                      onChange={(e) => handleConstraintChange('balance_workload', e.target.checked)}
                    />
                  }
                  label={
                    <Box>
                      <Typography sx={{ fontSize: '0.875rem', fontWeight: 500 }}>
                        Balance Daily Workload
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                        Distribute classes evenly across days
                      </Typography>
                    </Box>
                  }
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.constraints.prefer_morning_slots}
                      onChange={(e) => handleConstraintChange('prefer_morning_slots', e.target.checked)}
                    />
                  }
                  label={
                    <Box>
                      <Typography sx={{ fontSize: '0.875rem', fontWeight: 500 }}>
                        Prefer Morning Slots
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                        Prioritize morning time slots when possible
                      </Typography>
                    </Box>
                  }
                />
              </Grid>
            </Grid>
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* Summary Card */}
          <div style={{ padding: '24px', backgroundColor: '#e3f2fd', border: '1px solid #90caf9' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, fontSize: '1rem', color: 'primary.main' }}>
              Schedule Summary
            </Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" sx={{ color: 'primary.main', fontWeight: 700 }}>
                    {workingDaysCount}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                    Working Days/Week
                  </Typography>
                </Box>
              </Grid>
              
              <Grid item xs={12} md={4}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" sx={{ color: 'primary.main', fontWeight: 700 }}>
                    {periodsPerDay}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                    Periods/Day (Estimated)
                  </Typography>
                </Box>
              </Grid>
              
              <Grid item xs={12} md={4}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" sx={{ color: 'primary.main', fontWeight: 700 }}>
                    {Math.round(dailyHours * 10) / 10}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                    Teaching Hours/Day
                  </Typography>
                </Box>
              </Grid>
            </Grid>

            {dailyHours < 4 && (
              <Alert severity="warning" sx={{ mt: 2, fontSize: '0.875rem' }}>
                <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                  Warning: Daily teaching hours seem low ({dailyHours} hours). Consider adjusting time slots or break durations.
                </Typography>
              </Alert>
            )}
          </div>
      </div>
    </Box>
  );
};

export default TimeConstraintsTab;
