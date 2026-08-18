import React, { useCallback, useRef, useState } from 'react'
import { Alert, StyleSheet, View } from 'react-native'
import { Button, Text } from 'react-native-paper'
import { CameraView, useCameraPermissions } from 'expo-camera'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import type { StackNavigationProp } from '@react-navigation/stack'
import { useI18n } from '../contexts/I18nContext'
import { recognizeReceiptText } from '../utils/receiptOcr'
import { receiptApi } from '../services/api'
import { getApiErrorMessage } from '../types/api'
import ZendaLoader from '../components/ui/ZendaLoader'
import { colors, radius, spacing, typography } from '../theme'
import type { HomeStackParamList } from '../navigation/types'

type Nav = StackNavigationProp<HomeStackParamList, 'ScanReceipt'>

export default function ScanReceiptScreen() {
  const { t } = useI18n()
  const navigation = useNavigation<Nav>()
  const cameraRef = useRef<CameraView>(null)
  const [permission, requestPermission] = useCameraPermissions()
  const [processing, setProcessing] = useState(false)

  const onCapture = useCallback(async () => {
    if (!cameraRef.current || processing) return
    setProcessing(true)
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.85,
        skipProcessing: false,
      })
      if (!photo?.uri) {
        Alert.alert(t('common.error'), t('receipt.captureFailed'))
        return
      }

      const scannedText = await recognizeReceiptText(photo.uri)
      const form = new FormData()
      form.append('file', {
        uri: photo.uri,
        name: `receipt-${Date.now()}.jpg`,
        type: 'image/jpeg',
      } as unknown as Blob)
      if (scannedText) {
        form.append('scanned_text', scannedText)
      }

      const receipt = await receiptApi.upload(form)
      navigation.replace('ReviewReceipt', { receiptId: receipt.id })
    } catch (error) {
      Alert.alert(t('common.error'), getApiErrorMessage(error, t('receipt.uploadFailed')))
    } finally {
      setProcessing(false)
    }
  }, [navigation, processing, t])

  if (!permission) {
    return <ZendaLoader message={t('receipt.cameraLoading')} />
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.message}>{t('receipt.cameraPermission')}</Text>
        <Button mode="contained" onPress={requestPermission}>
          {t('receipt.grantCamera')}
        </Button>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.hint}>{t('receipt.cameraHint')}</Text>
      <View style={styles.cameraWrap}>
        <CameraView ref={cameraRef} style={styles.camera} facing="back" />
        {processing ? (
          <View style={styles.overlay}>
            <ZendaLoader message={t('receipt.scanning')} />
          </View>
        ) : null}
      </View>
      <Button
        mode="contained"
        onPress={onCapture}
        disabled={processing}
        style={styles.captureBtn}
        icon="camera"
      >
        {t('receipt.takePhoto')}
      </Button>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.default,
    padding: spacing.md,
  },
  message: {
    ...typography.body,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  hint: {
    ...typography.caption,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  cameraWrap: {
    flex: 1,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureBtn: {
    marginTop: spacing.md,
  },
})
