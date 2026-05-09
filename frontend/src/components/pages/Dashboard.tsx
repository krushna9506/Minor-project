import React from 'react';
import {
  Card,
  CardHeader,
  CardContent,
  Typography,
  Box,
  List,
  Chip,
  LinearProgress,
  Button,
  useTheme,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import {
  Schedule,
  School,
  Psychology,
  TrendingUp,
  ArrowForward,
} from '@mui/icons-material';
import StatsCard from '../dashboard/StatsCard';

const Dashboard: React.FC = () => {
  const theme = useTheme();

  // Mock data
  const stats = [
    {
      title: 'TIMETABLES',
      value: 12,
      icon: <Schedule fontSize="large" />,
      color: theme.palette.warning.main,
      trend: { value: '3.48%', label: 'Since last month', type: 'up' as const },
    },
    {
      title: 'PROGRAMS',
      value: 8,
      icon: <School fontSize="large" />,
      color: theme.palette.error.main,
      trend: { value: '3.48%', label: 'Since last month', type: 'down' as const },
    },
    {
      title: 'AI OPTIMIZATIONS',
      value: 24,
      icon: <Psychology fontSize="large" />,
      color: theme.palette.success.main,
      trend: { value: '12%', label: 'Since last week', type: 'up' as const },
    },
    {
      title: 'PERFORMANCE',
      value: '87%',
      icon: <TrendingUp fontSize="large" />,
      color: theme.palette.info.main,
      trend: { value: '5%', label: 'Improvement', type: 'up' as const },
    },
  ];

  const upcomingTasks = [
    { text: 'Review Mathematics Timetable', priority: 'High', color: 'error' },
    { text: 'Check Physics Lab Constraints', priority: 'Medium', color: 'warning' },
    { text: 'Approve New Syllabus', priority: 'Low', color: 'success' },
    { text: 'Generate Exam Schedule', priority: 'High', color: 'error' },
  ];

  return (
    <Box>
      {/* Stats Section - Placed on the blue background */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 5 }}>
        {stats.map((stat, index) => (
          <Box key={index} sx={{ flex: '1 1 250px' }}>
            <StatsCard
              title={stat.title}
              value={stat.value}
              icon={stat.icon}
              iconColor={stat.color}
              trend={stat.trend}
            />
          </Box>
        ))}
      </Box>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
        {/* Main Activity Card */}
        <Box sx={{ flex: '2 1 600px', minWidth: '300px' }}>
          <Card sx={{ height: '100%', boxShadow: theme.shadows[2], border: 'none' }}>
            <CardHeader
              title={
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography variant="h6" fontWeight="bold">Recent Activity</Typography>
                  <Button size="small" variant="contained" color="primary" disableElevation>
                    See all
                  </Button>
                </Box>
              }
              subheader=" Overview of system events"
              sx={{ borderBottom: '1px solid rgba(0,0,0,0.05)', pb: 2 }}
            />
            <TableContainer>
              <Table size="medium">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold', color: 'text.secondary', fontSize: '0.75rem', textTransform: 'uppercase', borderBottom: '1px solid rgba(140, 140, 140, 0.2)' }}>Activity</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', color: 'text.secondary', fontSize: '0.75rem', textTransform: 'uppercase', borderBottom: '1px solid rgba(140, 140, 140, 0.2)' }}>Date</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', color: 'text.secondary', fontSize: '0.75rem', textTransform: 'uppercase', borderBottom: '1px solid rgba(140, 140, 140, 0.2)' }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', color: 'text.secondary', fontSize: '0.75rem', textTransform: 'uppercase', borderBottom: '1px solid rgba(140, 140, 140, 0.2)' }} align="right">Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {[
                    { activity: 'Timetable Generated (CS-A)', date: 'Oct 24, 2023', status: 'Completed', color: 'success' },
                    { activity: 'Constraint Violation Detected', date: 'Oct 23, 2023', status: 'Pending', color: 'warning' },
                    { activity: 'New Faculty Added', date: 'Oct 21, 2023', status: 'Approved', color: 'info' },
                    { activity: 'System Update', date: 'Oct 19, 2023', status: 'Completed', color: 'success' },
                    { activity: 'Optimization Run', date: 'Oct 18, 2023', status: 'Failed', color: 'error' },
                  ].map((row, index) => (
                    <TableRow key={index} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                      <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>{row.activity}</TableCell>
                      <TableCell sx={{ color: 'text.secondary' }}>{row.date}</TableCell>
                      <TableCell>
                        <Box display="flex" alignItems="center">
                          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: `${row.color}.main`, mr: 1, boxShadow: `0 0 8px ${theme.palette[row.color as 'success' | 'warning' | 'info' | 'error'].main}` }} />
                          <Typography variant="body2" fontWeight={500}>{row.status}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="right">
                        <Button endIcon={<ArrowForward />} size="small" sx={{ color: 'primary.main', fontWeight: 600 }}>
                          Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        </Box>

        {/* Side Widgets */}
        <Box sx={{ flex: '1 1 300px' }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Progress / Tasks */}
            <Card sx={{ boxShadow: theme.shadows[2], border: 'none' }}>
              <CardHeader
                title={<Typography variant="h6" fontWeight="bold">Upcoming Tasks</Typography>}
                sx={{ pb: 1 }}
              />
              <CardContent sx={{ pt: 2 }}>
                <List disablePadding>
                  {upcomingTasks.map((task, i) => (
                    <Box key={i} mb={3}>
                      <Box display="flex" justifyContent="space-between" mb={1}>
                        <Typography variant="body2" fontWeight="600" color="textPrimary">{task.text}</Typography>
                        <Chip label={task.priority} color={task.color as any} size="small" sx={{ height: 20, fontSize: '0.625rem', fontWeight: 'bold' }} />
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={Math.floor(Math.random() * (100 - 30) + 30)}
                        color={task.color as any}
                        sx={{ height: 5, borderRadius: 5, bgcolor: '#e9ecef' }}
                      />
                    </Box>
                  ))}
                </List>
              </CardContent>
            </Card>

            {/* System Health / Info */}
            <Card sx={{ bgcolor: 'primary.main', color: 'white', overflow: 'hidden', position: 'relative' }}>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" gutterBottom>System Health</Typography>
                <Typography variant="body2" sx={{ opacity: 0.8, mb: 3 }}>
                  All systems are running smoothly. The AI engine is optimized for high performance.
                </Typography>
                <Button variant="contained" color="secondary" sx={{ color: 'primary.main', fontWeight: 'bold' }}>
                  Run Diagnostics
                </Button>
              </CardContent>
            </Card>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default Dashboard;
