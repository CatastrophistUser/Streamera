import { createContext } from 'react';

export interface ThemeContextType {
    isDarkMode: boolean;
    toggleTheme: () => void;
}

/**
 * Lives in its own module so ThemeContext.tsx only exports components and stays
 * eligible for React Fast Refresh.
 */
export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);
