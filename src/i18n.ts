export type Lang = "he" | "en";

const he = {
  title: "תחנה",
  otherLang: "EN",
  otherLangLabel: "English",
  placeholder: "מספר תחנה",
  show: "הצג",
  locate: "מצא תחנות לידי",
  locating: "מחפש מיקום…",
  refresh: "רענון",
  loading: "טוען…",
  minutes: "כ-{n} דק׳",
  due: "מגיע",
  live: "GPS",
  forecast: "תחזית",
  foot: "זמנים משוערים · עודכן ב-{t} · כדאי לסמן לנהג",
  stop: "תחנה {c}",
  empty: "אין כרגע אוטובוסים בדרך לתחנה",
  meters: "{d} מ׳",
  noNear: "לא נמצאו תחנות בטווח 500 מטר.",
  errCode: "צריך להקליד מספר תחנה.",
  errStop: "לא נמצאה תחנה עם המספר הזה.",
  errNet: "הנתונים לא נטענו. נסה לרענן.",
  geoDenied: "הדפדפן חוסם גישה למיקום. אפשר לאשר אותה בהגדרות האתר, או להקליד את המספר שעל השלט.",
  geoUnavailable: "הטלפון לא הצליח לאתר מיקום. בדוק שהמיקום דלוק, או הקלד את המספר שעל השלט.",
  geoTimeout: "איתור המיקום לקח יותר מדי זמן. נסה שוב, או הקלד את המספר שעל השלט.",
  geoNone: "הדפדפן לא תומך במיקום. אפשר להקליד את המספר שעל השלט.",
  light: "מצב בהיר",
  dark: "מצב כהה",
  byLine: "לפי קו",
  byTime: "לפי זמן",
};

export type StringKey = keyof typeof he;

const en: Record<StringKey, string> = {
  title: "Tachana",
  otherLang: "עב",
  otherLangLabel: "עברית",
  placeholder: "Stop number",
  show: "Show",
  locate: "Find stops near me",
  locating: "Finding your location…",
  refresh: "Refresh",
  loading: "Loading…",
  minutes: "~{n} min",
  due: "Due",
  live: "GPS",
  forecast: "Forecast",
  foot: "Estimated times · Updated {t} · Signal the driver",
  stop: "Stop {c}",
  empty: "No buses on the way right now",
  meters: "{d} m",
  noNear: "No stops within 500 m.",
  errCode: "Type a stop number.",
  errStop: "No stop with that number.",
  errNet: "Couldn't load data. Try refreshing.",
  geoDenied: "Your browser is blocking location. Allow it in site settings, or type the number on the sign.",
  geoUnavailable: "Your phone couldn't get a location. Check that location is on, or type the number on the sign.",
  geoTimeout: "Finding your location took too long. Try again, or type the number on the sign.",
  geoNone: "This browser has no location support. Type the number on the sign.",
  light: "Light mode",
  dark: "Dark mode",
  byLine: "By line",
  byTime: "By time",
};

const strings = { he, en };

export function translate(lang: Lang, key: StringKey, vars: Record<string, string | number> = {}) {
  return strings[lang][key].replace(/\{(\w+)\}/g, (_, name: string) => String(vars[name]));
}
