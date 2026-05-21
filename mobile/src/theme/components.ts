import { colors } from './colors'
import { radius } from './shadows'
import { spacing } from './spacing'

export const components = {
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chip: {
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  buttonPrimary: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
  },
  header: {
    backgroundColor: colors.primary,
  },
} as const
