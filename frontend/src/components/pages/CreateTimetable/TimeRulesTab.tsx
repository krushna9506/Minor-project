import React, { useEffect, useState } from 'react';
import {
  Box,
  Paper,
  Avatar,
  Stack,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Snackbar,
  Alert,
  CircularProgress,
  alpha,
  useTheme,
  Slider,
  Input,
  Container,
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, Rule as RuleIcon } from '@mui/icons-material';
import timetableService from '../../../services/timetableService';
import type { Rule } from '../../../services/timetableService';

const TimeRulesTab: React.FC = () => {
  const theme = useTheme();
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [newRuleName, setNewRuleName] = useState('');
  const [newRuleDesc, setNewRuleDesc] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  // Time & rules specific states
  const [lunchTime, setLunchTime] = useState('12:30'); // HH:MM 24h
  const [collegeStartTime, setCollegeStartTime] = useState('08:00');
  const [collegeEndTime, setCollegeEndTime] = useState('18:00');
  const [intervalBetweenClasses, setIntervalBetweenClasses] = useState<number>(10);
  const [maxContinuousHours, setMaxContinuousHours] = useState<number>(3);
  const [maxClassesPerDay, setMaxClassesPerDay] = useState<number>(6);
  const [maxLabClassesPerDay, setMaxLabClassesPerDay] = useState<number>(2);
  const [maxRepeatPerDay, setMaxRepeatPerDay] = useState<number>(1);

  const load = async () => {
    setLoading(true);
    try {
      const res = await timetableService.getRules();
      setRules(res || []);
    } catch (err: any) {
      setError('Failed to load rules: ' + (err.message || 'Unknown'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // (save handled inline in the Save Settings button)

  const handleEdit = (r: Rule) => {
    setEditingId(r.id);
    setNewRuleName(r.name);
    setNewRuleDesc(r.description || '');
  const params = (r.params || {}) as any;
  if (params.lunch_time) setLunchTime(params.lunch_time);
  if (params.college_start_time) setCollegeStartTime(params.college_start_time);
  if (params.college_end_time) setCollegeEndTime(params.college_end_time);
  if (params.interval_between_classes !== undefined) setIntervalBetweenClasses(params.interval_between_classes);
  if (params.max_continuous_hours !== undefined) setMaxContinuousHours(params.max_continuous_hours);
  if (params.max_classes_per_day !== undefined) setMaxClassesPerDay(params.max_classes_per_day);
  if (params.max_lab_classes_per_day !== undefined) setMaxLabClassesPerDay(params.max_lab_classes_per_day);
  if (params.max_repeat_per_day !== undefined) setMaxRepeatPerDay(params.max_repeat_per_day);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete rule?')) return;
    setLoading(true);
    try {
      await timetableService.deleteRule(id);
      setRules(prev => prev.filter(r => r.id !== id));
      setSuccess('Deleted');
    } catch (err: any) { setError('Delete failed: ' + (err.message || 'Unknown')); }
    finally { setLoading(false); }
  };

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
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
          <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
            <Avatar sx={{ bgcolor: 'white', color: 'primary.main', width: 48, height: 48 }}>
              <RuleIcon />
            </Avatar>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 700, fontSize: '2rem' }}>Time & Rules</Typography>
              <Typography variant="body1" sx={{ opacity: 0.9, fontSize: '1.1rem' }}>Define scheduling rules and time constraints for the timetable generator</Typography>
            </Box>
          </Stack>

          <Box sx={{ display: 'flex', gap: 4, mt: 3, flexWrap: 'wrap' }}>
            <Box sx={{ textAlign: 'center', minWidth: 120 }}>
              <Typography variant="h3" sx={{ fontWeight: 700, fontSize: '2.5rem' }}>{rules.length}</Typography>
              <Typography variant="body2" sx={{ opacity: 0.8 }}>Defined Rules</Typography>
            </Box>
            <Box sx={{ textAlign: 'center', minWidth: 120 }}>
              <Typography variant="h3" sx={{ fontWeight: 700, fontSize: '2.5rem' }}>{rules.filter(r => r.is_active).length}</Typography>
              <Typography variant="body2" sx={{ opacity: 0.8 }}>Active Rules</Typography>
            </Box>
            <Box sx={{ textAlign: 'center', minWidth: 120 }}>
              <Typography variant="h3" sx={{ fontWeight: 700, fontSize: '2.5rem' }}>{rules.reduce((acc, r) => acc + (r.params && Object.keys(r.params).length ? 1 : 0), 0)}</Typography>
              <Typography variant="body2" sx={{ opacity: 0.8 }}>Rules with Params</Typography>
            </Box>
          </Box>
        </Box>

        <Box sx={{ position: 'absolute', top: -50, right: -50, width: 200, height: 200, borderRadius: '50%', background: alpha('#ffffff', 0.1), zIndex: 0 }} />
        <Box sx={{ position: 'absolute', bottom: -30, left: -30, width: 150, height: 150, borderRadius: '50%', background: alpha('#ffffff', 0.05), zIndex: 0 }} />
      </Paper>

      <Card elevation={3} sx={{ mb: 4, borderRadius: 3 }}>
        <Box sx={{ background: `linear-gradient(90deg, ${alpha(theme.palette.success.main,0.1)}, ${alpha(theme.palette.info.main,0.1)})`, p:2, borderBottom: `1px solid ${theme.palette.divider}` }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Avatar sx={{ bgcolor: 'success.main' }}><AddIcon /></Avatar>
            <Box>
              <Typography variant="h6" sx={{ fontWeight:600 }}>{editingId ? 'Edit Rule' : 'Add New Rule'}</Typography>
              <Typography variant="body2" color="text.secondary">Small, reusable constraints to guide the timetable generator</Typography>
            </Box>
          </Stack>
        </Box>
        <CardContent>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            <Box sx={{ width: { xs: '100%', md: '48%' } }}>
              <TextField label="Settings Name" value={newRuleName} onChange={(e)=>setNewRuleName(e.target.value)} fullWidth />
            </Box>

            <Box sx={{ width: { xs: '100%', md: '48%' } }}>
              <TextField label="Description" value={newRuleDesc} onChange={(e)=>setNewRuleDesc(e.target.value)} fullWidth />
            </Box>

            <Box sx={{ width: { xs: '100%', md: '32%' } }}>
              <Typography variant="caption">Lunch time (HH:MM)</Typography>
              <Input type="time" value={lunchTime} onChange={(e:any)=>setLunchTime(e.target.value)} fullWidth />
            </Box>

            <Box sx={{ width: { xs: '100%', md: '32%' } }}>
              <Typography variant="caption">College start time</Typography>
              <Input type="time" value={collegeStartTime} onChange={(e:any)=>setCollegeStartTime(e.target.value)} fullWidth />
            </Box>

            <Box sx={{ width: { xs: '100%', md: '32%' } }}>
              <Typography variant="caption">College end time</Typography>
              <Input type="time" value={collegeEndTime} onChange={(e:any)=>setCollegeEndTime(e.target.value)} fullWidth />
            </Box>

            <Box sx={{ width: { xs: '100%', md: '32%' } }}>
              <Typography variant="caption">Interval between classes (minutes)</Typography>
              <Slider value={intervalBetweenClasses} onChange={(_e, v)=>setIntervalBetweenClasses(v as number)} min={0} max={60} valueLabelDisplay="auto" />
            </Box>

            <Box sx={{ width: { xs: '100%', md: '32%' } }}>
              <Typography variant="caption">Max continuous hours</Typography>
              <Slider value={maxContinuousHours} onChange={(_e,v)=>setMaxContinuousHours(v as number)} min={1} max={8} valueLabelDisplay="auto" />
            </Box>

            <Box sx={{ width: { xs: '100%', md: '32%' } }}>
              <Typography variant="caption">Max classes in a day</Typography>
              <Slider value={maxClassesPerDay} onChange={(_e,v)=>setMaxClassesPerDay(v as number)} min={1} max={12} valueLabelDisplay="auto" />
            </Box>

            <Box sx={{ width: { xs: '100%', md: '32%' } }}>
              <Typography variant="caption">Max lab classes in a day</Typography>
              <Slider value={maxLabClassesPerDay} onChange={(_e,v)=>setMaxLabClassesPerDay(v as number)} min={0} max={6} valueLabelDisplay="auto" />
            </Box>

            <Box sx={{ width: { xs: '100%', md: '32%' } }}>
              <Typography variant="caption">Max number of class repeats in a day</Typography>
              <Slider value={maxRepeatPerDay} onChange={(_e,v)=>setMaxRepeatPerDay(v as number)} min={0} max={5} valueLabelDisplay="auto" />
            </Box>

            <Box sx={{ width: '100%' }}>
              <Box sx={{ display:'flex', gap:2 }}>
                <Button
                  variant="contained"
                  onClick={async ()=>{
                    // Build params and save as a rule of type time_settings
                    const params = {
                      lunch_time: lunchTime,
                      college_start_time: collegeStartTime,
                      college_end_time: collegeEndTime,
                      interval_between_classes: intervalBetweenClasses,
                      max_continuous_hours: maxContinuousHours,
                      max_classes_per_day: maxClassesPerDay,
                      max_lab_classes_per_day: maxLabClassesPerDay,
                      max_repeat_per_day: maxRepeatPerDay,
                    };
                    setLoading(true);
                    try {
                      if (editingId) {
                        const updated = await timetableService.updateRule(editingId, { name: newRuleName, description: newRuleDesc, rule_type: 'time_settings', params, is_active: true });
                        setRules(prev=> prev.map(r=> r.id===editingId? updated: r));
                        setSuccess('Settings updated');
                      } else {
                        const created = await timetableService.createRule({ name: newRuleName || 'Time & Rules', description: newRuleDesc, rule_type: 'time_settings', params, is_active: true });
                        setRules(prev=> [...prev, created]);
                        setSuccess('Settings saved');
                      }
                      // reset
                      setNewRuleName(''); setNewRuleDesc(''); setEditingId(null);
                    } catch (err:any) { setError('Save failed: '+(err.message||'Unknown')); }
                    finally { setLoading(false); }
                  }}
                  startIcon={loading? <CircularProgress size={16} color="inherit"/>: <AddIcon/>}
                  disabled={loading}
                >
                  {editingId? 'Update Settings' : 'Save Settings'}
                </Button>

                <Button variant="outlined" onClick={()=>{
                  // reset form
                  setNewRuleName(''); setNewRuleDesc(''); setLunchTime('12:30'); setIntervalBetweenClasses(10); setMaxContinuousHours(3); setMaxClassesPerDay(6); setMaxLabClassesPerDay(2); setMaxRepeatPerDay(1); setEditingId(null);
                }}>
                  Cancel
                </Button>
              </Box>
            </Box>
          </Box>
        </CardContent>
      </Card>

      <Card elevation={3} sx={{ borderRadius:3, overflow:'hidden' }}>
        <Box sx={{ background: `linear-gradient(90deg, ${alpha(theme.palette.info.main,0.1)}, ${alpha(theme.palette.primary.main,0.1)})`, p:2, borderBottom:`1px solid ${theme.palette.divider}` }}>
          <Typography variant="h6" sx={{ fontWeight:600 }}>Defined Rules ({rules.length})</Typography>
        </Box>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.05) }}>
                <TableCell sx={{ fontWeight:600 }}>Name</TableCell>
                <TableCell sx={{ fontWeight:600 }}>Type</TableCell>
                <TableCell sx={{ fontWeight:600 }}>Description</TableCell>
                <TableCell sx={{ fontWeight:600, textAlign:'center' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rules.map(r=> (
                <TableRow key={r.id} sx={{ '&:hover':{ bgcolor: alpha(theme.palette.primary.main,0.03) } }}>
                  <TableCell>{r.name}</TableCell>
                  <TableCell>{r.rule_type}</TableCell>
                  <TableCell>{r.description}</TableCell>
                  <TableCell sx={{ textAlign:'center' }}>
                    <Stack direction="row" spacing={1} justifyContent="center">
                      <IconButton size="small" onClick={()=>handleEdit(r)} disabled={loading}><EditIcon /></IconButton>
                      <IconButton size="small" onClick={()=>handleDelete(r.id)} color="error" disabled={loading}><DeleteIcon /></IconButton>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      <Snackbar open={!!error} autoHideDuration={6000} onClose={()=>setError(null)}>
        <Alert severity="error" onClose={()=>setError(null)}>{error}</Alert>
      </Snackbar>
      <Snackbar open={!!success} autoHideDuration={4000} onClose={()=>setSuccess(null)}>
        <Alert severity="success" onClose={()=>setSuccess(null)}>{success}</Alert>
      </Snackbar>
  </Container>
  );
};

export default TimeRulesTab;
