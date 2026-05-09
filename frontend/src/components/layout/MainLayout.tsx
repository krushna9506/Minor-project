import React, { useState } from 'react';
import { Box, useTheme } from '@mui/material';
import { useNavigate, Routes, Route, useLocation } from 'react-router-dom';
import Dashboard from '../pages/Dashboard.tsx';
import Timetables from '../pages/Timetables.tsx';
import Programs from '../pages/Programs.tsx';
import Constraints from '../pages/Constraints.tsx';
import AIOptimization from '../pages/AIOptimization.tsx';
import CreateTimetable from '../pages/CreateTimetable.tsx';
import LoginPage from '../pages/Login.tsx';
import Signup from '../pages/Signup.tsx';
import { useAuthStore } from '../../store/authStore';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import { AppBar, Toolbar, IconButton, Typography, Avatar } from '@mui/material';



import Profile from '../pages/Profile';

const MainLayout: React.FC = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuthStore();
  const theme = useTheme();

  // Check if we're on a timetable create/edit/view page
  const isTimetablePage = location.pathname.includes('/timetables/create') || location.pathname.includes('/timetables/edit') || location.pathname.match(/\/timetables\/[^\/]+$/);
  const timetableHeader = location.pathname.includes('/timetables/create')
    ? 'Create Timetable'
    : location.pathname.includes('/timetables/edit')
      ? 'Edit Timetable'
      : 'View Timetable';

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // If not authenticated, show login/signup routes
  if (!isAuthenticated) {
    return (
      <Box sx={{ minHeight: '100vh', width: '100%', backgroundColor: 'background.default' }}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="*" element={<LoginPage />} />
        </Routes>
      </Box>
    );
  }

  return (
    <>
      {!isTimetablePage ? (
        <Box sx={{ display: 'flex', minHeight: '100vh', backgroundColor: theme.palette.background.default }}>
          <Sidebar
            mobileOpen={mobileOpen}
            handleDrawerToggle={handleDrawerToggle}
          />

          <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
            {/* Argon Header Background - The signature look */}
            {/* Premium Animated Mesh Gradient Background */}
            <Box sx={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 0,
              background: theme.palette.mode === 'dark'
                ? 'radial-gradient(circle at 15% 50%, rgba(108, 93, 211, 0.15), transparent 25%), radial-gradient(circle at 85% 30%, rgba(255, 117, 195, 0.1), transparent 25%)'
                : 'radial-gradient(circle at 15% 50%, rgba(108, 93, 211, 0.08), transparent 25%), radial-gradient(circle at 85% 30%, rgba(255, 117, 195, 0.08), transparent 25%)',
              pointerEvents: 'none',
            }} />


            <Navbar
              handleDrawerToggle={handleDrawerToggle}
              user={user}
              handleLogout={handleLogout}
            />

            <Box
              component="main"
              sx={{
                flexGrow: 1,
                p: 3,
                zIndex: 1,
                mt: 10, // Push content down below Navbar
                position: 'relative',
                animation: 'fade-in 0.6s ease-out',
              }}
            >
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/timetables" element={<Timetables />} />
                <Route path="/programs" element={<Programs />} />
                <Route path="/constraints" element={<Constraints />} />
                <Route path="/ai" element={<AIOptimization />} />
                <Route path="/profile" element={<Profile />} />
              </Routes>

              {/* Footer could go here */}
            </Box>
          </Box>
        </Box>
      ) : (
        /* Timetable Wizard Layout - Full screen, different header */
        <Box sx={{ minHeight: '100vh', backgroundColor: theme.palette.background.default }}>
          <AppBar
            position="fixed"
            elevation={0}
            sx={{
              backgroundColor: 'background.paper',
              borderBottom: '1px solid',
              borderColor: 'divider',
              color: 'text.primary'
            }}
          >
            <Toolbar>
              <IconButton onClick={() => navigate('/timetables')} edge="start" sx={{ mr: 2 }}>
                <ArrowBackIcon />
              </IconButton>
              <CalendarTodayIcon sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 600 }}>
                {timetableHeader}
              </Typography>
              <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32 }}>
                {user?.name?.charAt(0) || 'U'}
              </Avatar>
            </Toolbar>
          </AppBar>

          <Box sx={{ pt: '80px', px: 3, pb: 4 }}>
            <Routes>
              <Route path="/timetables/create" element={<CreateTimetable />} />
              <Route path="/timetables/edit/:id" element={<CreateTimetable />} />
              <Route path="/timetables/:id" element={<CreateTimetable />} />
            </Routes>
          </Box>
        </Box>
      )}
    </>
  );
};

export default MainLayout;
