import React, { useEffect, useRef } from 'react'
import { Animated, StyleSheet, View, type ViewStyle } from 'react-native'
import { colors, radius } from '../../theme'

interface SkeletonProps {
  width?: number | `${number}%`
  height?: number
  style?: ViewStyle
  borderRadius?: number
}

export default function Skeleton({ width = '100%', height = 16, style, borderRadius = radius.sm }: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.4)).current

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 600, useNativeDriver: true }),
      ]),
    )
    loop.start()
    return () => loop.stop()
  }, [opacity])

  return (
    <Animated.View style={[{ width, height, borderRadius, opacity, backgroundColor: colors.border.light }, style]} />
  )
}

export function DashboardSkeleton() {
  return (
    <View style={styles.wrap}>
      <Skeleton height={120} borderRadius={radius.lg} />
      <View style={styles.row}>
        <Skeleton height={88} style={styles.half} />
        <Skeleton height={88} style={styles.half} />
      </View>
      <Skeleton height={160} borderRadius={radius.lg} />
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { padding: 16, gap: 12 },
  row: { flexDirection: 'row', gap: 12 },
  half: { flex: 1 },
})
