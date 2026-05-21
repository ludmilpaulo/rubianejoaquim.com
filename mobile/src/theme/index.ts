import { spacing } from './spacing'
import { typography } from './typography'
import { shadows, motion, radius } from './shadows'
import { components } from './components'

export { spacing, typography, shadows, motion, radius, components }

/** Central Zenda palette — use these tokens in all screens */
export const colors = {
  primary: '#6366F1',
  secondary: '#8B5CF6',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#3B82F6',
  surface: '#FFFFFF',
  brand: {
    primary: '#6366F1',
    primaryDark: '#4338CA',
    primaryLight: '#818CF8',
    secondary: '#10B981',
    accent: '#F59E0B',
    ai: '#8B5CF6',
    danger: '#EF4444',
  },
  gradient: {
    hero: ['#0F172A', '#1E1B4B', '#312E81'] as const,
    card: ['#FFFFFF', '#F8FAFC'] as const,
    ai: ['#8B5CF6', '#6366F1'] as const,
    success: ['#10B981', '#059669'] as const,
  },
  background: {
    default: '#F1F5F9',
    paper: '#FFFFFF',
    elevated: '#FFFFFF',
    dark: '#0F172A',
    glass: 'rgba(255, 255, 255, 0.72)',
    glassBorder: 'rgba(255, 255, 255, 0.35)',
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
  chart: ['#6366F1', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444', '#06B6D4'] as const,
} as const
