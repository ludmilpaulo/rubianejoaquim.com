import React from 'react'
import { View, ActivityIndicator, StyleSheet } from 'react-native'
import { Text } from 'react-native-paper'
import { getDeviceLocale, translateForLocale } from '../i18n'

export default function LoadingScreen() {
  const label = translateForLocale(getDeviceLocale(), 'common.loading')
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#6366f1" />
      <Text style={styles.text}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  text: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
})
