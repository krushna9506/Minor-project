import React from 'react';
import {
    Box,
    Drawer,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Typography,
    Divider,
    useTheme,
    useMediaQuery,
} from '@mui/material';
import {
    Dashboard as DashboardIcon,
    Schedule as ScheduleIcon,
    School as SchoolIcon,
    Settings as SettingsIcon,
    Psychology as PsychologyIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';

const drawerWidth = 250;

interface SidebarProps {
    mobileOpen: boolean;
    handleDrawerToggle: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ mobileOpen, handleDrawerToggle }) => {
    const theme = useTheme();
    const navigate = useNavigate();
    const location = useLocation();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    const menuItems = [
        { text: 'Dashboard', icon: <DashboardIcon />, path: '/' },
        { text: 'Timetables', icon: <ScheduleIcon />, path: '/timetables' },
        { text: 'Programs', icon: <SchoolIcon />, path: '/programs' },
        { text: 'Constraints', icon: <SettingsIcon />, path: '/constraints' },
        { text: 'AI Optimization', icon: <PsychologyIcon />, path: '/ai' },
    ];

    const drawerContent = (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ p: 3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography
                    variant="h5"
                    sx={{
                        fontWeight: 'bold',
                        color: theme.palette.primary.main,
                        letterSpacing: '2px',
                        textTransform: 'uppercase'
                    }}
                >
                    SHEDMASTER
                </Typography>
            </Box>
            <Divider sx={{ mb: 2 }} />
            <List sx={{ px: 2 }}>
                {menuItems.map((item) => {
                    const isActive = location.pathname === item.path;
                    return (
                        <ListItem key={item.text} disablePadding sx={{ mb: 1 }}>
                            <ListItemButton
                                onClick={() => {
                                    navigate(item.path);
                                    if (isMobile) handleDrawerToggle();
                                }}
                                sx={{
                                    borderRadius: 2,
                                    backgroundColor: isActive ? 'rgba(94, 114, 228, 0.1)' : 'transparent',
                                    '&:hover': {
                                        backgroundColor: isActive ? 'rgba(94, 114, 228, 0.1)' : 'rgba(0, 0, 0, 0.05)',
                                    },
                                }}
                            >
                                <ListItemIcon sx={{
                                    minWidth: 40,
                                    color: isActive ? theme.palette.primary.main : theme.palette.text.secondary
                                }}>
                                    {item.icon}
                                </ListItemIcon>
                                <ListItemText
                                    primary={item.text}
                                    primaryTypographyProps={{
                                        fontSize: '0.9rem',
                                        fontWeight: isActive ? 600 : 400,
                                        color: isActive ? theme.palette.primary.main : theme.palette.text.secondary
                                    }}
                                />
                            </ListItemButton>
                        </ListItem>
                    );
                })}
            </List>
        </Box>
    );

    return (
        <Box
            component="nav"
            sx={{
                width: { md: drawerWidth },
                flexShrink: { md: 0 },
                p: { md: 2 } // Add padding for floating effect
            }}
        >
            {/* Mobile Drawer */}
            <Drawer
                variant="temporary"
                open={mobileOpen}
                onClose={handleDrawerToggle}
                ModalProps={{ keepMounted: true }}
                sx={{
                    display: { xs: 'block', md: 'none' },
                    '& .MuiDrawer-paper': {
                        boxSizing: 'border-box',
                        width: drawerWidth,
                        border: 'none',
                        boxShadow: theme.shadows[10],
                        backgroundImage: 'none',
                    },
                }}
            >
                {drawerContent}
            </Drawer>

            {/* Desktop Permanent Drawer - Floating Glass Panel */}
            <Drawer
                variant="permanent"
                sx={{
                    display: { xs: 'none', md: 'block' },
                    '& .MuiDrawer-paper': {
                        boxSizing: 'border-box',
                        width: `calc(${drawerWidth}px - 32px)`, // Adjust width for padding
                        height: 'calc(100vh - 32px)', // Floating height
                        margin: '16px', // Floating margin
                        borderRadius: '24px', // Rounded corners
                        border: 'none',
                        backgroundColor: theme.palette.mode === 'dark' ? 'rgba(28, 26, 59, 0.6)' : 'rgba(255, 255, 255, 0.65)',
                        backdropFilter: 'blur(20px)',
                        boxShadow: theme.shadows[4],
                    },
                }}
                open
            >
                {drawerContent}
            </Drawer>
        </Box>
    );
};

export default Sidebar;
