export function formatBusDisplayDate(value) {
  return value.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function createBusSearchNavigationParams({ from, to, date = new Date() }) {
  const journeyDate = date instanceof Date ? date : new Date(date);

  if (Number.isNaN(journeyDate.getTime())) {
    throw new Error("A valid bus journey date is required.");
  }

  return {
    from,
    to,
    date: formatBusDisplayDate(journeyDate),
    dateValue: journeyDate.toISOString(),
    passengers: 1,
  };
}
