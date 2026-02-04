// NCT VIP Portal - Authentication
import { SignJWT, jwtVerify } from 'jose';

const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret');

export async function createToken(payload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(secret);
}

export async function verifyToken(token) {
  try {
    const { payload } = await jwtVerify(token, secret);
    return { valid: true, payload };
  } catch {
    return { valid: false };
  }
}

export function getTokenFromRequest(request) {
  const auth = request.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  return auth.substring(7);
}

export async function authenticate(request) {
  const token = getTokenFromRequest(request);
  if (!token) return null;
  const result = await verifyToken(token);
  return result.valid ? result.payload : null;
}
