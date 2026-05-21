import { Alert } from 'react-native'
import { useI18n } from '../contexts/I18nContext'

/** Alert dialogs with translated titles and resolved message keys */
export function useAlert() {
  const { t, resolve } = useI18n()

  return {
    error: (message: string, title?: string) =>
      Alert.alert(title ?? t('common.error'), resolve(message)),
    success: (message: string, title?: string) =>
      Alert.alert(title ?? t('common.success'), resolve(message)),
    confirm: (
      title: string,
      message: string,
      onConfirm: () => void,
      options?: { confirmLabel?: string; cancelLabel?: string },
    ) =>
      Alert.alert(title, resolve(message), [
        { text: options?.cancelLabel ?? t('common.cancel'), style: 'cancel' },
        { text: options?.confirmLabel ?? t('common.confirm'), onPress: onConfirm },
      ]),
    info: (title: string, message: string) =>
      Alert.alert(title, resolve(message), [{ text: t('common.ok') }]),
  }
}
