import { describe, expect, it } from "vitest";
import { formatDateText, formatTimeText, maskDate, parseDateText, parseTimeText } from "@/lib/dateText";

describe("typed date entry, MM/DD/YYYY (AC34)", () => {
  it("adds the slashes while typing", () => {
    expect(maskDate("11")).toBe("11");
    expect(maskDate("1120")).toBe("11/20");
    expect(maskDate("11202026")).toBe("11/20/2026");
    expect(maskDate("11/20/2026999")).toBe("11/20/2026");
  });
  it("reads real dates and refuses impossible ones", () => {
    expect(parseDateText("11/20/2026")).toBe("2026-11-20");
    expect(parseDateText("1/5/2027")).toBe("2027-01-05");
    expect(parseDateText("02/30/2026")).toBeNull();
    expect(parseDateText("13/01/2026")).toBeNull();
    expect(parseDateText("11/20")).toBeNull();
  });
  it("shows a stored date back in the same pattern", () => {
    expect(formatDateText("2026-11-20")).toBe("11/20/2026");
  });
});

describe("typed time entry, hh:mm AM/PM (AC34)", () => {
  it("reads common ways of writing a time", () => {
    expect(parseTimeText("9:00 AM")).toBe("09:00");
    expect(parseTimeText("9am")).toBe("09:00");
    expect(parseTimeText("2:30 PM")).toBe("14:30");
    expect(parseTimeText("2:30pm")).toBe("14:30");
    expect(parseTimeText("12:15 am")).toBe("00:15");
    expect(parseTimeText("12:00 PM")).toBe("12:00");
    expect(parseTimeText("14:30")).toBe("14:30");
    expect(parseTimeText("0900")).toBe("09:00");
  });
  it("refuses ambiguous or impossible times", () => {
    expect(parseTimeText("9:00")).toBeNull(); // AM or PM?
    expect(parseTimeText("13:00 PM")).toBeNull();
    expect(parseTimeText("9:75 AM")).toBeNull();
    expect(parseTimeText("abc")).toBeNull();
  });
  it("shows a stored time back with AM/PM", () => {
    expect(formatTimeText("14:30")).toBe("02:30 PM");
    expect(formatTimeText("09:00")).toBe("09:00 AM");
    expect(formatTimeText("00:15")).toBe("12:15 AM");
  });
});
