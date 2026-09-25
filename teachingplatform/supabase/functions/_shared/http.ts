export const allowedOrigin = Deno.env.get('ALLOWED_ORIGIN') ?? 'http://localhost:5173'
export const corsHeaders = {
  'Access-Control-Allow-Origin': allowedOrigin,
  'Access-Control-Allow-Headers': 'content-type, x-device-id, x-device-fingerprint',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Credentials': 'true',
  'Vary': 'Origin',
}
export function json(body: unknown, status = 200, headers: HeadersInit = {}) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json', ...headers } })
}
export function cookie(name: string, value: string, maxAge = 60 * 60 * 24 * 30, httpOnly = true) {
  return `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; SameSite=None; Secure${httpOnly ? '; HttpOnly' : ''}`
}
export function readCookie(req: Request, name: string) {
  const match = req.headers.get('cookie')?.split(';').map(v => v.trim()).find(v => v.startsWith(`${name}=`))
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null
}
export async function sha256(value: string) {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(hash)).map(v => v.toString(16).padStart(2, '0')).join('')
}
