export type ThemeColors = {
  primary: string;
  secondary: string;
  accent: string;
  dark: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  success: string;
  warning: string;
  error: string;
};

export const themes: Record<'pink' | 'blue' | 'green', ThemeColors> = {
  pink: {
    primary: '#FF69B4',
    secondary: '#FFB6C1',
    accent: '#FFC0CB',
    dark: '#C73E5A',
    background: '#1A0B14',
    surface: '#2D1A24',
    text: '#FFFFFF',
    textSecondary: '#E1B3C3',
    success: '#98FB98',
    warning: '#FFD700',
    error: '#FF6B6B',
  },
  blue: {
    primary: '#2196F3',
    secondary: '#64B5F6',
    accent: '#81D4FA',
    dark: '#1565C0',
    background: '#0D1421',
    surface: '#1A2332',
    text: '#FFFFFF',
    textSecondary: '#B3D9FF',
    success: '#4CAF50',
    warning: '#FF9800',
    error: '#F44336',
  },
  green: {
    primary: '#4CAF50',
    secondary: '#81C784',
    accent: '#A5D6A7',
    dark: '#2E7D32',
    background: '#0F1B0F',
    surface: '#1B2E1B',
    text: '#FFFFFF',
    textSecondary: '#C8E6C9',
    success: '#66BB6A',
    warning: '#FF9800',
    error: '#F44336',
  },
};

export function getTheme(name: 'pink' | 'blue' | 'green' = 'pink'): ThemeColors {
  return themes[name];
}