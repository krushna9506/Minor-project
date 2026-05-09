import React from 'react';
import { Card, CardContent, Typography, Box, useTheme } from '@mui/material';

interface StatsCardProps {
    title: string;
    value: string | number;
    icon: React.ReactNode;
    iconColor: string;
    trend?: {
        value: string;
        label: string;
        type: 'up' | 'down' | 'neutral';
    };
    footer?: string;
}

const StatsCard: React.FC<StatsCardProps> = ({ title, value, icon, iconColor, trend, footer }) => {
    const theme = useTheme();

    return (
        <Card sx={{ height: '100%', overflow: 'visible', position: 'relative' }}>
            <CardContent sx={{ pb: 1 }}>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                    <Box sx={{ flex: 1, zIndex: 1 }}>
                        <Typography variant="overline" color="textSecondary" sx={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase' }}>
                            {title}
                        </Typography>
                        <Typography variant="h4" sx={{ mb: 0, fontWeight: 700, color: 'text.primary', mt: 0.5 }}>
                            {value}
                        </Typography>
                    </Box>
                    <Box
                        sx={{
                            width: 56,
                            height: 56,
                            borderRadius: '16px', // Softer square
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: `linear-gradient(135deg, ${iconColor} 0%, ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.8)'} 100%)`, // Gradient effect
                            boxShadow: `0 8px 16px -4px ${iconColor}80`, // Colored glow
                            color: 'white',
                            ml: 2,
                            flexShrink: 0,
                            backdropFilter: 'blur(4px)',
                            '& svg': {
                                fontSize: '1.75rem'
                            }
                        }}
                    >
                        {icon}
                    </Box>
                </Box>
            </CardContent>
            {(trend || footer) && (
                <CardContent sx={{ pt: 1, pb: 2 }}>
                    {trend && (
                        <Box display="flex" alignItems="center">
                            <Typography
                                component="span"
                                variant="body2"
                                sx={{
                                    color: trend.type === 'up' ? theme.palette.success.main : trend.type === 'down' ? theme.palette.error.main : theme.palette.text.secondary,
                                    fontWeight: 700,
                                    mr: 1,
                                    display: 'flex',
                                    alignItems: 'center',
                                    bgcolor: trend.type === 'up' ? `${theme.palette.success.main}15` : `${theme.palette.error.main}15`,
                                    px: 0.8,
                                    py: 0.2,
                                    borderRadius: '6px'
                                }}
                            >
                                {trend.type === 'up' ? '↑' : trend.type === 'down' ? '↓' : ''} {trend.value}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                {trend.label}
                            </Typography>
                        </Box>
                    )}
                </CardContent>
            )}
        </Card>
    );
};

export default StatsCard;
