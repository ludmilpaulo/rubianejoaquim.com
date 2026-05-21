import AsyncStorage from '@react-native-async-storage/async-storage'
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

const THEME_STORAGE_KEY = 'ZENDA_THEME_MODE'

interface AppAppearanceContextValue {
  isDarkMode: boolean
  setDarkMode: (enabled: boolean) => Promise<void>
  ready: boolean
}

const AppAppearanceContext = createContext<AppAppearanceContextValue | null>(null)

export function AppAppearanceProvider({ children }: { children: ReactNode }) {
  const [isDarkMode, setDarkModeState] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    AsyncStorage.getItem(THEME_STORAGE_KEY)
      .then((stored) => {
        setDarkModeState(stored === 'dark')
      })
      .finally(() => setReady(true))
  }, [])

  const setDarkMode = useCallback(async (enabled: boolean) => {
    setDarkModeState(enabled)
    await AsyncStorage.setItem(THEME_STORAGE_KEY, enabled ? 'dark' : 'light')
  }, [])

  const value = useMemo(
    () => ({
      isDarkMode,
      setDarkMode,
      ready,
    }),
    [isDarkMode, ready, setDarkMode],
  )

  return <AppAppearanceContext.Provider value={value}>{children}</AppAppearanceContext.Provider>
}

export function useAppAppearance() {
  const ctx = useContext(AppAppearanceContext)
  if (!ctx) throw new Error('useAppAppearance must be used within AppAppearanceProvider')
  return ctx
}
