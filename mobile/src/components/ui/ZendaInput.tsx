import React from 'react'
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native'
import { TextInput, type TextInputProps } from 'react-native-paper'
import { colors, radius, spacing } from '../../theme'

interface ZendaInputProps extends TextInputProps {
  containerStyle?: StyleProp<ViewStyle>
}

export default function ZendaInput({
  containerStyle,
  style,
  outlineColor = colors.border.light,
  activeOutlineColor = colors.brand.primary,
  mode = 'outlined',
  ...rest
}: ZendaInputProps) {
  return (
    <View style={containerStyle}>
      <TextInput
        mode={mode}
        outlineColor={outlineColor}
        activeOutlineColor={activeOutlineColor}
        style={[styles.input, style]}
        outlineStyle={styles.outline}
        {...rest}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: colors.background.paper,
    marginBottom: spacing.md,
  },
  outline: {
    borderRadius: radius.md,
  },
})
