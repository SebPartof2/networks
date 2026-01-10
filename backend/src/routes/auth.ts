import { Hono } from 'hono';
import { Env, User, Feedback, SAuthUserInfo } from '../types';
import { authMiddleware } from '../middleware/auth';

const app = new Hono<{ Bindings: Env; Variables: { user: User; userInfo: SAuthUserInfo } }>();

// All routes require authentication
app.use('*', authMiddleware);

// Get current user
app.get('/users/me', async (c) => {
  const user = c.get('user');
  return c.json({
    id: user.id,
    email: user.email,
    given_name: user.given_name,
    family_name: user.family_name,
    is_admin: user.is_admin === 1,
    created_at: user.created_at,
  });
});

// Submit feedback
app.post('/feedback', async (c) => {
  const user = c.get('user');
  const body = await c.req.json<{ tma_name: string; description?: string }>();

  if (!body.tma_name || body.tma_name.trim() === '') {
    return c.json({ error: 'Bad Request', message: 'TMA name is required' }, 400);
  }

  const result = await c.env.DB.prepare(`
    INSERT INTO feedback (user_id, tma_name, description)
    VALUES (?, ?, ?)
  `).bind(user.id, body.tma_name.trim(), body.description?.trim() || null).run();

  const feedback = await c.env.DB.prepare('SELECT * FROM feedback WHERE id = ?')
    .bind(result.meta.last_row_id)
    .first<Feedback>();

  return c.json(feedback, 201);
});

// Get user's own feedback
app.get('/feedback/mine', async (c) => {
  const user = c.get('user');

  const feedback = await c.env.DB.prepare(`
    SELECT * FROM feedback WHERE user_id = ? ORDER BY created_at DESC
  `).bind(user.id).all<Feedback>();

  return c.json(feedback.results);
});

export default app;
