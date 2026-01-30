export function parseDate(timestamp: number): Date {
  const date = new Date(timestamp);
  const [day, month, year] = date.toLocaleDateString().split("/");
  const [hours, minutes, seconds] = date.toLocaleTimeString().split(":");

  return new Date(
    parseInt(year),
    parseInt(month) - 1, // months are 0-indexed
    parseInt(day),
    parseInt(hours),
    parseInt(minutes),
    parseInt(seconds),
  );
}
