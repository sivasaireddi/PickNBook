import * as SecureStore from 'expo-secure-store'

export const AUTH_SESSION_KEYS = [
  'token',
  'isLoggedIn',
  'user',
  'profileImage',
  'challengeId',
  'role',
  'x-user-id',
  'X-User-Id',
]

export const getStoredAuthToken = () =>
  SecureStore.getItemAsync('token')

export const requireAuthToken = async (
  message = 'Session expired. Please sign in again.'
) => {
  const token = await getStoredAuthToken()

  if (!token) {
    throw new Error(message)
  }

  return token
}

export const clearAuthSession = async () => {
  await Promise.allSettled(
    AUTH_SESSION_KEYS.map((key) =>
      SecureStore.deleteItemAsync(key)
    )
  )
}

const base64Decode = (str) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/='
  let output = ''
  let buffer = 0
  let bits = 0

  const cleaned = str.replace(/[^A-Za-z0-9+/=]/g, '')
  for (let i = 0; i < cleaned.length; i++) {
    const charIndex = chars.indexOf(cleaned.charAt(i))
    if (charIndex < 0 || charIndex === 64) continue
    buffer = (buffer << 6) | charIndex
    bits += 6
    while (bits >= 8) {
      bits -= 8
      output += String.fromCharCode((buffer >>> bits) & 0xff)
    }
  }

  return output
}

export const isJwtExpired = (token) => {
  if (!token || typeof token !== 'string') return true
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return false

    let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    while (base64.length % 4 !== 0) {
      base64 += '='
    }

    const decodedStr = base64Decode(base64)
    const decoded = JSON.parse(decodedStr)
    if (!decoded || typeof decoded.exp !== 'number') return false

    const nowInSeconds = Math.floor(Date.now() / 1000)
    return decoded.exp <= nowInSeconds + 30
  } catch (e) {
    return false
  }
}
