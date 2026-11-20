"use client";

import { useEffect, useState } from "react";
import { formatDateText, formatTimeText, maskDate, parseDateText, parseTimeText } from "@/lib/dateText";

/** Today's date in Manila as YYYY-MM-DD. */
export function todayManila(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

/**
 * Typed date box, MM/DD/YYYY (AC34): faster than scrolling the phone's date wheel.
 * Slashes are added while typing; the app stores YYYY-MM-DD only when the date is real and within min/max.
 */
export function DateBox({
  id,
  value,
  onChange,
  min,
  max,
  optional = false,
}: {
  id: string;
  value: string;
  onChange: (iso: string) => void;
  min?: string;
  max?: string;
  optional?: boolean;
}) {
  const [text, setText] = useState(formatDateText(value));
  // Keep the box in step if the date is changed elsewhere
  useEffect(() => {
    if (parseDateText(text) !== value && value) setText(formatDateText(value));
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps
  const iso = parseDateText(text);
  const tooEarly = Boolean(iso && min && iso < min);
  const tooLate = Boolean(iso && max && iso > max);
  const error =
    text.length >= 10 && !iso
      ? "Not a real date. Use MM/DD/YYYY, e.g., 11/20/2026."
      : tooEarly
        ? "Choose today or a later date."
        : tooLate
          ? "The date can't be in the future."
          : null;
  return (
    <div>
      <input
        id={id}
        className={`input ${error ? "border-2 border-red-500" : ""}`}
        inputMode="numeric"
        autoComplete="off"
        placeholder="MM/DD/YYYY"
        maxLength={10}
        value={text}
        aria-invalid={error ? true : undefined}
        aria-describedby={`${id}-hint`}
        onChange={(e) => {
          const next = maskDate(e.target.value);
          setText(next);
          const parsed = parseDateText(next);
          const ok = parsed && !(min && parsed < min) && !(max && parsed > max);
          onChange(ok ? parsed : "");
        }}
      />
      <p id={`${id}-hint`} className={`mt-1 text-sm ${error ? "font-medium text-red-700" : "text-zinc-600"}`}>
        {error ?? `Type the date as MM/DD/YYYY, e.g., 11/20/2026.${optional ? " Optional." : ""}`}
      </p>
    </div>
  );
}

/**
 * Typed time box, hh:mm AM/PM (AC34): faster than scrolling the time wheel.
 * Accepts "9:00 AM", "9am", "2:30pm" or 24-hour "14:30"; the app stores 24-hour HH:mm.
 */
export function TimeBox({
  id,
  value,
  onChange,
  optional = false,
  className = "",
  describedBy,
}: {
  id: string;
  value: string;
  onChange: (hhmm: string) => void;
  optional?: boolean;
  className?: string;
  describedBy?: string;
}) {
  const [text, setText] = useState(formatTimeText(value));
  // Keep the box in step when the time is set elsewhere (e.g. "Use 07:50 AM")
  useEffect(() => {
    if (parseTimeText(text) !== value) setText(value ? formatTimeText(value) : text);
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps
  const [left, setLeft] = useState(false);
  const parsed = parseTimeText(text);
  // Only complain once the person has left the box (or typed AM/PM), not mid-typing
  const error = text.trim() && !parsed && (left || /m$/i.test(text.trim())) ? "Use hh:mm AM or PM, e.g., 09:00 AM or 2:30 PM." : null;
  return (
    <div className={className}>
      <input
        id={id}
        className={`input ${error ? "border-2 border-red-500" : ""}`}
        autoComplete="off"
        autoCapitalize="characters"
        placeholder="hh:mm AM"
        maxLength={8}
        value={text}
        aria-invalid={error ? true : undefined}
        aria-describedby={[`${id}-hint`, describedBy].filter(Boolean).join(" ")}
        onChange={(e) => {
          setText(e.target.value);
          onChange(parseTimeText(e.target.value) ?? "");
        }}
        onFocus={() => setLeft(false)}
        onBlur={() => {
          setLeft(true);
          if (parsed) setText(formatTimeText(parsed));
        }}
      />
      <p id={`${id}-hint`} className={`mt-1 text-sm ${error ? "font-medium text-red-700" : "text-zinc-600"}`}>
        {error ?? `Type the time as hh:mm AM or PM, e.g., 09:00 AM or 2:30 PM.${optional ? " Optional." : ""}`}
      </p>
    </div>
  );
}
