export type Names = { he: string; en: string };

export type Arrival = {
  line: string;
  operator: Names;
  destination: Names;
  city: Names;
  eta: string;
  minutes: number;
  /** True when the bus reported a recent location; otherwise the time is only a forecast. */
  live: boolean;
};

export type StopInfo = { name: Names; city: string };

export type Board = {
  code: string;
  fetchedAt: string;
  info: StopInfo | null;
  arrivals: Arrival[];
};

export type NearbyStop = { code: string; name: Names; distance: number };

export type ApiError = { error: "bad_code" | "unknown_stop" | "bad_coordinates" | "upstream" };
