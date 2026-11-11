/** Shared display helpers (Asia/Manila time). */
export function bookingReference(id: string): string {
  return `CR-${id.replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}

export function formatManilaDateTime(iso: string): string {
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}
