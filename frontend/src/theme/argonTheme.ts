import { createTheme, alpha } from '@mui/material/styles';

// Premium Glassmorphism Design System Colors
// Modeled after high-end SaaS dashboards (Linear, Raycast, etc.)
const colors = {
    primary: {
        main: '#6C5DD3', // Electric Violet - Vibrant & Modern
        light: '#8B80F8', // Soft Lavender
        dark: '#4D41A8', // Deep Purple
        contrastText: '#ffffff',
    },
    secondary: {
        main: '#FF75C3', // Vibrant Pink/Coral accent
        light: '#FFA6D9',
        dark: '#C74B8E',
        contrastText: '#ffffff',
    },
    success: {
        main: '#00E096', // Neon Green
        contrastText: '#ffffff',
    },
    info: {
        main: '#0095FF', // Bright Blue
        contrastText: '#ffffff',
    },
    warning: {
        main: '#FFB547', // Warm Orange
        contrastText: '#ffffff',
    },
    error: {
        main: '#FF5B5B', // Soft Red
        contrastText: '#ffffff',
    },
    grey: {
        50: '#F9FAFB',
        100: '#F3F4F6',
        200: '#E5E7EB',
        300: '#D1D5DB',
        400: '#9CA3AF',
        500: '#6B7280',
        600: '#4B5563',
        700: '#374151',
        800: '#1F2937',
        900: '#111827',
    },
    text: {
        primary: '#111827',
        secondary: '#6B7280',
        disabled: '#9CA3AF',
    },
    background: {
        default: '#F4F7FE',
        paper: '#ffffff',
    },
};

// Dark Mode Colors - Deep Universe Theme
const darkColors = {
    background: {
        default: '#0f0c29', // Deepest Blue/Black
        paper: '#1c1a3b',   // Slightly lighter for cards
    },
    text: {
        primary: '#FFFFFF',
        secondary: 'rgba(255, 255, 255, 0.7)',
        disabled: 'rgba(255, 255, 255, 0.5)',
    },
    primary: {
        main: '#8B80F8', // Lighter violet for dark mode contrast
        light: '#A59BFB',
        dark: '#6C5DD3',
        contrastText: '#ffffff',
    },
    secondary: {
        main: '#FF75C3',
        contrastText: '#ffffff',
    }
};

// Glassmorphism Shadows & Blurs
const glassEffect = {
    light: {
        background: 'rgba(255, 255, 255, 0.7)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.3)',
        boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
    },
    dark: {
        background: 'rgba(255, 255, 255, 0.03)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
    }
};

export const getArgonTheme = (mode: 'light' | 'dark') => {
    const isDark = mode === 'dark';
    const glass = isDark ? glassEffect.dark : glassEffect.light;

    return createTheme({
        palette: {
            mode,
            primary: isDark ? darkColors.primary : colors.primary,
            secondary: isDark ? darkColors.secondary : colors.secondary,
            success: colors.success,
            info: colors.info,
            warning: colors.warning,
            error: colors.error,
            grey: colors.grey,
            text: isDark ? darkColors.text : colors.text,
            background: isDark ? darkColors.background : colors.background,
        },
        typography: {
            fontFamily: '"Outfit", "Inter", sans-serif',
            h1: { fontWeight: 700, fontSize: '3.5rem' },
            h2: { fontWeight: 700, fontSize: '3rem' },
            h3: { fontWeight: 700, fontSize: '2.5rem' },
            h4: { fontWeight: 600, fontSize: '2rem' },
            h5: { fontWeight: 600, fontSize: '1.5rem' },
            h6: { fontWeight: 600, fontSize: '1.125rem', letterSpacing: '0.15px' },
            subtitle1: { fontSize: '1rem', letterSpacing: '0.15px', fontWeight: 500 },
            subtitle2: { fontSize: '0.875rem', letterSpacing: '0.1px', fontWeight: 500 },
            body1: { fontSize: '1rem', letterSpacing: '0.15px' },
            body2: { fontSize: '0.875rem', letterSpacing: '0.15px' },
            button: { fontWeight: 600, letterSpacing: '0.5px', textTransform: 'none' }, // No uppercase for modern feel
        },
        shape: {
            borderRadius: 16, // Softer, more modern corners
        },
        components: {
            MuiCssBaseline: {
                styleOverrides: {
                    body: {
                        backgroundColor: isDark ? darkColors.background.default : colors.background.default,
                        fontFamily: '"Outfit", "Inter", sans-serif',
                        // Smooth scrolling & scrollbar styling
                        scrollbarWidth: 'thin',
                        '&::-webkit-scrollbar': {
                            width: '6px',
                        },
                        '&::-webkit-scrollbar-thumb': {
                            backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                            borderRadius: '3px',
                        },
                    },
                },
            },
            MuiCard: {
                styleOverrides: {
                    root: {
                        ...glass,
                        borderRadius: '20px',
                        transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
                        '&:hover': {
                            transform: 'translateY(-4px)',
                            boxShadow: isDark
                                ? '0 12px 40px 0 rgba(0, 0, 0, 0.45)'
                                : '0 12px 40px 0 rgba(31, 38, 135, 0.15)',
                        }
                    },
                },
            },
            MuiPaper: {
                styleOverrides: {
                    root: {
                        backgroundImage: 'none',
                    },
                    elevation1: { ...glass, boxShadow: glass.boxShadow },
                    elevation2: { ...glass, boxShadow: glass.boxShadow },
                    rounded: { borderRadius: '20px' }
                },
            },
            MuiButton: {
                styleOverrides: {
                    root: {
                        borderRadius: '12px',
                        padding: '10px 24px',
                        fontSize: '0.95rem',
                        transition: 'all 0.3s ease',
                        boxShadow: 'none',
                    },
                    contained: {
                        background: `linear-gradient(135deg, ${colors.primary.main} 0%, ${colors.primary.dark} 100%)`,
                        color: colors.primary.contrastText,
                        '&:hover': {
                            background: `linear-gradient(135deg, ${colors.primary.light} 0%, ${colors.primary.main} 100%)`,
                            boxShadow: `0 4px 14px 0 rgba(108, 93, 211, 0.5)`,
                            transform: 'translateY(-1px)',
                        },
                    },
                    outlined: {
                        borderWidth: '2px',
                        borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(108, 93, 211, 0.3)',
                        '&:hover': {
                            borderWidth: '2px',
                            borderColor: colors.primary.main,
                            background: isDark ? 'rgba(108, 93, 211, 0.1)' : 'rgba(108, 93, 211, 0.05)',
                        }
                    }
                },
            },
            MuiAppBar: {
                styleOverrides: {
                    root: {
                        ...glass,
                        backgroundColor: isDark ? 'rgba(15, 12, 41, 0.7)' : 'rgba(255, 255, 255, 0.7)',
                        boxShadow: 'none',
                        borderBottom: 'none', // Removed border for cleaner floating look
                    },
                },
            },
            MuiDrawer: {
                styleOverrides: {
                    paper: {
                        ...glass,
                        backgroundColor: isDark ? 'rgba(28, 26, 59, 0.6)' : 'rgba(255, 255, 255, 0.6)',
                        borderRight: 'none',
                    },
                },
            },
            MuiTableCell: {
                styleOverrides: {
                    root: {
                        borderBottom: isDark ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(0,0,0,0.05)',
                    },
                    head: {
                        fontWeight: 600,
                        backgroundColor: 'transparent',
                        color: isDark ? 'rgba(255,255,255,0.6)' : colors.text.secondary,
                    }
                }
            },
            MuiInputBase: {
                styleOverrides: {
                    root: {
                        borderRadius: '12px !important',
                        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
                        border: '1px solid transparent',
                        transition: 'all 0.2s',
                        '&:hover': {
                            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
                        },
                        '&.Mui-focused': {
                            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#fff',
                            border: `1px solid ${colors.primary.main}`,
                            boxShadow: `0 0 0 4px ${alpha(colors.primary.main, 0.1)}`,
                        }
                    }
                }
            },
            MuiListItemButton: {
                styleOverrides: {
                    root: {
                        borderRadius: '12px',
                        marginBottom: '4px',
                        '&.Mui-selected': {
                            backgroundColor: `${alpha(colors.primary.main, 0.15)} !important`,
                            color: colors.primary.main,
                            '& .MuiListItemIcon-root': {
                                color: colors.primary.main,
                            },
                        },
                        '&:hover': {
                            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
                        },
                    },
                },
            },
        },
    });
};

// Backward compatibility (default light theme)
const argonTheme = getArgonTheme('light');
export default argonTheme;
