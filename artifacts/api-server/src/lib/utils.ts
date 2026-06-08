export function nowIST(): string {
  return new Date().toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata", day: "2-digit", month: "short", year: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
}

/** Convert a "YYYY-MM-DD" date string to an IST-formatted timestamp (noon IST of that day). */
export function dateToIST(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  // Noon IST = 06:30 UTC
  const dt = new Date(Date.UTC(y, m - 1, d, 6, 30, 0));
  return dt.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata", day: "2-digit", month: "short", year: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
}

export function addLog(existing: string, actor: string, text: string): string {
  let log: { ts: string; actor: string; text: string }[] = [];
  try { log = JSON.parse(existing); } catch {}
  log.unshift({ ts: nowIST(), actor, text });
  return JSON.stringify(log);
}
