/**
 * Leaderboard API for the lockpicking mini-game. Cloudflare Worker + D1 (SQLite), free tier.
 *
 * GET  /scores?level=expert&seed=abc123&hardened=0&player=…  → the two top 10s
 * POST /scores  { playerId, name, run }                       → saves the run, then the two top 10s
 *
 * A run is only saved once its moves have been replayed on the rebuilt lock (see
 * `src/engine/verify.ts`, shared with the game). Each player keeps their best time per lock.
 */
import { checkRun, cleanPlayerName, isLockLevel, parseRun, type Run } from '../../src/engine/verify';

interface Env {
  DB: D1Database;
  ALLOWED_ORIGINS: string;
}

const TOP = 10;
/** Random id made by the player's browser: never shown, only tells "this is me". */
const PLAYER_ID = /^[A-Za-z0-9-]{8,64}$/;

interface Entry {
  name: string;
  timeMs: number;
  me: boolean;
}

interface Board {
  top: Entry[];
  /** Player's rank on this board (1 = best), `null` if they have no time on it. */
  myRank: number | null;
  myTimeMs: number | null;
}

interface LockKey {
  level: string;
  seed: string;
  hardened: boolean;
}

type Row = { player_id: string; name: string; time_ms: number };

function toEntries(rows: Row[], playerId: string | null): Entry[] {
  return rows.map((r) => ({ name: r.name, timeMs: r.time_ms, me: r.player_id === playerId }));
}

/** Best time of each player on a level, all locks together. */
async function levelBoard(db: D1Database, level: string, playerId: string | null): Promise<Board> {
  const { results } = await db
    .prepare(
      // SQLite: with MIN(), the bare columns come from the row holding the minimum.
      'SELECT player_id, name, MIN(time_ms) AS time_ms FROM runs WHERE level = ? GROUP BY player_id ORDER BY time_ms LIMIT ?',
    )
    .bind(level, TOP)
    .all<Row>();
  const mine = playerId
    ? await db.prepare('SELECT MIN(time_ms) AS t FROM runs WHERE level = ? AND player_id = ?').bind(level, playerId).first<{ t: number | null }>()
    : null;
  const myTimeMs = mine?.t ?? null;
  const myRank =
    myTimeMs === null
      ? null
      : ((
          await db
            .prepare('SELECT COUNT(*) AS n FROM (SELECT MIN(time_ms) AS t FROM runs WHERE level = ? GROUP BY player_id) WHERE t < ?')
            .bind(level, myTimeMs)
            .first<{ n: number }>()
        )?.n ?? 0) + 1;
  return { top: toEntries(results, playerId), myRank, myTimeMs };
}

/** Times on one precise lock (one row per player already). */
async function lockBoard(db: D1Database, key: LockKey, playerId: string | null): Promise<Board> {
  const where = 'level = ? AND seed = ? AND hardened = ?';
  const args = [key.level, key.seed, key.hardened ? 1 : 0];
  const { results } = await db
    .prepare(`SELECT player_id, name, time_ms FROM runs WHERE ${where} ORDER BY time_ms LIMIT ?`)
    .bind(...args, TOP)
    .all<Row>();
  const mine = playerId
    ? await db.prepare(`SELECT time_ms FROM runs WHERE ${where} AND player_id = ?`).bind(...args, playerId).first<{ time_ms: number }>()
    : null;
  const myTimeMs = mine?.time_ms ?? null;
  const myRank =
    myTimeMs === null
      ? null
      : ((await db.prepare(`SELECT COUNT(*) AS n FROM runs WHERE ${where} AND time_ms < ?`).bind(...args, myTimeMs).first<{ n: number }>())?.n ?? 0) + 1;
  return { top: toEntries(results, playerId), myRank, myTimeMs };
}

async function boards(db: D1Database, level: string, lock: LockKey | null, playerId: string | null) {
  const [levelResult, lockResult] = await Promise.all([levelBoard(db, level, playerId), lock ? lockBoard(db, lock, playerId) : null]);
  return { level: levelResult, lock: lockResult };
}

/** Keeps the best time only: a slower run changes nothing, not even the name. */
async function saveRun(db: D1Database, playerId: string, name: string, run: Run): Promise<void> {
  await db
    .prepare(
      `INSERT INTO runs (player_id, name, level, seed, hardened, time_ms, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (player_id, level, seed, hardened) DO UPDATE
       SET name = excluded.name, time_ms = excluded.time_ms, created_at = excluded.created_at
       WHERE excluded.time_ms < runs.time_ms`,
    )
    .bind(playerId, name, run.level, run.seed, run.hardened ? 1 : 0, run.timeMs, Date.now())
    .run();
  // The player's name follows their latest choice everywhere.
  await db.prepare('UPDATE runs SET name = ? WHERE player_id = ? AND name <> ?').bind(name, playerId, name).run();
}

function corsHeaders(request: Request, env: Env): Record<string, string> {
  const origin = request.headers.get('Origin') ?? '';
  const allowed = env.ALLOWED_ORIGINS.split(',').map((o) => o.trim());
  return allowed.includes(origin)
    ? { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', Vary: 'Origin' }
    : {};
}

function json(body: unknown, status: number, cors: Record<string, string>): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...cors } });
}

async function handle(request: Request, env: Env, cors: Record<string, string>): Promise<Response> {
  const url = new URL(request.url);
  if (url.pathname !== '/scores') return json({ error: 'notFound' }, 404, cors);

  if (request.method === 'GET') {
    const level = url.searchParams.get('level');
    if (!isLockLevel(level)) return json({ error: 'badRequest' }, 400, cors);
    const seed = url.searchParams.get('seed');
    const player = url.searchParams.get('player');
    const lock = seed ? { level, seed, hardened: url.searchParams.get('hardened') === '1' } : null;
    return json(await boards(env.DB, level, lock, player && PLAYER_ID.test(player) ? player : null), 200, cors);
  }

  if (request.method === 'POST') {
    if (Number(request.headers.get('Content-Length') ?? 0) > 8_000) return json({ error: 'badRequest' }, 413, cors);
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    const playerId = body?.playerId;
    const name = cleanPlayerName(body?.name);
    const run = parseRun(body?.run);
    if (typeof playerId !== 'string' || !PLAYER_ID.test(playerId) || !name || !run) return json({ error: 'badRequest' }, 400, cors);
    const check = checkRun(run);
    if (check !== 'ok') return json({ error: check }, 422, cors);
    await saveRun(env.DB, playerId, name, run);
    return json(await boards(env.DB, run.level, run, playerId), 200, cors);
  }

  return json({ error: 'methodNotAllowed' }, 405, cors);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const cors = corsHeaders(request, env);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    try {
      return await handle(request, env, cors);
    } catch (error) {
      console.error(error);
      return json({ error: 'server' }, 500, cors);
    }
  },
} satisfies ExportedHandler<Env>;
