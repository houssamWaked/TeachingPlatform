const DEVICE_KEY = 'lesson_portal_device_id'

export async function getDeviceFingerprint() {
  let clientId = localStorage.getItem(DEVICE_KEY)
  if (!clientId) {
    clientId = crypto.randomUUID()
    localStorage.setItem(DEVICE_KEY, clientId)
  }

  // Keep the old fingerprint during the transition so an already-bound code
  // can still be redeemed from the same browser. It must not be used for
  // ongoing session checks because display/browser details can change.
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')
  if (context) {
    context.font = '14px sans-serif'
    context.fillText('Lesson Portal device', 4, 18)
  }
  const legacyInput = [
    clientId,
    navigator.userAgent,
    screen.width,
    screen.height,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    canvas.toDataURL(),
  ].join('|')
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(legacyInput))
  const legacyFingerprint = Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')

  return { clientId, fingerprint: legacyFingerprint, legacyFingerprint }
}
