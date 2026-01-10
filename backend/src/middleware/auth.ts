import { Context, Next } from 'hono';
import { Env, User, SAuthUserInfo } from '../types';

const SAUTH_USERINFO_URL = 'https://auth.sebbyk.net/userinfo';
const TOKEN_CACHE_TTL = 3600; // 1 hour in seconds

// Simple hash function for cache key (don't store raw tokens)
async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function validateToken(token: string, cache: KVNamespace): Promise<SAuthUserInfo | null> {
  const cacheKey = `token:${await hashToken(token)}`;

  // Check cache first
  const cached = await cache.get(cacheKey, 'json');
  if (cached) {
    return cached as SAuthUserInfo;
  }

  // Not in cache, validate with S-Auth
  try {
    const response = await fetch(SAUTH_USERINFO_URL, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      return null;
    }

    const userInfo = await response.json() as SAuthUserInfo;

    // Cache the result for 1 hour
    await cache.put(cacheKey, JSON.stringify(userInfo), { expirationTtl: TOKEN_CACHE_TTL });

    return userInfo;
  } catch {
    return null;
  }
}

export async function authMiddleware(c: Context<{ Bindings: Env; Variables: { user: User; userInfo: SAuthUserInfo } }>, next: Next) {
  const authHeader = c.req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized', message: 'Missing or invalid authorization header' }, 401);
  }

  const token = authHeader.substring(7);
  const userInfo = await validateToken(token, c.env.TOKEN_CACHE);

  if (!userInfo) {
    return c.json({ error: 'Unauthorized', message: 'Invalid or expired token' }, 401);
  }

  // Get or create user in database
  const db = c.env.DB;
  let user = await db.prepare('SELECT * FROM users WHERE id = ?').bind(userInfo.sub).first<User>();

  if (!user) {
    // Create new user
    await db.prepare(`
      INSERT INTO users (id, email, given_name, family_name, is_admin)
      VALUES (?, ?, ?, ?, 0)
    `).bind(userInfo.sub, userInfo.email, userInfo.given_name, userInfo.family_name).run();

    user = await db.prepare('SELECT * FROM users WHERE id = ?').bind(userInfo.sub).first<User>();
  }
  // Note: We no longer update user info on every request - only on first login

  c.set('user', user!);
  c.set('userInfo', userInfo);

  await next();
}

export async function adminMiddleware(c: Context<{ Bindings: Env; Variables: { user: User } }>, next: Next) {
  const user = c.get('user');

  if (!user || user.is_admin !== 1) {
    return c.json({ error: 'Forbidden', message: 'Admin access required' }, 403);
  }

  await next();
}
