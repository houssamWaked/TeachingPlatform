import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { readCookie, sha256 } from './http.ts'

const projectUrl = Deno.env.get('SUPABASE_URL')!
const secretKeys = Deno.env.get('SUPABASE_SECRET_KEYS')
const secretKey = secretKeys
  ? (JSON.parse(secretKeys) as Record<string, string>).default
  : undefined
const serviceKey = secretKey ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
if (!serviceKey) throw new Error('A Supabase server API key is not configured.')

export const db = createClient(projectUrl, serviceKey, { auth: { persistSession: false } })

export async function requireStudent(req: Request) {
  const rawToken = readCookie(req, 'lp_session')
  const deviceId = req.headers.get('x-device-fingerprint')
  if (!rawToken || !deviceId) throw new Response('Missing session', { status: 401 })
  const tokenHash = await sha256(rawToken)
  const { data, error } = await db.from('students').select('id,name,device_id,codes!students_code_id_fkey(code)').eq('session_token', tokenHash).maybeSingle()
  if (error || !data) throw new Response('Invalid session', { status: 401 })
  if (data.device_id !== deviceId) throw new Response('This account is locked to another device.', { status: 403 })
  return data as { id: string; name: string; device_id: string; codes: { code: string } }
}

export async function requireAdmin(req: Request) {
  const supplied = readCookie(req, 'lp_admin')
  const expected = await sha256(`lesson-portal-admin:${Deno.env.get('ADMIN_PASSWORD') ?? ''}`)
  if (!supplied || supplied !== expected) throw new Response('Unauthorized', { status: 401 })
}
