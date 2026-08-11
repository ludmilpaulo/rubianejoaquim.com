import React from 'react'
import { StyleSheet, View } from 'react-native'
import { getDeviceLocale, translateForLocale } from '../i18n'
import { ZendaLoading } from '../components/ui/ZendaLoader'
import { colors } from '../theme'

export default function LoadingScreen() {
  const label = translateForLocale(getDeviceLocale(), 'loading.app')
  return (
    <View style={styles.container}>
      <ZendaLoading visible fill message={label} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.default,
  },
})
