import crypto from 'crypto'

const AUTH_SECRET = process.env.AUTH_SECRET || 'sco207-dev-secret'

function base64UrlEncode(value) {
  return Buffer.from(value).toString('base64url')
}

function base64UrlDecode(value) {
  return Buffer.from(value, 'base64url').toString('utf8')
}

function signPayload(payload) {
  return crypto.createHmac('sha256', AUTH_SECRET).update(payload).digest('base64url')
}

export function createAuthToken(user) {
  const payload = JSON.stringify({
    id: user.id,
    username: user.username,
    fullName: user.fullName,
    role: user.role,
    studentId: user.studentId || null,
    exp: Date.now() + 1000 * 60 * 60 * 12,
  })

  const encodedPayload = base64UrlEncode(payload)
  const signature = signPayload(encodedPayload)
  return `${encodedPayload}.${signature}`
}

export function verifyAuthToken(token) {
  if (!token || typeof token !== 'string') {
    return null
  }

  const [encodedPayload, signature] = token.split('.')
  if (!encodedPayload || !signature) {
    return null
  }

  const expectedSignature = signPayload(encodedPayload)
  if (expectedSignature !== signature) {
    return null
  }

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload))
    if (!payload.exp || payload.exp < Date.now()) {
      return null
    }

    return payload
  } catch {
    return null
  }
}

export function getAuthTokenFromRequest(req) {
  const authorization = req.headers.authorization || ''
  if (authorization.startsWith('Bearer ')) {
    return authorization.slice(7)
  }

  return req.headers['x-auth-token'] || null
}

export function requireAuth(req, res, next) {
  const token = getAuthTokenFromRequest(req)
  const payload = verifyAuthToken(token)

  if (!payload) {
    return res.status(401).json({ message: 'Authentication required' })
  }

  req.user = payload
  return next()
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' })
    }

    if (roles.length > 0 && !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'You do not have permission to access this resource' })
    }

    return next()
  }
}
