export type RegionalPreferences = {
  locale: string;
  currency: string;
  time_zone: string;
};

export const defaultPreferences: RegionalPreferences = {
  locale: "en-US",
  currency: "USD",
  time_zone: "America/New_York",
};

// Accept ISO dates and numeric dates in the selected region's day/month order.
export function parseRegionalDate(
  input: string,
  locale: string,
  monthOnly = false,
): string | undefined {
  const value = input.trim();
  let year: string, month: string, day: string;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    [year, month, day] = value.split("-");
  } else {
    const values = value.split(/[^0-9]+/).filter(Boolean);
    const order = new Intl.DateTimeFormat(locale, {
      year: "numeric",
      month: "2-digit",
      ...(monthOnly ? {} : { day: "2-digit" }),
      timeZone: "UTC",
    })
      .formatToParts(new Date("2006-11-22T00:00:00Z"))
      .filter((part) => part.type !== "literal");
    if (values.length !== order.length || /[a-z]/i.test(value))
      return undefined;
    const parts = Object.fromEntries(
      order.map((part, index) => [part.type, values[index]]),
    );
    year = parts.year;
    month = parts.month;
    day = parts.day ?? "1";
  }
  if (
    year.length !== 4 ||
    Number(year) < 1 ||
    Number(month) < 1 ||
    Number(month) > 12 ||
    Number(day) < 1 ||
    Number(day) > 31
  )
    return undefined;
  const iso = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  const date = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== iso
    ? undefined
    : iso;
}

export function regionalFormat(preferences: RegionalPreferences) {
  const currencyFormatter = new Intl.NumberFormat(preferences.locale, {
    style: "currency",
    currency: preferences.currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const compact = new Intl.NumberFormat(preferences.locale, {
    style: "currency",
    currency: preferences.currency,
    notation: "compact",
    maximumFractionDigits: 1,
  });
  return {
    locale: preferences.locale,
    currencyCode: preferences.currency,
    currencySymbol:
      currencyFormatter
        .formatToParts(0)
        .find((part) => part.type === "currency")?.value ??
      preferences.currency,
    currencyFormatter,
    formatCurrency: (value: number | string) =>
      currencyFormatter.format(Number(value)),
    formatCompactCurrency: (value: number | string) =>
      compact.format(Number(value)),
    // Ledger dates represent calendar days, never instants. A time zone change
    // must not move a transaction, budget period or due date to another day.
    formatDate: (
      value: string,
      options: Intl.DateTimeFormatOptions = {
        month: "short",
        day: "numeric",
        year: "numeric",
      },
    ) =>
      new Intl.DateTimeFormat(preferences.locale, {
        ...options,
        timeZone: "UTC",
      }).format(new Date(`${value.slice(0, 10)}T00:00:00Z`)),
    formatDateTime: (value: string | Date) =>
      new Intl.DateTimeFormat(preferences.locale, {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: preferences.time_zone,
      }).format(new Date(value)),
    today: (now = new Date()) => {
      const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: preferences.time_zone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).formatToParts(now);
      return ["year", "month", "day"]
        .map((type) => parts.find((part) => part.type === type)?.value)
        .join("-");
    },
  };
}
