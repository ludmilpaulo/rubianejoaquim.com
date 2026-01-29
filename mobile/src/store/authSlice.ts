import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import { User, AuthState } from '../types'
import { authApi, accessApi } from '../services/api'
import AsyncStorage from '@react-native-async-storage/async-storage'

const initialState: AuthState = {
  user: null,
  token: null,
  isLoading: true,
  hasPaidAccess: false,
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
    } catch (error: any) {
      // Extract specific error message
      // The authApi.login already throws Error objects with descriptive messages
      let errorMessage = 'Erro ao fazer login'
      
      console.log('🔴 authSlice login error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        code: error.code,
      })
      
      // First check if it's an Error object with a message (from authApi.login)
      if (error.message) {
        errorMessage = error.message
      } 
      // Then check response data (for direct API errors)
      else if (error.response?.data) {
        if (error.response.data.email) {
          errorMessage = Array.isArray(error.response.data.email) 
            ? error.response.data.email[0] 
            : error.response.data.email
        } else if (error.response.data.password) {
          errorMessage = Array.isArray(error.response.data.password) 
            ? error.response.data.password[0] 
            : error.response.data.password
        } else if (error.response.data.non_field_errors) {
          errorMessage = Array.isArray(error.response.data.non_field_errors) 
            ? error.response.data.non_field_errors[0] 
            : error.response.data.non_field_errors
        } else if (error.response.data.error) {
          errorMessage = error.response.data.error
        }
      }
      
      console.log('📤 Rejecting with error message:', errorMessage)
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
      const result = await authApi.register(data)
      await AsyncStorage.setItem('token', result.token)
      await AsyncStorage.setItem('user', JSON.stringify(result.user))
      return { user: result.user, token: result.token }
    } catch (error: any) {
      let errorMessage = 'Erro ao criar conta.'
      if (error.response?.data) {
        const d = error.response.data
        if (d.email) errorMessage = Array.isArray(d.email) ? d.email[0] : d.email
        else if (d.username) errorMessage = Array.isArray(d.username) ? d.username[0] : d.username
        else if (d.password) errorMessage = Array.isArray(d.password) ? d.password[0] : d.password
        else if (d.non_field_errors) errorMessage = Array.isArray(d.non_field_errors) ? d.non_field_errors[0] : d.non_field_errors
      } else if (error.message) errorMessage = error.message
      return rejectWithValue(errorMessage)
    }
  }
)

export const checkAuth = createAsyncThunk('auth/checkAuth', async () => {
  const token = await AsyncStorage.getItem('token')
  if (!token) {
    return { user: null, token: null, hasPaidAccess: false }
  }
  
  try {
    const user = await authApi.me()
    const hasPaidAccess = await accessApi.checkPaidAccess()
    return { user, token, hasPaidAccess }
  } catch (error) {
    await AsyncStorage.removeItem('token')
    await AsyncStorage.removeItem('user')
    return { user: null, token: null, hasPaidAccess: false }
  }
})

export const checkPaidAccess = createAsyncThunk('auth/checkPaidAccess', async () => {
  return await accessApi.checkPaidAccess()
})

export const logout = createAsyncThunk('auth/logout', async () => {
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
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.isLoading = true
      })
      .addCase(login.fulfilled, (state, action) => {
        state.user = action.payload.user
        state.token = action.payload.token
        state.isLoading = false
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
        state.isLoading = false
      })
      .addCase(checkAuth.rejected, (state) => {
        state.isLoading = false
        state.user = null
        state.token = null
        state.hasPaidAccess = false
      })
      .addCase(checkPaidAccess.fulfilled, (state, action) => {
        state.hasPaidAccess = action.payload
      })
      .addCase(logout.fulfilled, (state) => {
        state.user = null
        state.token = null
        state.hasPaidAccess = false
      })
  },
})

export default authSlice.reducer
