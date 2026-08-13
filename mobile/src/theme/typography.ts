/**
 * Professional system type scale.
 * Uses the platform UI font (SF Pro / Roboto) for consistency without an extra font package.
 * Weights and sizes are aligned across Personal / Business / Education / AI / Profile.
 */
export const fontFamily = {
  regular: 'System',
  medium: 'System',
  semibold: 'System',
  bold: 'System',
} as const

export const typography = {
  display: {
    fontFamily: fontFamily.bold,
    fontSize: 28,
    fontWeight: '700' as const,
    letterSpacing: -0.5,
    lineHeight: 34,
  },
  h1: {
    fontFamily: fontFamily.bold,
    fontSize: 24,
    fontWeight: '700' as const,
    letterSpacing: -0.3,
    lineHeight: 30,
  },
  h2: {
    fontFamily: fontFamily.semibold,
    fontSize: 20,
    fontWeight: '600' as const,
    lineHeight: 26,
  },
  h3: {
    fontFamily: fontFamily.semibold,
    fontSize: 17,
    fontWeight: '600' as const,
    lineHeight: 22,
  },
  body: {
    fontFamily: fontFamily.regular,
    fontSize: 15,
    fontWeight: '400' as const,
    lineHeight: 22,
  },
  bodyStrong: {
    fontFamily: fontFamily.semibold,
    fontSize: 15,
    fontWeight: '600' as const,
    lineHeight: 22,
  },
  caption: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    fontWeight: '400' as const,
    lineHeight: 18,
  },
  label: {
    fontFamily: fontFamily.semibold,
    fontSize: 12,
    fontWeight: '600' as const,
    letterSpacing: 0.4,
    lineHeight: 16,
  },
  overline: {
    fontFamily: fontFamily.bold,
    fontSize: 11,
    fontWeight: '700' as const,
    letterSpacing: 1.2,
    textTransform: 'uppercase' as const,
    lineHeight: 14,
  },
  button: {
    fontFamily: fontFamily.bold,
    fontSize: 15,
    fontWeight: '700' as const,
    letterSpacing: 0.2,
    lineHeight: 20,
  },
  figure: {
    fontFamily: fontFamily.bold,
    fontSize: 22,
    fontWeight: '700' as const,
    letterSpacing: -0.4,
    lineHeight: 28,
  },
} as const
