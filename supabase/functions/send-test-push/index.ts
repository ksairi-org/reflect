// @openapi-internal — dev-only helper, not callable from production clients
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

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return new Response('Unauthorized', { status: 401 })

  const { fcm_token } = await req.json()
  if (!fcm_token) return new Response('Missing fcm_token', { status: 400 })

  const accessToken = await getFirebaseAccessToken()

  const res = await fetch(
    `https://fcm.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/messages:send`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: {
          token: fcm_token,
          notification: {
            title: 'Reflect',
            body: '🧪 Test push — pipeline is working.',
          },
        },
      }),
    },
  )

  if (!res.ok) {
    const err = await res.text()
    return new Response(err, { status: 500 })
  }

  return new Response('ok')
})
