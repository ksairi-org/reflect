// @openapi-internal — cron-triggered, not callable by the app client
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import * as jose from 'https://esm.sh/jose@5'

const FIREBASE_PROJECT_ID = Deno.env.get('FIREBASE_PROJECT_ID')!
const FIREBASE_CLIENT_EMAIL = Deno.env.get('FIREBASE_CLIENT_EMAIL')!
const FIREBASE_PRIVATE_KEY = Deno.env.get('FIREBASE_PRIVATE_KEY')!.replace(/\\n/g, '\n')

async function getFirebaseAccessToken(): Promise<string> {
  const privateKey = await jose.importPKCS8(FIREBASE_PRIVATE_KEY, 'RS256')
  const now = Math.floor(Date.now() / 1000)

  const jwt = await new jose.SignJWT({
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
  })
    .setProtectedHeader({ alg: 'RS256' })
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .setIssuer(FIREBASE_CLIENT_EMAIL)
    .setAudience('https://oauth2.googleapis.com/token')
    .sign(privateKey)

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  })

  const { access_token } = await res.json()
  return access_token
}

function matchesReminderTime(now: Date, timezone: string, hour: number, minute: number): boolean {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  })
  const parts = formatter.formatToParts(now)
  const localHour = parseInt(parts.find(p => p.type === 'hour')!.value)
  const localMinute = parseInt(parts.find(p => p.type === 'minute')!.value)
  return localHour === hour && localMinute === minute
}

async function sendPush(fcmToken: string, accessToken: string): Promise<void> {
  await fetch(`https://fcm.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/messages:send`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: {
        token: fcmToken,
        notification: { title: 'Reflect', body: "Time to jot down today's thoughts." },
        android: { notification: { channel_id: 'default', sound: 'default' } },
        apns: { payload: { aps: { sound: 'default' } } },
      },
    }),
  })
}

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { db: { schema: 'api' } },
  )

  const { data: devices, error } = await supabase
    .from('device_tokens')
    .select('fcm_token, reminder_hour, reminder_minute, timezone')
    .not('reminder_hour', 'is', null)
    .not('reminder_minute', 'is', null)
    .not('timezone', 'is', null)

  if (error) return new Response(error.message, { status: 500 })
  if (!devices?.length) return new Response('ok — no devices with reminders')

  const now = new Date()
  const due = devices.filter(d =>
    matchesReminderTime(now, d.timezone, d.reminder_hour, d.reminder_minute)
  )

  if (!due.length) return new Response('ok — no reminders due now')

  const accessToken = await getFirebaseAccessToken()
  await Promise.all(due.map(d => sendPush(d.fcm_token, accessToken)))

  return new Response(`Sent ${due.length} reminder(s)`)
})
