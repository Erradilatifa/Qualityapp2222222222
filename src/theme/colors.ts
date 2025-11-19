export const colors = {
  // Primary dark blue
  primary: '#0A2342',
  primaryLight: '#19376D',
  primaryDark: '#06162B',

  // Accent dark orange
  secondary: '#FF6700',
  secondaryLight: '#FF8C42',
  secondaryDark: '#C43D00',

  // Gradient
  gradientStart: '#0A2342',
  gradientEnd: '#19376D',
  gradientOrange: '#FF6700',

  // Success, warning, error
  success: '#2ECC71',
  warning: '#FFC300',
  error: '#FF3B30',

  // Neutral
  white: '#FFFFFF',
  black: '#000000',
  gray: '#B0B0B0',
  darkGray: '#23272F',
  transparent: 'transparent',
};

export const lightTheme = {
  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceSecondary: '#F1F5F9',
  textPrimary: '#1E293B',
  textSecondary: '#475569',
  textTertiary: '#64748B',
  textInverse: '#FFFFFF',
  border: '#E2E8F0',
  borderLight: '#F1F5F9',
  borderDark: '#CBD5E1',
  shadow: 'rgba(10, 35, 66, 0.08)',
  shadowDark: 'rgba(10, 35, 66, 0.16)',
  ...colors,
};

export const darkTheme = {
  background: '#0F172A',
  surface: '#1E293B',
  surfaceSecondary: '#334155',
  textPrimary: '#F8FAFC',
  textSecondary: '#E2E8F0',
  textTertiary: '#CBD5E1',
  textInverse: '#0F172A',
  border: '#334155',
  borderLight: '#475569',
  borderDark: '#1E293B',
  shadow: 'rgba(0,0,0,0.25)',
  shadowDark: 'rgba(0,0,0,0.5)',
  ...colors,
};

export type Theme = typeof lightTheme; 