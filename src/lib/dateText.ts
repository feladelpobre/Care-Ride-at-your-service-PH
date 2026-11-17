/**
 * Typed date and time entry (AC34). Riders type the date and time instead of scrolling
 * the phone's date/time wheels. Internally the app keeps YYYY-MM-DD and 24-hour HH:mm.
 */

/** Adds the slashes while typing digits: "1120" -> "11/20", "11202026" -> "11/20/2026". */
export function maskDate(input: string): string {
  const d = input.replace(/\D/g, "").slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}

/** "11/20/2026" (or "11-20-2026", "11.20.2026") -> "2026-11-20"; null if not a real date. */
export function parseDateText(text: string): string | null {
  const m = text.trim().match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (!m) return null;
  const [mm, dd, yyyy] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31 || yyyy < 2000 || yyyy > 2100) return null;
  const date = new Date(Date.UTC(yyyy, mm - 1, dd));
  if (date.getUTCMonth() !== mm - 1 || date.getUTCDate() !== dd) return null; // e.g. 02/30
  return `${yyyy}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
}

/** "2026-11-20" -> "11/20/2026". */
export function formatDateText(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[2]}/${m[3]}/${m[1]}` : "";
}

/**
 * Reads a typed time: "9:00 AM", "9am", "09:30 pm", "2:30PM", "14:30", "0900", "1430".
 * Returns 24-hour "HH:mm", or null. Hours 1–12 need AM or PM (except 12-hour "0x" forms
 * like "0900", which are read as 24-hour); 13–23 are read as 24-hour.
 */
export function parseTimeText(text: string): string | null {
  const t = text.trim().toLowerCase().replace(/\s+/g, "").replace(/\./g, "");
  const m = t.match(/^(\d{1,2})(?::?(\d{2}))?(am|pm|a|p)?$/);
  if (!m) return null;
  let h = Number(m[1]);
  const min = m[2] === undefined ? 0 : Number(m[2]);
  const suffix = m[3];
  if (min > 59) return null;
  if (suffix) {
    if (h < 1 || h > 12) return null;
    const pm = suffix.startsWith("p");
    if (h === 12) h = pm ? 12 : 0;
    else if (pm) h += 12;
  } else {
    // No AM/PM: accept clear 24-hour forms ("14:30", "0900", "00:15"), refuse "9:00" (ambiguous)
    const twentyFour = h >= 13 || m[1].length === 2 && m[1].startsWith("0") || h === 0;
    if (!twentyFour || h > 23) return null;
  }
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

/** "14:30" -> "02:30 PM"; "09:00" -> "09:00 AM". */
export function formatTimeText(hhmm: string): string {
  const m = hhmm.match(/^(\d{2}):(\d{2})$/);
  if (!m) return "";
  const h = Number(m[1]);
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${String(h12).padStart(2, "0")}:${m[2]} ${h < 12 ? "AM" : "PM"}`;
}
