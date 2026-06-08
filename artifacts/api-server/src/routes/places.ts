import { Router } from "express";
import type { IRouter } from "express";
import { searchPlaces } from "../lib/places";

const router: IRouter = Router();

// Simple in-memory cache: key → { results, expiresAt }
const geocodeCache = new Map<string, { results: any[]; expiresAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// Nominatim rate-limit: 1 req/s — track last request time
let lastNominatimCall = 0;
const MIN_INTERVAL_MS = 1100;

async function nominatimSearch(q: string): Promise<any[]> {
  const cached = geocodeCache.get(q);
  if (cached && cached.expiresAt > Date.now()) return cached.results;

  // Enforce minimum interval between calls
  const now = Date.now();
  const wait = MIN_INTERVAL_MS - (now - lastNominatimCall);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastNominatimCall = Date.now();

  const params = new URLSearchParams({
    format: "json",
    q: `${q}, Kerala, India`,
    countrycodes: "in",
    viewbox: "74.8,8.0,77.6,12.8",
    bounded: "1",
    addressdetails: "1",
    limit: "10",
    "accept-language": "en",
  });

  const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
    headers: {
      "User-Agent": "GreenPass-CRM/1.0 (info.vekay@gmail.com)",
      "Accept-Language": "en",
    },
  });

  if (!res.ok) throw new Error(`Nominatim error: ${res.status}`);
  const data = await res.json() as any[];

  const results = data
    .filter((r) => r.address?.state === "Kerala")
    .map((r) => {
      const addr = r.address || {};
      const name =
        addr.city ||
        addr.town ||
        addr.village ||
        addr.suburb ||
        addr.hamlet ||
        addr.municipality ||
        addr.neighbourhood ||
        r.display_name.split(",")[0].trim();
      const district = addr.state_district || addr.county || addr.city || "";
      const pincode = addr.postcode || "";
      // Build a short context label, e.g. "Ernakulam, Kerala"
      const context = [district, "Kerala"].filter(Boolean).join(", ");
      return {
        name,
        district,
        pincode,
        lat: parseFloat(r.lat),
        lng: parseFloat(r.lon),
        context,
        displayName: r.display_name,
      };
    });

  geocodeCache.set(q, { results, expiresAt: Date.now() + CACHE_TTL_MS });
  return results;
}

// Legacy: used by GPS fallback (nearest place from our hardcoded list)
router.get("/places/search", (req, res): void => {
  const q = typeof req.query.q === "string" ? req.query.q : "";
  const results = searchPlaces(q);
  res.json(results);
});

// New: full Kerala geocoding via Nominatim
router.get("/places/geocode", async (req, res): Promise<void> => {
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  if (q.length < 2) {
    res.json([]);
    return;
  }
  try {
    const results = await nominatimSearch(q);
    res.json(results);
  } catch (err) {
    req.log.warn({ err }, "Nominatim geocode failed, falling back to local list");
    // Fall back to our local list so the form never breaks
    res.json(searchPlaces(q));
  }
});

export default router;
