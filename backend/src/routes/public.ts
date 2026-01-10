import { Hono } from 'hono';
import { Env, TMA, MajorNetwork, StationWithTMA, StationWithSubstations, SubstationWithNetwork, StationGroup } from '../types';

const app = new Hono<{ Bindings: Env }>();

// Get all TMAs
app.get('/tmas', async (c) => {
  const tmas = await c.env.DB.prepare('SELECT * FROM tmas ORDER BY name').all<TMA>();
  return c.json(tmas.results);
});

// Get TMA by ID
app.get('/tmas/:id', async (c) => {
  const id = c.req.param('id');
  const tma = await c.env.DB.prepare('SELECT * FROM tmas WHERE id = ?').bind(id).first<TMA>();

  if (!tma) {
    return c.json({ error: 'Not Found', message: 'TMA not found' }, 404);
  }

  return c.json(tma);
});

// Get stations by TMA
app.get('/tmas/:id/stations', async (c) => {
  const id = c.req.param('id');

  // Verify TMA exists
  const tma = await c.env.DB.prepare('SELECT * FROM tmas WHERE id = ?').bind(id).first<TMA>();
  if (!tma) {
    return c.json({ error: 'Not Found', message: 'TMA not found' }, 404);
  }

  const stations = await c.env.DB.prepare(`
    SELECT s.*, t.name as tma_name
    FROM stations s
    JOIN tmas t ON s.tma_id = t.id
    WHERE s.tma_id = ?
    ORDER BY s.station_number
  `).bind(id).all<StationWithTMA>();

  return c.json({
    tma,
    stations: stations.results,
  });
});

// Search all stations
app.get('/stations', async (c) => {
  const query = c.req.query('q');
  const tmaId = c.req.query('tma_id');

  let sql = `
    SELECT s.*, t.name as tma_name
    FROM stations s
    JOIN tmas t ON s.tma_id = t.id
    WHERE 1=1
  `;
  const params: (string | number)[] = [];

  if (query) {
    sql += ` AND (
      s.callsign LIKE ? OR
      s.marketing_name LIKE ? OR
      CAST(s.station_number AS TEXT) LIKE ?
    )`;
    const searchPattern = `%${query}%`;
    params.push(searchPattern, searchPattern, searchPattern);
  }

  if (tmaId) {
    sql += ` AND s.tma_id = ?`;
    params.push(tmaId);
  }

  sql += ` ORDER BY s.station_number`;

  let stmt = c.env.DB.prepare(sql);
  if (params.length > 0) {
    stmt = stmt.bind(...params);
  }

  const stations = await stmt.all<StationWithTMA>();
  return c.json(stations.results);
});

// Get station by ID with substations
app.get('/stations/:id', async (c) => {
  const id = c.req.param('id');

  const station = await c.env.DB.prepare(`
    SELECT s.*, t.name as tma_name, sg.name as station_group_name
    FROM stations s
    JOIN tmas t ON s.tma_id = t.id
    LEFT JOIN station_groups sg ON s.station_group_id = sg.id
    WHERE s.id = ?
  `).bind(id).first<StationWithTMA & { station_group_name: string | null }>();

  if (!station) {
    return c.json({ error: 'Not Found', message: 'Station not found' }, 404);
  }

  // Get substations - either from the station directly OR from the station's group
  let substations;
  if (station.station_group_id) {
    // Station belongs to a group - get substations from both station and group
    substations = await c.env.DB.prepare(`
      SELECT
        sub.*,
        mn.short_name as network_short_name,
        mn.long_name as network_long_name,
        mn.logo_url as network_logo_url
      FROM substations sub
      LEFT JOIN major_networks mn ON sub.major_network_id = mn.id
      WHERE sub.station_id = ? OR sub.station_group_id = ?
      ORDER BY sub.number
    `).bind(id, station.station_group_id).all<SubstationWithNetwork>();
  } else {
    // No group - just get station's own substations
    substations = await c.env.DB.prepare(`
      SELECT
        sub.*,
        mn.short_name as network_short_name,
        mn.long_name as network_long_name,
        mn.logo_url as network_logo_url
      FROM substations sub
      LEFT JOIN major_networks mn ON sub.major_network_id = mn.id
      WHERE sub.station_id = ?
      ORDER BY sub.number
    `).bind(id).all<SubstationWithNetwork>();
  }

  const result = {
    ...station,
    substations: substations.results,
  };

  return c.json(result);
});

// Get all station groups
app.get('/station-groups', async (c) => {
  const groups = await c.env.DB.prepare('SELECT * FROM station_groups ORDER BY name').all<StationGroup>();
  return c.json(groups.results);
});

// Get all major networks
app.get('/networks', async (c) => {
  const networks = await c.env.DB.prepare('SELECT * FROM major_networks ORDER BY short_name').all<MajorNetwork>();
  return c.json(networks.results);
});

// Get network by ID with affiliates
app.get('/networks/:id', async (c) => {
  const id = c.req.param('id');

  const network = await c.env.DB.prepare('SELECT * FROM major_networks WHERE id = ?')
    .bind(id)
    .first<MajorNetwork>();

  if (!network) {
    return c.json({ error: 'Not Found', message: 'Network not found' }, 404);
  }

  // Get all substations affiliated with this network, including parent station info
  const affiliates = await c.env.DB.prepare(`
    SELECT
      sub.id,
      sub.number,
      sub.marketing_name,
      sub.station_id,
      s.callsign as station_callsign,
      s.station_number,
      s.marketing_name as station_marketing_name,
      s.logo_url as station_logo_url,
      s.tma_id,
      t.name as tma_name
    FROM substations sub
    JOIN stations s ON sub.station_id = s.id
    JOIN tmas t ON s.tma_id = t.id
    WHERE sub.major_network_id = ?
    ORDER BY t.name, s.station_number
  `).bind(id).all();

  return c.json({
    ...network,
    affiliates: affiliates.results,
  });
});

export default app;
