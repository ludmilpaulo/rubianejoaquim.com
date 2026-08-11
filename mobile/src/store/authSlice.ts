import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import { User, AuthState } from '../types'
import { authApi, accessApi } from '../services/api'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { getApiErrorMessage, type PaidAccessResult } from '../types/api'
import { logger } from '../utils/logger'
import { getDefaultCurrency } from '../utils/currency'
import { getDeviceRegionCode } from '../utils/deviceRegion'
import { getDeviceLocale } from '../i18n'
import { ZENDA_PENDING_REF_KEY } from '../navigation/linking'

const initialState: AuthState = {
  user: null,
  token: null,
  isLoading: true,
  hasPaidAccess: false,
  hasExpiredSubscription: false,
  accessChecked: false,
  planTier: 'premium',
  features: [],
}

// Async thunks
export const login = createAsyncThunk(
  'auth/login',
  async ({ emailOrUsername, password }: { emailOrUsername: string; password: string }, { rejectWithValue }) => {
    try {
      const data = await authApi.login(emailOrUsername, password)
      await AsyncStorage.setItem('token', data.token)
      await AsyncStorage.setItem('user', JSON.stringify(data.user))
      return data
    } catch (error: unknown) {
      const errorMessage = getApiErrorMessage(error, 'api.errors.login.failed')
      logger.error('authSlice login error:', errorMessage)
      return rejectWithValue(errorMessage)
    }
  }
)

export const register = createAsyncThunk(
  'auth/register',
  async (
    data: {
      email: string
      username: string
      password: string
      password_confirm: string
      first_name: string
      last_name: string
      phone?: string
    },
    { rejectWithValue }
  ) => {
    try {
      const referralCode = (await AsyncStorage.getItem(ZENDA_PENDING_REF_KEY))?.trim()
      const result = await authApi.register({
        ...data,
        preferred_currency: getDefaultCurrency(),
        preferred_locale: getDeviceLocale(),
        device_region: getDeviceRegionCode(),
        ...(referralCode ? { referral_code: referralCode } : {}),
      })
      if (referralCode) {
        await AsyncStorage.removeItem(ZENDA_PENDING_REF_KEY)
      }
      await AsyncStorage.setItem('token', result.token)
      await AsyncStorage.setItem('user', JSON.stringify(result.user))
      return { user: result.user, token: result.token }
    } catch (error: unknown) {
      return rejectWithValue(getApiErrorMessage(error, 'api.errors.register.failed'))
    }
  }
)

export const checkAuth = createAsyncThunk('auth/checkAuth', async () => {
  const token = await AsyncStorage.getItem('token')
  if (!token) {
    return { user: null, token: null, hasPaidAccess: false, hasExpiredSubscription: false }
  }
  
  try {
    const user = await authApi.me()
    const access = await accessApi.checkPaidAccess()
    return {
      user,
      token,
      hasPaidAccess: access.hasAccess,
      hasExpiredSubscription: access.hasExpiredSubscription,
      planTier: access.planTier || 'premium',
      features: access.features || [],
    }
  } catch (error) {
    await AsyncStorage.removeItem('token')
    await AsyncStorage.removeItem('user')
    return { user: null, token: null, hasPaidAccess: false, hasExpiredSubscription: false }
  }
})

export const checkPaidAccess = createAsyncThunk('auth/checkPaidAccess', async () => {
  return await accessApi.checkPaidAccess()
})

export const socialSession = createAsyncThunk(
  'auth/socialSession',
  async ({ user, token }: { user: User; token: string }, { rejectWithValue }) => {
    try {
      await AsyncStorage.setItem('token', token)
      await AsyncStorage.setItem('user', JSON.stringify(user))
      return { user, token }
    } catch (error: unknown) {
      return rejectWithValue(getApiErrorMessage(error, 'api.errors.login.failed'))
    }
  }
)

export const logout = createAsyncThunk('auth/logout', async () => {
  try {
    await authApi.logout()
  } catch {
    // ignore
  }
  await AsyncStorage.removeItem('token')
  await AsyncStorage.removeItem('user')

  // Optionally clear biometric credentials on logout (uncomment if desired)
  // import { clearBiometricCredentials } from '../utils/biometric'
  // await clearBiometricCredentials()

  return null
})

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<User | null>) => {
      state.user = action.payload
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.isLoading = true
      })
      .addCase(login.fulfilled, (state, action) => {
        state.user = action.payload.user
        state.token = action.payload.token
        state.isLoading = false
        state.hasPaidAccess = false
        state.hasExpiredSubscription = false
        state.accessChecked = false
      })
      .addCase(socialSession.fulfilled, (state, action) => {
        state.user = action.payload.user
        state.token = action.payload.token
        state.isLoading = false
        state.hasPaidAccess = false
        state.hasExpiredSubscription = false
        state.accessChecked = false
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false
        // Error message is available in action.payload
      })
      .addCase(register.pending, (state) => {
        state.isLoading = true
      })
      .addCase(register.fulfilled, (state, action) => {
        state.user = action.payload.user
        state.token = action.payload.token
        state.isLoading = false
        state.hasPaidAccess = false
        state.hasExpiredSubscription = false
        state.accessChecked = false
      })
      .addCase(register.rejected, (state) => {
        state.isLoading = false
      })
      .addCase(checkAuth.pending, (state) => {
        state.isLoading = true
      })
      .addCase(checkAuth.fulfilled, (state, action) => {
        state.user = action.payload.user
        state.token = action.payload.token
        state.hasPaidAccess = action.payload.hasPaidAccess
        state.hasExpiredSubscription = action.payload.hasExpiredSubscription ?? false
        state.planTier = action.payload.planTier || 'premium'
        state.features = action.payload.features || []
        state.isLoading = false
        state.accessChecked = true
      })
      .addCase(checkAuth.rejected, (state) => {
        state.isLoading = false
        state.user = null
        state.token = null
        state.hasPaidAccess = false
        state.hasExpiredSubscription = false
        state.accessChecked = false
      })
      .addCase(checkPaidAccess.pending, (state) => {
        // Keep UI stable: do not reset accessChecked once it's true
        // (prevents flicker when re-checking access in background).
      })
      .addCase(checkPaidAccess.fulfilled, (state, action) => {
        state.hasPaidAccess = action.payload.hasAccess
        state.hasExpiredSubscription = action.payload.hasExpiredSubscription ?? false
        state.planTier = action.payload.planTier || 'premium'
        state.features = action.payload.features || []
        state.accessChecked = true
      })
      .addCase(logout.fulfilled, (state) => {
        state.user = null
        state.token = null
        state.hasPaidAccess = false
        state.hasExpiredSubscription = false
        state.accessChecked = false
      })
  },
})

export const { setUser } = authSlice.actions
export default authSlice.reducer
