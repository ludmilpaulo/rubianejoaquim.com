import React, { useEffect, useRef } from 'react'
import {
  ActivityIndicator,
  Animated,
  Easing,
  Modal,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native'
import { Text } from 'react-native-paper'
import { colors, motion, radius, spacing } from '../../theme'

const NAVY = colors.background.dark
const GOLD = '#C9A84C'

type Size = 'sm' | 'md' | 'lg'

const SIZE_MAP: Record<Size, { mark: number; font: number; ring: number }> = {
  sm: { mark: 28, font: 14, ring: 36 },
  md: { mark: 48, font: 22, ring: 64 },
  lg: { mark: 72, font: 34, ring: 96 },
}

interface ZendaLoaderProps {
  /** Optional status text under the mark */
  message?: string
  size?: Size
  /** Compact inline row (spinner + text) for buttons / list footers */
  inline?: boolean
  style?: StyleProp<ViewStyle>
  /** Use light text on dark backgrounds */
  inverse?: boolean
}

/** Branded gold-Z / navy loader for inline or embedded use. */
export function ZendaLoader({
  message,
  size = 'md',
  inline = false,
  style,
  inverse = false,
}: ZendaLoaderProps) {
  const pulse = useRef(new Animated.Value(0.55)).current
  const spin = useRef(new Animated.Value(0)).current
  const dims = SIZE_MAP[size]

  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: motion.slow,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.55,
          duration: motion.slow,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    )
    const spinLoop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 1400,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    )
    pulseLoop.start()
    spinLoop.start()
    return () => {
      pulseLoop.stop()
      spinLoop.stop()
    }
  }, [pulse, spin])

  const rotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  })

  if (inline) {
    return (
      <View style={[styles.inlineRow, style]} accessibilityRole="progressbar">
        <ActivityIndicator size="small" color={GOLD} />
        {message ? (
          <Text style={[styles.inlineText, inverse && styles.inverseText]} numberOfLines={2}>
            {message}
          </Text>
        ) : null}
      </View>
    )
  }

  return (
    <View style={[styles.wrap, style]} accessibilityRole="progressbar">
      <View style={[styles.markWrap, { width: dims.ring, height: dims.ring }]}>
        <Animated.View
          style={[
            styles.ring,
            {
              width: dims.ring,
              height: dims.ring,
              borderRadius: dims.ring / 2,
              transform: [{ rotate }],
              opacity: pulse,
            },
          ]}
        />
        <Animated.View
          style={[
            styles.mark,
            {
              width: dims.mark,
              height: dims.mark,
              borderRadius: dims.mark / 2,
              opacity: pulse.interpolate({
                inputRange: [0.55, 1],
                outputRange: [0.85, 1],
              }),
            },
          ]}
        >
          <Text style={[styles.markLetter, { fontSize: dims.font }]}>Z</Text>
        </Animated.View>
      </View>
      {message ? (
        <Text style={[styles.message, inverse && styles.inverseText]} numberOfLines={3}>
          {message}
        </Text>
      ) : null}
    </View>
  )
}

interface ZendaLoadingProps {
  visible: boolean
  message?: string
  /** When true, covers the full screen with a modal overlay */
  fullScreen?: boolean
  /** Non-modal filled container (e.g. first paint of a screen) */
  fill?: boolean
  style?: StyleProp<ViewStyle>
}

/**
 * Full-screen / fill loading state with branded Zenda mark.
 * Prefer `fill` for initial screen loads; `fullScreen` for blocking overlays.
 */
export function ZendaLoading({
  visible,
  message,
  fullScreen = false,
  fill = false,
  style,
}: ZendaLoadingProps) {
  if (!visible) return null

  const content = (
    <View
      style={[
        styles.overlayInner,
        fill && styles.fill,
        !fullScreen && !fill && styles.embedded,
        style,
      ]}
    >
      <ZendaLoader message={message} size={fill || fullScreen ? 'lg' : 'md'} />
    </View>
  )

  if (fullScreen) {
    return (
      <Modal visible transparent animationType="fade" statusBarTranslucent>
        <View style={styles.modalBackdrop}>{content}</View>
      </Modal>
    )
  }

  return content
}

/** Alias matching the deliverable name. */
export const ZendaLoadingView = ZendaLoading

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.lg,
  },
  markWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: 'transparent',
    borderTopColor: GOLD,
    borderRightColor: `${GOLD}66`,
  },
  mark: {
    backgroundColor: NAVY,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: GOLD,
  },
  markLetter: {
    color: GOLD,
    fontWeight: '800',
    letterSpacing: -1,
  },
  message: {
    color: colors.text.secondary,
    fontSize: 15,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 22,
  },
  inverseText: {
    color: colors.text.inverse,
  },
  inlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  inlineText: {
    color: colors.text.secondary,
    fontSize: 14,
    flexShrink: 1,
  },
  overlayInner: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  fill: {
    flex: 1,
    width: '100%',
    backgroundColor: colors.background.default,
  },
  embedded: {
    minHeight: 160,
    borderRadius: radius.lg,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
})

export default ZendaLoader
