import React from 'react'
import { StyleSheet, View } from 'react-native'
import { colors, radius } from '../../theme'

interface ProgressBarProps {
  progress: number
  color?: string
  trackColor?: string
  height?: number
}

export default function ProgressBar({
  progress,
  color = colors.brand.primary,
  trackColor = colors.border.light,
  height = 8,
}: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, progress))
  return (
    <View style={[styles.track, { height, backgroundColor: trackColor, borderRadius: radius.full }]}>
      <View
        style={[
          styles.fill,
          {
            width: `${clamped}%`,
            backgroundColor: color,
            borderRadius: radius.full,
          },
        ]}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
  },
})
