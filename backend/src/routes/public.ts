import { Hono } from 'hono';
import { Env, TMA, MajorNetwork, StationWithTMA, StationWithSubstations, SubstationWithNetwork, StationGroup } from '../types';

const app = new Hono<{ Bindings: Env }>();

// Helper to replace callsign placeholders in marketing names
// {CALL} = full callsign (e.g., "KTVH-TV")
// {CALL4} = first 4 characters (e.g., "KTVH")
function replaceCallsignPlaceholders(marketingName: string, callsign: string): string {
  return marketingName
    .replace(/\{CALL\}/g, callsign)
    .replace(/\{CALL4\}/g, callsign.substring(0, 4));
}

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

  // Replace callsign placeholders in group substations
  const processedSubstations = substations.results.map(sub => {
    if (sub.station_group_id) {
      return {
        ...sub,
        marketing_name: replaceCallsignPlaceholders(sub.marketing_name, station.callsign),
      };
    }
    return sub;
  });

  const result = {
    ...station,
    substations: processedSubstations,
  };

  return c.json(result);
});

// Get all station groups
app.get('/station-groups', async (c) => {
  const groups = await c.env.DB.prepare('SELECT * FROM station_groups ORDER BY name').all<StationGroup>();
  return c.json(groups.results);
});

// Get all major networks with affiliate counts
app.get('/networks', async (c) => {
  const networks = await c.env.DB.prepare(`
    SELECT
      mn.*,
      (
        SELECT COUNT(*)
        FROM substations sub
        WHERE sub.major_network_id = mn.id AND sub.station_id IS NOT NULL
      ) + (
        SELECT COUNT(*)
        FROM substations sub
        JOIN station_groups sg ON sub.station_group_id = sg.id
        JOIN stations s ON s.station_group_id = sg.id
        WHERE sub.major_network_id = mn.id
      ) as affiliate_count
    FROM major_networks mn
    ORDER BY mn.short_name
  `).all<MajorNetwork & { affiliate_count: number }>();
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
  // Uses UNION to include both direct station substations and group substations
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
      t.name as tma_name,
      0 as is_group_substation
    FROM substations sub
    JOIN stations s ON sub.station_id = s.id
    JOIN tmas t ON s.tma_id = t.id
    WHERE sub.major_network_id = ?

    UNION ALL

    SELECT
      sub.id,
      sub.number,
      sub.marketing_name,
      s.id as station_id,
      s.callsign as station_callsign,
      s.station_number,
      s.marketing_name as station_marketing_name,
      s.logo_url as station_logo_url,
      s.tma_id,
      t.name as tma_name,
      1 as is_group_substation
    FROM substations sub
    JOIN station_groups sg ON sub.station_group_id = sg.id
    JOIN stations s ON s.station_group_id = sg.id
    JOIN tmas t ON s.tma_id = t.id
    WHERE sub.major_network_id = ?

    ORDER BY tma_name, station_number
  `).bind(id, id).all<{
    id: number;
    number: number;
    marketing_name: string;
    station_id: number;
    station_callsign: string;
    station_number: number;
    station_marketing_name: string;
    station_logo_url: string | null;
    tma_id: number;
    tma_name: string;
    is_group_substation: number;
  }>();

  // Process group substations to replace callsign placeholders
  const processedAffiliates = affiliates.results.map(affiliate => {
    if (affiliate.is_group_substation) {
      return {
        ...affiliate,
        marketing_name: replaceCallsignPlaceholders(affiliate.marketing_name, affiliate.station_callsign),
      };
    }
    return affiliate;
  });

  return c.json({
    ...network,
    affiliates: processedAffiliates,
  });
});

export default app;
