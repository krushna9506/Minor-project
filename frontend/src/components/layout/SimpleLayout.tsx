import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';

const SimpleLayout: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4" gutterBottom>
        🔧 Simple Layout Test
      </Typography>
      <Typography variant="body1" sx={{ mb: 3 }}>
        This is a simplified layout to test if the routing is working.
      </Typography>
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <Button 
          variant="contained" 
          onClick={() => navigate('/test')}
        >
          Go to Test Page
        </Button>
        <Button 
          variant="outlined" 
          onClick={() => navigate('/login')}
        >
          Go to Login
        </Button>
        <Button 
          variant="outlined" 
          onClick={() => navigate('/timetables')}
        >
          Go to Timetables
        </Button>
      </Box>
      <Box sx={{ mt: 4 }}>
        <Typography variant="h6">Debug Info:</Typography>
        <Typography variant="body2">
          Current URL: {window.location.pathname}
        </Typography>
      </Box>
    </Box>
  );
};

export default SimpleLayout;
