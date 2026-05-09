import React, { useState } from 'react';
import {
    Box,
    Typography,
    Card,
    CardContent,
    Avatar,
    Button,
    Grid,
    TextField,
    Divider
} from '@mui/material';
import { useAuthStore } from '../../store/authStore';
import { CameraAlt, Edit, Save } from '@mui/icons-material';

const Profile: React.FC = () => {
    const { user } = useAuthStore();
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        name: user?.name || '',
        email: user?.email || '',
        designation: 'Administrator', // Mock data
        department: 'Computer Science', // Mock data
        bio: 'Experienced academic administrator with a focus on timetable optimization.' // Mock data
    });

    const handleEditToggle = () => {
        setIsEditing(!isEditing);
    };

    const handleSave = () => {
        // Save logic would go here
        setIsEditing(false);
    };

    return (
        <Box sx={{ p: 4 }}>
            {/* Header with background */}
            <Box
                sx={{
                    height: 300,
                    borderRadius: 4,
                    background: 'linear-gradient(135deg, #324cdd 0%, #5e72e4 100%)',
                    mb: -10,
                    position: 'relative'
                }}
            />

            <Grid container spacing={4} sx={{ position: 'relative', px: 2 }}>
                {/* Left Column - Profile Card */}
                <Grid item xs={12} md={4}>
                    <Card sx={{ textAlign: 'center', pb: 4, overflow: 'visible' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'center', mt: -8 }}>
                            <Box sx={{ position: 'relative' }}>
                                <Avatar
                                    sx={{
                                        width: 140,
                                        height: 140,
                                        border: '4px solid white',
                                        bgcolor: 'secondary.main',
                                        color: 'primary.main',
                                        fontSize: '3rem',
                                        fontWeight: 'bold',
                                        boxShadow: '0 7px 14px rgba(50, 50, 93, 0.1)'
                                    }}
                                >
                                    {user?.name?.charAt(0) || 'U'}
                                </Avatar>
                                <Button
                                    sx={{
                                        position: 'absolute',
                                        bottom: 0,
                                        right: 0,
                                        minWidth: 'auto',
                                        width: 40,
                                        height: 40,
                                        borderRadius: '50%',
                                        bgcolor: 'info.main',
                                        color: 'white',
                                        '&:hover': { bgcolor: 'info.dark' }
                                    }}
                                >
                                    <CameraAlt fontSize="small" />
                                </Button>
                            </Box>
                        </Box>

                        <CardContent>
                            <Typography variant="h5" fontWeight="bold" gutterBottom>
                                {user?.name || 'User Name'}
                            </Typography>
                            <Typography variant="body2" color="textSecondary" gutterBottom>
                                {formData.designation}
                            </Typography>
                            <Typography variant="body2" color="textSecondary">
                                {user?.email || 'user@example.com'}
                            </Typography>

                            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 4, mt: 3 }}>
                                <Box>
                                    <Typography variant="h6" fontWeight="bold">24</Typography>
                                    <Typography variant="caption" color="textSecondary">Timetables</Typography>
                                </Box>
                                <Box>
                                    <Typography variant="h6" fontWeight="bold">8</Typography>
                                    <Typography variant="caption" color="textSecondary">Programs</Typography>
                                </Box>
                                <Box>
                                    <Typography variant="h6" fontWeight="bold">98%</Typography>
                                    <Typography variant="caption" color="textSecondary">Satisfaction</Typography>
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Right Column - Account Settings */}
                <Grid item xs={12} md={8}>
                    <Card>
                        <Box sx={{ p: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee' }}>
                            <Typography variant="h6" fontWeight="bold">Edit Profile</Typography>
                            <Button
                                variant="contained"
                                size="small"
                                startIcon={isEditing ? <Save /> : <Edit />}
                                onClick={isEditing ? handleSave : handleEditToggle}
                            >
                                {isEditing ? 'Save Changes' : 'Edit'}
                            </Button>
                        </Box>
                        <CardContent sx={{ p: 4 }}>
                            <Typography variant="subtitle2" color="textSecondary" style={{ textTransform: 'uppercase', marginBottom: '16px', letterSpacing: '1px', fontSize: '0.75rem' }}>
                                User Information
                            </Typography>

                            <Grid container spacing={3}>
                                <Grid item xs={12} md={6}>
                                    <TextField
                                        fullWidth
                                        label="Full Name"
                                        variant="outlined"
                                        value={formData.name}
                                        disabled={!isEditing}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <TextField
                                        fullWidth
                                        label="Email Address"
                                        variant="outlined"
                                        value={formData.email}
                                        disabled
                                        helperText="Email cannot be changed"
                                    />
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <TextField
                                        fullWidth
                                        label="Designation"
                                        variant="outlined"
                                        value={formData.designation}
                                        disabled={!isEditing}
                                        onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                                    />
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <TextField
                                        fullWidth
                                        label="Department"
                                        variant="outlined"
                                        value={formData.department}
                                        disabled={!isEditing}
                                        onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                                    />
                                </Grid>
                            </Grid>

                            <Divider sx={{ my: 4 }} />

                            <Typography variant="subtitle2" color="textSecondary" style={{ textTransform: 'uppercase', marginBottom: '16px', letterSpacing: '1px', fontSize: '0.75rem' }}>
                                About Me
                            </Typography>
                            <TextField
                                fullWidth
                                multiline
                                rows={4}
                                label="Biography"
                                value={formData.bio}
                                disabled={!isEditing}
                                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                            />
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );
};

export default Profile;
