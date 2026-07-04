export function format(
  date: Date | string | number | null | undefined,
  formatStr: string,
): string {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";

  const pad = (n: number) => n.toString().padStart(2, "0");
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const fullMonths = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  if (formatStr === "yyyy-MM-dd") {
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }
  if (formatStr === "MMM dd, yyyy" || formatStr === "PP") {
    return `${months[d.getMonth()]} ${pad(d.getDate())}, ${d.getFullYear()}`;
  }
  if (formatStr === "MMMM dd, yyyy") {
    return `${fullMonths[d.getMonth()]} ${pad(d.getDate())}, ${d.getFullYear()}`;
  }
  if (formatStr === "yyyy-MM-dd HH:mm") {
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
      d.getDate(),
    )} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
  if (formatStr === "MMM dd, yyyy HH:mm") {
    return `${months[d.getMonth()]} ${pad(d.getDate())}, ${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
  if (formatStr === "MMM dd, yyyy hh:mm a") {
    const hours = d.getHours();
    const ampm = hours >= 12 ? "PM" : "AM";
    const h = hours % 12 || 12;
    return `${months[d.getMonth()]} ${pad(d.getDate())}, ${d.getFullYear()} ${pad(h)}:${pad(d.getMinutes())} ${ampm}`;
  }
  if (formatStr === "MMM d, h:mm a") {
    const hours = d.getHours();
    const ampm = hours >= 12 ? "PM" : "AM";
    const h = hours % 12 || 12;
    return `${months[d.getMonth()]} ${d.getDate()}, ${h}:${pad(d.getMinutes())} ${ampm}`;
  }
  if (formatStr === "HH:mm") {
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  return d.toLocaleDateString();
}

export function addDays(date: Date | string | number, amount: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + amount);
  return d;
}

export function isAfter(
  date: Date | string | number,
  dateToCompare: Date | string | number,
): boolean {
  return new Date(date).getTime() > new Date(dateToCompare).getTime();
}

export function differenceInDays(
  dateLeft: Date | string | number,
  dateRight: Date | string | number,
): number {
  const d1 = new Date(dateLeft);
  const d2 = new Date(dateRight);
  d1.setHours(0, 0, 0, 0);
  d2.setHours(0, 0, 0, 0);
  const diffTime = d1.getTime() - d2.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

export function parseISO(dateString: string): Date {
  return new Date(dateString);
}
