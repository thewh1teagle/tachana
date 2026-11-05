import type { ApiError, Board, NearbyStop } from "@shared/types";

export class RequestError extends Error {
  constructor(readonly code: ApiError["error"] | "network") {
    super(code);
  }
}

async function getJson<T>(path: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, { cache: "no-store" });
  } catch {
    throw new RequestError("network");
  }
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new RequestError((body as ApiError | null)?.error ?? "network");
  return body as T;
}

export const fetchBoard = (code: string) => getJson<Board>(`/api/stop/${code}`);

export const fetchNearby = async (lat: number, lon: number) =>
  (await getJson<{ stops: NearbyStop[] }>(`/api/nearby?lat=${lat}&lon=${lon}`)).stops;

function position(options: PositionOptions) {
  return new Promise<GeolocationPosition>((resolve, reject) =>
    navigator.geolocation.getCurrentPosition(resolve, reject, options),
  );
}

/** Tries GPS first, then falls back to a coarser fix unless the browser refused outright. */
export async function findPosition() {
  try {
    return await position({ enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 });
  } catch (error) {
    if ((error as GeolocationPositionError).code === 1) throw error;
    return position({ enableHighAccuracy: false, timeout: 12000, maximumAge: 120000 });
  }
}
