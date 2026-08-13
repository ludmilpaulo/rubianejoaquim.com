import { Alert, InteractionManager } from 'react-native'
import { useI18n } from '../contexts/I18nContext'

/** Native Alert on top of a Paper Modal crashes Android with "Text strings must be rendered within a <Text>". */
function showAlert(...args: Parameters<typeof Alert.alert>) {
  InteractionManager.runAfterInteractions(() => {
    Alert.alert(...args)
  })
}

/** Alert dialogs with translated titles and resolved message keys */
export function useAlert() {
  const { t, resolve } = useI18n()

  return {
    error: (message: string, title?: string) =>
      showAlert(title ?? t('common.error'), resolve(message)),
    success: (message: string, title?: string) =>
      showAlert(title ?? t('common.success'), resolve(message)),
    confirm: (
      title: string,
      message: string,
      onConfirm: () => void,
      options?: { confirmLabel?: string; cancelLabel?: string },
    ) =>
      showAlert(title, resolve(message), [
        { text: options?.cancelLabel ?? t('common.cancel'), style: 'cancel' },
        { text: options?.confirmLabel ?? t('common.confirm'), onPress: onConfirm },
      ]),
    info: (title: string, message: string) =>
      showAlert(title, resolve(message), [{ text: t('common.ok') }]),
  }
}
