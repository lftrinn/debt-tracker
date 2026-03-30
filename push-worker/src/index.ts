export interface Env {
  PUSH_SUBS: KVNamespace
  /** VAPID private key: raw 32-byte P-256 scalar, base64url encoded */
  VAPID_PRIVATE_KEY: string
  /** VAPID public key: uncompressed 65-byte P-256 point, base64url encoded */
  VAPID_PUBLIC_KEY: string
  /** VAPID subject: mailto: or https: URI */
  VAPID_SUBJECT: string
}

interface StoredSub {
  endpoint: string
  keys: { p256dh: string; auth: string }
}

// ─── Base64url helpers ────────────────────────────────────────────────────

function b64urlToBytes(s: string): Uint8Array {
  const b64 = (s + '='.repeat((4 - (s.length % 4)) % 4))
    .replace(/-/g, '+')
    .replace(/_/g, '/')
  const raw = atob(b64)
  return Uint8Array.from(raw, (c) => c.charCodeAt(0))
}

function bytesToB64url(buf: ArrayBuffer | Uint8Array): string {
  const arr = buf instanceof Uint8Array ? buf : new Uint8Array(buf)
  let s = ''
  arr.forEach((b) => (s += String.fromCharCode(b)))
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

function concat(...parts: Uint8Array[]): Uint8Array {
  const len = parts.reduce((n, a) => n + a.length, 0)
  const out = new Uint8Array(len)
  let off = 0
  for (const p of parts) {
    out.set(p, off)
    off += p.length
  }
  return out
}

// ─── HKDF-SHA-256 (single expand step, output ≤ 32 bytes) ────────────────

async function hkdf(
  salt: Uint8Array,
  ikm: Uint8Array,
  info: Uint8Array,
  len: number
): Promise<Uint8Array> {
  // Extract: PRK = HMAC-SHA256(salt, IKM)
  const saltKey = await crypto.subtle.importKey(
    'raw', salt, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  )
  const prk = new Uint8Array(await crypto.subtle.sign('HMAC', saltKey, ikm))

  // Expand T(1) = HMAC-SHA256(PRK, info || 0x01)
  const prkKey = await crypto.subtle.importKey(
    'raw', prk, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  )
  const t1 = new Uint8Array(
    await crypto.subtle.sign('HMAC', prkKey, concat(info, new Uint8Array([1])))
  )
  return t1.slice(0, len)
}

// ─── VAPID JWT (ES256) ────────────────────────────────────────────────────

async function makeVapidHeader(
  endpoint: string,
  privKeyB64: string,
  pubKeyB64: string,
  subject: string
): Promise<string> {
  const url = new URL(endpoint)
  const audience = `${url.protocol}//${url.host}`
  const exp = Math.floor(Date.now() / 1000) + 43200 // 12h

  const b64Json = (o: object) =>
    btoa(JSON.stringify(o)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
  const sigInput = `${b64Json({ typ: 'JWT', alg: 'ES256' })}.${b64Json({ aud: audience, exp, sub: subject })}`

  // Build JWK from raw private key (d) + uncompressed public key (x, y)
  const pubBytes = b64urlToBytes(pubKeyB64) // 65 bytes: 0x04 | x(32) | y(32)
  const jwk = {
    kty: 'EC',
    crv: 'P-256',
    d: privKeyB64,
    x: bytesToB64url(pubBytes.slice(1, 33)),
    y: bytesToB64url(pubBytes.slice(33, 65)),
  }
  const key = await crypto.subtle.importKey(
    'jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']
  )
  const sig = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    new TextEncoder().encode(sigInput)
  )

  const jwt = `${sigInput}.${bytesToB64url(sig)}`
  return `vapid t=${jwt},k=${pubKeyB64}`
}

// ─── Push payload encryption — RFC 8291 + RFC 8188 (aes128gcm) ───────────

async function encryptPayload(
  sub: StoredSub,
  plaintext: string
): Promise<Uint8Array> {
  const uaPub  = b64urlToBytes(sub.keys.p256dh) // 65 bytes uncompressed P-256
  const auth   = b64urlToBytes(sub.keys.auth)    // 16 bytes

  // Ephemeral server key pair
  const asKP = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']
  )
  const asPubRaw = new Uint8Array(
    await crypto.subtle.exportKey('raw', asKP.publicKey)
  ) // 65 bytes

  // ECDH shared secret (32 bytes)
  const uaKey = await crypto.subtle.importKey(
    'raw', uaPub, { name: 'ECDH', namedCurve: 'P-256' }, true, []
  )
  const ecdhBits = new Uint8Array(
    await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, asKP.privateKey, 256)
  )

  // IKM = HKDF(salt=auth, ikm=ecdhBits, info="WebPush: info\x00" || ua_pub || as_pub, 32)
  const ikmInfo = concat(
    new TextEncoder().encode('WebPush: info\x00'),
    uaPub,
    asPubRaw
  )
  const ikm = await hkdf(auth, ecdhBits, ikmInfo, 32)

  // Random 16-byte salt for CEK/nonce derivation
  const salt = crypto.getRandomValues(new Uint8Array(16))

  // CEK = HKDF(salt, ikm, "Content-Encoding: aes128gcm\x00", 16)
  const cek = await hkdf(
    salt, ikm,
    new TextEncoder().encode('Content-Encoding: aes128gcm\x00'),
    16
  )

  // Nonce = HKDF(salt, ikm, "Content-Encoding: nonce\x00", 12)
  const nonce = await hkdf(
    salt, ikm,
    new TextEncoder().encode('Content-Encoding: nonce\x00'),
    12
  )

  // Encrypt: plaintext + 0x02 (last-record padding delimiter)
  const pt = new TextEncoder().encode(plaintext)
  const record = concat(pt, new Uint8Array([2]))
  const aesKey = await crypto.subtle.importKey('raw', cek, { name: 'AES-GCM' }, false, ['encrypt'])
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, aesKey, record)
  )

  // aes128gcm content header: salt(16) + rs(uint32 BE=4096) + idlen(1=65) + asPub(65)
  const rs = new Uint8Array(4)
  new DataView(rs.buffer).setUint32(0, 4096, false) // big-endian
  return concat(salt, rs, new Uint8Array([65]), asPubRaw, ciphertext)
}

// ─── Send one Web Push message ────────────────────────────────────────────

async function sendPush(sub: StoredSub, payload: string, env: Env): Promise<boolean> {
  try {
    const [body, authHeader] = await Promise.all([
      encryptPayload(sub, payload),
      makeVapidHeader(sub.endpoint, env.VAPID_PRIVATE_KEY, env.VAPID_PUBLIC_KEY, env.VAPID_SUBJECT),
    ])
    const res = await fetch(sub.endpoint, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Encoding': 'aes128gcm',
        'Content-Type': 'application/octet-stream',
        TTL: '86400',
        Urgency: 'normal',
      },
      body,
    })
    // 201 Created or 200/204 = success; 404/410 = expired subscription
    return res.status !== 404 && res.status !== 410
  } catch {
    return true // network error — keep subscription, retry later
  }
}

// ─── KV key for a subscription (based on endpoint hash) ──────────────────

async function subKey(endpoint: string): Promise<string> {
  const hash = new Uint8Array(
    await crypto.subtle.digest('SHA-256', new TextEncoder().encode(endpoint))
  )
  return 'sub:' + bytesToB64url(hash).slice(0, 22)
}

// ─── CORS ─────────────────────────────────────────────────────────────────

function corsHeaders(origin: string | null): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin ?? '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  }
}

function jsonOk(data: unknown, origin: string | null): Response {
  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
  })
}

function jsonErr(msg: string, status: number, origin: string | null): Response {
  return new Response(JSON.stringify({ error: msg }), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
  })
}

// ─── Main fetch handler ───────────────────────────────────────────────────

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    const origin = request.headers.get('Origin')

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) })
    }
    if (request.method !== 'POST') {
      return jsonErr('Method not allowed', 405, origin)
    }

    let body: Record<string, unknown>
    try {
      body = (await request.json()) as Record<string, unknown>
    } catch {
      return jsonErr('Invalid JSON', 400, origin)
    }

    // POST /subscribe — store subscription in KV
    if (url.pathname === '/subscribe') {
      const sub = body as unknown as StoredSub
      if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) {
        return jsonErr('Invalid subscription object', 400, origin)
      }
      const key = await subKey(sub.endpoint)
      await env.PUSH_SUBS.put(key, JSON.stringify(sub))
      return jsonOk({ ok: true }, origin)
    }

    // POST /unsubscribe — remove subscription from KV
    if (url.pathname === '/unsubscribe') {
      const { endpoint } = body as { endpoint?: string }
      if (!endpoint) return jsonErr('Missing endpoint', 400, origin)
      await env.PUSH_SUBS.delete(await subKey(endpoint))
      return jsonOk({ ok: true }, origin)
    }

    // POST /send — send push notification to all subscribers
    if (url.pathname === '/send') {
      const { title, body: msgBody } = body as { title?: string; body?: string }
      if (!title) return jsonErr('Missing title', 400, origin)

      const payload = JSON.stringify({ title, body: msgBody ?? '' })
      const { keys } = await env.PUSH_SUBS.list({ prefix: 'sub:' })

      let sent = 0
      for (const { name } of keys) {
        const raw = await env.PUSH_SUBS.get(name)
        if (!raw) continue
        const sub: StoredSub = JSON.parse(raw)
        const ok = await sendPush(sub, payload, env)
        if (!ok) {
          // 404/410 from push service — subscription expired, remove it
          await env.PUSH_SUBS.delete(name)
        } else {
          sent++
        }
      }

      return jsonOk({ sent, total: keys.length }, origin)
    }

    return jsonErr('Not found', 404, origin)
  },
}
