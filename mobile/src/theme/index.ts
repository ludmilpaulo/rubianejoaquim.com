/** Zenda design tokens — single source for colors, spacing, typography */
export const colors = {
  brand: {
    primary: '#4F46E5',
    primaryDark: '#4338CA',
    primaryLight: '#818CF8',
    secondary: '#10B981',
    accent: '#F59E0B',
    ai: '#8B5CF6',
    danger: '#EF4444',
  },
  background: {
    default: '#F1F5F9',
    paper: '#FFFFFF',
    elevated: '#FFFFFF',
    dark: '#0F172A',
  },
  text: {
    primary: '#0F172A',
    secondary: '#64748B',
    muted: '#94A3B8',
    inverse: '#F8FAFC',
  },
  border: {
    light: '#E2E8F0',
    medium: '#CBD5E1',
  },
  status: {
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#3B82F6',
  },
  chart: ['#4F46E5', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444', '#06B6D4'],
} as const

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const

export const typography = {
  display: { fontSize: 28, fontWeight: '700' as const, letterSpacing: -0.5 },
  h1: { fontSize: 24, fontWeight: '700' as const },
  h2: { fontSize: 20, fontWeight: '600' as const },
  h3: { fontSize: 17, fontWeight: '600' as const },
  body: { fontSize: 15, fontWeight: '400' as const, lineHeight: 22 },
  caption: { fontSize: 13, fontWeight: '400' as const },
  label: { fontSize: 12, fontWeight: '600' as const, letterSpacing: 0.5 },
} as const

export const shadows = {
  card: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
} as const
