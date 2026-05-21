/** Extract message from Redux Toolkit rejectWithValue / thrown errors. */
export function getThunkErrorMessage(err: unknown, fallback: string): string {
  if (typeof err === 'string') return err
  if (err && typeof err === 'object') {
    if ('payload' in err) {
      const payload = (err as { payload: unknown }).payload
      if (typeof payload === 'string') return payload
      if (payload != null) return JSON.stringify(payload)
    }
    if (err instanceof Error && err.message) return err.message
    if ('message' in err && typeof (err as { message: unknown }).message === 'string') {
      return (err as { message: string }).message
    }
  }
  return fallback
}
