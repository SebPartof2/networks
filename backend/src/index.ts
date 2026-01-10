import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { Env } from './types';
import publicRoutes from './routes/public';
import authRoutes from './routes/auth';
import adminRoutes from './routes/admin';

const app = new Hono<{ Bindings: Env }>();

// CORS middleware
app.use('*', async (c, next) => {
  const corsMiddleware = cors({
    origin: (origin) => {
      // Allow requests from frontend URL
      const frontendUrl = c.env.FRONTEND_URL || 'http://localhost:5173';
      if (origin === frontendUrl || origin?.startsWith('http://localhost:')) {
        return origin;
      }
      return null;
    },
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });
  return corsMiddleware(c, next);
});

// Health check
app.get('/health', (c) => c.json({ status: 'ok' }));

// Mount routes
app.route('/api', publicRoutes);
app.route('/api', authRoutes);
app.route('/api/admin', adminRoutes);

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Not Found', message: 'The requested resource was not found' }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error('Server error:', err);
  return c.json({ error: 'Internal Server Error', message: 'An unexpected error occurred' }, 500);
});

export default app;
