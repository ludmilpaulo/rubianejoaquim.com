import React, { Component, type ErrorInfo, type ReactNode } from 'react'
import { View, StyleSheet } from 'react-native'
import { Button, Text } from 'react-native-paper'
import { translateForLocale, getDeviceLocale } from '../i18n'
import { logger } from '../utils/logger'

type Props = {
  children: ReactNode
  fallbackTitle?: string
  fallbackMessage?: string
}

type State = {
  hasError: boolean
}

/**
 * Catches render-time crashes (e.g. misconfigured social auth hooks)
 * so Login/Register still work with email/password.
 */
export default class ScreenErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    logger.error('ScreenErrorBoundary caught error', { error, info })
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.wrap}>
          <Text style={styles.title}>
            {this.props.fallbackTitle || translateForLocale(getDeviceLocale(), 'common.screenErrorTitle')}
          </Text>
          <Text style={styles.body}>
            {this.props.fallbackMessage ||
              translateForLocale(getDeviceLocale(), 'common.screenErrorBody')}
          </Text>
          <Button mode="outlined" onPress={() => this.setState({ hasError: false })}>
            {translateForLocale(getDeviceLocale(), 'common.retry')}
          </Button>
        </View>
      )
    }
    return this.props.children
  }
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 16, gap: 8, paddingVertical: 8 },
  title: { fontWeight: '600', fontSize: 15, color: '#111827' },
  body: { fontSize: 13, color: '#6b7280', marginBottom: 4 },
})
