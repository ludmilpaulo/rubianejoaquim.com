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
      return rejectWithValue(error.message || 'Erro ao fazer login')
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
