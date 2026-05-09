import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  Container,
  Avatar,
  CssBaseline,
  Link,
  Paper,
  InputAdornment,
  IconButton
} from '@mui/material';
import {
  LockOutlined,
  EmailOutlined,
  Lock,
  Visibility,
  VisibilityOff,
  Login as LoginIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuthStore();
  const navigate = useNavigate();
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const success = await login(email, password);
      if (success) {
        console.log('✅ Login successful, redirecting to dashboard...');
        navigate('/'); // Redirect to dashboard after successful login
      } else {
        setError('Invalid email or password');
      }
    } catch (err) {
      console.error('❌ Login error:', err);
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const success = await login('demo@demo.local', 'demo123');
      if (success) {
        navigate('/');
      } else {
        setError('Demo login failed');
      }
    } catch (err) {
      console.error('Demo login error:', err);
      setError('Demo login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)',
        backgroundSize: '400% 400%',
        animation: 'gradient 15s ease infinite',
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.1) 0%, rgba(0,0,0,0) 50%)',
          pointerEvents: 'none'
        },
        '@keyframes gradient': {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        }
      }}
    >
      <CssBaseline />
      <Container component="main" maxWidth="xs" sx={{ position: 'relative', zIndex: 1 }}>
        <Paper
          elevation={24}
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            p: 4,
            borderRadius: 4,
            background: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
          }}
        >
          <Avatar
            sx={{
              m: 1,
              bgcolor: 'transparent',
              width: 56,
              height: 56,
              background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
              boxShadow: '0 3px 5px 2px rgba(33, 203, 243, .3)'
            }}
          >
            <LockOutlined sx={{ fontSize: 30 }} />
          </Avatar>

          <Typography component="h1" variant="h4" sx={{
            fontWeight: 700,
            color: '#fff',
            mb: 1,
            textAlign: 'center',
            textShadow: '0 2px 4px rgba(0,0,0,0.3)'
          }}>
            Welcome Back
          </Typography>

          <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.7)', mb: 3 }}>
            Sign in to AI Timetable System
          </Typography>

          {error && (
            <Alert
              severity="error"
              sx={{
                width: '100%',
                mb: 3,
                borderRadius: 2,
                backgroundColor: 'rgba(211, 47, 47, 0.1)',
                color: '#ffcdd2',
                border: '1px solid rgba(211, 47, 47, 0.3)',
                '& .MuiAlert-icon': { color: '#ef5350' }
              }}
            >
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1, width: '100%' }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Email Address"
              name="email"
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              variant="outlined"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <EmailOutlined sx={{ color: 'rgba(255,255,255,0.5)' }} />
                  </InputAdornment>
                ),
                sx: {
                  color: '#fff',
                  borderRadius: 2,
                  bgcolor: 'rgba(0,0,0,0.2)',
                  '&:hover': { bgcolor: 'rgba(0,0,0,0.3)' },
                  '& fieldset': { borderColor: 'rgba(255,255,255,0.1) !important' },
                  '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.3) !important' },
                  '& input': { color: '#fff' },
                }
              }}
              InputLabelProps={{ sx: { color: 'rgba(255,255,255,0.5)' } }}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type={showPassword ? 'text' : 'password'}
              id="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              variant="outlined"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Lock sx={{ color: 'rgba(255,255,255,0.5)' }} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                      sx={{ color: 'rgba(255,255,255,0.5)' }}
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
                sx: {
                  color: '#fff',
                  borderRadius: 2,
                  bgcolor: 'rgba(0,0,0,0.2)',
                  '&:hover': { bgcolor: 'rgba(0,0,0,0.3)' },
                  '& fieldset': { borderColor: 'rgba(255,255,255,0.1) !important' },
                  '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.3) !important' },
                  '& input': { color: '#fff' },
                }
              }}
              InputLabelProps={{ sx: { color: 'rgba(255,255,255,0.5)' } }}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={loading}
              startIcon={!loading && <LoginIcon />}
              sx={{
                mt: 4,
                mb: 2,
                py: 1.5,
                borderRadius: 2,
                fontSize: '1rem',
                fontWeight: 600,
                textTransform: 'none',
                background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
                boxShadow: '0 3px 5px 2px rgba(33, 203, 243, .3)',
                transition: 'transform 0.2s',
                '&:hover': {
                  background: 'linear-gradient(45deg, #1976D2 30%, #00BCD4 90%)',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 6px 10px 4px rgba(33, 203, 243, .3)',
                }
              }}
            >
              {loading ? 'Signing In...' : 'Sign In'}
            </Button>

            <Box sx={{ position: 'relative', my: 3 }}>
              <DividerWithText>OR</DividerWithText>
            </Box>

            <Button
              fullWidth
              variant="outlined"
              onClick={handleDemoLogin}
              disabled={loading}
              sx={{
                mb: 3,
                py: 1.2,
                borderRadius: 2,
                textTransform: 'none',
                borderColor: 'rgba(255,255,255,0.3)',
                color: '#fff',
                '&:hover': {
                  borderColor: '#fff',
                  bgcolor: 'rgba(255,255,255,0.05)'
                }
              }}
            >
              Use Demo Account
            </Button>

            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)' }}>
                Don't have an account?{' '}
                <Link
                  component="button"
                  variant="body2"
                  onClick={() => window.location.href = '/signup'}
                  sx={{
                    color: '#2196F3',
                    textDecoration: 'none',
                    fontWeight: 600,
                    '&:hover': { textDecoration: 'underline' }
                  }}
                >
                  Sign Up
                </Link>
              </Typography>
            </Box>
          </Box>
        </Paper>

        <Typography variant="caption" display="block" align="center" sx={{ mt: 4, color: 'rgba(255,255,255,0.3)' }}>
          © {new Date().getFullYear()} ShedMaster AI. All rights reserved.
        </Typography>
      </Container>
    </Box>
  );
};

const DividerWithText = ({ children }: { children: React.ReactNode }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
    <Box sx={{ flex: 1, borderBottom: '1px solid rgba(255,255,255,0.1)' }} />
    <Typography variant="caption" sx={{ px: 2, color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>
      {children}
    </Typography>
    <Box sx={{ flex: 1, borderBottom: '1px solid rgba(255,255,255,0.1)' }} />
  </Box>
);

export default LoginPage;
