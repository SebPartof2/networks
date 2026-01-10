import { Hono } from 'hono';
import { Env, User, Station, Substation, MajorNetwork, Feedback, FeedbackWithUser, SAuthUserInfo, TMA, TMAStatus, StationGroup, StationWithTMA, SubstationWithNetwork } from '../types';
import { authMiddleware, adminMiddleware } from '../middleware/auth';

const app = new Hono<{ Bindings: Env; Variables: { user: User; userInfo: SAuthUserInfo } }>();

// All routes require authentication and admin access
app.use('*', authMiddleware);
app.use('*', adminMiddleware);

// ============ STATIONS ============

// Create station
app.post('/stations', async (c) => {
  const body = await c.req.json<{
    callsign: string;
    station_number: number;
    marketing_name: string;
    logo_url?: string;
    tma_id: number;
    station_group_id?: number | null;
  }>();

  if (!body.callsign || !body.station_number || !body.marketing_name || !body.tma_id) {
    return c.json({ error: 'Bad Request', message: 'Missing required fields' }, 400);
  }

  const result = await c.env.DB.prepare(`
    INSERT INTO stations (callsign, station_number, marketing_name, logo_url, tma_id, station_group_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(body.callsign, body.station_number, body.marketing_name, body.logo_url || null, body.tma_id, body.station_group_id || null).run();

  const station = await c.env.DB.prepare('SELECT * FROM stations WHERE id = ?')
    .bind(result.meta.last_row_id)
    .first<Station>();

  return c.json(station, 201);
});

// Update station
app.put('/stations/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json<{
    callsign?: string;
    station_number?: number;
    marketing_name?: string;
    logo_url?: string | null;
    tma_id?: number;
    station_group_id?: number | null;
  }>();

  const existing = await c.env.DB.prepare('SELECT * FROM stations WHERE id = ?').bind(id).first<Station>();
  if (!existing) {
    return c.json({ error: 'Not Found', message: 'Station not found' }, 404);
  }

  await c.env.DB.prepare(`
    UPDATE stations SET
      callsign = ?,
      station_number = ?,
      marketing_name = ?,
      logo_url = ?,
      tma_id = ?,
      station_group_id = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).bind(
    body.callsign ?? existing.callsign,
    body.station_number ?? existing.station_number,
    body.marketing_name ?? existing.marketing_name,
    body.logo_url !== undefined ? body.logo_url : existing.logo_url,
    body.tma_id ?? existing.tma_id,
    body.station_group_id !== undefined ? body.station_group_id : existing.station_group_id,
    id
  ).run();

  const station = await c.env.DB.prepare('SELECT * FROM stations WHERE id = ?').bind(id).first<Station>();
  return c.json(station);
});

// Delete station
app.delete('/stations/:id', async (c) => {
  const id = c.req.param('id');

  const existing = await c.env.DB.prepare('SELECT * FROM stations WHERE id = ?').bind(id).first<Station>();
  if (!existing) {
    return c.json({ error: 'Not Found', message: 'Station not found' }, 404);
  }

  await c.env.DB.prepare('DELETE FROM stations WHERE id = ?').bind(id).run();
  return c.json({ success: true });
});

// ============ SUBSTATIONS ============

// Create substation
app.post('/substations', async (c) => {
  const body = await c.req.json<{
    station_id?: number | null;
    station_group_id?: number | null;
    number: number;
    marketing_name: string;
    major_network_id?: number | null;
  }>();

  if (!body.number || !body.marketing_name) {
    return c.json({ error: 'Bad Request', message: 'Missing required fields' }, 400);
  }

  // Must have exactly one of station_id or station_group_id
  if ((!body.station_id && !body.station_group_id) || (body.station_id && body.station_group_id)) {
    return c.json({ error: 'Bad Request', message: 'Must specify exactly one of station_id or station_group_id' }, 400);
  }

  // Verify station or station group exists
  if (body.station_id) {
    const station = await c.env.DB.prepare('SELECT * FROM stations WHERE id = ?').bind(body.station_id).first();
    if (!station) {
      return c.json({ error: 'Bad Request', message: 'Station not found' }, 400);
    }
  } else if (body.station_group_id) {
    const group = await c.env.DB.prepare('SELECT * FROM station_groups WHERE id = ?').bind(body.station_group_id).first();
    if (!group) {
      return c.json({ error: 'Bad Request', message: 'Station group not found' }, 400);
    }
  }

  const result = await c.env.DB.prepare(`
    INSERT INTO substations (station_id, station_group_id, number, marketing_name, major_network_id)
    VALUES (?, ?, ?, ?, ?)
  `).bind(body.station_id || null, body.station_group_id || null, body.number, body.marketing_name, body.major_network_id || null).run();

  const substation = await c.env.DB.prepare('SELECT * FROM substations WHERE id = ?')
    .bind(result.meta.last_row_id)
    .first<Substation>();

  return c.json(substation, 201);
});

// Update substation
app.put('/substations/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json<{
    number?: number;
    marketing_name?: string;
    major_network_id?: number | null;
  }>();

  const existing = await c.env.DB.prepare('SELECT * FROM substations WHERE id = ?').bind(id).first<Substation>();
  if (!existing) {
    return c.json({ error: 'Not Found', message: 'Substation not found' }, 404);
  }

  await c.env.DB.prepare(`
    UPDATE substations SET
      number = ?,
      marketing_name = ?,
      major_network_id = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).bind(
    body.number ?? existing.number,
    body.marketing_name ?? existing.marketing_name,
    body.major_network_id !== undefined ? body.major_network_id : existing.major_network_id,
    id
  ).run();

  const substation = await c.env.DB.prepare('SELECT * FROM substations WHERE id = ?').bind(id).first<Substation>();
  return c.json(substation);
});

// Delete substation
app.delete('/substations/:id', async (c) => {
  const id = c.req.param('id');

  const existing = await c.env.DB.prepare('SELECT * FROM substations WHERE id = ?').bind(id).first<Substation>();
  if (!existing) {
    return c.json({ error: 'Not Found', message: 'Substation not found' }, 404);
  }

  await c.env.DB.prepare('DELETE FROM substations WHERE id = ?').bind(id).run();
  return c.json({ success: true });
});

// ============ NETWORKS ============

// Create network
app.post('/networks', async (c) => {
  const body = await c.req.json<{
    short_name: string;
    long_name: string;
    logo_url?: string;
  }>();

  if (!body.short_name || !body.long_name) {
    return c.json({ error: 'Bad Request', message: 'Missing required fields' }, 400);
  }

  const result = await c.env.DB.prepare(`
    INSERT INTO major_networks (short_name, long_name, logo_url)
    VALUES (?, ?, ?)
  `).bind(body.short_name, body.long_name, body.logo_url || null).run();

  const network = await c.env.DB.prepare('SELECT * FROM major_networks WHERE id = ?')
    .bind(result.meta.last_row_id)
    .first<MajorNetwork>();

  return c.json(network, 201);
});

// Update network
app.put('/networks/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json<{
    short_name?: string;
    long_name?: string;
    logo_url?: string | null;
  }>();

  const existing = await c.env.DB.prepare('SELECT * FROM major_networks WHERE id = ?').bind(id).first<MajorNetwork>();
  if (!existing) {
    return c.json({ error: 'Not Found', message: 'Network not found' }, 404);
  }

  await c.env.DB.prepare(`
    UPDATE major_networks SET
      short_name = ?,
      long_name = ?,
      logo_url = ?
    WHERE id = ?
  `).bind(
    body.short_name ?? existing.short_name,
    body.long_name ?? existing.long_name,
    body.logo_url !== undefined ? body.logo_url : existing.logo_url,
    id
  ).run();

  const network = await c.env.DB.prepare('SELECT * FROM major_networks WHERE id = ?').bind(id).first<MajorNetwork>();
  return c.json(network);
});

// Delete network
app.delete('/networks/:id', async (c) => {
  const id = c.req.param('id');

  const existing = await c.env.DB.prepare('SELECT * FROM major_networks WHERE id = ?').bind(id).first<MajorNetwork>();
  if (!existing) {
    return c.json({ error: 'Not Found', message: 'Network not found' }, 404);
  }

  // Check if network is in use
  const inUse = await c.env.DB.prepare('SELECT COUNT(*) as count FROM substations WHERE major_network_id = ?')
    .bind(id)
    .first<{ count: number }>();

  if (inUse && inUse.count > 0) {
    return c.json({ error: 'Conflict', message: 'Network is in use by substations' }, 409);
  }

  await c.env.DB.prepare('DELETE FROM major_networks WHERE id = ?').bind(id).run();
  return c.json({ success: true });
});

// ============ USERS ============

// List all users
app.get('/users', async (c) => {
  const users = await c.env.DB.prepare(`
    SELECT id, email, given_name, family_name, is_admin, created_at, updated_at
    FROM users ORDER BY created_at DESC
  `).all<User>();

  return c.json(users.results.map(u => ({ ...u, is_admin: u.is_admin === 1 })));
});

// Update user (toggle admin status)
app.patch('/users/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json<{ is_admin: boolean }>();

  const existing = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(id).first<User>();
  if (!existing) {
    return c.json({ error: 'Not Found', message: 'User not found' }, 404);
  }

  await c.env.DB.prepare(`
    UPDATE users SET is_admin = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
  `).bind(body.is_admin ? 1 : 0, id).run();

  const user = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(id).first<User>();
  return c.json({ ...user, is_admin: user!.is_admin === 1 });
});

// ============ FEEDBACK ============

// List all feedback
app.get('/feedback', async (c) => {
  const status = c.req.query('status');

  let sql = `
    SELECT f.*, u.email as user_email, u.given_name as user_given_name, u.family_name as user_family_name
    FROM feedback f
    JOIN users u ON f.user_id = u.id
  `;
  const params: string[] = [];

  if (status) {
    sql += ' WHERE f.status = ?';
    params.push(status);
  }

  sql += ' ORDER BY f.created_at DESC';

  let stmt = c.env.DB.prepare(sql);
  if (params.length > 0) {
    stmt = stmt.bind(...params);
  }

  const feedback = await stmt.all<FeedbackWithUser>();
  return c.json(feedback.results);
});

// Update feedback status
app.patch('/feedback/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json<{ status: 'pending' | 'approved' | 'rejected' }>();

  if (!['pending', 'approved', 'rejected'].includes(body.status)) {
    return c.json({ error: 'Bad Request', message: 'Invalid status' }, 400);
  }

  const existing = await c.env.DB.prepare('SELECT * FROM feedback WHERE id = ?').bind(id).first<Feedback>();
  if (!existing) {
    return c.json({ error: 'Not Found', message: 'Feedback not found' }, 404);
  }

  await c.env.DB.prepare('UPDATE feedback SET status = ? WHERE id = ?').bind(body.status, id).run();

  const feedback = await c.env.DB.prepare('SELECT * FROM feedback WHERE id = ?').bind(id).first<Feedback>();
  return c.json(feedback);
});

// ============ TMAs ============

// Update TMA status
app.patch('/tmas/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json<{ status: TMAStatus }>();

  const validStatuses: TMAStatus[] = ['not_implemented', 'in_progress', 'complete'];
  if (!validStatuses.includes(body.status)) {
    return c.json({ error: 'Bad Request', message: 'Invalid status' }, 400);
  }

  const existing = await c.env.DB.prepare('SELECT * FROM tmas WHERE id = ?').bind(id).first<TMA>();
  if (!existing) {
    return c.json({ error: 'Not Found', message: 'TMA not found' }, 404);
  }

  await c.env.DB.prepare('UPDATE tmas SET status = ? WHERE id = ?').bind(body.status, id).run();

  const tma = await c.env.DB.prepare('SELECT * FROM tmas WHERE id = ?').bind(id).first<TMA>();
  return c.json(tma);
});

// ============ STATION GROUPS ============

// List all station groups
app.get('/station-groups', async (c) => {
  const groups = await c.env.DB.prepare('SELECT * FROM station_groups ORDER BY name').all<StationGroup>();
  return c.json(groups.results);
});

// Get station group by ID with stations and substations
app.get('/station-groups/:id', async (c) => {
  const id = c.req.param('id');

  const group = await c.env.DB.prepare('SELECT * FROM station_groups WHERE id = ?')
    .bind(id)
    .first<StationGroup>();

  if (!group) {
    return c.json({ error: 'Not Found', message: 'Station group not found' }, 404);
  }

  // Get stations in this group
  const stations = await c.env.DB.prepare(`
    SELECT s.*, t.name as tma_name
    FROM stations s
    JOIN tmas t ON s.tma_id = t.id
    WHERE s.station_group_id = ?
    ORDER BY t.name, s.station_number
  `).bind(id).all<StationWithTMA>();

  // Get substations belonging to this group
  const substations = await c.env.DB.prepare(`
    SELECT
      sub.*,
      mn.short_name as network_short_name,
      mn.long_name as network_long_name,
      mn.logo_url as network_logo_url
    FROM substations sub
    LEFT JOIN major_networks mn ON sub.major_network_id = mn.id
    WHERE sub.station_group_id = ?
    ORDER BY sub.number
  `).bind(id).all<SubstationWithNetwork>();

  return c.json({
    ...group,
    stations: stations.results,
    substations: substations.results,
  });
});

// Create station group
app.post('/station-groups', async (c) => {
  const body = await c.req.json<{
    name: string;
    logo_url?: string;
  }>();

  if (!body.name) {
    return c.json({ error: 'Bad Request', message: 'Missing required fields' }, 400);
  }

  const result = await c.env.DB.prepare(`
    INSERT INTO station_groups (name, logo_url)
    VALUES (?, ?)
  `).bind(body.name, body.logo_url || null).run();

  const group = await c.env.DB.prepare('SELECT * FROM station_groups WHERE id = ?')
    .bind(result.meta.last_row_id)
    .first<StationGroup>();

  return c.json(group, 201);
});

// Update station group
app.put('/station-groups/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json<{
    name?: string;
    logo_url?: string | null;
  }>();

  const existing = await c.env.DB.prepare('SELECT * FROM station_groups WHERE id = ?').bind(id).first<StationGroup>();
  if (!existing) {
    return c.json({ error: 'Not Found', message: 'Station group not found' }, 404);
  }

  await c.env.DB.prepare(`
    UPDATE station_groups SET
      name = ?,
      logo_url = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).bind(
    body.name ?? existing.name,
    body.logo_url !== undefined ? body.logo_url : existing.logo_url,
    id
  ).run();

  const group = await c.env.DB.prepare('SELECT * FROM station_groups WHERE id = ?').bind(id).first<StationGroup>();
  return c.json(group);
});

// Delete station group
app.delete('/station-groups/:id', async (c) => {
  const id = c.req.param('id');

  const existing = await c.env.DB.prepare('SELECT * FROM station_groups WHERE id = ?').bind(id).first<StationGroup>();
  if (!existing) {
    return c.json({ error: 'Not Found', message: 'Station group not found' }, 404);
  }

  // Check if group has stations
  const hasStations = await c.env.DB.prepare('SELECT COUNT(*) as count FROM stations WHERE station_group_id = ?')
    .bind(id)
    .first<{ count: number }>();

  if (hasStations && hasStations.count > 0) {
    return c.json({ error: 'Conflict', message: 'Station group has stations assigned to it' }, 409);
  }

  // Check if group has substations
  const hasSubstations = await c.env.DB.prepare('SELECT COUNT(*) as count FROM substations WHERE station_group_id = ?')
    .bind(id)
    .first<{ count: number }>();

  if (hasSubstations && hasSubstations.count > 0) {
    return c.json({ error: 'Conflict', message: 'Station group has substations assigned to it' }, 409);
  }

  await c.env.DB.prepare('DELETE FROM station_groups WHERE id = ?').bind(id).run();
  return c.json({ success: true });
});

export default app;
