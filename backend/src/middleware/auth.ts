import { Context, Next } from 'hono';
import { Env, User, SAuthUserInfo } from '../types';

const SAUTH_USERINFO_URL = 'https://auth.sebbyk.net/userinfo';

export async function validateToken(token: string): Promise<SAuthUserInfo | null> {
  try {
    const response = await fetch(SAUTH_USERINFO_URL, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      return null;
    }

    return await response.json();
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
  const userInfo = await validateToken(token);

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
  } else {
    // Update user info if changed
    await db.prepare(`
      UPDATE users SET email = ?, given_name = ?, family_name = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(userInfo.email, userInfo.given_name, userInfo.family_name, userInfo.sub).run();
  }

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
