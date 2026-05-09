import React from 'react';
import { useThemeContext } from '../../contexts/ThemeContext';
import {
    AppBar,
    Toolbar,
    Typography,
    IconButton,
    Box,
    Avatar,
    Menu,
    MenuItem,
    ListItemIcon,
    ListItemText,
    InputBase,
    Paper,
    Divider,
    Popover,
    List,
    ListItem,
    Badge,
    Tooltip
} from '@mui/material';
import {
    Menu as MenuIcon,
    Search as SearchIcon,
    AccountCircle,
    ExitToApp,
    Notifications,
    DarkMode,
    LightMode,
    Settings as SettingsIcon,
} from '@mui/icons-material';
import { useLocation, useNavigate } from 'react-router-dom';



interface NavbarProps {
    handleDrawerToggle: () => void;
    user: any;
    handleLogout: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ handleDrawerToggle, user, handleLogout }) => {
    const { mode, toggleTheme } = useThemeContext();
    const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
    const [notificationAnchor, setNotificationAnchor] = React.useState<null | HTMLElement>(null);
    const [searchQuery, setSearchQuery] = React.useState('');
    const location = useLocation();
    const navigate = useNavigate();

    // Get current page title based on path
    const getPageTitle = (pathname: string) => {
        if (pathname === '/profile') return 'My Profile';
        switch (pathname) {
            case '/': return 'Dashboard';
            case '/timetables': return 'Timetables';
            case '/programs': return 'Programs';
            case '/constraints': return 'Constraints';
            case '/ai': return 'AI Optimization';
            default: return 'Dashboard';
        }
    };

    const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleNotificationOpen = (event: React.MouseEvent<HTMLElement>) => {
        setNotificationAnchor(event.currentTarget);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
    };

    const handleNotificationClose = () => {
        setNotificationAnchor(null);
    };

    const onLogout = () => {
        handleMenuClose();
        handleLogout();
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        console.log("Searching for:", searchQuery);
        // Implement actual search routing or filtering here
        if (searchQuery.trim()) {
            // For now, just a visual feedback
            alert(`Search functionality for: "${searchQuery}" is active (check console)`);
        }
    };

    return (
        <AppBar
            position="sticky"
            color="transparent"
            elevation={0}
            sx={{
                top: 0,
                zIndex: 1100,
                bgcolor: mode === 'dark' ? 'rgba(28, 26, 59, 0.7)' : 'rgba(255, 255, 255, 0.7)',
                backdropFilter: 'blur(20px)',
                borderRadius: '24px',
                m: 2, // Floating margin
                width: 'auto', // Auto width based on flex parent
                boxShadow: mode === 'dark' ? '0 8px 32px 0 rgba(0, 0, 0, 0.37)' : '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
                border: mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.05)' : '1px solid rgba(255, 255, 255, 0.4)',
            }}
        >
            <Toolbar sx={{ minHeight: '80px !important' }}>
                <IconButton
                    color="inherit"
                    aria-label="open drawer"
                    edge="start"
                    onClick={handleDrawerToggle}
                    sx={{ mr: 2, display: { md: 'none' }, color: 'text.primary' }}
                >
                    <MenuIcon />
                </IconButton>

                {/* Page Title / Breadcrumb */}
                <Box sx={{ display: { xs: 'none', md: 'block' } }}>
                    <Typography variant="h6" color="text.primary" sx={{ fontWeight: 'bold', textTransform: 'uppercase', fontSize: '0.875rem', letterSpacing: '1px' }}>
                        {getPageTitle(location.pathname)}
                    </Typography>
                </Box>

                <Box sx={{ flexGrow: 1 }} />

                {/* Search Bar */}
                <Paper
                    component="form"
                    onSubmit={handleSearch}
                    sx={{
                        p: '2px 4px',
                        display: { xs: 'none', sm: 'flex' },
                        alignItems: 'center',
                        width: 250,
                        borderRadius: 5,
                        mr: 2,
                        backgroundColor: mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'white',
                        border: mode === 'dark' ? '1px solid rgba(255,255,255,0.1)' : 'none',
                        boxShadow: mode === 'dark' ? 'none' : '0 1px 3px rgba(50, 50, 93, 0.15), 0 1px 0 rgba(0, 0, 0, 0.02)'
                    }}
                >
                    <IconButton sx={{ p: '10px' }} aria-label="search" onClick={handleSearch}>
                        <SearchIcon sx={{ color: 'text.secondary' }} />
                    </IconButton>
                    <InputBase
                        sx={{ ml: 1, flex: 1, fontSize: '0.875rem' }}
                        placeholder="Search..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        inputProps={{ 'aria-label': 'search' }}
                    />
                </Paper>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {/* Dark Mode Toggle */}
                    <Tooltip title={mode === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}>
                        <IconButton onClick={toggleTheme} color="inherit">
                            {mode === 'dark' ? <LightMode sx={{ color: 'warning.main' }} /> : <DarkMode sx={{ color: 'text.primary' }} />}
                        </IconButton>
                    </Tooltip>

                    {/* Notifications */}
                    <IconButton color="inherit" onClick={handleNotificationOpen}>
                        <Badge badgeContent={3} color="error">
                            <Notifications sx={{ color: mode === 'dark' ? 'text.primary' : 'text.secondary' }} />
                        </Badge>
                    </IconButton>

                    {/* Profile Menu Trigger */}
                    <IconButton
                        onClick={handleProfileMenuOpen}
                        sx={{
                            p: 0,
                            ml: 1,
                            '&:hover': {
                                backgroundColor: 'rgba(0,0,0,0.05)'
                            }
                        }}
                    >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Avatar
                                sx={{
                                    width: 36,
                                    height: 36,
                                    bgcolor: 'primary.main',
                                    color: 'white',
                                    fontSize: '0.9rem',
                                    fontWeight: 'bold',
                                    boxShadow: '0 4px 6px rgba(50, 50, 93, 0.11)'
                                }}
                            >
                                {user?.name ? user.name.charAt(0).toUpperCase() : (user?.email ? user.email.charAt(0).toUpperCase() : 'U')}
                            </Avatar>
                            <Typography variant="body2" sx={{ display: { xs: 'none', sm: 'block' }, fontWeight: 600, color: 'text.primary' }}>
                                {user?.name || user?.email || 'User'}
                            </Typography>
                        </Box>
                    </IconButton>
                </Box>

                {/* Profile Menu */}
                <Menu
                    anchorEl={anchorEl}
                    open={Boolean(anchorEl)}
                    onClose={handleMenuClose}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                    transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                    PaperProps={{
                        sx: {
                            minWidth: 180,
                            mt: 1,
                            boxShadow: '0 0 2rem 0 rgba(136, 152, 170, .15)'
                        }
                    }}
                >
                    <Box sx={{ px: 2, py: 1, borderBottom: '1px solid #f0f0f0' }}>
                        <Typography variant="subtitle2" color="textSecondary" sx={{ fontSize: '0.75rem', textTransform: 'uppercase' }}>
                            Welcome!
                        </Typography>
                    </Box>
                    <MenuItem onClick={() => { handleMenuClose(); navigate('/profile'); }}>
                        <ListItemIcon><AccountCircle fontSize="small" /></ListItemIcon>
                        <ListItemText primary="My Profile" />
                    </MenuItem>
                    <MenuItem onClick={handleMenuClose}>
                        <ListItemIcon><SettingsIcon fontSize="small" /></ListItemIcon>
                        <ListItemText primary="Settings" />
                    </MenuItem>
                    <Divider />
                    <MenuItem onClick={onLogout}>
                        <ListItemIcon><ExitToApp fontSize="small" /></ListItemIcon>
                        <ListItemText primary="Logout" />
                    </MenuItem>
                </Menu>

                {/* Notification Popover */}
                <Popover
                    open={Boolean(notificationAnchor)}
                    anchorEl={notificationAnchor}
                    onClose={handleNotificationClose}
                    anchorOrigin={{
                        vertical: 'bottom',
                        horizontal: 'center',
                    }}
                    transformOrigin={{
                        vertical: 'top',
                        horizontal: 'center',
                    }}
                    PaperProps={{
                        sx: { width: 300, maxHeight: 400 }
                    }}
                >
                    <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                        <Typography variant="h6" fontSize="1rem">Notifications</Typography>
                    </Box>
                    <List>
                        <ListItem alignItems="flex-start" sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                            <ListItemText
                                primary="Timetable generated successfully"
                                secondary="Your timetable for Computer Science A is ready."
                                primaryTypographyProps={{ fontSize: '0.9rem', fontWeight: 500 }}
                                secondaryTypographyProps={{ fontSize: '0.75rem' }}
                            />
                        </ListItem>
                        <Divider component="li" />
                        <ListItem alignItems="flex-start" sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                            <ListItemText
                                primary="New constraint rule added"
                                secondary="Administrator added a new room constraint."
                                primaryTypographyProps={{ fontSize: '0.9rem', fontWeight: 500 }}
                                secondaryTypographyProps={{ fontSize: '0.75rem' }}
                            />
                        </ListItem>
                        <Divider component="li" />
                        <ListItem alignItems="flex-start" sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                            <ListItemText
                                primary="System Update"
                                secondary="SHEDMASTER v2.0 is now live!"
                                primaryTypographyProps={{ fontSize: '0.9rem', fontWeight: 500 }}
                                secondaryTypographyProps={{ fontSize: '0.75rem' }}
                            />
                        </ListItem>
                    </List>
                </Popover>
            </Toolbar>
        </AppBar>
    );
};



export default Navbar;
