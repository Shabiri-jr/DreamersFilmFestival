export function formatEventDate(value: string): string {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return value;
  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Africa/Lagos",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

function shortTime(value: string): string {
  const [hourText, minuteText] = value.split(":");
  const hour = Number(hourText);
  const minute = Number(minuteText ?? 0);
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) return value;
  const suffix = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return minute ? `${displayHour}:${String(minute).padStart(2, "0")}${suffix}` : `${displayHour}${suffix}`;
}

export function formatEventTime(start: string, end: string | null): string {
  return end ? `${shortTime(start)} – ${shortTime(end)}` : shortTime(start);
}

export function admissionLabel(count: number, ticketTypeName: string): string {
  if (ticketTypeName.toLowerCase().includes("afatakpa") && count === 2) {
    return "Admits 2 — Couple";
  }
  return `Admits ${count}`;
}
