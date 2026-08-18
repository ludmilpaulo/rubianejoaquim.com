/**
 * On-device OCR via Google ML Kit when available.
 * Falls back to empty string if native module is unavailable (e.g. web).
 */
export async function recognizeReceiptText(imageUri: string): Promise<string> {
  try {
    const TextRecognition = require('@react-native-ml-kit/text-recognition').default
    const result = await TextRecognition.recognize(imageUri)
    if (typeof result === 'string') {
      return result
    }
    if (result?.text) {
      return result.text
    }
    if (Array.isArray(result?.blocks)) {
      return result.blocks.map((b: { text?: string }) => b.text || '').join('\n')
    }
    return ''
  } catch {
    return ''
  }
}
