import { Hono } from "hono";
import type { ApiError, Arrival, Board, Names, NearbyStop, StopInfo } from "@shared/types";

const CURLBUS = "https://curlbus.app";
const OPEN_BUS = "https://open-bus-stride-api.hasadna.org.il";
const BOARD_TTL = 10;
const STOP_INFO_TTL = 6 * 60 * 60;
const LIVE_MAX_AGE_MS = 5 * 60 * 1000;
const NEARBY_RADIUS = 500;

type RawNames = { HE?: string; EN?: string } | null | undefined;

type RawVisit = {
  line_name?: string;
  eta: string;
  timestamp: string;
  location?: unknown;
  static_info?: {
    route?: {
      agency?: { name?: RawNames };
      destination?: {
        name?: RawNames;
        address?: { city_multilingual?: RawNames };
      };
    };
  };
};

type RawBoard = { errors?: string[] | null; visits?: Record<string, RawVisit[]> };
type RawNearby = { code: string | number; name?: RawNames; distance?: number };
type RawStop = { lat: number; lon: number; name: string; city?: string };

class UpstreamError extends Error {}

async function fetchJson<T>(url: string): Promise<T> {
  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": "tachana/0.1" },
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw new UpstreamError(`${response.status} from ${new URL(url).host}`);
    return (await response.json()) as T;
  } catch (error) {
    throw error instanceof UpstreamError ? error : new UpstreamError(String(error));
  }
}

async function cached<T>(key: string, ttl: number, load: () => Promise<T>): Promise<T> {
  const cache = caches.default;
  const request = new Request(`https://tachana.cache/${key}`);
  const hit = await cache.match(request);
  if (hit) return (await hit.json()) as T;
  const value = await load();
  // An unknown stop stays uncached so that a transient upstream answer can't stick.
  if (value !== null) {
    await cache.put(
      request,
      new Response(JSON.stringify(value), {
        headers: { "Content-Type": "application/json", "Cache-Control": `max-age=${ttl}` },
      }),
    );
  }
  return value;
}

function names(raw: RawNames): Names {
  return { he: raw?.HE || raw?.EN || "", en: raw?.EN || raw?.HE || "" };
}

// curlbus writes "2026-11-05 21:30:00+02:00", which only some engines parse with the space.
function parseTime(value: string): Date {
  return new Date(value.replace(" ", "T"));
}

async function nearby(lat: number, lon: number, radius = NEARBY_RADIUS): Promise<NearbyStop[]> {
  const stops = await fetchJson<RawNearby[]>(`${CURLBUS}/nearby?lat=${lat}&lon=${lon}&radius=${radius}`);
  return stops
    .map((stop) => ({
      code: String(stop.code),
      name: names(stop.name),
      distance: Math.round(stop.distance ?? 0),
    }))
    .sort((a, b) => a.distance - b.distance);
}

function today(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem" }).format(new Date());
}

// curlbus arrivals don't name the stop, so look the name up separately.
async function stopInfo(code: string): Promise<StopInfo | null> {
  try {
    return await cached(`info/${code}`, STOP_INFO_TTL, async () => {
      const date = today();
      const query = new URLSearchParams({ code, date_from: date, date_to: date, limit: "1" });
      const [row] = await fetchJson<RawStop[]>(`${OPEN_BUS}/gtfs_stops/list?${query}`);
      if (!row) return null;
      const info: StopInfo = { name: { he: row.name, en: row.name }, city: row.city ?? "" };
      try {
        const match = (await nearby(row.lat, row.lon, 50)).find((stop) => stop.code === code);
        if (match) info.name = match.name;
      } catch {
        // The Hebrew name from Open Bus is good enough without curlbus.
      }
      return info;
    });
  } catch {
    return null;
  }
}

function toArrival(visit: RawVisit, now: number): Arrival {
  const eta = parseTime(visit.eta);
  const route = visit.static_info?.route;
  const reportAge = now - parseTime(visit.timestamp).getTime();
  return {
    line: visit.line_name ?? "",
    operator: names(route?.agency?.name),
    destination: names(route?.destination?.name),
    city: names(route?.destination?.address?.city_multilingual),
    eta: eta.toISOString(),
    minutes: Math.max(0, Math.round((eta.getTime() - now) / 60000)),
    live: Boolean(visit.location) && reportAge < LIVE_MAX_AGE_MS,
  };
}

async function board(code: string): Promise<Board | null> {
  return cached(`board/${code}`, BOARD_TTL, async () => {
    const data = await fetchJson<RawBoard>(`${CURLBUS}/${code}`);
    if (data.errors?.length) return null;
    const now = Date.now();
    const arrivals = (data.visits?.[code] ?? [])
      .map((visit) => toArrival(visit, now))
      .sort((a, b) => a.eta.localeCompare(b.eta));
    return { code, fetchedAt: new Date(now).toISOString(), info: await stopInfo(code), arrivals };
  });
}

const app = new Hono();

app.use("/api/*", async (c, next) => {
  await next();
  c.header("Cache-Control", "no-store");
});

app.get("/api/stop/:code", async (c) => {
  const code = c.req.param("code");
  if (!/^\d{1,6}$/.test(code)) return c.json<ApiError>({ error: "bad_code" }, 400);
  const result = await board(code);
  if (!result) return c.json<ApiError>({ error: "unknown_stop" }, 404);
  return c.json(result);
});

app.get("/api/nearby", async (c) => {
  const lat = Number(c.req.query("lat"));
  const lon = Number(c.req.query("lon"));
  const valid = c.req.query("lat") && c.req.query("lon") && Math.abs(lat) <= 90 && Math.abs(lon) <= 180;
  if (!valid) return c.json<ApiError>({ error: "bad_coordinates" }, 400);
  return c.json({ stops: await nearby(lat, lon) });
});

app.notFound((c) => c.json({ error: "not_found" }, 404));

app.onError((error, c) => {
  console.error(error.message);
  return c.json<ApiError>({ error: "upstream" }, 502);
});

export default app;
