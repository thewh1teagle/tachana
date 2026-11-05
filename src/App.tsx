import { Loader2, MapPin, Moon, RotateCw, Sun } from "lucide-react";
import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Arrival, Board, Names, NearbyStop } from "@shared/types";
import { fetchBoard, fetchNearby, findPosition, RequestError } from "@/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { type Lang, type StringKey, translate } from "@/i18n";
import { cn } from "@/lib/utils";

type Sort = "line" | "time";

const CODE_PATTERN = /^\d{1,6}$/;
const GEO_ERRORS: Record<number, StringKey> = { 1: "geoDenied", 2: "geoUnavailable", 3: "geoTimeout" };

const store = {
  get(key: string) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, value: string) {
    try {
      localStorage.setItem(key, value);
    } catch {
      // Private browsing can refuse storage; the choice just won't persist.
    }
  },
};

const params = new URLSearchParams(location.search);

function initialStop() {
  const code = params.get("s") || store.get("stop");
  return code && CODE_PATTERN.test(code) ? code : null;
}

const clock = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jerusalem" });

export function App() {
  const [lang, setLang] = useState<Lang>((params.get("lang") || store.get("lang")) === "en" ? "en" : "he");
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));
  const [sort, setSort] = useState<Sort>(store.get("sort") === "time" ? "time" : "line");
  const [input, setInput] = useState(() => initialStop() ?? "");
  const [code, setCode] = useState(initialStop);
  const [board, setBoard] = useState<Board | null>(null);
  const [near, setNear] = useState<NearbyStop[] | null>(null);
  const [message, setMessage] = useState<StringKey | null>(null);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const latestRequest = useRef(0);

  const t = useCallback(
    (key: StringKey, vars?: Record<string, string | number>) => translate(lang, key, vars),
    [lang],
  );
  const pick = useCallback((names?: Names) => names?.[lang] ?? "", [lang]);

  useEffect(() => {
    const root = document.documentElement;
    root.lang = lang;
    root.dir = lang === "he" ? "rtl" : "ltr";
    document.title = t("title");
  }, [lang, t]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", dark ? "#161513" : "#faf9f6");
  }, [dark]);

  const load = useCallback(async (stop: string) => {
    const request = ++latestRequest.current;
    setLoading(true);
    setMessage(null);
    try {
      const result = await fetchBoard(stop);
      if (request === latestRequest.current) setBoard(result);
    } catch (error) {
      if (request !== latestRequest.current) return;
      if (error instanceof RequestError && error.code === "unknown_stop") {
        setCode(null);
        setBoard(null);
        setMessage("errStop");
      } else {
        setMessage("errNet");
      }
    } finally {
      if (request === latestRequest.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (code) void load(code);
  }, [code, load]);

  const openStop = (stop: string) => {
    store.set("stop", stop);
    setInput(stop);
    setNear(null);
    setBoard(null);
    if (stop === code) void load(stop);
    else setCode(stop);
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const value = input.trim();
    if (!CODE_PATTERN.test(value)) return setMessage("errCode");
    (document.activeElement as HTMLElement | null)?.blur();
    openStop(value);
  };

  const locate = async () => {
    if (!navigator.geolocation) return setMessage("geoNone");
    setLocating(true);
    setMessage(null);
    try {
      const { coords } = await findPosition();
      const stops = await fetchNearby(coords.latitude, coords.longitude);
      setNear(stops);
      if (!stops.length) setMessage("noNear");
    } catch (error) {
      setMessage(GEO_ERRORS[(error as GeolocationPositionError).code] ?? "errNet");
    } finally {
      setLocating(false);
    }
  };

  const arrivals = useMemo(() => {
    const rows = [...(board?.arrivals ?? [])];
    if (sort === "line") {
      rows.sort((a, b) => a.line.localeCompare(b.line, "he", { numeric: true }) || a.eta.localeCompare(b.eta));
    }
    return rows;
  }, [board, sort]);

  return (
    <main className="mx-auto max-w-xl px-5 pt-4 pb-12">
      <header className="mb-6 flex min-h-11 items-center justify-between">
        <h1 className="text-lg font-semibold">{t("title")}</h1>
        <div className="-me-2.5 flex items-center gap-0.5">
          <Button
            variant="ghost"
            className="size-11 font-medium text-muted-foreground"
            aria-label={t("otherLangLabel")}
            onClick={() => {
              const next = lang === "he" ? "en" : "he";
              store.set("lang", next);
              setLang(next);
            }}
          >
            {t("otherLang")}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-11 text-muted-foreground"
            aria-label={t(dark ? "light" : "dark")}
            onClick={() => {
              store.set("theme", dark ? "light" : "dark");
              setDark(!dark);
            }}
          >
            {dark ? <Sun /> : <Moon />}
          </Button>
        </div>
      </header>

      <form
        onSubmit={onSubmit}
        className="flex items-center gap-1.5 rounded-xl bg-muted p-1.5 ps-4 focus-within:ring-2 focus-within:ring-ring"
      >
        <Input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          inputMode="numeric"
          maxLength={6}
          autoComplete="off"
          placeholder={t("placeholder")}
          aria-label={t("placeholder")}
          className="h-11 min-w-0 flex-1 rounded-none border-0 bg-transparent! p-0 text-lg! tabular-nums shadow-none focus-visible:ring-0"
        />
        <Button type="submit" className="h-11 rounded-lg px-5 text-[15px] font-semibold">
          {t("show")}
        </Button>
      </form>

      <Button
        variant="ghost"
        onClick={locate}
        disabled={locating}
        className="mt-1.5 -ms-2 h-11 px-2 text-[15px] font-medium text-muted-foreground"
      >
        {locating ? <Loader2 className="animate-spin" /> : <MapPin />}
        {t(locating ? "locating" : "locate")}
      </Button>

      {message && (
        <p role="alert" className="mt-1 text-sm text-destructive">
          {t(message)}
        </p>
      )}

      {near && near.length > 0 && (
        <ul className="mt-2 border-t">
          {near.map((stop) => (
            <li key={stop.code}>
              <button
                type="button"
                onClick={() => openStop(stop.code)}
                className="flex min-h-14 w-full cursor-pointer items-baseline justify-between gap-4 border-b py-3 text-start"
              >
                <span className="min-w-0">
                  <b className="me-2 font-semibold tabular-nums [unicode-bidi:isolate]">{stop.code}</b>
                  {pick(stop.name)}
                </span>
                <small className="flex-none text-[13px] text-muted-foreground">
                  {t("meters", { d: stop.distance })}
                </small>
              </button>
            </li>
          ))}
        </ul>
      )}

      {code && (
        <section className="mt-7">
          <div className="flex items-start justify-between gap-3 border-b pb-3.5">
            <div className="min-w-0">
              <h2 className="text-xl leading-tight font-semibold wrap-anywhere">
                {board?.info ? pick(board.info.name) : t("stop", { c: code })}
              </h2>
              {board?.info && (
                <p className="mt-1 text-sm text-muted-foreground">
                  {[t("stop", { c: code }), lang === "he" ? board.info.city : ""].filter(Boolean).join(" · ")}
                </p>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="-me-2.5 -mt-2 size-11 flex-none text-muted-foreground"
              aria-label={t("refresh")}
              disabled={loading}
              onClick={() => void load(code)}
            >
              <RotateCw className={cn(loading && "animate-spin")} />
            </Button>
          </div>

          <div className="border-b py-2.5">
            <ToggleGroup
              type="single"
              value={sort}
              onValueChange={(value) => {
                if (!value) return;
                store.set("sort", value);
                setSort(value as Sort);
              }}
              className="gap-1"
            >
              <ToggleGroupItem value="line" className="h-9 rounded-lg px-3 text-sm font-medium text-muted-foreground data-[state=on]:text-foreground">
                {t("byLine")}
              </ToggleGroupItem>
              <ToggleGroupItem value="time" className="h-9 rounded-lg px-3 text-sm font-medium text-muted-foreground data-[state=on]:text-foreground">
                {t("byTime")}
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          <div aria-live="polite">
            {!board && !message && <p className="py-10 text-center text-muted-foreground">{t("loading")}</p>}
            {board && !arrivals.length && <p className="py-10 text-center text-muted-foreground">{t("empty")}</p>}
            {arrivals.map((bus, index) => (
              <ArrivalRow key={`${bus.line}-${bus.eta}-${index}`} bus={bus} t={t} pick={pick} />
            ))}
          </div>

          {board && <p className="mt-4 text-[13px] text-muted-foreground">{t("foot", { t: clock(board.fetchedAt) })}</p>}
        </section>
      )}
    </main>
  );
}

function ArrivalRow({
  bus,
  t,
  pick,
}: {
  bus: Arrival;
  t: (key: StringKey, vars?: Record<string, string | number>) => string;
  pick: (names?: Names) => string;
}) {
  return (
    <div className="grid min-h-[68px] grid-cols-[58px_minmax(0,1fr)_auto] items-center gap-3 border-b py-3">
      <div className="text-[22px] font-semibold tabular-nums [unicode-bidi:isolate]">{bus.line}</div>
      <div>
        <div className="text-[15px] leading-snug font-medium wrap-anywhere">{pick(bus.destination) || "—"}</div>
        <div className="mt-0.5 text-[13px] text-muted-foreground">
          {[pick(bus.city), pick(bus.operator)].filter(Boolean).join(" · ")}
        </div>
      </div>
      <div className="text-end whitespace-nowrap">
        <div className="text-lg font-semibold tabular-nums">
          {bus.minutes === 0 ? t("due") : t("minutes", { n: bus.minutes })}
        </div>
        <div className={cn("mt-px flex items-center justify-end gap-1.5 text-xs", bus.live ? "text-live" : "text-faint")}>
          {bus.live && <span className="size-1.5 rounded-full bg-current" />}
          {t(bus.live ? "live" : "forecast")}
        </div>
      </div>
    </div>
  );
}
