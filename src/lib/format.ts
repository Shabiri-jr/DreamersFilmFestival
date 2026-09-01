export function formatNaira(amount: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatFestivalDate(value: string): string {
  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

export function formatFestivalTime(
  startTime: string,
  endTime: string | null,
): string {
  const formatTime = (value: string) => {
    const [hour = "0", minute = "0"] = value.split(":");
    const date = new Date(Date.UTC(2026, 0, 1, Number(hour), Number(minute)));
    return new Intl.DateTimeFormat("en-NG", {
      hour: "numeric",
      minute: minute === "00" ? undefined : "2-digit",
      hour12: true,
      timeZone: "UTC",
    })
      .format(date)
      .replace(/\s/g, "")
      .toUpperCase();
  };

  const start = formatTime(startTime);
  return endTime ? `${start} – ${formatTime(endTime)}` : start;
}

export function formatAdmissions(admissionsPerUnit: number): string {
  if (admissionsPerUnit === 1) {
    return "Admits one";
  }

  if (admissionsPerUnit === 2) {
    return "Admits two";
  }

  return `Admits ${admissionsPerUnit}`;
}

export function formatPassAdmission(
  slug: string,
  admissionsPerUnit: number,
): string {
  if (slug === "network" && admissionsPerUnit === 5) {
    return "Group of 5 · one pass";
  }

  if (slug === "afatakpa" && admissionsPerUnit === 2) {
    return "Admits two · couple";
  }

  return formatAdmissions(admissionsPerUnit);
}
