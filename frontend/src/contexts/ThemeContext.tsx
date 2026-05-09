import React, { createContext, useState, useContext, useEffect } from 'react';
import type { ReactNode } from 'react';
import { ThemeProvider, type Theme } from '@mui/material/styles';
import { getArgonTheme } from '../theme/argonTheme';

type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
    mode: ThemeMode;
    toggleTheme: () => void;
    theme: Theme;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useThemeContext = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useThemeContext must be used within a ThemeContextProvider');
    }
    return context;
};

interface ThemeContextProviderProps {
    children: ReactNode;
}

export const ThemeContextProvider: React.FC<ThemeContextProviderProps> = ({ children }) => {
    // Initialize state from localStorage or default to 'light'
    const [mode, setMode] = useState<ThemeMode>(() => {
        const savedMode = localStorage.getItem('themeMode');
        return (savedMode === 'light' || savedMode === 'dark') ? savedMode : 'light';
    });

    // Update localStorage when mode changes
    useEffect(() => {
        localStorage.setItem('themeMode', mode);
    }, [mode]);

    const toggleTheme = () => {
        setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
    };

    const theme = getArgonTheme(mode);

    return (
        <ThemeContext.Provider value={{ mode, toggleTheme, theme }}>
            <ThemeProvider theme={theme}>
                {children}
            </ThemeProvider>
        </ThemeContext.Provider>
    );
};
